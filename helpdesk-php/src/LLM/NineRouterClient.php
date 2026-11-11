<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\LLM;

use StudioHub\Helpdesk\Config;
use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Http\Transport;

/**
 * Client gọi mô hình ngôn ngữ qua 9Router (API tương thích OpenAI: /models và /chat/completions).
 *
 * Trách nhiệm chính:
 *   - Gửi yêu cầu HTTP kèm cơ chế thử lại (retry) có giới hạn và tôn trọng hạn chót (deadline).
 *   - Kiểm tra chặt phản hồi của nhà cung cấp (không tin dữ liệu bên ngoài) trước khi đưa vào hệ thống.
 *   - Chuẩn hóa kết quả về dạng ['message' => ..., 'usage' => ...].
 */
final class NineRouterClient implements LanguageModel
{
    // ---- Giới hạn khi gọi HTTP ----

    /** Các mã trạng thái được phép thử lại (quá tải / lỗi tạm thời). */
    private const RETRYABLE_STATUSES = [429, 502, 503, 504];

    /** Thời gian còn lại (giây) tối thiểu để còn gửi thêm một yêu cầu. */
    private const MIN_REMAINING_SECONDS = 0.1;

    /** Thời gian chờ giữa hai lần thử lại: tối thiểu và tối đa (giây). */
    private const MIN_RETRY_WAIT_SECONDS = 0.1;
    private const MAX_RETRY_WAIT_SECONDS = 2;

    /** Thời gian tối đa (giây) cho việc lấy danh sách model. */
    private const MODELS_DEADLINE_SECONDS = 15;

    // ---- Tham số sinh văn bản ----

    /** Số token tối đa mô hình được sinh ra trong một lần trả lời. */
    private const MAX_COMPLETION_TOKENS = 900;

    // ---- Giới hạn kiểm tra phản hồi từ nhà cung cấp ----

    /** Số lời gọi tool tối đa trong một phản hồi. */
    private const MAX_TOOL_CALLS = 6;

    /** Độ dài tối đa (byte) của id lời gọi tool và của chuỗi tham số JSON. */
    private const MAX_TOOL_CALL_ID_LENGTH = 128;
    private const MAX_TOOL_ARGUMENTS_LENGTH = 8192;

    /** Tên tool hợp lệ: chữ thường và dấu gạch dưới, dài 1-64 ký tự. */
    private const TOOL_NAME_PATTERN = '/^[a-z_]{1,64}$/';

    /** Độ dài tối đa (byte) của nội dung văn bản trả về. */
    private const MAX_CONTENT_LENGTH = 16000;

    /** Giá trị tối đa chấp nhận cho mỗi bộ đếm token (loại bỏ số liệu bất thường). */
    private const MAX_TOKEN_COUNT = 10000000;

    /** Các trường thống kê token được giữ lại. */
    private const USAGE_FIELDS = ['prompt_tokens', 'completion_tokens', 'total_tokens'];

    public function __construct(private Config $config, private Transport $http)
    {
    }

    /**
     * Lấy danh sách id các model mà nhà cung cấp đang cung cấp.
     *
     * @return string[]
     */
    public function models(): array
    {
        $response = $this->call('GET', '/models', null, microtime(true) + self::MODELS_DEADLINE_SECONDS);

        if (!isset($response['data']) || !is_array($response['data'])) {
            throw new Failure('invalid_provider_response', 502);
        }

        $ids = [];
        foreach ($response['data'] as $model) {
            if (is_array($model) && is_string($model['id'] ?? null)) {
                $ids[] = $model['id'];
            }
        }

        return $ids;
    }

    /**
     * Gọi mô hình để sinh phản hồi tiếp theo (có thể là văn bản hoặc yêu cầu gọi tool).
     *
     * @param array $messages   Danh sách message theo định dạng chat.
     * @param array $tools      Định nghĩa các tool mô hình được phép gọi (rỗng nếu không dùng tool).
     * @param float $deadline   Mốc thời gian tuyệt đối (microtime) mà lần gọi phải hoàn tất trước đó.
     * @param mixed $toolChoice Cách chọn tool ('auto', 'none' hoặc chỉ định tool cụ thể).
     *
     * @return array ['message' => ['role', 'content', 'tool_calls'], 'usage' => [...]]
     *
     * @throws Failure khi chưa cấu hình model, hết thời gian, nhà cung cấp lỗi hoặc trả dữ liệu sai định dạng.
     */
    public function complete(array $messages, array $tools, float $deadline, mixed $toolChoice = 'auto'): array
    {
        $body = $this->buildRequestBody($messages, $tools, $toolChoice);

        $response = $this->call('POST', '/chat/completions', $body, $deadline);

        $message = $response['choices'][0]['message'] ?? null;
        if (!is_array($message) || ($message['role'] ?? '') !== 'assistant') {
            throw new Failure('invalid_provider_response', 502);
        }

        $toolCalls = self::extractToolCalls($message);

        // Nội dung rỗng chỉ được phép khi mô hình đang yêu cầu gọi tool.
        $text = $message['content'] ?? '';
        if (!is_string($text) || strlen($text) > self::MAX_CONTENT_LENGTH || ($text === '' && !$toolCalls)) {
            throw new Failure('empty_provider_response', 502);
        }

        return [
            'message' => ['role' => 'assistant', 'content' => $text, 'tool_calls' => $toolCalls],
            'usage'   => self::extractUsage($response),
        ];
    }

    // =====================================================================
    //  Gọi HTTP
    // =====================================================================

    /**
     * Gửi một yêu cầu HTTP tới 9Router, tự thử lại khi gặp lỗi tạm thời.
     *
     * Quy tắc thử lại:
     *   - Chỉ thử lại với mã 429/502/503/504 và tối đa NINEROUTER_MAX_RETRIES lần (0-2).
     *   - Thời gian chờ lấy từ header Retry-After (nếu có), giới hạn trong khoảng 0.1-2 giây;
     *     nếu không có thì tăng dần 0.2s, 0.4s, ...
     *   - Không bao giờ chờ/gửi vượt quá $deadline.
     *
     * @return array Phần body đã giải mã của phản hồi thành công (2xx).
     */
    private function call(string $method, string $path, ?array $body, float $deadline): array
    {
        $key = $this->config->get('NINEROUTER_API_KEY');
        $base = CurlTransport::base(
            $this->config->get('NINEROUTER_BASE_URL'),
            explode(',', $this->config->get('NINEROUTER_HTTP_HOSTS')),
        );

        if ($key === '') {
            throw new Failure('provider_not_configured', 503);
        }

        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
            'X-9Router-Token-Saver: off', // Tắt tính năng "token saver" của 9Router.
        ];
        $requestTimeout = $this->config->int('NINEROUTER_TIMEOUT_SECONDS', 12, 1, 45);
        $maxRetries = $this->config->int('NINEROUTER_MAX_RETRIES', 2, 0, 2);

        for ($attempt = 0; ; $attempt++) {
            $remaining = $deadline - microtime(true);
            if ($remaining < self::MIN_REMAINING_SECONDS) {
                throw new Failure('generation_timeout', 504);
            }

            try {
                // Timeout mỗi lần gọi không được vượt quá thời gian còn lại của cả lượt.
                $response = $this->http->request(
                    $method,
                    $base . $path,
                    $headers,
                    $body,
                    min($remaining, $requestTimeout),
                );
            } catch (Failure $e) {
                // Che lỗi chi tiết của tầng HTTP, chỉ giữ lại loại lỗi: hết giờ hay không khả dụng.
                throw new Failure(
                    $e->status === 504 ? 'generation_timeout' : 'provider_unavailable',
                    $e->status,
                );
            }

            $status = $response['status'];

            if ($status >= 200 && $status < 300) {
                return $response['body'];
            }

            // Lỗi không thể thử lại, hoặc đã hết số lần thử.
            if (!in_array($status, self::RETRYABLE_STATUSES, true) || $attempt >= $maxRetries) {
                // Log only bounded diagnostic metadata, never prompts, keys or error messages.
                $error = $response['body']['error'] ?? [];
                $knownCodes = ['invalid_request_error', 'invalid_api_key', 'model_not_found',
                    'model_decommissioned', 'model_permission_blocked', 'rate_limit_exceeded',
                    'tool_use_failed', 'json_validate_failed', 'unsupported_parameter'];
                error_log(json_encode([
                    'event' => 'llm_provider_rejected',
                    'upstreamStatus' => $status,
                    'providerCode' => in_array($error['code'] ?? null, $knownCodes, true) ? $error['code'] : null,
                    'providerType' => in_array($error['type'] ?? null, $knownCodes, true) ? $error['type'] : null,
                    'providerParam' => in_array($error['param'] ?? null, ['model', 'messages', 'tools',
                        'tool_choice', 'response_format', 'temperature', 'max_tokens',
                        'max_completion_tokens', 'parallel_tool_calls', 'reasoning_effort'], true) ? $error['param'] : null,
                ], JSON_UNESCAPED_SLASHES));
                throw new Failure($status === 429 ? 'provider_rate_limited' : 'provider_unavailable', 503);
            }

            $wait = min(
                self::MAX_RETRY_WAIT_SECONDS,
                max(
                    self::MIN_RETRY_WAIT_SECONDS,
                    (float) ($response['headers']['retry-after'] ?? (0.2 * ($attempt + 1))),
                ),
            );

            // Chờ xong mà đã quá hạn thì dừng luôn, khỏi thử lại.
            if (microtime(true) + $wait >= $deadline) {
                throw new Failure('generation_timeout', 504);
            }

            usleep((int) ($wait * 1000000));
        }
    }

    // =====================================================================
    //  Dựng yêu cầu
    // =====================================================================

    /**
     * Dựng body gửi tới /chat/completions.
     */
    private function buildRequestBody(array $messages, array $tools, mixed $toolChoice): array
    {
        $model = $this->config->get('NINEROUTER_MODEL');
        if ($model === '') {
            throw new Failure('model_not_configured', 503);
        }

        $body = [
            'model'       => $model,
            'messages'    => $messages,
            'stream'      => false,
            'temperature' => 0, // Cho kết quả ổn định, ít ngẫu nhiên.
            'max_tokens'  => self::MAX_COMPLETION_TOKENS,
        ];

        $isGroq = parse_url($this->config->get('NINEROUTER_BASE_URL'), PHP_URL_HOST) === 'api.groq.com';
        if ($isGroq) {
            unset($body['max_tokens']);
            $body['max_completion_tokens'] = self::MAX_COMPLETION_TOKENS;
            if (in_array($model, ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'], true)) {
                // GPT-OSS on Groq does not support parallel tool use. Reduce reasoning
                // work to preserve the application's bounded turn deadline.
                $body['reasoning_effort'] = 'low';
                if ($tools) {
                    $body['parallel_tool_calls'] = false;
                }
            }
        }

        // Chỉ bật JSON mode khi system prompt yêu cầu trả JSON và cấu hình cho phép.
        // During Groq tool turns, rely on the JSON instruction plus the existing
        // strict final-response validator; reserve response_format for plain chat.
        if (!($isGroq && $tools) && $this->expectsJsonReply($messages) && $this->config->get('NINEROUTER_JSON_MODE', 'true') === 'true') {
            $body['response_format'] = ['type' => 'json_object'];
        }

        if ($tools) {
            $body['tools'] = $tools;
            $body['tool_choice'] = $toolChoice;
        }

        return $body;
    }

    /**
     * Có system prompt nào nhắc tới "JSON" không (không phân biệt hoa thường)?
     * Nếu có, ta coi như mô hình được yêu cầu trả lời bằng JSON.
     */
    private function expectsJsonReply(array $messages): bool
    {
        foreach ($messages as $prompt) {
            if (($prompt['role'] ?? '') === 'system'
                && is_string($prompt['content'] ?? null)
                && stripos($prompt['content'], 'JSON') !== false
            ) {
                return true;
            }
        }

        return false;
    }

    // =====================================================================
    //  Kiểm tra phản hồi
    // =====================================================================

    /**
     * Lấy và kiểm tra danh sách lời gọi tool trong message của mô hình.
     *
     * @throws Failure('invalid_provider_response') nếu có lời gọi tool sai cấu trúc hoặc vượt giới hạn.
     */
    private static function extractToolCalls(array $message): array
    {
        $calls = $message['tool_calls'] ?? [];

        if (!is_array($calls) || count($calls) > self::MAX_TOOL_CALLS) {
            throw new Failure('invalid_provider_response', 502);
        }

        $seenIds = [];
        foreach ($calls as $call) {
            if (!self::isValidToolCall($call, $seenIds)) {
                throw new Failure('invalid_provider_response', 502);
            }
            $seenIds[$call['id']] = true;
        }

        return $calls;
    }

    /**
     * Một lời gọi tool hợp lệ khi:
     *   - có 'id' là chuỗi không quá dài và không trùng với các lời gọi trước;
     *   - 'type' là 'function';
     *   - có tên tool đúng mẫu và chuỗi tham số không quá dài.
     *
     * @param mixed $call    Phần tử lấy từ phản hồi của nhà cung cấp (chưa được tin cậy).
     * @param array $seenIds Các id đã gặp (khóa là id).
     */
    private static function isValidToolCall(mixed $call, array $seenIds): bool
    {
        if (!is_string($call['id'] ?? null)
            || strlen($call['id']) > self::MAX_TOOL_CALL_ID_LENGTH
            || isset($seenIds[$call['id']])
            || ($call['type'] ?? '') !== 'function'
            || !is_string($call['function']['name'] ?? null)
            || !is_string($call['function']['arguments'] ?? null)
            || strlen($call['function']['arguments']) > self::MAX_TOOL_ARGUMENTS_LENGTH
        ) {
            return false;
        }

        return (bool) preg_match(self::TOOL_NAME_PATTERN, $call['function']['name']);
    }

    /**
     * Lấy thống kê token; bỏ qua mọi giá trị không phải số nguyên trong khoảng hợp lệ.
     */
    private static function extractUsage(array $response): array
    {
        $usage = [];

        foreach (self::USAGE_FIELDS as $field) {
            $value = $response['usage'][$field] ?? null;

            if (is_int($value) && $value >= 0 && $value <= self::MAX_TOKEN_COUNT) {
                $usage[$field] = $value;
            }
        }

        return $usage;
    }
}
