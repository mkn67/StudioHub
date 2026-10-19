<?php

declare(strict_types=1);

/**
 * Frontend E2E & Full Stack Integration Verification
 * Tests all 4 phases:
 * Phase 0: Health Check (Backend + Frontend /health page)
 * Phase 3: Auth & Account (Registration, Login, Profile, Password Change)
 * Phase 4: Public Catalog (Room search, Filters, Detail, Calendar, Equipment add-ons)
 * Frontend Server: Next.js 14 on http://localhost:3000
 */

$apiBaseUrl = getenv('API_BASE_URL') ?: 'http://localhost';
$clientBaseUrl = getenv('CLIENT_BASE_URL') ?: 'http://client:3000';

echo "=====================================================\n";
echo "Full Stack E2E Verification (Phase 0, 3, 4 + Next.js)\n";
echo "=====================================================\n";

$allPassed = true;

function testAssert(bool $cond, string $msg): void
{
    global $allPassed;
    if ($cond) {
        echo "  [PASS] $msg\n";
    } else {
        echo "  [FAIL] $msg\n";
        $allPassed = false;
    }
}

function curlReq(string $url, string $method = 'GET', ?array $body = null, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $defaultHeaders = ['Accept: application/json', 'Content-Type: application/json'];
    foreach ($headers as $k => $v) {
        $defaultHeaders[] = is_int($k) ? $v : "$k: $v";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode((string) $raw, true) ?: [];
    return ['status' => $status, 'json' => $json, 'raw' => $raw];
}

// ---------------------------------------------------------
// SECTION 1: Phase 0 - Foundation & Health Check
// ---------------------------------------------------------
echo "\n--- [PHASE 0] Health Check ---\n";
$backendHealth = curlReq("{$apiBaseUrl}/api/health");
testAssert($backendHealth['status'] === 200, "Backend /api/health returned 200");
testAssert(($backendHealth['json']['data']['server'] ?? '') === 'ok', "API server status is 'ok'");
testAssert(($backendHealth['json']['data']['database'] ?? '') === 'ok', "Database status is 'ok'");
testAssert(!empty($backendHealth['json']['data']['mysql_version']), "MySQL version detected: " . ($backendHealth['json']['data']['mysql_version'] ?? ''));

// Test Next.js /health page
$ch = curl_init("{$clientBaseUrl}/health");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$clientHealthRaw = curl_exec($ch);
$clientHealthCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
testAssert($clientHealthCode === 200, "Next.js /health rendered HTTP 200");
testAssert(str_contains((string)$clientHealthRaw, "Kiểm Tra Kết Nối"), "Health check page contains DevOps check title");

// ---------------------------------------------------------
// SECTION 2: Phase 3 - Authentication & Account
// ---------------------------------------------------------
echo "\n--- [PHASE 3] Authentication & Account ---\n";
$uniqueEmail = 'fe_user_' . time() . '@test.local';

// 1. Register new user
$regRes = curlReq("{$apiBaseUrl}/api/auth/register", 'POST', [
    'full_name' => 'Frontend Tester',
    'email'     => $uniqueEmail,
    'password'  => 'password123',
    'phone'     => '0988776655',
]);
testAssert($regRes['status'] === 201, "Registration returned 201 Created");
testAssert(($regRes['json']['data']['user']['role'] ?? '') === 'customer', "User assigned default role 'customer'");
$token = $regRes['json']['data']['token'] ?? null;
testAssert(!empty($token), "JWT token received upon registration");

// 2. Fetch Profile with Token
$profileRes = curlReq("{$apiBaseUrl}/api/auth/profile", 'GET', null, ["Authorization: Bearer {$token}"]);
testAssert($profileRes['status'] === 200, "Profile fetch returned 200");
testAssert(($profileRes['json']['data']['email'] ?? '') === $uniqueEmail, "Profile email matches registered email");

// 3. Update Profile Name & Phone
$updateRes = curlReq("{$apiBaseUrl}/api/auth/profile", 'PATCH', [
    'full_name' => 'Frontend Tester Updated',
    'phone'     => '0911223344',
], ["Authorization: Bearer {$token}"]);
testAssert($updateRes['status'] === 200, "Profile updated successfully");
testAssert(($updateRes['json']['data']['full_name'] ?? '') === 'Frontend Tester Updated', "Full name updated");

// 4. Change Password
$changePassRes = curlReq("{$apiBaseUrl}/api/auth/profile", 'PATCH', [
    'current_password' => 'password123',
    'new_password'     => 'newpassword456',
], ["Authorization: Bearer {$token}"]);
testAssert($changePassRes['status'] === 200, "Password changed successfully");

// 5. Login with New Password
$loginRes = curlReq("{$apiBaseUrl}/api/auth/login", 'POST', [
    'email'    => $uniqueEmail,
    'password' => 'newpassword456',
]);
testAssert($loginRes['status'] === 200, "Login with new password succeeded");

// ---------------------------------------------------------
// SECTION 3: Phase 4 - Public Catalog
// ---------------------------------------------------------
echo "\n--- [PHASE 4] Public Catalog ---\n";

// 1. Space Types
$stRes = curlReq("{$apiBaseUrl}/api/space-types");
testAssert($stRes['status'] === 200, "GET /api/space-types returned 200");
testAssert(count($stRes['json']['data'] ?? []) === 7, "Returned 7 space types for filter pills");

// 2. Amenities
$amRes = curlReq("{$apiBaseUrl}/api/amenities");
testAssert($amRes['status'] === 200, "GET /api/amenities returned 200");
testAssert(count($amRes['json']['data'] ?? []) === 8, "Returned 8 amenities");

// 3. Rooms Listing with filters
$roomsRes = curlReq("{$apiBaseUrl}/api/rooms");
testAssert($roomsRes['status'] === 200, "GET /api/rooms returned 200");
$items = $roomsRes['json']['data']['items'] ?? [];
testAssert(count($items) === 4, "Returned 4 active rooms (Maintenance room excluded)");
testAssert(isset($items[0]['display_rate']['unit_price']), "Room item includes display_rate");
testAssert(isset($items[0]['primary_space_type']['name']), "Room item includes primary_space_type");

// 4. Room Detail
$room1Res = curlReq("{$apiBaseUrl}/api/rooms/1");
testAssert($room1Res['status'] === 200, "GET /api/rooms/1 returned 200");
testAssert(count($room1Res['json']['data']['images'] ?? []) >= 2, "Room 1 has multiple gallery images");
testAssert(count($room1Res['json']['data']['rates'] ?? []) === 5, "Room 1 has 5 active rates");

// 5. Maintenance Room returns 404
$room3Res = curlReq("{$apiBaseUrl}/api/rooms/3");
testAssert($room3Res['status'] === 404, "GET /api/rooms/3 (maintenance) correctly returned 404");

// 6. Room Calendar
$calRes = curlReq("{$apiBaseUrl}/api/rooms/1/calendar");
testAssert($calRes['status'] === 200, "GET /api/rooms/1/calendar returned 200");
testAssert(isset($calRes['json']['data']['busy_slots']), "Calendar returns busy_slots array without PII");

// 7. Studio Equipments Add-ons
$eqRes = curlReq("{$apiBaseUrl}/api/equipments?studio_id=1");
testAssert($eqRes['status'] === 200, "GET /api/equipments?studio_id=1 returned 200");
testAssert(count($eqRes['json']['data'] ?? []) === 4, "Studio 1 has 4 active equipment add-ons");

// ---------------------------------------------------------
// SECTION 4: Next.js Frontend Pages HTTP Accessibility
// ---------------------------------------------------------
echo "\n--- [FRONTEND HTTP ROUTES] Next.js Server (Port 3000) ---\n";

$pages = [
    '/'          => 'Catalog Home Page',
    '/health'    => 'DevOps Health Check Page',
    '/login'     => 'Login Page',
    '/register'  => 'Register Page',
    '/profile'   => 'Profile Page',
    '/rooms/1'   => 'Room Detail Page (Room 1)',
    '/rooms/3'   => 'Room Detail Page (Maintenance 404 State)',
];

foreach ($pages as $path => $desc) {
    $ch = curl_init("{$clientBaseUrl}{$path}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    testAssert($httpCode === 200, "Route {$path} ({$desc}) returned HTTP {$httpCode}");
}

echo "\n=====================================================\n";
if ($allPassed) {
    echo "ALL FRONTEND & E2E INTEGRATION TESTS PASSED!\n";
} else {
    echo "SOME E2E INTEGRATION TESTS FAILED!\n";
    exit(1);
}
echo "=====================================================\n";
