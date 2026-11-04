<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

/**
 * Phase 6 Integration Test Suite
 * Covers check-availability, booking creation, pricing, buffering, stock peak usage,
 * and scenarios T3, T4, T10, T11, T14, T18, T23, T25, T27.
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

echo "=== STARTING PHASE 6 INTEGRATION TESTS ===\n\n";

// 1. Log in users
$resCustLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => 'customer@studio.local',
    'password' => 'password123',
]);
$customerToken = $resCustLogin['data']['data']['token'] ?? null;
assertTest($resCustLogin['code'] === 200 && $customerToken !== null, "Customer logged in successfully");

$resHostLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => 'host1@studio.local',
    'password' => 'password123',
]);
$hostToken = $resHostLogin['data']['data']['token'] ?? null;
assertTest($resHostLogin['code'] === 200 && $hostToken !== null, "Host logged in successfully");

// --- 2. Auth & Role enforcement ---
echo "\n--- 2. Auth & Role Enforcement ---\n";
// Unauthenticated POST /api/bookings -> 401
$resUnauth = makeRequest('POST', '/api/bookings', ['room_id' => 1]);
assertTest($resUnauth['code'] === 401, "Unauthenticated POST /api/bookings returned 401");

// Host calling POST /api/bookings -> 403 (customer only)
$resHostBooking = makeRequest('POST', '/api/bookings', ['room_id' => 1], $hostToken);
assertTest($resHostBooking['code'] === 403, "Host calling POST /api/bookings returned 403");

// Public check-availability without auth -> 200
$resPublicCheck = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-20 09:00:00',
    'end_time'   => '2026-11-20 12:00:00',
]);
assertTest($resPublicCheck['code'] === 200, "POST /api/bookings/check-availability works publicly without auth (HTTP 200)");
$availabilityCountBefore = (int) \App\Core\Db::getConnection()->query('SELECT COUNT(*) FROM bookings')->fetchColumn();
$resPublicCheckAgain = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id' => 1,
    'rate_id' => 1,
    'start_time' => '2026-11-22 09:00:00',
    'end_time' => '2026-11-22 11:00:00',
]);
$availabilityCountAfter = (int) \App\Core\Db::getConnection()->query('SELECT COUNT(*) FROM bookings')->fetchColumn();
assertTest(
    $resPublicCheckAgain['code'] === 200 && $availabilityCountAfter === $availabilityCountBefore,
    'T23: availability evaluation succeeds without adding a booking row'
);

// --- 3. T23: check-availability does not modify DB & enforces party_size ---
echo "\n--- 3. T23: check-availability ---\n";
// Over capacity party_size -> 400
$resOverCapacity = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-20 09:00:00',
    'end_time'   => '2026-11-20 12:00:00',
    'party_size' => 9999,
]);
assertTest($resOverCapacity['code'] === 400, "check-availability with party_size > capacity returned 400");
assertTest(($resOverCapacity['data']['errors'][0]['code'] ?? '') === 'capacity_exceeded', "Error code is capacity_exceeded");

// Invalid times
$resPastTime = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2020-01-01 09:00:00',
    'end_time'   => '2020-01-01 12:00:00',
]);
assertTest($resPastTime['code'] === 400, "start_time in past returned 400");

$resReversedTime = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-20 12:00:00',
    'end_time'   => '2026-11-20 09:00:00',
]);
assertTest($resReversedTime['code'] === 400, "end_time before start_time returned 400");

// --- 4. T10 & T11: Cross studio equipment & Invalid rate ---
echo "\n--- 4. T10 & T11: Cross studio equipment & Invalid rate ---\n";
// T10: Room 1 (Studio 1) + Equipment 5 (Studio 2) -> 400 invalid_equipment
$resCrossStudioEq = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-21 09:00:00',
    'end_time'   => '2026-11-21 11:00:00',
    'equipments' => [['equipment_id' => 5, 'quantity' => 1]],
], $customerToken);
assertTest($resCrossStudioEq['code'] === 400, "T10: Equipment from different studio returned 400");

// T11: Room 1 + Rate 9 (belongs to Room 4) -> 400 invalid_rate
$resWrongRate = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 9,
    'start_time' => '2026-11-21 09:00:00',
    'end_time'   => '2026-11-21 11:00:00',
], $customerToken);
assertTest($resWrongRate['code'] === 400, "T11: rate_id from different room returned 400");

// --- 5. Booking Creation, Codes, and T25 ---
echo "\n--- 5. Booking Creation & T25 ---\n";
$resCreateBooking = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1, // 350k/hr
    'start_time' => '2026-11-01 09:00:00',
    'end_time'   => '2026-11-01 12:00:00', // 3 hours
    'party_size' => 5,
    'equipments' => [
        ['equipment_id' => 2, 'quantity' => 2], // 80k/session * 2 = 160k
    ],
], $customerToken);

assertTest($resCreateBooking['code'] === 201, "Customer created booking successfully (HTTP 201)");
$bData = $resCreateBooking['data']['data'] ?? [];
$bookingCode = $bData['booking_code'] ?? '';
assertTest(str_starts_with($bookingCode, 'BK-20261101-'), "Booking code format is BK-20261101-NNNN: {$bookingCode}");
assertTest(!str_contains($bookingCode, 'TMP-'), "No TMP- prefix remains in final booking code");
assertTest($bData['status'] === 'pending', "Booking status is 'pending'");
assertTest(!empty($bData['expires_at']), "T25: pending booking has expires_at set ({$bData['expires_at']})");
assertTest($bData['total_amount'] === 1210000, "Total amount is 350k*3 + 160k = 1,210,000 VND");
assertTest($bData['deposit_amount'] === 363000, "Deposit amount (30%) is 363,000 VND");

// T25: a pending hold whose expires_at has passed no longer blocks availability.
$expireHold = \App\Core\Db::getConnection()->prepare(
    "UPDATE bookings SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE booking_id = ?"
);
$resStaleHold = makeRequest('POST', '/api/bookings', [
    'room_id' => 1,
    'rate_id' => 1,
    'start_time' => '2026-11-03 09:00:00',
    'end_time' => '2026-11-03 12:00:00',
], $customerToken);
$staleBookingId = (int) ($resStaleHold['data']['data']['booking_id'] ?? 0);
$expireHold->execute([$staleBookingId]);
$resExpiredHoldAvailability = makeRequest('POST', '/api/bookings/check-availability', [
    'room_id' => 1,
    'rate_id' => 1,
    'start_time' => '2026-11-03 09:00:00',
    'end_time' => '2026-11-03 12:00:00',
]);
assertTest(
    $resStaleHold['code'] === 201 && $resExpiredHoldAvailability['code'] === 200,
    'T25: pending booking past expires_at no longer blocks check-availability'
);

// --- 6. T3 & T4: Schedule Overlap & Buffer (Section 5.1) ---
echo "\n--- 6. T3 & T4: Buffer & Overlap Rules ---\n";
// Booking A occupies Room 1: 09:00 to 12:00 (busy until 12:30 due to 30m buffer)

// T3a: Booking at 12:15 to 14:00 (busy_start 12:15 < busy_end 12:30) -> 409 room_occupied
$resOverlap1215 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-01 12:15:00',
    'end_time'   => '2026-11-01 14:00:00',
], $customerToken);
assertTest($resOverlap1215['code'] === 409, "T3a: Booking starting at 12:15 rejected with 409 room_occupied");
assertTest(($resOverlap1215['data']['errors'][0]['code'] ?? '') === 'room_occupied', "Error code is room_occupied");

// T3b: Booking at 12:30 to 14:30 (busy_start 12:30 >= busy_end 12:30) -> 201 Created
$resAdjacent1230 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-01 12:30:00',
    'end_time'   => '2026-11-01 14:30:00',
], $customerToken);
assertTest($resAdjacent1230['code'] === 201, "T3b: Booking starting at 12:30 accepted with 201 Created");

// T4: Booking from 06:30 to 08:30 (busy_end = 08:30 + 30m = 09:00, exactly adjacent to 09:00) -> 201 Created
$resBefore0830 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-01 06:30:00',
    'end_time'   => '2026-11-01 08:30:00',
], $customerToken);
assertTest($resBefore0830['code'] === 201, "T4: Booking ending at 08:30 before 09:00 accepted with 201 Created");

// --- 7. T14: Stock Peak Usage Scenarios ---
echo "\n--- 7. T14: Stock Peak Usage Scenarios ---\n";
// Equipment 1 in Studio 1 has total_quantity = 4.
// Step 1: Booking A in Room 1: 2026-11-05 09:00 to 10:00 (qty = 2) -> 201
$resStockA = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-05 09:00:00',
    'end_time'   => '2026-11-05 10:00:00',
    'equipments' => [['equipment_id' => 1, 'quantity' => 2]],
], $customerToken);
assertTest($resStockA['code'] === 201, "T14: Booking A in Room 1 (09:00-10:00, 2 lamps) created");

// Step 2: Booking B in Room 1: 2026-11-05 11:00 to 12:00 (qty = 2) -> 201
$resStockB = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 1,
    'start_time' => '2026-11-05 11:00:00',
    'end_time'   => '2026-11-05 12:00:00',
    'equipments' => [['equipment_id' => 1, 'quantity' => 2]],
], $customerToken);
assertTest($resStockB['code'] === 201, "T14: Booking B in Room 1 (11:00-12:00, 2 lamps) created");

// Step 3: New booking in Room 2 (same studio): 2026-11-05 09:30 to 11:30 requesting 2 lamps
// Peak simultaneous usage in [09:30, 12:00) is 2. 2 + 2 = 4 <= 4 -> accepted!
$resStockNew2 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 2,
    'rate_id'    => 6,
    'start_time' => '2026-11-05 09:30:00',
    'end_time'   => '2026-11-05 11:30:00',
    'equipments' => [['equipment_id' => 1, 'quantity' => 2]],
], $customerToken);
assertTest($resStockNew2['code'] === 201, "T14: New booking in Room 2 requesting 2 lamps (peak 2 + 2 <= 4) accepted with 201");

// Step 4: Variant: Another booking in Room 2 requesting 3 lamps
// Peak 2 + 3 = 5 > 4 -> rejected with 409 equipment_insufficient
$resStockNew3 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 2,
    'rate_id'    => 6,
    'start_time' => '2026-11-05 11:30:00',
    'end_time'   => '2026-11-05 12:30:00',
    'equipments' => [['equipment_id' => 1, 'quantity' => 3]],
], $customerToken);
assertTest($resStockNew3['code'] === 409, "T14 Variant: Over peak capacity rejected with 409 equipment_insufficient");

// --- 8. T18: Long Term Booking Calculation ---
echo "\n--- 8. T18: Long Term Booking Calculation ---\n";
// Room 1, Rate 4 (month, 45,000,000 VND), Equipment 1 (hour, 50,000 VND/hr)
// Duration 45 days: 2026-11-10 09:00:00 to 2026-12-25 09:00:00 (1080 hours = 64800 mins)
$resT18 = makeRequest('POST', '/api/bookings', [
    'room_id'    => 1,
    'rate_id'    => 4,
    'start_time' => '2026-11-10 09:00:00',
    'end_time'   => '2026-12-25 09:00:00',
    'equipments' => [['equipment_id' => 1, 'quantity' => 1]],
], $customerToken);

assertTest($resT18['code'] === 201, "T18: Long term booking created with 201");
$t18Data = $resT18['data']['data'] ?? [];
assertTest($t18Data['booking_type'] === 'long_term', "T18: booking_type is 'long_term'");
assertTest((float)$t18Data['rental_units'] === 2.0, "T18: rental_units is ceil(45/30) = 2.0");
assertTest($t18Data['room_amount'] === 90000000, "T18: room_amount is 2 * 45,000,000 = 90,000,000 VND");
assertTest($t18Data['equipment_amount'] === 54000000, "T18: equipment_amount is 1 * 50k * 1080hr = 54,000,000 VND");
assertTest($t18Data['total_amount'] === 144000000, "T18: total_amount is 144,000,000 VND");
assertTest($t18Data['deposit_amount'] === 43200000, "T18: deposit_amount is 43,200,000 VND");

// --- 9. T27: Rate Validity Locked at DATE(start_time) ---
echo "\n--- 9. T27: Rate Validity at DATE(start_time) ---\n";
// Host 1 creates a promotional rate on Room 2 with effective_to = 2026-11-20
$resCreatePromo = makeRequest('POST', '/api/rooms/2/rates', [
    'rate_unit'      => 'hour',
    'unit_price'     => 250000,
    'minimum_units'  => 1,
    'effective_from' => '2026-11-01',
    'effective_to'   => '2026-11-20',
], $hostToken);
assertTest($resCreatePromo['code'] === 201, "Host created promotional rate effective until 2026-11-20");
$promoRateId = $resCreatePromo['data']['data']['rate_id'] ?? null;

// Booking starting 2026-11-19 ending 2026-11-25 (start date is within effective period) -> 201
$resPromoValid = makeRequest('POST', '/api/bookings', [
    'room_id'    => 2,
    'rate_id'    => $promoRateId,
    'start_time' => '2026-11-19 09:00:00',
    'end_time'   => '2026-11-19 12:00:00',
], $customerToken);
assertTest($resPromoValid['code'] === 201, "T27: Booking starting on 2026-11-19 accepted with 201");
$promoBookingId = (int) ($resPromoValid['data']['data']['booking_id'] ?? 0);
$promoSnapshot = $resPromoValid['data']['data'] ?? [];

$resPromoUpdate = makeRequest('PATCH', "/api/rooms/2/rates/{$promoRateId}", [
    'unit_price' => 300000,
    'status' => 'inactive',
], $hostToken);
$resPromoBookingDetail = makeRequest('GET', "/api/bookings/{$promoBookingId}", null, $customerToken);
$promoDetail = $resPromoBookingDetail['data']['data'] ?? [];
assertTest($resPromoUpdate['code'] === 200, "T27: Host changed and deactivated the rate after booking");
assertTest(
    $resPromoBookingDetail['code'] === 200
        && (int) $promoDetail['room_unit_price'] === (int) $promoSnapshot['room_unit_price']
        && (int) $promoDetail['total_amount'] === (int) $promoSnapshot['total_amount'],
    'T27: Existing booking retains its original rate and total amount snapshot'
);

// Booking starting 2026-11-21 (after effective_to 2026-11-20) -> 400 rate_expired
$resPromoExpired = makeRequest('POST', '/api/bookings', [
    'room_id'    => 2,
    'rate_id'    => $promoRateId,
    'start_time' => '2026-11-21 09:00:00',
    'end_time'   => '2026-11-21 12:00:00',
], $customerToken);
assertTest($resPromoExpired['code'] === 400, "T27: Booking starting on 2026-11-21 rejected with 400 (rate expired)");

echo "\n============================================\n";
echo "PHASE 6 TEST SUMMARY: {$passed} / " . ($passed + $failed) . " tests passed.\n";
if ($failed === 0) {
    echo ">>> PHASE 6 FUNCTIONAL TESTS PASSED 100% <<<\n";
    exit(0);
} else {
    echo ">>> PHASE 6 TESTS FAILED WITH {$failed} FAILURES <<<\n";
    exit(1);
}
