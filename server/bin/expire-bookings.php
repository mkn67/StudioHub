<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

require dirname(__DIR__).'/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
try { $count=(new App\Services\WorkspaceService())->expire(); echo date(DATE_ATOM)." processed=$count\n"; }
catch(Throwable $e) { error_log('Deadline worker failed: '.$e->getMessage()); exit(1); }

