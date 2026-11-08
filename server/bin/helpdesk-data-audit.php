<?php
declare(strict_types=1);
// Explicit operator command: SELECT only. No migrations, seeding or generated policy data.
require dirname(__DIR__) . '/vendor/autoload.php';
if (class_exists(Dotenv\Dotenv::class)) Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
try {
    $db = App\Core\Db::getConnection();
    $sql = "SELECT r.room_id, r.name,
        (r.description IS NULL OR TRIM(r.description) = '') AS missing_description,
        (r.rules IS NULL OR TRIM(r.rules) = '') AS missing_rules,
        (s.phone IS NULL OR TRIM(s.phone) = '') AS missing_studio_phone,
        (p.studio_id IS NULL) AS missing_policy,
        (p.refund_tiers IS NULL OR JSON_LENGTH(p.refund_tiers) = 0) AS missing_refund_tiers,
        NOT EXISTS(SELECT 1 FROM room_amenities ra WHERE ra.room_id=r.room_id) AS missing_amenities,
        NOT EXISTS(SELECT 1 FROM room_rates rr WHERE rr.room_id=r.room_id AND rr.status='active'
            AND rr.effective_from <= CURDATE() AND (rr.effective_to IS NULL OR rr.effective_to >= CURDATE())) AS missing_rates
        FROM rooms r JOIN studios s ON s.studio_id=r.studio_id
        LEFT JOIN studio_policies p ON p.studio_id=s.studio_id
        WHERE r.status='active' AND s.status='active' ORDER BY r.room_id";
    $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['readOnly'=>true,'activeRooms'=>count($rows),'rooms'=>$rows], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable) {
    fwrite(STDERR, "Could not audit catalog; verify DB connection and schema. No data was modified.\n");
    exit(1);
}
