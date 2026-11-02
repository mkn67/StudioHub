<?php

declare(strict_types=1);

namespace App\Repositories;

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
            ORDER BY r.room_id ASC
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
            SELECT rst.room_id, st.space_type_id, st.name
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

        // 6. Batch fetch display rate for requested rate_unit
        $rateStmt = $this->pdo->prepare("
            SELECT room_id, rate_unit, MIN(unit_price) as unit_price
            FROM room_rates
            WHERE room_id IN ({$inPlaceholders})
              AND status = 'active'
              AND rate_unit = ?
              AND effective_from <= CURDATE()
              AND (effective_to IS NULL OR effective_to >= CURDATE())
            GROUP BY room_id, rate_unit
        ");
        $rateStmt->execute([...$roomIds, $rateUnit]);
        $displayRateMap = [];
        while ($row = $rateStmt->fetch(PDO::FETCH_ASSOC)) {
            $displayRateMap[(int) $row['room_id']] = [
                'rate_unit'  => $row['rate_unit'],
                'unit_price' => (int) round((float) $row['unit_price']),
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
                   s.status as studio_status
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
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
            SELECT st.space_type_id, st.name, rst.is_primary
            FROM room_space_types rst
            JOIN space_types st ON rst.space_type_id = st.space_type_id
            WHERE rst.room_id = :room_id
            ORDER BY rst.is_primary DESC, st.space_type_id ASC
        ");
        $stStmt->execute(['room_id' => $roomId]);
        $spaceTypes = array_map(fn($st) => [
            'space_type_id' => (int) $st['space_type_id'],
            'name'          => $st['name'],
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
}
