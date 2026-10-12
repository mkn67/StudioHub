<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;

    private function __construct()
    {
    }

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'db';
            $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
            $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'studio_dev';
            $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'studio_user';
            $password = $_ENV['DB_PASS'] ?? $_ENV['DB_PASSWORD'] ?? getenv('DB_PASS') ?: getenv('DB_PASSWORD') ?: 'studio_password';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5,
            ];

            try {
                self::$connection = new PDO($dsn, $user, $password, $options);
                self::$connection->exec("SET time_zone = '+07:00'");
                self::$connection->exec("SET NAMES utf8mb4");
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw new RuntimeException("Database connection failed", 500, $e);
            }
        }

        return self::$connection;
    }
}
