<?php

declare(strict_types=1);

namespace App\Modules\Booking;

use App\Core\Db;
use App\Exceptions\ApiException;
use DateTimeImmutable;
use PDO;

class AvailabilityService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Pure function to check if two intervals [startA, endA) and [startB, endB) overlap
     *
     * @param string $startA
     * @param string $endA
     * @param string $startB
     * @param string $endB
     * @return bool
     */
    public static function intervalsOverlap(string $startA, string $endA, string $startB, string $endB): bool
    {
        return ($startA < $endB) && ($endA > $startB);
    }

    /**
     * Evaluate booking availability, validate room/equipments/schedule/stock, and calculate pricing.
     * Shared by check-availability (locking = false) and create booking (locking = true).
     *
     * @param array{
     *     room_id: int|string,
     *     rate_id: int|string,
     *     start_time: string,
     *     end_time: string,
     *     party_size?: int|string|null,
     *     equipments?: array<int, array{equipment_id: int|string, quantity: int|string}>
     * } $request
     * @param bool $locking Whether to lock room and equipment rows FOR UPDATE
     * @param PDO|null $pdo Optional PDO instance (e.g. within an active transaction)
     * @return array
     * @throws ApiException
     */
    public function evaluate(array $request, bool $locking = false, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;

        // 1. Validate basic input fields
        $roomId = (int) ($request['room_id'] ?? 0);
        $rateId = (int) ($request['rate_id'] ?? 0);
        $startTimeStr = trim((string) ($request['start_time'] ?? ''));
        $endTimeStr = trim((string) ($request['end_time'] ?? ''));

        if ($roomId <= 0) {
            throw new ApiException(400, 'validation_error', 'room_id không hợp lệ', [
                ['field' => 'room_id', 'code' => 'required', 'message' => 'room_id is required and must be > 0']
            ]);
        }
        if ($rateId <= 0) {
            throw new ApiException(400, 'validation_error', 'rate_id không hợp lệ', [
                ['field' => 'rate_id', 'code' => 'required', 'message' => 'rate_id is required and must be > 0']
            ]);
        }

        // Validate datetime format Y-m-d H:i:s
        $startDt = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $startTimeStr);
        $endDt = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $endTimeStr);

        if (!$startDt || $startDt->format('Y-m-d H:i:s') !== $startTimeStr) {
            throw new ApiException(400, 'invalid_time_format', 'Thời gian bắt đầu không đúng định dạng YYYY-MM-DD HH:mm:ss', [
                ['field' => 'start_time', 'code' => 'invalid_format', 'message' => 'Format must be YYYY-MM-DD HH:mm:ss']
            ]);
        }
        if (!$endDt || $endDt->format('Y-m-d H:i:s') !== $endTimeStr) {
            throw new ApiException(400, 'invalid_time_format', 'Thời gian kết thúc không đúng định dạng YYYY-MM-DD HH:mm:ss', [
                ['field' => 'end_time', 'code' => 'invalid_format', 'message' => 'Format must be YYYY-MM-DD HH:mm:ss']
            ]);
        }

        $now = new DateTimeImmutable('now');
        if ($endDt <= $startDt) {
            throw new ApiException(400, 'invalid_time_order', 'Thời gian kết thúc phải sau thời gian bắt đầu', [
                ['field' => 'end_time', 'code' => 'invalid_range', 'message' => 'end_time must be strictly after start_time']
            ]);
        }
        if ($startDt <= $now) {
            throw new ApiException(400, 'past_time_not_allowed', 'Thời gian bắt đầu thuê phải ở tương lai', [
                ['field' => 'start_time', 'code' => 'past_time', 'message' => 'start_time must be in the future']
            ]);
        }

        $durationMinutes = (int) (($endDt->getTimestamp() - $startDt->getTimestamp()) / 60);

        // Calculate busy range [busy_start, busy_end)
        $bufferMinutes = (int) ($_ENV['BUFFER_MINUTES'] ?? 30);
        $busyStart = $startDt->format('Y-m-d H:i:s');
        $busyEnd = $endDt->modify("+{$bufferMinutes} minutes")->format('Y-m-d H:i:s');

        // 2. Lock / Fetch Room
        $roomSql = "SELECT room_id, studio_id, name, capacity, status FROM rooms WHERE room_id = ?"
            . ($locking ? " FOR UPDATE" : "");
        $roomStmt = $db->prepare($roomSql);
        $roomStmt->execute([$roomId]);
        $room = $roomStmt->fetch(PDO::FETCH_ASSOC);

        if (!$room || $room['status'] !== 'active') {
            throw new ApiException(404, 'room_not_found', 'Phòng không tồn tại hoặc không khả dụng');
        }

        // Validate party_size if provided
        $partySize = 1;
        if (isset($request['party_size']) && $request['party_size'] !== '' && $request['party_size'] !== null) {
            $partySize = (int) $request['party_size'];
            if ($partySize <= 0 || $partySize > (int) $room['capacity']) {
                throw new ApiException(
                    400,
                    'capacity_exceeded',
                    "Số lượng người ({$partySize}) vượt quá sức chứa tối đa ({$room['capacity']})",
                    [
                        [
                            'field'   => 'party_size',
                            'code'    => 'capacity_exceeded',
                            'message' => "Sức chứa tối đa của phòng là {$room['capacity']} người",
                        ]
                    ]
                );
            }
        }

        // 3. Check Studio active
        $studioStmt = $db->prepare("SELECT studio_id, name, status FROM studios WHERE studio_id = ?");
        $studioStmt->execute([(int) $room['studio_id']]);
        $studio = $studioStmt->fetch(PDO::FETCH_ASSOC);
        if (!$studio || $studio['status'] !== 'active') {
            throw new ApiException(400, 'studio_inactive', 'Studio không hoạt động');
        }

        // 4. Load & Validate Rate
        $rateStmt = $db->prepare("SELECT * FROM room_rates WHERE rate_id = ?");
        $rateStmt->execute([$rateId]);
        $rate = $rateStmt->fetch(PDO::FETCH_ASSOC);

        if (!$rate || (int) $rate['room_id'] !== $roomId || $rate['status'] !== 'active') {
            throw new ApiException(400, 'invalid_rate', 'Bảng giá không hợp lệ hoặc không thuộc phòng này', [
                ['field' => 'rate_id', 'code' => 'invalid_rate', 'message' => 'Rate does not belong to room or is not active']
            ]);
        }

        // D15: Check rate effective date based on DATE(start_time)
        $startDate = $startDt->format('Y-m-d');
        if ($rate['effective_from'] > $startDate || ($rate['effective_to'] !== null && $rate['effective_to'] < $startDate)) {
            throw new ApiException(400, 'rate_expired', 'Bảng giá không hiệu lực tại ngày bắt đầu thuê', [
                ['field' => 'rate_id', 'code' => 'rate_expired', 'message' => 'Rate is not effective on booking start date']
            ]);
        }

        // 5. Consolidate & Lock Equipments (ordered by equipment_id ASC)
        $equipmentsData = [];
        $pricingEquipments = [];
        $rawEquipments = $request['equipments'] ?? [];

        if (!empty($rawEquipments) && is_array($rawEquipments)) {
            $consolidated = [];
            foreach ($rawEquipments as $eq) {
                $eqId = (int) ($eq['equipment_id'] ?? 0);
                $qty = (int) ($eq['quantity'] ?? 0);
                if ($eqId <= 0 || $qty <= 0) {
                    throw new ApiException(400, 'invalid_equipment_input', 'Mã thiết bị và số lượng phải là số nguyên dương', [
                        ['field' => 'equipments', 'code' => 'invalid_input', 'message' => 'equipment_id and quantity must be positive']
                    ]);
                }
                $consolidated[$eqId] = ($consolidated[$eqId] ?? 0) + $qty;
            }

            if (!empty($consolidated)) {
                // Sort ascending by equipment_id to prevent deadlocks
                ksort($consolidated);
                $eqIds = array_keys($consolidated);
                $inClause = implode(',', array_fill(0, count($eqIds), '?'));

                $eqSql = "SELECT equipment_id, studio_id, name, total_quantity, pricing_unit, unit_price, status "
                    . "FROM equipments "
                    . "WHERE equipment_id IN ({$inClause}) AND studio_id = ? AND status = 'active' "
                    . "ORDER BY equipment_id ASC"
                    . ($locking ? " FOR UPDATE" : "");

                $eqStmt = $db->prepare($eqSql);
                $eqStmt->execute([...$eqIds, (int) $room['studio_id']]);
                $dbEquipments = $eqStmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($dbEquipments) !== count($eqIds)) {
                    throw new ApiException(
                        400,
                        'invalid_equipment',
                        'Một hoặc nhiều thiết bị không tồn tại, không hoạt động hoặc không thuộc studio này',
                        [
                            [
                                'field'   => 'equipments',
                                'code'    => 'invalid_equipment',
                                'message' => 'All equipments must belong to the same studio and be active',
                            ]
                        ]
                    );
                }

                $dbEqMap = [];
                foreach ($dbEquipments as $row) {
                    $dbEqMap[(int) $row['equipment_id']] = $row;
                }

                foreach ($consolidated as $eqId => $qty) {
                    $eqRow = $dbEqMap[$eqId];
                    $equipmentsData[$eqId] = [
                        'row'      => $eqRow,
                        'quantity' => $qty,
                    ];
                    $pricingEquipments[] = [
                        'equipment_id' => $eqId,
                        'name'         => $eqRow['name'],
                        'quantity'     => $qty,
                        'pricing_unit' => $eqRow['pricing_unit'],
                        'unit_price'   => $eqRow['unit_price'],
                    ];
                }
            }
        }

        // 6. Check Room Schedule Conflict (Section 5.1)
        // Active bookings: confirmed, checked_in, or (pending and expires_at > NOW())
        $conflictSql = "SELECT booking_id, booking_code, start_time, end_time, busy_start, busy_end "
            . "FROM bookings "
            . "WHERE room_id = ? "
            . "  AND (status IN ('confirmed','checked_in') OR (status = 'pending' AND expires_at > NOW())) "
            . "  AND busy_start < ? AND busy_end > ? "
            . "LIMIT 1";

        $conflictStmt = $db->prepare($conflictSql);
        $conflictStmt->execute([$roomId, $busyEnd, $busyStart]);
        $existingBooking = $conflictStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingBooking) {
            throw new ApiException(
                409,
                'room_occupied',
                'Phòng đã có người đặt trong khoảng thời gian này',
                [
                    [
                        'field'   => 'time',
                        'code'    => 'room_occupied',
                        'message' => 'Khung giờ này đã bị chiếm dụng',
                    ]
                ]
            );
        }

        // 7. Check Equipment Stock Peak Usage (Section 5.9)
        foreach ($equipmentsData as $eqId => $item) {
            $eqRow = $item['row'];
            $reqQty = $item['quantity'];

            // Query overlapping active bookings usage for this equipment across all rooms of the studio
            $eqUsageSql = "SELECT bd.quantity, b.busy_start, b.busy_end "
                . "FROM booking_details bd "
                . "JOIN bookings b ON bd.booking_id = b.booking_id "
                . "WHERE bd.equipment_id = ? "
                . "  AND (b.status IN ('confirmed','checked_in') OR (b.status = 'pending' AND b.expires_at > NOW())) "
                . "  AND b.busy_start < ? AND b.busy_end > ?";

            $eqUsageStmt = $db->prepare($eqUsageSql);
            $eqUsageStmt->execute([$eqId, $busyEnd, $busyStart]);
            $existingRows = $eqUsageStmt->fetchAll(PDO::FETCH_ASSOC);

            $peakUsage = StockCalculator::peakUsage($existingRows, $busyStart, $busyEnd);
            $totalQuantity = (int) $eqRow['total_quantity'];

            if ($peakUsage + $reqQty > $totalQuantity) {
                $availableQty = max(0, $totalQuantity - $peakUsage);
                throw new ApiException(
                    409,
                    'equipment_insufficient',
                    "Thiết bị '{$eqRow['name']}' không đủ số lượng trong khung giờ này",
                    [
                        [
                            'field'   => "equipments.{$eqId}",
                            'code'    => 'equipment_insufficient',
                            'message' => "Thiết bị '{$eqRow['name']}' chỉ còn {$availableQty} món khả dụng trong khung giờ này",
                        ]
                    ]
                );
            }
        }

        // 8. Calculate Pricing (Section 5.2)
        $depositRate = (float) ($_ENV['DEPOSIT_RATE'] ?? 0.30);
        $pricing = PricingService::calculate($rate, $durationMinutes, $pricingEquipments, $depositRate);

        return [
            'room'            => $room,
            'studio'          => $studio,
            'rate'            => $rate,
            'start_time'      => $startDt->format('Y-m-d H:i:s'),
            'end_time'        => $endDt->format('Y-m-d H:i:s'),
            'busy_start'      => $busyStart,
            'busy_end'        => $busyEnd,
            'party_size'      => $partySize,
            'duration_minutes'=> $durationMinutes,
            'equipments_data' => $equipmentsData,
            'pricing'         => $pricing,
        ];
    }
}
