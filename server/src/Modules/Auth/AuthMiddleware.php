<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Db;
use App\Core\Request;
use App\Exceptions\ApiException;
use App\Modules\Auth\JwtService;
use PDO;

class AuthMiddleware
{
    private JwtService $jwtService;

    public function __construct(?JwtService $jwtService = null)
    {
        $this->jwtService = $jwtService ?? new JwtService();
    }

    /**
     * Handle incoming request: authenticate token and reload live user state from DB
     *
     * @param Request $request
     * @param callable $next
     * @return mixed
     * @throws ApiException
     */
    public function handle(Request $request, callable $next): mixed
    {
        $token = $request->bearerToken();

        if ($token === null || trim($token) === '') {
            throw new ApiException(
                401,
                'unauthorized',
                'Yêu cầu mã token xác thực Bearer',
                [
                    [
                        'field'   => 'authorization',
                        'code'    => 'token_missing',
                        'message' => 'Header Authorization Bearer token không tồn tại',
                    ]
                ]
            );
        }

        // Verify token signature and expiration
        $claims = $this->jwtService->verify($token);
        $userId = (int) ($claims['sub'] ?? 0);

        if ($userId <= 0) {
            throw new ApiException(
                401,
                'unauthorized',
                'Token không chứa định danh người dùng hợp lệ',
                [
                    [
                        'field'   => 'token',
                        'code'    => 'invalid_sub',
                        'message' => 'Token claim sub không hợp lệ',
                    ]
                ]
            );
        }

        // CRITICAL REQUIREMENT (Section 1 & 5.8):
        // Always reload user from DB on every protected request to enforce current status & role
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT u.user_id, u.role_id, r.role_name AS role, u.full_name, u.email, u.phone, u.status
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = ?
            LIMIT 1
        ');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new ApiException(
                401,
                'unauthorized',
                'Tài khoản không tồn tại trên hệ thống',
                [
                    [
                        'field'   => 'user',
                        'code'    => 'user_not_found',
                        'message' => 'Người dùng tương ứng với token không tồn tại',
                    ]
                ]
            );
        }

        if ($user['status'] === 'locked') {
            throw new ApiException(
                403,
                'account_locked',
                'Tài khoản của bạn đã bị khóa',
                [
                    [
                        'field'   => 'status',
                        'code'    => 'account_locked',
                        'message' => 'Tài khoản đã bị quản trị viên khóa',
                    ]
                ]
            );
        }

        // Attach live user to request attributes
        $request->setAttribute('user', $user);

        return $next($request);
    }
}

