<?php
declare(strict_types=1);

// Idempotent upgrade: MySQL DDL commits implicitly, so every step is restartable.
return static function (PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS integration_mutex(id INT PRIMARY KEY) ENGINE=InnoDB');
    $db->exec('INSERT IGNORE INTO integration_mutex(id) VALUES(1)');
    $db->exec('CREATE TABLE IF NOT EXISTS auth_rate_limits(bucket_key CHAR(64) PRIMARY KEY,attempts INT NOT NULL,expires_at DATETIME NOT NULL,INDEX(expires_at)) ENGINE=InnoDB');
    $column = static function (string $table, string $name, string $definition) use ($db): void {
        $q = $db->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
        $q->execute([$table, $name]);
        if (!$q->fetchColumn()) $db->exec("ALTER TABLE `$table` ADD COLUMN `$name` $definition");
    };
    $db->exec("CREATE TABLE IF NOT EXISTS room_types (
        type_id INT AUTO_INCREMENT PRIMARY KEY, studio_id INT NOT NULL, name VARCHAR(150) NOT NULL,
        config JSON NOT NULL, legacy_room_id INT UNIQUE NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $column('studios', 'integration_config', 'JSON NULL');
    $column('rooms', 'type_id', 'INT NULL REFERENCES room_types(type_id)');
    $column('rooms', 'integration_config', 'JSON NULL');
    $column('equipments', 'integration_config', 'JSON NULL');
    $column('users', 'booking_restricted', 'TINYINT(1) NOT NULL DEFAULT 0');
    $column('bookings', 'integration_snapshot', 'JSON NULL');
    $column('bookings', 'request_key', 'VARCHAR(100) NULL');
    $column('bookings', 'payment_status', "VARCHAR(20) NOT NULL DEFAULT 'unpaid'");
    $column('bookings', 'approval_deadline', 'DATETIME NULL');
    // Drop only obsolete CHECKs; preserve all rows, FKs and money columns.
    foreach (['chk_bookings_status', 'chk_bookings_pending_expires'] as $name) {
        $q = $db->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?');
        $q->execute(['bookings', $name]);
        if ($q->fetchColumn()) $db->exec("ALTER TABLE bookings DROP CHECK `$name`");
    }
    $db->exec("UPDATE bookings b SET payment_status=IF(EXISTS(SELECT 1 FROM payments p WHERE p.booking_id=b.booking_id AND p.payment_type IN ('deposit','full') AND p.status='success'),'paid','unpaid') WHERE integration_snapshot IS NULL");
    $db->exec("UPDATE bookings SET status='awaiting_payment' WHERE status='pending' AND payment_status='unpaid' AND integration_snapshot IS NULL");
    $db->exec("UPDATE bookings SET status='cancelled' WHERE status='rejected'");
    $q=$db->query("SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='bookings' AND constraint_name='chk_bookings_lifecycle'");
    if(!$q->fetchColumn()) $db->exec("ALTER TABLE bookings ADD CONSTRAINT chk_bookings_lifecycle CHECK(status IN ('awaiting_payment','pending','confirmed','checked_in','completed','cancelled','expired','no_show'))");
    $q = $db->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='bookings' AND index_name='uq_booking_request'");
    if (!$q->fetchColumn()) $db->exec('ALTER TABLE bookings ADD UNIQUE KEY uq_booking_request(customer_id,request_key)');
    $db->exec("CREATE TABLE IF NOT EXISTS booking_incidents (
        incident_id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, booking_id INT NOT NULL UNIQUE,
        active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id), FOREIGN KEY(booking_id) REFERENCES bookings(booking_id)
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS auth_revocations (
        token_hash CHAR(64) PRIMARY KEY, expires_at DATETIME NOT NULL, INDEX(expires_at)
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS integration_requests (
        user_id INT NOT NULL, request_key VARCHAR(100) NOT NULL, payload_hash CHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,request_key),
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB");
    $db->exec("CREATE TABLE IF NOT EXISTS host_applications (
        application_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, studio_name VARCHAR(150) NOT NULL,
        address VARCHAR(255) NOT NULL, description TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reason TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->exec("CREATE TABLE IF NOT EXISTS booking_support_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // One legacy type per room preserves every distinct price; Hosts can regroup explicitly.
    $db->exec("INSERT INTO room_types(studio_id,name,config,legacy_room_id)
        SELECT r.studio_id,r.name,JSON_OBJECT('category',COALESCE((SELECT st.name FROM room_space_types rs JOIN space_types st USING(space_type_id) WHERE rs.room_id=r.room_id ORDER BY rs.is_primary DESC LIMIT 1),'Studio'),'hourlyRate',COALESCE((SELECT unit_price FROM room_rates rr WHERE rr.room_id=r.room_id AND rate_unit='hour' AND status='active' ORDER BY rate_id DESC LIMIT 1),0),'plans',JSON_ARRAY('hourly')),r.room_id
        FROM rooms r WHERE NOT EXISTS(SELECT 1 FROM room_types t WHERE t.legacy_room_id=r.room_id)");
    $db->exec('UPDATE rooms r JOIN room_types t ON t.legacy_room_id=r.room_id SET r.type_id=t.type_id WHERE r.type_id IS NULL');
    foreach($db->query('SELECT * FROM room_types WHERE legacy_room_id IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC) as $type) {
        $config=json_decode($type['config'],true,512,JSON_THROW_ON_ERROR);
        if(isset($config['rentalPlans'])) continue;
        $q=$db->prepare("SELECT * FROM room_rates WHERE room_id=? AND status='active' AND effective_from<=CURDATE() AND (effective_to IS NULL OR effective_to>=CURDATE()) ORDER BY rate_id DESC"); $q->execute([$type['legacy_room_id']]);
        $plans=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $rate) {
            $minutes=(int)$rate['unit_minutes'];
            // Approved v1 UI supports hourly and five named packages. Preserve all other rates in the legacy tables.
            $key=$rate['rate_unit']==='hour' && $minutes===60?'hourly':match($minutes) { 180=>'combo3',300=>'combo5',600=>'combo10',120,240=>'session',default=>null };
            if($key===null || isset($plans[$key]) || (int)$rate['unit_price']<=0) continue;
            $plans[$key]=['plan'=>$key,'title'=>$key==='hourly'?'Theo giờ':"Gói $minutes phút",'kind'=>$key==='hourly'?'hourly':'duration','price'=>(int)$rate['unit_price'],'durationMinutes'=>$minutes,'includedEquipment'=>(object)[],'includedServices'=>[],'active'=>true];
        }
        if($plans) { $config['rentalPlans']=array_values($plans); $config['plans']=array_keys($plans); $db->prepare('UPDATE room_types SET config=? WHERE type_id=?')->execute([json_encode($config,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$type['type_id']]); }
    }
    $q=$db->query("SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='rooms' AND constraint_name='fk_rooms_type'");
    if(!$q->fetchColumn()) $db->exec('ALTER TABLE rooms ADD CONSTRAINT fk_rooms_type FOREIGN KEY(type_id) REFERENCES room_types(type_id) ON DELETE RESTRICT');
    // Triggers remain a secondary guard; the application serializes all writers by Studio row.
    foreach (['ins' => 'INSERT', 'upd' => 'UPDATE'] as $suffix => $operation) {
        $db->exec("DROP TRIGGER IF EXISTS trg_bookings_no_overlap_$suffix");
        $db->exec("CREATE TRIGGER trg_bookings_no_overlap_$suffix BEFORE $operation ON bookings FOR EACH ROW
        BEGIN
          IF NEW.status IN ('awaiting_payment','pending','confirmed','checked_in') THEN
            IF EXISTS(SELECT 1 FROM bookings b WHERE b.room_id=NEW.room_id AND b.booking_id<>COALESCE(NEW.booking_id,0)
              AND b.status IN ('awaiting_payment','pending','confirmed','checked_in')
              AND NEW.busy_start<b.busy_end AND NEW.busy_end>b.busy_start) THEN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ROOM_OCCUPIED';
            END IF;
          END IF;
        END");
    }
};
