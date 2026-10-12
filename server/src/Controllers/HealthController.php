<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Database;
use Exception;

class HealthController
{
    /**
     * Check system health (PHP API & MySQL connectivity) returning standard envelope.
     */
    public function check(): void
    {
        header('Content-Type: application/json; charset=utf-8');

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->query('SELECT VERSION() AS mysql_version, NOW() AS db_time');
            $row = $stmt->fetch();

            http_response_code(200);
            echo json_encode([
                'status'  => 'success',
                'code'    => 200,
                'message' => 'System is healthy',
                'data'    => [
                    'server'        => 'ok',
                    'database'      => 'ok',
                    'mysql_version' => $row['mysql_version'] ?? 'unknown',
                    'timestamp'     => $row['db_time'] ?? date('Y-m-d H:i:s'),
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'status'  => 'error',
                'code'    => 503,
                'message' => 'Database connection failed',
                'errors'  => [
                    [
                        'field'   => 'database',
                        'code'    => 'db_unavailable',
                        'message' => 'Unable to connect to MySQL database',
                    ]
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        }
    }
}
