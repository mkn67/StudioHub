<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk;

/**
 * Cấu hình ứng dụng, đọc từ biến môi trường và tệp .env ở thư mục gốc.
 *
 * Thứ tự ưu tiên khi lấy một giá trị:
 *   1. Biến môi trường của hệ thống (getenv).
 *   2. Giá trị trong tệp .env.
 *   3. Giá trị mặc định do nơi gọi truyền vào.
 */
final class Config
{
    /** Dòng hợp lệ trong .env: TÊN_BIẾN=giá_trị (tên viết hoa, bắt đầu bằng chữ cái). */
    private const ENV_LINE_PATTERN = '/^([A-Z][A-Z0-9_]*)=(.*)$/';

    /** Các ký tự bị cắt ở hai đầu giá trị trong .env: khoảng trắng, tab, nháy kép và nháy đơn. */
    private const ENV_VALUE_TRIM_CHARS = " \t\"'";

    /** Độ dài tối thiểu (ký tự) của khóa bí mật. */
    private const SECRET_MIN_LENGTH = 32;

    /** Khoảng giá trị mặc định cho cấu hình số nguyên. */
    private const DEFAULT_INT_MIN = 1;
    private const DEFAULT_INT_MAX = 120;

    /**
     * @param string $root   Thư mục gốc của dự án.
     * @param array  $values Các giá trị đã đọc từ tệp .env (tên biến => giá trị).
     */
    public function __construct(public readonly string $root, private array $values = [])
    {
    }

    /**
     * Nạp cấu hình từ tệp .env trong $root (nếu có).
     * Các dòng không đúng định dạng (dòng trống, dòng chú thích bắt đầu bằng '#'...) sẽ bị bỏ qua.
     */
    public static function load(string $root): self
    {
        $values = [];
        $envFile = $root . '/.env';

        if (is_file($envFile)) {
            // file() trả về false nếu không đọc được; khi đó coi như tệp rỗng.
            foreach (file($envFile, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
                $parsed = self::parseEnvLine($line);

                if ($parsed !== null) {
                    [$name, $value] = $parsed;
                    $values[$name] = $value;
                }
            }
        }

        return new self($root, $values);
    }

    /**
     * Lấy giá trị chuỗi theo khóa: ưu tiên biến môi trường, sau đó đến .env, cuối cùng là $default.
     */
    public function get(string $key, string $default = ''): string
    {
        $value = getenv($key);

        return $value !== false ? $value : ($this->values[$key] ?? $default);
    }

    /**
     * Lấy giá trị số nguyên và ép vào khoảng [$min, $max].
     * Giá trị mặc định cũng bị ép vào khoảng này; giá trị không phải số được hiểu là 0 rồi bị kẹp về $min.
     */
    public function int(string $key, int $default, int $min = self::DEFAULT_INT_MIN, int $max = self::DEFAULT_INT_MAX): int
    {
        return max($min, min($max, (int) $this->get($key, (string) $default)));
    }

    /**
     * Lấy giá trị đúng/sai: chỉ chuỗi chính xác "true" mới là true, mọi giá trị khác (kể cả thiếu) là false.
     */
    public function bool(string $key): bool
    {
        return $this->get($key) === 'true';
    }

    /**
     * Ghép đường dẫn tương đối với thư mục gốc của dự án.
     */
    public function path(string $relative): string
    {
        return $this->root . '/' . $relative;
    }

    /**
     * Khóa bí mật dùng để ký (ví dụ ký con trỏ phân trang).
     *
     * @throws Failure('bridge_not_configured') nếu chưa cấu hình hoặc khóa ngắn hơn 32 ký tự (503).
     */
    public function secret(): string
    {
        $key = $this->get('HELPDESK_BRIDGE_SECRET');

        if (strlen($key) < self::SECRET_MIN_LENGTH) {
            throw new Failure('bridge_not_configured', 503);
        }

        return $key;
    }

    /**
     * Dấu vân tay (hash) của cấu hình cổng mô hình: URL gốc, tên model và khóa API.
     * Khóa API được băm trước nên dấu vân tay không làm lộ khóa; dùng để biết cấu hình có bị đổi hay không.
     */
    public function gatewayFingerprint(): string
    {
        return hash(
            'sha256',
            $this->get('NINEROUTER_BASE_URL')
            . '|' . $this->get('NINEROUTER_MODEL')
            . '|' . hash('sha256', $this->get('NINEROUTER_API_KEY')),
        );
    }

    /**
     * Phân tích một dòng của tệp .env.
     * Chỉ hỗ trợ dạng đơn giản TÊN=giá_trị (không xử lý chú thích cuối dòng hay tiền tố "export").
     *
     * @return array{0: string, 1: string}|null [tên, giá trị], hoặc null nếu dòng không hợp lệ.
     */
    private static function parseEnvLine(string $line): ?array
    {
        if (!preg_match(self::ENV_LINE_PATTERN, trim($line), $matches)) {
            return null;
        }

        return [$matches[1], trim($matches[2], self::ENV_VALUE_TRIM_CHARS)];
    }
}