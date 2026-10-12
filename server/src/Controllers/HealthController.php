<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiResponse;
use App\Core\Db;
use App\Core\Request;

class HealthController
{
    /**
     * Check system health (PHP API & MySQL connectivity) returning standard envelope.
     */
    public function check(?Request $request = null): void
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->query('SELECT VERSION() AS mysql_version, NOW() AS db_time');
        $row = $stmt->fetch();

        ApiResponse::success([
            'server'        => 'ok',
            'database'      => 'ok',
            'mysql_version' => $row['mysql_version'] ?? 'unknown',
            'timestamp'     => $row['db_time'] ?? date('Y-m-d H:i:s'),
        ], 'System is healthy');
    }
}
