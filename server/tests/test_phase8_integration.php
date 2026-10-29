<?php

declare(strict_types=1);

/**
 * Phase 8 Integration Test Suite
 * Covers Admin user management (list, status, role), security guards (self-lock, self-role, admin grant block),
 * immediate role enforcement on old token (T17), platform statistics, host statistics, and period rules (T20, T26).
 */

$baseUrl = 'http://localhost:80'; // Inside docker container
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

echo "=== STARTING PHASE 8 INTEGRATION TESTS ===\n\n";

// 1. Authenticate users
$resAdminLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => 'admin@studio.local',
    'password' => 'password123',
]);
$adminToken = $resAdminLogin['data']['data']['token'] ?? null;
$adminId = (int) ($resAdminLogin['data']['data']['user']['user_id'] ?? 0);
assertTest($resAdminLogin['code'] === 200 && $adminToken !== null, "Admin login successful (ID: {$adminId})");

$resHost1Login = makeRequest('POST', '/api/auth/login', [
    'email'    => 'host1@studio.local',
    'password' => 'password123',
]);
$host1Token = $resHost1Login['data']['data']['token'] ?? null;
$host1Id = (int) ($resHost1Login['data']['data']['user']['user_id'] ?? 0);
assertTest($resHost1Login['code'] === 200 && $host1Token !== null, "Host 1 login successful (ID: {$host1Id})");

$resCustLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => 'customer@studio.local',
    'password' => 'password123',
]);
$custToken = $resCustLogin['data']['data']['token'] ?? null;
$custId = (int) ($resCustLogin['data']['data']['user']['user_id'] ?? 0);
assertTest($resCustLogin['code'] === 200 && $custToken !== null, "Customer login successful (ID: {$custId})");

// -------------------------------------------------------------
// 2. Admin User Management & RBAC Protection
// -------------------------------------------------------------
echo "\n--- 2. Admin User Management & RBAC Protection ---\n";

// Customer attempts to access admin endpoints -> 403
$resCustUsers = makeRequest('GET', '/api/admin/users', null, $custToken);
assertTest($resCustUsers['code'] === 403, "Customer calling GET /api/admin/users rejected with 403");

// Host attempts to access admin endpoints -> 403
$resHostUsers = makeRequest('GET', '/api/admin/users', null, $host1Token);
assertTest($resHostUsers['code'] === 403, "Host calling GET /api/admin/users rejected with 403");

// Admin lists users -> 200
$resAdminUsers = makeRequest('GET', '/api/admin/users?page=1&limit=20', null, $adminToken);
assertTest($resAdminUsers['code'] === 200 && count($resAdminUsers['data']['data']['items']) >= 4, "Admin listing users returns 200 with all accounts");

// Filter by role = customer
$resFilterCust = makeRequest('GET', '/api/admin/users?role=customer', null, $adminToken);
assertTest($resFilterCust['code'] === 200 && $resFilterCust['data']['data']['items'][0]['role'] === 'customer', "Admin filtering users by role=customer works");

// Search by email
$resSearch = makeRequest('GET', '/api/admin/users?search=customer@studio.local', null, $adminToken);
assertTest($resSearch['code'] === 200 && count($resSearch['data']['data']['items']) === 1, "Admin searching users by email returns matching user");

// Admin attempts to self-lock -> 400 cannot_lock_self
$resSelfLock = makeRequest('PATCH', "/api/admin/users/{$adminId}/status", ['status' => 'locked'], $adminToken);
assertTest($resSelfLock['code'] === 400 && $resSelfLock['data']['code'] === 'cannot_lock_self', "Admin cannot lock their own account (400 cannot_lock_self)");

// Admin attempts to change own role -> 400 cannot_change_own_role
$resSelfRole = makeRequest('PATCH', "/api/admin/users/{$adminId}/role", ['role' => 'customer'], $adminToken);
assertTest($resSelfRole['code'] === 400 && $resSelfRole['data']['code'] === 'cannot_change_own_role', "Admin cannot change their own role (400 cannot_change_own_role)");

// Admin attempts to grant admin role to customer -> 400 invalid_role
$resGrantAdmin = makeRequest('PATCH', "/api/admin/users/{$custId}/role", ['role' => 'admin'], $adminToken);
assertTest($resGrantAdmin['code'] === 400 && $resGrantAdmin['data']['code'] === 'invalid_role', "Admin cannot grant admin role via API (400 invalid_role)");

// -------------------------------------------------------------
// 3. T17: Real-time DB Role & Status Enforcement via AuthMiddleware
// -------------------------------------------------------------
echo "\n--- 3. T17: Real-time DB Role & Status Enforcement ---\n";

// Create a disposable user for testing lock & role change
$testEmail = 'role_test_' . time() . '@studio.local';
$resReg = makeRequest('POST', '/api/auth/register', [
    'email'     => $testEmail,
    'password'  => 'password123',
    'full_name' => 'Role Test User',
]);
assertTest($resReg['code'] === 201, "Registered temporary test user");
$targetUserId = (int) $resReg['data']['data']['user_id'];

// Log in as target user to obtain token
$resTargetLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => $testEmail,
    'password' => 'password123',
]);
$targetToken = $resTargetLogin['data']['data']['token'];

// Call protected endpoint: works initially
$resTestBefore = makeRequest('GET', '/api/test/me', null, $targetToken);
assertTest($resTestBefore['code'] === 200, "Target user can access protected endpoint with valid token");

// Admin promotes target user to host
$resPromote = makeRequest('PATCH', "/api/admin/users/{$targetUserId}/role", ['role' => 'host'], $adminToken);
assertTest($resPromote['code'] === 200 && $resPromote['data']['data']['role'] === 'host', "Admin changed user role to host");

// Target user uses OLD token to access host-only endpoint: works immediately! (T17)
$resHostCheck = makeRequest('GET', '/api/test/host-only', null, $targetToken);
assertTest($resHostCheck['code'] === 200, "Old token automatically inherits new 'host' role on subsequent requests (T17)");

// Admin locks target user
$resLock = makeRequest('PATCH', "/api/admin/users/{$targetUserId}/status", ['status' => 'locked'], $adminToken);
assertTest($resLock['code'] === 200 && $resLock['data']['data']['status'] === 'locked', "Admin locked target user");

// Target user calls protected route with token: rejected with 403 account_locked! (T17)
$resLockedAccess = makeRequest('GET', '/api/test/me', null, $targetToken);
assertTest($resLockedAccess['code'] === 403 && $resLockedAccess['data']['code'] === 'account_locked', "Locked user is immediately blocked on old token with 403 account_locked (T17)");

// Target user tries to log in again: rejected with 403
$resLockedLogin = makeRequest('POST', '/api/auth/login', [
    'email'    => $testEmail,
    'password' => 'password123',
]);
assertTest($resLockedLogin['code'] === 403 && $resLockedLogin['data']['code'] === 'account_locked', "Locked user login attempt is rejected with 403");

// Admin unlocks user
makeRequest('PATCH', "/api/admin/users/{$targetUserId}/status", ['status' => 'active'], $adminToken);

// -------------------------------------------------------------
// 4. Statistics Endpoints & Period Validation (T26)
// -------------------------------------------------------------
echo "\n--- 4. Statistics Endpoints & Period Validation (T26) ---\n";

// Admin statistics without params (defaults to current month)
$resAdminStats = makeRequest('GET', '/api/admin/statistics', null, $adminToken);
assertTest($resAdminStats['code'] === 200, "Admin statistics returns 200 for default period");
assertTest(isset($resAdminStats['data']['data']['period']['from']), "Statistics response includes period.from");
assertTest(isset($resAdminStats['data']['data']['period']['to']), "Statistics response includes period.to");
assertTest(isset($resAdminStats['data']['data']['total_revenue']), "Statistics response includes total_revenue");
assertTest(isset($resAdminStats['data']['data']['occupancy_rate']), "Statistics response includes occupancy_rate");

// T26: Period validation from >= to -> 400 invalid_date_range
$resInvalidPeriod = makeRequest('GET', '/api/admin/statistics?from=2026-11-01&to=2026-10-01', null, $adminToken);
assertTest($resInvalidPeriod['code'] === 400 && $resInvalidPeriod['data']['code'] === 'invalid_date_range', "T26: Statistics with from >= to rejected with 400 (invalid_date_range)");

// Period span > 366 days -> 400 range_too_long
$resTooLong = makeRequest('GET', '/api/admin/statistics?from=2024-01-01&to=2026-01-01', null, $adminToken);
assertTest($resTooLong['code'] === 400 && $resTooLong['data']['code'] === 'range_too_long', "Statistics with span > 366 days rejected with 400 (range_too_long)");

// Customer calling GET /api/admin/statistics -> 403
$resCustStats = makeRequest('GET', '/api/admin/statistics', null, $custToken);
assertTest($resCustStats['code'] === 403, "Customer calling admin statistics returns 403");

// -------------------------------------------------------------
// 5. Host Statistics
// -------------------------------------------------------------
echo "\n--- 5. Host Statistics ---\n";

// Host 1 calls GET /api/host/statistics -> 200
$resHostStats = makeRequest('GET', '/api/host/statistics', null, $host1Token);
assertTest($resHostStats['code'] === 200, "Host 1 statistics returns 200");
$hostData = $resHostStats['data']['data'];
assertTest(isset($hostData['total_bookings']), "Host statistics has total_bookings");
assertTest(isset($hostData['total_revenue']), "Host statistics has total_revenue");
assertTest(isset($hostData['occupancy_rate']), "Host statistics has occupancy_rate");
assertTest($hostData['total_studios'] >= 1, "Host 1 has at least 1 active studio");

// Customer calling GET /api/host/statistics -> 403
$resCustHostStats = makeRequest('GET', '/api/host/statistics', null, $custToken);
assertTest($resCustHostStats['code'] === 403, "Customer calling host statistics returns 403");

echo "\n=== PHASE 8 INTEGRATION TESTS SUMMARY ===\n";
echo "Passed: {$passed}\n";
echo "Failed: {$failed}\n";

exit($failed > 0 ? 1 : 0);

