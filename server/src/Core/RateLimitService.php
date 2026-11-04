<?php

declare(strict_types=1);

namespace App\Core;

use PDO;

final class RateLimitService
{
    public function __construct(private readonly ?PDO $pdo = null)
    {
    }

    /** @return array{allowed: bool, limit: int, remaining: int, retry_after: int} */
    public function consume(string $scope, string $clientIp, int $limit, int $windowSeconds): array
    {
        $limit = max(1, min(10000, $limit));
        $windowSeconds = max(1, min(86400, $windowSeconds));
        $scope = substr(preg_replace('/[^a-z0-9_-]/i', '', $scope) ?? '', 0, 40);
        $bucketKey = hash('sha256', $scope . "\0" . $clientIp);
        $connection = $this->pdo ?? Db::getConnection();
        $upsert = $connection->prepare(<<<'SQL'
            INSERT INTO api_rate_limits (bucket_key, scope, window_started_at, request_count, expires_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, 1, TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP))
            ON DUPLICATE KEY UPDATE
                request_count = IF(expires_at <= CURRENT_TIMESTAMP, 1, request_count + 1),
                window_started_at = IF(expires_at <= CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, window_started_at),
                expires_at = IF(expires_at <= CURRENT_TIMESTAMP, TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP), expires_at)
            SQL);
        $upsert->execute([$bucketKey, $scope, $windowSeconds, $windowSeconds]);

        $read = $connection->prepare('SELECT request_count, expires_at FROM api_rate_limits WHERE bucket_key = ?');
        $read->execute([$bucketKey]);
        $row = $read->fetch(PDO::FETCH_ASSOC);
        $count = (int) ($row['request_count'] ?? 0);
        $retryAfter = max(1, (int) (strtotime((string) ($row['expires_at'] ?? 'now')) - time()));
        return [
            'allowed' => $count <= $limit,
            'limit' => $limit,
            'remaining' => max(0, $limit - $count),
            'retry_after' => $retryAfter,
        ];
    }
}
