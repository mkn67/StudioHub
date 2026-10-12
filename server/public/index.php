<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

// Autoload composer dependencies if present, otherwise fallback to PSR-4
if (file_exists(dirname(__DIR__) . '/vendor/autoload.php')) {
    require_once dirname(__DIR__) . '/vendor/autoload.php';
} else {
    spl_autoload_register(function (string $class): void {
        $prefix = 'App\\';
        $baseDir = dirname(__DIR__) . '/src/';

        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            return;
        }

        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

        if (file_exists($file)) {
            require_once $file;
        }
    });
}

// Load environment variables if vlucas/phpdotenv is loaded
if (class_exists('Dotenv\Dotenv') && file_exists(dirname(__DIR__) . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    $dotenv->safeLoad();
}

// CORS handling
$allowedOriginsStr = $_ENV['ALLOWED_ORIGINS'] ?? getenv('ALLOWED_ORIGINS') ?: 'http://localhost:3000,http://127.0.0.1:3000';
$allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header("Access-Control-Allow-Origin: " . ($allowedOrigins[0] ?? 'http://localhost:3000'));
}
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");

$httpMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($httpMethod === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// Parse URI
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
if (false !== $pos = strpos($requestUri, '?')) {
    $requestUri = substr($requestUri, 0, $pos);
}
$uri = rawurldecode($requestUri);
$normalizedUri = rtrim($uri, '/');
if ($normalizedUri === '') {
    $normalizedUri = '/';
}

// If FastRoute is installed via composer, use FastRoute dispatcher
if (function_exists('FastRoute\simpleDispatcher')) {
    $dispatcher = FastRoute\simpleDispatcher(function (FastRoute\RouteCollector $r) {
        $r->addRoute('GET', '/api/health', [App\Controllers\HealthController::class, 'check']);
        $r->addRoute('GET', '/health', [App\Controllers\HealthController::class, 'check']);
    });

    $routeInfo = $dispatcher->dispatch($httpMethod, $normalizedUri);

    switch ($routeInfo[0]) {
        case FastRoute\Dispatcher::NOT_FOUND:
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(404);
            echo json_encode([
                'status'  => 'error',
                'code'    => 404,
                'message' => 'Route not found',
                'errors'  => [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit(0);

        case FastRoute\Dispatcher::METHOD_NOT_ALLOWED:
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(405);
            echo json_encode([
                'status'  => 'error',
                'code'    => 405,
                'message' => 'Method not allowed',
                'errors'  => [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit(0);

        case FastRoute\Dispatcher::FOUND:
            $handler = $routeInfo[1];
            $vars = $routeInfo[2];
            [$controllerClass, $method] = $handler;
            $controller = new $controllerClass();
            $controller->$method($vars);
            exit(0);
    }
} else {
    // Fallback before composer install
    if ($httpMethod === 'GET' && ($normalizedUri === '/api/health' || $normalizedUri === '/health')) {
        $controller = new App\Controllers\HealthController();
        $controller->check();
        exit(0);
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(404);
    echo json_encode([
        'status'  => 'error',
        'code'    => 404,
        'message' => 'Route not found',
        'errors'  => [],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit(0);
}
