<?php

declare(strict_types=1);

namespace App\Modules\Shared;

use App\Core\Db;
use PDO;

class AuditLogger
{
    /**
     * Write an audit log entry to the audit_logs table
     *
     * @param int|null $userId User ID or NULL if triggered by system
     * @param string $action Action name (e.g. 'booking_expired', 'booking_confirmed', 'status_changed')
     * @param string $entityType E.g. 'bookings', 'rooms', 'users'
     * @param int $entityId ID of the entity
     * @param array|null $metadata Contextual JSON metadata
     * @return int Inserted log ID
     */
    public static function log(
        ?int $userId,
        string $action,
        string $entityType,
        int $entityId,
        ?array $metadata = null
    ): int {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ');

        $metaJson = $metadata !== null ? json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
        $stmt->execute([$userId, $action, $entityType, $entityId, $metaJson]);

        return (int) $pdo->lastInsertId();
    }
}

