-- StudioHub demo accounts for Aiven/defaultdb.
-- Run the whole script in DBeaver. Existing emails are preserved.
-- MySQL assigns user_id to avoid collisions with existing Aiven users.
-- All four accounts use the legacy demo password: password123.
START TRANSACTION;

INSERT INTO roles (role_id, role_name, description)
SELECT 1, 'admin', 'Quản trị viên toàn hệ thống'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 1);

INSERT INTO roles (role_id, role_name, description)
SELECT 2, 'host', 'Chủ cơ sở studio'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 2);

INSERT INTO roles (role_id, role_name, description)
SELECT 3, 'customer', 'Khách hàng thuê studio và thiết bị'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 3);

INSERT INTO users (role_id, full_name, email, password_hash, phone, status)
SELECT 1, 'Hệ Thống Admin', 'admin@studio.local',
       '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0900000001', 'active'
WHERE EXISTS (SELECT 1 FROM roles WHERE role_id = 1 AND role_name = 'admin')
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@studio.local');

INSERT INTO users (role_id, full_name, email, password_hash, phone, status)
SELECT 2, 'Nguyễn Hoàng Nam (Artemis)', 'host1@studio.local',
       '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0901234567', 'active'
WHERE EXISTS (SELECT 1 FROM roles WHERE role_id = 2 AND role_name = 'host')
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'host1@studio.local');

INSERT INTO users (role_id, full_name, email, password_hash, phone, status)
SELECT 2, 'Trần Minh Quang (Zenith)', 'host2@studio.local',
       '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0909876543', 'active'
WHERE EXISTS (SELECT 1 FROM roles WHERE role_id = 2 AND role_name = 'host')
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'host2@studio.local');

INSERT INTO users (role_id, full_name, email, password_hash, phone, status)
SELECT 3, 'Lê Thảo My', 'customer@studio.local',
       '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0988776655', 'active'
WHERE EXISTS (SELECT 1 FROM roles WHERE role_id = 3 AND role_name = 'customer')
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'customer@studio.local');

COMMIT;

SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.status
FROM users AS u
JOIN roles AS r ON r.role_id = u.role_id
WHERE u.email IN (
    'admin@studio.local', 'host1@studio.local',
    'host2@studio.local', 'customer@studio.local'
)
ORDER BY u.user_id;
