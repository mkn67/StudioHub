<?php

declare(strict_types=1);

use App\Core\Db;

require dirname(__DIR__) . '/vendor/autoload.php';

if (class_exists(\Dotenv\Dotenv::class)) {
    \Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
}

$pdo = Db::getConnection();
$database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
$environment = (string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '');
$deploySeed = in_array('--deploy', $argv, true);
if (!$deploySeed && (!in_array($environment, ['dev', 'test'], true) || !preg_match('/_(dev|test)$/', $database))) {
    throw new RuntimeException('Example catalog requires dev/test, or explicit --deploy mode.');
}
if ($deploySeed && (int) $pdo->query('SELECT COUNT(*) FROM rooms')->fetchColumn() > 0) {
    echo "Existing room catalog detected; preserving Aiven data.\n";
    exit(0);
}

function ensureRow(PDO $pdo, string $select, array $selectParams, string $insert, array $insertParams): int
{
    $query = $pdo->prepare($select);
    $query->execute($selectParams);
    $id = $query->fetchColumn();
    if ($id !== false) {
        return (int) $id;
    }
    $query = $pdo->prepare($insert);
    $query->execute($insertParams);
    return (int) $pdo->lastInsertId();
}

$pdo->beginTransaction();
try {
    // Seed only catalog records, and attach them to a real registered host.
    $roles = $pdo->query('SELECT role_id, role_name FROM roles')->fetchAll(PDO::FETCH_KEY_PAIR);
    $users = $pdo->query("SELECT user_id, email, role_id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_ASSOC);
    $requestedHostEmail = strtolower(trim((string) ($_ENV['DEMO_CATALOG_HOST_EMAIL'] ?? getenv('DEMO_CATALOG_HOST_EMAIL') ?: '')));
    $hostId = null;
    $hostIdsByEmail = [];
    foreach ($users as $user) {
        $roleName = strtolower((string) ($roles[$user['role_id']] ?? ''));
        if ($roleName === 'host') {
            $email = strtolower((string) $user['email']);
            $hostIdsByEmail[$email] = (int) $user['user_id'];
            if ($hostId === null && ($requestedHostEmail === '' || $email === $requestedHostEmail)) {
                $hostId = (int) $user['user_id'];
            }
        }
    }
    if ($hostId === null) {
        if ($deploySeed) {
            echo "No active registered host found; catalog seed skipped. Set DEMO_CATALOG_HOST_EMAIL to select one.\n";
            $pdo->rollBack();
            exit(0);
        }
        throw new RuntimeException('An active host account is required for the example catalog.');
    }

    $studioHostIds = [
        'Artemis' => $hostIdsByEmail['host1@studio.local'] ?? $hostId,
        'Zenith' => $hostIdsByEmail['host2@studio.local'] ?? $hostId,
    ];
    $studioIds = [];
    foreach ([
        'Artemis' => ['Artemis Creative Hub', 'Tổ hợp studio sáng tạo với không gian chụp ảnh, concept và workshop.', '142 Nguyễn Thị Minh Khai, Phường 6', 'Quận 3', '0901234567', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04'],
        'Zenith' => ['Zenith Studio Space', 'Studio chuyên biệt cho podcast, livestream, quay phim và ghi âm.', '45 Điện Biên Phủ, Phường 15', 'Bình Thạnh', '0909876543', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc'],
    ] as $key => [$name, $description, $address, $district, $phone, $cover]) {
        $studioHostId = $studioHostIds[$key];
        $studioIds[$key] = ensureRow(
            $pdo,
            'SELECT studio_id FROM studios WHERE host_id = ? AND name = ?',
            [$studioHostId, $name],
            'INSERT INTO studios (host_id, name, description, address, district, city, phone, cover_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$studioHostId, $name, $description, $address, $district, 'TP. Hồ Chí Minh', $phone, $cover, 'active']
        );
    }

    $types = [];
    foreach ([
        ['Cyclorama Studio', 'Phông vô cực cong liền mạch cho chụp sản phẩm, chân dung, thời trang và quảng cáo; ánh sáng dễ kiểm soát, không lộ góc nền.', 'Visual & Photo Studio'],
        ['Lookbook & Fashion', 'Dành cho lookbook, thời trang, catalog và nội dung thương mại; thường có ánh sáng linh hoạt, khu thay đồ và makeup.', 'Visual & Photo Studio'],
        ['Podcast & Livestream Hub', 'Phù hợp podcast, talkshow, phỏng vấn và livestream nhiều người; thường bố trí bàn trò chuyện, micro và xử lý âm học.', 'Livestream & Broadcast'],
        ['Concept & Set Design', 'Bối cảnh dựng sẵn như Hàn Quốc, vintage hoặc industrial cho chụp ảnh, quay quảng cáo và video kể chuyện.', 'Visual & Photo Studio'],
        ['Green Screen & VFX', 'Phông xanh đồng màu cho quay phim, TVC và video cần tách nền, compositing hoặc kỹ xảo hậu kỳ.', 'Video & Film Production'],
        ['Acoustic Soundstage', 'Phim trường ghi hình được xử lý cách âm để quay cảnh trong nhà, thu lời thoại và ghi hình cần kiểm soát tiếng ồn.', 'Video & Film Production'],
        ['Workshop & Event Studio', 'Không gian mở, bố trí linh hoạt cho workshop, lớp học, ra mắt sản phẩm, triển lãm nhỏ và sự kiện cộng đồng.', 'Audio & Event'],
        ['Livestream & E-commerce', 'Dành cho livestream bán hàng và giới thiệu sản phẩm; thường có mạng LAN riêng, ánh sáng liên tục và khu trưng bày.', 'Livestream & Broadcast'],
        ['Music Recording Studio', 'Dùng để thu giọng hát, nhạc cụ, lồng tiếng và sản xuất nhạc; thường có booth, micro và loa kiểm âm.', 'Audio & Event'],
    ] as [$name, $description, $category]) {
        $types[$name] = ensureRow(
            $pdo,
            'SELECT space_type_id FROM space_types WHERE name = ?',
            [$name],
            'INSERT INTO space_types (name, description, category) VALUES (?, ?, ?)',
            [$name, $description, $category]
        );
    }
    $hostRoomTypeIds = [];
    foreach ($studioIds as $studioId) {
        foreach ($types as $spaceTypeId) {
            $hostRoomTypeIds[$studioId][$spaceTypeId] = ensureRow(
                $pdo,
                'SELECT room_type_id FROM host_room_types WHERE studio_id = ? AND name = (SELECT name FROM space_types WHERE space_type_id = ?)',
                [$studioId, $spaceTypeId],
                "INSERT INTO host_room_types (studio_id, name, description, status) SELECT ?, name, description, 'active' FROM space_types WHERE space_type_id = ?",
                [$studioId, $spaceTypeId]
            );
        }
    }
    $amenities = [];
    foreach ([
        ['Wifi 1Gbps Dedicated', 'wifi'],
        ['Phòng thay đồ & Makeup riêng', 'user-check'],
        ['Mạng LAN riêng cho livestream', 'wifi'],
        ['Booth thu âm và loa kiểm âm', 'music'],
        ['Phông xanh và hệ thống treo đèn', 'video'],
        ['Cách âm chuẩn STC 55', 'shield'],
        ['Đạo cụ và bối cảnh chụp ảnh', 'aperture'],
        ['Bàn ghế xếp cho workshop', 'armchair'],
    ] as [$name, $icon]) {
        $amenities[$name] = ensureRow(
            $pdo,
            'SELECT amenity_id FROM amenities WHERE name = ?',
            [$name],
            'INSERT INTO amenities (name, icon) VALUES (?, ?)',
            [$name, $icon]
        );
    }

    $rooms = [
        [
            'studio' => 'Artemis', 'name' => 'Artemis Phòng Cyclorama Trắng',
            'description' => 'Phòng vô cực trắng 3 mặt góc cong liền mạch, sàn sơn Epoxy bóng chống trầy',
            'area' => 75, 'height' => 4.5, 'capacity' => 15,
            'soundproof' => 'Chuẩn B (Tiêu âm tiêu chuẩn)', 'power' => '3 pha 32A',
            'rules' => 'Bắt buộc dán băng dính đế giày trước khi vào sàn vô cực',
            'type' => $types['Cyclorama Studio'], 'amenity' => $amenities['Phòng thay đồ & Makeup riêng'],
            'image' => 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04',
            'rates' => [['hour', 60, 350000, 2, 12], ['half_day', 240, 1200000, 1, 4], ['day', 1440, 2500000, 1, 30], ['month', 43200, 45000000, 1, 6], ['session', 180, 950000, 1, 2]],
        ],
        [
            'studio' => 'Artemis', 'name' => 'Artemis Warm Vintage Concept',
            'description' => 'Phòng concept cổ điển ấm áp với nội thất da cao cấp và ánh sáng tự nhiên',
            'area' => 50, 'height' => 3.8, 'capacity' => 10,
            'soundproof' => 'Chuẩn Studio', 'power' => '1 pha 16A',
            'rules' => 'Không tự ý di chuyển các đồ vật trang trí nặng',
            'type' => $types['Concept & Set Design'], 'amenity' => $amenities['Đạo cụ và bối cảnh chụp ảnh'],
            'image' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
            'rates' => [['hour', 60, 300000, 1, 12], ['day', 1440, 2000000, 1, 30]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Podcast & Livestream Pro',
            'description' => 'Không gian podcast 4 vị trí micro, cách âm STC 55, phù hợp talkshow và ghi hình trực tiếp',
            'area' => 45, 'height' => 3.5, 'capacity' => 6,
            'soundproof' => 'Chuẩn A (Cách âm hoàn toàn)', 'power' => '1 pha 16A',
            'rules' => 'Vui lòng đeo tai nghe khi kiểm tra âm thanh',
            'type' => $types['Podcast & Livestream Hub'], 'amenity' => $amenities['Cách âm chuẩn STC 55'],
            'image' => 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc',
            'rates' => [['hour', 60, 420000, 1, 8], ['session', 180, 1150000, 1, 3]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Black Box Theatre',
            'description' => 'Phòng màu đen toàn phần cho quay TVC, workshop kịch và chụp ánh sáng tương phản',
            'area' => 90, 'height' => 5, 'capacity' => 25,
            'soundproof' => 'Chuẩn B (Tiêu âm tiêu chuẩn)', 'power' => '3 pha 32A',
            'rules' => 'Tắt thiết bị sau khi sử dụng',
            'type' => $types['Workshop & Event Studio'], 'amenity' => $amenities['Bàn ghế xếp cho workshop'],
            'image' => 'https://images.unsplash.com/photo-1514306191717-452ec28c7814',
            'rates' => [['hour', 60, 550000, 2, 12], ['half_day', 240, 1800000, 1, 4]],
        ],
        [
            'name' => 'Zenith Live Commerce',
            'description' => 'Phòng livestream bán hàng với LAN riêng, đèn liên tục và kệ trưng bày sản phẩm',
            'area' => 32, 'height' => 3.2, 'capacity' => 8,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Không ngắt mạng LAN khi đang phát trực tiếp',
            'type' => $types['Livestream & E-commerce'],
            'amenity' => $amenities['Mạng LAN riêng cho livestream'],
            'image' => 'https://images.unsplash.com/photo-1536240478700-b869070f9279',
            'rates' => [['session', 180, 850000, 1, 2], ['session', 240, 1100000, 1, 2]],
        ],
        [
            'name' => 'Zenith Music Recording',
            'description' => 'Phòng thu âm nhạc có booth cách âm, micro condenser, loa kiểm âm và DAW workstation',
            'area' => 28, 'height' => 3, 'capacity' => 5,
            'soundproof' => 'Booth cách âm 2 lớp', 'power' => '1 pha 16A',
            'rules' => 'Giữ mức âm lượng theo hướng dẫn của kỹ thuật viên',
            'type' => $types['Music Recording Studio'],
            'amenity' => $amenities['Booth thu âm và loa kiểm âm'],
            'image' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
            'rates' => [['hour', 60, 450000, 1, 8], ['session', 180, 1200000, 1, 2]],
        ],
        [
            'name' => 'Zenith Green Screen Stage',
            'description' => 'Phim trường phông xanh liền sàn, phù hợp quay quảng cáo và hậu kỳ kỹ xảo',
            'area' => 65, 'height' => 4.5, 'capacity' => 12,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '3 pha 32A',
            'rules' => 'Không để vật sắc nhọn làm xước phông xanh',
            'type' => $types['Green Screen & VFX'],
            'amenity' => $amenities['Phông xanh và hệ thống treo đèn'],
            'image' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728',
            'rates' => [['hour', 60, 600000, 2, 10], ['day', 1440, 4200000, 1, 20]],
        ],
        [
            'name' => 'Zenith Acoustic Soundstage',
            'description' => 'Phim trường ghi hình cách âm, phù hợp thu lời thoại và quay cảnh trong nhà',
            'area' => 72, 'height' => 5, 'capacity' => 18,
            'soundproof' => 'Cách âm chuẩn STC 55', 'power' => '3 pha 32A',
            'rules' => 'Đóng kín cửa cách âm trong thời gian ghi hình',
            'type' => $types['Acoustic Soundstage'],
            'amenity' => $amenities['Cách âm chuẩn STC 55'],
            'image' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728',
            'rates' => [['hour', 60, 650000, 2, 10], ['day', 1440, 4500000, 1, 20]],
        ],
        [
            'studio' => 'Artemis', 'name' => 'Artemis Daylight Lookbook Loft',
            'description' => 'Phòng chụp lookbook thời trang với cửa sổ lớn, phông di động và khu thay đồ riêng',
            'area' => 58, 'height' => 3.8, 'capacity' => 10,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Hoàn trả trang phục và đạo cụ vào khu vực quy định',
            'type' => $types['Lookbook & Fashion'], 'amenity' => $amenities['Phòng thay đồ & Makeup riêng'],
            'image' => 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
            'rates' => [['hour', 60, 320000, 2, 10], ['day', 1440, 2200000, 1, 20]],
        ],
        [
            'studio' => 'Artemis', 'name' => 'Artemis Seoul Concept Suite',
            'description' => 'Bối cảnh phong cách Hàn Quốc với góc cafe, cửa sổ giả và ánh sáng mềm cho ảnh thương mại',
            'area' => 46, 'height' => 3.4, 'capacity' => 8,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Không dán vật liệu trực tiếp lên tường bối cảnh',
            'type' => $types['Concept & Set Design'], 'amenity' => $amenities['Đạo cụ và bối cảnh chụp ảnh'],
            'image' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
            'rates' => [['hour', 60, 380000, 2, 10], ['half_day', 240, 1350000, 1, 5]],
        ],
        [
            'studio' => 'Artemis', 'name' => 'Artemis Product Cyclorama',
            'description' => 'Cyclorama trắng riêng cho chụp sản phẩm, mỹ phẩm và catalog thương mại',
            'area' => 42, 'height' => 4, 'capacity' => 6,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Dùng tấm bảo vệ sàn khi đặt vật nặng hoặc có bánh xe',
            'type' => $types['Cyclorama Studio'], 'amenity' => $amenities['Wifi 1Gbps Dedicated'],
            'image' => 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85',
            'rates' => [['hour', 60, 300000, 2, 12], ['day', 1440, 2100000, 1, 30]],
        ],
        [
            'studio' => 'Artemis', 'name' => 'Artemis Open Workshop Hall',
            'description' => 'Không gian mở có bàn ghế xếp linh hoạt cho lớp học, workshop và ra mắt sản phẩm',
            'area' => 110, 'height' => 4.2, 'capacity' => 40,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '3 pha 32A',
            'rules' => 'Thu dọn khu vực và phân loại rác sau sự kiện',
            'type' => $types['Workshop & Event Studio'], 'amenity' => $amenities['Bàn ghế xếp cho workshop'],
            'image' => 'https://images.unsplash.com/photo-1514306191717-452ec28c7814',
            'rates' => [['hour', 60, 550000, 2, 12], ['half_day', 240, 1800000, 1, 4]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Talkshow Podcast Room',
            'description' => 'Phòng talkshow bốn vị trí với bàn tròn, micro thu âm và hệ thống tai nghe kiểm âm',
            'area' => 38, 'height' => 3.2, 'capacity' => 6,
            'soundproof' => 'Cách âm chuẩn STC 55', 'power' => '1 pha 16A',
            'rules' => 'Tắt chuông thiết bị cá nhân trong buổi ghi hình',
            'type' => $types['Podcast & Livestream Hub'], 'amenity' => $amenities['Cách âm chuẩn STC 55'],
            'image' => 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc',
            'rates' => [['hour', 60, 420000, 1, 8], ['session', 180, 1150000, 1, 3]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Creator Commerce Set',
            'description' => 'Set livestream thương mại có bàn trưng bày, mạng LAN riêng và đèn liên tục',
            'area' => 36, 'height' => 3.3, 'capacity' => 8,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Không ngắt nguồn mạng khi đang phát trực tiếp',
            'type' => $types['Livestream & E-commerce'], 'amenity' => $amenities['Mạng LAN riêng cho livestream'],
            'image' => 'https://images.unsplash.com/photo-1536240478700-b869070f9279',
            'rates' => [['session', 180, 900000, 1, 3], ['day', 1440, 3200000, 1, 10]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Vocal Recording Booth',
            'description' => 'Booth thu vocal và lồng tiếng với micro condenser, pop filter và loa kiểm âm',
            'area' => 24, 'height' => 3, 'capacity' => 4,
            'soundproof' => 'Booth cách âm 2 lớp', 'power' => '1 pha 16A',
            'rules' => 'Không tự thay đổi vị trí thiết bị thu âm',
            'type' => $types['Music Recording Studio'], 'amenity' => $amenities['Booth thu âm và loa kiểm âm'],
            'image' => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
            'rates' => [['hour', 60, 350000, 1, 8], ['session', 180, 950000, 1, 2]],
        ],
        [
            'studio' => 'Zenith', 'name' => 'Zenith Compact Green Screen',
            'description' => 'Phòng phông xanh gọn cho video quảng cáo, nội dung mạng xã hội và kỹ xảo tách nền',
            'area' => 40, 'height' => 3.6, 'capacity' => 7,
            'soundproof' => 'Tiêu âm cơ bản', 'power' => '1 pha 16A',
            'rules' => 'Giữ phông xanh sạch, không chạm giày trực tiếp',
            'type' => $types['Green Screen & VFX'], 'amenity' => $amenities['Phông xanh và hệ thống treo đèn'],
            'image' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728',
            'rates' => [['hour', 60, 420000, 2, 10], ['day', 1440, 2900000, 1, 20]],
        ],
    ];
    foreach ($rooms as $room) {
        $studioId = (int) $studioIds[$room['studio'] ?? 'Zenith'];
        $roomId = ensureRow(
            $pdo,
            'SELECT room_id FROM rooms WHERE studio_id = ? AND name = ?',
            [$studioId, $room['name']],
            'INSERT INTO rooms (studio_id, room_type_id, name, description, area, ceiling_height, capacity, soundproof_level, power_specs, rules, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$studioId, $hostRoomTypeIds[$studioId][$room['type']], $room['name'], $room['description'], $room['area'], $room['height'], $room['capacity'], $room['soundproof'], $room['power'], $room['rules'], 'active']
        );
        $attachType = $pdo->prepare('UPDATE rooms SET room_type_id = ? WHERE room_id = ? AND room_type_id IS NULL');
        $attachType->execute([$hostRoomTypeIds[$studioId][$room['type']], $roomId]);
        $link = $pdo->prepare('INSERT IGNORE INTO room_space_types (room_id, space_type_id, is_primary) VALUES (?, ?, 1)');
        $link->execute([$roomId, $room['type']]);
        $link = $pdo->prepare('INSERT IGNORE INTO room_amenities (room_id, amenity_id) VALUES (?, ?)');
        $link->execute([$roomId, $room['amenity']]);
        $image = $pdo->prepare('SELECT image_id FROM room_images WHERE room_id = ? AND image_url = ?');
        $image->execute([$roomId, $room['image']]);
        if (!$image->fetchColumn()) {
            $image = $pdo->prepare('INSERT INTO room_images (room_id, image_url, is_primary, sort_order) VALUES (?, ?, 1, 1)');
            $image->execute([$roomId, $room['image']]);
        }
        foreach ($room['rates'] as [$unit, $minutes, $price, $minimum, $maximum]) {
            ensureRow(
                $pdo,
                'SELECT rate_id FROM room_rates WHERE room_id = ? AND rate_unit = ? AND unit_minutes = ?',
                [$roomId, $unit, $minutes],
                'INSERT INTO room_rates (room_id, rate_unit, unit_minutes, unit_price, minimum_units, maximum_units, effective_from, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$roomId, $unit, $minutes, $price, $minimum, $maximum, '2026-01-01', 'active']
            );
        }
    }

    $zenithStudioId = (int) $studioIds['Zenith'];
    $categories = [];
    foreach (['Thiết bị livestream', 'Thiết bị thu âm nhạc'] as $name) {
        $categories[$name] = ensureRow(
            $pdo,
            'SELECT category_id FROM equipment_categories WHERE studio_id = ? AND name = ?',
            [$zenithStudioId, $name],
            'INSERT INTO equipment_categories (studio_id, name) VALUES (?, ?)',
            [$zenithStudioId, $name]
        );
    }
    foreach ([
        [$categories['Thiết bị livestream'], 'Ring Light Livestream 18 inch', 'Neewer', 60000, 'session', 4],
        [$categories['Thiết bị livestream'], 'Máy quay Sony ZV-E10', 'Sony', 150000, 'hour', 2],
        [$categories['Thiết bị thu âm nhạc'], 'Micro Condenser NT1', 'Rode', 90000, 'hour', 2],
        [$categories['Thiết bị thu âm nhạc'], 'MIDI Controller 49 phím', 'Arturia', 70000, 'session', 2],
    ] as [$categoryId, $name, $brand, $price, $unit, $quantity]) {
        ensureRow(
            $pdo,
            'SELECT equipment_id FROM equipments WHERE studio_id = ? AND name = ?',
            [$zenithStudioId, $name],
            'INSERT INTO equipments (studio_id, category_id, name, brand, unit_price, pricing_unit, total_quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$zenithStudioId, $categoryId, $name, $brand, $price, $unit, $quantity, 'active']
        );
    }
    $pdo->commit();
    echo "Example room catalog ready for host {$hostId}.\n";
} catch (Throwable $error) {
    $pdo->rollBack();
    throw $error;
}
