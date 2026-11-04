<?php

declare(strict_types=1);
namespace App\Modules\Studios;
use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
class HostRoomTypeService
{
    private PDO $pdo;
    public function __construct(?PDO $pdo = null) { $this->pdo = $pdo ?? Db::getConnection(); }
    public function list(int $hostId, ?int $studioId = null): array
    {
        $sql = 'SELECT t.*, s.name AS studio_name FROM host_room_types t JOIN studios s ON s.studio_id = t.studio_id WHERE s.host_id = ?';
        $params = [$hostId];
        if ($studioId !== null) { $sql .= ' AND t.studio_id = ?'; $params[] = $studioId; }
        $sql .= ' ORDER BY t.studio_id, t.room_type_id';
        $stmt = $this->pdo->prepare($sql); $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) if (is_string($row['amenities'])) $row['amenities'] = json_decode($row['amenities'], true) ?: [];
        unset($row);
        return $rows;
    }
    public function create(int $hostId, array $data): array
    {
        $studioId = filter_var($data['studio_id'] ?? null, FILTER_VALIDATE_INT);
        if ($studioId === false || $studioId === null || $studioId < 1) throw new ApiException(400, 'studio_id_required', 'studio_id hợp lệ là bắt buộc');
        $this->assertStudioOwner($hostId, (int) $studioId);
        $values = $this->validate($data, false);
        $stmt = $this->pdo->prepare('INSERT INTO host_room_types (studio_id, name, description, capacity, area, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([(int) $studioId, $values['name'], $values['description'], $values['capacity'], $values['area'], json_encode($values['amenities'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $values['status']]);
        $id = (int) $this->pdo->lastInsertId();
        $this->audit($hostId, $id, 'host_room_type_created');
        return $this->findOwned($hostId, $id);
    }
    public function update(int $hostId, int $id, array $data): array
    {
        if ($data === []) throw new ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        $current = $this->findOwned($hostId, $id);
        $input = array_replace($current, $data);
        if (array_diff(array_keys($data), ['name','description','capacity','area','amenities','status']) !== []) throw new ApiException(400, 'unknown_fields', 'Payload có field không hỗ trợ');
        $values = $this->validate($input, true);
        $stmt = $this->pdo->prepare('UPDATE host_room_types SET name = ?, description = ?, capacity = ?, area = ?, amenities = ?, status = ? WHERE room_type_id = ?');
        $stmt->execute([$values['name'], $values['description'], $values['capacity'], $values['area'], json_encode($values['amenities'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $values['status'], $id]);
        $this->audit($hostId, $id, 'host_room_type_updated');
        return $this->findOwned($hostId, $id);
    }
    private function validate(array $data, bool $partial): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));
        $capacity = $data['capacity'] ?? null;
        $area = $data['area'] ?? null;
        $amenities = $data['amenities'] ?? [];
        $status = (string) ($data['status'] ?? 'active');
        if ($name === '' || strlen($name) > 100 || strlen($description) > 500 || !in_array($status, ['active','inactive'], true)) throw new ApiException(400, 'validation_failed', 'Tên, mô tả hoặc trạng thái loại phòng không hợp lệ');
        if ($capacity !== null && (filter_var($capacity, FILTER_VALIDATE_INT) === false || (int) $capacity < 1)) throw new ApiException(400, 'invalid_capacity', 'capacity phải là số nguyên dương');
        if ($area !== null && (!is_numeric($area) || (float) $area <= 0)) throw new ApiException(400, 'invalid_area', 'area phải lớn hơn 0');
        if (!is_array($amenities) || count($amenities) > 30) throw new ApiException(400, 'invalid_amenities', 'amenities phải là mảng tối đa 30 phần tử');
        foreach ($amenities as $amenity) if (!is_string($amenity) || trim($amenity) === '' || strlen($amenity) > 100) throw new ApiException(400, 'invalid_amenities', 'Mỗi tiện ích phải là chuỗi tối đa 100 ký tự');
        return ['name' => $name, 'description' => $description !== '' ? $description : null, 'capacity' => $capacity !== null ? (int) $capacity : null, 'area' => $area !== null ? (float) $area : null, 'amenities' => array_values($amenities), 'status' => $status];
    }
    private function findOwned(int $hostId, int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT t.* FROM host_room_types t JOIN studios s ON s.studio_id = t.studio_id WHERE t.room_type_id = ? AND s.host_id = ?');
        $stmt->execute([$id, $hostId]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new ApiException(404, 'room_type_not_found', 'Không tìm thấy loại phòng thuộc Studio của bạn');
        if (is_string($row['amenities'])) $row['amenities'] = json_decode($row['amenities'], true) ?: [];
        return $row;
    }
    private function assertStudioOwner(int $hostId, int $studioId): void
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM studios WHERE studio_id = ? AND host_id = ?'); $stmt->execute([$studioId, $hostId]);
        if (!$stmt->fetchColumn()) throw new ApiException(404, 'studio_not_found', 'Studio không tồn tại hoặc không thuộc tài khoản này');
    }
    private function audit(int $hostId, int $id, string $action): void
    {
        $stmt = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'host_room_types', ?, JSON_OBJECT('room_type_id', ?))");
        $stmt->execute([$hostId, $action, $id, $id]);
    }
}
