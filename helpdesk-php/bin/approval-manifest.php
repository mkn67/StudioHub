<?php

declare(strict_types=1);

use StudioHub\Helpdesk\Knowledge\Repository;

/**
 * Script dòng lệnh: sinh "bảng nháp phê duyệt" (approval worksheet) cho kho tri thức.
 *
 * Với mỗi mục tri thức đủ điều kiện (trạng thái 'ready_for_approval' và không có xung đột), script tính sẵn:
 *   - mã băm SHA-256 của mục tri thức (entry_sha256);
 *   - mã băm SHA-256 của từng tài liệu nguồn (source_sha256).
 * Các trường quyết định (người duyệt, thời điểm duyệt, hiệu lực...) được để trống và đặt 'decision' = 'unapproved'.
 *
 * LƯU Ý QUAN TRỌNG: script KHÔNG tự động duyệt bất cứ mục nào. Chủ sở hữu phải xem xét từng mục,
 * rồi sao chép các bản ghi đã duyệt sang config/approval-manifest.json.
 *
 * Cách dùng (kết quả in ra stdout dưới dạng JSON):
 *   php generate-approval-worksheet.php > approval-worksheet.json
 */

$config = require dirname(__DIR__) . '/bootstrap.php';

// Thư mục gốc của repo (cha của thư mục gốc ứng dụng).
$root = dirname($config->root);

$corpusPath = $root . '/docs/helpdesk/knowledge/knowledge.v1.json';
$corpus = json_decode(file_get_contents($corpusPath), true, 64, JSON_THROW_ON_ERROR);

$worksheet = [
    'manifest_version' => '1.0.0',
    'corpus_version'   => $corpus['corpus_version'],
    'notice'           => 'Candidate worksheet only. Owner must review each entry; '
        . 'never auto-approve held/conflicting content. '
        . 'Copy approved records into config/approval-manifest.json.',
    'approvals'        => [],
];

foreach ($corpus['entries'] as $entry) {
    // Bỏ qua mục chưa sẵn sàng duyệt hoặc đang có xung đột: những mục này không được đưa vào bảng nháp.
    if ($entry['publication_status'] !== 'ready_for_approval' || $entry['conflict_ids']) {
        continue;
    }

    // Mã băm từng tài liệu nguồn; nếu tài liệu đổi sau này thì phê duyệt không còn khớp.
    $sourceHashes = [];
    foreach ($entry['sources'] as $source) {
        $sourceHashes[$source['document']] = hash_file('sha256', $root . '/' . $source['document']);
    }

    $worksheet['approvals'][$entry['id']] = [
        'decision'         => 'unapproved',   // Người duyệt phải tự đổi thành 'approved'.
        'document_version' => $entry['document_version'],
        'entry_sha256'     => Repository::hash($entry), // Cùng cách băm với Repository khi kiểm tra phê duyệt.
        'source_sha256'    => $sourceHashes,
        'approved_by'      => null,
        'approved_at'      => null,
        'valid_from'       => null,
        'valid_until'      => null,
        'non_expiring'     => false,
    ];
}

echo json_encode($worksheet, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";