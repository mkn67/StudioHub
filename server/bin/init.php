<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
date_default_timezone_set('Asia/Ho_Chi_Minh');

if (!in_array('--apply', $argv, true)) {
    echo "Initialize an empty database, then apply pending migrations. Use --apply; --seed is dev/test only.\n";
    exit(0);
}
if (in_array('--fresh', $argv, true)) {
    throw new RuntimeException('Database resets are not supported.');
}
$db = App\Core\Db::getConnection();
if ((int) $db->query("SELECT GET_LOCK('studiohub_migrations', 10)")->fetchColumn() !== 1) {
    throw new RuntimeException('Could not acquire the database initialization lock.');
}
try {
$database = (string) $db->query('SELECT DATABASE()')->fetchColumn();
$tableCountQuery = $db->prepare(
    'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?'
);
$tableCountQuery->execute([$database]);
$tableCount = (int) $tableCountQuery->fetchColumn();

if ($tableCount === 0) {
    // schema.sql is a fresh-install script and contains DROP TABLE statements.
    // Never run it against a populated database: doing so erased production data
    // whenever the Render container restarted or was redeployed.
    $schemaPath = dirname(__DIR__) . '/database/schema.sql';
    $schema = file_get_contents($schemaPath);
    if ($schema === false) {
        throw new RuntimeException('Cannot read the base schema.');
    }
    foreach (preg_split('/;\s*$/m', $schema) ?: [] as $statement) {
        if (trim($statement) !== '') {
            $db->exec($statement);
        }
    }
    foreach (glob(dirname(__DIR__) . '/database/triggers/*.sql') ?: [] as $triggerPath) {
        $triggerSql = file_get_contents($triggerPath);
        if ($triggerSql === false || trim($triggerSql) === '') {
            throw new RuntimeException('Cannot read a database trigger.');
        }
        $db->exec($triggerSql);
    }
    echo "Initialized empty database {$database}.\n";
} else {
    $usersTableQuery = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?'
    );
    $usersTableQuery->execute([$database, 'users']);
    if ((int) $usersTableQuery->fetchColumn() !== 1) {
        throw new RuntimeException(
            "Database {$database} is partially initialized; refusing to run the destructive fresh-install schema."
        );
    }
    echo "Existing database {$database} detected; preserving its data.\n";
}

if (in_array('--seed', $argv, true)) {
    $environment = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '';
    $name = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: '';
    if (!in_array($environment, ['dev', 'test'], true) || !preg_match('/_(dev|test)$/D', (string) $name)) {
        throw new RuntimeException('Seeding requires an empty, explicitly named dev/test database.');
    }
    if ((int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) {
        echo "Existing users detected; demo account seed skipped.\n";
    } else {
        $seedPath = dirname(__DIR__) . '/database/seed.sql';
        $seed = file_get_contents($seedPath);
        if ($seed === false) {
            throw new RuntimeException('Cannot read the development seed.');
        }
        // MySQL may implicitly commit during schema/seed statements; avoid a
        // PDO transaction that can become inactive before commit().
        foreach (preg_split('/;\s*$/m', $seed) ?: [] as $statement) {
            if (trim($statement) !== '') {
                App\Config\SqlMigrationStatement::execute($db, $statement);
            }
        }
    }
}
} finally {
    $db->query("SELECT RELEASE_LOCK('studiohub_migrations')");
}
