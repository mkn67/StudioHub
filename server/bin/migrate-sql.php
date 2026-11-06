<?php

declare(strict_types=1);

// Additive SQL migrations for an existing database. Never creates the base schema
// or runs development seeds. The Compose maintenance service calls this explicitly.
require dirname(__DIR__) . '/vendor/autoload.php';

if (class_exists(\Dotenv\Dotenv::class)) {
    \Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
}

$pdo = \App\Core\Db::getConnection();
$database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
$tableCount = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?');
$tableCount->execute([$database, 'users']);
if ((int) $tableCount->fetchColumn() !== 1) {
    throw new RuntimeException('Base schema is missing; initialize a new database with db-init first.');
}

if ((int) $pdo->query("SELECT GET_LOCK('studiohub_migrations', 10)")->fetchColumn() !== 1) {
    throw new RuntimeException('Could not acquire the database migration lock.');
}

try {
    $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations_sql (
        migration VARCHAR(190) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    // Import the history recorded by the original SQL migrator, if present.
    $legacyColumn = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?');
    $legacyColumn->execute([$database, 'schema_migrations', 'migration']);
    if ((int) $legacyColumn->fetchColumn() === 1) {
        $pdo->exec('INSERT IGNORE INTO schema_migrations_sql (migration, applied_at)
            SELECT migration, applied_at FROM schema_migrations');
    }

    $check = $pdo->prepare('SELECT 1 FROM schema_migrations_sql WHERE migration = ?');
    $record = $pdo->prepare('INSERT INTO schema_migrations_sql (migration) VALUES (?)');
    foreach (glob(dirname(__DIR__) . '/database/migrations/*.sql') ?: [] as $file) {
        $name = basename($file);
        $check->execute([$name]);
        if ($check->fetchColumn()) {
            continue;
        }
        if (!in_array('--apply', $argv, true)) {
            echo "Pending: {$name} (use --apply)\n";
            continue;
        }
        $contents = file_get_contents($file);
        if ($contents === false) {
            throw new RuntimeException("Cannot read migration: {$name}");
        }
        foreach (preg_split('/;\s*$/m', $contents) ?: [] as $statement) {
            if (trim($statement) !== '') {
                $pdo->exec($statement);
            }
        }
        $record->execute([$name]);
        echo "Applied: {$name}\n";
    }
} finally {
    $pdo->query("SELECT RELEASE_LOCK('studiohub_migrations')");
}
