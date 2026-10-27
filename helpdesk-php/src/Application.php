<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk;

use StudioHub\Helpdesk\Agents\AgentService;
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\LLM\NineRouterClient;
use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Security\Identity;
use StudioHub\Helpdesk\Tickets\TicketService;
use StudioHub\Helpdesk\Tools\PublicCatalog;

/**
 * Điểm vào chính của ứng dụng Helpdesk.
 *
 * Nhận một request đã được tách sẵn (method, path, headers, body, query),
 * xác thực, kiểm tra origin, giới hạn tần suất, rồi điều hướng (route) tới
 * đúng dịch vụ xử lý: hội thoại (agent), ticket hoặc hộp thư hỗ trợ (support inbox).
 */
final class Application
{
    /** Tiền tố chung của mọi endpoint API. */
    private const API_BASE = '/api/v1/helpdesk';

    /** Giới hạn tối đa số bản ghi cho mỗi lần lấy lịch sử hội thoại. */
    private const HISTORY_MAX_LIMIT = 60;

    /** Số bản ghi mặc định khi client không truyền `limit`. */
    private const HISTORY_DEFAULT_LIMIT = 30;

    /** Độ dài tối đa của `cursor` phân trang. */
    private const CURSOR_MAX_LENGTH = 512;

    public function __construct(private Config $config)
    {
    }

    /**
     * Xử lý một request và trả về cặp [mã HTTP, dữ liệu phản hồi].
     * Mọi lỗi nghiệp vụ được ném ra dưới dạng `Failure`.
     *
     * @param array<string, string> $headers Header (khoá đã ở dạng chữ thường).
     * @param array<string, mixed>  $body    Nội dung JSON đã giải mã.
     * @param array<string, mixed>  $query   Tham số query string.
     * @param string                $remote  Định danh nguồn gọi (thường là IP) để rate limit.
     *
     * @return array{0: int, 1: array<string, mixed>}
     */
    public function dispatch(
        string $method,
        string $path,
        array $headers,
        array $body,
        array $query = [],
        string $remote = 'local'
    ): array {
        // --- 1. Xác thực & kiểm tra nguồn gọi --------------------------------------------------

        $transport = new CurlTransport();
        $actor     = (new Identity($this->config, $transport))->resolve($headers);

        // Chỉ chấp nhận request đến từ đúng origin của frontend đã cấu hình
        $allowedOrigin = $this->config->get('HELPDESK_FRONTEND_ORIGIN', 'http://localhost:3000');
        if (($headers['origin'] ?? '') !== $allowedOrigin) {
            throw new Failure('origin_denied', 403);
        }

        // --- 2. Giới hạn tần suất ---------------------------------------------------------------

        $store = new Store($this->config);
        // Giới hạn theo từng người dùng (cấu hình được, 1–120 lượt/phút, mặc định 30)
        $store->rate('owner:' . $actor->owner, $this->config->int('HELPDESK_RATE_LIMIT', 30, 1, 120));
        // Giới hạn cứng theo nguồn gọi: 200 lượt/phút
        $store->rate('remote:' . $remote, 200);

        // --- 3. Khởi tạo các dịch vụ ------------------------------------------------------------

        // Kho tri thức (knowledge base) và manifest phê duyệt
        $knowledge = new Repository(
            dirname($this->config->root) . '/docs/helpdesk/knowledge/knowledge.v1.json',
            $this->config->path('config/approval-manifest.json')
        );

        // Agent AI: kết hợp LLM (NineRouter) với danh mục công khai (PublicCatalog)
        $agent = new AgentService(
            $this->config,
            $store,
            $knowledge,
            new NineRouterClient($this->config, $transport),
            new PublicCatalog($this->config, $transport)
        );

        $tickets = new TicketService($store);

        // --- 4. Điều hướng (routing) ------------------------------------------------------------

        // POST /conversations -> tạo hội thoại mới
        if ($method === 'POST' && $path === self::API_BASE . '/conversations') {
            return [201, $agent->create($body, $actor)];
        }

        // /conversations/{id}[/messages|/operator]
        if (preg_match('~^' . self::API_BASE . '/conversations/([a-f0-9-]+)(/messages|/operator)?$~i', $path, $m)) {
            $id        = Util::uuid($m[1]);
            $operation = $m[2] ?? '';

            // GET /conversations/{id} -> lấy lịch sử (có phân trang)
            if ($method === 'GET' && $operation === '') {
                $this->validateHistoryQuery($query);

                return [200, $agent->history(
                    $id,
                    $actor,
                    (int) ($query['limit'] ?? self::HISTORY_DEFAULT_LIMIT),
                    $query['cursor'] ?? null
                )];
            }

            // POST /conversations/{id}/messages -> gửi tin nhắn cho agent
            if ($method === 'POST' && $operation === '/messages') {
                return [200, $agent->send($id, $body, $actor)];
            }

            // POST /conversations/{id}/operator -> chuyển/trao đổi với nhân viên hỗ trợ
            if ($method === 'POST' && $operation === '/operator') {
                return [200, $agent->operator($id, $body, $actor)];
            }
        }

        // POST /tickets -> xác nhận và tạo ticket
        if ($method === 'POST' && $path === self::API_BASE . '/tickets') {
            return [201, ['ticket' => $tickets->confirm($body, $actor)]];
        }

        // /tickets/{id}[/status]
        if (preg_match('~^' . self::API_BASE . '/tickets/([a-f0-9-]+)(/status)?$~i', $path, $m)) {
            // GET /tickets/{id} -> xem chi tiết ticket
            if ($method === 'GET' && empty($m[2])) {
                return [200, ['ticket' => $tickets->read($m[1], $actor)]];
            }

            // POST /tickets/{id}/status -> cập nhật trạng thái ticket
            if ($method === 'POST' && ($m[2] ?? '') === '/status') {
                Util::fields($body, ['status']); // Chỉ cho phép đúng trường `status`

                return [200, ['ticket' => $tickets->status(
                    $m[1],
                    Util::text($body['status'] ?? null, 30),
                    $actor
                )]];
            }
        }

        // GET /support/inbox -> hàng đợi ticket (chỉ dành cho nhân viên hỗ trợ)
        if ($method === 'GET' && $path === self::API_BASE . '/support/inbox') {
            // Người dùng thường nhận 404 thay vì 403 để không lộ sự tồn tại của endpoint
            if (!$actor->support) {
                throw new Failure('resource_not_found', 404);
            }

            return [200, ['tickets' => $store->ticketQueue()]];
        }

        // Không khớp route nào
        throw new Failure('resource_not_found', 404);
    }

    /**
     * Kiểm tra tham số query của API lấy lịch sử hội thoại.
     *
     * - Chỉ chấp nhận `limit` và `cursor`.
     * - `limit` phải là số nguyên trong khoảng 1–60.
     * - `cursor` phải là chuỗi, dài tối đa 512 ký tự.
     *
     * @param array<string, mixed> $query
     */
    private function validateHistoryQuery(array $query): void
    {
        // Từ chối mọi tham số lạ
        if (array_diff(array_keys($query), ['limit', 'cursor'])) {
            throw new Failure('invalid_query');
        }

        if (isset($query['limit'])) {
            $limit = (string) $query['limit'];

            if (!ctype_digit($limit) || (int) $limit < 1 || (int) $limit > self::HISTORY_MAX_LIMIT) {
                throw new Failure('invalid_query');
            }
        }

        if (isset($query['cursor'])
            && (!is_string($query['cursor']) || strlen($query['cursor']) > self::CURSOR_MAX_LENGTH)
        ) {
            throw new Failure('invalid_cursor');
        }
    }
}