<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk;

/**
 * Các hàm tiện ích dùng chung: sinh/kiểm tra UUID, mã hoá JSON, kiểm tra dữ liệu đầu vào
 * và che (redact) thông tin nhạy cảm trong văn bản.
 */
final class Util
{
    /** Mẫu UUID phiên bản 4 (chữ số phiên bản = 4, biến thể = 8/9/a/b). */
    private const UUID_V4_PATTERN = '/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i';

    /** Địa chỉ email. */
    private const EMAIL_PATTERN = '/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/iu';

    /** Thông tin xác thực: token dạng "Bearer xxx" hoặc khoá API dạng "sk-xxx". */
    private const CREDENTIAL_PATTERN = '/(?:Bearer\\s+|sk-)[A-Za-z0-9_.-]+/i';

    /**
     * Dãy 9–19 chữ số (cho phép dấu + ở đầu và dấu cách/gạch nối giữa các số),
     * dùng để bắt số điện thoại, số thẻ, số tài khoản... Không khớp nếu dính liền với chữ số khác.
     */
    private const NUMBER_PATTERN = '/(?<!\\d)(?:\\+?\\d[ -]?){9,19}(?!\\d)/';

    /** Sinh một UUID v4 ngẫu nhiên an toàn về mặt mật mã. */
    public static function id(): string
    {
        $bytes = random_bytes(16);

        // Đặt bit phiên bản (4) và bit biến thể theo chuẩn RFC 4122
        $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
        $bytes[8] = chr((ord($bytes[8]) & 63) | 128);

        $hex = bin2hex($bytes);

        // Định dạng 8-4-4-4-12
        return substr($hex, 0, 8) . '-'
            . substr($hex, 8, 4) . '-'
            . substr($hex, 12, 4) . '-'
            . substr($hex, 16, 4) . '-'
            . substr($hex, 20);
    }

    /**
     * Kiểm tra giá trị là UUID v4 hợp lệ và chuẩn hoá về chữ thường.
     *
     * @throws Failure `invalid_id` nếu không hợp lệ.
     */
    public static function uuid(mixed $id): string
    {
        if (!is_string($id) || !preg_match(self::UUID_V4_PATTERN, $id)) {
            throw new Failure('invalid_id');
        }

        return strtolower($id);
    }

    /** Thời điểm hiện tại theo định dạng ISO 8601 (ATOM), ví dụ: 2026-10-27T10:30:00+07:00. */
    public static function now(): string
    {
        return date(DATE_ATOM);
    }

    /**
     * Mã hoá giá trị thành JSON.
     * Giữ nguyên ký tự Unicode và dấu `/`; ném JsonException nếu mã hoá thất bại.
     */
    public static function json(mixed $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Mã hoá JSON ở dạng "chuẩn tắc" (canonical): các mảng kết hợp được sắp theo khoá
     * ở mọi cấp, nên cùng một dữ liệu luôn cho ra cùng một chuỗi (hữu ích để băm hoặc so sánh).
     * Mảng dạng danh sách (list) giữ nguyên thứ tự phần tử.
     */
    public static function canonicalJson(mixed $value): string
    {
        $sort = static function (mixed $v) use (&$sort): mixed {
            if (!is_array($v)) {
                return $v;
            }

            if (!array_is_list($v)) {
                ksort($v);
            }

            return array_map($sort, $v); // Đệ quy xuống các cấp con
        };

        return self::json($sort($value));
    }

    /**
     * Kiểm tra chuỗi văn bản đầu vào và trả về bản đã `trim`.
     *
     * Điều kiện: là chuỗi, không rỗng (sau khi trim), và độ dài không vượt quá $max
     * theo cả hai cách đếm: số ký tự Unicode và số đơn vị UTF-16
     * (cách đếm của JavaScript `.length`, trong đó emoji chiếm 2 đơn vị).
     * Nhờ vậy giới hạn luôn nhất quán với giao diện frontend.
     *
     * @throws Failure `invalid_text` (422) nếu không hợp lệ.
     */
    public static function text(mixed $text, int $max = 1000): string
    {
        if (
            !is_string($text)
            || trim($text) === ''
            || mb_strlen($text, 'UTF-8') > $max
            || strlen(iconv('UTF-8', 'UTF-16LE', $text)) / 2 > $max
        ) {
            throw new Failure('invalid_text', 422);
        }

        return trim($text);
    }

    /**
     * Đảm bảo $body chỉ chứa các khoá nằm trong danh sách cho phép.
     *
     * @param array<string, mixed> $body
     * @param array<int, string>   $allowed
     *
     * @throws Failure `unknown_field` nếu có khoá lạ.
     */
    public static function fields(array $body, array $allowed): void
    {
        if (array_diff(array_keys($body), $allowed)) {
            throw new Failure('unknown_field');
        }
    }

    /**
     * Kiểm tra ngữ cảnh (context) của request.
     * Có thể là null; nếu có thì chỉ được chứa khoá `surface` với giá trị
     * thuộc: public, customer, host, admin.
     *
     * @throws Failure `invalid_context` / `unknown_field` nếu không hợp lệ.
     */
    public static function context(mixed $context): void
    {
        if ($context === null) {
            return;
        }

        if (!is_array($context)) {
            throw new Failure('invalid_context');
        }

        self::fields($context, ['surface']);

        if (!in_array($context['surface'] ?? null, ['public', 'customer', 'host', 'admin'], true)) {
            throw new Failure('invalid_context');
        }
    }

    /**
     * Che thông tin nhạy cảm trong văn bản trước khi lưu hoặc ghi log:
     * email thành [email], token/khoá API thành [credential], dãy số dài thành [number].
     *
     * Nếu văn bản không hợp lệ (ví dụ sai mã hoá UTF-8) khiến regex thất bại,
     * hàm trả về chuỗi rỗng thay vì để lọt nội dung chưa được che.
     */
    public static function redact(string $text): string
    {
        $text = preg_replace(self::EMAIL_PATTERN, '[email]', $text) ?? '';
        $text = preg_replace(self::CREDENTIAL_PATTERN, '[credential]', $text) ?? '';

        return preg_replace(self::NUMBER_PATTERN, '[number]', $text) ?? '';
    }
}