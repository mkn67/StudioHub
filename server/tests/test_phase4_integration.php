<?php

declare(strict_types=1);

/**
 * Phase 4 Integration Verification Script
 * Tests all Phase 4 endpoints against the running server / database.
 */

$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost';

function makeRequest(string $method, string $path, ?array $body = null, array $headers = []): array
{
    global $baseUrl;
    $url = $baseUrl . $path;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $defaultHeaders = ['Content-Type: application/json'];
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

echo "=====================================================\n";
echo "Phase 4 Integration Verification (Public Catalog)\n";
echo "=====================================================\n";

$allPassed = true;

function assertCondition(bool $cond, string $msg): void
{
    global $allPassed;
    if ($cond) {
        echo "  [PASS] $msg\n";
    } else {
        echo "  [FAIL] $msg\n";
        $allPassed = false;
    }
}

// 1. GET /api/space-types
echo "\n1. GET /api/space-types:\n";
$res = makeRequest('GET', '/api/space-types');
assertCondition($res['status'] === 200, "Status is 200 (Got: {$res['status']})");
assertCondition(isset($res['json']['data']) && is_array($res['json']['data']), "Data is an array");
assertCondition(count($res['json']['data'] ?? []) === 7, "Returned exactly 7 space types (Got: " . count($res['json']['data'] ?? []) . ")");

// 2. GET /api/amenities
echo "\n2. GET /api/amenities:\n";
$res = makeRequest('GET', '/api/amenities');
assertCondition($res['status'] === 200, "Status is 200 (Got: {$res['status']})");
assertCondition(isset($res['json']['data']) && is_array($res['json']['data']), "Data is an array");
assertCondition(count($res['json']['data'] ?? []) === 8, "Returned exactly 8 amenities (Got: " . count($res['json']['data'] ?? []) . ")");

// 3. GET /api/rooms (Default listing)
echo "\n3. GET /api/rooms (Default listing):\n";
$res = makeRequest('GET', '/api/rooms');
assertCondition($res['status'] === 200, "Status is 200 (Got: {$res['status']})");
$items = $res['json']['data']['items'] ?? [];
$pagination = $res['json']['data']['pagination'] ?? [];
assertCondition(count($items) === 4, "Returned exactly 4 active rooms (Got: " . count($items) . ")");
assertCondition(($pagination['total_items'] ?? 0) === 4, "total_items is 4");
assertCondition(($pagination['page'] ?? 0) === 1, "page is 1");
assertCondition(($pagination['limit'] ?? 0) === 12, "limit is 12");
$roomIds = array_column($items, 'room_id');
assertCondition(!in_array(3, $roomIds), "Room 3 (maintenance) is NOT in active rooms list");
assertCondition(in_array(1, $roomIds) && in_array(2, $roomIds) && in_array(4, $roomIds) && in_array(5, $roomIds), "Contains active rooms 1, 2, 4, 5");

// Check room 1 fields
$room1 = null;
foreach ($items as $r) {
    if ($r['room_id'] === 1) {
        $room1 = $r;
        break;
    }
}
assertCondition($room1 !== null, "Found room 1");
if ($room1) {
    assertCondition(isset($room1['display_rate']) && $room1['display_rate']['unit_price'] === 350000, "Room 1 display_rate hour = 350000 VND");
    assertCondition(isset($room1['primary_space_type']) && $room1['primary_space_type']['name'] === 'Cyclorama Studio', "Room 1 primary_space_type is Cyclorama Studio");
    assertCondition(!empty($room1['thumbnail_url']), "Room 1 has thumbnail_url");
    assertCondition(count($room1['amenities']) === 5, "Room 1 has 5 amenities");
    assertCondition($room1['studio']['name'] === 'Artemis Creative Hub', "Room 1 studio name is Artemis Creative Hub");
}

// 4. GET /api/rooms?keyword=Cyclorama
echo "\n4. GET /api/rooms?keyword=Cyclorama:\n";
$res = makeRequest('GET', '/api/rooms?keyword=Cyclorama');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
assertCondition(count($items) === 1 && $items[0]['room_id'] === 1, "Only room 1 returned for keyword Cyclorama");

// 5. GET /api/rooms?keyword=Zenith (Studio search)
echo "\n5. GET /api/rooms?keyword=Zenith:\n";
$res = makeRequest('GET', '/api/rooms?keyword=Zenith');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
assertCondition(count($items) === 2, "Rooms 4 and 5 returned for keyword Zenith");

// 6. GET /api/rooms?space_type_id=1
echo "\n6. GET /api/rooms?space_type_id=1 (Cyclorama):\n";
$res = makeRequest('GET', '/api/rooms?space_type_id=1');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
assertCondition(count($items) === 1 && $items[0]['room_id'] === 1, "Only room 1 has space_type_id 1");

// 7. GET /api/rooms?min_area=70
echo "\n7. GET /api/rooms?min_area=70:\n";
$res = makeRequest('GET', '/api/rooms?min_area=70');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
$ids = array_column($items, 'room_id');
sort($ids);
assertCondition($ids === [1, 5], "Rooms 1 (75m2) and 5 (90m2) returned for min_area=70");

// 8. GET /api/rooms?rate_unit=session
echo "\n8. GET /api/rooms?rate_unit=session:\n";
$res = makeRequest('GET', '/api/rooms?rate_unit=session');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
$roomMap = [];
foreach ($items as $r) {
    $roomMap[$r['room_id']] = $r;
}
assertCondition(isset($roomMap[1]['display_rate']) && $roomMap[1]['display_rate']['unit_price'] === 950000, "Room 1 session display_rate = 950k");
assertCondition(isset($roomMap[4]['display_rate']) && $roomMap[4]['display_rate']['unit_price'] === 750000, "Room 4 session display_rate = 750k");
assertCondition(isset($roomMap[2]) && $roomMap[2]['display_rate'] === null, "Room 2 has null display_rate for session");

// 9. GET /api/rooms?rate_unit=session&max_price=800000 (Exclude rooms without active session rate and rooms > 800k)
echo "\n9. GET /api/rooms?rate_unit=session&max_price=800000:\n";
$res = makeRequest('GET', '/api/rooms?rate_unit=session&max_price=800000');
assertCondition($res['status'] === 200, "Status is 200");
$items = $res['json']['data']['items'] ?? [];
assertCondition(count($items) === 1 && $items[0]['room_id'] === 4, "Only Room 4 (750k <= 800k) matched; room 1 (950k) and rooms without session rates excluded");

// 10. GET /api/rooms pagination limit=2&page=1 and page=2
echo "\n10. GET /api/rooms pagination:\n";
$resPage1 = makeRequest('GET', '/api/rooms?limit=2&page=1');
$resPage2 = makeRequest('GET', '/api/rooms?limit=2&page=2');
assertCondition($resPage1['status'] === 200 && $resPage2['status'] === 200, "Pagination requests return 200");
$p1Items = $resPage1['json']['data']['items'] ?? [];
$p2Items = $resPage2['json']['data']['items'] ?? [];
assertCondition(count($p1Items) === 2 && count($p2Items) === 2, "Page 1 has 2 items, Page 2 has 2 items");
assertCondition($resPage1['json']['data']['pagination']['total_pages'] === 2, "total_pages is 2");
assertCondition($p1Items[0]['room_id'] !== $p2Items[0]['room_id'], "Page 1 and Page 2 have distinct items");

// 11. GET /api/rooms/1 (Room detail)
echo "\n11. GET /api/rooms/1 (Room detail):\n";
$res = makeRequest('GET', '/api/rooms/1');
assertCondition($res['status'] === 200, "Status is 200");
$data = $res['json']['data'] ?? [];
assertCondition($data['room_id'] === 1, "room_id is 1");
assertCondition($data['studio']['name'] === 'Artemis Creative Hub', "studio loaded correctly");
assertCondition(count($data['space_types']) === 2, "2 space types loaded for room 1");
assertCondition(count($data['amenities']) === 5, "5 amenities loaded for room 1");
assertCondition(count($data['images']) === 2, "2 images loaded for room 1");
assertCondition(count($data['rates']) === 5, "5 active rates loaded for room 1");

// 12. GET /api/rooms/3 (Maintenance room detail -> 404)
echo "\n12. GET /api/rooms/3 (Maintenance room -> 404):\n";
$res = makeRequest('GET', '/api/rooms/3');
assertCondition($res['status'] === 404, "Maintenance room returns 404 (Got: {$res['status']})");
assertCondition(isset($res['json']['errors']) && is_array($res['json']['errors']), "errors is an array");

// 13. GET /api/rooms/999 (Non-existent room -> 404)
echo "\n13. GET /api/rooms/999 (Non-existent room -> 404):\n";
$res = makeRequest('GET', '/api/rooms/999');
assertCondition($res['status'] === 404, "Non-existent room returns 404");

// 14. GET /api/rooms/1/rates
echo "\n14. GET /api/rooms/1/rates:\n";
$res = makeRequest('GET', '/api/rooms/1/rates');
assertCondition($res['status'] === 200, "Status is 200");
$rates = $res['json']['data'] ?? [];
assertCondition(count($rates) === 5, "5 active rates returned");
assertCondition($rates[0]['rate_unit'] === 'hour' && $rates[0]['unit_price'] === 350000, "First rate is hour (350k VND)");

// 15. GET /api/rooms/3/rates (Maintenance room -> 404)
echo "\n15. GET /api/rooms/3/rates (Maintenance room -> 404):\n";
$res = makeRequest('GET', '/api/rooms/3/rates');
assertCondition($res['status'] === 404, "Maintenance room rates returns 404");

// 16. GET /api/rooms/1/calendar (Default 30 days)
echo "\n16. GET /api/rooms/1/calendar:\n";
$res = makeRequest('GET', '/api/rooms/1/calendar');
assertCondition($res['status'] === 200, "Status is 200");
$cal = $res['json']['data'] ?? [];
assertCondition($cal['room_id'] === 1, "room_id is 1");
assertCondition(isset($cal['busy_slots']) && is_array($cal['busy_slots']), "busy_slots is array");

// 17. GET /api/rooms/1/calendar with range > 62 days (-> 400)
echo "\n17. GET /api/rooms/1/calendar with range > 62 days (-> 400):\n";
$res = makeRequest('GET', '/api/rooms/1/calendar?from=2026-10-01&to=2026-12-15');
assertCondition($res['status'] === 400, "Status is 400 for range > 62 days (Got: {$res['status']})");

// 18. GET /api/rooms/1/calendar with from > to (-> 400)
echo "\n18. GET /api/rooms/1/calendar with from > to (-> 400):\n";
$res = makeRequest('GET', '/api/rooms/1/calendar?from=2026-10-25&to=2026-10-20');
assertCondition($res['status'] === 400, "Status is 400 for from > to (Got: {$res['status']})");

// 19. GET /api/rooms/3/calendar (Maintenance room -> 404)
echo "\n19. GET /api/rooms/3/calendar (Maintenance room -> 404):\n";
$res = makeRequest('GET', '/api/rooms/3/calendar');
assertCondition($res['status'] === 404, "Maintenance room calendar returns 404");

// 20. GET /api/equipments missing studio_id (-> 400)
echo "\n20. GET /api/equipments missing studio_id (-> 400):\n";
$res = makeRequest('GET', '/api/equipments');
assertCondition($res['status'] === 400, "Missing studio_id returns 400 (Got: {$res['status']})");
assertCondition(isset($res['json']['errors']) && is_array($res['json']['errors']), "errors is an array");

// 21. GET /api/equipments non-existent studio_id (-> 404)
echo "\n21. GET /api/equipments studio_id=999 (-> 404):\n";
$res = makeRequest('GET', '/api/equipments?studio_id=999');
assertCondition($res['status'] === 404, "Non-existent studio returns 404");

// 22. GET /api/equipments studio_id=1
echo "\n22. GET /api/equipments?studio_id=1:\n";
$res = makeRequest('GET', '/api/equipments?studio_id=1');
assertCondition($res['status'] === 200, "Status is 200");
$eqList = $res['json']['data'] ?? [];
assertCondition(count($eqList) === 4, "Studio 1 has 4 active equipments (Got: " . count($eqList) . ")");
assertCondition(isset($eqList[0]['category_name']), "category_name is included in equipment");
assertCondition($eqList[0]['name'] === 'Đèn Godox AD600 Pro', "First equipment is Godox AD600 Pro");

// 23. GET /api/equipments?studio_id=1&category_id=1
echo "\n23. GET /api/equipments?studio_id=1&category_id=1:\n";
$res = makeRequest('GET', '/api/equipments?studio_id=1&category_id=1');
assertCondition($res['status'] === 200, "Status is 200");
$eqList = $res['json']['data'] ?? [];
assertCondition(count($eqList) === 1 && $eqList[0]['name'] === 'Đèn Godox AD600 Pro', "Only Godox AD600 Pro in category 1");

// 24. GET /api/equipments?studio_id=2
echo "\n24. GET /api/equipments?studio_id=2:\n";
$res = makeRequest('GET', '/api/equipments?studio_id=2');
assertCondition($res['status'] === 200, "Status is 200");
$eqList = $res['json']['data'] ?? [];
assertCondition(count($eqList) === 3, "Studio 2 has 3 active equipments (Got: " . count($eqList) . ")");

echo "\n=====================================================\n";
if ($allPassed) {
    echo "ALL PHASE 4 INTEGRATION TESTS PASSED!\n";
} else {
    echo "SOME PHASE 4 INTEGRATION TESTS FAILED!\n";
    exit(1);
}
echo "=====================================================\n";
