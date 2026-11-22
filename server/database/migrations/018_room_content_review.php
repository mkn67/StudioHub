<?php
declare(strict_types=1);

// Existing listings remain visible; new Host submissions enter the review queue.
return static function (PDO $db): void {
    $column = static function (string $name, string $definition) use ($db): void {
        $q = $db->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
        $q->execute(['rooms', $name]);
        if (!(int) $q->fetchColumn()) $db->exec("ALTER TABLE rooms ADD COLUMN `$name` $definition");
    };
    $column('review_status', "VARCHAR(20) NOT NULL DEFAULT 'approved'");
    $column('review_reason', 'TEXT NULL');
    $column('reviewed_at', 'DATETIME NULL');
    $column('reviewed_by', 'INT NULL');
    $db->exec("UPDATE rooms SET review_status='approved' WHERE review_status IS NULL OR review_status=''");

    $constraint = $db->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?');
    $constraint->execute(['rooms', 'chk_rooms_review_status']);
    if (!(int) $constraint->fetchColumn()) $db->exec("ALTER TABLE rooms ADD CONSTRAINT chk_rooms_review_status CHECK (review_status IN ('draft','pending_review','approved','rejected'))");
    $constraint->execute(['rooms', 'fk_rooms_reviewed_by']);
    if (!(int) $constraint->fetchColumn()) $db->exec('ALTER TABLE rooms ADD CONSTRAINT fk_rooms_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL');

    $index = $db->prepare('SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=?');
    $index->execute(['rooms', 'idx_rooms_review_status']);
    if (!(int) $index->fetchColumn()) $db->exec('CREATE INDEX idx_rooms_review_status ON rooms(review_status, status)');
};
