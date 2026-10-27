<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Ho_Chi_Minh');
spl_autoload_register(static function (string $class): void {
    $prefix = 'StudioHub\\Helpdesk\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) require $file;
    }
});
return StudioHub\Helpdesk\Config::load(__DIR__);
