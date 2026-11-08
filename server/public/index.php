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
use App\Core\CorsMiddleware;
use App\Core\RateLimitMiddleware;
use App\Modules\Auth\AuthMiddleware;
use App\Modules\Shared\RoleMiddleware;
use App\Core\HealthController;
use App\Modules\Auth\AuthController;
use App\Modules\Rooms\RoomController;
use App\Modules\Rooms\ReviewController;
use App\Modules\Equipment\EquipmentController;
use App\Modules\Catalog\LookupController;
use App\Modules\Studios\StudioController;
use App\Modules\Studios\ServicePackageController;
use App\Modules\Studios\ProductionProjectController;
use App\Modules\Studios\ProjectFileController;
use App\Modules\Equipment\EquipmentCategoryController;
use App\Modules\Equipment\ConsumableController;
use App\Modules\Booking\BookingController;
use App\Modules\Admin\AdminController;
use App\Modules\Admin\HostController;
use App\Modules\HostApplications\HostApplicationController;
use App\Modules\Account\AccountController;
use App\Modules\Studios\StudioPolicyController;
use App\Modules\Studios\HostRoomTypeController;
use App\Modules\LegalContracts\LegalContractController;

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
$router->post('/api/auth/login', [AuthController::class, 'login'], [new RateLimitMiddleware('login')]);
$router->post('/api/auth/logout', [AuthController::class, 'logout'], [new AuthMiddleware()]);
$router->get('/api/auth/profile', [AuthController::class, 'profile'], [new AuthMiddleware()]);
$router->patch('/api/auth/profile', [AuthController::class, 'updateProfile'], [new AuthMiddleware()]);
$router->post('/api/host-applications', [HostApplicationController::class, 'submit'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->get('/api/host-applications/current', [HostApplicationController::class, 'current'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/auth/email-change-requests', [AccountController::class, 'requestEmailChange'], [new AuthMiddleware(), new RateLimitMiddleware('email-change', 5, 900)]);
$router->post('/api/auth/email-change-confirmations', [AccountController::class, 'confirmEmailChange'], [new AuthMiddleware(), new RateLimitMiddleware('email-change-confirm', 10, 900)]);
$router->post('/api/account/avatar', [AccountController::class, 'uploadAvatar'], [new AuthMiddleware()]);
$router->get('/api/account/notification-preferences', [AccountController::class, 'notificationPreferences'], [new AuthMiddleware()]);
$router->patch('/api/account/notification-preferences', [AccountController::class, 'updateNotificationPreferences'], [new AuthMiddleware()]);
$router->get('/api/account/identity-verification', [AccountController::class, 'identityVerification'], [new AuthMiddleware()]);
$router->post('/api/account/identity-verification', [AccountController::class, 'submitIdentityVerification'], [new AuthMiddleware(), new RateLimitMiddleware('identity-verification', 5, 86400)]);

// --- Phase 4: Public Catalog Routes ---
$router->get('/api/rooms', [RoomController::class, 'index']);
$router->get('/api/rooms/{id:\d+}', [RoomController::class, 'show']);
$router->get('/api/rooms/{id:\d+}/calendar', [RoomController::class, 'calendar']);
$router->get('/api/rooms/{id:\d+}/rates', [RoomController::class, 'rates']);
$router->get('/api/rooms/{id:\d+}/helpdesk-facts', [RoomController::class, 'helpdeskFacts']);
$router->get('/api/rooms/{id:\d+}/reviews', [ReviewController::class, 'listForRoom']);
$router->get('/api/equipments', [EquipmentController::class, 'index']);
$router->get('/api/space-types', [LookupController::class, 'spaceTypes']);
$router->get('/api/amenities', [LookupController::class, 'amenities']);
$router->get('/api/studios/{studio_id:\d+}/service-packages', [ServicePackageController::class, 'publicList']);
$router->post('/api/service-orders', [ServicePackageController::class, 'createOrder'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->get('/api/service-orders', [ServicePackageController::class, 'listOrders'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/service-orders/{order_id:\d+}/payments', [ServicePackageController::class, 'payOrder'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/service-orders/{order_id:\d+}/cancel', [ServicePackageController::class, 'cancelOrder'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/projects', [ProductionProjectController::class, 'create'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->get('/api/projects', [ProductionProjectController::class, 'listMine'], [new AuthMiddleware()]);
$router->get('/api/projects/{project_id:\d+}', [ProductionProjectController::class, 'show'], [new AuthMiddleware()]);
$router->get('/api/projects/{project_id:\d+}/members', [ProductionProjectController::class, 'members'], [new AuthMiddleware()]);
$router->post('/api/projects/{project_id:\d+}/members', [ProductionProjectController::class, 'grantMember'], [new AuthMiddleware()]);
$router->delete('/api/projects/{project_id:\d+}/members/{user_id:\d+}', [ProductionProjectController::class, 'revokeMember'], [new AuthMiddleware()]);
$router->post('/api/projects/{project_id:\d+}/tracks', [ProductionProjectController::class, 'createTrack'], [new AuthMiddleware()]);
$router->patch('/api/projects/{project_id:\d+}/tracks/{track_id:\d+}', [ProductionProjectController::class, 'updateTrackStatus'], [new AuthMiddleware()]);
$router->post('/api/projects/{project_id:\d+}/tracks/{track_id:\d+}/revisions', [ProductionProjectController::class, 'requestRevision'], [new AuthMiddleware()]);
$router->get('/api/projects/{project_id:\d+}/files', [ProjectFileController::class, 'list'], [new AuthMiddleware()]);
$router->post('/api/projects/{project_id:\d+}/files', [ProjectFileController::class, 'uploadMultipart'], [new AuthMiddleware()]);
$router->put('/api/projects/{project_id:\d+}/files', [ProjectFileController::class, 'uploadRaw'], [new AuthMiddleware()]);
$router->get('/api/projects/{project_id:\d+}/files/{file_id:\d+}', [ProjectFileController::class, 'download'], [new AuthMiddleware()]);
$router->delete('/api/projects/{project_id:\d+}/files/{file_id:\d+}', [ProjectFileController::class, 'delete'], [new AuthMiddleware()]);
$router->post('/api/projects/{project_id:\d+}/bookings/{booking_id:\d+}', [ProductionProjectController::class, 'linkBooking'], [new AuthMiddleware()]);

// --- Phase 5: Host Management Routes ---
$hostMiddlewares = [new AuthMiddleware(), new RoleMiddleware('host')];
$router->get('/api/host/projects', [ProductionProjectController::class, 'listAuthorizedForHost'], $hostMiddlewares);

// Studios
$router->get('/api/studios/mine', [StudioController::class, 'mine'], $hostMiddlewares);
$router->post('/api/studios', [StudioController::class, 'create'], $hostMiddlewares);
$router->patch('/api/studios/{id:\d+}', [StudioController::class, 'update'], $hostMiddlewares);
$router->post('/api/studios/{id:\d+}/cover', [StudioController::class, 'uploadCover'], $hostMiddlewares);
$router->get('/api/host/policies', [StudioPolicyController::class, 'index'], $hostMiddlewares);
$router->patch('/api/host/policies', [StudioPolicyController::class, 'update'], $hostMiddlewares);
$router->get('/api/host/room-types', [HostRoomTypeController::class, 'index'], $hostMiddlewares);
$router->post('/api/host/room-types', [HostRoomTypeController::class, 'create'], $hostMiddlewares);
$router->patch('/api/host/room-types/{id:\d+}', [HostRoomTypeController::class, 'update'], $hostMiddlewares);
$router->get('/api/host/legal-profile', [LegalContractController::class, 'legalProfile'], $hostMiddlewares);
$router->patch('/api/host/legal-profile', [LegalContractController::class, 'updateLegalProfile'], $hostMiddlewares);
$router->get('/api/host/contracts', [LegalContractController::class, 'contracts'], $hostMiddlewares);
$router->get('/api/host/contracts/{id:\d+}', [LegalContractController::class, 'contract'], $hostMiddlewares);
$router->post('/api/host/contracts/{id:\d+}/document-access', [LegalContractController::class, 'grantDocumentAccess'], $hostMiddlewares);
$router->get('/api/host/contracts/{id:\d+}/documents/{token}', [LegalContractController::class, 'downloadDocument'], $hostMiddlewares);
$router->post('/api/host/studios/{studio_id:\d+}/service-packages', [ServicePackageController::class, 'create'], $hostMiddlewares);
$router->patch('/api/host/service-packages/{package_id:\d+}', [ServicePackageController::class, 'update'], $hostMiddlewares);
$router->post('/api/host/studios/{studio_id:\d+}/consumables', [ConsumableController::class, 'create'], $hostMiddlewares);
$router->get('/api/host/studios/{studio_id:\d+}/consumables', [ConsumableController::class, 'listForStudio'], $hostMiddlewares);
$router->post('/api/host/consumables/{item_id:\d+}/movements', [ConsumableController::class, 'move'], $hostMiddlewares);
$router->get('/api/host/consumables/{item_id:\d+}/movements', [ConsumableController::class, 'listMovements'], $hostMiddlewares);
$router->post('/api/host/consumables/{item_id:\d+}/reservations', [ConsumableController::class, 'reserve'], $hostMiddlewares);
$router->post('/api/host/consumables/{item_id:\d+}/reservations/{reservation_id:\d+}/consume', [ConsumableController::class, 'consumeReservation'], $hostMiddlewares);
$router->post('/api/host/consumables/{item_id:\d+}/reservations/{reservation_id:\d+}/release', [ConsumableController::class, 'releaseReservation'], $hostMiddlewares);

// Equipment Categories
$router->get('/api/equipment-categories', [EquipmentCategoryController::class, 'index'], $hostMiddlewares);
$router->post('/api/equipment-categories', [EquipmentCategoryController::class, 'create'], $hostMiddlewares);

// Rooms
$router->post('/api/rooms', [RoomController::class, 'create'], $hostMiddlewares);
$router->patch('/api/rooms/{id:\d+}', [RoomController::class, 'update'], $hostMiddlewares);

// Rates
$router->post('/api/rooms/{id:\d+}/rates', [RoomController::class, 'createRate'], $hostMiddlewares);
$router->patch('/api/rooms/{id:\d+}/rates/{rate_id:\d+}', [RoomController::class, 'updateRate'], $hostMiddlewares);
$router->delete('/api/rooms/{id:\d+}/rates/{rate_id:\d+}', [RoomController::class, 'deleteRate'], $hostMiddlewares);

// Images
$router->post('/api/rooms/{id:\d+}/images', [RoomController::class, 'uploadImage'], $hostMiddlewares);

// Equipments
$router->post('/api/equipments', [EquipmentController::class, 'create'], $hostMiddlewares);
$router->patch('/api/equipments/{id:\d+}', [EquipmentController::class, 'update'], $hostMiddlewares);
$router->post('/api/equipments/{id:\d+}/images', [EquipmentController::class, 'uploadImage'], $hostMiddlewares);
$router->delete('/api/equipments/{id:\d+}', [EquipmentController::class, 'delete'], $hostMiddlewares);

// --- Phase 6: Booking Engine Routes ---
$router->post('/api/bookings/check-availability', [BookingController::class, 'checkAvailability'], [new RateLimitMiddleware('availability')]);
$router->post('/api/bookings', [BookingController::class, 'create'], [new AuthMiddleware(), new RoleMiddleware('customer')]);

// --- Phase 7: Booking Lifecycle & Payments Routes ---
$router->get('/api/bookings', [BookingController::class, 'index'], [new AuthMiddleware()]);
$router->get('/api/bookings/{id:\d+}', [BookingController::class, 'show'], [new AuthMiddleware()]);
$router->get('/api/bookings/{id:\d+}/review', [ReviewController::class, 'showForBooking'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/bookings/{id:\d+}/review', [ReviewController::class, 'createForBooking'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->patch('/api/bookings/{id:\d+}/status', [BookingController::class, 'updateStatus'], $hostMiddlewares);
$router->post('/api/bookings/{id:\d+}/cancel', [BookingController::class, 'cancel'], [new AuthMiddleware(), new RoleMiddleware('customer')]);
$router->post('/api/bookings/{id:\d+}/payments', [BookingController::class, 'pay'], [new AuthMiddleware(), new RoleMiddleware('customer')]);

// --- Phase 8: Administration & Statistics Routes ---
$adminMiddlewares = [new AuthMiddleware(), new RoleMiddleware('admin')];

$router->get('/api/admin/host-applications', [HostApplicationController::class, 'index'], $adminMiddlewares);
$router->get('/api/admin/host-applications/{id:\\d+}', [HostApplicationController::class, 'show'], $adminMiddlewares);
$router->patch('/api/admin/host-applications/{id:\\d+}/decision', [HostApplicationController::class, 'decide'], $adminMiddlewares);
$router->get('/api/admin/identity-verifications', [AccountController::class, 'adminIdentityVerifications'], $adminMiddlewares);
$router->get('/api/admin/identity-verifications/{id:\d+}/document', [AccountController::class, 'adminIdentityDocument'], $adminMiddlewares);
$router->patch('/api/admin/identity-verifications/{id:\d+}/decision', [AccountController::class, 'decideIdentityVerification'], $adminMiddlewares);
$router->post('/api/admin/studios/{studio_id:\d+}/contracts', [LegalContractController::class, 'createContract'], $adminMiddlewares);
$router->get('/api/admin/legal-profiles', [LegalContractController::class, 'adminLegalProfiles'], $adminMiddlewares);
$router->patch('/api/admin/legal-profiles/{id:\d+}/decision', [LegalContractController::class, 'decideLegalProfile'], $adminMiddlewares);

$router->get('/api/admin/users', [AdminController::class, 'users'], $adminMiddlewares);
$router->patch('/api/admin/users/{id:\d+}/status', [AdminController::class, 'updateUserStatus'], $adminMiddlewares);
$router->patch('/api/admin/users/{id:\d+}/role', [AdminController::class, 'updateUserRole'], $adminMiddlewares);
$router->get('/api/admin/statistics', [AdminController::class, 'statistics'], $adminMiddlewares);

$router->get('/api/host/statistics', [HostController::class, 'statistics'], $hostMiddlewares);
$router->get('/api/host/rooms', [HostController::class, 'rooms'], $hostMiddlewares);
$router->get('/api/host/rooms/{id:\\d+}', [HostController::class, 'room'], $hostMiddlewares);
$router->get('/api/host/rooms/{id:\\d+}/rates', [HostController::class, 'roomRates'], $hostMiddlewares);
$router->get('/api/host/equipments', [HostController::class, 'equipments'], $hostMiddlewares);
$router->get('/api/host/calendar', [HostController::class, 'calendar'], $hostMiddlewares);
$router->get('/api/host/reports/series', [HostController::class, 'reportSeries'], $hostMiddlewares);
$router->get('/api/host/overview', [HostController::class, 'overview'], $hostMiddlewares);

$router->get('/api/admin/roles', [AdminController::class, 'roles'], $adminMiddlewares);
$router->get('/api/admin/studios', [AdminController::class, 'studios'], $adminMiddlewares);
$router->get('/api/admin/rooms', [AdminController::class, 'rooms'], $adminMiddlewares);
$router->get('/api/admin/equipments', [AdminController::class, 'equipments'], $adminMiddlewares);
$router->patch('/api/admin/studios/{id:\\d+}', [AdminController::class, 'updateStudio'], $adminMiddlewares);
$router->patch('/api/admin/rooms/{id:\\d+}', [AdminController::class, 'updateRoom'], $adminMiddlewares);
$router->patch('/api/admin/equipments/{id:\\d+}', [AdminController::class, 'updateEquipment'], $adminMiddlewares);
$router->get('/api/admin/audit-logs', [AdminController::class, 'auditLogs'], $adminMiddlewares);
$router->get('/api/admin/refund-exceptions', [AdminController::class, 'refundExceptions'], $adminMiddlewares);
$router->get('/api/admin/refund-exceptions/{id:\\d+}', [AdminController::class, 'refundException'], $adminMiddlewares);
$router->post('/api/admin/refund-exceptions/{id:\\d+}/actions', [AdminController::class, 'refundExceptionAction'], $adminMiddlewares);
$router->get('/api/admin/reports/series', [AdminController::class, 'reportSeries'], $adminMiddlewares);

// Test-only identity probes used by the integration suites. Never register them in production.
$appEnv = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'dev';
if (in_array($appEnv, ['dev', 'test'], true)) {
    $router->get('/api/test/me', function (Request $req) {
        ApiResponse::success($req->user(), 'Xác thực thành công');
    }, [new AuthMiddleware()]);

    $router->get('/api/test/host-only', function (Request $req) {
        ApiResponse::success($req->user(), 'Truy cập host thành công');
    }, [new AuthMiddleware(), new RoleMiddleware('host')]);

    $router->get('/api/test/admin-only', function (Request $req) {
        ApiResponse::success($req->user(), 'Truy cập admin thành công');
    }, [new AuthMiddleware(), new RoleMiddleware('admin')]);
}

// 5. Dispatch Request
$request = Request::fromGlobals();
if ($request->method()==='OPTIONS') (new CorsMiddleware())->handle($request, static fn()=>null);
$router->dispatch($request);
