<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use RuntimeException;

final class PdoOptions
{
    /** @return array<int, mixed> */
    public static function mysql(): array
    {
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ];

        // An explicitly empty process environment value must override a CA path
        // loaded from server/.env (Compose uses this for its local MySQL service).
        $environmentCaFile = getenv('DB_SSL_CA');
        $caFile = $environmentCaFile !== false
            ? $environmentCaFile
            : ($_ENV['DB_SSL_CA'] ?? '');
        $appEnvironment = getenv('APP_ENV');
        $appEnvironment = $appEnvironment !== false ? $appEnvironment : ($_ENV['APP_ENV'] ?? '');
        if ($appEnvironment === 'production' && $caFile === '') {
            throw new RuntimeException('DB_SSL_CA is required in production to verify the MySQL TLS connection');
        }
        if ($caFile !== '') {
            if (!is_file($caFile) || !is_readable($caFile)) {
                throw new RuntimeException('DB_SSL_CA must point to a readable CA certificate file');
            }

            $options[PDO::MYSQL_ATTR_SSL_CA] = $caFile;
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }

        return $options;
    }
}
