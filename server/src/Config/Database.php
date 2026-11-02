<?php
declare(strict_types=1);
namespace App\Config;
/** Legacy callers share the established PDO connection and transaction boundary. */
final class Database
{
    public static function getConnection(): \PDO { return \App\Core\Db::getConnection(); }
}
