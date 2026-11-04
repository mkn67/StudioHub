<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Admin\AdminService;
use App\Modules\Admin\StatsService;
use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use App\Modules\Refunds\RefundExceptionService;

class AdminController
{
    private AdminService $adminService;
    private StatsService $statsService;
    private PDO $pdo;
    private RefundExceptionService $refundService;

    public function __construct(
        ?AdminService $adminService = null,
        ?StatsService $statsService = null,
        ?PDO $pdo = null,
        ?RefundExceptionService $refundService = null
    ) {
        $this->adminService = $adminService ?? new AdminService();
        $this->statsService = $statsService ?? new StatsService();
        $this->pdo = $pdo ?? Db::getConnection();
        $this->refundService = $refundService ?? new RefundExceptionService($this->pdo);
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
        $body = $request->json();
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
        $body = $request->json();
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

    public function roles(Request $request): void
    {
        $stmt = $this->pdo->query("SELECT role_id, role_name, description FROM roles WHERE role_name IN ('host', 'customer') ORDER BY role_id");
        ApiResponse::ok($stmt->fetchAll(PDO::FETCH_ASSOC), 'Lấy danh sách vai trò thành công');
    }

    public function studios(Request $request): void
    {
        $this->listResource("SELECT s.*, u.full_name AS host_name, u.email AS host_email FROM studios s JOIN users u ON u.user_id = s.host_id WHERE (? = '' OR s.status = ?) AND (? = '' OR s.name LIKE ? OR s.address LIKE ?) ORDER BY s.studio_id DESC", $request, 'Lấy danh sách Studio thành công');
    }

    public function rooms(Request $request): void
    {
        $this->listResource("SELECT r.*, s.name AS studio_name, u.full_name AS host_name FROM rooms r JOIN studios s ON s.studio_id = r.studio_id JOIN users u ON u.user_id = s.host_id WHERE (? = '' OR r.status = ?) AND (? = '' OR r.name LIKE ? OR s.name LIKE ?) ORDER BY r.room_id DESC", $request, 'Lấy danh sách phòng thành công');
    }

    public function equipments(Request $request): void
    {
        $this->listResource("SELECT e.*, s.name AS studio_name, c.name AS category_name, u.full_name AS host_name FROM equipments e JOIN studios s ON s.studio_id = e.studio_id JOIN equipment_categories c ON c.category_id = e.category_id JOIN users u ON u.user_id = s.host_id WHERE (? = '' OR e.status = ?) AND (? = '' OR e.name LIKE ? OR s.name LIKE ?) ORDER BY e.equipment_id DESC", $request, 'Lấy danh sách thiết bị thành công');
    }

    public function updateStudio(Request $request, array $vars): void
    {
        $this->updateResource('studios', 'studio_id', (int) $vars['id'], $request, ['name', 'description', 'address', 'district', 'city', 'phone', 'status'], ['status' => ['active', 'inactive']]);
    }

    public function updateRoom(Request $request, array $vars): void
    {
        $this->updateResource('rooms', 'room_id', (int) $vars['id'], $request, ['name', 'description', 'area', 'ceiling_height', 'capacity', 'soundproof_level', 'power_specs', 'rules', 'status'], ['status' => ['active', 'maintenance', 'inactive']]);
    }

    public function updateEquipment(Request $request, array $vars): void
    {
        $this->updateResource('equipments', 'equipment_id', (int) $vars['id'], $request, ['name', 'brand', 'description', 'unit_price', 'pricing_unit', 'total_quantity', 'status'], ['status' => ['active', 'maintenance', 'inactive'], 'pricing_unit' => ['session', 'hour']]);
    }

    public function auditLogs(Request $request): void
    {
        $limit = min(100, max(1, (int) $request->query('limit', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $stmt = $this->pdo->prepare('SELECT a.*, u.full_name AS actor_name, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.user_id = a.user_id ORDER BY a.log_id DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', ($page - 1) * $limit, PDO::PARAM_INT);
        $stmt->execute();
        ApiResponse::ok(['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'page' => $page, 'limit' => $limit], 'Lấy lịch sử thao tác thành công');
    }

    public function refundExceptions(Request $request): void
    {
        ApiResponse::ok($this->refundService->list($request->query()), 'Lấy các khoản hoàn cần xử lý thành công');
    }

    public function refundException(Request $request, array $vars): void
    {
        ApiResponse::ok($this->refundService->show((int) $vars['id']), 'Lấy chi tiết khoản hoàn tiền thành công');
    }

    public function refundExceptionAction(Request $request, array $vars): void
    {
        ApiResponse::ok($this->refundService->act((int) $vars['id'], (int) $request->user()['user_id'], $request->body()), 'Đã lưu quyết định xử lý trường hợp hoàn tiền');
    }

    public function reportSeries(Request $request): void
    {
        $period = $this->statsService->resolvePeriod($request->query());
        $series = $this->bookingSeries(null, $period['from_dt'], $period['to_dt']);
        ApiResponse::ok(['period' => ['from' => $period['from'], 'to' => $period['to']], 'series' => $series], 'Lấy chuỗi báo cáo hệ thống thành công');
    }

    private function listResource(string $sql, Request $request, string $message): void
    {
        $status = trim((string) $request->query('status', ''));
        $search = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $limit = min(100, max(1, (int) $request->query('limit', 25)));
        $sql .= ' LIMIT ? OFFSET ?';
        $stmt = $this->pdo->prepare($sql);
        $keyword = '%' . $search . '%';
        $stmt->bindValue(1, $status, PDO::PARAM_STR);
        $stmt->bindValue(2, $status, PDO::PARAM_STR);
        $stmt->bindValue(3, $search, PDO::PARAM_STR);
        $stmt->bindValue(4, $keyword, PDO::PARAM_STR);
        $stmt->bindValue(5, $keyword, PDO::PARAM_STR);
        $stmt->bindValue(6, $limit, PDO::PARAM_INT);
        $stmt->bindValue(7, ($page - 1) * $limit, PDO::PARAM_INT);
        $stmt->execute();
        ApiResponse::ok(['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'page' => $page, 'limit' => $limit], $message);
    }

    private function bookingSeries(?int $hostId, string $from, string $to): array
    {
        $scope = $hostId === null ? '' : ' JOIN rooms r ON r.room_id = b.room_id JOIN studios s ON s.studio_id = r.studio_id';
        $filter = $hostId === null ? '' : ' AND s.host_id = ?';
        $params = $hostId === null ? [$from, $to] : [$from, $to, $hostId];
        $bookings = $this->pdo->prepare("SELECT DATE(b.start_time) AS date, COUNT(*) AS total FROM bookings b{$scope} WHERE b.start_time >= ? AND b.start_time < ? AND b.status <> 'expired'{$filter} GROUP BY DATE(b.start_time)");
        $bookings->execute($params);
        $result = [];
        foreach ($bookings->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $result[$row['date']] = ['date' => $row['date'], 'bookings' => (int) $row['total'], 'revenue' => 0];
        }
        $revenueParams = $hostId === null ? [$from, $to] : [$from, $to, $hostId];
        $revenue = $this->pdo->prepare("SELECT DATE(b.completed_at) AS date, COALESCE(SUM(b.total_amount), 0) AS total FROM bookings b{$scope} WHERE b.status = 'completed' AND b.completed_at >= ? AND b.completed_at < ?{$filter} GROUP BY DATE(b.completed_at)");
        $revenue->execute($revenueParams);
        foreach ($revenue->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $result[$row['date']] ??= ['date' => $row['date'], 'bookings' => 0, 'revenue' => 0];
            $result[$row['date']]['revenue'] = (int) round((float) $row['total']);
        }
        ksort($result);
        return array_values($result);
    }

    private function updateResource(string $table, string $idColumn, int $id, Request $request, array $allowed, array $enums): void
    {
        $body = $request->body();
        if (!$body) { throw new ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật'); }
        $unknownFields = array_diff(array_keys($body), $allowed);
        if ($unknownFields !== []) {
            throw new ApiException(400, 'unknown_fields', 'Payload chứa trường không được phép cập nhật: ' . implode(', ', $unknownFields));
        }
        $fields = [];
        $values = [];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $body)) { continue; }
            if (isset($enums[$field]) && !in_array($body[$field], $enums[$field], true)) {
                throw new ApiException(400, 'invalid_' . $field, 'Giá trị ' . $field . ' không hợp lệ');
            }
            if (in_array($field, ['area', 'ceiling_height', 'unit_price', 'total_quantity', 'capacity'], true)) {
                if (!is_numeric($body[$field]) || (float) $body[$field] < 0 || (in_array($field, ['capacity', 'total_quantity'], true) && (int) $body[$field] != (float) $body[$field])) {
                    throw new ApiException(400, 'invalid_' . $field, 'Giá trị ' . $field . ' không hợp lệ');
                }
                if (($field === 'area' || $field === 'capacity') && (float) $body[$field] <= 0) {
                    throw new ApiException(400, 'invalid_' . $field, 'Giá trị ' . $field . ' phải lớn hơn 0');
                }
            }
            $fields[] = "{$field} = ?";
            $values[] = $body[$field];
        }
        if (!$fields) { throw new ApiException(400, 'no_allowed_fields', 'Không có trường được phép cập nhật'); }
        if ($table === 'equipments' && array_key_exists('total_quantity', $body)) {
            $usage = $this->pdo->prepare("SELECT bd.quantity, b.busy_start, b.busy_end FROM booking_details bd JOIN bookings b ON b.booking_id = bd.booking_id WHERE bd.equipment_id = ? AND (b.status IN ('confirmed','checked_in') OR (b.status = 'pending' AND b.expires_at > NOW())) AND b.busy_end >= NOW()");
            $usage->execute([$id]);
            $peak = \App\Modules\Booking\StockCalculator::peakFutureUsage($usage->fetchAll(PDO::FETCH_ASSOC));
            if ((int) $body['total_quantity'] < $peak) {
                throw new ApiException(409, 'stock_reduction_conflict', 'Tồn kho không thể thấp hơn số lượng thiết bị đã được giữ cho các booking tương lai');
            }
        }
        $values[] = $id;
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("UPDATE {$table} SET " . implode(', ', $fields) . " WHERE {$idColumn} = ?");
            $stmt->execute($values);
            if ($stmt->rowCount() === 0) {
                $exists = $this->pdo->prepare("SELECT 1 FROM {$table} WHERE {$idColumn} = ?");
                $exists->execute([$id]);
                if (!$exists->fetchColumn()) { throw new ApiException(404, 'resource_not_found', 'Không tìm thấy dữ liệu'); }
            }
            $audit = $this->pdo->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)');
            $audit->execute([(int) $request->user()['user_id'], 'admin_resource_updated', $table, $id, json_encode(['fields' => array_keys($body)], JSON_THROW_ON_ERROR)]);
            $this->pdo->commit();
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $error;
        }
        ApiResponse::ok(['id' => $id, 'updated_fields' => array_keys($body)], 'Cập nhật dữ liệu thành công');
    }
}
