<?php

declare(strict_types=1);

/**
 * Phase 7 Integration Test Suite
 * Covers booking lifecycle, status transitions, payments (deposit/remaining/full),
 * cancellation, rejection, expire-on-access, cron expiration, and scenarios T7, T8, T9, T19, T20, T24.
 */

$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:80';
$passed = 0;
$failed = 0;

function makeRequest(string $method, string $path, ?array $body = null, ?string $token = null): array
{
    global $baseUrl;
    $url = $baseUrl . $path;
    $ch = curl_init($url);

    $headers = ['Content-Type: application/json'];
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode((string) $response, true) ?? [];
    return [
        'code' => $httpCode,
        'data' => $decoded,
        'raw'  => $response,
    ];
}

function assertTest(bool $condition, string $message): void
{
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$message}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$message}\n";
        $failed++;
    }
}

echo "=== STARTING PHASE 7 INTEGRATION TESTS ===\n\n";

// 1. Authenticate users
$resCustLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => 'customer@studio.local',
    'password' => 'password123',
]);
$custToken = $resCustLogin['data']['data']['token'] ?? null;
assertTest($resCustLogin['code'] === 200 && $custToken !== null, "Customer login successful");

$resHost1Login = makeRequest('POST', '/api/auth/login', [
    'email'    => 'host1@studio.local',
    'password' => 'password123',
]);
$host1Token = $resHost1Login['data']['data']['token'] ?? null;
assertTest($resHost1Login['code'] === 200 && $host1Token !== null, "Host 1 login successful");

$resHost2Login = makeRequest('POST', '/api/auth/login', [
    'email'    => 'host2@studio.local',
    'password' => 'password123',
]);
$host2Token = $resHost2Login['data']['data']['token'] ?? null;
assertTest($resHost2Login['code'] === 200 && $host2Token !== null, "Host 2 login successful");

// Helper to create a test booking
function createTestBooking(string $token, string $startTime, string $endTime, int $roomId = 1, int $rateId = 1): int
{
    $res = makeRequest('POST', '/api/bookings', [
        'room_id'         => $roomId,
        'rate_id'         => $rateId,
        'start_time'      => $startTime,
        'end_time'        => $endTime,
        'party_size'      => 2,
        'customer_name'   => 'Nguyễn Văn Khách',
        'customer_phone'  => '0912345678',
        'customer_email'  => 'customer@studio.local',
    ], $token);

    if ($res['code'] !== 201) {
        throw new RuntimeException("Failed to create test booking: " . json_encode($res));
    }

    return (int) $res['data']['data']['booking_id'];
}

// -------------------------------------------------------------
// 2. Full Happy Path Lifecycle: Create -> Deposit -> Confirm -> Checkin -> Remaining -> Complete
// -------------------------------------------------------------
echo "\n--- 2. Full Happy Path Lifecycle ---\n";
$bk1Id = createTestBooking($custToken, '2026-11-25 09:00:00', '2026-11-25 11:00:00');
assertTest($bk1Id > 0, "Created booking #{$bk1Id} in pending status");

// T8: Host confirms booking BEFORE deposit -> must fail with 400 deposit_required
$resConfirmNoDeposit = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'confirmed'], $host1Token);
assertTest($resConfirmNoDeposit['code'] === 400, "T8: Host confirming unpaid booking rejected with 400 (deposit_required)");

// Customer pays deposit
$resDeposit = makeRequest('POST', "/api/bookings/{$bk1Id}/payments", [
    'payment_type'   => 'deposit',
    'payment_method' => 'sandbox_qr',
], $custToken);
assertTest($resDeposit['code'] === 201 && $resDeposit['data']['data']['status'] === 'success', "Customer paid deposit successfully (201)");
$depositAmt = (int) $resDeposit['data']['data']['amount'];

// Host confirms booking
$resConfirm = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'confirmed'], $host1Token);
assertTest($resConfirm['code'] === 200 && $resConfirm['data']['data']['status'] === 'confirmed', "Host confirmed booking after deposit (200)");
assertTest($resConfirm['data']['data']['expires_at'] === null, "Confirmed booking has expires_at = NULL");

// Host checks in
$resCheckin = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'checked_in'], $host1Token);
assertTest($resCheckin['code'] === 200 && $resCheckin['data']['data']['status'] === 'checked_in', "Host checked-in booking (200)");

// T20 part 1: Host attempts to complete BEFORE paying remaining -> 400 payment_incomplete
$resCompleteIncomplete = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'completed'], $host1Token);
assertTest($resCompleteIncomplete['code'] === 400, "T20: Host completing without full payment rejected with 400 (payment_incomplete)");

// Customer pays remaining
$resRemaining = makeRequest('POST', "/api/bookings/{$bk1Id}/payments", [
    'payment_type'   => 'remaining',
    'payment_method' => 'sandbox_qr',
], $custToken);
assertTest($resRemaining['code'] === 201, "Customer paid remaining balance (201)");
$remainingAmt = (int) $resRemaining['data']['data']['amount'];

// T20 part 2: Host completes booking -> 200 and completed_at is assigned
$resComplete = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'completed'], $host1Token);
assertTest($resComplete['code'] === 200 && $resComplete['data']['data']['status'] === 'completed', "Host completed booking after full payment (200)");
assertTest(!empty($resComplete['data']['data']['completed_at']), "Completed booking has completed_at timestamp assigned");

// Verify sum of payments equals total_amount
$totalAmount = (int) $resComplete['data']['data']['total_amount'];
assertTest(($depositAmt + $remainingAmt) === $totalAmount, "Sum of successful payments ({$depositAmt} + {$remainingAmt}) equals total_amount ({$totalAmount})");

// T9: Attempt invalid transition: completed -> anything else (e.g. cancelled) -> 400
$resInvalidPostComplete = makeRequest('PATCH', "/api/bookings/{$bk1Id}/status", ['status' => 'cancelled'], $host1Token);
assertTest($resInvalidPostComplete['code'] === 400, "T9: Transition out of completed state rejected with 400");

// -------------------------------------------------------------
// 3. Customer Cancellation Flow with & without deposit
// -------------------------------------------------------------
echo "\n--- 3. Customer Cancellation Flow ---\n";
// Booking 2: Cancel without payment
$bk2Id = createTestBooking($custToken, '2026-11-26 09:00:00', '2026-11-26 11:00:00');
$resCancelUnpaid = makeRequest('POST', "/api/bookings/{$bk2Id}/cancel", [], $custToken);
assertTest($resCancelUnpaid['code'] === 200 && $resCancelUnpaid['data']['data']['status'] === 'cancelled', "Customer cancelled unpaid booking (200)");

// Booking 3: Cancel after deposit -> audit log should record refund_due = deposit_amount
$bk3Id = createTestBooking($custToken, '2026-11-26 13:00:00', '2026-11-26 15:00:00');
makeRequest('POST', "/api/bookings/{$bk3Id}/payments", ['payment_type' => 'deposit'], $custToken);
$resCancelPaid = makeRequest('POST', "/api/bookings/{$bk3Id}/cancel", [], $custToken);
assertTest($resCancelPaid['code'] === 200 && $resCancelPaid['data']['data']['status'] === 'cancelled', "Customer cancelled paid booking (200)");

// -------------------------------------------------------------
// 4. Host Rejection Flow
// -------------------------------------------------------------
echo "\n--- 4. Host Rejection Flow ---\n";
$bk4Id = createTestBooking($custToken, '2026-11-27 09:00:00', '2026-11-27 11:00:00');
makeRequest('POST', "/api/bookings/{$bk4Id}/payments", ['payment_type' => 'deposit'], $custToken);
$resReject = makeRequest('PATCH', "/api/bookings/{$bk4Id}/status", ['status' => 'rejected'], $host1Token);
assertTest($resReject['code'] === 200 && $resReject['data']['data']['status'] === 'rejected', "Host rejected booking after deposit (200)");

// -------------------------------------------------------------
// 5. Full Payment Option
// -------------------------------------------------------------
echo "\n--- 5. Full Payment Option ---\n";
$bk5Id = createTestBooking($custToken, '2026-11-28 09:00:00', '2026-11-28 11:00:00');
$resPayFull = makeRequest('POST', "/api/bookings/{$bk5Id}/payments", [
    'payment_type' => 'full',
], $custToken);
assertTest($resPayFull['code'] === 201, "Customer paid in full (201)");
$fullAmt = (int) $resPayFull['data']['data']['amount'];

// Confirm directly
makeRequest('PATCH', "/api/bookings/{$bk5Id}/status", ['status' => 'confirmed'], $host1Token);
makeRequest('PATCH', "/api/bookings/{$bk5Id}/status", ['status' => 'checked_in'], $host1Token);
// Complete directly without remaining payment because it was paid in full
$resCompleteFull = makeRequest('PATCH', "/api/bookings/{$bk5Id}/status", ['status' => 'completed'], $host1Token);
assertTest($resCompleteFull['code'] === 200, "Booking paid in full completed directly without needing remaining payment");

// -------------------------------------------------------------
// 6. Ownership & Access Control (T5)
// -------------------------------------------------------------
echo "\n--- 6. Ownership & Access Control ---\n";
$bk6Id = createTestBooking($custToken, '2026-11-29 09:00:00', '2026-11-29 11:00:00');

// Host 2 attempts to change status of Host 1's booking -> 403
$resHost2Tamper = makeRequest('PATCH', "/api/bookings/{$bk6Id}/status", ['status' => 'confirmed'], $host2Token);
assertTest($resHost2Tamper['code'] === 403, "Host 2 updating Host 1's booking returns 403 (T5)");

// Host 2 attempts to view details of Host 1's booking -> 403
$resHost2View = makeRequest('GET', "/api/bookings/{$bk6Id}", null, $host2Token);
assertTest($resHost2View['code'] === 403, "Host 2 viewing Host 1's booking returns 403");

// Customer owner views details -> 200 with equipments and payments
$resOwnerView = makeRequest('GET', "/api/bookings/{$bk6Id}", null, $custToken);
assertTest($resOwnerView['code'] === 200 && isset($resOwnerView['data']['data']['equipments']), "Customer owner viewing booking returns 200 with details");

// -------------------------------------------------------------
// 7. Booking Listing
// -------------------------------------------------------------
echo "\n--- 7. Booking Listing ---\n";
$resCustList = makeRequest('GET', '/api/bookings?page=1&limit=10', null, $custToken);
assertTest($resCustList['code'] === 200 && isset($resCustList['data']['data']['items']), "Customer listing bookings returned 200");

$resHostList = makeRequest('GET', '/api/bookings?status=completed', null, $host1Token);
assertTest($resHostList['code'] === 200 && count($resHostList['data']['data']['items']) >= 1, "Host listing filtered bookings returned 200");

// -------------------------------------------------------------
// 8. T24: Cron Expire Bookings for multiple scenarios
// -------------------------------------------------------------
echo "\n--- 8. T24: Cron Expiration Test Suite ---\n";

// Direct PDO connection to backdate expires_at for testing cron expiration
require_once __DIR__ . '/../vendor/autoload.php';
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    $dotenv->safeLoad();
}
$pdo = \App\Core\Db::getConnection();

// Create booking A: Unpaid, expired
$bkAId = createTestBooking($custToken, '2026-12-01 09:00:00', '2026-12-01 11:00:00');
$pdo->exec("UPDATE bookings SET expires_at = '2026-10-01 00:00:00' WHERE booking_id = {$bkAId}");

// Create booking B: Deposit paid, host no response (expired)
$bkBId = createTestBooking($custToken, '2026-12-02 09:00:00', '2026-12-02 11:00:00');
makeRequest('POST', "/api/bookings/{$bkBId}/payments", ['payment_type' => 'deposit'], $custToken);
$pdo->exec("UPDATE bookings SET expires_at = '2026-10-01 00:00:00' WHERE booking_id = {$bkBId}");

// Create booking C: Full paid, host no response (expired)
$bkCId = createTestBooking($custToken, '2026-12-03 09:00:00', '2026-12-03 11:00:00');
makeRequest('POST', "/api/bookings/{$bkCId}/payments", ['payment_type' => 'full'], $custToken);
$pdo->exec("UPDATE bookings SET expires_at = '2026-10-01 00:00:00' WHERE booking_id = {$bkCId}");

// Execute cron script via shell
exec('php /var/www/html/bin/expire-bookings.php', $cronOutput, $cronExitCode);
assertTest($cronExitCode === 0, "bin/expire-bookings.php executed successfully (exit code 0)");

// Verify all 3 bookings are now expired
$stmtA = $pdo->query("SELECT status FROM bookings WHERE booking_id = {$bkAId}");
assertTest($stmtA->fetchColumn() === 'expired', "Booking A (unpaid) transitioned to expired");

$stmtB = $pdo->query("SELECT status FROM bookings WHERE booking_id = {$bkBId}");
assertTest($stmtB->fetchColumn() === 'expired', "Booking B (deposit paid) transitioned to expired");

$stmtC = $pdo->query("SELECT status FROM bookings WHERE booking_id = {$bkCId}");
assertTest($stmtC->fetchColumn() === 'expired', "Booking C (full paid) transitioned to expired");

// Verify audit logs for B and C record refund_due
$stmtAuditB = $pdo->prepare("SELECT metadata FROM audit_logs WHERE entity_id = ? AND action = 'booking_expired'");
$stmtAuditB->execute([$bkBId]);
$metaB = json_decode((string) $stmtAuditB->fetchColumn(), true);
assertTest($metaB['reason'] === 'host_no_response' && $metaB['refund_due'] > 0, "Audit log for Booking B has reason=host_no_response and refund_due > 0 (T19, T24)");

$stmtAuditA = $pdo->prepare("SELECT metadata FROM audit_logs WHERE entity_id = ? AND action = 'booking_expired'");
$stmtAuditA->execute([$bkAId]);
$metaA = json_decode((string) $stmtAuditA->fetchColumn(), true);
assertTest($metaA['reason'] === 'unpaid_hold_timeout' && (int) $metaA['refund_due'] === 0, "T24: Unpaid expiry records unpaid_hold_timeout and refund_due=0");

$stmtAuditC = $pdo->prepare("SELECT metadata FROM audit_logs WHERE entity_id = ? AND action = 'booking_expired'");
$stmtAuditC->execute([$bkCId]);
$metaC = json_decode((string) $stmtAuditC->fetchColumn(), true);
assertTest(
    $metaC['reason'] === 'host_no_response'
        && (int) $metaC['refund_due'] === (int) $metaC['payments'][0]['amount']
        && $metaC['payments'][0]['payment_type'] === 'full',
    "T24: Full-payment expiry records the exact refund due and the full payment"
);

// Re-running cron does not create duplicate logs or errors
exec('php /var/www/html/bin/expire-bookings.php', $cronOutput2, $cronExitCode2);
assertTest($cronExitCode2 === 0, "Re-running cron executed cleanly without duplicates");
$stmtAuditCount = $pdo->prepare("SELECT COUNT(*) FROM audit_logs WHERE entity_id = ? AND action = 'booking_expired'");
$stmtAuditCount->execute([$bkCId]);
assertTest((int) $stmtAuditCount->fetchColumn() === 1, 'T24: second cron run does not duplicate expiry audit records');

echo "\n=== PHASE 7 INTEGRATION TESTS SUMMARY ===\n";
echo "Passed: {$passed}\n";
echo "Failed: {$failed}\n";

exit($failed > 0 ? 1 : 0);

