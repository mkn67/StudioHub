<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Tickets;

use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Util;
use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Security\Actor;

/**
 * Dịch vụ phiếu hỗ trợ (ticket).
 *
 * Luồng chính:
 *   1. proposal(): trợ lý chuẩn bị bản đề xuất ticket (chưa lưu, chưa tạo gì).
 *   2. confirm():  người dùng xác nhận rõ ràng thì ticket mới được tạo và lưu.
 *   3. status():   nhân viên hỗ trợ cập nhật trạng thái xử lý (open -> in_progress -> resolved).
 *   4. read():     đọc một ticket (chủ ticket hoặc nhân viên hỗ trợ).
 */
final class TicketService
{
    /** Các nhóm sự cố hợp lệ. */
    public const CATEGORIES = [
        'account', 'platform', 'payment_error', 'equipment',
        'room', 'checkin', 'refund_dispute', 'unresolved_host',
    ];

    /** Nhóm sự cố nên chuyển tới chủ Studio (chưa xác minh được chủ Studio nào). */
    private const HOST_CATEGORIES = ['equipment', 'room', 'checkin'];

    /** Nhóm sự cố cần chuyển cấp có thẩm quyền xử lý. */
    private const ESCALATION_CATEGORIES = ['refund_dispute', 'unresolved_host'];

    /** Nhóm sự cố được đánh dấu ưu tiên cao (khách đang cần vào phòng). */
    private const HIGH_PRIORITY_CATEGORY = 'checkin';

    /** Các trạng thái ticket hợp lệ. */
    private const STATUSES = ['open', 'in_progress', 'resolved'];

    /** Chuyển trạng thái được phép: trạng thái hiện tại => các trạng thái có thể chuyển tới. */
    private const STATUS_TRANSITIONS = [
        'open'        => ['in_progress'],
        'in_progress' => ['resolved'],
        'resolved'    => ['open'], // Cho phép mở lại.
    ];

    /** Giới hạn độ dài (ký tự). */
    private const MAX_DESCRIPTION_CHARS = 1000;
    private const MAX_STUDIO_REFERENCE_CHARS = 100;

    /** Tên bảng/collection. */
    private const CONVERSATIONS = 'helpdesk_conversations';
    private const TICKETS = 'helpdesk_tickets';

    public function __construct(private Store $store)
    {
    }

    /**
     * Tạo bản đề xuất ticket để người dùng xem lại và xác nhận. Hàm này KHÔNG lưu gì cả.
     *
     * @param string|null $studio Tham chiếu Studio do người dùng cung cấp (chưa được xác minh).
     *
     * @throws Failure('invalid_ticket_category') nếu nhóm sự cố không hợp lệ (422).
     */
    public static function proposal(string $category, string $description, ?string $studio): array
    {
        if (!in_array($category, self::CATEGORIES, true)) {
            throw new Failure('invalid_ticket_category', 422);
        }

        return [
            'id'                   => Util::id(),
            'category'             => $category,
            'description'          => Util::text($description, self::MAX_DESCRIPTION_CHARS),
            'priority'             => $category === self::HIGH_PRIORITY_CATEGORY ? 'high' : 'normal',
            'studioReference'      => $studio === null ? null : Util::text($studio, self::MAX_STUDIO_REFERENCE_CHARS),
            'bookingReference'     => null, // Không nhận mã đặt phòng vì chưa thể xác minh.
            'suggestedDestination' => self::suggestDestination($category),
            'assignment'           => 'unclaimed',
            'createdAt'            => Util::now(),
        ];
    }

    /**
     * Xác nhận đề xuất và tạo ticket thật.
     *
     * Hàm có tính idempotent: nếu hội thoại đã có ticket thì trả lại ticket đó thay vì tạo thêm.
     *
     * @param array $body Gồm 'conversationId', 'proposalId', 'clientMessageId' và 'confirmed' (phải là true).
     *
     * @throws Failure('confirmation_required')     nếu người dùng chưa xác nhận rõ ràng (422).
     * @throws Failure('resource_not_found')        nếu không có hội thoại, không phải chủ hoặc đã hết hạn (404).
     * @throws Failure('proposal_not_found')        nếu đề xuất không tồn tại hoặc không khớp (404).
     * @throws Failure('verified_contact_required') nếu khách chưa đăng nhập và chưa có liên hệ đã xác minh (401).
     */
    public function confirm(array $body, Actor $actor): array
    {
        Util::fields($body, ['conversationId', 'proposalId', 'clientMessageId', 'confirmed']);

        $conversationId = Util::uuid($body['conversationId'] ?? null);
        $proposalId = Util::uuid($body['proposalId'] ?? null);
        $key = Util::uuid($body['clientMessageId'] ?? null);

        // Phải là đúng giá trị true (không chấp nhận "true", 1...).
        if (($body['confirmed'] ?? null) !== true) {
            throw new Failure('confirmation_required', 422);
        }

        return $this->store->transaction(function () use ($actor, $conversationId, $proposalId, $key) {
            // Chỉ chủ hội thoại mới được xác nhận (nhân viên hỗ trợ không xác nhận thay người dùng).
            $row = $this->store->get(self::CONVERSATIONS, $conversationId);
            if (!$row || $row['owner'] !== $actor->owner || $row['expires'] < time()) {
                throw new Failure('resource_not_found', 404);
            }

            $conversation = json_decode($row['payload'], true);

            $proposal = $conversation['proposal'] ?? null;
            if (!$proposal || $proposal['id'] !== $proposalId) {
                throw new Failure('proposal_not_found', 404);
            }

            // Đã tạo ticket từ đề xuất này rồi: trả lại ticket cũ, không tạo trùng.
            if (isset($conversation['ticketId'])) {
                return $this->read($conversation['ticketId'], $actor);
            }

            // Khách chưa đăng nhập phải có thông tin liên hệ đã được xác minh thì mới tạo ticket.
            if (!$actor->authenticated() && empty($conversation['verifiedContact'])) {
                throw new Failure('verified_contact_required', 401);
            }

            $now = Util::now();
            $ticket = self::buildTicket($proposal, $conversation, $conversationId, $proposalId, $key, $actor, $now);

            $this->store->put(self::TICKETS, $ticket['id'], $ticket, [
                'owner'           => $actor->owner,
                'conversation_id' => $conversationId,
                'proposal_id'     => $proposalId,
            ]);

            // Gắn ticket vào hội thoại để lần xác nhận lặp lại nhận ra và trả đúng ticket này.
            $conversation['ticketId'] = $ticket['id'];
            $conversation['events'][] = ['type' => 'ticket_created', 'ticketId' => $ticket['id'], 'at' => $now];
            $this->store->put(self::CONVERSATIONS, $conversationId, $conversation, ['owner' => $actor->owner]);

            return $ticket;
        });
    }

    /**
     * Đọc ticket. Trả 404 nếu không tồn tại, đã hết hạn, hoặc người gọi không phải chủ
     * (nhân viên hỗ trợ được xem mọi ticket).
     */
    public function read(string $id, Actor $actor): array
    {
        $row = $this->store->get(self::TICKETS, Util::uuid($id));

        if (!$row
            || (!$actor->support && $row['owner'] !== $actor->owner)
            || $row['expires'] < time()
        ) {
            throw new Failure('resource_not_found', 404);
        }

        return json_decode($row['payload'], true);
    }

    /**
     * Nhân viên hỗ trợ cập nhật trạng thái ticket theo các chuyển đổi được phép (xem STATUS_TRANSITIONS).
     *
     * @throws Failure('resource_not_found')       nếu người gọi không phải nhân viên hỗ trợ (404, để không lộ endpoint).
     * @throws Failure('invalid_ticket_status')    nếu trạng thái đích không hợp lệ (422).
     * @throws Failure('invalid_ticket_transition') nếu không được chuyển từ trạng thái hiện tại sang trạng thái đích (409).
     */
    public function status(string $id, string $status, Actor $actor): array
    {
        if (!$actor->support) {
            throw new Failure('resource_not_found', 404);
        }

        if (!in_array($status, self::STATUSES, true)) {
            throw new Failure('invalid_ticket_status', 422);
        }

        return $this->store->transaction(function () use ($id, $status, $actor) {
            $ticket = $this->read($id, $actor);
            $old = $ticket['status'];

            if (!in_array($status, self::STATUS_TRANSITIONS[$old] ?? [], true)) {
                throw new Failure('invalid_ticket_transition', 409);
            }

            $now = Util::now();
            $ticket['status'] = $status;
            $ticket['updatedAt'] = $now;
            $ticket['events'][] = [
                'type'  => 'status_changed',
                'from'  => $old,
                'to'    => $status,
                'actor' => $actor->owner,
                'at'    => $now,
            ];

            // Giữ nguyên chủ sở hữu gốc (người tạo ticket), không đổi sang nhân viên.
            $this->store->put(self::TICKETS, $id, $ticket, [
                'owner'           => $ticket['requester']['owner'],
                'conversation_id' => $ticket['conversationId'],
                'proposal_id'     => $ticket['proposalId'],
            ]);

            return $ticket;
        });
    }

    /**
     * Gợi ý nơi tiếp nhận ticket theo nhóm sự cố:
     *   - equipment/room/checkin        -> chủ Studio liên quan (chưa xác minh);
     *   - refund_dispute/unresolved_host -> chuyển cấp có thẩm quyền;
     *   - còn lại                        -> bộ phận hỗ trợ StudioHub.
     */
    private static function suggestDestination(string $category): string
    {
        if (in_array($category, self::HOST_CATEGORIES, true)) {
            return 'relevant_host_unverified';
        }

        if (in_array($category, self::ESCALATION_CATEGORIES, true)) {
            return 'authorized_escalation';
        }

        return 'studiohub_support';
    }

    /**
     * Dựng bản ghi ticket mới từ đề xuất đã được người dùng xác nhận.
     *
     * @param string $key Khóa idempotency (clientMessageId), ghi vào sự kiện 'created'.
     * @param mixed  $now Thời điểm tạo (giá trị từ Util::now()), dùng chung cho các trường thời gian.
     */
    private static function buildTicket(
        array $proposal,
        array $conversation,
        string $conversationId,
        string $proposalId,
        string $key,
        Actor $actor,
        mixed $now,
    ): array {
        return [
            'id'                   => Util::id(),
            'conversationId'       => $conversationId,
            'proposalId'           => $proposalId,
            'requester'            => [
                'owner'   => $actor->owner,
                'contact' => $conversation['verifiedContact'] ?? null,
            ],
            'category'             => $proposal['category'],
            'description'          => $proposal['description'],
            'priority'             => $proposal['priority'],
            'studioReference'      => $proposal['studioReference'],
            'bookingReference'     => null,
            'suggestedDestination' => $proposal['suggestedDestination'],
            'assignedDestination'  => 'unclaimed_support_queue', // Chưa có ai nhận xử lý.
            'status'               => 'open',
            'createdAt'            => $now,
            'updatedAt'            => $now,
            'events'               => [
                [
                    'type'           => 'created',
                    'at'             => $now,
                    'actor'          => $actor->owner,
                    'idempotencyKey' => $key,
                ],
            ],
        ];
    }
}