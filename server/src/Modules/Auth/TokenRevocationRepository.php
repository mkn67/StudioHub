<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Db;
use PDO;

final class TokenRevocationRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    public function isRevoked(string $jti): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM revoked_jwt_tokens WHERE jti = ? AND expires_at > CURRENT_TIMESTAMP');
        $stmt->execute([$jti]);
        return (bool) $stmt->fetchColumn();
    }

    public function revoke(string $jti, int $expiresAt): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO revoked_jwt_tokens (jti, expires_at) VALUES (?, FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE expires_at = GREATEST(expires_at, VALUES(expires_at))');
        $stmt->execute([$jti, $expiresAt]);
    }

    public function purgeExpired(int $limit = 500): int
    {
        $limit = max(1, min(5000, $limit));
        $stmt = $this->pdo->prepare('DELETE FROM revoked_jwt_tokens WHERE expires_at <= CURRENT_TIMESTAMP ORDER BY expires_at LIMIT ?');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount();
    }
}
