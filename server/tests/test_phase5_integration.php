<?php

declare(strict_types=1);

namespace Tests;

$baseUrl = getenv('API_BASE_URL');
if (!$baseUrl) {
    $ch = @curl_init('http://localhost/api/health');
    @curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    @curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    @curl_exec($ch);
    $code = @curl_getinfo($ch, CURLINFO_HTTP_CODE);
    @curl_close($ch);
    $baseUrl = ($code === 200) ? 'http://localhost' : 'http://localhost:8000';
}

function makeRequest(string $method, string $path, ?array $body = null, ?string $token = null, ?array $file = null): array
{
    global $baseUrl;
    $url = rtrim($baseUrl, '/') . $path;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    $headers = [];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    if ($file) {
        $postData = $body ?? [];
        $cfile = new \CURLFile($file['tmp_name'], $file['type'], $file['name']);
        $postData['image'] = $cfile;
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    } elseif ($body !== null) {
        $payload = json_encode($body);
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode((string) $raw, true);
    return ['code' => $httpCode, 'data' => $json, 'raw' => $raw];
}

echo "=== STARTING PHASE 5 INTEGRATION TESTS ===\n\n";
$testsPassed = 0;
$totalTests = 0;

function assertTest(bool $condition, string $msg): void
{
    global $testsPassed, $totalTests;
    $totalTests++;
    if ($condition) {
        echo "  [PASS] {$msg}\n";
        $testsPassed++;
    } else {
        echo "  [FAIL] {$msg}\n";
    }
}

// 1. Log in users
$resHost1 = makeRequest('POST', '/api/auth/login', ['email' => 'host1@studio.local', 'password' => 'password123']);
$host1Token = $resHost1['data']['data']['token'] ?? null;
assertTest($resHost1['code'] === 200 && $host1Token !== null, "Host 1 logged in successfully");

$resHost2 = makeRequest('POST', '/api/auth/login', ['email' => 'host2@studio.local', 'password' => 'password123']);
$host2Token = $resHost2['data']['data']['token'] ?? null;
assertTest($resHost2['code'] === 200 && $host2Token !== null, "Host 2 logged in successfully");

$resCust = makeRequest('POST', '/api/auth/login', ['email' => 'customer@studio.local', 'password' => 'password123']);
$custToken = $resCust['data']['data']['token'] ?? null;
assertTest($resCust['code'] === 200 && $custToken !== null, "Customer logged in successfully");

// 2. Customer calls Host endpoints -> Expect 403
echo "\n--- 2. Role Enforcement (Customer gets 403 on host endpoints) ---\n";
$resCustRoom = makeRequest('POST', '/api/rooms', ['studio_id' => 1, 'name' => 'Hack Room', 'area' => 50, 'capacity' => 10, 'space_type_ids' => [1]], $custToken);
assertTest($resCustRoom['code'] === 403, "Customer POST /api/rooms returned 403 Forbidden");

$resCustStudio = makeRequest('GET', '/api/studios/mine', null, $custToken);
assertTest($resCustStudio['code'] === 403, "Customer GET /api/studios/mine returned 403 Forbidden");

$resCustEquip = makeRequest('POST', '/api/equipments', ['studio_id' => 1, 'name' => 'Hack Equip', 'unit_price' => 100, 'pricing_unit' => 'session', 'total_quantity' => 1], $custToken);
assertTest($resCustEquip['code'] === 403, "Customer POST /api/equipments returned 403 Forbidden");

// 3. Cross-host Ownership Guard Tests (Host 1 owns Studio 1/Rooms 1,2,3; Host 2 owns Studio 2/Rooms 4,5)
echo "\n--- 3. Cross-Host Ownership Checks (Host 1 cannot access Host 2's resources) ---\n";

// 3.1 Host 1 creates room in Host 2's studio (studio_id = 2) -> 403
$resXRoom = makeRequest('POST', '/api/rooms', [
    'studio_id'      => 2,
    'name'           => 'Unauthorized Room',
    'area'           => 60,
    'capacity'       => 10,
    'space_type_ids' => [1],
], $host1Token);
assertTest($resXRoom['code'] === 403, "Host 1 POST /api/rooms on Host 2's Studio 2 returned 403");

// 3.2 Host 1 updates Host 2's room (room_id = 4) -> 403
$resXUpdate = makeRequest('PATCH', '/api/rooms/4', ['name' => 'Hacked Room Name'], $host1Token);
assertTest($resXUpdate['code'] === 403, "Host 1 PATCH /api/rooms/4 on Host 2's room returned 403");

// 3.3 Host 1 creates rate on Host 2's room (room_id = 4) -> 403
$resXRate = makeRequest('POST', '/api/rooms/4/rates', [
    'rate_unit'  => 'hour',
    'unit_price' => 150000,
], $host1Token);
assertTest($resXRate['code'] === 403, "Host 1 POST /api/rooms/4/rates on Host 2's room returned 403");

// 3.4 Host 1 creates equipment in Host 2's studio (studio_id = 2) -> 403
$resXEquip = makeRequest('POST', '/api/equipments', [
    'studio_id'      => 2,
    'category_id'    => 4,
    'name'           => 'Unauthorized Mic',
    'unit_price'     => 50000,
    'pricing_unit'   => 'session',
    'total_quantity' => 2,
], $host1Token);
assertTest($resXEquip['code'] === 403, "Host 1 POST /api/equipments on Host 2's Studio 2 returned 403");

// 3.5 Host 1 updates Host 2's equipment (equipment_id = 5) -> 403
$resXUpdateEq = makeRequest('PATCH', '/api/equipments/5', ['total_quantity' => 10], $host1Token);
assertTest($resXUpdateEq['code'] === 403, "Host 1 PATCH /api/equipments/5 on Host 2's equipment returned 403");

// 3.6 Host 1 accesses Host 2's equipment categories -> 403
$resXCat = makeRequest('GET', '/api/equipment-categories?studio_id=2', null, $host1Token);
assertTest($resXCat['code'] === 403, "Host 1 GET /api/equipment-categories on Host 2's Studio 2 returned 403");

// 4. Room Creation & Multi-table Transaction
echo "\n--- 4. Room Creation & Details ---\n";
$newRoomData = [
    'studio_id'        => 1,
    'name'             => 'Test Host Room Phase 5',
    'description'      => 'Phòng thử nghiệm Phase 5',
    'area'             => 80.5,
    'ceiling_height'   => 4.0,
    'capacity'         => 20,
    'soundproof_level' => 'Chuẩn A (Cách âm hoàn toàn)',
    'power_specs'      => '3 pha 32A',
    'rules'            => 'Không hút thuốc',
    'space_type_ids'   => [2, 1], // 2 is primary, 1 is secondary
    'amenity_ids'      => [1, 3],
];
$resCreateRoom = makeRequest('POST', '/api/rooms', $newRoomData, $host1Token);
assertTest($resCreateRoom['code'] === 201, "Host 1 successfully created room (HTTP 201)");
$createdRoomId = $resCreateRoom['data']['data']['room_id'] ?? null;
assertTest($createdRoomId !== null, "Created room has valid ID: {$createdRoomId}");

// Non-existent space type -> 400
$resBadSt = makeRequest('POST', '/api/rooms', array_merge($newRoomData, ['space_type_ids' => [9999]]), $host1Token);
assertTest($resBadSt['code'] === 400, "POST /api/rooms with non-existent space_type_id returned 400");

// Update room: cannot change studio_id -> 400
$resChangeStudio = makeRequest('PATCH', "/api/rooms/{$createdRoomId}", ['studio_id' => 2], $host1Token);
assertTest($resChangeStudio['code'] === 400, "PATCH /api/rooms cannot change studio_id (HTTP 400)");

// Update room status
$resUpdateStatus = makeRequest('PATCH', "/api/rooms/{$createdRoomId}", ['status' => 'maintenance'], $host1Token);
assertTest($resUpdateStatus['code'] === 200, "PATCH /api/rooms updated status to maintenance");
// Restore status to active for subsequent tests
makeRequest('PATCH', "/api/rooms/{$createdRoomId}", ['status' => 'active'], $host1Token);

// 5. Room Rates & D6 unit_minutes
echo "\n--- 5. Rates & unit_minutes (D6) ---\n";

// 5.1 Month rate -> unit_minutes must be 43200
$resMonthRate = makeRequest('POST', "/api/rooms/{$createdRoomId}/rates", [
    'rate_unit'     => 'month',
    'unit_price'    => 20000000,
    'minimum_units' => 1,
], $host1Token);
assertTest($resMonthRate['code'] === 201, "Created month rate (HTTP 201)");

// Verify rate list has unit_minutes = 43200
$resRatesList = makeRequest('GET', "/api/rooms/{$createdRoomId}/rates");
$monthRate = null;
foreach ($resRatesList['data']['data'] ?? [] as $r) {
    if ($r['rate_unit'] === 'month') {
        $monthRate = $r;
        break;
    }
}
assertTest($monthRate !== null && $monthRate['unit_minutes'] === 43200, "Rate 'month' has server-assigned unit_minutes = 43200");

// 5.2 Session rate without unit_minutes -> 400
$resSessionNoUnit = makeRequest('POST', "/api/rooms/{$createdRoomId}/rates", [
    'rate_unit'  => 'session',
    'unit_price' => 500000,
], $host1Token);
assertTest($resSessionNoUnit['code'] === 400, "Rate 'session' without unit_minutes returned 400");

// 5.3 Session rate with unit_minutes = 180 -> 201
$resSessionWithUnit = makeRequest('POST', "/api/rooms/{$createdRoomId}/rates", [
    'rate_unit'    => 'session',
    'unit_price'   => 500000,
    'unit_minutes' => 180,
], $host1Token);
assertTest($resSessionWithUnit['code'] === 201, "Rate 'session' with unit_minutes = 180 created (HTTP 201)");

// 6. Image Upload & MIME validation
echo "\n--- 6. Image Upload & MIME Validation ---\n";

// Fake text file disguised as image
$tmpFakeFile = tempnam(sys_get_temp_dir(), 'fake_img');
file_put_contents($tmpFakeFile, "This is not an image file. It is plain text.");
$fakeUpload = [
    'tmp_name' => $tmpFakeFile,
    'name'     => 'test.png',
    'type'     => 'image/png',
];
$resFakeImg = makeRequest('POST', "/api/rooms/{$createdRoomId}/images", ['is_primary' => '1'], $host1Token, $fakeUpload);
unlink($tmpFakeFile);
assertTest($resFakeImg['code'] === 400, "Uploading non-image file returned 400 (finfo detected real MIME text/plain)");

// Real 1x1 PNG file
$tmpRealPng = tempnam(sys_get_temp_dir(), 'real_png');
$pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
file_put_contents($tmpRealPng, $pngBytes);
$realUpload = [
    'tmp_name' => $tmpRealPng,
    'name'     => 'pixel.png',
    'type'     => 'image/png',
];
$resRealImg = makeRequest('POST', "/api/rooms/{$createdRoomId}/images", ['is_primary' => '1'], $host1Token, $realUpload);
unlink($tmpRealPng);
assertTest($resRealImg['code'] === 201, "Uploading real PNG image returned 201 Created");
assertTest(isset($resRealImg['data']['data']['image_url']), "Image URL returned in response");

// 7. Equipments & Stock reduction check
echo "\n--- 7. Equipments & Stock Reduction Check ---\n";
$newEquipData = [
    'studio_id'      => 1,
    'category_id'    => 1,
    'name'           => 'Godox SL150W III Phase 5',
    'brand'          => 'Godox',
    'unit_price'     => 120000,
    'pricing_unit'   => 'hour',
    'total_quantity' => 5,
];
$resCreateEq = makeRequest('POST', '/api/equipments', $newEquipData, $host1Token);
assertTest($resCreateEq['code'] === 201, "Host 1 successfully created equipment (HTTP 201)");
$newEqId = $resCreateEq['data']['data']['equipment_id'] ?? null;

// Normal quantity update
$resUpdateEq = makeRequest('PATCH', "/api/equipments/{$newEqId}", ['total_quantity' => 6], $host1Token);
assertTest($resUpdateEq['code'] === 200, "PATCH /api/equipments updated quantity to 6");

// Invalid pricing unit
$resBadUnit = makeRequest('POST', '/api/equipments', array_merge($newEquipData, ['pricing_unit' => 'day']), $host1Token);
assertTest($resBadUnit['code'] === 400, "pricing_unit='day' rejected with 400 (only session and hour allowed by D7)");

// 8. Studios & Categories Management
echo "\n--- 8. Studios & Categories ---\n";
$resMine = makeRequest('GET', '/api/studios/mine', null, $host1Token);
assertTest($resMine['code'] === 200 && is_array($resMine['data']['data']), "Host 1 GET /api/studios/mine returned 200 with list");

$resNewCat = makeRequest('POST', '/api/equipment-categories', [
    'studio_id'   => 1,
    'name'        => 'Gimbal & Chống Rung Phase 5',
    'description' => 'Các loại gimbal chuyên dụng',
], $host1Token);
assertTest($resNewCat['code'] === 201, "Host 1 created equipment category (HTTP 201)");

echo "\n============================================\n";
echo "PHASE 5 TEST SUMMARY: {$testsPassed} / {$totalTests} tests passed.\n";
if ($testsPassed === $totalTests) {
    echo ">>> PHASE 5 PASSED 100% <<<\n";
    exit(0);
} else {
    echo ">>> PHASE 5 FAILED! <<<\n";
    exit(1);
}
