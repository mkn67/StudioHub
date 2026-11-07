-- ==============================================================================
-- Seed Data: Development and Testing
-- Password for all seed users: password123 (bcrypt)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

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
INSERT INTO studios (studio_id, host_id, name, description, address, district, city, phone, cover_url, status) VALUES
(1, 2, 'Artemis Creative Hub', 'Tổ hợp không gian studio vô cực và concept thời trang cao cấp tại trung tâm', '142 Nguyễn Thị Minh Khai, Phường 6', 'Quận 3', 'TP. Hồ Chí Minh', '0901234567', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', 'active'),
(2, 3, 'Zenith Studio Space', 'Studio chuyên biệt cho sản xuất podcast, livestream đa luồng và ghi hình chuyên nghiệp', '45 Điện Biên Phủ, Phường 15', 'Bình Thạnh', 'TP. Hồ Chí Minh', '0909876543', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 'active');

-- 4. Space Types (9 categories)
INSERT INTO space_types (space_type_id, name, description, category) VALUES
(1, 'Cyclorama Studio', 'Phông vô cực cong liền mạch cho chụp sản phẩm, chân dung, thời trang và quảng cáo; ánh sáng dễ kiểm soát, không lộ góc nền.', 'Visual & Photo Studio'),
(2, 'Lookbook & Fashion', 'Dành cho lookbook, thời trang, catalog và nội dung thương mại; thường có ánh sáng linh hoạt, khu thay đồ và makeup.', 'Visual & Photo Studio'),
(3, 'Podcast & Livestream Hub', 'Phù hợp podcast, talkshow, phỏng vấn và livestream nhiều người; thường bố trí bàn trò chuyện, micro và xử lý âm học.', 'Livestream & Broadcast'),
(4, 'Concept & Set Design', 'Bối cảnh dựng sẵn như Hàn Quốc, vintage hoặc industrial cho chụp ảnh, quay quảng cáo và video kể chuyện.', 'Visual & Photo Studio'),
(5, 'Green Screen & VFX', 'Phông xanh đồng màu cho quay phim, TVC và video cần tách nền, compositing hoặc kỹ xảo hậu kỳ.', 'Video & Film Production'),
(6, 'Acoustic Soundstage', 'Phim trường ghi hình được xử lý cách âm để quay cảnh trong nhà, thu lời thoại và ghi hình cần kiểm soát tiếng ồn.', 'Video & Film Production'),
(7, 'Workshop & Event Studio', 'Không gian mở, bố trí linh hoạt cho workshop, lớp học, ra mắt sản phẩm, triển lãm nhỏ và sự kiện cộng đồng.', 'Audio & Event'),
(8, 'Livestream & E-commerce', 'Dành cho livestream bán hàng và giới thiệu sản phẩm; thường có mạng LAN riêng, ánh sáng liên tục và khu trưng bày.', 'Livestream & Broadcast'),
(9, 'Music Recording Studio', 'Dùng để thu giọng hát, nhạc cụ, lồng tiếng và sản xuất nhạc; thường có booth, micro và loa kiểm âm.', 'Audio & Event');

-- 5. Amenities
INSERT INTO amenities (amenity_id, name, icon) VALUES
(1, 'Wifi 1Gbps Dedicated', 'wifi'),
(2, 'Phòng thay đồ & Makeup riêng', 'user-check'),
(3, 'Điều hòa âm trần 4HP', 'wind'),
(4, 'Bàn ủi hơi nước công nghiệp', 'shirt'),
(5, 'Đèn gương LED Hollywood', 'sun'),
(6, 'Chỗ đậu ô tô & xe máy', 'car'),
(7, 'Pantry trà cafe miễn phí', 'coffee'),
(8, 'Cách âm chuẩn STC 55', 'shield'),
(9, 'Mạng LAN riêng cho livestream', 'wifi'),
(10, 'Booth thu âm và loa kiểm âm', 'music');

-- 6. Rooms
INSERT INTO rooms (room_id, studio_id, name, description, area, ceiling_height, capacity, soundproof_level, power_specs, rules, status) VALUES
(1, 1, 'Artemis Phòng Cyclorama Trắng', 'Phòng vô cực trắng 3 mặt góc cong liền mạch, sàn sơn Epoxy bóng chống trầy', 75.00, 4.50, 15, 'Chuẩn B (Tiêu âm tiêu chuẩn)', '3 pha 32A', 'Bắt buộc dán băng dính đế giày trước khi vào sàn vô cực', 'active'),
(2, 1, 'Artemis Warm Vintage Concept', 'Phòng concept cổ điển ấm áp với nội thất da cao cấp và ánh sáng tự nhiên', 50.00, 3.80, 10, 'Chuẩn Studio', '1 pha 16A', 'Không tự ý di chuyển các đồ vật trang trí nặng', 'active'),
(3, 1, 'Artemis Phòng Sửa Chữa (Maintenance)', 'Phòng đang bảo trì định kỳ hệ thống điều hòa', 40.00, 3.50, 8, 'Chuẩn Studio', '1 pha 16A', 'Tạm ngưng phục vụ', 'maintenance'),
(4, 2, 'Zenith Podcast & Livestream Pro', 'Không gian podcast 4 vị trí gắn micro Shure chuyên nghiệp, cách âm STC 55', 45.00, 3.50, 6, 'Chuẩn A (Cách âm hoàn toàn)', '1 pha 16A', 'Vui lòng đeo tai nghe khi kiểm tra âm thanh', 'active'),
(5, 2, 'Zenith Black Box Theatre', 'Phòng màu đen toàn phần cho quay TVC, workshop kịch và chụp ánh sáng tương phản', 90.00, 5.00, 25, 'Chuẩn B (Tiêu âm tiêu chuẩn)', '3 pha 32A', 'Tắt thiết bị sau khi sử dụng', 'active'),
(6, 2, 'Zenith Live Commerce', 'Phòng livestream bán hàng với LAN riêng, đèn liên tục và kệ trưng bày sản phẩm', 32.00, 3.20, 8, 'Tiêu âm cơ bản', '1 pha 16A', 'Không ngắt mạng LAN khi đang phát trực tiếp', 'active'),
(7, 2, 'Zenith Music Recording', 'Phòng thu âm nhạc có booth cách âm, micro condenser, loa kiểm âm và DAW workstation', 28.00, 3.00, 5, 'Booth cách âm 2 lớp', '1 pha 16A', 'Giữ mức âm lượng theo hướng dẫn của kỹ thuật viên', 'active'),
(8, 2, 'Zenith Green Screen Stage', 'Phim trường phông xanh liền sàn, phù hợp quay quảng cáo và hậu kỳ kỹ xảo', 65.00, 4.50, 12, 'Tiêu âm cơ bản', '3 pha 32A', 'Không để vật sắc nhọn làm xước phông xanh', 'active'),
(9, 2, 'Zenith Acoustic Soundstage', 'Phim trường ghi hình cách âm, phù hợp thu lời thoại và quay cảnh trong nhà', 72.00, 5.00, 18, 'Cách âm chuẩn STC 55', '3 pha 32A', 'Đóng kín cửa cách âm trong thời gian ghi hình', 'active'),
(10, 1, 'Artemis Daylight Lookbook Loft', 'Phòng chụp lookbook thời trang với cửa sổ lớn, phông di động và khu thay đồ riêng', 58.00, 3.80, 10, 'Tiêu âm cơ bản', '1 pha 16A', 'Hoàn trả trang phục và đạo cụ vào khu vực quy định', 'active'),
(11, 1, 'Artemis Seoul Concept Suite', 'Bối cảnh phong cách Hàn Quốc với góc cafe, cửa sổ giả và ánh sáng mềm cho ảnh thương mại', 46.00, 3.40, 8, 'Tiêu âm cơ bản', '1 pha 16A', 'Không dán vật liệu trực tiếp lên tường bối cảnh', 'active'),
(12, 1, 'Artemis Product Cyclorama', 'Cyclorama trắng riêng cho chụp sản phẩm, mỹ phẩm và catalog thương mại', 42.00, 4.00, 6, 'Tiêu âm cơ bản', '1 pha 16A', 'Dùng tấm bảo vệ sàn khi đặt vật nặng hoặc có bánh xe', 'active'),
(13, 2, 'Zenith Talkshow Podcast Room', 'Phòng talkshow bốn vị trí với bàn tròn, micro thu âm và hệ thống tai nghe kiểm âm', 38.00, 3.20, 6, 'Cách âm chuẩn STC 55', '1 pha 16A', 'Tắt chuông thiết bị cá nhân trong buổi ghi hình', 'active'),
(14, 2, 'Zenith Creator Commerce Set', 'Set livestream thương mại có bàn trưng bày, mạng LAN riêng và đèn liên tục', 36.00, 3.30, 8, 'Tiêu âm cơ bản', '1 pha 16A', 'Không ngắt nguồn mạng khi đang phát trực tiếp', 'active'),
(15, 1, 'Artemis Open Workshop Hall', 'Không gian mở có bàn ghế xếp linh hoạt cho lớp học, workshop và ra mắt sản phẩm', 110.00, 4.20, 40, 'Tiêu âm cơ bản', '3 pha 32A', 'Thu dọn khu vực và phân loại rác sau sự kiện', 'active'),
(16, 2, 'Zenith Vocal Recording Booth', 'Booth thu vocal và lồng tiếng với micro condenser, pop filter và loa kiểm âm', 24.00, 3.00, 4, 'Booth cách âm 2 lớp', '1 pha 16A', 'Không tự thay đổi vị trí thiết bị thu âm', 'active'),
(17, 2, 'Zenith Compact Green Screen', 'Phòng phông xanh gọn cho video quảng cáo, nội dung mạng xã hội và kỹ xảo tách nền', 40.00, 3.60, 7, 'Tiêu âm cơ bản', '1 pha 16A', 'Giữ phông xanh sạch, không chạm giày trực tiếp', 'active');

-- 7. Room Space Types
INSERT INTO room_space_types (room_id, space_type_id, is_primary) VALUES
(1, 1, 1),
(2, 4, 1),
(2, 2, 0),
(4, 3, 1),
(5, 7, 1),
(6, 8, 1),
(7, 9, 1),
(8, 5, 1),
(9, 6, 1),
(10, 2, 1),
(11, 4, 1),
(12, 1, 1),
(13, 3, 1),
(14, 8, 1),
(15, 7, 1),
(16, 9, 1),
(17, 5, 1);

-- 8. Room Amenities
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(2, 1), (2, 2), (2, 3), (2, 7),
(3, 1), (3, 3),
(4, 1), (4, 3), (4, 8),
(5, 1), (5, 3), (5, 6),
(6, 1), (6, 3), (6, 9),
(7, 3), (7, 8), (7, 10),
(8, 1), (8, 3),
(9, 1), (9, 8),
(10, 1), (10, 2),
(11, 1), (11, 5),
(12, 1), (12, 3),
(13, 1), (13, 8),
(14, 1), (14, 9),
(15, 1), (15, 6),
(16, 8), (16, 10),
(17, 1), (17, 3);

-- 9. Room Images
INSERT INTO room_images (image_id, room_id, image_url, is_primary, sort_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', 1, 1),
(2, 1, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', 0, 2),
(3, 2, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7', 1, 1),
(4, 4, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 1, 1),
(5, 5, 'https://images.unsplash.com/photo-1514306191717-452ec28c7814', 1, 1),
(6, 6, 'https://images.unsplash.com/photo-1536240478700-b869070f9279', 1, 1),
(7, 7, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d', 1, 1),
(8, 8, 'https://images.unsplash.com/photo-1485846234645-a62644f84728', 1, 1),
(9, 9, 'https://images.unsplash.com/photo-1485846234645-a62644f84728', 1, 1),
(10, 10, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b', 1, 1),
(11, 11, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7', 1, 1),
(12, 12, 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85', 1, 1),
(13, 13, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 1, 1),
(14, 14, 'https://images.unsplash.com/photo-1536240478700-b869070f9279', 1, 1),
(15, 15, 'https://images.unsplash.com/photo-1514306191717-452ec28c7814', 1, 1),
(16, 16, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d', 1, 1),
(17, 17, 'https://images.unsplash.com/photo-1485846234645-a62644f84728', 1, 1);

-- 10. Room Rates (Áp dụng unit_minutes chuẩn D6: hour=60, half_day=240, day=1440, week=10080, month=43200)
INSERT INTO room_rates (rate_id, room_id, rate_unit, unit_minutes, unit_price, minimum_units, maximum_units, effective_from, effective_to, status) VALUES
(1, 1, 'hour', 60, 350000.00, 2, 12, '2026-01-01', NULL, 'active'),
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
(15, 5, 'month', 43200, 65000000.00, 1, 6, '2026-01-01', NULL, 'active'),
(16, 6, 'session', 180, 850000.00, 1, 2, '2026-01-01', NULL, 'active'),
(17, 6, 'session', 240, 1100000.00, 1, 2, '2026-01-01', NULL, 'active'),
(18, 7, 'hour', 60, 450000.00, 1, 8, '2026-01-01', NULL, 'active'),
(19, 7, 'session', 180, 1200000.00, 1, 2, '2026-01-01', NULL, 'active'),
(20, 8, 'hour', 60, 600000.00, 2, 10, '2026-01-01', NULL, 'active'),
(21, 8, 'day', 1440, 4200000.00, 1, 20, '2026-01-01', NULL, 'active'),
(22, 9, 'hour', 60, 650000.00, 2, 10, '2026-01-01', NULL, 'active'),
(23, 9, 'day', 1440, 4500000.00, 1, 20, '2026-01-01', NULL, 'active'),
(24, 10, 'hour', 60, 320000.00, 2, 10, '2026-01-01', NULL, 'active'),
(25, 10, 'day', 1440, 2200000.00, 1, 20, '2026-01-01', NULL, 'active'),
(26, 11, 'hour', 60, 380000.00, 2, 10, '2026-01-01', NULL, 'active'),
(27, 11, 'half_day', 240, 1350000.00, 1, 5, '2026-01-01', NULL, 'active'),
(28, 12, 'hour', 60, 300000.00, 2, 12, '2026-01-01', NULL, 'active'),
(29, 12, 'day', 1440, 2100000.00, 1, 30, '2026-01-01', NULL, 'active'),
(30, 13, 'hour', 60, 420000.00, 1, 8, '2026-01-01', NULL, 'active'),
(31, 13, 'session', 180, 1150000.00, 1, 3, '2026-01-01', NULL, 'active'),
(32, 14, 'session', 180, 900000.00, 1, 3, '2026-01-01', NULL, 'active'),
(33, 14, 'day', 1440, 3200000.00, 1, 10, '2026-01-01', NULL, 'active'),
(34, 15, 'hour', 60, 550000.00, 2, 12, '2026-01-01', NULL, 'active'),
(35, 15, 'half_day', 240, 1800000.00, 1, 4, '2026-01-01', NULL, 'active'),
(36, 16, 'hour', 60, 350000.00, 1, 8, '2026-01-01', NULL, 'active'),
(37, 16, 'session', 180, 950000.00, 1, 2, '2026-01-01', NULL, 'active'),
(38, 17, 'hour', 60, 420000.00, 2, 10, '2026-01-01', NULL, 'active'),
(39, 17, 'day', 1440, 2900000.00, 1, 20, '2026-01-01', NULL, 'active');

-- 11. Equipment Categories
INSERT INTO equipment_categories (category_id, studio_id, name, description) VALUES
(1, 1, 'Đèn & Nguồn Sáng', 'Hệ thống đèn flash và đèn liên tục chuyên nghiệp'),
(2, 1, 'Softbox & Tản Sáng', 'Các loại softbox bát giác, tản sáng, dù chụp'),
(3, 1, 'Phông Nền & Đạo Cụ', 'Phông giấy màu, nội thất decor phong cách vintage'),
(4, 2, 'Microphone & Thu Âm', 'Micro thu âm định hướng và micro cài áo đa kênh'),
(5, 2, 'Đèn LED Quay Phim', 'Đèn chiếu sáng liên tục công suất cao cho video'),
(6, 2, 'Thiết bị livestream', 'Máy quay, ring light và phụ kiện phát trực tiếp'),
(7, 2, 'Thiết bị thu âm nhạc', 'Micro condenser, MIDI và phụ kiện phòng thu');

-- 12. Equipments (Hỗ trợ cả pricing_unit hour và session theo D7)
INSERT INTO equipments (equipment_id, studio_id, category_id, name, brand, description, unit_price, pricing_unit, total_quantity, image_url, status) VALUES
(1, 1, 1, 'Đèn Godox AD600 Pro', 'Godox', 'Đèn flash ngoài trời và phòng studio công suất 600Ws', 50000.00, 'hour', 4, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', 'active'),
(2, 1, 2, 'Softbox Bát Giác Nanlite 120cm', 'Nanlite', 'Softbox tản sáng mịn kèm tổ ong định hướng', 80000.00, 'session', 6, 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c', 'active'),
(3, 1, 3, 'Phông Giấy Colorama Arctic White', 'Colorama', 'Cuộn phông giấy trắng khổ lớn 2.72m x 11m', 150000.00, 'session', 3, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', 'active'),
(4, 1, 3, 'Ghế Sofa Da Chesterfield Vintage', 'Handmade', 'Sofa da bò nhập khẩu phong cách hoàng gia Anh', 200000.00, 'session', 2, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7', 'active'),
(5, 2, 4, 'Micro Shure SM7B', 'Shure', 'Micro thu âm giọng nói tiêu chuẩn vàng cho Podcast', 60000.00, 'hour', 4, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 'active'),
(6, 2, 5, 'Đèn Aputure 300d Mark II', 'Aputure', 'Đèn LED daylight siêu sáng chỉ số CRI 96+', 80000.00, 'hour', 3, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', 'active'),
(7, 2, 4, 'Bàn Trộn Âm Thanh Rodecaster Pro II', 'Rode', 'Integrated audio production studio cho 4 người', 250000.00, 'session', 2, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', 'active'),
(8, 2, 6, 'Ring Light Livestream 18 inch', 'Neewer', 'Đèn vòng ánh sáng liên tục cho gian hàng trực tuyến', 60000.00, 'session', 4, 'https://images.unsplash.com/photo-1536240478700-b869070f9279', 'active'),
(9, 2, 6, 'Máy quay Sony ZV-E10', 'Sony', 'Máy quay phát trực tiếp kèm nguồn liên tục', 150000.00, 'hour', 2, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32', 'active'),
(10, 2, 7, 'Micro Condenser NT1', 'Rode', 'Micro thu âm giọng hát kèm pop filter', 90000.00, 'hour', 2, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d', 'active'),
(11, 2, 7, 'MIDI Controller 49 phím', 'Arturia', 'Bàn phím MIDI cho sản xuất âm nhạc', 70000.00, 'session', 2, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d', 'active');

-- 13. Studio Policies (booking hold = 15 phút, cọc 30%, hủy trước 24h, hoàn tiền theo tier)
INSERT INTO studio_policies (studio_id, payment_minutes, deposit_percent, cancel_hours, change_hours, refund_tiers, overtime_per_30m, open_hour, close_hour, updated_by) VALUES
(1, 15, 30.00, 24, 24, '[{"hours":48,"percent":100},{"hours":24,"percent":50},{"hours":0,"percent":0}]', 0, 8, 22, 2),
(2, 15, 30.00, 24, 24, '[{"hours":48,"percent":100},{"hours":24,"percent":50},{"hours":0,"percent":0}]', 0, 8, 22, 3);

-- 14. Bookings (Đơn đặt phòng mẫu phục vụ demo màn hình Host và Customer)
INSERT INTO bookings (
    booking_id, booking_code, room_id, customer_id, rate_id, booking_type,
    start_time, end_time, busy_start, busy_end, party_size,
    rate_unit, rental_units, room_unit_price, room_amount, equipment_amount,
    total_amount, deposit_amount, customer_name, customer_phone, customer_email,
    note, status, expires_at, completed_at, policy_snapshot
) VALUES
(
    1, 'BK-20261101-0001', 1, 4, 1, 'short_term',
    '2026-11-01 09:00:00', '2026-11-01 12:00:00', '2026-11-01 09:00:00', '2026-11-01 12:30:00', 4,
    'hour', 3.00, 350000.00, 1050000.00, 300000.00,
    1350000.00, 405000.00, 'Lê Thảo My', '0988776655', 'customer@studio.local',
    'Chụp lookbook bộ sưu tập mùa đông Artemis', 'completed', '2026-11-01 09:00:00', '2026-11-01 12:05:00',
    '{"payment_minutes":15,"deposit_percent":30,"cancel_hours":24,"refund_tiers":[{"hours":48,"percent":100},{"hours":24,"percent":50},{"hours":0,"percent":0}]}'
),
(
    2, 'BK-20261107-0002', 1, 4, 1, 'short_term',
    '2026-11-07 13:00:00', '2026-11-07 16:00:00', '2026-11-07 13:00:00', '2026-11-07 16:30:00', 6,
    'hour', 3.00, 350000.00, 1050000.00, 0.00,
    1050000.00, 315000.00, 'Lê Thảo My', '0988776655', 'customer@studio.local',
    'Quay TVC quảng cáo sản phẩm', 'checked_in', '2026-11-07 13:00:00', NULL,
    '{"payment_minutes":15,"deposit_percent":30,"cancel_hours":24,"refund_tiers":[{"hours":48,"percent":100},{"hours":24,"percent":50},{"hours":0,"percent":0}]}'
),
(
    3, 'BK-20261110-0003', 4, 4, 9, 'short_term',
    '2026-11-10 09:00:00', '2026-11-10 11:00:00', '2026-11-10 09:00:00', '2026-11-10 11:30:00', 4,
    'hour', 2.00, 400000.00, 800000.00, 250000.00,
    1050000.00, 315000.00, 'Lê Thảo My', '0988776655', 'customer@studio.local',
    'Thu âm Podcast chuyên đề Marketing', 'confirmed', '2026-11-10 09:00:00', NULL,
    '{"payment_minutes":15,"deposit_percent":30,"cancel_hours":24,"refund_tiers":[{"hours":48,"percent":100},{"hours":24,"percent":50},{"hours":0,"percent":0}]}'
);

-- 15. Booking Details (Thiết bị thuê kèm trong đơn)
INSERT INTO booking_details (detail_id, booking_id, equipment_id, quantity, pricing_unit, unit_price, equipment_hours, subtotal) VALUES
(1, 1, 1, 2, 'hour', 50000.00, 3.00, 300000.00),
(2, 3, 7, 1, 'session', 250000.00, NULL, 250000.00);

-- 16. Payments (Thanh toán cọc và hoàn tất đơn)
INSERT INTO payments (payment_id, booking_id, payment_type, payment_method, amount, status, transaction_code, idempotency_key, paid_at) VALUES
(1, 1, 'deposit', 'sandbox_qr', 405000.00, 'success', 'PAY-20261101-0001', 'IDEMP-PAY-0001', '2026-10-31 15:30:00'),
(2, 1, 'remaining', 'sandbox_qr', 945000.00, 'success', 'PAY-20261101-0002', 'IDEMP-PAY-0002', '2026-11-01 12:00:00'),
(3, 2, 'deposit', 'sandbox_qr', 315000.00, 'success', 'PAY-20261107-0001', 'IDEMP-PAY-0003', '2026-11-07 10:00:00'),
(4, 3, 'deposit', 'sandbox_qr', 315000.00, 'success', 'PAY-20261108-0001', 'IDEMP-PAY-0004', '2026-11-08 09:15:00');

-- 17. Room Reviews (Đánh giá của khách sau khi hoàn thành đơn)
INSERT INTO room_reviews (review_id, booking_id, room_id, customer_id, rating, review_text, status, created_at) VALUES
(1, 1, 1, 4, 5, 'Phòng Cyclorama rất rộng và sạch sẽ, hệ thống ánh sáng 3 pha công suất cao hoạt động cực tốt. Host nhiệt tình hỗ trợ, sẽ quay lại!', 'published', '2026-11-01 14:00:00');

-- 18. Audit Logs (Nhật ký mẫu)
INSERT INTO audit_logs (log_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES
(1, 4, 'booking_created', 'bookings', 1, '{"booking_code":"BK-20261101-0001","status":"pending"}', '2026-10-31 15:20:00'),
(2, 2, 'booking_status_updated', 'bookings', 1, '{"from":"checked_in","to":"completed"}', '2026-11-01 12:05:00');

SET FOREIGN_KEY_CHECKS = 1;
