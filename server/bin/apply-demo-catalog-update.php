<?php
declare(strict_types=1);

// Opt-in deploy step for Render Free: no Shell required and no implicit seeding.
require_once dirname(__DIR__).'/vendor/autoload.php';
if(class_exists(Dotenv\Dotenv::class))Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$version=getenv('DEMO_CATALOG_UPDATE') ?: ($_ENV['DEMO_CATALOG_UPDATE'] ?? '');
if($version==='')return;
if($version!=='v2')throw new RuntimeException('Unsupported DEMO_CATALOG_UPDATE; only v2 is supported.');
$target=getenv('DEMO_CATALOG_DATABASE') ?: ($_ENV['DEMO_CATALOG_DATABASE'] ?? '');
if($target==='' || $target!==(string)App\Core\Db::getConnection()->query('SELECT DATABASE()')->fetchColumn()) {
    throw new RuntimeException('DEMO_CATALOG_DATABASE must explicitly match the connected database. No catalog changes were applied.');
}
$argv=['sync-demo-catalog.php','--apply','--once','--allow-production','--confirm-database='.$target];
require __DIR__.'/sync-demo-catalog.php';
