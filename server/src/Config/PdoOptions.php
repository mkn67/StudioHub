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

        $caFile = $_ENV['DB_SSL_CA'] ?? getenv('DB_SSL_CA') ?: '';
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
