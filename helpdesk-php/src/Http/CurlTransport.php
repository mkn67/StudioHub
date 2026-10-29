<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Http;

use JsonException;
use StudioHub\Helpdesk\{Failure, Util};

/**
 * Transport HTTP dựa trên cURL, dùng để gọi các dịch vụ upstream (LLM, danh mục công khai, ...).
 *
 * Thiết kế theo hướng an toàn:
 * - Không tự động theo dõi redirect (tránh SSRF qua chuyển hướng).
 * - Chỉ cho phép giao thức HTTP/HTTPS và bắt buộc xác minh chứng chỉ SSL.
 * - Giới hạn dung lượng phản hồi và độ sâu JSON để tránh bị tấn công cạn tài nguyên.
 * - Phản hồi upstream bắt buộc phải là JSON dạng mảng/đối tượng.
 */
final class CurlTransport implements Transport
{
    /** Dung lượng phản hồi tối đa cho phép: 512 KB. */
    private const MAX_RESPONSE_BYTES = 524288;

    /** Thời gian chờ kết nối tối đa (giây). */
    private const MAX_CONNECT_SECONDS = 3;

    /** Độ sâu tối đa khi giải mã JSON. */
    private const JSON_MAX_DEPTH = 64;

    /**
     * Gửi một request HTTP và trả về phản hồi đã giải mã JSON.
     *
     * @param array<int, string>        $headers Danh sách header dạng "Tên: giá trị".
     * @param array<string, mixed>|null $body    Nội dung gửi đi (sẽ mã hoá JSON); null nếu không có.
     * @param float                     $timeout Tổng thời gian chờ tối đa (giây).
     *
     * @return array{status: int, body: array<mixed>, headers: array<string, string>}
     *
     * @throws Failure 503 nếu thiếu cURL/upstream không truy cập được, 504 nếu quá thời gian,
     *                 502 nếu phản hồi không phải JSON hợp lệ.
     */
    public function request(string $method, string $url, array $headers, ?array $body, float $timeout): array
    {
        if (!extension_loaded('curl')) {
            throw new Failure('curl_unavailable', 503);
        }

        $curl            = curl_init($url);
        $responseHeaders = []; // Header phản hồi (khoá chữ thường)
        $receivedBytes   = 0;  // Tổng số byte đã nhận, dùng để chặn phản hồi quá lớn
        $data            = ''; // Nội dung phản hồi

        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => false, // Dữ liệu được nhận qua WRITEFUNCTION bên dưới

            // Thời gian chờ: kết nối tối đa 3 giây (hoặc $timeout nếu nhỏ hơn), toàn bộ request tối đa $timeout
            CURLOPT_CONNECTTIMEOUT_MS => (int) (min(self::MAX_CONNECT_SECONDS, $timeout) * 1000),
            CURLOPT_TIMEOUT_MS        => (int) ($timeout * 1000),

            // Bảo mật: không theo redirect, chỉ cho phép HTTP/HTTPS, xác minh chứng chỉ SSL
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,

            // Thu thập header phản hồi, chuẩn hoá tên header về chữ thường
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
                if (str_contains($line, ':')) {
                    [$name, $value] = explode(':', $line, 2);
                    $responseHeaders[strtolower(trim($name))] = trim($value);
                }

                return strlen($line);
            },

            // Thu thập nội dung phản hồi; trả về 0 để ngắt kết nối khi vượt quá giới hạn dung lượng
            CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$data, &$receivedBytes): int {
                $receivedBytes += strlen($chunk);

                if ($receivedBytes > self::MAX_RESPONSE_BYTES) {
                    return 0;
                }

                $data .= $chunk;

                return strlen($chunk);
            },
        ]);

        if ($body !== null) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, Util::json($body));
        }

        $ok     = curl_exec($curl);
        $error  = curl_errno($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

        // Lỗi mạng: phân biệt hết thời gian chờ (504) với các lỗi còn lại (503)
        if ($ok === false) {
            $timedOut = $error === CURLE_OPERATION_TIMEDOUT;

            throw new Failure(
                $timedOut ? 'upstream_timeout' : 'upstream_unavailable',
                $timedOut ? 504 : 503
            );
        }

        // Phản hồi bắt buộc phải là JSON hợp lệ
        try {
            $parsed = json_decode($data, true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new Failure('invalid_upstream_response', 502);
        }

        // Chặn các giá trị JSON "trần" như số, chuỗi, true/false, null
        if (!is_array($parsed)) {
            throw new Failure('invalid_upstream_response', 502);
        }

        return [
            'status'  => $status,
            'body'    => $parsed,
            'headers' => $responseHeaders,
        ];
    }

    /**
     * Kiểm tra và chuẩn hoá URL gốc (base URL) của dịch vụ upstream.
     *
     * Quy tắc:
     * - Phải có scheme và host.
     * - Không được chứa user/pass, query hoặc fragment.
     * - Chỉ chấp nhận `https`; `http` chỉ được phép với máy cục bộ (127.0.0.1, localhost, [::1]).
     *
     * @return string URL đã được cắt bỏ dấu `/` ở cuối.
     *
     * @throws Failure `invalid_upstream_configuration` (503) nếu URL không hợp lệ.
     */
    public static function base(string $url): string
    {
        $parts = parse_url($url);

        if (!$parts || !isset($parts['scheme'], $parts['host'])) {
            throw new Failure('invalid_upstream_configuration', 503);
        }

        // Không cho phép thông tin đăng nhập, query hay fragment nằm trong URL gốc
        $hasForbiddenParts = isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment']);

        $scheme = $parts['scheme'];
        $host   = $parts['host'];

        $isSupportedScheme = in_array($scheme, ['https', 'http'], true);
        // HTTP thường (không mã hoá) chỉ được dùng khi gọi tới máy cục bộ
        $isInsecureRemote  = $scheme === 'http'
            && !in_array($host, ['127.0.0.1', 'localhost', '[::1]'], true);

        if ($hasForbiddenParts || !$isSupportedScheme || $isInsecureRemote) {
            throw new Failure('invalid_upstream_configuration', 503);
        }

        return rtrim($url, '/');
    }
}