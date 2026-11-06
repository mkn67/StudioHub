<?php

declare(strict_types=1);

namespace App\Modules\HostApplications;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

class HostApplicationService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    public function submit(int $userId, array $data): array
    {
        $studioName = trim((string) ($data['studio_name'] ?? ''));
        $address = trim((string) ($data['address'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));
        $contactPhone = trim((string) ($data['contact_phone'] ?? ''));
        $website = trim((string) ($data['website'] ?? ''));
        $studioType = trim((string) ($data['studio_type'] ?? ''));
        $roomCount = filter_var($data['expected_room_count'] ?? null, FILTER_VALIDATE_INT);
        $legalName = trim((string) ($data['legal_name'] ?? ''));
        $taxId = trim((string) ($data['tax_id'] ?? ''));
        if ($studioName === '' || $this->textLength($studioName) > 150 || $address === '' || $this->textLength($address) > 255 || $description === '' || $this->textLength($description) > 10000 || $contactPhone === '' || !preg_match('/^[0-9+() .-]{8,20}$/', $contactPhone) || ($website !== '' && (filter_var($website, FILTER_VALIDATE_URL) === false || $this->textLength($website) > 255)) || $studioType === '' || $this->textLength($studioType) > 100 || $roomCount === false || $roomCount < 1 || $roomCount > 500 || $this->textLength($legalName) > 180 || $this->textLength($taxId) > 30) {
            throw new ApiException(400, 'validation_failed', 'Vui lòng kiểm tra tên, địa chỉ, mô tả, số điện thoại liên hệ, loại Studio và số phòng dự kiến');
        }

        $this->pdo->beginTransaction();
        try {
            $user = $this->pdo->prepare("SELECT u.user_id, u.status, r.role_name FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ? FOR UPDATE");
            $user->execute([$userId]);
            $account = $user->fetch(PDO::FETCH_ASSOC);
            if (!$account || $account['status'] !== 'active' || $account['role_name'] !== 'customer') {
                throw new ApiException(403, 'customer_required', 'Chỉ tài khoản Customer đang hoạt động mới gửi được hồ sơ Host');
            }
            $existing = $this->pdo->prepare("SELECT application_id FROM host_applications WHERE user_id = ? AND status IN ('pending', 'approved') ORDER BY application_id DESC LIMIT 1");
            $existing->execute([$userId]);
            if ($existing->fetchColumn()) {
                throw new ApiException(409, 'application_already_exists', 'Bạn đã có hồ sơ đang chờ hoặc đã được duyệt');
            }
            $insert = $this->pdo->prepare("INSERT INTO host_applications (user_id, studio_name, address, description, contact_phone, website, studio_type, expected_room_count, legal_name, tax_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
            $insert->execute([$userId, $studioName, $address, $description, $contactPhone, $website !== '' ? $website : null, $studioType, $roomCount, $legalName !== '' ? $legalName : null, $taxId !== '' ? $taxId : null]);
            $id = (int) $this->pdo->lastInsertId();
            $this->audit($userId, 'host_application_submitted', $id, ['studio_name' => $studioName]);
            $this->pdo->commit();
            return ['application_id' => $id, 'user_id' => $userId, 'studio_name' => $studioName, 'address' => $address, 'description' => $description, 'contact_phone' => $contactPhone, 'website' => $website !== '' ? $website : null, 'studio_type' => $studioType, 'expected_room_count' => $roomCount, 'legal_name' => $legalName !== '' ? $legalName : null, 'tax_id' => $taxId !== '' ? $taxId : null, 'status' => 'pending'];
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    public function list(array $query): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 25)));
        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '' && !in_array($status, ['pending', 'approved', 'rejected'], true)) {
            throw new ApiException(400, 'invalid_status', 'Trạng thái hồ sơ không hợp lệ');
        }
        $where = $status === '' ? '' : ' WHERE a.status = ?';
        $params = $status === '' ? [] : [$status];
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM host_applications a' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $this->pdo->prepare('SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone FROM host_applications a JOIN users u ON u.user_id = a.user_id' . $where . ' ORDER BY a.created_at DESC, a.application_id DESC LIMIT ? OFFSET ?');
        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value, PDO::PARAM_STR);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, ($page - 1) * $limit, PDO::PARAM_INT);
        $stmt->execute();
        return ['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'pagination' => ['page' => $page, 'limit' => $limit, 'total_items' => $total, 'total_pages' => $total === 0 ? 0 : (int) ceil($total / $limit)]];
    }

    public function show(int $applicationId): array
    {
        $stmt = $this->pdo->prepare('SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone, reviewer.full_name AS reviewer_name FROM host_applications a JOIN users u ON u.user_id = a.user_id LEFT JOIN users reviewer ON reviewer.user_id = a.reviewed_by WHERE a.application_id = ?');
        $stmt->execute([$applicationId]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$application) {
            throw new ApiException(404, 'application_not_found', 'Không tìm thấy hồ sơ Host');
        }
        return $application;
    }

    public function currentForUser(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT application_id, studio_name, address, description, contact_phone, website, studio_type, expected_room_count, legal_name, tax_id, status, reason, created_at, reviewed_at FROM host_applications WHERE user_id = ? ORDER BY application_id DESC LIMIT 1');
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function decide(int $applicationId, int $adminId, bool $approved, string $reason): array
    {
        $reason = trim($reason);
        if (!$approved && $reason === '') {
            throw new ApiException(400, 'rejection_reason_required', 'Cần ghi lý do khi từ chối hồ sơ');
        }
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM host_applications WHERE application_id = ? FOR UPDATE');
            $stmt->execute([$applicationId]);
            $application = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$application) {
                throw new ApiException(404, 'application_not_found', 'Không tìm thấy hồ sơ Host');
            }
            if ($application['status'] !== 'pending') {
                throw new ApiException(409, 'application_already_decided', 'Hồ sơ này đã được xử lý');
            }
            $status = $approved ? 'approved' : 'rejected';
            $update = $this->pdo->prepare('UPDATE host_applications SET status = ?, reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE application_id = ?');
            $update->execute([$status, $reason !== '' ? $reason : null, $adminId, $applicationId]);
            if ($approved) {
                $role = $this->pdo->prepare("UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'host') WHERE user_id = ? AND status = 'active'");
                $role->execute([(int) $application['user_id']]);
                if ($role->rowCount() !== 1) {
                    throw new ApiException(409, 'applicant_unavailable', 'Tài khoản không còn đủ điều kiện để cấp quyền Host');
                }
            }
            $this->audit($adminId, 'host_application_' . $status, $applicationId, ['applicant_id' => (int) $application['user_id'], 'reason' => $reason]);
            $this->pdo->commit();
            return $this->show($applicationId);
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    private function audit(int $userId, string $action, int $applicationId, array $metadata): void
    {
        $stmt = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'host_applications', ?, ?)");
        $stmt->execute([$userId, $action, $applicationId, json_encode($metadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
    }

    private function textLength(string $value): int
    {
        $count = preg_match_all('/./us', $value, $matches);
        return $count === false ? PHP_INT_MAX : $count;
    }
}
