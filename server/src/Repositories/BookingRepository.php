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
     * Find booking by ID with FOR UPDATE locking
     *
     * @param int $bookingId
     * @param PDO $pdo
     * @return array|null
     */
    public function findBookingByIdForUpdate(int $bookingId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare("
            SELECT b.*, r.name as room_name, s.studio_id, s.name as studio_name, s.host_id
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE b.booking_id = ?
            FOR UPDATE
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

    /**
     * Update booking status and optional completed_at / expires_at
     *
     * @param int $bookingId
     * @param string $status
     * @param string|null $completedAt
     * @param string|null $expiresAt
     * @param PDO|null $pdo
     */
    public function updateBookingStatus(
        int $bookingId,
        string $status,
        ?string $completedAt = null,
        ?string $expiresAt = null,
        ?PDO $pdo = null
    ): void {
        $db = $pdo ?? $this->pdo;

        if ($status === 'confirmed') {
            // When confirmed, expires_at becomes NULL
            $stmt = $db->prepare("
                UPDATE bookings 
                SET status = :status, expires_at = NULL, updated_at = NOW() 
                WHERE booking_id = :id
            ");
            $stmt->execute(['status' => $status, 'id' => $bookingId]);
        } elseif ($status === 'completed') {
            $stmt = $db->prepare("
                UPDATE bookings 
                SET status = :status, completed_at = :completed_at, updated_at = NOW() 
                WHERE booking_id = :id
            ");
            $stmt->execute([
                'status'       => $status,
                'completed_at' => $completedAt ?? date('Y-m-d H:i:s'),
                'id'           => $bookingId,
            ]);
        } else {
            $stmt = $db->prepare("
                UPDATE bookings 
                SET status = :status, updated_at = NOW() 
                WHERE booking_id = :id
            ");
            $stmt->execute(['status' => $status, 'id' => $bookingId]);
        }
    }

    /**
     * Update expires_at for booking
     *
     * @param int $bookingId
     * @param string $expiresAt
     * @param PDO|null $pdo
     */
    public function updateBookingExpiresAt(int $bookingId, string $expiresAt, ?PDO $pdo = null): void
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("UPDATE bookings SET expires_at = :expires_at, updated_at = NOW() WHERE booking_id = :id");
        $stmt->execute(['expires_at' => $expiresAt, 'id' => $bookingId]);
    }

    /**
     * Insert payment into payments table
     *
     * @param array $data
     * @param PDO|null $pdo
     * @return int
     */
    public function insertPayment(array $data, ?PDO $pdo = null): int
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            INSERT INTO payments (
                booking_id,
                payment_type,
                payment_method,
                amount,
                status,
                transaction_code,
                paid_at
            ) VALUES (
                :booking_id,
                :payment_type,
                :payment_method,
                :amount,
                :status,
                :transaction_code,
                :paid_at
            )
        ");

        $stmt->execute([
            'booking_id'       => $data['booking_id'],
            'payment_type'     => $data['payment_type'],
            'payment_method'   => $data['payment_method'] ?? 'sandbox_qr',
            'amount'           => $data['amount'],
            'status'           => $data['status'] ?? 'success',
            'transaction_code' => $data['transaction_code'],
            'paid_at'          => $data['paid_at'] ?? date('Y-m-d H:i:s'),
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * Get successful payments for a booking
     *
     * @param int $bookingId
     * @param PDO|null $pdo
     * @return array
     */
    public function getSuccessfulPayments(int $bookingId, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            SELECT * FROM payments
            WHERE booking_id = ? AND status = 'success'
            ORDER BY paid_at ASC, payment_id ASC
        ");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all payments for a booking (for display in detail)
     *
     * @param int $bookingId
     * @param PDO|null $pdo
     * @return array
     */
    public function getAllPayments(int $bookingId, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            SELECT * FROM payments
            WHERE booking_id = ?
            ORDER BY created_at ASC, payment_id ASC
        ");
        $stmt->execute([$bookingId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find booking IDs that are pending and have expires_at <= NOW()
     * Uses index (status, expires_at)
     *
     * @param int $limit
     * @param PDO|null $pdo
     * @return int[]
     */
    public function findDueExpiredBookingIds(int $limit = 200, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;
        $stmt = $db->prepare("
            SELECT booking_id
            FROM bookings
            WHERE status = 'pending' AND expires_at <= NOW()
            ORDER BY expires_at ASC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * List bookings with filters and pagination
     *
     * @param array $filters
     * @param int $page
     * @param int $limit
     * @param PDO|null $pdo
     * @return array
     */
    public function listBookings(array $filters, int $page = 1, int $limit = 12, ?PDO $pdo = null): array
    {
        $db = $pdo ?? $this->pdo;
        $where = [];
        $params = [];

        if (!empty($filters['customer_id'])) {
            $where[] = 'b.customer_id = :customer_id';
            $params['customer_id'] = $filters['customer_id'];
        }

        if (!empty($filters['host_id'])) {
            $where[] = 's.host_id = :host_id';
            $params['host_id'] = $filters['host_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'b.status = :status';
            $params['status'] = $filters['status'];
        }

        $whereSql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countStmt = $db->prepare("
            SELECT COUNT(*)
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            {$whereSql}
        ");
        $countStmt->execute($params);
        $totalItems = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $totalPages = $totalItems > 0 ? (int) ceil($totalItems / $limit) : 1;

        // Query items
        $stmt = $db->prepare("
            SELECT b.*, r.name as room_name, s.studio_id, s.name as studio_name, s.host_id
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            {$whereSql}
            ORDER BY b.created_at DESC
            LIMIT :limit OFFSET :offset
        ");

        foreach ($params as $k => $v) {
            $stmt->bindValue(":{$k}", $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items'       => $items,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'page'        => $page,
            'limit'       => $limit,
        ];
    }
}
