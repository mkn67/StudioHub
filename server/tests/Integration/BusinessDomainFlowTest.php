<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Core\Db;
use App\Core\RateLimitService;
use App\Core\Request;
use App\Exceptions\ApiException;
use App\Modules\Equipment\ConsumableService;
use App\Modules\Booking\BookingRepository;
use App\Modules\Booking\PaymentService;
use App\Modules\Auth\AuthMiddleware;
use App\Modules\Auth\AuthService;
use App\Modules\Auth\JwtService;
use App\Modules\Auth\TokenRevocationRepository;
use App\Modules\Studios\ProductionProjectService;
use App\Modules\Studios\ProjectFileService;
use App\Modules\Studios\ServicePackageService;
use PDO;
use PHPUnit\Framework\TestCase;

final class BusinessDomainFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (($_ENV['DB_NAME'] ?? getenv('DB_NAME')) !== 'studio_backend_test') {
            $this->markTestSkipped('Run against the isolated studio_backend_test database.');
        }
    }

    public function testPackageOrderPaymentProjectPrivacyAndInventoryAreEnforced(): void
    {
        $pdo = Db::getConnection();
        $suffix = bin2hex(random_bytes(5));
        $packages = new ServicePackageService($pdo);
        $package = $packages->createPackage(2, 1, [
            'name' => 'Test service ' . $suffix,
            'pricing_unit' => 'song',
            'base_price' => 1234500,
            'status' => 'active',
            'items' => [['item_type' => 'session', 'name' => 'Recording session', 'quantity' => 2, 'duration_minutes' => 180]],
        ]);

        $projectService = new ProductionProjectService($pdo);
        $project = $projectService->create(4, [
            'studio_id' => 1,
            'project_type' => 'single',
            'private_name' => 'Unreleased title ' . $suffix,
            'description' => 'Private notes',
        ]);
        $track = $projectService->createTrack($project['project_id'], 4, [
            'internal_code' => 'TRACK-' . $suffix,
            'private_title' => 'Private track title',
        ]);

        $publicPackages = $packages->publicPackages(1);
        $this->assertNotEmpty(array_filter($publicPackages, static fn(array $row): bool => (int) $row['package_id'] === $package['package_id']));
        $order = $packages->createOrder(4, $package['package_id'], 2, $project['project_id']);
        $this->assertSame(2469000, $order['total_amount']);
        $snapshot = $pdo->prepare('SELECT unit_price_snapshot, included_sessions_snapshot FROM service_orders WHERE order_id = ?');
        $snapshot->execute([$order['order_id']]);
        $snapshotRow = $snapshot->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('1234500.00', $snapshotRow['unit_price_snapshot']);
        $this->assertNull($snapshotRow['included_sessions_snapshot']);
        $packages->updatePackage(2, $package['package_id'], [
            'base_price' => 999999,
            'included_sessions' => 8,
            'items' => [['item_type' => 'service', 'name' => 'Changed benefit']],
        ]);
        $snapshot->execute([$order['order_id']]);
        $this->assertSame('1234500.00', $snapshot->fetch(PDO::FETCH_ASSOC)['unit_price_snapshot']);
        $itemSnapshot = $pdo->prepare('SELECT name_snapshot FROM service_order_items WHERE order_id = ?');
        $itemSnapshot->execute([$order['order_id']]);
        $this->assertSame('Recording session', $itemSnapshot->fetchColumn());

        $key = 'integration-' . $suffix;
        $payment = $packages->paySandbox(4, $order['order_id'], $key);
        $repeated = $packages->paySandbox(4, $order['order_id'], $key);
        $this->assertSame($payment['payment_id'], $repeated['payment_id']);
        $this->assertSame(2469000, (int) $payment['amount']);
        $paymentCount = $pdo->prepare('SELECT COUNT(*) FROM service_order_payments WHERE order_id = ?');
        $paymentCount->execute([$order['order_id']]);
        $this->assertSame(1, (int) $paymentCount->fetchColumn());
        $cancelled = $packages->cancelOrder(4, $order['order_id']);
        $this->assertSame(2469000, $cancelled['refund_amount']);
        $this->assertSame('sandbox', $cancelled['refund_mode']);
        $refundCount = $pdo->prepare('SELECT COUNT(*) FROM service_order_refunds WHERE order_id = ?');
        $refundCount->execute([$order['order_id']]);
        $this->assertSame(1, (int) $refundCount->fetchColumn());
        $this->assertSame(0, $packages->cancelOrder(4, $order['order_id'])['refund_amount']);

        $customerView = $projectService->show($project['project_id'], 4);
        $this->assertSame('Unreleased title ' . $suffix, $customerView['private_name']);
        $this->assertSame('Private track title', $customerView['tracks'][0]['private_title']);
        $hostView = $projectService->show($project['project_id'], 2);
        $this->assertNull($hostView['private_name']);
        $this->assertNull($hostView['tracks'][0]['private_title']);
        $this->assertNotEmpty(array_filter($projectService->listAuthorizedForHost(2), static fn(array $row): bool => (int) $row['project_id'] === $project['project_id']));
        $this->assertEmpty($projectService->listAuthorizedForHost(3));
        try {
            $projectService->show($project['project_id'], 3);
            $this->fail('An unrelated host must not access a project.');
        } catch (ApiException $exception) {
            $this->assertSame('project_not_found', $exception->getErrorCode());
        }

        $inventory = new ConsumableService($pdo);
        $item = $inventory->create(2, 1, ['name' => 'Test batteries ' . $suffix, 'unit' => 'piece']);
        $receiptKey = 'receipt-' . $suffix;
        $inventory->move(2, $item['item_id'], ['movement_type' => 'receipt', 'quantity_delta' => '10', 'idempotency_key' => $receiptKey]);
        $inventory->move(2, $item['item_id'], ['movement_type' => 'consume', 'quantity_delta' => '-4', 'idempotency_key' => 'consume-' . $suffix]);
        $inventory->move(2, $item['item_id'], ['movement_type' => 'consume', 'quantity_delta' => '-4', 'idempotency_key' => 'consume-' . $suffix]);
        $stock = $pdo->prepare('SELECT on_hand FROM consumable_items WHERE item_id = ?');
        $stock->execute([$item['item_id']]);
        $this->assertSame('6.000', $stock->fetchColumn());
        $movementQuery = $pdo->prepare('SELECT movement_id FROM inventory_movements WHERE idempotency_key = ?');
        $movementQuery->execute(['consume-' . $suffix]);
        $movementId = (int) $movementQuery->fetchColumn();
        $inventory->move(2, $item['item_id'], ['movement_type' => 'reversal', 'reversal_of_movement_id' => $movementId, 'idempotency_key' => 'reverse-' . $suffix]);
        $inventory->move(2, $item['item_id'], ['movement_type' => 'reversal', 'reversal_of_movement_id' => $movementId, 'idempotency_key' => 'reverse-' . $suffix]);
        $stock->execute([$item['item_id']]);
        $this->assertSame('10.000', $stock->fetchColumn());

        try {
            $inventory->move(2, $item['item_id'], ['movement_type' => 'consume', 'quantity_delta' => '-11', 'idempotency_key' => 'overspend-' . $suffix]);
            $this->fail('Expected stock underflow to be rejected.');
        } catch (ApiException $exception) {
            $this->assertSame('insufficient_stock', $exception->getErrorCode());
        }
    }

    public function testInventoryReservationsProtectAvailabilityAndSettleExactlyOnce(): void
    {
        $pdo = Db::getConnection();
        $inventory = new ConsumableService($pdo);
        $suffix = bin2hex(random_bytes(6));
        $item = $inventory->create(2, 1, ['name' => 'Reserved stock ' . $suffix, 'unit' => 'piece']);
        $inventory->move(2, $item['item_id'], ['movement_type' => 'receipt', 'quantity_delta' => '5', 'idempotency_key' => 'reserve-receipt-' . $suffix]);
        $bookingA = $this->createFutureBooking($pdo, $suffix . '-a');
        $bookingB = $this->createFutureBooking($pdo, $suffix . '-b');

        $reservation = $inventory->reserve(2, $item['item_id'], [
            'booking_id' => $bookingA, 'quantity' => '3', 'idempotency_key' => 'reservation-a-' . $suffix,
        ]);
        $replayed = $inventory->reserve(2, $item['item_id'], [
            'booking_id' => $bookingA, 'quantity' => '3', 'idempotency_key' => 'reservation-a-' . $suffix,
        ]);
        $this->assertSame($reservation['reservation_id'], (int) $replayed['reservation_id']);

        try {
            $inventory->reserve(2, $item['item_id'], [
                'booking_id' => $bookingB, 'quantity' => '3', 'idempotency_key' => 'reservation-b-too-large-' . $suffix,
            ]);
            $this->fail('Reserved quantities must reduce the available stock.');
        } catch (ApiException $exception) {
            $this->assertSame('insufficient_available_stock', $exception->getErrorCode());
        }

        $inventory->settleReservation(2, $item['item_id'], $reservation['reservation_id'], 'release');
        $nextReservation = $inventory->reserve(2, $item['item_id'], [
            'booking_id' => $bookingB, 'quantity' => '5', 'idempotency_key' => 'reservation-b-' . $suffix,
        ]);
        $consumed = $inventory->settleReservation(2, $item['item_id'], $nextReservation['reservation_id'], 'consume');
        $consumedAgain = $inventory->settleReservation(2, $item['item_id'], $nextReservation['reservation_id'], 'consume');
        $this->assertSame('consumed', $consumed['status']);
        $this->assertSame('consumed', $consumedAgain['status']);
        $stock = $pdo->prepare('SELECT on_hand FROM consumable_items WHERE item_id = ?');
        $stock->execute([$item['item_id']]);
        $this->assertSame('0.000', $stock->fetchColumn());
        $movements = $pdo->prepare("SELECT COUNT(*) FROM inventory_movements WHERE idempotency_key = ?");
        $movements->execute(['reservation-consume-' . $nextReservation['reservation_id']]);
        $this->assertSame(1, (int) $movements->fetchColumn());
    }

    public function testPaidPackageEntitlementsAndPrivateProjectFilesRespectScopes(): void
    {
        $pdo = Db::getConnection();
        $suffix = bin2hex(random_bytes(5));
        $packages = new ServicePackageService($pdo);
        $projects = new ProductionProjectService($pdo);
        $project = $projects->create(4, ['studio_id' => 1, 'project_type' => 'single', 'private_name' => 'Scoped project ' . $suffix]);
        $track = $projects->createTrack($project['project_id'], 4, ['internal_code' => 'SCOPE-' . $suffix]);
        $package = $packages->createPackage(2, 1, [
            'name' => 'Entitlement package ' . $suffix, 'pricing_unit' => 'project', 'base_price' => 500000,
            'included_duration_minutes' => 60, 'included_sessions' => 1, 'included_revisions' => 1,
            'status' => 'active',
        ]);
        $order = $packages->createOrder(4, $package['package_id'], 1, $project['project_id']);
        $packages->paySandbox(4, $order['order_id'], 'entitlement-payment-' . $suffix);
        $bookingId = $this->createFutureBooking($pdo, 'entitlement-' . $suffix);
        $projects->linkBooking($project['project_id'], 4, $bookingId, ['service_order_id' => $order['order_id']]);
        $sessions = $pdo->prepare("SELECT consumed_quantity FROM service_order_entitlements WHERE order_id = ? AND entitlement_type = 'sessions'");
        $sessions->execute([$order['order_id']]);
        $this->assertSame(1, (int) $sessions->fetchColumn());
        $minutes = $pdo->prepare("SELECT consumed_quantity FROM service_order_entitlements WHERE order_id = ? AND entitlement_type = 'minutes'");
        $minutes->execute([$order['order_id']]);
        $this->assertSame(60, (int) $minutes->fetchColumn());
        $revision = $projects->requestRevision($project['project_id'], $track['track_id'], 4, ['service_order_id' => $order['order_id'], 'request_note' => 'Mix adjustment']);
        $this->assertSame(1, $revision['revision_number']);
        try {
            $packages->cancelOrder(4, $order['order_id']);
            $this->fail('A used package entitlement must prevent refund cancellation.');
        } catch (ApiException $exception) {
            $this->assertSame('service_order_in_use', $exception->getErrorCode());
        }

        $storage = sys_get_temp_dir() . '/project-files-' . $suffix;
        $uploadPath = tempnam(sys_get_temp_dir(), 'project-pdf-');
        self::assertNotFalse($uploadPath);
        file_put_contents($uploadPath, "%PDF-1.4\n% test document\n");
        try {
            $files = new ProjectFileService($pdo, $storage);
            $uploaded = $files->upload($project['project_id'], 4, [
                'error' => UPLOAD_ERR_OK, 'tmp_name' => $uploadPath, 'name' => 'private-session.pdf', 'size' => filesize($uploadPath),
            ]);
            $projects->grantMember($project['project_id'], 4, ['user_id' => 3, 'can_download_files' => true]);
            $download = $files->download($project['project_id'], $uploaded['file_id'], 3);
            $this->assertFileExists($download['path']);
            $this->assertSame('application/pdf', $download['media_type']);
            $this->assertStringStartsNotWith(dirname(__DIR__, 2) . '/public', $download['path']);
            try {
                $files->download($project['project_id'], $uploaded['file_id'], 1);
                $this->fail('An unshared account must not access project files.');
            } catch (ApiException $exception) {
                $this->assertSame('project_not_found', $exception->getErrorCode());
            }
            $files->delete($project['project_id'], $uploaded['file_id'], 4);
            $this->assertFileDoesNotExist($download['path']);
        } finally {
            @unlink($uploadPath);
            if (is_dir($storage)) @rmdir($storage);
        }
    }

    public function testExpiredBookingPaymentAttemptCommitsExpirationAndSandboxRefund(): void
    {
        $pdo = Db::getConnection();
        $suffix = bin2hex(random_bytes(6));
        $bookingId = $this->createFutureBooking($pdo, 'expired-' . $suffix);
        $inventory = new ConsumableService($pdo);
        $item = $inventory->create(2, 1, ['name' => 'Expiration reserve ' . $suffix, 'unit' => 'piece']);
        $inventory->move(2, $item['item_id'], ['movement_type' => 'receipt', 'quantity_delta' => '2', 'idempotency_key' => 'expired-stock-' . $suffix]);
        $reservation = $inventory->reserve(2, $item['item_id'], [
            'booking_id' => $bookingId, 'quantity' => '1', 'idempotency_key' => 'expired-reservation-' . $suffix,
        ]);
        (new BookingRepository($pdo))->insertPayment([
            'booking_id' => $bookingId, 'payment_type' => 'deposit', 'payment_method' => 'sandbox_qr',
            'amount' => 25000, 'status' => 'success', 'transaction_code' => 'EXP-' . $suffix,
        ], $pdo);
        $expire = $pdo->prepare("UPDATE bookings SET status = 'pending', expires_at = '2000-01-01 00:00:00' WHERE booking_id = ?");
        $expire->execute([$bookingId]);

        try {
            (new PaymentService(null, null, $pdo))->processSandboxPayment($bookingId, ['payment_type' => 'full'], ['user_id' => 4, 'role' => 'customer']);
            $this->fail('An expired booking must reject a payment attempt.');
        } catch (ApiException $exception) {
            $this->assertSame('booking_expired', $exception->getErrorCode());
        }
        $status = $pdo->prepare('SELECT status FROM bookings WHERE booking_id = ?');
        $status->execute([$bookingId]);
        $this->assertSame('expired', $status->fetchColumn());
        $refund = $pdo->prepare('SELECT amount FROM booking_refunds WHERE booking_id = ?');
        $refund->execute([$bookingId]);
        $this->assertSame('25000.00', $refund->fetchColumn());
        $reservationStatus = $pdo->prepare('SELECT status FROM inventory_reservations WHERE reservation_id = ?');
        $reservationStatus->execute([$reservation['reservation_id']]);
        $this->assertSame('released', $reservationStatus->fetchColumn());
    }

    public function testLogoutRevokesJwtAndPublicEndpointsEnforceRateLimits(): void
    {
        $pdo = Db::getConnection();
        $jwt = new JwtService('integration-auth-hardening-secret-32-chars', 'HS256', 3600);
        $revocations = new TokenRevocationRepository($pdo);
        $token = $jwt->generate(4, ['role' => 'customer']);
        $claims = $jwt->verify($token);
        $middleware = new AuthMiddleware($jwt, $revocations);
        $request = new Request('GET', '/api/auth/profile', [], null, ['authorization' => 'Bearer ' . $token]);
        $user = $middleware->handle($request, static fn(Request $nextRequest): ?array => $nextRequest->user());
        $this->assertSame(4, (int) $user['user_id']);

        (new AuthService(null, $jwt, $revocations))->logout($claims);
        try {
            $middleware->handle($request, static fn(): string => 'should not run');
            $this->fail('A logged-out JWT must be rejected immediately.');
        } catch (ApiException $exception) {
            $this->assertSame('token_revoked', $exception->getErrors()[0]['code']);
            $this->assertSame(401, $exception->getStatusCode());
        }

        $rateLimits = new RateLimitService($pdo);
        $ip = 'test-' . bin2hex(random_bytes(8));
        $first = $rateLimits->consume('availability', $ip, 2, 60);
        $second = $rateLimits->consume('availability', $ip, 2, 60);
        $third = $rateLimits->consume('availability', $ip, 2, 60);
        $this->assertTrue($first['allowed']);
        $this->assertTrue($second['allowed']);
        $this->assertFalse($third['allowed']);
        $this->assertSame(0, $third['remaining']);
    }

    private function createFutureBooking(PDO $pdo, string $suffix): int
    {
        $customer = $pdo->query('SELECT full_name, phone, email FROM users WHERE user_id = 4')->fetch(PDO::FETCH_ASSOC);
        $rate = $pdo->query("SELECT rate_id, rate_unit, unit_minutes, unit_price FROM room_rates WHERE room_id = 1 AND status = 'active' ORDER BY rate_id LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        self::assertIsArray($rate);
        $start = (new \DateTimeImmutable('+30 days'))->setTime(10, 0);
        $latest = $pdo->query("SELECT MAX(start_time) FROM bookings WHERE room_id = 1 AND status IN ('pending','confirmed','checked_in')")->fetchColumn();
        if (is_string($latest) && strtotime($latest) >= $start->getTimestamp()) {
            $start = (new \DateTimeImmutable($latest))->modify('+1 day')->setTime(10, 0);
        }
        $end = $start->modify('+1 hour');
        $amount = (float) $rate['unit_price'];
        $stmt = $pdo->prepare("INSERT INTO bookings (booking_code, room_id, customer_id, rate_id, booking_type, start_time, end_time, busy_start, busy_end, party_size, rate_unit, rental_units, room_unit_price, room_amount, equipment_amount, total_amount, deposit_amount, customer_name, customer_phone, customer_email, status, expires_at) VALUES (?, 1, 4, ?, 'short_term', ?, ?, ?, ?, 1, ?, 1, ?, ?, 0, ?, 0, ?, ?, ?, 'confirmed', NULL)");
        $stmt->execute([
            'RSV-' . strtoupper(bin2hex(random_bytes(8))), (int) $rate['rate_id'], $start->format('Y-m-d H:i:s'),
            $end->format('Y-m-d H:i:s'), $start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s'),
            $rate['rate_unit'], $amount, $amount, $amount, $customer['full_name'], $customer['phone'] ?? '', $customer['email'],
        ]);
        return (int) $pdo->lastInsertId();
    }
}
