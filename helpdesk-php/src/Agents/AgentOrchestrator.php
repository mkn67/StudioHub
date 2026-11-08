<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Agents;

use StudioHub\Helpdesk\Config;
use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Util;
use StudioHub\Helpdesk\Knowledge\CitationBuilder;
use StudioHub\Helpdesk\LLM\LanguageModel;
use StudioHub\Helpdesk\Security\Actor;

/**
 * Điều phối vòng lặp "agent": gọi mô hình ngôn ngữ, thực thi các tool mà mô hình yêu cầu,
 * rồi chuyển câu trả lời JSON cuối cùng của mô hình thành phản hồi gửi cho người dùng.
 *
 * Luồng tổng quát của một lượt hội thoại:
 *   1. Dựng danh sách message (system prompt + lịch sử rút gọn + câu hỏi mới, đã ẩn dữ liệu nhạy cảm).
 *   2. Lặp tối đa N bước:
 *        - Nếu mô hình yêu cầu gọi tool  -> chạy tool, đưa kết quả lại cho mô hình, lặp tiếp.
 *        - Nếu mô hình trả lời cuối cùng -> kiểm tra JSON hợp lệ rồi dựng phản hồi theo "kind".
 *   3. Vượt giới hạn (thời gian / số bước / số lần gọi tool) thì ném Failure.
 */
final class AgentOrchestrator
{
    /** Số tin nhắn lịch sử gần nhất được đưa vào ngữ cảnh. */
    private const HISTORY_LIMIT = 6;

    /** Số ký tự tối đa giữ lại cho mỗi tin nhắn lịch sử. */
    private const HISTORY_MAX_CHARS = 1000;

    /** Độ sâu JSON tối đa khi giải mã (chống payload lồng quá sâu). */
    private const JSON_MAX_DEPTH = 16;

    /** Mẫu regex bóc khối ```json ... ``` mà mô hình đôi khi bọc quanh JSON. */
    private const CODE_FENCE_PATTERN = '/^```(?:json)?\s*([\s\S]*?)\s*```$/i';

    /** Nhắc mô hình trả lại đúng định dạng khi lần trả lời trước không phải JSON hợp lệ. */
    private const PROTOCOL_CORRECTION =
        'Protocol correction: your last response was not a valid JSON object. '
        . 'Reply with one JSON object only, no Markdown or prose. '
        . 'For a greeting use {"kind":"greeting"}. '
        . 'For unsupported information use {"kind":"unsupported"}. '
        . 'For policy use only actual retrieved complete claims as specified by the system. '
        . 'Never invent tool results or citations.';

    // ---- Các thông điệp hiển thị cho người dùng ----

    private const MSG_GREETING =
        'Xin chào! Mình là trợ lý hỗ trợ StudioHub. Bạn muốn tìm hiểu về phòng Studio hay cần hỗ trợ một sự cố?';

    private const MSG_HANDOFF_PENDING =
        'Yêu cầu gặp nhân viên đang chờ trong hàng đợi chưa nhận. '
        . 'Chưa có nhân viên tiếp nhận; cuộc trò chuyện được giữ lại.';

    private const MSG_ROOMS =
        'Thông tin danh mục phòng được lấy từ API StudioHub; chưa kiểm tra phòng trống.';

    private const MSG_RATES_EMPTY = 'API không trả bảng giá đang áp dụng.';

    private const MSG_RATES_NOTE =
        ' Đây là thông tin bảng giá, chưa phải báo giá toàn bộ đơn và chưa kiểm tra phòng trống.';

    private const MSG_SUPPORT_PROPOSAL =
        'Mình đã chuẩn bị nội dung sự cố. Hãy xem tóm tắt và xác nhận bên dưới; chưa có ticket nào được tạo.';

    private const MSG_UNSUPPORTED =
        'Hiện mình chưa có thông tin chính sách đã được xác nhận hoặc API phù hợp để trả lời chính xác. '
        . 'Mình không thể tra cứu đơn, xác nhận tiền, hủy đơn hay hoàn tiền. '
        . 'Bạn có thể yêu cầu chuẩn bị phiếu hỗ trợ.';

    /** Câu hỏi làm rõ theo từng trường thông tin còn thiếu. */
    private const CLARIFICATION_QUESTIONS = [
        'description' => 'Bạn mô tả ngắn sự cố cần hỗ trợ được không? Không gửi mật khẩu hoặc thông tin thanh toán.',
        'studio'      => 'Sự cố xảy ra tại Studio nào? Thông tin bạn cung cấp chưa được xác minh.',
        'category'    => 'Bạn cần hỗ trợ tài khoản, lỗi nền tảng, điều kiện phòng hay tranh chấp cọc?',
    ];

    public function __construct(
        private Config $config,
        private LanguageModel $model,
        private ToolRegistry $registry,
        private string $corpusVersion,
    ) {
    }

    /**
     * Chạy một lượt hội thoại và trả về phản hồi cho người dùng.
     *
     * @param string $text      Câu hỏi mới của người dùng.
     * @param array  $history   Lịch sử hội thoại, mỗi phần tử có 'role' và 'text'.
     * @param Actor  $actor     Người thực hiện (dùng để phân quyền tool).
     * @param array  $evidence  (tham chiếu) Bằng chứng thu thập được từ tool (rooms, rates, chunks,
     *                          proposal, handoff...). Hàm này cũng ghi thêm 'trace' và 'usage' vào đây.
     *
     * @throws Failure khi quá thời gian, quá số bước/số lần gọi tool, hoặc mô hình trả lời sai định dạng.
     */
    public function run(string $text, array $history, Actor $actor, array &$evidence): array
    {
        // Keep the complete turn below the proxy's request deadline to avoid 504s.
        $deadline = microtime(true) + $this->config->int('HELPDESK_TURN_TIMEOUT_SECONDS', 22, 3, 25);
        $maxSteps = $this->config->int('HELPDESK_MAX_AGENT_STEPS', 5, 1, 8);
        $maxToolCalls = $this->config->int('HELPDESK_MAX_TOOL_CALLS', 6, 1, 12);

        $messages = $this->buildInitialMessages($text, $history);

        $seen = [];          // Các lời gọi tool đã thực hiện (chống gọi lặp lại y hệt).
        $trace = [];         // Nhật ký kiểm toán các lần gọi tool.
        $usage = [];         // Thống kê token/usage của từng lần gọi mô hình.
        $calls = 0;          // Tổng số lần gọi tool trong lượt này.
        $formatRepairs = 0;  // Số lần đã nhắc mô hình sửa định dạng.

        for ($step = 0; $step < $maxSteps; $step++) {
            if (microtime(true) > $deadline) {
                throw new Failure('generation_timeout', 504);
            }

            $reply = $this->model->complete($messages, $this->registry->definitions($actor), $deadline);
            $message = $reply['message'];
            $usage[] = $reply['usage'];
            $messages[] = $message;

            // --- Trường hợp 1: mô hình yêu cầu gọi tool ---
            if ($message['tool_calls']) {
                foreach ($message['tool_calls'] as $call) {
                    if (++$calls > $maxToolCalls) {
                        throw new Failure('tool_limit', 422);
                    }

                    $result = $this->executeToolCall($call, $actor, $seen, $trace);
                    $messages[] = [
                        'role'         => 'tool',
                        'tool_call_id' => $call['id'],
                        'content'      => Util::json($result),
                    ];
                }
                continue; // Cho mô hình xem kết quả tool rồi tiếp tục.
            }

            // --- Trường hợp 2: mô hình trả lời cuối cùng ---
            $final = self::decodeFinalResponse(trim($message['content']));

            if ($final === null) {
                // Cho phép nhắc sửa định dạng đúng 1 lần, và chỉ khi còn bước để chạy tiếp.
                if ($formatRepairs++ === 0 && $step + 1 < $maxSteps) {
                    $messages[] = ['role' => 'user', 'content' => self::PROTOCOL_CORRECTION];
                    continue;
                }
                throw new Failure('invalid_agent_response', 502);
            }

            $evidence['trace'] = $trace;
            $evidence['usage'] = $usage;

            return $this->buildResponse($final, $evidence);
        }

        throw new Failure('agent_step_limit', 422);
    }

    /**
     * Tạo phản hồi "từ chối / không hỗ trợ" mặc định (cũng dùng làm khung cho các phản hồi khác).
     */
    public static function base(string $text, string $state = 'unavailable'): array
    {
        return [
            'text'        => $text,
            'mode'        => 'connected',
            'state'       => $state,
            'sources'     => [],
            'citations'   => [],
            'answerKind'  => 'abstention',
            'reasonCode'  => 'unsupported_question',
        ];
    }

    /**
     * Dựng danh sách message ban đầu: system prompt, lịch sử gần nhất và câu hỏi mới.
     * Mọi nội dung người dùng đều được ẩn dữ liệu nhạy cảm (redact) trước khi gửi cho mô hình.
     */
    private function buildInitialMessages(string $text, array $history): array
    {
        $messages = [
            ['role' => 'system', 'content' => file_get_contents($this->config->path('config/system-prompt.txt'))],
        ];

        foreach (array_slice($history, -self::HISTORY_LIMIT) as $item) {
            $messages[] = [
                'role'    => $item['role'],
                'content' => Util::redact(mb_substr($item['text'], 0, self::HISTORY_MAX_CHARS)),
            ];
        }

        $messages[] = ['role' => 'user', 'content' => Util::redact($text)];

        return $messages;
    }

    /**
     * Thực thi một lời gọi tool và trả về kết quả dạng ['ok' => bool, ...] để đưa lại cho mô hình.
     * Lỗi được gói thành kết quả (không ném ra ngoài) để mô hình tự xử lý ở bước sau.
     *
     * @param array $seen  (tham chiếu) Tập khóa các lời gọi đã chạy, dùng phát hiện gọi lặp.
     * @param array $trace (tham chiếu) Nhật ký kiểm toán, được bổ sung sau mỗi lần gọi.
     */
    private function executeToolCall(array $call, Actor $actor, array &$seen, array &$trace): array
    {
        $name = $call['function']['name'];
        $args = $call['function']['arguments'];

        try {
            // Chuẩn hóa tham số để hai lời gọi giống nhau về nội dung luôn cho cùng một khóa.
            $canonical = json_decode($args, true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
            $key = $name . ':' . Util::canonicalJson($canonical);

            if (isset($seen[$key])) {
                throw new Failure('repeated_tool_call', 422);
            }
            $seen[$key] = true;

            $out = $this->registry->execute($name, $args, $actor);
            $trace[] = $out['audit'];

            return ['ok' => true, 'data' => $out['result']];
        } catch (\JsonException) {
            // Tham số tool không phải JSON hợp lệ.
            $trace[] = ['tool' => $name, 'outcome' => 'invalid_tool_arguments'];

            return ['ok' => false, 'error' => 'invalid_tool_arguments'];
        } catch (Failure $e) {
            $trace[] = ['tool' => $name, 'outcome' => $e->reason];

            return ['ok' => false, 'error' => $e->reason];
        }
    }

    /**
     * Giải mã câu trả lời cuối của mô hình thành mảng có trường 'kind'.
     * Chấp nhận cả trường hợp JSON bị bọc trong khối ```json ... ```.
     *
     * @return array|null Mảng hợp lệ, hoặc null nếu sai định dạng.
     */
    private static function decodeFinalResponse(string $content): ?array
    {
        if (preg_match(self::CODE_FENCE_PATTERN, $content, $fence)) {
            $content = trim($fence[1]);
        }

        try {
            $final = json_decode($content, true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return is_array($final) && is_string($final['kind'] ?? null) ? $final : null;
    }

    /**
     * Chuyển câu trả lời JSON của mô hình (theo 'kind') thành phản hồi cuối cùng.
     * Chỉ dùng dữ liệu đã được tool xác nhận trong $evidence; nếu thiếu bằng chứng thì từ chối.
     */
    private function buildResponse(array $final, array $evidence): array
    {
        $kind = $final['kind'] ?? '';

        // Nếu đã có yêu cầu gặp nhân viên đang chờ thì ưu tiên báo trạng thái này, bất kể kind là gì.
        if (!empty($evidence['handoff'])) {
            return self::handoffPendingResponse();
        }

        // Chào hỏi.
        if ($kind === 'greeting') {
            return array_replace(
                self::base(self::MSG_GREETING, 'answered'),
                ['answerKind' => 'greeting', 'reasonCode' => null],
            );
        }

        // Câu hỏi về chính sách: trả lời kèm trích dẫn từ các đoạn tài liệu đã truy xuất (RAG).
        if ($kind === 'policy') {
            $answer = CitationBuilder::answer($final['claims'] ?? [], $evidence['chunks'] ?? [], $this->corpusVersion);

            return [
                'text'       => $answer['text'],
                'mode'       => 'connected',
                'state'      => 'answered',
                'sources'    => $answer['sources'],
                'citations'  => $answer['citations'],
                'answerKind' => 'rag',
                'reasonCode' => null,
            ];
        }

        // Danh mục phòng (lấy từ API, chưa kiểm tra phòng trống).
        if ($kind === 'rooms' && !empty($evidence['rooms'])) {
            return [
                'text'       => self::MSG_ROOMS,
                'mode'       => 'connected',
                'state'      => 'answered',
                'sources'    => [],
                'citations'  => [],
                'answerKind' => 'catalog',
                'reasonCode' => null,
                'cards'      => array_values($evidence['rooms']),
            ];
        }

        // Bảng giá theo phòng.
        if ($kind === 'rates' && !empty($evidence['rates'])) {
            return [
                'text'       => self::formatRates($evidence['rates']),
                'mode'       => 'connected',
                'state'      => 'answered',
                'sources'    => [],
                'citations'  => [],
                'answerKind' => 'catalog',
                'reasonCode' => null,
            ];
        }

        // Báo sự cố: chỉ đề xuất ticket, người dùng phải xác nhận mới tạo.
        if ($kind === 'support' && !empty($evidence['proposal'])) {
            return self::base(self::MSG_SUPPORT_PROPOSAL) + ['ticketProposal' => $evidence['proposal']];
        }

        // Yêu cầu gặp nhân viên.
        if ($kind === 'handoff' && !empty($evidence['handoff'])) {
            return self::handoffPendingResponse();
        }

        // Cần hỏi thêm thông tin; nếu trường không hợp lệ thì dùng câu hỏi mô tả sự cố.
        if ($kind === 'clarification') {
            $question = self::CLARIFICATION_QUESTIONS[$final['field'] ?? 'description']
                ?? self::CLARIFICATION_QUESTIONS['description'];

            return self::base($question);
        }

        // Mặc định (kể cả kind 'unsupported' hoặc thiếu bằng chứng): từ chối an toàn.
        return self::base(self::MSG_UNSUPPORTED);
    }

    /**
     * Phản hồi khi yêu cầu gặp nhân viên đang chờ trong hàng đợi.
     */
    private static function handoffPendingResponse(): array
    {
        return self::base(self::MSG_HANDOFF_PENDING, 'human_handoff') + ['handoffStatus' => 'human_pending'];
    }

    /**
     * Ghép bảng giá của các phòng thành văn bản, mỗi mức giá một dòng, kèm lưu ý ở cuối.
     */
    private static function formatRates(array $rateResults): string
    {
        $lines = [];

        foreach ($rateResults as $rateResult) {
            foreach ($rateResult['rates'] as $rate) {
                $lines[] = 'Phòng ' . $rateResult['roomId'] . ': '
                    . $rate['unitPrice'] . ' VND / ' . $rate['rateUnit']
                    . ' (kiểm tra ' . $rateResult['checkedAt'] . ').';
            }
        }

        return ($lines ? implode("\n", $lines) : self::MSG_RATES_EMPTY) . self::MSG_RATES_NOTE;
    }
}
