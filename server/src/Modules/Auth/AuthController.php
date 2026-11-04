<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Auth\AuthService;

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
        $result = $this->authService->register($request->json());
        ApiResponse::success($result, 'Đăng ký tài khoản thành công', 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): void
    {
        $result = $this->authService->login($request->json());
        ApiResponse::success($result, 'Đăng nhập thành công', 200);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): void
    {
        $claims = $request->getAttribute('jwt_claims', []);
        $this->authService->logout(is_array($claims) ? $claims : []);
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
}

