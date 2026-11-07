-- Restore tables that may be missing from a database whose older migrations
-- are already recorded as applied. This migration never drops existing data.
SET @host_room_types_missing = (
    SELECT COUNT(*) = 0 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'host_room_types'
);

CREATE TABLE IF NOT EXISTS host_room_types (
    room_type_id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    capacity INT UNSIGNED NULL,
    area DECIMAL(8,2) NULL,
    amenities JSON NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_host_room_type_status CHECK (status IN ('active','inactive')),
    CONSTRAINT chk_host_room_type_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT chk_host_room_type_area CHECK (area IS NULL OR area > 0),
    CONSTRAINT uq_host_room_type_name UNIQUE (studio_id, name),
    CONSTRAINT fk_host_room_type_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE CASCADE,
    INDEX idx_host_room_types_studio (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipment_images (
    image_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipment_image_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    INDEX idx_equipment_images_primary (equipment_id, is_primary, image_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The original room-type migration added this column. Restore it when a base
-- schema import replaced the rooms table after that migration was recorded.
SET @room_type_column_missing = (
    SELECT COUNT(*) = 0 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'rooms' AND column_name = 'room_type_id'
);

SET @room_type_column_sql = IF(
    @room_type_column_missing,
    'ALTER TABLE rooms ADD COLUMN room_type_id INT NULL',
    'DO 0'
);

PREPARE restore_room_type_column FROM @room_type_column_sql;
EXECUTE restore_room_type_column;
DEALLOCATE PREPARE restore_room_type_column;

SET @room_type_fk_missing = (
    SELECT COUNT(*) = 0 FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND table_name = 'rooms'
      AND column_name = 'room_type_id' AND referenced_table_name = 'host_room_types'
);

SET @room_type_fk_sql = IF(
    @room_type_fk_missing,
    'ALTER TABLE rooms ADD CONSTRAINT fk_rooms_host_type FOREIGN KEY (room_type_id) REFERENCES host_room_types(room_type_id) ON DELETE SET NULL',
    'DO 0'
);

PREPARE restore_room_type_fk FROM @room_type_fk_sql;
EXECUTE restore_room_type_fk;
DEALLOCATE PREPARE restore_room_type_fk;

-- Only reconstruct catalog rows when the table itself had to be restored.
-- Existing host edits in a healthy database are left untouched.
INSERT INTO host_room_types (studio_id, name, description, status)
SELECT s.studio_id, t.name, t.description, 'active'
FROM studios s
CROSS JOIN space_types t
WHERE @host_room_types_missing = 1 AND t.category <> 'Other'
ON DUPLICATE KEY UPDATE room_type_id = room_type_id;

UPDATE rooms r
JOIN (
    SELECT rst.room_id, st.name AS space_type_name
    FROM room_space_types rst
    JOIN space_types st ON st.space_type_id = rst.space_type_id
    WHERE rst.is_primary = 1
) primary_type ON primary_type.room_id = r.room_id
JOIN host_room_types hrt ON hrt.studio_id = r.studio_id AND hrt.name = primary_type.space_type_name
SET r.room_type_id = hrt.room_type_id
WHERE @host_room_types_missing = 1 AND r.room_type_id IS NULL;
