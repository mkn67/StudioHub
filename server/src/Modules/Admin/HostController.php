<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Admin\StatsService;
use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

class HostController
{
    private StatsService $statsService;
    private PDO $pdo;

    public function __construct(?StatsService $statsService = null, ?PDO $pdo = null)
    {
        $this->statsService = $statsService ?? new StatsService();
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * GET /api/host/statistics
     * Host authenticated endpoint to view studio statistics
     */
    public function statistics(Request $request): void
    {
        $query = $request->query();
        $user = $request->getAttribute('user');

        $result = $this->statsService->getHostStatistics((int) $user['user_id'], $query);

        ApiResponse::ok($result, 'Lấy thống kê cơ sở studio thành công');
    }

    /** GET /api/host/rooms?studio_id= */
    public function rooms(Request $request): void
    {
        $userId = (int) $request->user()['user_id'];
        $requestedStudio = trim((string) $request->query('studio_id', ''));
        if ($requestedStudio !== '') {
            $studioId = $this->ownedStudioId($userId, (int) $requestedStudio);
            $sql = 'SELECT r.*, s.name AS studio_name FROM rooms r JOIN studios s ON s.studio_id = r.studio_id WHERE s.studio_id = ? ORDER BY r.room_id DESC';
            $params = [$studioId];
        } else {
            $sql = 'SELECT r.*, s.name AS studio_name FROM rooms r JOIN studios s ON s.studio_id = r.studio_id WHERE s.host_id = ? ORDER BY r.room_id DESC';
            $params = [$userId];
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        ApiResponse::ok($stmt->fetchAll(PDO::FETCH_ASSOC), 'Lấy danh sách phòng quản lý thành công');
    }

    /** GET /api/host/rooms/{id} */
    public function room(Request $request, array $vars): void
    {
        $userId = (int) $request->user()['user_id'];
        $stmt = $this->pdo->prepare('SELECT r.* FROM rooms r JOIN studios s ON s.studio_id = r.studio_id WHERE r.room_id = ? AND s.host_id = ?');
        $stmt->execute([(int) $vars['id'], $userId]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            throw new ApiException(404, 'room_not_found', 'Không tìm thấy phòng thuộc quyền quản lý');
        }
        foreach (['room_space_types' => 'space_types', 'room_amenities' => 'amenities', 'room_images' => 'images'] as $table => $key) {
            $relation = $this->pdo->prepare("SELECT * FROM {$table} WHERE room_id = ?");
            $relation->execute([(int) $vars['id']]);
            $room[$key] = $relation->fetchAll(PDO::FETCH_ASSOC);
        }
        ApiResponse::ok($room, 'Lấy chi tiết phòng quản lý thành công');
    }

    /** GET /api/host/rooms/{id}/rates */
    public function roomRates(Request $request, array $vars): void
    {
        $ownership = $this->pdo->prepare('SELECT 1 FROM rooms r JOIN studios s ON s.studio_id = r.studio_id WHERE r.room_id = ? AND s.host_id = ?');
        $ownership->execute([(int) $vars['id'], (int) $request->user()['user_id']]);
        if (!$ownership->fetchColumn()) {
            throw new ApiException(404, 'room_not_found', 'Không tìm thấy phòng thuộc quyền quản lý');
        }
        $stmt = $this->pdo->prepare('SELECT rr.* FROM room_rates rr JOIN rooms r ON r.room_id = rr.room_id JOIN studios s ON s.studio_id = r.studio_id WHERE r.room_id = ? AND s.host_id = ? ORDER BY rr.effective_from DESC, rr.rate_id DESC');
        $stmt->execute([(int) $vars['id'], (int) $request->user()['user_id']]);
        ApiResponse::ok($stmt->fetchAll(PDO::FETCH_ASSOC), 'Lấy toàn bộ bảng giá quản lý thành công');
    }

    /** GET /api/host/equipments?studio_id=&status= */
    public function equipments(Request $request): void
    {
        $userId = (int) $request->user()['user_id'];
        $requestedStudio = trim((string) $request->query('studio_id', ''));
        if ($requestedStudio !== '') {
            $studioId = $this->ownedStudioId($userId, (int) $requestedStudio);
            $scope = 'e.studio_id = ?';
            $params = [$studioId];
        } else {
            $scope = 's.host_id = ?';
            $params = [$userId];
        }
        $status = trim((string) $request->query('status', ''));
        if ($status !== '' && !in_array($status, ['active', 'maintenance', 'inactive'], true)) {
            throw new ApiException(400, 'invalid_status', 'Trạng thái thiết bị không hợp lệ');
        }
        $sql = 'SELECT e.*, c.name AS category_name, COALESCE((SELECT JSON_ARRAYAGG(ei.image_url) FROM equipment_images ei WHERE ei.equipment_id = e.equipment_id), JSON_ARRAY()) AS images FROM equipments e JOIN equipment_categories c ON c.category_id = e.category_id JOIN studios s ON s.studio_id = e.studio_id WHERE ' . $scope;
        if ($status !== '') { $sql .= ' AND e.status = ?'; $params[] = $status; }
        $sql .= ' ORDER BY e.equipment_id DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($items as &$item) $item['images'] = is_string($item['images']) ? (json_decode($item['images'], true) ?: []) : [];
        unset($item);
        ApiResponse::ok($items, 'Lấy danh sách thiết bị quản lý thành công');
    }

    /** GET /api/host/calendar?studio_id=&from=&to= */
    public function calendar(Request $request): void
    {
        $userId = (int) $request->user()['user_id'];
        $requestedStudio = trim((string) $request->query('studio_id', ''));
        if ($requestedStudio !== '') {
            $studioId = $this->ownedStudioId($userId, (int) $requestedStudio);
            $studioScope = 's.studio_id = ?';
            $params = [$studioId];
        } else {
            $studioId = null;
            $studioScope = 's.host_id = ?';
            $params = [$userId];
        }
        $from = trim((string) $request->query('from', date('Y-m-d')));
        $to = trim((string) $request->query('to', date('Y-m-d', strtotime('+30 days'))));
        if (!$this->validDate($from) || !$this->validDate($to) || $from > $to || (strtotime($to) - strtotime($from)) / 86400 > 62) {
            throw new ApiException(400, 'invalid_date_range', 'Khoảng ngày không hợp lệ hoặc vượt quá 62 ngày');
        }
        $stmt = $this->pdo->prepare("SELECT b.booking_id, b.booking_code, s.studio_id, s.name AS studio_name, b.room_id, r.name AS room_name, b.start_time, b.end_time, b.busy_start, b.busy_end, b.status FROM bookings b JOIN rooms r ON r.room_id = b.room_id JOIN studios s ON s.studio_id = r.studio_id WHERE {$studioScope} AND b.busy_end > ? AND b.busy_start < DATE_ADD(?, INTERVAL 1 DAY) AND (b.status IN ('confirmed','checked_in') OR (b.status = 'pending' AND b.expires_at > NOW())) ORDER BY b.busy_start");
        $stmt->execute([...$params, $from . ' 00:00:00', $to . ' 00:00:00']);
        ApiResponse::ok(['studio_id' => $studioId, 'from' => $from, 'to' => $to, 'bookings' => $stmt->fetchAll(PDO::FETCH_ASSOC)], 'Lấy lịch tổng hợp thành công');
    }

    /** GET /api/host/reports/series */
    public function reportSeries(Request $request): void
    {
        $hostId = (int) $request->user()['user_id'];
        $period = $this->statsService->resolvePeriod($request->query());
        $from = $period['from_dt'];
        $to = $period['to_dt'];
        $bookings = $this->pdo->prepare("SELECT DATE(b.start_time) AS date, COUNT(*) AS total FROM bookings b JOIN rooms r ON r.room_id = b.room_id JOIN studios s ON s.studio_id = r.studio_id WHERE s.host_id = ? AND b.start_time >= ? AND b.start_time < ? AND b.status <> 'expired' GROUP BY DATE(b.start_time)");
        $bookings->execute([$hostId, $from, $to]);
        $series = [];
        foreach ($bookings->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $series[$row['date']] = ['date' => $row['date'], 'bookings' => (int) $row['total'], 'revenue' => 0];
        }
        $revenue = $this->pdo->prepare("SELECT DATE(b.completed_at) AS date, COALESCE(SUM(b.total_amount), 0) AS total FROM bookings b JOIN rooms r ON r.room_id = b.room_id JOIN studios s ON s.studio_id = r.studio_id WHERE s.host_id = ? AND b.status = 'completed' AND b.completed_at >= ? AND b.completed_at < ? GROUP BY DATE(b.completed_at)");
        $revenue->execute([$hostId, $from, $to]);
        foreach ($revenue->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $series[$row['date']] ??= ['date' => $row['date'], 'bookings' => 0, 'revenue' => 0];
            $series[$row['date']]['revenue'] = (int) round((float) $row['total']);
        }
        ksort($series);
        ApiResponse::ok(['period' => ['from' => $period['from'], 'to' => $period['to']], 'series' => array_values($series)], 'Lấy chuỗi báo cáo Host thành công');
    }

    /** GET /api/host/overview */
    public function overview(Request $request): void
    {
        $hostId = (int) $request->user()['user_id'];
        $stats = $this->statsService->getHostStatistics($hostId, $request->query());
        $stmt = $this->pdo->prepare("SELECT b.booking_id, b.booking_code, b.room_id, r.name AS room_name, b.start_time, b.end_time, b.status FROM bookings b JOIN rooms r ON r.room_id = b.room_id JOIN studios s ON s.studio_id = r.studio_id WHERE s.host_id = ? AND ((b.status = 'pending' AND b.expires_at > NOW()) OR b.status IN ('confirmed','checked_in')) AND b.start_time >= NOW() ORDER BY b.start_time LIMIT 10");
        $stmt->execute([$hostId]);
        ApiResponse::ok(['statistics' => $stats, 'upcoming_bookings' => $stmt->fetchAll(PDO::FETCH_ASSOC)], 'Lấy tổng quan Host thành công');
    }

    private function ownedStudioId(int $userId, int $studioId): int
    {
        if ($studioId <= 0) {
            $stmt = $this->pdo->prepare('SELECT studio_id FROM studios WHERE host_id = ? ORDER BY studio_id LIMIT 1');
            $stmt->execute([$userId]);
            $studioId = (int) $stmt->fetchColumn();
        }
        $stmt = $this->pdo->prepare('SELECT 1 FROM studios WHERE studio_id = ? AND host_id = ?');
        $stmt->execute([$studioId, $userId]);
        if (!$stmt->fetchColumn()) {
            throw new ApiException(404, 'studio_not_found', 'Không tìm thấy Studio thuộc quyền quản lý');
        }
        return $studioId;
    }

    private function validDate(string $date): bool
    {
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        return $parsed !== false && $parsed->format('Y-m-d') === $date;
    }
}

