<?php

declare(strict_types=1);

namespace App\Modules\Shared;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

class OwnershipGuard
{
    /**
     * Assert that host owns the specified studio.
     *
     * @param int $hostId
     * @param int $studioId
     * @return array The studio record
     * @throws ApiException (404 if not found, 403 if not owner)
     */
    public static function assertOwnsStudio(int $hostId, int $studioId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('SELECT studio_id, host_id, name, status FROM studios WHERE studio_id = ?');
        $stmt->execute([$studioId]);
        $studio = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$studio) {
            throw new ApiException(404, 'studio_not_found', 'Cơ sở studio không tồn tại');
        }

        if ((int) $studio['host_id'] !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý cơ sở studio này');
        }

        return $studio;
    }

    /**
     * Assert that host owns the specified room.
     *
     * @param int $hostId
     * @param int $roomId
     * @return array The room record (joined with studio)
     * @throws ApiException (404 if not found, 403 if not owner)
     */
    public static function assertOwnsRoom(int $hostId, int $roomId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT r.room_id, r.studio_id, r.name, r.status, s.host_id
            FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE r.room_id = ?
        ');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            throw new ApiException(404, 'room_not_found', 'Phòng studio không tồn tại');
        }

        if ((int) $room['host_id'] !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý phòng studio này');
        }

        return $room;
    }

    /**
     * Assert that host owns the specified equipment.
     *
     * @param int $hostId
     * @param int $equipmentId
     * @return array The equipment record
     * @throws ApiException (404 if not found, 403 if not owner)
     */
    public static function assertOwnsEquipment(int $hostId, int $equipmentId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT e.equipment_id, e.studio_id, e.name, e.status, s.host_id
            FROM equipments e
            JOIN studios s ON e.studio_id = s.studio_id
            WHERE e.equipment_id = ?
        ');
        $stmt->execute([$equipmentId]);
        $equipment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$equipment) {
            throw new ApiException(404, 'equipment_not_found', 'Thiết bị không tồn tại');
        }

        if ((int) $equipment['host_id'] !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý thiết bị này');
        }

        return $equipment;
    }

    /**
     * Assert that host owns the studio associated with the booking.
     *
     * @param int $hostId
     * @param int $bookingId
     * @return array The booking record
     * @throws ApiException (404 if not found, 403 if not owner)
     */
    public static function assertOwnsBooking(int $hostId, int $bookingId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT b.booking_id, b.room_id, b.status, s.host_id, s.studio_id
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE b.booking_id = ?
        ');
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
        }

        if ((int) $booking['host_id'] !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý đơn đặt phòng này');
        }

        return $booking;
    }

    /**
     * Assert that customer owns the booking.
     *
     * @param int $customerId
     * @param int $bookingId
     * @return array The booking record
     * @throws ApiException (404 if not found, 403 if not customer owner)
     */
    public static function assertBookingOfCustomer(int $customerId, int $bookingId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT booking_id, customer_id, room_id, status
            FROM bookings
            WHERE booking_id = ?
        ');
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
        }

        if ((int) $booking['customer_id'] !== $customerId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền truy cập đơn đặt phòng của người khác');
        }

        return $booking;
    }

    /**
     * Assert that host owns the specified room rate and the rate belongs to the room.
     *
     * @param int $hostId
     * @param int $roomId
     * @param int $rateId
     * @return array The rate record
     * @throws ApiException (404 if not found, 400 if rate does not belong to room, 403 if not owner)
     */
    public static function assertOwnsRate(int $hostId, int $roomId, int $rateId): array
    {
        $room = self::assertOwnsRoom($hostId, $roomId);

        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM room_rates WHERE rate_id = ?');
        $stmt->execute([$rateId]);
        $rate = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rate) {
            throw new ApiException(404, 'rate_not_found', 'Bảng giá không tồn tại');
        }

        if ((int) $rate['room_id'] !== $roomId) {
            throw new ApiException(400, 'invalid_rate', 'Bảng giá không thuộc phòng này');
        }

        return $rate;
    }

    /**
     * Assert that host owns the equipment category.
     *
     * @param int $hostId
     * @param int $categoryId
     * @return array The category record
     * @throws ApiException (404 if not found, 403 if not owner)
     */
    public static function assertOwnsCategory(int $hostId, int $categoryId): array
    {
        $pdo = Db::getConnection();
        $stmt = $pdo->prepare('
            SELECT c.*, s.host_id
            FROM equipment_categories c
            JOIN studios s ON c.studio_id = s.studio_id
            WHERE c.category_id = ?
        ');
        $stmt->execute([$categoryId]);
        $cat = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cat) {
            throw new ApiException(404, 'category_not_found', 'Danh mục thiết bị không tồn tại');
        }

        if ((int) $cat['host_id'] !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý danh mục thiết bị này');
        }

        return $cat;
    }
}

