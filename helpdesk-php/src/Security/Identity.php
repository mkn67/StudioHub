<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Security;

use StudioHub\Helpdesk\{Config, Failure};
use StudioHub\Helpdesk\Http\{CurlTransport, Transport};

/**
 * Xác định "người thực hiện" (Actor) của một request.
 *
 * Có hai loại danh tính:
 * - Người dùng đã đăng nhập: gửi `Authorization: Bearer <token>`, được xác minh bằng cách
 *   gọi API hồ sơ của StudioHub.
 * - Khách (guest): không có token, chỉ có mã phiên `x-helpdesk-session` do frontend sinh ra.
 */
final class Identity
{
    /** Thời gian chờ tối đa (giây) khi gọi API hồ sơ người dùng. */
    private const PROFILE_TIMEOUT_SECONDS = 4;

    /** Các vai trò hợp lệ do StudioHub trả về. */
    private const VALID_ROLES = ['customer', 'host', 'admin'];

    public function __construct(private Config $config, private Transport $http)
    {
    }

    /**
     * Phân tích header của request và trả về Actor tương ứng.
     *
     * @param array<string, string> $headers Header (khoá đã ở dạng chữ thường).
     *
     * @throws Failure 401 nếu thiếu/sai bridge secret, token hoặc mã phiên;
     *                 401/403 nếu StudioHub từ chối token;
     *                 503 nếu không xác minh được danh tính.
     */
    public function resolve(array $headers): Actor
    {
        // Bước 1: xác thực "cầu nối" (bridge). Chỉ frontend/backend tin cậy mới biết secret này.
        // Dùng hash_equals để so sánh thời gian hằng số, chống tấn công đo thời gian (timing attack).
        if (!hash_equals($this->config->secret(), $headers['x-helpdesk-bridge'] ?? '')) {
            throw new Failure('unauthorized_bridge', 401);
        }

        // Bước 2: có token thì coi là người dùng đã đăng nhập, ngược lại coi là khách
        $token = $headers['authorization'] ?? '';

        if ($token !== '') {
            return $this->resolveUser($token);
        }

        return $this->resolveGuest($headers['x-helpdesk-session'] ?? '');
    }

    /**
     * Xác minh Bearer token với StudioHub và dựng Actor cho người dùng đã đăng nhập.
     */
    private function resolveUser(string $token): Actor
    {
        // Chỉ chấp nhận đúng định dạng "Bearer <token>" với các ký tự an toàn
        if (!preg_match('/^Bearer [A-Za-z0-9_.-]+$/', $token)) {
            throw new Failure('invalid_authentication', 401);
        }

        // Gọi API hồ sơ để biết token này thuộc về ai
        $base     = CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL'));
        $response = $this->http->request(
            'GET',
            $base . '/auth/profile',
            ['Authorization: ' . $token, 'Accept: application/json'],
            null,
            self::PROFILE_TIMEOUT_SECONDS
        );

        // Token bị từ chối: trả nguyên mã 401/403 cho client
        if ($response['status'] === 401 || $response['status'] === 403) {
            throw new Failure('authentication_required', $response['status']);
        }

        // Mọi trường hợp khác không đúng kỳ vọng được coi là dịch vụ danh tính không khả dụng:
        // phản hồi phải là 200, có status "success", có user_id và vai trò hợp lệ.
        $user = $response['body']['data'] ?? null;

        if (
            $response['status'] !== 200
            || ($response['body']['status'] ?? '') !== 'success'
            || !is_array($user)
            || !isset($user['user_id'])
            || !in_array($user['role'] ?? '', self::VALID_ROLES, true)
        ) {
            throw new Failure('identity_unavailable', 503);
        }

        $userId = (string) $user['user_id'];

        // Danh sách ID nhân viên hỗ trợ, phân tách bằng dấu phẩy trong cấu hình
        $supportUserIds = array_filter(explode(',', $this->config->get('HELPDESK_SUPPORT_USER_IDS')));

        return new Actor(
            'user:' . $userId,
            $user['role'],
            $userId,
            in_array($userId, $supportUserIds, true) // true nếu là nhân viên hỗ trợ
        );
    }

    /**
     * Dựng Actor cho khách từ mã phiên.
     * Mã phiên phải là chuỗi hex 64 ký tự; danh tính được băm HMAC bằng secret
     * để không lộ mã phiên gốc và không thể bị giả mạo.
     */
    private function resolveGuest(string $session): Actor
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $session)) {
            throw new Failure('session_required', 401);
        }

        return new Actor('guest:' . hash_hmac('sha256', $session, $this->config->secret()));
    }
}