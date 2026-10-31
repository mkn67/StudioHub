<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Exceptions\ApiException;
use App\Modules\Rooms\RoomRepository;
use DateTimeImmutable;

class RoomService
{
    private const ALLOWED_RATE_UNITS = ['hour', 'half_day', 'day', 'week', 'month', 'session'];
    private const MAX_CALENDAR_DAYS = 62;

    private RoomRepository $roomRepo;

    public function __construct(?RoomRepository $roomRepo = null)
    {
        $this->roomRepo = $roomRepo ?? new RoomRepository();
    }

    /**
     * Search rooms with filters and pagination.
     *
     * @param array $queryParams
     * @return array{
     *     items: array,
     *     pagination: array{page: int, limit: int, total_items: int, total_pages: int}
     * }
     * @throws ApiException
     */
    public function getRooms(array $queryParams): array
    {
        $errors = [];

        // Pagination
        $page = 1;
        if (isset($queryParams['page'])) {
            if (!is_numeric($queryParams['page']) || (int) $queryParams['page'] < 1) {
                $errors[] = ['field' => 'page', 'code' => 'invalid', 'message' => 'Trang phải là số nguyên dương'];
            } else {
                $page = (int) $queryParams['page'];
            }
        }

        $limit = 12;
        if (isset($queryParams['limit'])) {
            if (!is_numeric($queryParams['limit']) || (int) $queryParams['limit'] < 1 || (int) $queryParams['limit'] > 50) {
                $errors[] = ['field' => 'limit', 'code' => 'invalid', 'message' => 'Số lượng mỗi trang phải từ 1 đến 50'];
            } else {
                $limit = (int) $queryParams['limit'];
            }
        }

        // Rate unit (default 'hour')
        $rateUnit = 'hour';
        if (isset($queryParams['rate_unit']) && $queryParams['rate_unit'] !== '') {
            $unit = (string) $queryParams['rate_unit'];
            if (!in_array($unit, self::ALLOWED_RATE_UNITS, true)) {
                $errors[] = [
                    'field'   => 'rate_unit',
                    'code'    => 'invalid',
                    'message' => 'Đơn vị tính giá không hợp lệ. Các đơn vị hỗ trợ: ' . implode(', ', self::ALLOWED_RATE_UNITS),
                ];
            } else {
                $rateUnit = $unit;
            }
        }

        // Min price / Max price
        $minPrice = null;
        if (isset($queryParams['min_price']) && $queryParams['min_price'] !== '') {
            if (!is_numeric($queryParams['min_price']) || (float) $queryParams['min_price'] < 0) {
                $errors[] = ['field' => 'min_price', 'code' => 'invalid', 'message' => 'Giá tối thiểu phải là số không âm'];
            } else {
                $minPrice = (float) $queryParams['min_price'];
            }
        }

        $maxPrice = null;
        if (isset($queryParams['max_price']) && $queryParams['max_price'] !== '') {
            if (!is_numeric($queryParams['max_price']) || (float) $queryParams['max_price'] < 0) {
                $errors[] = ['field' => 'max_price', 'code' => 'invalid', 'message' => 'Giá tối đa phải là số không âm'];
            } else {
                $maxPrice = (float) $queryParams['max_price'];
            }
        }

        if ($minPrice !== null && $maxPrice !== null && $maxPrice < $minPrice) {
            $errors[] = [
                'field'   => 'max_price',
                'code'    => 'invalid',
                'message' => 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu',
            ];
        }

        // Min area
        $minArea = null;
        if (isset($queryParams['min_area']) && $queryParams['min_area'] !== '') {
            if (!is_numeric($queryParams['min_area']) || (float) $queryParams['min_area'] < 0) {
                $errors[] = ['field' => 'min_area', 'code' => 'invalid', 'message' => 'Diện tích tối thiểu phải là số không âm'];
            } else {
                $minArea = (float) $queryParams['min_area'];
            }
        }

        // Space type
        $spaceTypeId = null;
        if (isset($queryParams['space_type_id']) && $queryParams['space_type_id'] !== '') {
            if (!is_numeric($queryParams['space_type_id']) || (int) $queryParams['space_type_id'] < 1) {
                $errors[] = ['field' => 'space_type_id', 'code' => 'invalid', 'message' => 'Loại hình không gian không hợp lệ'];
            } else {
                $spaceTypeId = (int) $queryParams['space_type_id'];
            }
        }

        // Keyword
        $keyword = null;
        if (isset($queryParams['keyword']) && trim((string) $queryParams['keyword']) !== '') {
            $keyword = trim((string) $queryParams['keyword']);
        }

        if (!empty($errors)) {
            throw new ApiException(400, 'validation_failed', 'Dữ liệu bộ lọc không hợp lệ', $errors);
        }

        $filters = [
            'keyword'       => $keyword,
            'space_type_id' => $spaceTypeId,
            'rate_unit'     => $rateUnit,
            'min_price'     => $minPrice,
            'max_price'     => $maxPrice,
            'min_area'      => $minArea,
            'page'          => $page,
            'limit'         => $limit,
        ];

        $result = $this->roomRepo->searchRooms($filters);
        $totalItems = $result['total_items'];
        $totalPages = $totalItems > 0 ? (int) ceil($totalItems / $limit) : 0;

        return [
            'items'      => $result['items'],
            'pagination' => [
                'page'        => $page,
                'limit'       => $limit,
                'total_items' => $totalItems,
                'total_pages' => $totalPages,
            ],
        ];
    }

    /**
     * Get detailed information for an active room.
     *
     * @param int $roomId
     * @return array
     * @throws ApiException
     */
    public function getRoomDetail(int $roomId): array
    {
        $room = $this->roomRepo->findActiveRoomById($roomId);
        if ($room === null) {
            throw new ApiException(404, 'room_not_found', 'Phòng không tồn tại hoặc không khả dụng');
        }

        return $room;
    }

    /**
     * Get busy slots for room calendar without exposing customer PII.
     *
     * @param int $roomId
     * @param string|null $from
     * @param string|null $to
     * @return array{room_id: int, from: string, to: string, busy_slots: array}
     * @throws ApiException
     */
    public function getRoomCalendar(int $roomId, ?string $from = null, ?string $to = null): array
    {
        if (!$this->roomRepo->isRoomActive($roomId)) {
            throw new ApiException(404, 'room_not_found', 'Phòng không tồn tại hoặc không khả dụng');
        }

        // Default: from = today (00:00:00), to = today + 30 days (23:59:59)
        $now = new DateTimeImmutable('today');
        $fromStr = $from !== null && trim($from) !== '' ? trim($from) : $now->format('Y-m-d');
        $toStr = $to !== null && trim($to) !== '' ? trim($to) : $now->modify('+30 days')->format('Y-m-d');

        // Parse and validate date formats
        $fromDate = $this->parseDateOrDateTime($fromStr, false);
        $toDate = $this->parseDateOrDateTime($toStr, true);

        if ($fromDate === null || $toDate === null) {
            throw new ApiException(400, 'invalid_date_format', 'Định dạng ngày không hợp lệ. Vui lòng dùng YYYY-MM-DD hoặc YYYY-MM-DD HH:mm:ss');
        }

        if ($fromDate > $toDate) {
            throw new ApiException(400, 'invalid_date_range', 'Khoảng thời gian không hợp lệ: from phải trước hoặc bằng to');
        }

        // Check max 62 days
        $diffSeconds = $toDate->getTimestamp() - $fromDate->getTimestamp();
        $diffDays = $diffSeconds / 86400;
        if ($diffDays > self::MAX_CALENDAR_DAYS) {
            throw new ApiException(400, 'date_range_too_large', 'Khoảng thời gian không được vượt quá 62 ngày');
        }

        $busySlots = $this->roomRepo->getRoomBusySlots(
            $roomId,
            $fromDate->format('Y-m-d H:i:s'),
            $toDate->format('Y-m-d H:i:s')
        );

        return [
            'room_id'    => $roomId,
            'from'       => $fromStr,
            'to'         => $toStr,
            'busy_slots' => $busySlots,
        ];
    }

    /**
     * Get active rates for a room.
     *
     * @param int $roomId
     * @return array
     * @throws ApiException
     */
    public function getRoomRates(int $roomId): array
    {
        if (!$this->roomRepo->isRoomActive($roomId)) {
            throw new ApiException(404, 'room_not_found', 'Phòng không tồn tại hoặc không khả dụng');
        }

        return $this->roomRepo->getActiveRatesByRoomId($roomId);
    }

    /**
     * Parse date or datetime string into DateTimeImmutable.
     */
    private function parseDateOrDateTime(string $val, bool $isEnd): ?DateTimeImmutable
    {
        // Try Y-m-d
        $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $val);
        if ($dt !== false && $dt->format('Y-m-d') === $val) {
            return $isEnd ? $dt->setTime(23, 59, 59) : $dt->setTime(0, 0, 0);
        }

        // Try Y-m-d H:i:s
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $val);
        if ($dt !== false) {
            return $dt;
        }

        // Try Y-m-d H:i
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i', $val);
        if ($dt !== false) {
            return $isEnd ? $dt->setTime((int)$dt->format('H'), (int)$dt->format('i'), 59) : $dt->setTime((int)$dt->format('H'), (int)$dt->format('i'), 0);
        }

        // Fallback strtotime
        $timestamp = strtotime($val);
        if ($timestamp !== false) {
            $dt = (new DateTimeImmutable())->setTimestamp($timestamp);
            return $dt;
        }

        return null;
    }

    /**
     * Create new room
     *
     * @param array $data
     * @return array Created room
     * @throws ApiException
     */
    public function createRoom(array $data): array
    {
        $area = (float) ($data['area'] ?? 0);
        if ($area <= 0) {
            throw new ApiException(400, 'invalid_area', 'Diện tích phòng (area) phải lớn hơn 0');
        }

        $capacity = (int) ($data['capacity'] ?? 0);
        if ($capacity <= 0) {
            throw new ApiException(400, 'invalid_capacity', 'Sức chứa phòng (capacity) phải lớn hơn 0');
        }

        $spaceTypeIds = $data['space_type_ids'] ?? [];
        if (!is_array($spaceTypeIds) || empty($spaceTypeIds)) {
            throw new ApiException(400, 'invalid_space_types', 'Phòng phải có ít nhất một loại hình không gian');
        }

        $amenityIds = $data['amenity_ids'] ?? [];
        if (!is_array($amenityIds)) {
            $amenityIds = [];
        }

        $roomId = $this->roomRepo->createRoom($data, $spaceTypeIds, $amenityIds);
        $room = $this->roomRepo->findRoomById($roomId);
        return $room ?: [];
    }

    /**
     * Update room
     *
     * @param int $roomId
     * @param array $data
     * @return array Updated room
     * @throws ApiException
     */
    public function updateRoom(int $roomId, array $data): array
    {
        if (array_key_exists('studio_id', $data)) {
            throw new ApiException(400, 'cannot_change_studio', 'Không được phép thay đổi cơ sở studio của phòng');
        }

        if (isset($data['area']) && (float) $data['area'] <= 0) {
            throw new ApiException(400, 'invalid_area', 'Diện tích phòng phải lớn hơn 0');
        }

        if (isset($data['capacity']) && (int) $data['capacity'] <= 0) {
            throw new ApiException(400, 'invalid_capacity', 'Sức chứa phòng phải lớn hơn 0');
        }

        if (isset($data['status']) && !in_array($data['status'], ['active', 'maintenance', 'inactive'], true)) {
            throw new ApiException(400, 'invalid_status', 'Trạng thái phòng phải là active, maintenance hoặc inactive');
        }

        $spaceTypeIds = isset($data['space_type_ids']) && is_array($data['space_type_ids'])
            ? $data['space_type_ids']
            : null;
        $amenityIds = isset($data['amenity_ids']) && is_array($data['amenity_ids'])
            ? $data['amenity_ids']
            : null;

        $this->roomRepo->updateRoom($roomId, $data, $spaceTypeIds, $amenityIds);
        $room = $this->roomRepo->findRoomById($roomId);
        return $room ?: [];
    }

    /**
     * Create room rate
     *
     * @param int $roomId
     * @param array $data
     * @return array
     */
    public function createRate(int $roomId, array $data): array
    {
        $rateId = $this->roomRepo->createRate($roomId, $data);
        return [
            'rate_id' => $rateId,
            'room_id' => $roomId,
            'message' => 'Tạo bảng giá thành công',
        ];
    }

    /**
     * Update room rate
     *
     * @param int $rateId
     * @param array $data
     * @return array
     */
    public function updateRate(int $rateId, array $data): array
    {
        $this->roomRepo->updateRate($rateId, $data);
        return [
            'rate_id' => $rateId,
            'message' => 'Cập nhật bảng giá thành công',
        ];
    }

    /**
     * Upload room image
     *
     * @param int $roomId
     * @param array $file
     * @param bool $isPrimary
     * @return array
     */
    public function uploadImage(int $roomId, array $file, bool $isPrimary): array
    {
        $imageUrl = UploadService::uploadRoomImage($file);
        $imageId = $this->roomRepo->addImage($roomId, $imageUrl, $isPrimary);

        return [
            'image_id'   => $imageId,
            'room_id'    => $roomId,
            'image_url'  => $imageUrl,
            'is_primary' => $isPrimary,
        ];
    }
}

