<?php
declare(strict_types=1);

// Existing request_key support was introduced earlier; persist a canonical payload
// digest so a retry cannot accidentally reuse the key for a different booking.
return static function (PDO $db): void {
    $q = $db->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
    $q->execute(['bookings', 'request_hash']);
    if (!(int) $q->fetchColumn()) $db->exec('ALTER TABLE bookings ADD COLUMN request_hash CHAR(64) NULL AFTER request_key');
};
