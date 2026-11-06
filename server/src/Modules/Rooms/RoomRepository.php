<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Core\Db;
use PDO;

class RoomRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Search active rooms belonging to active studios with pagination and filters.
     * Prevents N+1 queries by batch-loading relations.
     *
     * @param array{
     *     keyword?: ?string,
     *     space_type_id?: ?int,
     *     rate_unit?: string,
     *     min_price?: ?float,
     *     max_price?: ?float,
     *     min_area?: ?float,
 *     min_capacity?: ?int,
 *     district?: ?string,
 *     amenity_id?: ?int,
 *     available_from?: ?string,
 *     available_to?: ?string,
 *     sort?: string,
     *     page?: int,
     *     limit?: int
     * } $filters
     * @return array{items: array, total_items: int}
     */
    public function searchRooms(array $filters): array
    {
        $rateUnit = $filters['rate_unit'] ?? 'hour';
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min(50, (int) ($filters['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;

        $where = ["r.status = 'active'", "s.status = 'active'"];
        $params = [];

        // Filter: Keyword (room name or studio name)
        if (!empty($filters['keyword'])) {
            $where[] = '(r.name LIKE :kw_room OR s.name LIKE :kw_studio)';
            $kw = '%' . trim((string) $filters['keyword']) . '%';
            $params['kw_room'] = $kw;
            $params['kw_studio'] = $kw;
        }

        // Filter: Space type
        if (!empty($filters['space_type_id'])) {
            $where[] = 'EXISTS (SELECT 1 FROM room_space_types rst WHERE rst.room_id = r.room_id AND rst.space_type_id = :space_type_id)';
            $params['space_type_id'] = (int) $filters['space_type_id'];
        }

        // Filter: Min area
        if (isset($filters['min_area']) && is_numeric($filters['min_area'])) {
            $where[] = 'r.area >= :min_area';
            $params['min_area'] = (float) $filters['min_area'];
        }

        if (isset($filters['min_capacity'])) {
            $where[] = 'r.capacity >= :min_capacity';
            $params['min_capacity'] = (int) $filters['min_capacity'];
        }
        if (!empty($filters['district'])) {
            $where[] = 's.district LIKE :district';
            $params['district'] = '%' . trim((string) $filters['district']) . '%';
        }
        if (isset($filters['amenity_id'])) {
            $where[] = 'EXISTS (SELECT 1 FROM room_amenities ra_filter WHERE ra_filter.room_id = r.room_id AND ra_filter.amenity_id = :amenity_id)';
            $params['amenity_id'] = (int) $filters['amenity_id'];
        }
        if (!empty($filters['available_from']) && !empty($filters['available_to'])) {
            $busyTo = (new \DateTimeImmutable((string) $filters['available_to']))->modify('+' . max(0, (int) ($_ENV['BUFFER_MINUTES'] ?? 30)) . ' minutes')->format('Y-m-d H:i:s');
            $where[] = "NOT EXISTS (SELECT 1 FROM bookings b_filter WHERE b_filter.room_id = r.room_id AND (b_filter.status IN ('confirmed','checked_in') OR (b_filter.status = 'pending' AND b_filter.expires_at > NOW())) AND b_filter.busy_start < :available_to AND b_filter.busy_end > :available_from)";
            $params['available_to'] = $busyTo;
            $params['available_from'] = (string) $filters['available_from'];
        }

        // Filter: Price (based on min active rate of the specified rate_unit)
        // If price filter is applied, rooms without active rate for that rate_unit are automatically excluded
        if (isset($filters['min_price']) && is_numeric($filters['min_price'])) {
            $where[] = "(
                SELECT MIN(rr.unit_price)
                FROM room_rates rr
                WHERE rr.room_id = r.room_id
                  AND rr.rate_unit = :rate_unit_min
                  AND rr.status = 'active'
                  AND rr.effective_from <= CURDATE()
                  AND (rr.effective_to IS NULL OR rr.effective_to >= CURDATE())
            ) >= :min_price";
            $params['rate_unit_min'] = $rateUnit;
            $params['min_price'] = (float) $filters['min_price'];
        }

        if (isset($filters['max_price']) && is_numeric($filters['max_price'])) {
            $where[] = "(
                SELECT MIN(rr.unit_price)
                FROM room_rates rr
                WHERE rr.room_id = r.room_id
                  AND rr.rate_unit = :rate_unit_max
                  AND rr.status = 'active'
                  AND rr.effective_from <= CURDATE()
                  AND (rr.effective_to IS NULL OR rr.effective_to >= CURDATE())
            ) <= :max_price";
            $params['rate_unit_max'] = $rateUnit;
            $params['max_price'] = (float) $filters['max_price'];
        }

        $whereClause = implode(' AND ', $where);

        // 1. Get total items
        $countSql = "
            SELECT COUNT(*)
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE {$whereClause}
        ";
        $countStmt = $this->pdo->prepare($countSql);
        foreach ($params as $key => $val) {
            $countStmt->bindValue($key, $val);
        }
        $countStmt->execute();
        $totalItems = (int) $countStmt->fetchColumn();

        if ($totalItems === 0) {
            return [
                'items' => [],
                'total_items' => 0,
            ];
        }

        // 2. Fetch page of room rows
        $rateSort = "(SELECT MIN(rs.unit_price) FROM room_rates rs WHERE rs.room_id = r.room_id AND rs.rate_unit = :sort_rate_unit AND rs.status = 'active' AND rs.effective_from <= CURDATE() AND (rs.effective_to IS NULL OR rs.effective_to >= CURDATE()))";
        $orderBy = match ($filters['sort'] ?? 'recommended') {
            'price_asc' => "COALESCE($rateSort, 999999999999) ASC, r.room_id ASC",
            'price_desc' => "$rateSort DESC, r.room_id ASC",
            'area_desc' => 'r.area DESC, r.room_id ASC',
            'capacity_desc' => 'r.capacity DESC, r.room_id ASC',
            'newest' => 'r.created_at DESC, r.room_id DESC',
            default => 'r.room_id ASC',
        };
        if (str_contains($orderBy, ':sort_rate_unit')) {
            $params['sort_rate_unit'] = $rateUnit;
        }
        $selectSql = "
            SELECT r.room_id,
                   r.studio_id,
                   r.name,
                   r.description,
                   r.area,
                   r.ceiling_height,
                   r.capacity,
                   r.soundproof_level,
                   r.status,
                   s.name as studio_name,
                   s.address as studio_address,
                   s.district as studio_district,
                   s.city as studio_city
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE {$whereClause}
            ORDER BY {$orderBy}
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->pdo->prepare($selectSql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $roomRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($roomRows)) {
            return [
                'items' => [],
                'total_items' => $totalItems,
            ];
        }

        $roomIds = array_map(fn($row) => (int) $row['room_id'], $roomRows);
        $inPlaceholders = implode(',', array_fill(0, count($roomIds), '?'));

        // 3. Batch fetch primary space type
        $primaryTypesStmt = $this->pdo->prepare("
            SELECT rst.room_id, st.space_type_id, st.name, st.category, st.description
            FROM room_space_types rst
            JOIN space_types st ON rst.space_type_id = st.space_type_id
            WHERE rst.room_id IN ({$inPlaceholders}) AND rst.is_primary = 1
        ");
        $primaryTypesStmt->execute($roomIds);
        $primaryTypeMap = [];
        while ($row = $primaryTypesStmt->fetch(PDO::FETCH_ASSOC)) {
            $primaryTypeMap[(int) $row['room_id']] = [
                'space_type_id' => (int) $row['space_type_id'],
                'name'          => $row['name'],
                'category'      => $row['category'],
                'description'   => $row['description'],
            ];
        }

        // 4. Batch fetch primary thumbnail
        $thumbnailsStmt = $this->pdo->prepare("
            SELECT room_id, image_url
            FROM room_images
            WHERE room_id IN ({$inPlaceholders}) AND is_primary = 1
            ORDER BY sort_order ASC, image_id ASC
        ");
        $thumbnailsStmt->execute($roomIds);
        $thumbnailMap = [];
        while ($row = $thumbnailsStmt->fetch(PDO::FETCH_ASSOC)) {
            $rId = (int) $row['room_id'];
            if (!isset($thumbnailMap[$rId])) {
                $thumbnailMap[$rId] = $row['image_url'];
            }
        }

        // 5. Batch fetch amenities
        $amenitiesStmt = $this->pdo->prepare("
            SELECT ra.room_id, a.amenity_id, a.name, a.icon
            FROM room_amenities ra
            JOIN amenities a ON ra.amenity_id = a.amenity_id
            WHERE ra.room_id IN ({$inPlaceholders})
            ORDER BY a.amenity_id ASC
        ");
        $amenitiesStmt->execute($roomIds);
        $amenitiesMap = [];
        while ($row = $amenitiesStmt->fetch(PDO::FETCH_ASSOC)) {
            $rId = (int) $row['room_id'];
            $amenitiesMap[$rId][] = [
                'amenity_id' => (int) $row['amenity_id'],
                'name'       => $row['name'],
                'icon'       => $row['icon'],
            ];
        }

        $reviewsStmt = $this->pdo->prepare("SELECT room_id, COUNT(*) AS review_count, AVG(rating) AS average_rating FROM room_reviews WHERE status = 'published' AND room_id IN ({$inPlaceholders}) GROUP BY room_id");
        $reviewsStmt->execute($roomIds);
        $reviewSummaryMap = [];
        while ($row = $reviewsStmt->fetch(PDO::FETCH_ASSOC)) {
            $reviewSummaryMap[(int) $row['room_id']] = [
                'review_count' => (int) $row['review_count'],
                'average_rating' => round((float) $row['average_rating'], 1),
            ];
        }

        // 6. Prefer the requested unit, then show a real active package for rooms
        // that only offer another unit (for example fixed livestream sessions).
        $rateStmt = $this->pdo->prepare("
            SELECT room_id, rate_unit, unit_price, unit_minutes
            FROM room_rates
            WHERE room_id IN ({$inPlaceholders})
              AND status = 'active'
              AND effective_from <= CURDATE()
              AND (effective_to IS NULL OR effective_to >= CURDATE())
            ORDER BY room_id, CASE WHEN rate_unit = ? THEN 0 ELSE 1 END,
                     unit_price ASC, unit_minutes ASC
        ");
        $rateStmt->execute([...$roomIds, $rateUnit]);
        $displayRateMap = [];
        while ($row = $rateStmt->fetch(PDO::FETCH_ASSOC)) {
            $displayRoomId = (int) $row['room_id'];
            if (isset($displayRateMap[$displayRoomId])) {
                continue;
            }
            $displayRateMap[$displayRoomId] = [
                'rate_unit'  => $row['rate_unit'],
                'unit_price' => (int) round((float) $row['unit_price']),
                'unit_minutes' => (int) $row['unit_minutes'],
            ];
        }

        // 7. Combine results
        $items = [];
        foreach ($roomRows as $row) {
            $roomId = (int) $row['room_id'];
            $items[] = [
                'room_id'            => $roomId,
                'studio_id'          => (int) $row['studio_id'],
                'name'               => $row['name'],
                'description'        => $row['description'],
                'area'               => (float) $row['area'],
                'ceiling_height'     => $row['ceiling_height'] !== null ? (float) $row['ceiling_height'] : null,
                'capacity'           => (int) $row['capacity'],
                'soundproof_level'   => $row['soundproof_level'],
                'status'             => $row['status'],
                'studio'             => [
                    'studio_id' => (int) $row['studio_id'],
                    'name'      => $row['studio_name'],
                    'address'   => $row['studio_address'],
                    'district'  => $row['studio_district'],
                    'city'      => $row['studio_city'],
                ],
                'thumbnail_url'      => $thumbnailMap[$roomId] ?? null,
                'primary_space_type' => $primaryTypeMap[$roomId] ?? null,
                'display_rate'       => $displayRateMap[$roomId] ?? null,
                'amenities'          => $amenitiesMap[$roomId] ?? [],
                'review_summary'     => $reviewSummaryMap[$roomId] ?? ['review_count' => 0, 'average_rating' => 0.0],
            ];
        }

        return [
            'items'       => $items,
            'total_items' => $totalItems,
        ];
    }

    /**
     * Find active room by ID with full details (studio, space types, amenities, images, active rates).
     * Returns null if room does not exist, room is not active, or studio is not active.
     *
     * @param int $roomId
     * @return array|null
     */
    public function findActiveRoomById(int $roomId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*,
                   s.name as studio_name,
                   s.description as studio_description,
                   s.address as studio_address,
                   s.district as studio_district,
                   s.city as studio_city,
                   s.phone as studio_phone,
                   u.full_name as host_name,
                   u.email as host_email,
                   u.phone as host_phone,
                   s.status as studio_status
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            JOIN users u ON s.host_id = u.user_id
            WHERE r.room_id = :room_id
              AND r.status = 'active'
              AND s.status = 'active'
        ");
        $stmt->execute(['room_id' => $roomId]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            return null;
        }

        // Space types
        $stStmt = $this->pdo->prepare("
            SELECT st.space_type_id, st.name, st.category, st.description, rst.is_primary
            FROM room_space_types rst
            JOIN space_types st ON rst.space_type_id = st.space_type_id
            WHERE rst.room_id = :room_id
            ORDER BY rst.is_primary DESC, st.space_type_id ASC
        ");
        $stStmt->execute(['room_id' => $roomId]);
        $spaceTypes = array_map(fn($st) => [
            'space_type_id' => (int) $st['space_type_id'],
            'name'          => $st['name'],
            'category'      => $st['category'],
            'description'   => $st['description'],
            'is_primary'    => (bool) $st['is_primary'],
        ], $stStmt->fetchAll(PDO::FETCH_ASSOC));

        // Amenities
        $amStmt = $this->pdo->prepare("
            SELECT a.amenity_id, a.name, a.icon
            FROM room_amenities ra
            JOIN amenities a ON ra.amenity_id = a.amenity_id
            WHERE ra.room_id = :room_id
            ORDER BY a.amenity_id ASC
        ");
        $amStmt->execute(['room_id' => $roomId]);
        $amenities = array_map(fn($a) => [
            'amenity_id' => (int) $a['amenity_id'],
            'name'       => $a['name'],
            'icon'       => $a['icon'],
        ], $amStmt->fetchAll(PDO::FETCH_ASSOC));

        // Images
        $imgStmt = $this->pdo->prepare("
            SELECT image_id, image_url, is_primary, sort_order
            FROM room_images
            WHERE room_id = :room_id
            ORDER BY is_primary DESC, sort_order ASC, image_id ASC
        ");
        $imgStmt->execute(['room_id' => $roomId]);
        $images = array_map(fn($img) => [
            'image_id'   => (int) $img['image_id'],
            'image_url'  => $img['image_url'],
            'is_primary' => (bool) $img['is_primary'],
            'sort_order' => (int) $img['sort_order'],
        ], $imgStmt->fetchAll(PDO::FETCH_ASSOC));

        // Active Rates
        $rates = $this->getActiveRatesByRoomId($roomId);

        return [
            'room_id'          => (int) $room['room_id'],
            'studio_id'        => (int) $room['studio_id'],
            'name'             => $room['name'],
            'description'      => $room['description'],
            'area'             => (float) $room['area'],
            'ceiling_height'   => $room['ceiling_height'] !== null ? (float) $room['ceiling_height'] : null,
            'capacity'         => (int) $room['capacity'],
            'soundproof_level' => $room['soundproof_level'],
            'power_specs'      => $room['power_specs'],
            'rules'            => $room['rules'],
            'status'           => $room['status'],
            'created_at'       => $room['created_at'],
            'updated_at'       => $room['updated_at'],
            'studio'           => [
                'studio_id'   => (int) $room['studio_id'],
                'name'        => $room['studio_name'],
                'description' => $room['studio_description'],
                'address'     => $room['studio_address'],
                'district'    => $room['studio_district'],
                'city'        => $room['studio_city'],
                'phone'       => $room['studio_phone'],
                'host_name'   => $room['host_name'],
                'host_email'  => $room['host_email'],
                'host_phone'  => $room['host_phone'] ?: $room['studio_phone'],
            ],
            'space_types'      => $spaceTypes,
            'amenities'        => $amenities,
            'images'           => $images,
            'rates'            => $rates,
        ];
    }

    /**
     * Find room by ID without requiring active status (for Host management)
     *
     * @param int $roomId
     * @return array|null
     */
    public function findRoomById(int $roomId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*,
                   s.name as studio_name,
                   s.description as studio_description,
                   s.address as studio_address,
                   s.district as studio_district,
                   s.city as studio_city,
                   s.phone as studio_phone,
                   s.status as studio_status
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE r.room_id = :room_id
        ");
        $stmt->execute(['room_id' => $roomId]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            return null;
        }

        $stStmt = $this->pdo->prepare("
            SELECT st.space_type_id, st.name, st.category, rst.is_primary
            FROM room_space_types rst
            JOIN space_types st ON rst.space_type_id = st.space_type_id
            WHERE rst.room_id = :room_id
            ORDER BY rst.is_primary DESC, st.space_type_id ASC
        ");
        $stStmt->execute(['room_id' => $roomId]);
        $spaceTypes = array_map(fn($st) => [
            'space_type_id' => (int) $st['space_type_id'],
            'name'          => $st['name'],
            'category'      => $st['category'],
            'is_primary'    => (bool) $st['is_primary'],
        ], $stStmt->fetchAll(PDO::FETCH_ASSOC));

        $amStmt = $this->pdo->prepare("
            SELECT a.amenity_id, a.name, a.icon
            FROM room_amenities ra
            JOIN amenities a ON ra.amenity_id = a.amenity_id
            WHERE ra.room_id = :room_id
            ORDER BY a.amenity_id ASC
        ");
        $amStmt->execute(['room_id' => $roomId]);
        $amenities = array_map(fn($a) => [
            'amenity_id' => (int) $a['amenity_id'],
            'name'       => $a['name'],
            'icon'       => $a['icon'],
        ], $amStmt->fetchAll(PDO::FETCH_ASSOC));

        $imgStmt = $this->pdo->prepare("
            SELECT image_id, image_url, is_primary, sort_order
            FROM room_images
            WHERE room_id = :room_id
            ORDER BY is_primary DESC, sort_order ASC, image_id ASC
        ");
        $imgStmt->execute(['room_id' => $roomId]);
        $images = array_map(fn($img) => [
            'image_id'   => (int) $img['image_id'],
            'image_url'  => $img['image_url'],
            'is_primary' => (bool) $img['is_primary'],
            'sort_order' => (int) $img['sort_order'],
        ], $imgStmt->fetchAll(PDO::FETCH_ASSOC));

        $rates = $this->getActiveRatesByRoomId($roomId);

        return [
            'room_id'          => (int) $room['room_id'],
            'studio_id'        => (int) $room['studio_id'],
            'name'             => $room['name'],
            'description'      => $room['description'],
            'area'             => (float) $room['area'],
            'ceiling_height'   => $room['ceiling_height'] !== null ? (float) $room['ceiling_height'] : null,
            'capacity'         => (int) $room['capacity'],
            'soundproof_level' => $room['soundproof_level'],
            'power_specs'      => $room['power_specs'],
            'rules'            => $room['rules'],
            'status'           => $room['status'],
            'created_at'       => $room['created_at'],
            'updated_at'       => $room['updated_at'],
            'studio'           => [
                'studio_id'   => (int) $room['studio_id'],
                'name'        => $room['studio_name'],
                'description' => $room['studio_description'],
                'address'     => $room['studio_address'],
                'district'    => $room['studio_district'],
                'city'        => $room['studio_city'],
                'phone'       => $room['studio_phone'],
            ],
            'space_types'      => $spaceTypes,
            'amenities'        => $amenities,
            'images'           => $images,
            'rates'            => $rates,
        ];
    }

    /**
     * Get busy slots [busy_start, busy_end] for a room within a datetime window.
     * Only returns overlapping slots of active bookings (confirmed, checked_in, or non-expired pending).
     * No customer PII is leaked.
     *
     * @param int $roomId
     * @param string $startDateTime (Y-m-d H:i:s)
     * @param string $endDateTime (Y-m-d H:i:s)
     * @return array<int, array{busy_start: string, busy_end: string}>
     */
    public function getRoomBusySlots(int $roomId, string $startDateTime, string $endDateTime): array
    {
        $stmt = $this->pdo->prepare("
            SELECT busy_start, busy_end
            FROM bookings
            WHERE room_id = :room_id
              AND (
                status IN ('awaiting_payment', 'pending', 'confirmed', 'checked_in')
              )
              AND busy_end > :from_dt
              AND busy_start < :to_dt
            ORDER BY busy_start ASC
        ");
        $stmt->execute([
            'room_id' => $roomId,
            'from_dt' => $startDateTime,
            'to_dt'   => $endDateTime,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get active rates for a room.
     *
     * @param int $roomId
     * @return array<int, array>
     */
    public function getActiveRatesByRoomId(int $roomId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT rate_id,
                   room_id,
                   rate_unit,
                   unit_minutes,
                   unit_price,
                   minimum_units,
                   maximum_units,
                   effective_from,
                   effective_to,
                   status
            FROM room_rates
            WHERE room_id = :room_id
              AND status = 'active'
              AND effective_from <= CURDATE()
              AND (effective_to IS NULL OR effective_to >= CURDATE())
            ORDER BY unit_minutes ASC, unit_price ASC
        ");
        $stmt->execute(['room_id' => $roomId]);

        return array_map(fn($rate) => [
            'rate_id'       => (int) $rate['rate_id'],
            'room_id'       => (int) $rate['room_id'],
            'rate_unit'     => $rate['rate_unit'],
            'unit_minutes'  => (int) $rate['unit_minutes'],
            'unit_price'    => (int) round((float) $rate['unit_price']),
            'minimum_units' => (int) $rate['minimum_units'],
            'maximum_units' => $rate['maximum_units'] !== null ? (int) $rate['maximum_units'] : null,
            'effective_from'=> $rate['effective_from'],
            'effective_to'  => $rate['effective_to'],
            'status'        => $rate['status'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Check if a room exists and both room and studio are active.
     *
     * @param int $roomId
     * @return bool
     */
    public function isRoomActive(int $roomId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT 1
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE r.room_id = :room_id
              AND r.status = 'active'
              AND s.status = 'active'
        ");
        $stmt->execute(['room_id' => $roomId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Create room with space types and amenities in a single transaction
     *
     * @param array $data
     * @param int[] $spaceTypeIds First element is primary
     * @param int[] $amenityIds
     * @return int
     * @throws \App\Exceptions\ApiException
     */
    public function createRoom(array $data, array $spaceTypeIds, array $amenityIds = []): int
    {
        if (isset($data['room_type_id']) && $data['room_type_id'] !== '') {
            $type = $this->pdo->prepare("SELECT 1 FROM host_room_types WHERE room_type_id = ? AND studio_id = ? AND status = 'active'");
            $type->execute([(int) $data['room_type_id'], (int) $data['studio_id']]);
            if (!$type->fetchColumn()) throw new \App\Exceptions\ApiException(400, 'invalid_room_type', 'Loại phòng riêng không thuộc Studio này hoặc đã ngừng sử dụng');
        }
        // 1. Validate space types existence
        if (empty($spaceTypeIds)) {
            throw new \App\Exceptions\ApiException(400, 'invalid_space_types', 'Phòng phải có ít nhất một loại hình không gian');
        }
        $inSt = implode(',', array_fill(0, count($spaceTypeIds), '?'));
        $stmtSt = $this->pdo->prepare("SELECT space_type_id FROM space_types WHERE space_type_id IN ($inSt)");
        $stmtSt->execute($spaceTypeIds);
        $foundSt = $stmtSt->fetchAll(PDO::FETCH_COLUMN);
        if (count($foundSt) !== count(array_unique($spaceTypeIds))) {
            throw new \App\Exceptions\ApiException(400, 'invalid_space_type', 'Một hoặc nhiều loại hình không gian không tồn tại');
        }

        // 2. Validate amenities existence
        if (!empty($amenityIds)) {
            $inAm = implode(',', array_fill(0, count($amenityIds), '?'));
            $stmtAm = $this->pdo->prepare("SELECT amenity_id FROM amenities WHERE amenity_id IN ($inAm)");
            $stmtAm->execute($amenityIds);
            $foundAm = $stmtAm->fetchAll(PDO::FETCH_COLUMN);
            if (count($foundAm) !== count(array_unique($amenityIds))) {
                throw new \App\Exceptions\ApiException(400, 'invalid_amenity', 'Một hoặc nhiều tiện ích không tồn tại');
            }
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('
                INSERT INTO rooms (
                    studio_id, room_type_id, name, description, area, ceiling_height,
                    capacity, soundproof_level, power_specs, rules, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $data['studio_id'],
                ($data['room_type_id'] ?? '') !== '' ? (int) $data['room_type_id'] : null,
                $data['name'],
                $data['description'] ?? null,
                $data['area'],
                $data['ceiling_height'] ?? null,
                $data['capacity'],
                $data['soundproof_level'] ?? 'Chuẩn Studio',
                $data['power_specs'] ?? null,
                $data['rules'] ?? null,
                $data['status'] ?? 'active',
            ]);
            $roomId = (int) $this->pdo->lastInsertId();

            // Insert room_space_types (first element is primary)
            $stInsert = $this->pdo->prepare('
                INSERT INTO room_space_types (room_id, space_type_id, is_primary)
                VALUES (?, ?, ?)
            ');
            $isFirst = true;
            foreach ($spaceTypeIds as $stId) {
                $stInsert->execute([$roomId, $stId, $isFirst ? 1 : 0]);
                $isFirst = false;
            }

            // Insert room_amenities
            if (!empty($amenityIds)) {
                $amInsert = $this->pdo->prepare('
                    INSERT INTO room_amenities (room_id, amenity_id)
                    VALUES (?, ?)
                ');
                foreach ($amenityIds as $amId) {
                    $amInsert->execute([$roomId, $amId]);
                }
            }

            $this->pdo->commit();
            return $roomId;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Update room details
     *
     * @param int $roomId
     * @param array $data
     * @param int[]|null $spaceTypeIds
     * @param int[]|null $amenityIds
     * @return bool
     */
    public function updateRoom(int $roomId, array $data, ?array $spaceTypeIds = null, ?array $amenityIds = null): bool
    {
        $allowed = ['name', 'description', 'area', 'ceiling_height', 'capacity', 'soundproof_level', 'power_specs', 'rules', 'status', 'room_type_id'];
        $fields = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        $this->pdo->beginTransaction();
        try {
            if (array_key_exists('room_type_id', $data) && $data['room_type_id'] !== null && $data['room_type_id'] !== '') {
                $room = $this->pdo->prepare('SELECT studio_id FROM rooms WHERE room_id = ? FOR UPDATE');
                $room->execute([$roomId]);
                $studioId = $room->fetchColumn();
                $type = $this->pdo->prepare("SELECT 1 FROM host_room_types WHERE room_type_id = ? AND studio_id = ? AND status = 'active'");
                $type->execute([(int) $data['room_type_id'], (int) $studioId]);
                if (!$type->fetchColumn()) throw new \App\Exceptions\ApiException(400, 'invalid_room_type', 'Loại phòng riêng không thuộc Studio này hoặc đã ngừng sử dụng');
            }
            if (!empty($fields)) {
                $params[] = $roomId;
                $sql = 'UPDATE rooms SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE room_id = ?';
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($params);
            }

            // Update space types if provided
            if ($spaceTypeIds !== null) {
                if (empty($spaceTypeIds)) {
                    throw new \App\Exceptions\ApiException(400, 'invalid_space_types', 'Phòng phải có ít nhất một loại hình');
                }
                $delSt = $this->pdo->prepare('DELETE FROM room_space_types WHERE room_id = ?');
                $delSt->execute([$roomId]);

                $stInsert = $this->pdo->prepare('
                    INSERT INTO room_space_types (room_id, space_type_id, is_primary)
                    VALUES (?, ?, ?)
                ');
                $isFirst = true;
                foreach ($spaceTypeIds as $stId) {
                    $stInsert->execute([$roomId, $stId, $isFirst ? 1 : 0]);
                    $isFirst = false;
                }
            }

            // Update amenities if provided
            if ($amenityIds !== null) {
                $delAm = $this->pdo->prepare('DELETE FROM room_amenities WHERE room_id = ?');
                $delAm->execute([$roomId]);

                if (!empty($amenityIds)) {
                    $amInsert = $this->pdo->prepare('
                        INSERT INTO room_amenities (room_id, amenity_id)
                        VALUES (?, ?)
                    ');
                    foreach ($amenityIds as $amId) {
                        $amInsert->execute([$roomId, $amId]);
                    }
                }
            }

            $this->pdo->commit();
            return true;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Create room rate with server-calculated unit_minutes (D6)
     *
     * @param int $roomId
     * @param array $rateData
     * @return int
     */
    public function createRate(int $roomId, array $rateData): int
    {
        $rateUnit = (string) $rateData['rate_unit'];
        $unitMinutesMap = [
            'hour'     => 60,
            'half_day' => 240,
            'day'      => 1440,
            'week'     => 10080,
            'month'    => 43200,
        ];

        if ($rateUnit === 'session') {
            $unitMinutes = (int) ($rateData['unit_minutes'] ?? 0);
            if ($unitMinutes <= 0) {
                throw new \App\Exceptions\ApiException(400, 'invalid_unit_minutes', 'Với đơn vị session, unit_minutes là bắt buộc và phải lớn hơn 0');
            }
        } elseif (isset($unitMinutesMap[$rateUnit])) {
            $unitMinutes = $unitMinutesMap[$rateUnit];
        } else {
            throw new \App\Exceptions\ApiException(400, 'invalid_rate_unit', 'Loại đơn vị tính giá không hợp lệ');
        }

        $minUnits = (int) ($rateData['minimum_units'] ?? 1);
        if ($minUnits <= 0) {
            throw new \App\Exceptions\ApiException(400, 'invalid_minimum_units', 'minimum_units phải lớn hơn 0');
        }

        $maxUnits = isset($rateData['maximum_units'])
            ? (int) $rateData['maximum_units']
            : null;
        if ($maxUnits !== null && $maxUnits < $minUnits) {
            throw new \App\Exceptions\ApiException(400, 'invalid_maximum_units', 'maximum_units phải lớn hơn hoặc bằng minimum_units');
        }

        $effectiveFrom = $rateData['effective_from'] ?? date('Y-m-d');
        $effectiveTo = $rateData['effective_to'] ?? null;
        if ($effectiveTo !== null && $effectiveTo < $effectiveFrom) {
            throw new \App\Exceptions\ApiException(400, 'invalid_effective_dates', 'effective_to phải lớn hơn hoặc bằng effective_from');
        }

        $stmt = $this->pdo->prepare('
            INSERT INTO room_rates (
                room_id, rate_unit, unit_minutes, unit_price,
                minimum_units, maximum_units, effective_from, effective_to, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $roomId,
            $rateUnit,
            $unitMinutes,
            $rateData['unit_price'],
            $minUnits,
            $maxUnits,
            $effectiveFrom,
            $effectiveTo,
            $rateData['status'] ?? 'active',
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update room rate
     *
     * @param int $rateId
     * @param array $data
     * @return bool
     */
    public function updateRate(int $rateId, array $data): bool
    {
        $allowed = ['unit_price', 'minimum_units', 'maximum_units', 'effective_from', 'effective_to', 'status'];
        $fields = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $rateId;
        $sql = 'UPDATE room_rates SET ' . implode(', ', $fields) . ' WHERE rate_id = ?';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function deleteRateIfUnused(int $roomId, int $rateId, int $actorId): void
    {
        $this->pdo->beginTransaction();
        try {
            $rate = $this->pdo->prepare('SELECT status FROM room_rates WHERE rate_id = ? AND room_id = ? FOR UPDATE');
            $rate->execute([$rateId, $roomId]);
            $status = $rate->fetchColumn();
            if ($status === false) throw new \App\Exceptions\ApiException(404, 'rate_not_found', 'Không tìm thấy bảng giá thuộc phòng này');
            if ($status === 'active') throw new \App\Exceptions\ApiException(409, 'active_rate_delete_forbidden', 'Hãy ngừng áp dụng bảng giá trước khi xóa vĩnh viễn');
            $usage = $this->pdo->prepare('SELECT 1 FROM bookings WHERE rate_id = ? LIMIT 1');
            $usage->execute([$rateId]);
            if ($usage->fetchColumn()) throw new \App\Exceptions\ApiException(409, 'rate_in_use', 'Không thể xóa bảng giá đã được dùng trong lịch sử đặt phòng');
            $delete = $this->pdo->prepare('DELETE FROM room_rates WHERE rate_id = ? AND room_id = ?');
            $delete->execute([$rateId, $roomId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'room_rate_permanently_deleted', 'room_rates', ?, JSON_OBJECT('room_id', ?))");
            $audit->execute([$actorId, $rateId, $roomId]);
            $this->pdo->commit();
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    /**
     * Add image to room. If is_primary is true, un-primary existing images.
     *
     * @param int $roomId
     * @param string $imageUrl
     * @param bool $isPrimary
     * @return int
     */
    public function addImage(int $roomId, string $imageUrl, bool $isPrimary = false): int
    {
        $this->pdo->beginTransaction();
        try {
            if ($isPrimary) {
                $unPrimary = $this->pdo->prepare('UPDATE room_images SET is_primary = 0 WHERE room_id = ?');
                $unPrimary->execute([$roomId]);
            }

            $stmt = $this->pdo->prepare('
                INSERT INTO room_images (room_id, image_url, is_primary)
                VALUES (?, ?, ?)
            ');
            $stmt->execute([$roomId, $imageUrl, $isPrimary ? 1 : 0]);
            $imageId = (int) $this->pdo->lastInsertId();

            $this->pdo->commit();
            return $imageId;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
