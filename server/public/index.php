<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

$rootDir = dirname(__DIR__);

// 1. Composer Autoloader
require_once $rootDir . '/vendor/autoload.php';

// 2. Load .env
if (file_exists($rootDir . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable($rootDir);
    $dotenv->safeLoad();
}

// 3. Register global ErrorHandler
use App\Core\ErrorHandler;
ErrorHandler::register();

// 4. Initialize Router & Middlewares
use App\Core\Router;
use App\Core\Request;
use App\Core\ApiResponse;
use App\Middleware\CorsMiddleware;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Controllers\HealthController;

$router = new Router();
$router->use(new CorsMiddleware());

// Public health check route
$router->get('/api/health', [HealthController::class, 'check']);
$router->get('/health', [HealthController::class, 'check']);

// Verification routes for Phase 2 Auth/Role/Ownership
$router->get('/api/test/me', function (Request $req) {
    ApiResponse::success($req->user(), 'Xác thực thành công');
}, [new AuthMiddleware()]);

$router->get('/api/test/host-only', function (Request $req) {
    ApiResponse::success($req->user(), 'Truy cập host thành công');
}, [new AuthMiddleware(), new RoleMiddleware('host')]);

$router->get('/api/test/admin-only', function (Request $req) {
    ApiResponse::success($req->user(), 'Truy cập admin thành công');
}, [new AuthMiddleware(), new RoleMiddleware('admin')]);

// 5. Dispatch Request
$request = Request::fromGlobals();
$router->dispatch($request);
