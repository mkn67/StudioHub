<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;
use Throwable;
use App\Config\PdoOptions;

class Db
{
    private static ?PDO $connection = null;

    private function __construct()
    {
    }

    /**
     * Get or initialize the PDO connection.
     *
     * @return PDO
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'db';
            $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
            $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'studio_dev';
            $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'studio_user';
            $password = $_ENV['DB_PASS'] ?? $_ENV['DB_PASSWORD'] ?? getenv('DB_PASS') ?: getenv('DB_PASSWORD') ?: '';
            if ($password === '') {
                throw new RuntimeException('DB_PASS must be configured');
            }

            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";

            try {
                self::$connection = new PDO($dsn, $user, $password, PdoOptions::mysql());
                self::$connection->exec("SET time_zone = '+07:00'");
                self::$connection->exec("SET NAMES utf8mb4");
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw new RuntimeException("Database connection failed", 500, $e);
            }
        }

        return self::$connection;
    }

    /**
     * Set a custom PDO instance (e.g., for testing)
     */
    public static function setConnection(?PDO $pdo): void
    {
        self::$connection = $pdo;
    }

    /**
     * Execute a callback inside an atomic database transaction.
     *
     * @template T
     * @param callable(PDO): T $callback
     * @return T
     * @throws Throwable
     */
    public static function transaction(callable $callback): mixed
    {
        $pdo = self::getConnection();
        $pdo->beginTransaction();

        try {
            $result = $callback($pdo);
            $pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}

