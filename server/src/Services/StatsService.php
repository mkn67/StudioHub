<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

class StatsService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Parse and validate statistics period [from 00:00:00, to 00:00:00)
     *
     * @param array $query
     * @return array{from: string, to: string, from_dt: string, to_dt: string, days: int}
     * @throws ApiException
     */
    public function resolvePeriod(array $query): array
    {
        $from = isset($query['from']) ? trim((string) $query['from']) : date('Y-m-01');
        $to = isset($query['to']) ? trim((string) $query['to']) : date('Y-m-01', strtotime('+1 month'));

        $dateRegex = '/^\d{4}-\d{2}-\d{2}$/';
        if (!preg_match($dateRegex, $from) || !preg_match($dateRegex, $to)) {
            throw new ApiException(
                400,
                'invalid_date_format',
                'Định dạng ngày không hợp lệ, yêu cầu YYYY-MM-DD'
            );
        }

        [$fy, $fm, $fd] = explode('-', $from);
        [$ty, $tm, $td] = explode('-', $to);

        if (!checkdate((int) $fm, (int) $fd, (int) $fy) || !checkdate((int) $tm, (int) $td, (int) $ty)) {
            throw new ApiException(
                400,
                'invalid_date',
                'Ngày được cung cấp không tồn tại trong lịch'
            );
        }

        $fromTs = strtotime($from . ' 00:00:00');
        $toTs = strtotime($to . ' 00:00:00');

        if ($fromTs >= $toTs) {
            throw new ApiException(
                400,
                'invalid_date_range',
                'Ngày bắt đầu phải trước ngày kết thúc'
            );
        }

        $days = (int) round(($toTs - $fromTs) / 86400);
        if ($days > 366) {
            throw new ApiException(
                400,
                'range_too_long',
                'Khoảng thời gian thống kê không được vượt quá 366 ngày'
            );
        }

        return [
            'from'    => $from,
            'to'      => $to,
            'from_dt' => $from . ' 00:00:00',
            'to_dt'   => $to . ' 00:00:00',
            'days'    => $days,
        ];
    }

    /**
     * Pure function to calculate overlap hours between a booking interval and a period
     *
     * @param string $startTime Y-m-d H:i:s
     * @param string $endTime Y-m-d H:i:s
     * @param string $fromDt Y-m-d H:i:s
     * @param string $toDt Y-m-d H:i:s
     * @return float
     */
    public static function calculateOverlapHours(string $startTime, string $endTime, string $fromDt, string $toDt): float
    {
        $bStart = strtotime($startTime);
        $bEnd = strtotime($endTime);
        $pFrom = strtotime($fromDt);
        $pTo = strtotime($toDt);

        $overlapStart = max($bStart, $pFrom);
        $overlapEnd = min($bEnd, $pTo);

        if ($overlapEnd <= $overlapStart) {
            return 0.0;
        }

        return ($overlapEnd - $overlapStart) / 3600.0;
    }

    /**
     * Pure function to calculate occupancy rate
     *
     * @param float $usedHours
     * @param int $activeRooms
     * @param int $days
     * @param int $operatingHours
     * @return float
     */
    public static function computeOccupancyRate(float $usedHours, int $activeRooms, int $days, int $operatingHours): float
    {
        if ($activeRooms <= 0 || $days <= 0 || $operatingHours <= 0) {
            return 0.0;
        }

        $totalCapacityHours = $activeRooms * $days * $operatingHours;
        return round(($usedHours / $totalCapacityHours) * 100, 1);
    }

    /**
     * Get platform statistics for Admin (Section 5.7)
     *
     * @param array $query
     * @return array
     */
    public function getAdminStatistics(array $query): array
    {
        $period = $this->resolvePeriod($query);
        $fromDt = $period['from_dt'];
        $toDt = $period['to_dt'];
        $days = $period['days'];

        $operatingHours = (int) ($_ENV['OPERATING_HOURS'] ?? 12);

        // 1. Total bookings: start_time in [from, to), status <> 'expired'
        $stmtBookings = $this->pdo->prepare("
            SELECT COUNT(*) FROM bookings
            WHERE start_time >= ? AND start_time < ? AND status <> 'expired'
        ");
        $stmtBookings->execute([$fromDt, $toDt]);
        $totalBookings = (int) $stmtBookings->fetchColumn();

        // 2. Total revenue: completed_at in [from, to), status = 'completed'
        $stmtRev = $this->pdo->prepare("
            SELECT COALESCE(SUM(total_amount), 0) FROM bookings
            WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?
        ");
        $stmtRev->execute([$fromDt, $toDt]);
        $totalRevenue = (int) $stmtRev->fetchColumn();

        // 3. Active studios & rooms count as of NOW
        $stmtStudios = $this->pdo->query("SELECT COUNT(*) FROM studios WHERE status = 'active'");
        $totalStudios = (int) $stmtStudios->fetchColumn();

        $stmtRooms = $this->pdo->query("
            SELECT COUNT(*) FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE r.status = 'active' AND s.status = 'active'
        ");
        $totalRooms = (int) $stmtRooms->fetchColumn();

        // 4. Total active customers
        $stmtCustomers = $this->pdo->query("
            SELECT COUNT(*) FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE r.role_name = 'customer' AND u.status = 'active'
        ");
        $totalCustomers = (int) $stmtCustomers->fetchColumn();

        // 5. Occupancy rate
        $stmtOcc = $this->pdo->prepare("
            SELECT b.start_time, b.end_time
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE b.status IN ('confirmed', 'checked_in', 'completed')
              AND b.start_time < ? AND b.end_time > ?
        ");
        $stmtOcc->execute([$toDt, $fromDt]);
        $occBookings = $stmtOcc->fetchAll(PDO::FETCH_ASSOC);

        $totalUsedHours = 0.0;
        foreach ($occBookings as $b) {
            $totalUsedHours += self::calculateOverlapHours($b['start_time'], $b['end_time'], $fromDt, $toDt);
        }

        $occupancyRate = self::computeOccupancyRate($totalUsedHours, $totalRooms, $days, $operatingHours);

        return [
            'period'          => [
                'from' => $period['from'],
                'to'   => $period['to'],
            ],
            'total_bookings'  => $totalBookings,
            'total_revenue'   => $totalRevenue,
            'occupancy_rate'  => $occupancyRate,
            'total_studios'   => $totalStudios,
            'total_rooms'     => $totalRooms,
            'total_customers' => $totalCustomers,
        ];
    }

    /**
     * Get statistics for a specific Host (Section 5.7)
     *
     * @param int $hostId
     * @param array $query
     * @return array
     */
    public function getHostStatistics(int $hostId, array $query): array
    {
        $period = $this->resolvePeriod($query);
        $fromDt = $period['from_dt'];
        $toDt = $period['to_dt'];
        $days = $period['days'];

        $operatingHours = (int) ($_ENV['OPERATING_HOURS'] ?? 12);

        // 1. Total bookings for host's studios
        $stmtBookings = $this->pdo->prepare("
            SELECT COUNT(*) FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE s.host_id = ?
              AND b.start_time >= ? AND b.start_time < ?
              AND b.status <> 'expired'
        ");
        $stmtBookings->execute([$hostId, $fromDt, $toDt]);
        $totalBookings = (int) $stmtBookings->fetchColumn();

        // 2. Total revenue for host's studios
        $stmtRev = $this->pdo->prepare("
            SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE s.host_id = ?
              AND b.status = 'completed'
              AND b.completed_at >= ? AND b.completed_at < ?
        ");
        $stmtRev->execute([$hostId, $fromDt, $toDt]);
        $totalRevenue = (int) $stmtRev->fetchColumn();

        // 3. Active studios & rooms count for this host
        $stmtStudios = $this->pdo->prepare("
            SELECT COUNT(*) FROM studios
            WHERE host_id = ? AND status = 'active'
        ");
        $stmtStudios->execute([$hostId]);
        $totalStudios = (int) $stmtStudios->fetchColumn();

        $stmtRooms = $this->pdo->prepare("
            SELECT COUNT(*) FROM rooms r
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE s.host_id = ? AND r.status = 'active' AND s.status = 'active'
        ");
        $stmtRooms->execute([$hostId]);
        $totalRooms = (int) $stmtRooms->fetchColumn();

        // 4. Occupancy rate for host's active rooms
        $stmtOcc = $this->pdo->prepare("
            SELECT b.start_time, b.end_time
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN studios s ON r.studio_id = s.studio_id
            WHERE s.host_id = ?
              AND b.status IN ('confirmed', 'checked_in', 'completed')
              AND b.start_time < ? AND b.end_time > ?
        ");
        $stmtOcc->execute([$hostId, $toDt, $fromDt]);
        $occBookings = $stmtOcc->fetchAll(PDO::FETCH_ASSOC);

        $totalUsedHours = 0.0;
        foreach ($occBookings as $b) {
            $totalUsedHours += self::calculateOverlapHours($b['start_time'], $b['end_time'], $fromDt, $toDt);
        }

        $occupancyRate = self::computeOccupancyRate($totalUsedHours, $totalRooms, $days, $operatingHours);

        return [
            'period'         => [
                'from' => $period['from'],
                'to'   => $period['to'],
            ],
            'total_bookings' => $totalBookings,
            'total_revenue'  => $totalRevenue,
            'occupancy_rate' => $occupancyRate,
            'total_studios'  => $totalStudios,
            'total_rooms'    => $totalRooms,
        ];
    }
}

