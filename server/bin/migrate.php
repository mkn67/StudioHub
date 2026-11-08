<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';
if (class_exists(Dotenv\Dotenv::class)) Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
date_default_timezone_set('Asia/Ho_Chi_Minh');
$db = App\Core\Db::getConnection();
$db->exec('CREATE TABLE IF NOT EXISTS schema_migrations_php(version VARCHAR(100) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
if (!$db->query("SELECT GET_LOCK('studiohub_migrations',10)")->fetchColumn()) throw new RuntimeException('Migration lock unavailable');
try {
    // The previous runner recorded PHP migration versions in
    // schema_migrations.version. Import that history before evaluating files so
    // upgrading the runner does not replay already-applied production changes.
    $legacyHistory = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.columns '
        . 'WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $legacyHistory->execute(['schema_migrations', 'version']);
    if ((int) $legacyHistory->fetchColumn() > 0) {
        $hasAppliedAt = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
        );
        $hasAppliedAt->execute(['schema_migrations', 'applied_at']);
        if ((int) $hasAppliedAt->fetchColumn() > 0) {
            $db->exec('INSERT IGNORE INTO schema_migrations_php(version, applied_at) '
                . 'SELECT version, applied_at FROM schema_migrations WHERE version IS NOT NULL');
        } else {
            $db->exec('INSERT IGNORE INTO schema_migrations_php(version) '
                . 'SELECT version FROM schema_migrations WHERE version IS NOT NULL');
        }
    }

    foreach (glob(dirname(__DIR__) . '/database/migrations/*.php') as $file) {
        $version = basename($file);
        $q = $db->prepare('SELECT 1 FROM schema_migrations_php WHERE version=?'); $q->execute([$version]);
        if ($q->fetchColumn()) continue;
        if (!in_array('--apply', $argv, true)) { echo "Pending: $version (use --apply)\n"; continue; }
        (require $file)($db);
        $db->prepare('INSERT INTO schema_migrations_php(version) VALUES(?)')->execute([$version]);
        echo "Applied: $version\n";
    }
} finally { $db->query("SELECT RELEASE_LOCK('studiohub_migrations')"); }
