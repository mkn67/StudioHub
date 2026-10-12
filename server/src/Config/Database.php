<?php

namespace App\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;

    /**
     * Private constructor to prevent direct instantiation (Singleton pattern).
     */
    private function __construct()
    {
    }

    /**
     * Get the single active PDO connection for the current request.
     *
     * @return PDO
     * @throws RuntimeException
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host = getenv('DB_HOST') ?: 'db';
            $port = getenv('DB_PORT') ?: '3306';
            $dbName = getenv('DB_NAME') ?: 'studio_db';
            $user = getenv('DB_USER') ?: 'studio_user';
            $password = getenv('DB_PASSWORD') ?: '';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
            ];

            try {
                self::$connection = new PDO($dsn, $user, $password, $options);
            } catch (PDOException $e) {
                // Log actual error internally without exposing credentials/stack trace to users
                error_log("Database connection error: " . $e->getMessage());
                throw new RuntimeException("Database connection failed");
            }
        }

        return self::$connection;
    }
}
