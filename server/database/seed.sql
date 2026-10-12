-- ==============================================================================
-- Seed Data: Development and Testing
-- Password for all seed users: password123 (bcrypt)
-- ==============================================================================

-- 1. Roles
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'admin', 'Quản trị viên toàn hệ thống'),
(2, 'host', 'Chủ cơ sở studio'),
(3, 'customer', 'Khách hàng thuê studio và thiết bị');

-- 2. Users (1 admin, 2 hosts, 1 customer)
INSERT INTO users (user_id, role_id, full_name, email, password_hash, phone, status) VALUES
(1, 1, 'Hệ Thống Admin', 'admin@studio.local', '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0900000001', 'active'),
(2, 2, 'Nguyễn Hoàng Nam (Artemis)', 'host1@studio.local', '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0901234567', 'active'),
(3, 2, 'Trần Minh Quang (Zenith)', 'host2@studio.local', '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0909876543', 'active'),
(4, 3, 'Lê Thảo My', 'customer@studio.local', '$2y$10$LBhdm6B.McGz4aM8lY902ucaVxMX5clauFsrfm15Lm2igS3vmLRC.', '0988776655', 'active');

-- 3. Studios (2 studios for 2 hosts)
INSERT INTO studios (studio_id, host_id, name, description, address, district, city, phone, status) VALUES
(1, 2, 'Artemis Creative Hub', 'Tổ hợp không gian studio vô cực và concept thời trang cao cấp tại trung tâm', '142 Nguyễn Thị Minh Khai, Phường 6', 'Quận 3', 'TP. Hồ Chí Minh', '0901234567', 'active'),
(2, 3, 'Zenith Studio Space', 'Studio chuyên biệt cho sản xuất podcast, livestream đa luồng và ghi hình chuyên nghiệp', '45 Điện Biên Phủ, Phường 15', 'Bình Thạnh', 'TP. Hồ Chí Minh', '0909876543', 'active');

-- 4. Space Types (7 categories)
INSERT INTO space_types (space_type_id, name, description) VALUES
(1, 'Cyclorama Studio', 'Phông vô cực uốn lượn đa mặt chống bóng'),
(2, 'Lookbook & Fashion', 'Không gian chuyên chụp thời trang và thương mại'),
(3, 'Podcast & Livestream Hub', 'Phòng cách âm chuyên thu âm podcast và phát trực tiếp'),
(4, 'Concept & Set Design', 'Phòng thiết kế bối cảnh nghệ thuật theo chủ đề'),
(5, 'Green Screen & VFX', 'Phông xanh chuẩn kỹ xảo điện ảnh'),
(6, 'Acoustic Soundstage', 'Phòng thu âm cách âm hoàn toàn chuẩn STC cao'),
(7, 'Workshop & Event Studio', 'Không gian đa năng phục vụ hội thảo và workshop');

-- 5. Amenities
INSERT INTO amenities (amenity_id, name, icon) VALUES
(1, 'Wifi 1Gbps Dedicated', 'wifi'),
(2, 'Phòng thay đồ & Makeup riêng', 'user-check'),
(3, 'Điều hòa âm trần 4HP', 'wind'),
(4, 'Bàn ủi hơi nước công nghiệp', 'shirt'),
(5, 'Đèn gương LED Hollywood', 'sun'),
(6, 'Chỗ đậu ô tô & xe máy', 'car'),
(7, 'Pantry trà cafe miễn phí', 'coffee'),
(8, 'Cách âm chuẩn STC 55', 'shield');

-- 6. Rooms
INSERT INTO rooms (room_id, studio_id, name, description, area, ceiling_height, capacity, soundproof_level, power_specs, rules, status) VALUES
(1, 1, 'Artemis Phòng Cyclorama Trắng', 'Phòng vô cực trắng 3 mặt góc cong liền mạch, sàn sơn Epoxy bóng chống trầy', 75.00, 4.50, 15, 'Chuẩn B (Tiêu âm tiêu chuẩn)', '3 pha 32A', 'Bắt buộc dán băng dính đế giày trước khi vào sàn vô cực', 'active'),
(2, 1, 'Artemis Warm Vintage Concept', 'Phòng concept cổ điển ấm áp với nội thất da cao cấp và ánh sáng tự nhiên', 50.00, 3.80, 10, 'Chuẩn Studio', '1 pha 16A', 'Không tự ý di chuyển các đồ vật trang trí nặng', 'active'),
(3, 1, 'Artemis Phòng Sửa Chữa (Maintenance)', 'Phòng đang bảo trì định kỳ hệ thống điều hòa', 40.00, 3.50, 8, 'Chuẩn Studio', '1 pha 16A', 'Tạm ngưng phục vụ', 'maintenance'),
(4, 2, 'Zenith Podcast & Livestream Pro', 'Không gian podcast 4 vị trí gắn micro Shure chuyên nghiệp, cách âm STC 55', 45.00, 3.50, 6, 'Chuẩn A (Cách âm hoàn toàn)', '1 pha 16A', 'Vui lòng đeo tai nghe khi kiểm tra âm thanh', 'active'),
(5, 2, 'Zenith Black Box Theatre', 'Phòng màu đen toàn phần cho quay TVC, workshop kịch và chụp ánh sáng tương phản', 90.00, 5.00, 25, 'Chuẩn B (Tiêu âm tiêu chuẩn)', '3 pha 32A', 'Tắt thiết bị sau khi sử dụng', 'active');

-- 7. Room Space Types
INSERT INTO room_space_types (room_id, space_type_id, is_primary) VALUES
(1, 1, 1),
(1, 2, 0),
(2, 4, 1),
(2, 2, 0),
(3, 2, 1),
(4, 3, 1),
(4, 6, 0),
(5, 7, 1),
(5, 5, 0);

-- 8. Room Amenities
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 1), (2, 2), (2, 3), (2, 7),
(3, 1), (3, 3),
(4, 1), (4, 3), (4, 8),
(5, 1), (5, 3), (5, 6);

-- 9. Room Images
INSERT INTO room_images (image_id, room_id, image_url, is_primary, sort_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', 1, 1),
(2, 1, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', 0, 2),
(3, 2, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7', 1, 1),
(4, 4, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 1, 1),
(5, 5, 'https://images.unsplash.com/photo-1514306191717-452ec28c7814', 1, 1);

-- 10. Room Rates (Áp dụng unit_minutes chuẩn D6: hour=60, half_day=240, day=1440, week=10080, month=43200)
INSERT INTO room_rates (rate_id, room_id, rate_unit, unit_minutes, unit_price, minimum_units, maximum_units, effective_from, effective_to, status) VALUES
(1, 1, 'hour', 60, 350000.00, 1, 12, '2026-01-01', NULL, 'active'),
(2, 1, 'half_day', 240, 1200000.00, 1, 4, '2026-01-01', NULL, 'active'),
(3, 1, 'day', 1440, 2500000.00, 1, 30, '2026-01-01', NULL, 'active'),
(4, 1, 'month', 43200, 45000000.00, 1, 6, '2026-01-01', NULL, 'active'),
(5, 1, 'session', 180, 950000.00, 1, 2, '2026-01-01', NULL, 'active'),
(6, 2, 'hour', 60, 300000.00, 1, 12, '2026-01-01', NULL, 'active'),
(7, 2, 'day', 1440, 2000000.00, 1, 30, '2026-01-01', NULL, 'active'),
(8, 2, 'month', 43200, 38000000.00, 1, 6, '2026-01-01', NULL, 'active'),
(9, 4, 'hour', 60, 400000.00, 1, 8, '2026-01-01', NULL, 'active'),
(10, 4, 'session', 120, 750000.00, 1, 4, '2026-01-01', NULL, 'active'),
(11, 4, 'day', 1440, 2800000.00, 1, 14, '2026-01-01', NULL, 'active'),
(12, 4, 'month', 43200, 50000000.00, 1, 3, '2026-01-01', NULL, 'active'),
(13, 5, 'hour', 60, 500000.00, 1, 12, '2026-01-01', NULL, 'active'),
(14, 5, 'day', 1440, 3500000.00, 1, 30, '2026-01-01', NULL, 'active'),
(15, 5, 'month', 43200, 65000000.00, 1, 6, '2026-01-01', NULL, 'active');

-- 11. Equipment Categories
INSERT INTO equipment_categories (category_id, studio_id, name, description) VALUES
(1, 1, 'Đèn & Nguồn Sáng', 'Hệ thống đèn flash và đèn liên tục chuyên nghiệp'),
(2, 1, 'Softbox & Tản Sáng', 'Các loại softbox bát giác, tản sáng, dù chụp'),
(3, 1, 'Phông Nền & Đạo Cụ', 'Phông giấy màu, nội thất decor phong cách vintage'),
(4, 2, 'Microphone & Thu Âm', 'Micro thu âm định hướng và micro cài áo đa kênh'),
(5, 2, 'Đèn LED Quay Phim', 'Đèn chiếu sáng liên tục công suất cao cho video');

-- 12. Equipments (Hỗ trợ cả pricing_unit hour và session theo D7)
INSERT INTO equipments (equipment_id, studio_id, category_id, name, brand, description, unit_price, pricing_unit, total_quantity, status) VALUES
(1, 1, 1, 'Đèn Godox AD600 Pro', 'Godox', 'Đèn flash ngoài trời và phòng studio công suất 600Ws', 50000.00, 'hour', 4, 'active'),
(2, 1, 2, 'Softbox Bát Giác Nanlite 120cm', 'Nanlite', 'Softbox tản sáng mịn kèm tổ ong định hướng', 80000.00, 'session', 6, 'active'),
(3, 1, 3, 'Phông Giấy Colorama Arctic White', 'Colorama', 'Cuộn phông giấy trắng khổ lớn 2.72m x 11m', 150000.00, 'session', 3, 'active'),
(4, 1, 3, 'Ghế Sofa Da Chesterfield Vintage', 'Handmade', 'Sofa da bò nhập khẩu phong cách hoàng gia Anh', 200000.00, 'session', 2, 'active'),
(5, 2, 4, 'Micro Shure SM7B', 'Shure', 'Micro thu âm giọng nói tiêu chuẩn vàng cho Podcast', 60000.00, 'hour', 4, 'active'),
(6, 2, 5, 'Đèn Aputure 300d Mark II', 'Aputure', 'Đèn LED daylight siêu sáng chỉ số CRI 96+', 80000.00, 'hour', 3, 'active'),
(7, 2, 4, 'Bàn Trộn Âm Thanh Rodecaster Pro II', 'Rode', 'Integrated audio production studio cho 4 người', 250000.00, 'session', 2, 'active');

