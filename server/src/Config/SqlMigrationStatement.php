<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use PDOException;

final class SqlMigrationStatement
{
    /** Execute a migration statement safely against a partially upgraded schema. */
    public static function execute(PDO $pdo, string $statement): void
    {
        $withoutLeadingComments = preg_replace('/^(?:\s*--[^\r\n]*(?:\r?\n|$))+/m', '', $statement) ?? $statement;
        if (preg_match('/^\s*SELECT\b/i', $withoutLeadingComments) === 1) {
            $result = $pdo->query($statement);
            if ($result !== false) {
                $result->fetchAll(PDO::FETCH_ASSOC);
                $result->closeCursor();
            }
            return;
        }

        try {
            $pdo->exec($statement);
        } catch (PDOException $exception) {
            $mysqlError = (int) ($exception->errorInfo[1] ?? 0);
            if (in_array($mysqlError, [1050, 1060, 1061, 1068, 1826], true)) {
                return;
            }
            throw $exception;
        }
    }
}
