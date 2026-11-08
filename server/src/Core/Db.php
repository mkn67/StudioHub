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
            // Process environment is authoritative in Compose/Render; .env is a fallback.
            $host = self::environment('DB_HOST', 'db');
            $port = self::environment('DB_PORT', '3306');
            $dbName = self::environment('DB_NAME', 'studio_dev');
            $user = self::environment('DB_USER', 'studio_user');
            $password = self::environment('DB_PASS', self::environment('DB_PASSWORD'));
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

    private static function environment(string $key, string $default = ''): string
    {
        $value = getenv($key);
        return $value !== false ? $value : (string) ($_ENV[$key] ?? $default);
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

