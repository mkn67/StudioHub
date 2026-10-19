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

// --- Phase 5: Host Management Routes ---
use App\Controllers\StudioController;
use App\Controllers\EquipmentCategoryController;

$hostMiddlewares = [new AuthMiddleware(), new RoleMiddleware('host')];

// Studios
$router->get('/api/studios/mine', [StudioController::class, 'mine'], $hostMiddlewares);
$router->post('/api/studios', [StudioController::class, 'create'], $hostMiddlewares);
$router->patch('/api/studios/{id:\d+}', [StudioController::class, 'update'], $hostMiddlewares);

// Equipment Categories
$router->get('/api/equipment-categories', [EquipmentCategoryController::class, 'index'], $hostMiddlewares);
$router->post('/api/equipment-categories', [EquipmentCategoryController::class, 'create'], $hostMiddlewares);

// Rooms
$router->post('/api/rooms', [RoomController::class, 'create'], $hostMiddlewares);
$router->patch('/api/rooms/{id:\d+}', [RoomController::class, 'update'], $hostMiddlewares);

// Rates
$router->post('/api/rooms/{id:\d+}/rates', [RoomController::class, 'createRate'], $hostMiddlewares);
$router->patch('/api/rooms/{id:\d+}/rates/{rate_id:\d+}', [RoomController::class, 'updateRate'], $hostMiddlewares);

// Images
$router->post('/api/rooms/{id:\d+}/images', [RoomController::class, 'uploadImage'], $hostMiddlewares);

// Equipments
$router->post('/api/equipments', [EquipmentController::class, 'create'], $hostMiddlewares);
$router->patch('/api/equipments/{id:\d+}', [EquipmentController::class, 'update'], $hostMiddlewares);

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
