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
use App\Controllers\AuthController;
use App\Controllers\RoomController;
use App\Controllers\EquipmentController;
use App\Controllers\LookupController;

$router = new Router();
$router->use(new CorsMiddleware());

// Public health check route
$router->get('/api/health', [HealthController::class, 'check']);
$router->get('/health', [HealthController::class, 'check']);
$router->get('/api/catalog', [App\Controllers\WorkspaceController::class, 'catalog']);
$router->get('/api/workspace', [App\Controllers\WorkspaceController::class, 'state'], [new AuthMiddleware()]);
$router->post('/api/commands', [App\Controllers\WorkspaceController::class, 'command'], [new AuthMiddleware()]);
$router->post('/api/booking-quotes', [App\Controllers\WorkspaceController::class, 'quote'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->get('/api/reports', [App\Controllers\WorkspaceController::class, 'report'], [new AuthMiddleware()]);

// --- Phase 3: Auth & Account Routes ---
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout'], [new AuthMiddleware()]);
$router->get('/api/auth/profile', [AuthController::class, 'profile'], [new AuthMiddleware()]);
$router->patch('/api/auth/profile', [AuthController::class, 'updateProfile'], [new AuthMiddleware()]);

// --- Phase 4: Public Catalog Routes ---
$router->get('/api/rooms', [RoomController::class, 'index']);
$router->get('/api/rooms/{id:\d+}', [RoomController::class, 'show']);
$router->get('/api/rooms/{id:\d+}/calendar', [RoomController::class, 'calendar']);
$router->get('/api/rooms/{id:\d+}/rates', [RoomController::class, 'rates']);
$router->get('/api/equipments', [EquipmentController::class, 'index']);
$router->get('/api/space-types', [LookupController::class, 'spaceTypes']);
$router->get('/api/amenities', [LookupController::class, 'amenities']);

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
if ($request->method()==='OPTIONS') (new CorsMiddleware())->handle($request, static fn()=>null);
$router->dispatch($request);
