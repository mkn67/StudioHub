ALTER TABLE space_types ADD COLUMN category VARCHAR(100) NULL AFTER description;

UPDATE space_types SET category = CASE
    WHEN name IN ('Cyclorama Studio', 'Lookbook & Fashion', 'Concept & Set Design') THEN 'Visual & Photo Studio'
    WHEN name IN ('Green Screen & VFX', 'Acoustic Soundstage') THEN 'Video & Film Production'
    WHEN name IN ('Podcast & Livestream Hub', 'Livestream & E-commerce') THEN 'Livestream & Broadcast'
    WHEN name IN ('Music Recording Studio', 'Workshop & Event Studio') THEN 'Audio & Event'
    ELSE 'Other'
END;

ALTER TABLE host_applications
    ADD COLUMN contact_phone VARCHAR(20) NULL AFTER description,
    ADD COLUMN website VARCHAR(255) NULL AFTER contact_phone,
    ADD COLUMN studio_type VARCHAR(100) NULL AFTER website,
    ADD COLUMN expected_room_count SMALLINT UNSIGNED NULL AFTER studio_type,
    ADD COLUMN legal_name VARCHAR(180) NULL AFTER expected_room_count,
    ADD COLUMN tax_id VARCHAR(30) NULL AFTER legal_name;

INSERT INTO host_room_types (studio_id, name, description, status)
SELECT studios.studio_id, space_types.name, space_types.description, 'active'
FROM studios
CROSS JOIN space_types
WHERE space_types.category <> 'Other'
ON DUPLICATE KEY UPDATE description = VALUES(description);

UPDATE rooms r
JOIN (
    SELECT rst.room_id, st.name AS space_type_name
    FROM room_space_types rst
    JOIN space_types st ON st.space_type_id = rst.space_type_id
    WHERE rst.is_primary = 1
) primary_type ON primary_type.room_id = r.room_id
JOIN host_room_types hrt ON hrt.studio_id = r.studio_id AND hrt.name = primary_type.space_type_name
SET r.room_type_id = hrt.room_type_id
WHERE r.room_type_id IS NULL;

DELETE rst FROM room_space_types rst
JOIN rooms r ON r.room_id = rst.room_id
JOIN space_types st ON st.space_type_id = rst.space_type_id
WHERE (r.name = 'Zenith Podcast & Livestream Pro' AND st.name = 'Acoustic Soundstage')
   OR (r.name = 'Zenith Black Box Theatre' AND st.name = 'Green Screen & VFX');
