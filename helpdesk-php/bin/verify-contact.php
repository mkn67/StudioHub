<?php

declare(strict_types=1);

use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Util;

/**
 * Script dòng lệnh dành cho người vận hành nội bộ: ghi nhận rằng thông tin liên hệ của một khách
 * (guest) ĐÃ ĐƯỢC XÁC MINH Ở BÊN NGOÀI hệ thống, để khách đó có thể xác nhận tạo ticket.
 *
 * Cách dùng:
 *   php attest-contact.php --conversation=<UUID> --contact=<LIÊN_HỆ> --attest-externally-verified
 *
 * Lưu ý:
 *   - Chỉ chạy sau khi người vận hành đã tự xác minh liên hệ bằng kênh độc lập; cờ
 *     --attest-externally-verified là lời cam kết tường minh về việc đó.
 *   - Script không gửi email/SMS và không tạo ticket; nó chỉ ghi 'verifiedContact' vào hội thoại
 *     và thêm một sự kiện kiểm toán 'contact_externally_verified'.
 *
 * Mã thoát: 0 = thành công, 2 = thiếu tham số. Lỗi khác (ví dụ hội thoại không còn) làm script dừng với ngoại lệ.
 */

/** Độ dài tối đa (ký tự) của thông tin liên hệ. */
const MAX_CONTACT_CHARS = 150;

$config = require dirname(__DIR__) . '/bootstrap.php';

$options = getopt('', ['conversation:', 'contact:', 'attest-externally-verified']);

// Phải có đủ cả ba tham số, kể cả lời cam kết đã xác minh bên ngoài.
if (!isset($options['attest-externally-verified'], $options['conversation'], $options['contact'])) {
    fwrite(
        STDERR,
        "Local operator only, AFTER independently verifying guest contact: "
        . "--conversation=UUID --contact=CONTACT --attest-externally-verified\n"
        . "No email/SMS is sent by this command.\n",
    );
    exit(2);
}

$store = new Store($config);
$conversationId = Util::uuid($options['conversation']);
$contact = Util::text($options['contact'], MAX_CONTACT_CHARS);

// Đọc - sửa - ghi trong một transaction để tránh ghi đè lẫn nhau.
$store->transaction(function () use ($store, $conversationId, $contact) {
    $row = $store->get('helpdesk_conversations', $conversationId);

    // Không tồn tại hoặc đã hết hạn thì dừng.
    if (!$row || $row['expires'] < time()) {
        throw new RuntimeException('Conversation unavailable');
    }

    $conversation = json_decode($row['payload'], true);

    // Liên hệ đã xác minh: TicketService::confirm() yêu cầu trường này đối với khách chưa đăng nhập.
    $conversation['verifiedContact'] = $contact;

    // Ghi dấu kiểm toán: ai xác nhận và khi nào.
    $conversation['events'][] = [
        'type'  => 'contact_externally_verified',
        'actor' => 'local_operator',
        'at'    => Util::now(),
    ];

    // Giữ nguyên chủ sở hữu gốc của hội thoại.
    $store->put('helpdesk_conversations', $conversationId, $conversation, ['owner' => $row['owner']]);
});

echo "External verification attestation recorded. No ticket created.\n";