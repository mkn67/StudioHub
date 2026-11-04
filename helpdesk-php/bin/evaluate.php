<?php

declare(strict_types=1);

use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Retrieval\LexicalRetriever;
use StudioHub\Helpdesk\Security\Actor;

/**
 * Script dòng lệnh: đánh giá chất lượng TRUY XUẤT (retrieval) của kho tri thức trên bộ dữ liệu đánh giá.
 *
 * Với mỗi ca đủ điều kiện, script lấy câu hỏi cuối của hội thoại, chạy LexicalRetriever (top 5)
 * rồi tính recall@5 = (số mục đúng tìm được) / (số mục đúng cần tìm). Kết quả in ra stdout dạng JSON.
 *
 * Giới hạn: chỉ đo truy xuất, KHÔNG gọi mô hình nên không đo được độ trung thực của câu trả lời hay việc chọn tool.
 * Các ca còn lại (agent/hợp đồng/đối kháng) được ghi nhận là 'not_executed'.
 *
 * Cách dùng:
 *   php evaluate-retrieval.php            # chỉ dùng tri thức đã được phê duyệt chính thức
 *   php evaluate-retrieval.php --draft    # dùng cả tri thức chưa xuất bản; kết quả KHÔNG có nghĩa là được phê duyệt
 */

$config = require dirname(__DIR__) . '/bootstrap.php';

// Chế độ draft: bật "evaluation" cho kho tri thức (bỏ qua bước kiểm tra phê duyệt).
$draft = in_array('--draft', $argv, true);

$root = dirname($config->root);

$dataset = json_decode(
    file_get_contents($root . '/docs/helpdesk/evaluation.v1.json'),
    true,
    64,
    JSON_THROW_ON_ERROR,
);

$repository = new Repository(
    $root . '/docs/helpdesk/knowledge/knowledge.v1.json',
    $config->path('config/approval-manifest.json'),
    $draft,
);

$retriever = new LexicalRetriever($repository);
$actor = new Actor('evaluation:public'); // Người dùng công khai: chỉ thấy tri thức 'public'.

// Số mục truy xuất tối đa cho mỗi câu hỏi. Tên trường 'recall_at_5' bên dưới gắn với giá trị này.
$topK = 5;

/**
 * Ca này có đo truy xuất được không? Cần đồng thời:
 *   - kỳ vọng là trả lời được ('answered') và có danh sách mục tri thức liên quan;
 *   - chỉ dùng tri thức công khai, không chèn dữ liệu giả lập (inject) và không cần nhà cung cấp mô hình.
 */
$isRetrievalCase = static function (array $case): bool {
    return $case['expected']['state'] === 'answered'
        && ($case['setup']['profile'] ?? '') === 'public_only'
        && (bool) $case['expected']['relevant_knowledge_ids']
        && !isset($case['setup']['inject'])
        && ($case['setup']['provider'] ?? '') === '';
};

$results = [];   // Kết quả từng ca (đã chạy hoặc bỏ qua).
$recalls = [];   // Recall@5 của các ca đã chạy.
$complete = 0;   // Số ca tìm đủ toàn bộ mục đúng (recall = 1).

foreach ($dataset['cases'] as $case) {
    if (!$isRetrievalCase($case)) {
        $results[] = [
            'id'     => $case['id'],
            'stage'  => 'agent/contract/adversarial',
            'status' => 'not_executed',
            'reason' => 'This CLI measures retrieval only; negative unit/API cases are tested separately.',
        ];
        continue;
    }

    // Câu hỏi cần truy xuất là tin nhắn cuối cùng của hội thoại.
    $lastMessage = end($case['conversation']);
    $query = $lastMessage['text'];

    $found = array_column($retriever->search($query, $actor, null, $topK), 'id');
    $gold = $case['expected']['relevant_knowledge_ids']; // Các mục đúng cần tìm thấy.

    $recall = count(array_intersect($found, $gold)) / count($gold);
    $recalls[] = $recall;

    if ($recall >= 1) {
        $complete++;
    }

    $results[] = [
        'id'           => $case['id'],
        'stage'        => 'retrieval',
        'status'       => 'executed',
        'selected'     => $found,
        'gold'         => $gold,
        'recall_at_5'  => $recall,
    ];
}

$report = [
    'dataset_version'          => $dataset['dataset_version'],
    'corpus_version'           => $repository->version,
    'mode'                     => $draft ? 'CLI draft evaluation — unpublished content' : 'normal publication gate',
    'provider_calls'           => 0, // Script này không bao giờ gọi nhà cung cấp mô hình.
    'eligible_public_entries'  => count($repository->eligible($actor)),
    'retrieval_cases'          => count($recalls),
    'mean_recall_at_5'         => $recalls ? array_sum($recalls) / count($recalls) : null,
    'all_gold_retrieved'       => $complete,
    'not_executed_agent_cases' => count($results) - count($recalls),
    'results'                  => $results,
    'limitations'              => 'No live answer faithfulness/tool-selection score; '
        . 'no actual model/provider available. Draft results do not approve publication.',
];

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";