<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $column = $db->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
    $column->execute(['bookings', 'payment_status']);
    if (!(int) $column->fetchColumn()) $db->exec("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid'");

    $db->exec("UPDATE bookings b SET payment_status=CASE
        WHEN EXISTS(SELECT 1 FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_type IN ('remaining','full') AND p.status='success') THEN 'paid'
        WHEN EXISTS(SELECT 1 FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_type='deposit' AND p.status='success') THEN 'deposit_paid'
        ELSE 'unpaid' END");
    $db->exec("UPDATE bookings b SET payment_status=CASE
        WHEN (SELECT COALESCE(SUM(r.amount),0) FROM booking_refunds r WHERE r.booking_id=b.booking_id AND r.status='success') >=
             (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.booking_id=b.booking_id AND p.status='success') THEN 'refunded'
        ELSE 'partially_refunded' END
        WHERE EXISTS(SELECT 1 FROM booking_refunds r WHERE r.booking_id=b.booking_id AND r.status='success')");

    $constraint = $db->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?');
    $constraint->execute(['bookings', 'chk_bookings_payment_status']);
    if (!(int) $constraint->fetchColumn()) $db->exec("ALTER TABLE bookings ADD CONSTRAINT chk_bookings_payment_status CHECK (payment_status IN ('unpaid','deposit_paid','paid','refund_pending','partially_refunded','refunded'))");
};
