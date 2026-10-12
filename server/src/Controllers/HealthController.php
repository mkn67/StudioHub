<?php

namespace App\Controllers;

use App\Config\Database;
use Exception;

class HealthController
{
    /**
     * Check system health (PHP API & MySQL connectivity).
     */
    public function check(): void
    {
        header('Content-Type: application/json; charset=utf-8');

        $serverStatus = 'ok';
        $dbStatus = 'ok';
        $timestamp = null;

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->query('SELECT NOW() AS db_time');
            $result = $stmt->fetch();
            $timestamp = $result['db_time'] ?? date('Y-m-d H:i:s');
        } catch (Exception $e) {
            $dbStatus = 'error';
            error_log("Health check database query error: " . $e->getMessage());
        }

        if ($dbStatus === 'ok') {
            http_response_code(200);
            echo json_encode([
                'success'   => true,
                'server'    => $serverStatus,
                'database'  => $dbStatus,
                'timestamp' => $timestamp,
            ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        } else {
            http_response_code(503);
            echo json_encode([
                'success'  => false,
                'server'   => $serverStatus,
                'database' => $dbStatus,
                'message'  => 'Database connection failed',
            ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        }
    }
}
