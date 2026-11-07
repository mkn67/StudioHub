<?php

declare(strict_types=1);

// The initial integration migration created a smaller version of this table.
// Bring that legacy table up to the current shape before SQL migration 009 runs.
return static function (PDO $db): void {
    $hasColumn = static function (string $column) use ($db): bool {
        $query = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        );
        $query->execute(['host_applications', $column]);

        return (int) $query->fetchColumn() > 0;
    };

    foreach ([
        'reviewed_by' => 'INT NULL',
        'reviewed_at' => 'DATETIME NULL',
        'updated_at' => 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ] as $column => $definition) {
        if (!$hasColumn($column)) {
            $db->exec("ALTER TABLE host_applications ADD COLUMN `$column` $definition");
        }
    }

    $hasReviewerForeignKey = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.table_constraints '
        . 'WHERE constraint_schema = DATABASE() AND table_name = ? '
        . 'AND constraint_name = ?',
    );
    $hasReviewerForeignKey->execute(['host_applications', 'fk_host_application_reviewer']);
    if ((int) $hasReviewerForeignKey->fetchColumn() === 0) {
        $db->exec(
            'ALTER TABLE host_applications ADD CONSTRAINT fk_host_application_reviewer '
            . 'FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL',
        );
    }
};
