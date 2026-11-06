UPDATE space_types SET description = CASE name
    WHEN 'Cyclorama Studio' THEN 'Phông vô cực cong liền mạch cho chụp sản phẩm, chân dung, thời trang và quảng cáo; ánh sáng dễ kiểm soát, không lộ góc nền.'
    WHEN 'Lookbook & Fashion' THEN 'Dành cho lookbook, thời trang, catalog và nội dung thương mại; thường có ánh sáng linh hoạt, khu thay đồ và makeup.'
    WHEN 'Podcast & Livestream Hub' THEN 'Phù hợp podcast, talkshow, phỏng vấn và livestream nhiều người; thường bố trí bàn trò chuyện, micro và xử lý âm học.'
    WHEN 'Concept & Set Design' THEN 'Bối cảnh dựng sẵn như Hàn Quốc, vintage hoặc industrial cho chụp ảnh, quay quảng cáo và video kể chuyện.'
    WHEN 'Green Screen & VFX' THEN 'Phông xanh đồng màu cho quay phim, TVC và video cần tách nền, compositing hoặc kỹ xảo hậu kỳ.'
    WHEN 'Acoustic Soundstage' THEN 'Phim trường ghi hình được xử lý cách âm để quay cảnh trong nhà, thu lời thoại và ghi hình cần kiểm soát tiếng ồn.'
    WHEN 'Workshop & Event Studio' THEN 'Không gian mở, bố trí linh hoạt cho workshop, lớp học, ra mắt sản phẩm, triển lãm nhỏ và sự kiện cộng đồng.'
    WHEN 'Livestream & E-commerce' THEN 'Dành cho livestream bán hàng và giới thiệu sản phẩm; thường có mạng LAN riêng, ánh sáng liên tục và khu trưng bày.'
    WHEN 'Music Recording Studio' THEN 'Dùng để thu giọng hát, nhạc cụ, lồng tiếng và sản xuất nhạc; thường có booth, micro và loa kiểm âm.'
    ELSE description
END;

UPDATE host_room_types host_type
JOIN space_types space_type ON space_type.name = host_type.name
SET host_type.description = space_type.description;

DELETE rst
FROM room_space_types rst
JOIN rooms room ON room.room_id = rst.room_id
JOIN space_types type ON type.space_type_id = rst.space_type_id
WHERE room.name = 'Artemis Phòng Cyclorama Trắng'
  AND type.name = 'Lookbook & Fashion';

DELETE rst
FROM room_space_types rst
JOIN rooms room ON room.room_id = rst.room_id
WHERE room.name = 'Artemis Phòng Sửa Chữa (Maintenance)';

UPDATE rooms
SET room_type_id = NULL
WHERE name = 'Artemis Phòng Sửa Chữa (Maintenance)'
  AND status = 'maintenance';
