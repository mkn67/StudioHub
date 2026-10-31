<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

if (is_file(dirname(__DIR__) . '/.env')) {
    Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
}

use App\Core\Db;
use App\Modules\Auth\JwtService;

$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost';
$jwtService = new JwtService();

echo "=====================================================\n";
echo "Phase 2 Integration Verification\n";
echo "=====================================================\n";

function request(string $method, string $path, ?string $token = null): array
{
    global $baseUrl;
    $ch = curl_init("{$baseUrl}{$path}");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $headers = ['Accept: application/json'];
    if ($token !== null) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $status,
        'body'   => json_decode((string) $response, true),
        'raw'    => $response,
    ];
}

// 1. Protected route without token -> MUST RETURN 401
$res1 = request('GET', '/api/test/me');
echo "1. No token test: Status = {$res1['status']} (Expected: 401)\n";
assert($res1['status'] === 401, 'Expected 401 when missing token');
assert(is_array($res1['body']['errors']), 'errors must be array');

// 2. Protected route with corrupted token -> MUST RETURN 401
$res2 = request('GET', '/api/test/me', 'invalid.jwt.token');
echo "2. Corrupted token test: Status = {$res2['status']} (Expected: 401)\n";
assert($res2['status'] === 401, 'Expected 401 for invalid token');

// 3. Customer token calling /api/test/me -> MUST RETURN 200
$customerToken = $jwtService->generate(4);
$res3 = request('GET', '/api/test/me', $customerToken);
echo "3. Valid customer token: Status = {$res3['status']} (Expected: 200), Role = {$res3['body']['data']['role']}\n";
assert($res3['status'] === 200, 'Expected 200 for customer token');
assert($res3['body']['data']['role'] === 'customer');

// 4. Customer token calling /api/test/host-only -> MUST RETURN 403
$res4 = request('GET', '/api/test/host-only', $customerToken);
echo "4. Customer access host route: Status = {$res4['status']} (Expected: 403)\n";
assert($res4['status'] === 403, 'Expected 403 for wrong role');
assert($res4['body']['code'] === 403);
assert(is_array($res4['body']['errors']), 'errors must be array');

// 5. Host token calling /api/test/host-only -> MUST RETURN 200
$hostToken = $jwtService->generate(2);
$res5 = request('GET', '/api/test/host-only', $hostToken);
echo "5. Host access host route: Status = {$res5['status']} (Expected: 200)\n";
assert($res5['status'] === 200, 'Expected 200 for host');

// 6. Test T17: Lock host user in DB -> Old token must immediately be rejected with 403 account_locked
$pdo = Db::getConnection();
$pdo->exec("UPDATE users SET status = 'locked' WHERE user_id = 2");
echo "-> Locked host user (user_id = 2) in database.\n";

$res6 = request('GET', '/api/test/host-only', $hostToken);
echo "6. Old token after account lock: Status = {$res6['status']} (Expected: 403), Error Code = {$res6['body']['message']}\n";
assert($res6['status'] === 403, 'Expected 403 when account is locked');
assert(str_contains(json_encode($res6['body']), 'account_locked'), 'Must return account_locked');

// 7. Test T17: Unlock and change role to customer in DB -> Old token must immediately lose host privileges
$pdo->exec("UPDATE users SET status = 'active', role_id = 3 WHERE user_id = 2");
echo "-> Unlocked user 2 and changed role from host to customer in database.\n";

$res7 = request('GET', '/api/test/host-only', $hostToken);
echo "7. Old token after role demotion: Status = {$res7['status']} (Expected: 403)\n";
assert($res7['status'] === 403, 'Expected 403 after role demotion in DB');

// Restore user 2 back to host (role_id = 2)
$pdo->exec("UPDATE users SET status = 'active', role_id = 2 WHERE user_id = 2");
echo "-> Restored user 2 back to active host.\n";

$res8 = request('GET', '/api/test/host-only', $hostToken);
echo "8. Host token after restore: Status = {$res8['status']} (Expected: 200)\n";
assert($res8['status'] === 200, 'Expected 200 after restore');

echo "=====================================================\n";
echo "ALL PHASE 2 INTEGRATION TESTS PASSED!\n";
echo "=====================================================\n";
