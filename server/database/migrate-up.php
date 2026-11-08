<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

$rootDir = dirname(__DIR__);
require_once $rootDir . '/vendor/autoload.php';

if (file_exists($rootDir . '/.env')) {
    Dotenv\Dotenv::createImmutable($rootDir)->safeLoad();
}

$envValue = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    return $value !== false ? $value : (string) ($_ENV[$key] ?? $default);
};
$host = $envValue('DB_HOST', 'db');
$port = $envValue('DB_PORT', '3306');
$name = $envValue('DB_NAME');
$user = $envValue('DB_USER');
$password = $envValue('DB_PASS', $envValue('DB_PASSWORD'));

if ($name === '' || $user === '' || $password === '') {
    fwrite(STDERR, "DB_NAME, DB_USER and DB_PASS must be configured.\n");
    exit(1);
}

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
        $user,
        $password,
        App\Config\PdoOptions::mysql(),
    );
    $pdo->exec("SET time_zone = '+07:00'");
    $pdo->exec(<<<'SQL'
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration VARCHAR(190) PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);

    $files = glob(__DIR__ . '/migrations/*.sql') ?: [];
    sort($files, SORT_STRING);
    foreach ($files as $file) {
        $migration = basename($file);
        $check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE migration = ?');
        $check->execute([$migration]);
        if ($check->fetchColumn()) {
            echo "Already applied: {$migration}\n";
            continue;
        }

        $contents = (string) file_get_contents($file);
        if (trim($contents) === '') {
            throw new RuntimeException("Empty migration: {$migration}");
        }
        foreach (preg_split('/;\s*$/m', $contents) ?: [] as $statement) {
            $statement = trim($statement);
            if ($statement !== '') {
                App\Config\SqlMigrationStatement::execute($pdo, $statement);
            }
        }
        $record = $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (?)');
        $record->execute([$migration]);
        echo "Applied: {$migration}\n";
    }
} catch (Throwable $exception) {
    error_log('[migrate-up] ' . $exception->getMessage());
    fwrite(STDERR, "Migration failed; inspect server logs.\n");
    exit(1);
}
