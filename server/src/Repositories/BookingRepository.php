<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

class BookingRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Insert booking into database
     *
     * @param array $data
     * @param PDO|null $pdo
     * @return int Inserted booking_id
     */
    public function insertBooking(array $data, ?PDO $pdo = null): int
    {
        $db = $pdo ?? $this->pdo;

        $stmt = $db->prepare("
            INSERT INTO bookings (
                booking_code,
                room_id,
                customer_id,
                rate_id,
                booking_type,
                start_time,
                end_time,
                busy_start,
                busy_end,
                party_size,
                rate_unit,
                rental_units,
                room_unit_price,
                room_amount,
                equipment_amount,
                total_amount,
                deposit_amount,
                customer_name,
                customer_phone,
                customer_email,
                note,
                status,
                expires_at
            ) VALUES (
                :booking_code,
                :room_id,
                :customer_id,
                :rate_id,
                :booking_type,
                :start_time,
                :end_time,
                :busy_start,
                :busy_end,
                :party_size,
                :rate_unit,
                :rental_units,
                :room_unit_price,
                :room_amount,
                :equipment_amount,
                :total_amount,
                :deposit_amount,
                :customer_name,
                :customer_phone,
                :customer_email,
                :note,
                :status,
                :expires_at
            )
        ");

        $stmt->execute([
            'booking_code'     => $data['booking_code'],
            'room_id'          => $data['room_id'],
            'customer_id'      => $data['customer_id'],
            'rate_id'          => $data['rate_id'],
            'booking_type'     => $data['booking_type'],
            'start_time'       => $data['start_time'],
            'end_time'         => $data['end_time'],
            'busy_start'       => $data['busy_start'],
            'busy_end'         => $data['busy_end'],
            'party_size'       => $data['party_size'],
            'rate_unit'        => $data['rate_unit'],
            'rental_units'     => $data['rental_units'],
            'room_unit_price'  => $data['room_unit_price'],
            'room_amount'      => $data['room_amount'],
            'equipment_amount' => $data['equipment_amount'],
            'total_amount'     => $data['total_amount'],
            'deposit_amount'   => $data['deposit_amount'],
            'customer_name'    => $data['customer_name'],
            'customer_phone'   => $data['customer_phone'],
            'customer_email'   => $data['customer_email'],
            'note'             => $data['note'] ?? null,
            'status'           => $data['status'] ?? 'pending',
            'expires_at'       => $data['expires_at'],
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * Insert booking detail item
     *
     * @param array $detail
     * @param PDO|null $pdo
     * @return int
     */
    public function insertBookingDetail(array $detail, ?PDO $pdo = null): int
    {
        $db = $pdo ?? $this->pdo;

        $stmt = $db->prepare("
            INSERT INTO booking_details (
                booking_id,
                equipment_id,
                quantity,
                pricing_unit,
                unit_price,
                equipment_hours,
                subtotal
            ) VALUES (
                :booking_id,
                :equipment_id,
                :quantity,
                :pricing_unit,
                :unit_price,
                :equipment_hours,
                :subtotal
            )
        ");

        $stmt->execute([
            'booking_id'      => $detail['booking_id'],
            'equipment_id'    => $detail['equipment_id'],
            'quantity'        => $detail['quantity'],
            'pricing_unit'    => $detail['pricing_unit'],
            'unit_price'      => $detail['unit_price'],
            'equipment_hours' => $detail['equipment_hours'],
            'subtotal'        => $detail['subtotal'],
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * Update temporary booking code to permanent BK-YYYYMMDD-NNNN
     *
     * @param int $bookingId
     * @param string $code
     * @param PDO|null $pdo
     */
    public function updateBookingCode(int $bookingId, string $code, ?PDO $pdo = null): void
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("UPDATE bookings SET booking_code = :code WHERE booking_id = :id");
        $stmt->execute(['code' => $code, 'id' => $bookingId]);
    }

    /**
     * Insert an audit log entry
     *
     * @param int|null $userId
     * @param string $action
     * @param string $entityType
     * @param int $entityId
     * @param array $metadata
     * @param PDO|null $pdo
     */
    public function insertAuditLog(?int $userId, string $action, string $entityType, int $entityId, array $metadata, ?PDO $pdo = null): void
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            INSERT INTO audit_logs (
                user_id,
                action,
                entity_type,
                entity_id,
                metadata
            ) VALUES (
                :user_id,
                :action,
                :entity_type,
                :entity_id,
                :metadata
            )
        ");

        $stmt->execute([
            'user_id'     => $userId,
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'metadata'    => json_encode($metadata, JSON_UNESCAPED_UNICODE),
        ]);
    }

    /**
     * Find booking by ID
     *
     * @param int $bookingId
     * @param PDO|null $pdo
     * @return array|null
     */
    public function findBookingById(int $bookingId, ?PDO $pdo = null): ?array
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            SELECT b.*, r.name as room_name, s.studio_id, s.name as studio_name, s.host_id
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE b.booking_id = ?
        ");
        $stmt->execute([$bookingId]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ?: null;
    }

    /**
     * Get booking details with equipment name
     *
     * @param int $bookingId
     * @param PDO|null $pdo
     * @return array
     */
    public function getBookingDetails(int $bookingId, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            SELECT bd.*, e.name as equipment_name
            FROM booking_details bd
            JOIN equipments e ON bd.equipment_id = e.equipment_id
            WHERE bd.booking_id = ?
            ORDER BY bd.detail_id ASC
        ");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
