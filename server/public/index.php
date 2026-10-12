<?php

declare(strict_types=1);

// Register PSR-4 Autoloader for application namespace App\ -> server/src/
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

use App\Middlewares\CorsMiddleware;
use App\Controllers\HealthController;

// 1. Process CORS Middleware
CorsMiddleware::handle();

// 2. Parse Request Method and URI
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

$parsedPath = parse_url($requestUri, PHP_URL_PATH) ?? '/';
// Normalize path by stripping trailing slashes (except root '/')
$normalizedPath = rtrim($parsedPath, '/');
if ($normalizedPath === '') {
    $normalizedPath = '/';
}

// 3. Simple RESTful Router
if ($requestMethod === 'GET' && ($normalizedPath === '/api/health' || $normalizedPath === '/health')) {
    $controller = new HealthController();
    $controller->check();
    exit(0);
}

// 4. Default 404 Handler for undefined routes
header('Content-Type: application/json; charset=utf-8');
http_response_code(404);
echo json_encode([
    'success' => false,
    'message' => 'Route not found',
    'path'    => $normalizedPath,
    'method'  => $requestMethod,
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
exit(0);
