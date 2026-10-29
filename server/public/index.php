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
use App\Controllers\StudioController;
use App\Controllers\EquipmentCategoryController;
use App\Controllers\BookingController;
use App\Controllers\AdminController;
use App\Controllers\HostController;

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

// --- Phase 6: Booking Engine Routes ---
$router->post('/api/bookings/check-availability', [BookingController::class, 'checkAvailability']);
$router->post('/api/bookings', [BookingController::class, 'create'], [new AuthMiddleware(), new RoleMiddleware('customer')]);

// --- Phase 7: Booking Lifecycle & Payments Routes ---
$router->get('/api/bookings', [BookingController::class, 'index'], [new AuthMiddleware()]);
$router->get('/api/bookings/{id:\d+}', [BookingController::class, 'show'], [new AuthMiddleware()]);
$router->patch('/api/bookings/{id:\d+}/status', [BookingController::class, 'updateStatus'], $hostMiddlewares);
$router->post('/api/bookings/{id:\d+}/cancel', [BookingController::class, 'cancel'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/bookings/{id:\d+}/payments', [BookingController::class, 'pay'], [new AuthMiddleware(), new RoleMiddleware('customer')]);

// --- Phase 8: Administration & Statistics Routes ---
$adminMiddlewares = [new AuthMiddleware(), new RoleMiddleware('admin')];

$router->get('/api/admin/users', [AdminController::class, 'users'], $adminMiddlewares);
$router->patch('/api/admin/users/{id:\d+}/status', [AdminController::class, 'updateUserStatus'], $adminMiddlewares);
$router->patch('/api/admin/users/{id:\d+}/role', [AdminController::class, 'updateUserRole'], $adminMiddlewares);
$router->get('/api/admin/statistics', [AdminController::class, 'statistics'], $adminMiddlewares);

$router->get('/api/host/statistics', [HostController::class, 'statistics'], $hostMiddlewares);

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
