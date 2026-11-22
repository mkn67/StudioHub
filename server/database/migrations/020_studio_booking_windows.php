<?php
declare(strict_types=1);

return static function (PDO $db): void {
    $column = static function (string $name, string $definition) use ($db): void {
        $q = $db->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
        $q->execute(['studio_policies', $name]);
        if (!(int) $q->fetchColumn()) $db->exec("ALTER TABLE studio_policies ADD COLUMN `$name` $definition");
    };
    $column('buffer_minutes', 'SMALLINT UNSIGNED NOT NULL DEFAULT 30');
    $column('minimum_advance_minutes', 'SMALLINT UNSIGNED NOT NULL DEFAULT 120');
    $q = $db->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?');
    foreach ([
        'chk_policy_buffer' => 'ALTER TABLE studio_policies ADD CONSTRAINT chk_policy_buffer CHECK (buffer_minutes <= 480)',
        'chk_policy_minimum_advance' => 'ALTER TABLE studio_policies ADD CONSTRAINT chk_policy_minimum_advance CHECK (minimum_advance_minutes <= 10080)',
    ] as $name => $sql) {
        $q->execute(['studio_policies', $name]);
        if (!(int) $q->fetchColumn()) $db->exec($sql);
    }
};
