<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Agents;

use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Util;
use StudioHub\Helpdesk\Security\Actor;
use StudioHub\Helpdesk\Tools\Schema;

/**
 * Kho đăng ký các tool (công cụ) mà mô hình ngôn ngữ được phép gọi.
 *
 * Mỗi tool gồm: tên, mô tả, schema đầu vào, schema đầu ra, hàm thực thi và hàm phân quyền.
 * Registry có hai nhiệm vụ chính:
 *   - definitions(): xuất danh sách tool (định dạng "function calling") mà người dùng hiện tại được dùng.
 *   - execute():     kiểm tra quyền, xác thực tham số/kết quả theo schema rồi chạy tool và ghi nhật ký kiểm toán.
 */
final class ToolRegistry
{
    /** Độ sâu JSON tối đa khi giải mã tham số tool (chống payload lồng quá sâu). */
    private const JSON_MAX_DEPTH = 16;

    /** Danh sách tool đã đăng ký, khóa theo tên tool. */
    private array $tools = [];

    /**
     * Đăng ký một tool.
     *
     * @param array    $input     Schema JSON của tham số đầu vào (xem object()).
     * @param array    $output    Schema JSON của kết quả trả về.
     * @param callable $execute   Hàm chạy tool: fn(array $args, Actor $actor): array.
     * @param callable $authorize Hàm phân quyền: fn(Actor $actor): bool.
     */
    public function add(
        string $name,
        string $description,
        array $input,
        array $output,
        callable $execute,
        callable $authorize,
    ): void {
        $this->tools[$name] = compact('name', 'description', 'input', 'output', 'execute', 'authorize');
    }

    /**
     * Trả về định nghĩa các tool mà $actor được phép dùng, để gửi kèm yêu cầu cho mô hình.
     */
    public function definitions(Actor $actor): array
    {
        $definitions = [];

        foreach ($this->tools as $tool) {
            if (!$this->isAuthorized($tool, $actor)) {
                continue;
            }

            $input = $tool['input'];

            // Tool không có tham số: ép 'properties' thành object rỗng để JSON ra {} chứ không phải [].
            if (($input['properties'] ?? null) === []) {
                $input['properties'] = (object) [];
            }

            $definitions[] = [
                'type'     => 'function',
                'function' => [
                    'name'        => $tool['name'],
                    'description' => $tool['description'],
                    'parameters'  => $input,
                ],
            ];
        }

        return $definitions;
    }

    /**
     * Thực thi một tool theo yêu cầu của mô hình.
     *
     * Các bước: kiểm tra tool tồn tại và được phép -> giải mã tham số -> xác thực tham số
     * -> chạy tool -> xác thực kết quả -> trả kết quả kèm bản ghi kiểm toán.
     *
     * @param string $json Chuỗi JSON tham số do mô hình sinh ra.
     *
     * @return array ['result' => kết quả tool, 'audit' => thông tin kiểm toán].
     *
     * @throws Failure('tool_not_allowed')        nếu tool không tồn tại hoặc không được phép (403).
     * @throws Failure('invalid_tool_arguments')  nếu tham số không phải JSON object hợp lệ (422).
     */
    public function execute(string $name, string $json, Actor $actor): array
    {
        $tool = $this->tools[$name] ?? null;

        // Tool không tồn tại và tool không được phép đều báo cùng một lỗi để không lộ thông tin.
        if (!$tool || !$this->isAuthorized($tool, $actor)) {
            throw new Failure('tool_not_allowed', 403);
        }

        $args = $this->decodeArguments($json);

        Schema::check($args, $tool['input']);

        $start = microtime(true);
        $result = ($tool['execute'])($args, $actor);

        // Kết quả tool cũng phải đúng schema trước khi được đưa lại cho mô hình.
        Schema::check($result, $tool['output']);

        return [
            'result' => $result,
            'audit'  => [
                'tool'         => $name,
                // Chỉ lưu mã băm của tham số (không lưu nội dung gốc) để tránh lộ dữ liệu nhạy cảm.
                'argumentHash' => hash('sha256', Util::canonicalJson($args)),
                'elapsedMs'    => (int) ((microtime(true) - $start) * 1000),
                'outcome'      => 'success',
            ],
        ];
    }

    /**
     * Tạo schema JSON kiểu object (không cho phép thuộc tính ngoài danh sách khai báo).
     *
     * @param array $properties Các thuộc tính và schema của từng thuộc tính.
     * @param array $required   Tên các thuộc tính bắt buộc.
     */
    public static function object(array $properties, array $required = []): array
    {
        return [
            'type'                 => 'object',
            'properties'           => $properties,
            'required'             => $required,
            'additionalProperties' => false,
        ];
    }

    /**
     * Tạo schema JSON kiểu chuỗi, không rỗng và có độ dài tối đa $max.
     */
    public static function string(int $max = 1000): array
    {
        return ['type' => 'string', 'minLength' => 1, 'maxLength' => $max];
    }

    /**
     * Kiểm tra $actor có quyền dùng tool này không.
     */
    private function isAuthorized(array $tool, Actor $actor): bool
    {
        return (bool) ($tool['authorize'])($actor);
    }

    /**
     * Giải mã chuỗi JSON tham số thành mảng kết hợp.
     * Bắt buộc phải là JSON object (bắt đầu bằng '{'); mảng JSON như "[...]" bị từ chối
     * dù PHP cũng giải mã được thành mảng.
     */
    private function decodeArguments(string $json): array
    {
        try {
            $args = json_decode($json, true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new Failure('invalid_tool_arguments', 422);
        }

        if (!is_array($args) || !str_starts_with(ltrim($json), '{')) {
            throw new Failure('invalid_tool_arguments', 422);
        }

        return $args;
    }
}