<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Services\AuthService;

class AuthController
{
    private AuthService $authService;

    public function __construct(?AuthService $authService = null)
    {
        $this->authService = $authService ?? new AuthService();
    }

    /**
     * POST /api/auth/register
     */
    public function register(Request $request): void
    {
        $this->throttle($request);
        $result = $this->authService->register($request->json());
        ApiResponse::success($result, 'Đăng ký tài khoản thành công', 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): void
    {
        $this->throttle($request);
        $result = $this->authService->login($request->json());
        ApiResponse::success($result, 'Đăng nhập thành công', 200);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): void
    {
        $token=$request->bearerToken();
        $claims=(new \App\Services\JwtService())->verify($token);
        \App\Core\Db::getConnection()->prepare('INSERT IGNORE INTO auth_revocations(token_hash,expires_at) VALUES(?,?)')->execute([hash('sha256',$token),date('Y-m-d H:i:s',(int)$claims['exp'])]);
        ApiResponse::success(null, 'Đăng xuất thành công', 200);
    }

    /**
     * GET /api/auth/profile
     */
    public function profile(Request $request): void
    {
        $user = $request->user();
        $profile = $this->authService->getProfile((int) $user['user_id']);
        ApiResponse::success($profile, 'Lấy thông tin tài khoản thành công', 200);
    }

    /**
     * PATCH /api/auth/profile
     */
    public function updateProfile(Request $request): void
    {
        $user = $request->user();
        $updated = $this->authService->updateProfile((int) $user['user_id'], $request->json());
        ApiResponse::success($updated, 'Cập nhật thông tin thành công', 200);
    }
    private function throttle(Request $request): void
    {
        // Use the direct peer; never trust spoofable forwarded-IP headers.
        $ip=$_SERVER['REMOTE_ADDR'] ?? 'unknown'; $bucket=intdiv(time(),600);
        $input=$request->json(); $email=is_string($input['email'] ?? null)?strtolower(trim($input['email'])):'';
        $key=hash('sha256',$ip.'|'.$request->uri().'|'.$email.'|'.$bucket);
        $db=\App\Core\Db::getConnection();
        $db->prepare('INSERT INTO auth_rate_limits(bucket_key,attempts,expires_at) VALUES(?,1,DATE_ADD(NOW(),INTERVAL 20 MINUTE)) ON DUPLICATE KEY UPDATE attempts=attempts+1')->execute([$key]);
        $q=$db->prepare('SELECT attempts FROM auth_rate_limits WHERE bucket_key=?'); $q->execute([$key]);
        if((int)$q->fetchColumn()>30) throw new \App\Exceptions\ApiException(429,'rate_limited','Thử lại sau ít phút.');
    }
}

