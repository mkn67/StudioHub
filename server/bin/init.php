<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
date_default_timezone_set('Asia/Ho_Chi_Minh');
if(!in_array('--apply',$argv,true)) { echo "Initialize absent base tables, then upgrade. Use --apply; optional --seed only in empty dev/test database.\n"; exit; }
if(in_array('--fresh',$argv,true)) throw new RuntimeException('Database resets are not supported.');
$db=App\Core\Db::getConnection();
foreach(preg_split('/;\s*$/m',file_get_contents(dirname(__DIR__).'/database/schema.sql')) as $sql) if(trim($sql)!=='') $db->exec($sql);
if(in_array('--seed',$argv,true)) {
    $env=$_ENV['APP_ENV'] ?? getenv('APP_ENV'); $name=$_ENV['DB_NAME'] ?? getenv('DB_NAME');
    if(!in_array($env,['dev','test'],true) || !preg_match('/_(dev|test)$/D',(string)$name) || $db->query('SELECT COUNT(*) FROM users')->fetchColumn()) throw new RuntimeException('Seeding requires an empty, explicitly named dev/test database.');
    $db->beginTransaction();
    try { foreach(preg_split('/;\s*$/m',file_get_contents(dirname(__DIR__).'/database/seed.sql')) as $sql) if(trim($sql)!=='') $db->exec($sql); $db->commit(); }
    catch(Throwable $e) { if($db->inTransaction()) $db->rollBack(); throw $e; }
}
require __DIR__.'/migrate.php';
