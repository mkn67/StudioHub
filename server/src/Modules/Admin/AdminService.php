<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\Db;
use App\Exceptions\ApiException;
use App\Modules\Booking\BookingRepository;
use App\Modules\Auth\UserRepository;
use PDO;

class AdminService
{
    private UserRepository $userRepo;
    private BookingRepository $bookingRepo;
    private PDO $pdo;

    public function __construct(
        ?UserRepository $userRepo = null,
        ?BookingRepository $bookingRepo = null,
        ?PDO $pdo = null
    ) {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->userRepo = $userRepo ?? new UserRepository($this->pdo);
        $this->bookingRepo = $bookingRepo ?? new BookingRepository($this->pdo);
    }

    /**
     * List users with optional filter by role, status, search, and pagination
     *
     * @param array $query
     * @return array
     */
    public function listUsers(array $query): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(50, max(1, (int) ($query['limit'] ?? 12)));

        $filters = [];
        if (!empty($query['role'])) {
            $filters['role'] = trim((string) $query['role']);
        }
        if (!empty($query['status'])) {
            $filters['status'] = trim((string) $query['status']);
        }
        if (!empty($query['search'])) {
            $filters['search'] = trim((string) $query['search']);
        }

        return $this->userRepo->listUsers($filters, $page, $limit);
    }

    /**
     * Update user status (active / locked)
     * Admin cannot lock own account.
     *
     * @param int $userId
     * @param string $status
     * @param array $adminUser
     * @return array
     * @throws ApiException
     */
    public function updateUserStatus(int $userId, string $status, array $adminUser): array
    {
        $targetUser = $this->userRepo->findById($userId);
        if (!$targetUser) {
            throw new ApiException(404, 'user_not_found', 'Tài khoản người dùng không tồn tại');
        }

        if ($userId === (int) $adminUser['user_id']) {
            throw new ApiException(400, 'cannot_lock_self', 'Không thể tự khóa tài khoản của chính mình');
        }

        if (!in_array($status, ['active', 'locked'], true)) {
            throw new ApiException(400, 'invalid_status', "Trạng thái '{$status}' không hợp lệ (hỗ trợ: active, locked)");
        }

        $this->userRepo->update($userId, ['status' => $status]);

        $this->bookingRepo->insertAuditLog(
            (int) $adminUser['user_id'],
            'user_status_updated',
            'users',
            $userId,
            [
                'previous_status' => $targetUser['status'],
                'new_status'      => $status,
                'target_email'    => $targetUser['email'],
            ],
            $this->pdo
        );

        $updated = $this->userRepo->findById($userId);
        unset($updated['password_hash']);
        return $updated;
    }

    /**
     * Update user role (host / customer)
     * Admin cannot change own role and cannot grant admin role via API.
     *
     * @param int $userId
     * @param string $role
     * @param array $adminUser
     * @return array
     * @throws ApiException
     */
    public function updateUserRole(int $userId, string $role, array $adminUser): array
    {
        $targetUser = $this->userRepo->findById($userId);
        if (!$targetUser) {
            throw new ApiException(404, 'user_not_found', 'Tài khoản người dùng không tồn tại');
        }

        if ($userId === (int) $adminUser['user_id']) {
            throw new ApiException(400, 'cannot_change_own_role', 'Không thể tự thay đổi vai trò của chính mình');
        }

        if (!in_array($role, ['host', 'customer'], true)) {
            throw new ApiException(
                400,
                'invalid_role',
                "Vai trò '{$role}' không hợp lệ (chỉ có thể gán host hoặc customer qua API)"
            );
        }

        $roleId = $this->userRepo->findRoleIdByName($role);
        if ($roleId === null) {
            throw new ApiException(400, 'role_not_found', "Vai trò '{$role}' không tồn tại trong hệ thống");
        }

        $this->userRepo->update($userId, ['role_id' => $roleId]);

        $this->bookingRepo->insertAuditLog(
            (int) $adminUser['user_id'],
            'user_role_updated',
            'users',
            $userId,
            [
                'previous_role' => $targetUser['role'],
                'new_role'      => $role,
                'target_email'  => $targetUser['email'],
            ],
            $this->pdo
        );

        $updated = $this->userRepo->findById($userId);
        unset($updated['password_hash']);
        return $updated;
    }
}

