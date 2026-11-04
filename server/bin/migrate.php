<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';
if (class_exists(Dotenv\Dotenv::class)) Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
date_default_timezone_set('Asia/Ho_Chi_Minh');
$db = App\Core\Db::getConnection();
$db->exec('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
if (!$db->query("SELECT GET_LOCK('studiohub_migrations',10)")->fetchColumn()) throw new RuntimeException('Migration lock unavailable');
try {
    foreach (glob(dirname(__DIR__) . '/database/migrations/*.php') as $file) {
        $version = basename($file);
        $q = $db->prepare('SELECT 1 FROM schema_migrations WHERE version=?'); $q->execute([$version]);
        if ($q->fetchColumn()) continue;
        if (!in_array('--apply', $argv, true)) { echo "Pending: $version (use --apply)\n"; continue; }
        (require $file)($db);
        $db->prepare('INSERT INTO schema_migrations(version) VALUES(?)')->execute([$version]);
        echo "Applied: $version\n";
    }
} finally { $db->query("SELECT RELEASE_LOCK('studiohub_migrations')"); }
