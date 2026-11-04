<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;

class ProductionProjectService
{
    private ProductionProjectRepository $repository;
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->repository = new ProductionProjectRepository($this->pdo);
    }

    public function create(int $customerId, array $input): array
    {
        $studioId = filter_var($input['studio_id'] ?? null, FILTER_VALIDATE_INT);
        $type = (string) ($input['project_type'] ?? 'other');
        if ($studioId === false || $studioId <= 0 || !in_array($type, ['single','ep','album','cover','other'], true)) {
            throw new ApiException(400, 'validation_error', 'Studio hoặc loại dự án không hợp lệ');
        }
        $privateName = isset($input['private_name']) ? trim((string) $input['private_name']) : null;
        $description = isset($input['description']) ? trim((string) $input['description']) : null;
        $confidentiality = (string) ($input['confidentiality_level'] ?? 'private');
        if (!in_array($confidentiality, ['private','restricted'], true) || ($privateName !== null && mb_strlen($privateName) > 255)) {
            throw new ApiException(400, 'validation_error', 'Thiết lập riêng tư hoặc tên dự án không hợp lệ');
        }
        $targetDate = $input['target_date'] ?? null;
        if ($targetDate !== null) {
            if (!is_string($targetDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
                throw new ApiException(400, 'validation_error', 'target_date phải có định dạng YYYY-MM-DD');
            }
            [$year, $month, $day] = array_map('intval', explode('-', $targetDate));
            if (!checkdate($month, $day, $year)) throw new ApiException(400, 'validation_error', 'target_date không phải ngày hợp lệ');
        }
        $activeStudio = $this->pdo->prepare("SELECT 1 FROM studios WHERE studio_id = ? AND status = 'active'");
        $activeStudio->execute([$studioId]);
        if (!$activeStudio->fetchColumn()) throw new ApiException(404, 'studio_not_found', 'Studio không tồn tại hoặc không hoạt động');
        $code = 'PRJ-' . bin2hex(random_bytes(10));
        $this->pdo->beginTransaction();
        try {
            $id = $this->repository->create($customerId, $studioId, $code, [
                'project_type' => $type, 'private_name' => $privateName, 'description' => $description,
                'confidentiality_level' => $confidentiality, 'target_date' => $targetDate,
            ], $this->pdo);
            $this->pdo->commit();
            return ['project_id' => $id, 'project_code' => $code, 'project_type' => $type, 'status' => 'planned', 'confidentiality_level' => $confidentiality];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function show(int $projectId, int $userId): array
    {
        $project = $this->repository->access($projectId, $userId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        $this->repository->auditRead($projectId, $userId);
        $isOwner = (int) $project['customer_id'] === $userId;
        $canSeePrivate = $isOwner || (int) $project['can_view_confidential'] === 1;
        if (!$canSeePrivate) {
            $project['private_name'] = null;
            $project['description'] = null;
            unset($project['confidentiality_level']);
        }
        unset($project['member_role'], $project['can_view_confidential'], $project['can_manage_tracks'], $project['can_manage_sessions'], $project['can_manage_files'], $project['can_download_files']);
        $project['tracks'] = $this->repository->tracks($projectId);
        if (!$canSeePrivate) {
            foreach ($project['tracks'] as &$track) $track['private_title'] = null;
            unset($track);
        }
        return $project;
    }

    public function listMine(int $userId): array
    {
        return $this->repository->listForUser($userId);
    }

    public function listAuthorizedForHost(int $hostId): array
    {
        return $this->repository->listAuthorizedForHost($hostId);
    }

    public function members(int $projectId, int $userId): array
    {
        $project = $this->repository->access($projectId, $userId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $userId) throw new ApiException(403, 'forbidden', 'Chỉ chủ dự án được quản lý cộng tác viên');
        return $this->repository->members($projectId);
    }

    public function grantMember(int $projectId, int $ownerId, array $input): array
    {
        $project = $this->repository->access($projectId, $ownerId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $ownerId) throw new ApiException(403, 'forbidden', 'Chỉ chủ dự án được cấp quyền');
        $memberId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
        if ($memberId === false || $memberId <= 0 || !$this->repository->userExists($memberId)) throw new ApiException(404, 'user_not_found', 'Tài khoản cộng tác viên không tồn tại hoặc đã khóa');
        if ($memberId === $ownerId) throw new ApiException(400, 'invalid_member', 'Chủ dự án đã có toàn quyền');
        $permissions = [];
        foreach (['can_view_confidential','can_manage_tracks','can_manage_sessions','can_manage_files','can_download_files'] as $permission) {
            $value = $input[$permission] ?? false;
            if (!is_bool($value)) throw new ApiException(400, 'validation_error', "{$permission} phải là boolean");
            $permissions[$permission] = $value ? 1 : 0;
        }
        $this->pdo->beginTransaction();
        try {
            $this->repository->grantMember($projectId, $memberId, $ownerId, $permissions);
            $this->repository->auditAction($projectId, $ownerId, 'project_member_granted', ['member_user_id' => $memberId]);
            $this->pdo->commit();
            return ['project_id' => $projectId, 'user_id' => $memberId, 'permissions' => $permissions];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function revokeMember(int $projectId, int $ownerId, int $memberId): void
    {
        $project = $this->repository->access($projectId, $ownerId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $ownerId) throw new ApiException(403, 'forbidden', 'Chỉ chủ dự án được thu hồi quyền');
        $this->pdo->beginTransaction();
        try {
            if (!$this->repository->revokeMember($projectId, $memberId)) throw new ApiException(404, 'project_member_not_found', 'Cộng tác viên không tồn tại hoặc đã bị thu hồi');
            $this->repository->auditAction($projectId, $ownerId, 'project_member_revoked', ['member_user_id' => $memberId]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function linkBooking(int $projectId, int $actorId, int $bookingId, array $input): array
    {
        $project = $this->repository->access($projectId, $actorId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        $isOwner = (int) $project['customer_id'] === $actorId;
        if (!$isOwner && (int) $project['can_manage_sessions'] !== 1) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý phiên của dự án');
        $customerId = (int) $project['customer_id'];
        $serviceOrderId = isset($input['service_order_id']) ? (int) $input['service_order_id'] : null;
        $this->pdo->beginTransaction();
        try {
            if ($serviceOrderId !== null) {
                $orderStmt = $this->pdo->prepare("SELECT order_id FROM service_orders WHERE order_id = ? AND customer_id = ? AND studio_id = ? AND project_id = ? AND status = 'paid' FOR UPDATE");
                $orderStmt->execute([$serviceOrderId, $customerId, (int) $project['studio_id'], $projectId]);
                if (!$orderStmt->fetchColumn()) throw new ApiException(409, 'service_order_not_usable', 'Gói dịch vụ chưa thanh toán hoặc không thuộc dự án này');
                $bookingStmt = $this->pdo->prepare("SELECT b.start_time, b.end_time FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? AND b.customer_id = ? AND r.studio_id = ? AND b.status NOT IN ('cancelled','rejected','expired') FOR UPDATE");
                $bookingStmt->execute([$bookingId, $customerId, (int) $project['studio_id']]);
                $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);
                if (!$booking) throw new ApiException(404, 'booking_not_linkable', 'Booking không thuộc khách hàng/studio hoặc đã kết thúc bất thường');
                $minutes = (int) ((strtotime($booking['end_time']) - strtotime($booking['start_time'])) / 60);
                foreach (['sessions' => 1, 'minutes' => $minutes] as $type => $usage) {
                    $entitlementStmt = $this->pdo->prepare('SELECT entitlement_id, included_quantity, consumed_quantity FROM service_order_entitlements WHERE order_id = ? AND entitlement_type = ? FOR UPDATE');
                    $entitlementStmt->execute([$serviceOrderId, $type]);
                    $entitlement = $entitlementStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$entitlement) continue;
                    if ((int) $entitlement['included_quantity'] - (int) $entitlement['consumed_quantity'] < $usage) {
                        throw new ApiException(409, 'package_entitlement_exhausted', "Gói không còn đủ quyền lợi {$type}");
                    }
                    $consume = $this->pdo->prepare('UPDATE service_order_entitlements SET consumed_quantity = consumed_quantity + ? WHERE entitlement_id = ? AND consumed_quantity + ? <= included_quantity');
                    $consume->execute([$usage, $entitlement['entitlement_id'], $usage]);
                    if ($consume->rowCount() !== 1) throw new ApiException(409, 'package_entitlement_exhausted', 'Quyền lợi gói đã hết');
                }
            }
            $this->repository->linkBooking($projectId, $customerId, $bookingId, $serviceOrderId, isset($input['purpose']) ? trim((string) $input['purpose']) : null);
            $this->repository->auditAction($projectId, $actorId, 'project_session_linked', ['booking_id' => $bookingId, 'service_order_id' => $serviceOrderId]);
            $this->pdo->commit();
            return ['project_id' => $projectId, 'booking_id' => $bookingId, 'service_order_id' => $serviceOrderId];
        } catch (\DomainException $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw new ApiException(404, 'booking_not_linkable', 'Booking không thuộc khách hàng hoặc studio của dự án');
        } catch (\PDOException $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            if ((string) $exception->getCode() === '23000') throw new ApiException(409, 'booking_already_linked', 'Booking đã được liên kết với một dự án');
            throw $exception;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function createTrack(int $projectId, int $userId, array $input): array
    {
        $project = $this->repository->access($projectId, $userId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $userId && (int) $project['can_manage_tracks'] !== 1) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý track');
        $code = trim((string) ($input['internal_code'] ?? ''));
        $title = isset($input['private_title']) ? trim((string) $input['private_title']) : null;
        if ($code === '' || mb_strlen($code) > 80 || ($title !== null && mb_strlen($title) > 255)) {
            throw new ApiException(400, 'validation_error', 'Mã nội bộ hoặc tiêu đề track không hợp lệ');
        }
        $id = $this->repository->createTrack($projectId, $code, $title);
        return ['track_id' => $id, 'project_id' => $projectId, 'internal_code' => $code, 'private_title' => $title, 'production_status' => 'planned'];
    }

    public function updateTrackStatus(int $projectId, int $trackId, int $userId, string $newStatus): array
    {
        $project = $this->repository->access($projectId, $userId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $userId && (int) $project['can_manage_tracks'] !== 1) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý track');
        $states = ['planned', 'recording', 'editing', 'mixing', 'mastering', 'delivered'];
        if (!in_array($newStatus, $states, true)) throw new ApiException(400, 'validation_error', 'Trạng thái track không hợp lệ');
        $this->pdo->beginTransaction();
        try {
            $current = $this->repository->trackStatusForUpdate($trackId, $projectId);
            if ($current === null) throw new ApiException(404, 'track_not_found', 'Track không tồn tại trong dự án này');
            if ($newStatus !== $current && array_search($newStatus, $states, true) !== array_search($current, $states, true) + 1) {
                throw new ApiException(409, 'invalid_track_transition', 'Track chỉ được chuyển sang bước sản xuất kế tiếp');
            }
            $this->repository->updateTrackStatus($trackId, $newStatus);
            $this->repository->auditAction($projectId, $userId, 'project_track_status_changed', ['track_id' => $trackId, 'status' => $newStatus]);
            $this->pdo->commit();
            return ['project_id' => $projectId, 'track_id' => $trackId, 'production_status' => $newStatus];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function requestRevision(int $projectId, int $trackId, int $customerId, array $input): array
    {
        $project = $this->repository->access($projectId, $customerId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        if ((int) $project['customer_id'] !== $customerId) throw new ApiException(403, 'forbidden', 'Chỉ chủ dự án được yêu cầu chỉnh sửa');
        if (!$this->repository->trackBelongsToProject($trackId, $projectId)) throw new ApiException(404, 'track_not_found', 'Track không tồn tại trong dự án này');
        $orderId = filter_var($input['service_order_id'] ?? null, FILTER_VALIDATE_INT);
        if ($orderId === false || $orderId <= 0) throw new ApiException(400, 'validation_error', 'service_order_id không hợp lệ');
        $note = isset($input['request_note']) ? trim((string) $input['request_note']) : null;
        if ($note !== null && mb_strlen($note) > 5000) throw new ApiException(400, 'validation_error', 'Nội dung yêu cầu quá dài');
        $this->pdo->beginTransaction();
        try {
            $order = $this->pdo->prepare("SELECT order_id FROM service_orders WHERE order_id = ? AND customer_id = ? AND project_id = ? AND status = 'paid' FOR UPDATE");
            $order->execute([$orderId, $customerId, $projectId]);
            if (!$order->fetchColumn()) throw new ApiException(409, 'service_order_not_usable', 'Gói dịch vụ không thuộc dự án hoặc chưa thanh toán');
            $entitlementStmt = $this->pdo->prepare("SELECT entitlement_id, included_quantity, consumed_quantity FROM service_order_entitlements WHERE order_id = ? AND entitlement_type = 'revisions' FOR UPDATE");
            $entitlementStmt->execute([$orderId]);
            $entitlement = $entitlementStmt->fetch(PDO::FETCH_ASSOC);
            if (!$entitlement || (int) $entitlement['consumed_quantity'] >= (int) $entitlement['included_quantity']) throw new ApiException(409, 'package_entitlement_exhausted', 'Gói không còn lượt chỉnh sửa');
            $number = (int) $entitlement['consumed_quantity'] + 1;
            $consume = $this->pdo->prepare('UPDATE service_order_entitlements SET consumed_quantity = consumed_quantity + 1 WHERE entitlement_id = ? AND consumed_quantity < included_quantity');
            $consume->execute([$entitlement['entitlement_id']]);
            $id = $this->repository->createRevision(['project_id' => $projectId, 'track_id' => $trackId, 'service_order_id' => $orderId, 'requested_by' => $customerId, 'revision_number' => $number, 'request_note' => $note]);
            $this->repository->auditAction($projectId, $customerId, 'project_revision_requested', ['revision_id' => $id, 'track_id' => $trackId]);
            $this->pdo->commit();
            return ['revision_id' => $id, 'track_id' => $trackId, 'revision_number' => $number, 'status' => 'requested'];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }
}
