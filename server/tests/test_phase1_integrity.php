<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Db;

$pdo = Db::getConnection();
$failures = [];

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$triggers = $pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC);
$version = (string) $pdo->query('SELECT VERSION()')->fetchColumn();

if (count($tables) !== 16) $failures[] = 'Expected 16 tables, found ' . count($tables);
if (count($triggers) !== 2) $failures[] = 'Expected 2 triggers, found ' . count($triggers);
if (version_compare(preg_replace('/[^0-9.].*$/', '', $version), '8.0.16', '<')) {
    $failures[] = 'MySQL version must be at least 8.0.16; found ' . $version;
}

$assertRejected = static function (string $label, string $sql, array $params = []) use ($pdo, &$failures): void {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $failures[] = $label . ' was unexpectedly accepted';
    } catch (PDOException $e) {
        echo "[PASS] {$label} rejected ({$e->getCode()})\n";
    }
};

$assertRejected(
    'Room area CHECK (area = 0)',
    'INSERT INTO rooms (studio_id, name, area, capacity) VALUES (1, ?, 0, 1)',
    ['Invalid check fixture']
);

$bookingBase = [
    'booking_code' => 'CHECK-' . bin2hex(random_bytes(8)),
    'room_id' => 1,
    'customer_id' => 4,
    'rate_id' => 1,
    'start_time' => '2035-01-01 09:00:00',
    'end_time' => '2035-01-01 10:00:00',
    'busy_start' => '2035-01-01 09:00:00',
    'busy_end' => '2035-01-01 10:30:00',
    'rate_unit' => 'hour',
    'rental_units' => 1,
    'room_unit_price' => 100,
    'room_amount' => 100,
    'equipment_amount' => 0,
    'total_amount' => 100,
    'deposit_amount' => 30,
    'customer_name' => 'Check Fixture',
    'customer_phone' => '0900000000',
    'customer_email' => 'check@example.test',
];

$insertBooking = static function (string $status, ?string $expiresAt, ?string $completedAt) use ($bookingBase): array {
    return [
        ...$bookingBase,
        'booking_code' => 'CHECK-' . bin2hex(random_bytes(8)),
        'status' => $status,
        'expires_at' => $expiresAt,
        'completed_at' => $completedAt,
    ];
};

$columnNames = array_merge(array_keys($bookingBase), ['status', 'expires_at', 'completed_at']);
$quotedColumns = implode(', ', array_map(static fn(string $name): string => "`{$name}`", $columnNames));
$placeholders = implode(', ', array_fill(0, count($columnNames), '?'));
$bookingSql = "INSERT INTO bookings ({$quotedColumns}) VALUES ({$placeholders})";

foreach ([
    ['pending booking without expires_at', $insertBooking('pending', null, null)],
    ['completed booking without completed_at', $insertBooking('completed', null, null)],
] as [$label, $values]) {
    $assertRejected($label, $bookingSql, array_values($values));
}

echo 'Tables: ' . count($tables) . '; triggers: ' . count($triggers) . '; MySQL: ' . $version . "\n";
if ($failures !== []) {
    foreach ($failures as $failure) echo "[FAIL] {$failure}\n";
    exit(1);
}
echo "[PASS] Phase 1 database integrity checks passed\n";
