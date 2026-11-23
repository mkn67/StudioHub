<?php
declare(strict_types=1);

// Repair booking idempotency columns even when an earlier migration was marked
// as applied against a database whose schema had drifted.
return static function (PDO $db): void {
    $hasColumn = static function (string $name) use ($db): bool {
        $query = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
        );
        $query->execute(['bookings', $name]);

        return (bool) $query->fetchColumn();
    };

    if (!$hasColumn('request_key')) {
        $db->exec('ALTER TABLE bookings ADD COLUMN request_key VARCHAR(100) NULL');
    }

    if (!$hasColumn('request_hash')) {
        $db->exec('ALTER TABLE bookings ADD COLUMN request_hash CHAR(64) NULL AFTER request_key');
    }

    $indexQuery = $db->query(
        "SELECT COUNT(*) FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'bookings'
           AND index_name = 'uq_booking_request'"
    );
    if ((int) $indexQuery->fetchColumn() === 0) {
        $duplicateQuery = $db->query(
            'SELECT customer_id, request_key
             FROM bookings
             WHERE request_key IS NOT NULL
             GROUP BY customer_id, request_key
             HAVING COUNT(*) > 1
             LIMIT 1'
        );
        if ($duplicateQuery->fetch(PDO::FETCH_ASSOC)) {
            throw new RuntimeException(
                'Cannot add uq_booking_request: duplicate non-null booking request keys exist.'
            );
        }

        $db->exec(
            'ALTER TABLE bookings ADD UNIQUE KEY uq_booking_request (customer_id, request_key)'
        );
    }
};
