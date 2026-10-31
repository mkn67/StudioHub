<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Admin\AdminService;
use App\Modules\Admin\StatsService;

class AdminController
{
    private AdminService $adminService;
    private StatsService $statsService;

    public function __construct(
        ?AdminService $adminService = null,
        ?StatsService $statsService = null
    ) {
        $this->adminService = $adminService ?? new AdminService();
        $this->statsService = $statsService ?? new StatsService();
    }

    /**
     * GET /api/admin/users
     * Admin authenticated endpoint to list users
     */
    public function users(Request $request): void
    {
        $query = $request->query();
        $result = $this->adminService->listUsers($query);

        ApiResponse::ok($result, 'Lấy danh sách người dùng thành công');
    }

    /**
     * PATCH /api/admin/users/{id}/status
     * Admin authenticated endpoint to lock/unlock user
     */
    public function updateUserStatus(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $body = $request->json() ?? [];
        $admin = $request->getAttribute('user');

        $status = trim((string) ($body['status'] ?? ''));
        $result = $this->adminService->updateUserStatus($id, $status, $admin);

        ApiResponse::ok($result, 'Cập nhật trạng thái người dùng thành công');
    }

    /**
     * PATCH /api/admin/users/{id}/role
     * Admin authenticated endpoint to change user role
     */
    public function updateUserRole(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $body = $request->json() ?? [];
        $admin = $request->getAttribute('user');

        $role = trim((string) ($body['role'] ?? ''));
        $result = $this->adminService->updateUserRole($id, $role, $admin);

        ApiResponse::ok($result, 'Cập nhật vai trò người dùng thành công');
    }

    /**
     * GET /api/admin/statistics
     * Admin authenticated endpoint to view platform statistics
     */
    public function statistics(Request $request): void
    {
        $query = $request->query();
        $result = $this->statsService->getAdminStatistics($query);

        ApiResponse::ok($result, 'Lấy thống kê hệ thống thành công');
    }
}
