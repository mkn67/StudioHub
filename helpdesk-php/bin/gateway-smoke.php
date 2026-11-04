<?php

declare(strict_types=1);

/**
 * Script kiểm tra (verify) kết nối tới gateway LLM NineRouter.
 *
 * Các bước kiểm tra, dừng ngay khi có bước thất bại:
 *  1. Lấy danh sách model từ gateway.
 *  2. Model được cấu hình (NINEROUTER_MODEL) có nằm trong danh sách hay không.
 *  3. Chat đơn giản có trả về nội dung hay không.
 *  4. Gateway có hỗ trợ gọi công cụ (tool calling): mô hình phải gọi đúng một lần
 *     công cụ `capability_probe` với đúng mã nonce ngẫu nhiên.
 *  5. Vòng đi-về (round trip) của công cụ: sau khi nhận kết quả công cụ, mô hình
 *     phải nhắc lại nonce trong câu trả lời cuối.
 *
 * Nếu tất cả đều đạt, ghi file `var/gateway-verified.json` (hạn dùng 24 giờ).
 *
 * Cách dùng:
 *   php verify-gateway.php            kiểm tra đầy đủ
 *   php verify-gateway.php --models   chỉ in danh sách model khả dụng rồi thoát
 *
 * Mã thoát: 0 nếu thành công, 1 nếu thất bại (kèm JSON mô tả lý do).
 */

use StudioHub\Helpdesk\{Util, Failure};
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\LLM\NineRouterClient;

/** Thời gian chờ tối đa cho mỗi lần gọi mô hình (giây). */
const PROBE_TIMEOUT_SECONDS = 30;

/** Thời hạn hiệu lực của kết quả xác minh: 24 giờ (tính bằng giây). */
const VERIFICATION_TTL_SECONDS = 86400;

$config = require dirname(__DIR__) . '/bootstrap.php';
$file   = $config->path('var/gateway-verified.json');

// Xoá kết quả xác minh cũ trước, để nếu lần kiểm tra này thất bại thì không còn file đánh dấu lỗi thời
if (is_file($file)) {
    unlink($file);
}

// Hạn chót tuyệt đối cho một lần gọi mô hình, được tính tại thời điểm gọi
$deadline = static fn(): float => microtime(true) + PROBE_TIMEOUT_SECONDS;

try {
    $client = new NineRouterClient($config, new CurlTransport());

    // Bước 1: lấy danh sách model khả dụng
    $modelIds = $client->models();

    // Chế độ chỉ liệt kê model: in ra rồi thoát (mã 0), không chạy các bước kiểm tra còn lại
    if (in_array('--models', $argv, true)) {
        echo Util::json(['availableModels' => $modelIds]) . "\n";
        exit;
    }

    // Bước 2: model được cấu hình phải nằm trong danh sách
    $model = $config->get('NINEROUTER_MODEL');
    if (!in_array($model, $modelIds, true)) {
        throw new Failure('configured_model_not_available', 503);
    }

    // Bước 3: chat đơn giản, chỉ cần có nội dung trả về
    $simple = $client->complete([['role' => 'user', 'content' => 'Reply OK.']], [], $deadline());
    if (!$simple['message']['content']) {
        throw new Failure('chat_probe_failed', 503);
    }

    // Bước 4: kiểm tra gọi công cụ. Khai báo một công cụ giả `capability_probe` nhận vào `nonce`
    $tools = [[
        'type'     => 'function',
        'function' => [
            'name'        => 'capability_probe',
            'description' => 'Return the probe nonce.',
            'parameters'  => [
                'type'                 => 'object',
                'properties'           => ['nonce' => ['type' => 'string']],
                'required'             => ['nonce'],
                'additionalProperties' => false,
            ],
        ],
    ]];

    // Nonce ngẫu nhiên để chắc chắn mô hình thật sự làm theo, không phải đoán mò
    $nonce    = bin2hex(random_bytes(8));
    $messages = [['role' => 'user', 'content' => 'Call capability_probe exactly once with nonce ' . $nonce . '.']];

    // Ép mô hình phải gọi đúng công cụ `capability_probe`
    $probe = $client->complete(
        $messages,
        $tools,
        $deadline(),
        ['type' => 'function', 'function' => ['name' => 'capability_probe']]
    );
    $calls = $probe['message']['tool_calls'];

    // Phải có đúng 1 lệnh gọi, đúng tên công cụ, và tham số `nonce` khớp chính xác
    if (
        count($calls) !== 1
        || $calls[0]['function']['name'] !== 'capability_probe'
        || (json_decode($calls[0]['function']['arguments'], true)['nonce'] ?? '') !== $nonce
    ) {
        throw new Failure('tool_calling_incompatible', 503);
    }

    // Bước 5: kiểm tra vòng đi-về. Trả kết quả công cụ về cho mô hình và yêu cầu nó nhắc lại nonce
    $messages[] = $probe['message'];
    $messages[] = [
        'role'         => 'tool',
        'tool_call_id' => $calls[0]['id'],
        'content'      => Util::json(['nonce' => $nonce]),
    ];
    $messages[] = [
        'role'    => 'user',
        'content' => 'Return the nonce from the tool in your final text; do not call tools again.',
    ];

    $final = $client->complete($messages, [], $deadline());
    if (!str_contains($final['message']['content'], $nonce)) {
        throw new Failure('tool_roundtrip_incompatible', 503);
    }

    // Mọi thứ đều ổn: ghi file đánh dấu đã xác minh (khoá file khi ghi để tránh ghi chồng)
    file_put_contents(
        $file,
        Util::json([
            'fingerprint'    => $config->gatewayFingerprint(), // Dấu vân tay cấu hình gateway tại thời điểm xác minh
            'expires'        => time() + VERIFICATION_TTL_SECONDS,
            'tool_roundtrip' => true,
        ]),
        LOCK_EX
    );

    echo Util::json([
        'models_reachable'           => true,
        'configured_model_available' => true,
        'chat'                       => true,
        'tool_roundtrip'             => true,
        'usage'                      => $final['usage'],
    ]) . "\n";
} catch (Throwable $e) {
    // Lỗi nghiệp vụ (Failure) thì báo đúng lý do; lỗi khác chỉ báo chung để không lộ chi tiết nội bộ
    echo Util::json([
        'verified' => false,
        'reason'   => $e instanceof Failure ? $e->reason : 'connectivity_check_failed',
    ]) . "\n";

    exit(1);
}