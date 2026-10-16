<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Db;

$baseUrl = 'http://localhost';

echo "=====================================================\n";
echo "Phase 3 Integration Verification (Auth & Account)\n";
echo "=====================================================\n";

function apiRequest(string $method, string $path, ?array $body = null, ?string $token = null): array
{
    global $baseUrl;
    $ch = curl_init("{$baseUrl}{$path}");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
    ];
    if ($token !== null) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $status,
        'body'   => json_decode((string) $response, true),
        'raw'    => $response,
    ];
}

// 0. Ensure clean test environment: remove any leftover test users
$pdo = Db::getConnection();
$pdo->exec("DELETE FROM users WHERE email IN ('phase3_user@test.local', 'hacker_role@test.local', 'locked_login@test.local')");

// 1. Register with role="admin" -> MUST ignore role and assign "customer" (T6)
$res1 = apiRequest('POST', '/api/auth/register', [
    'full_name' => 'Nguyễn Role Hacker',
    'email'     => 'hacker_role@test.local',
    'password'  => 'password123',
    'role'      => 'admin', // Tampered role from client
]);
echo "1. Register with tampered role: Status = {$res1['status']} (Expected: 201)\n";
assert($res1['status'] === 201, 'Register must return 201');
assert($res1['body']['data']['user']['role'] === 'customer', 'User role must be customer (T6)');
echo "   -> Assigned role: '{$res1['body']['data']['user']['role']}' (Role tamper prevented!)\n";

// 2. Register with duplicate email -> MUST RETURN 409
$res2 = apiRequest('POST', '/api/auth/register', [
    'full_name' => 'Duplicate Email',
    'email'     => 'hacker_role@test.local',
    'password'  => 'password123',
]);
echo "2. Register duplicate email: Status = {$res2['status']} (Expected: 409)\n";
assert($res2['status'] === 409, 'Duplicate email must return 409');
assert($res2['body']['message'] !== '', 'Message should not be empty');
assert(is_array($res2['body']['errors']), 'errors must be array');

// 3. Register with short password (< 8 chars) -> MUST RETURN 400
$res3 = apiRequest('POST', '/api/auth/register', [
    'full_name' => 'Short Pass',
    'email'     => 'short@test.local',
    'password'  => '12345',
]);
echo "3. Register short password: Status = {$res3['status']} (Expected: 400)\n";
assert($res3['status'] === 400, 'Password < 8 must return 400');

// 4. Register a standard user
$res4 = apiRequest('POST', '/api/auth/register', [
    'full_name' => 'Phạm Quỳnh Anh',
    'email'     => 'phase3_user@test.local',
    'password'  => 'mypassword123',
    'phone'     => '0933445566',
]);
echo "4. Register standard user: Status = {$res4['status']} (Expected: 201)\n";
assert($res4['status'] === 201);
$registeredToken = $res4['body']['data']['token'];
$userId = $res4['body']['data']['user']['user_id'];
assert(!empty($registeredToken));

// 5. Login with invalid password -> MUST RETURN 401
$res5 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'phase3_user@test.local',
    'password' => 'wrongpassword',
]);
echo "5. Login with wrong password: Status = {$res5['status']} (Expected: 401)\n";
assert($res5['status'] === 401);

// 6. Login with non-existing email -> MUST RETURN 401
$res6 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'nonexisting@test.local',
    'password' => 'mypassword123',
]);
echo "6. Login with non-existing email: Status = {$res6['status']} (Expected: 401)\n";
assert($res6['status'] === 401);

// 7. Login with valid credentials -> MUST RETURN 200
$res7 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'phase3_user@test.local',
    'password' => 'mypassword123',
]);
echo "7. Login with valid credentials: Status = {$res7['status']} (Expected: 200)\n";
assert($res7['status'] === 200);
$token = $res7['body']['data']['token'];
assert(!empty($token));

// 8. Login with locked account -> MUST RETURN 403
$pdo->exec("
    INSERT INTO users (role_id, full_name, email, password_hash, phone, status, created_at)
    VALUES (3, 'Locked Person', 'locked_login@test.local', '" . password_hash('password123', PASSWORD_BCRYPT) . "', '0909', 'locked', NOW())
");
$res8 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'locked_login@test.local',
    'password' => 'password123',
]);
echo "8. Login with locked account: Status = {$res8['status']} (Expected: 403)\n";
assert($res8['status'] === 403, 'Locked account login must return 403');

// 9. GET /api/auth/profile with token -> MUST RETURN 200
$res9 = apiRequest('GET', '/api/auth/profile', null, $token);
echo "9. GET profile with token: Status = {$res9['status']} (Expected: 200), Name = {$res9['body']['data']['full_name']}\n";
assert($res9['status'] === 200);
assert($res9['body']['data']['email'] === 'phase3_user@test.local');
assert(!isset($res9['body']['data']['password_hash']), 'password_hash must never be leaked in profile');

// 10. GET /api/auth/profile without token -> MUST RETURN 401
$res10 = apiRequest('GET', '/api/auth/profile');
echo "10. GET profile without token: Status = {$res10['status']} (Expected: 401)\n";
assert($res10['status'] === 401);

// 11. PATCH /api/auth/profile update name & phone -> MUST RETURN 200
$res11 = apiRequest('PATCH', '/api/auth/profile', [
    'full_name' => 'Phạm Quỳnh Anh (Updated)',
    'phone'     => '0988776655',
], $token);
echo "11. PATCH profile update name & phone: Status = {$res11['status']} (Expected: 200)\n";
assert($res11['status'] === 200);
assert($res11['body']['data']['full_name'] === 'Phạm Quỳnh Anh (Updated)');
assert($res11['body']['data']['phone'] === '0988776655');

// 12. PATCH /api/auth/profile change password with wrong current_password -> MUST RETURN 400
$res12 = apiRequest('PATCH', '/api/auth/profile', [
    'current_password' => 'wrongcurrent',
    'new_password'     => 'brandnewpass123',
], $token);
echo "12. PATCH change password with wrong current_password: Status = {$res12['status']} (Expected: 400)\n";
assert($res12['status'] === 400);

// 13. PATCH /api/auth/profile change password successfully -> MUST RETURN 200
$res13 = apiRequest('PATCH', '/api/auth/profile', [
    'current_password' => 'mypassword123',
    'new_password'     => 'brandnewpass123',
], $token);
echo "13. PATCH change password with correct current_password: Status = {$res13['status']} (Expected: 200)\n";
assert($res13['status'] === 200);

// 14. Verify login with NEW password works
$res14 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'phase3_user@test.local',
    'password' => 'brandnewpass123',
]);
echo "14. Login with newly changed password: Status = {$res14['status']} (Expected: 200)\n";
assert($res14['status'] === 200);

// 15. Verify login with OLD password fails (401)
$res15 = apiRequest('POST', '/api/auth/login', [
    'email'    => 'phase3_user@test.local',
    'password' => 'mypassword123',
]);
echo "15. Login with old password after change: Status = {$res15['status']} (Expected: 401)\n";
assert($res15['status'] === 401);

// 16. POST /api/auth/logout with token -> MUST RETURN 200
$res16 = apiRequest('POST', '/api/auth/logout', null, $token);
echo "16. POST logout: Status = {$res16['status']} (Expected: 200)\n";
assert($res16['status'] === 200);

// 17. T17: Lock the user in DB and verify token is rejected immediately on next request
$pdo->exec("UPDATE users SET status = 'locked' WHERE user_id = {$userId}");
$res17 = apiRequest('GET', '/api/auth/profile', null, $token);
echo "17. T17 Token reuse after user locked: Status = {$res17['status']} (Expected: 403)\n";
assert($res17['status'] === 403);
assert($res17['body']['message'] === 'Tài khoản của bạn đã bị khóa');

// Cleanup test users
$pdo->exec("DELETE FROM users WHERE email IN ('phase3_user@test.local', 'hacker_role@test.local', 'locked_login@test.local')");
echo "-> Cleaned up test accounts.\n";

echo "=====================================================\n";
echo "ALL PHASE 3 INTEGRATION TESTS PASSED!\n";
echo "=====================================================\n";

