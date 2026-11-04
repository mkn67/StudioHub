<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use PDO;

class ProductionProjectRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function create(int $customerId, int $studioId, string $code, array $data, PDO $pdo): int
    {
        $stmt = $pdo->prepare("INSERT INTO production_projects (customer_id, studio_id, project_code, project_type, private_name, description, status, confidentiality_level, target_date) VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?)");
        $stmt->execute([$customerId, $studioId, $code, $data['project_type'], $data['private_name'], $data['description'], $data['confidentiality_level'], $data['target_date']]);
        $id = (int) $pdo->lastInsertId();
        $hostStmt = $pdo->prepare('SELECT host_id FROM studios WHERE studio_id = ?');
        $hostStmt->execute([$studioId]);
        $hostId = $hostStmt->fetchColumn();
        if ($hostId !== false) {
            $member = $pdo->prepare("INSERT INTO project_members (project_id, user_id, access_role, can_view_confidential, can_manage_sessions, granted_by) VALUES (?, ?, 'host', 0, 1, ?)");
            $member->execute([$id, (int) $hostId, $customerId]);
        }
        return $id;
    }

    public function access(int $projectId, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT p.*, pm.access_role AS member_role, pm.can_view_confidential, pm.can_manage_tracks, pm.can_manage_sessions, pm.can_manage_files, pm.can_download_files
            FROM production_projects p
            LEFT JOIN project_members pm ON pm.project_id = p.project_id AND pm.user_id = ? AND pm.revoked_at IS NULL
            WHERE p.project_id = ? AND (p.customer_id = ? OR pm.user_id IS NOT NULL)
            SQL);
        $stmt->execute([$userId, $projectId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function tracks(int $projectId): array
    {
        $stmt = $this->pdo->prepare('SELECT track_id, project_id, internal_code, private_title, production_status, created_at, updated_at FROM project_tracks WHERE project_id = ? ORDER BY track_id');
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listForUser(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT project_id, project_code, project_type, status, created_at FROM production_projects WHERE customer_id = ? ORDER BY project_id DESC');
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listAuthorizedForHost(int $hostId): array
    {
        $stmt = $this->pdo->prepare("SELECT p.project_id, p.project_code, p.project_type, p.status, p.created_at FROM production_projects p JOIN project_members pm ON pm.project_id = p.project_id AND pm.user_id = ? AND pm.revoked_at IS NULL AND pm.access_role = 'host' ORDER BY p.project_id DESC");
        $stmt->execute([$hostId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createTrack(int $projectId, string $code, ?string $title): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO project_tracks (project_id, internal_code, private_title, production_status) VALUES (?, ?, ?, 'planned')");
        $stmt->execute([$projectId, $code, $title]);
        return (int) $this->pdo->lastInsertId();
    }

    public function linkBooking(int $projectId, int $customerId, int $bookingId, ?int $serviceOrderId, ?string $purpose): void
    {
        $check = $this->pdo->prepare('SELECT b.booking_id FROM bookings b JOIN rooms r ON r.room_id = b.room_id JOIN production_projects p ON p.project_id = ? WHERE b.booking_id = ? AND b.customer_id = ? AND r.studio_id = p.studio_id');
        $check->execute([$projectId, $bookingId, $customerId]);
        if (!$check->fetchColumn()) {
            throw new \DomainException('Booking does not belong to project owner or studio');
        }
        $stmt = $this->pdo->prepare('INSERT INTO project_bookings (project_id, booking_id, service_order_id, purpose) VALUES (?, ?, ?, ?)');
        $stmt->execute([$projectId, $bookingId, $serviceOrderId, $purpose]);
    }

    public function trackBelongsToProject(int $trackId, int $projectId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM project_tracks WHERE track_id = ? AND project_id = ?');
        $stmt->execute([$trackId, $projectId]);
        return (bool) $stmt->fetchColumn();
    }

    public function trackStatusForUpdate(int $trackId, int $projectId): ?string
    {
        $stmt = $this->pdo->prepare('SELECT production_status FROM project_tracks WHERE track_id = ? AND project_id = ? FOR UPDATE');
        $stmt->execute([$trackId, $projectId]);
        $status = $stmt->fetchColumn();
        return $status === false ? null : (string) $status;
    }

    public function updateTrackStatus(int $trackId, string $status): void
    {
        $stmt = $this->pdo->prepare('UPDATE project_tracks SET production_status = ? WHERE track_id = ?');
        $stmt->execute([$status, $trackId]);
    }

    public function createRevision(array $revision): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO project_revisions (project_id, track_id, service_order_id, requested_by, revision_number, request_note) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$revision['project_id'], $revision['track_id'], $revision['service_order_id'], $revision['requested_by'], $revision['revision_number'], $revision['request_note']]);
        return (int) $this->pdo->lastInsertId();
    }

    public function auditRead(int $projectId, int $userId): void
    {
        $stmt = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'project_viewed', 'production_projects', ?, JSON_OBJECT('access', 'authorized'))");
        $stmt->execute([$userId, $projectId]);
    }

    public function members(int $projectId): array
    {
        $stmt = $this->pdo->prepare('SELECT user_id, access_role, can_view_confidential, can_manage_tracks, can_manage_sessions, can_manage_files, can_download_files, granted_at, revoked_at FROM project_members WHERE project_id = ? ORDER BY user_id');
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function grantMember(int $projectId, int $userId, int $grantedBy, array $permissions): void
    {
        $stmt = $this->pdo->prepare("INSERT INTO project_members (project_id, user_id, access_role, can_view_confidential, can_manage_tracks, can_manage_sessions, can_manage_files, can_download_files, granted_by, revoked_at) VALUES (?, ?, 'collaborator', ?, ?, ?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE access_role = 'collaborator', can_view_confidential = VALUES(can_view_confidential), can_manage_tracks = VALUES(can_manage_tracks), can_manage_sessions = VALUES(can_manage_sessions), can_manage_files = VALUES(can_manage_files), can_download_files = VALUES(can_download_files), granted_by = VALUES(granted_by), granted_at = CURRENT_TIMESTAMP, revoked_at = NULL");
        $stmt->execute([$projectId, $userId, $permissions['can_view_confidential'], $permissions['can_manage_tracks'], $permissions['can_manage_sessions'], $permissions['can_manage_files'], $permissions['can_download_files'], $grantedBy]);
    }

    public function revokeMember(int $projectId, int $userId): bool
    {
        $stmt = $this->pdo->prepare('UPDATE project_members SET revoked_at = CURRENT_TIMESTAMP WHERE project_id = ? AND user_id = ? AND revoked_at IS NULL');
        $stmt->execute([$projectId, $userId]);
        return $stmt->rowCount() === 1;
    }

    public function userExists(int $userId): bool
    {
        $stmt = $this->pdo->prepare("SELECT 1 FROM users WHERE user_id = ? AND status = 'active'");
        $stmt->execute([$userId]);
        return (bool) $stmt->fetchColumn();
    }

    public function auditAction(int $projectId, int $userId, string $action, array $metadata = []): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, \'production_projects\', ?, ?)');
        $stmt->execute([$userId, $action, $projectId, json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
}
