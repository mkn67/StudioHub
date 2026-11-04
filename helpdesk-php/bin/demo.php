<?php

declare(strict_types=1);

use StudioHub\Helpdesk\Agents\AgentService;
use StudioHub\Helpdesk\Config;
use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\LLM\NineRouterClient;
use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Security\Actor;
use StudioHub\Helpdesk\Tests\ScriptedModel;
use StudioHub\Helpdesk\Tickets\TicketService;
use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Util;

use function StudioHub\Helpdesk\Tests\call as scriptedToolCall;
use function StudioHub\Helpdesk\Tests\finalPolicy;

/**
 * Script dòng lệnh: chạy thử (demo) một kịch bản hội thoại với trợ lý helpdesk và in kết quả dạng JSON.
 *
 * Cách dùng:
 *   php run-demo.php [--draft] [--mock] [--scenario=<tên>] [--confirm-ticket]
 *
 * Các kịch bản (--scenario): rag | rooms | privacy | ticket | handoff | unsupported (mặc định: rag).
 *
 * Các chế độ:
 *   - (không cờ)      : dùng tri thức đã được phê duyệt chính thức, gọi nhà cung cấp mô hình thật.
 *   - --draft         : dùng cả tri thức "ready_for_approval" chưa xuất bản (chế độ đánh giá), gọi mô hình thật.
 *   - --draft --mock  : như --draft nhưng dùng mô hình giả lập theo kịch bản, không gọi mạng tới mô hình.
 *                       --mock bắt buộc đi kèm --draft.
 *   - --confirm-ticket: với kịch bản 'ticket', xác nhận đề xuất và lưu ticket thật vào CSDL demo.
 *
 * Script chỉ chạy qua dòng lệnh, không bao giờ qua HTTP.
 * Mã thoát: 0 = thành công, 1 = lỗi khi chạy demo, 2 = tham số không hợp lệ.
 */

$config = require dirname(__DIR__) . '/bootstrap.php';

// ---- Đọc tham số dòng lệnh ----

$options = getopt('', ['draft', 'mock', 'scenario:']);
$draft = isset($options['draft']);
$mock = isset($options['mock']);
$scenario = $options['scenario'] ?? 'rag';
$confirmTicket = in_array('--confirm-ticket', $argv, true);

// Mô hình giả lập chỉ được phép dùng cùng với chế độ draft (tri thức chưa xuất bản).
if ($mock && !$draft) {
    fwrite(STDERR, "Mock demonstrations require explicit --draft and never run through HTTP.\n");
    exit(2);
}

// ---- Cấu hình và các thành phần ----

// Cấu hình riêng cho demo: CSDL SQLite dùng một lần; thông tin nhà cung cấp mô hình lấy từ cấu hình thật.
// LƯU Ý: Config::get() ưu tiên biến môi trường, nên nếu HELPDESK_DATABASE_URL đã được đặt trong môi trường
// thì giá trị đó sẽ thắng giá trị demo bên dưới.
$cfg = new Config($config->root, [
    'HELPDESK_DATABASE_URL' => 'sqlite:var/demo.sqlite',
    'NINEROUTER_BASE_URL'   => $config->get('NINEROUTER_BASE_URL'),
    'NINEROUTER_API_KEY'    => $config->get('NINEROUTER_API_KEY'),
    'NINEROUTER_MODEL'      => $config->get('NINEROUTER_MODEL'),
]);

$store = new Store($cfg);
$store->migrate(); // CHỈ dùng cho CSDL demo dùng một lần, không bao giờ chạy với dữ liệu thật.

// Chế độ draft bật "evaluation" cho kho tri thức: bỏ qua bước kiểm tra phê duyệt.
$knowledge = new Repository(
    dirname($cfg->root) . '/docs/helpdesk/knowledge/knowledge.v1.json',
    $cfg->path('config/approval-manifest.json'),
    $draft,
);

$http = new CurlTransport();
$model = new NineRouterClient($cfg, $http);

// ---- Kịch bản và câu hỏi mẫu ----

$queries = [
    'rag'         => 'Tôi đến Studio trễ 30 phút thì có được cộng thêm giờ không?',       // Hỏi chính sách (RAG).
    'rooms'       => 'Tôi muốn tìm Studio chụp ảnh cho khoảng 5 người.',                  // Tra cứu danh mục phòng.
    'privacy'     => 'Đơn SH-123 của người khác đã xác nhận chưa?',                       // Phải từ chối (quyền riêng tư).
    'ticket'      => 'Tôi đến Studio nhưng thiếu thiết bị đã thuê. Tôi muốn báo sự cố.',  // Đề xuất ticket.
    'handoff'     => '/handoff',                                                          // Yêu cầu gặp nhân viên.
    'unsupported' => 'Hủy đơn và hoàn tiền ngay cho tôi.',                                // Ngoài phạm vi hỗ trợ.
];

if (!isset($queries[$scenario])) {
    fwrite(STDERR, "Scenario: rag|rooms|privacy|ticket|handoff|unsupported\n");
    exit(2);
}

// ---- Mô hình giả lập (chỉ khi --mock) ----

if ($mock) {
    require dirname(__DIR__) . '/tests/Support.php';

    // Mỗi phần tử là một lượt trả lời của "mô hình": hoặc yêu cầu gọi tool, hoặc câu trả lời JSON cuối cùng.
    $responses = match ($scenario) {
        // Gọi tool tra cứu chính sách, sau đó trả lời kiểu 'policy' dựa trên kết quả tra cứu.
        'rag' => [
            scriptedToolCall('search_knowledge', ['query' => $queries['rag']]),
            finalPolicy(...),
        ],
        // Gọi tool chuẩn bị ticket, sau đó trả lời kiểu 'support'.
        'ticket' => [
            scriptedToolCall('prepare_support_ticket', [
                'category'    => 'equipment',
                'description' => 'Thiếu thiết bị đã thuê; cần kiểm tra tại Studio.',
            ]),
            ['content' => Util::json(['kind' => 'support'])],
        ],
        // Các kịch bản còn lại: trả lời "không hỗ trợ" ngay.
        default => [
            ['content' => Util::json(['kind' => 'unsupported'])],
        ],
    };

    $model = new ScriptedModel($responses);
}

// ---- Chạy kịch bản ----

$service = new AgentService($cfg, $store, $knowledge, $model, new PublicCatalog($cfg, $http), $draft);

// Mỗi lần chạy dùng một khách (guest) ngẫu nhiên và một hội thoại mới.
$actor = new Actor('demo:' . Util::id(), 'guest');
$conversationId = $service->create([], $actor)['conversation']['id'];

try {
    $result = $service->send(
        $conversationId,
        ['text' => $queries[$scenario], 'clientMessageId' => Util::id()],
        $actor,
    );

    if ($scenario === 'ticket' && isset($result['response']['ticketProposal'])) {
        // Chỉ dùng cho demo: gắn sẵn một liên hệ "đã xác minh" giả để khách ẩn danh được phép tạo ticket.
        // Đây KHÔNG phải cách vượt qua bước xác minh qua HTTP.
        $row = $store->get('helpdesk_conversations', $conversationId);
        $conversation = json_decode($row['payload'], true);
        $conversation['verifiedContact'] = 'SYNTHETIC DEMO CONTACT — not a real recipient';
        $store->put('helpdesk_conversations', $conversationId, $conversation, ['owner' => $actor->owner]);

        // Chỉ khi có cờ --confirm-ticket mới xác nhận đề xuất và lưu ticket.
        if ($confirmTicket) {
            $result['persistedTicket'] = (new TicketService($store))->confirm([
                'conversationId'  => $conversationId,
                'proposalId'      => $conversation['proposal']['id'],
                'clientMessageId' => Util::id(),
                'confirmed'       => true,
            ], $actor);
        }
    }

    // Nhãn nêu rõ chế độ chạy để người đọc kết quả không nhầm demo với dữ liệu chính thức.
    if ($mock) {
        $modeLabel = 'MOCK PROVIDER / CLI UNPUBLISHED EVALUATION';
    } elseif ($draft) {
        $modeLabel = 'LIVE PROVIDER / CLI UNPUBLISHED EVALUATION';
    } else {
        $modeLabel = 'NORMAL APPROVED KNOWLEDGE';
    }

    echo json_encode(
        ['mode' => $modeLabel, 'scenario' => $scenario, 'result' => $result],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
    ) . "\n";
} catch (Throwable $e) {
    // Không in chi tiết lỗi nội bộ: chỉ báo mã lý do nếu là Failure đã biết.
    echo Util::json([
        'completed' => false,
        'reason'    => $e instanceof Failure ? $e->reason : 'demo_failed',
    ]) . "\n";
    exit(1);
}