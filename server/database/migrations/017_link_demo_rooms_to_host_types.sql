-- The demo seed can insert rooms after the original type migration has run.
-- Supply the built-in types only for demo studios with no types yet.
INSERT INTO host_room_types (studio_id, name, description, status)
SELECT s.studio_id, t.name, t.description, 'active'
FROM studios s
CROSS JOIN space_types t
WHERE s.name IN ('Artemis Creative Hub', 'Zenith Studio Space')
  AND t.category <> 'Other'
  AND NOT EXISTS (
      SELECT 1 FROM host_room_types existing WHERE existing.studio_id = s.studio_id
  );

-- Link only unassigned rooms when the host type has the exact name of the
-- room's primary public space type. Never replace a host-selected type.
UPDATE rooms r
JOIN room_space_types rst ON rst.room_id = r.room_id AND rst.is_primary = 1
JOIN space_types st ON st.space_type_id = rst.space_type_id
JOIN host_room_types hrt ON hrt.studio_id = r.studio_id AND hrt.name = st.name
SET r.room_type_id = hrt.room_type_id
WHERE r.room_type_id IS NULL;
