<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

$rootDir = dirname(__DIR__);
require_once $rootDir . '/vendor/autoload.php';

if (file_exists($rootDir . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable($rootDir);
    $dotenv->safeLoad();
}

use App\Core\Db;
use App\Modules\Booking\BookingRepository;
use App\Modules\Booking\BookingService;

$pdo = Db::getConnection();
$repo = new BookingRepository($pdo);
$service = new BookingService(null, $repo, $pdo);

$batchSize = 200;
$totalExpired = 0;
$startTime = microtime(true);

echo "[" . date('Y-m-d H:i:s') . "] Starting expire-bookings cron run...\n";

while (true) {
    $dueIds = $repo->findDueExpiredBookingIds($batchSize, $pdo);
    if (empty($dueIds)) {
        break;
    }

    foreach ($dueIds as $bookingId) {
        try {
            $expired = $service->expireIfDue($bookingId, $pdo);
            if ($expired) {
                $totalExpired++;
                echo "  - Expired booking ID: {$bookingId}\n";
            }
        } catch (Throwable $e) {
            echo "  ! Error expiring booking ID {$bookingId}: " . $e->getMessage() . "\n";
        }
    }
}

$elapsed = round(microtime(true) - $startTime, 3);
echo "[" . date('Y-m-d H:i:s') . "] Completed cron run. Total expired: {$totalExpired} in {$elapsed}s.\n";
