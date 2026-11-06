<?php

declare(strict_types=1);

// Compose supplies the connection settings. Bootstrap only an empty database;
// demo seed data is limited to dev/test environments by the migrator.
try {
    $pdo = new PDO(
        'mysql:host=' . getenv('DB_HOST')
        . ';port=' . getenv('DB_PORT')
        . ';dbname=' . getenv('DB_NAME'),
        getenv('DB_USER'),
        getenv('DB_PASS'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    $tableCount = (int) $pdo->query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()'
    )->fetchColumn();
} catch (Throwable $error) {
    fwrite(STDERR, "Database bootstrap check failed: {$error->getMessage()}\n");
    exit(1);
}

if ($tableCount > 0) {
    echo "Existing database detected; automatic migration and seeding skipped.\n";
    exit(0);
}

$pdo = null;
require dirname(__DIR__) . '/database/migrate.php';
