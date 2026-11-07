<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

$rootDir = dirname(__DIR__);

// Load composer autoloader
if (file_exists($rootDir . '/vendor/autoload.php')) {
    require_once $rootDir . '/vendor/autoload.php';
}

// Load .env
if (class_exists('Dotenv\Dotenv') && file_exists($rootDir . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable($rootDir);
    $dotenv->safeLoad();
}

$appEnv = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'dev';
$dbHost = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'db';
$dbPort = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'studio_dev';
$dbUser = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'studio_user';
$dbPass = $_ENV['DB_PASS'] ?? $_ENV['DB_PASSWORD'] ?? getenv('DB_PASS') ?: getenv('DB_PASSWORD') ?: '';
if ($dbPass === '') {
    fwrite(STDERR, "DB_PASS must be configured\n");
    exit(1);
}

$isFresh = in_array('--fresh', $argv, true);

echo "==================================================\n";
echo "Database Migration Runner (PHP 8.2 + MySQL 8.0)\n";
echo "Target: {$dbHost}:{$dbPort}/{$dbName} [Env: {$appEnv}]\n";
echo "==================================================\n";

if ($isFresh) {
    echo "Processing --fresh option...\n";
    $allowedEnv = in_array($appEnv, ['dev', 'test'], true);
    $validDbName = str_ends_with($dbName, '_dev') || str_ends_with($dbName, '_test');

    if (!$allowedEnv || !$validDbName) {
        fwrite(STDERR, "[CRITICAL ERROR] --fresh is strictly rejected outside dev/test environments or invalid DB name!\n");
        fwrite(STDERR, "APP_ENV must be 'dev' or 'test' (current: '{$appEnv}')\n");
        fwrite(STDERR, "DB_NAME must end with '_dev' or '_test' (current: '{$dbName}')\n");
        exit(1);
    }
}

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        ...App\Config\PdoOptions::mysql(),
    ]);
    $pdo->exec("SET time_zone = '+07:00'");
    $pdo->exec("SET NAMES utf8mb4");

    // Drop all tables and triggers if --fresh
    if ($isFresh) {
        echo "Dropping existing triggers and tables...\n";
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

        // Drop triggers
        $triggers = $pdo->query("SHOW TRIGGERS")->fetchAll();
        foreach ($triggers as $trg) {
            $trgName = $trg['Trigger'] ?? $trg['trigger'] ?? null;
            if ($trgName) {
                $pdo->exec("DROP TRIGGER IF EXISTS `{$trgName}`");
                echo " - Dropped trigger: {$trgName}\n";
            }
        }

        // Drop tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
            echo " - Dropped table: {$table}\n";
        }

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        echo "Cleaned existing schema successfully.\n";
    }

    // 1. Run schema.sql
    $schemaFile = __DIR__ . '/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new RuntimeException("Schema file not found: {$schemaFile}");
    }
    echo "Applying schema from schema.sql...\n";
    $schemaSql = file_get_contents($schemaFile);
    // Split statements by semicolon at the end of line
    $statements = preg_split('/;\s*$/m', $schemaSql);
    $tableCount = 0;
    foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') {
            continue;
        }
        $pdo->exec($stmt);
        if (stripos($stmt, 'CREATE TABLE') !== false) {
            $tableCount++;
        }
    }
    echo "-> Schema applied ({$tableCount} CREATE TABLE statements executed).\n";

    // 2. Run trigger files in database/triggers/
    $triggersDir = __DIR__ . '/triggers';
    $triggerCount = 0;
    if (is_dir($triggersDir)) {
        $triggerFiles = glob($triggersDir . '/*.sql');
        sort($triggerFiles);
        echo "Applying triggers from triggers/ directory...\n";
        foreach ($triggerFiles as $file) {
            $triggerSql = trim(file_get_contents($file));
            if ($triggerSql === '') {
                continue;
            }
            // Execute entire file as ONE single statement via exec() without splitting
            $pdo->exec($triggerSql);
            $triggerName = basename($file);
            echo " - Registered trigger: {$triggerName}\n";
            $triggerCount++;
        }
    }
    echo "-> Triggers applied ({$triggerCount} triggers registered).\n";

    // 3. Load demo fixtures only in development/test environments. Production
    // must never receive the documented sample accounts and passwords.
    $seedFile = __DIR__ . '/seed.sql';
    if (in_array($appEnv, ['dev', 'test'], true) && file_exists($seedFile)) {
        echo "Applying seed data from seed.sql...\n";
        $seedSql = file_get_contents($seedFile);
        $seedStatements = preg_split('/;\s*$/m', $seedSql);
        $seedCount = 0;
        foreach ($seedStatements as $stmt) {
            $stmt = trim($stmt);
            if ($stmt === '') {
                continue;
            }
            $pdo->exec($stmt);
            $seedCount++;
        }
        echo "-> Seed applied ({$seedCount} statements executed).\n";
    } elseif (file_exists($seedFile)) {
        echo "Skipping development seed data for environment '{$appEnv}'.\n";
    }

    if (!in_array($appEnv, ['dev', 'test'], true)) {
        $roleInsert = $pdo->prepare('INSERT IGNORE INTO roles (role_name, description) VALUES (?, ?)');
        foreach ([
            ['admin', 'Quản trị viên toàn hệ thống'],
            ['host', 'Chủ cơ sở studio'],
            ['customer', 'Khách hàng thuê studio và thiết bị'],
        ] as [$roleName, $description]) {
            $roleInsert->execute([$roleName, $description]);
        }
    }

    // 4. Apply versioned, additive migrations for existing and fresh databases.
    $pdo->exec(<<<'SQL'
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration VARCHAR(190) PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);
    $migrationFiles = glob(__DIR__ . '/migrations/*.sql') ?: [];
    sort($migrationFiles, SORT_STRING);
    foreach ($migrationFiles as $migrationFile) {
        $migrationName = basename($migrationFile);
        $migrationCheck = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE migration = ?');
        $migrationCheck->execute([$migrationName]);
        if ($migrationCheck->fetchColumn()) {
            continue;
        }
        $migrationSql = file_get_contents($migrationFile);
        foreach (preg_split('/;\s*$/m', (string) $migrationSql) ?: [] as $migrationStatement) {
            $migrationStatement = trim($migrationStatement);
            if ($migrationStatement !== '') {
                $pdo->exec($migrationStatement);
            }
        }
        $migrationRecord = $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (?)');
        $migrationRecord->execute([$migrationName]);
        echo " - Applied migration: {$migrationName}\n";
    }

    // 5. Verify results
    $verifiedTables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $verifiedTriggers = $pdo->query("SHOW TRIGGERS")->fetchAll();

    echo "==================================================\n";
    echo "Migration Completed Successfully!\n";
    echo "Total tables: " . count($verifiedTables) . " (Base schema: 16; additive domain tables included)\n";
    echo "Total triggers: " . count($verifiedTriggers) . " (Expected: 2)\n";
    echo "==================================================\n";

} catch (Throwable $e) {
    fwrite(STDERR, "[MIGRATION FAILED] " . $e->getMessage() . "\n");
    exit(1);
}

