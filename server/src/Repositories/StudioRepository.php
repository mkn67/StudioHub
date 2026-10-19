<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

class StudioRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Find all studios owned by a specific host
     *
     * @param int $hostId
     * @return array
     */
    public function findByHostId(int $hostId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT s.*, 
                   COUNT(DISTINCT r.room_id) as total_rooms,
                   COUNT(DISTINCT e.equipment_id) as total_equipments
            FROM studios s
            LEFT JOIN rooms r ON s.studio_id = r.studio_id AND r.status <> "inactive"
            LEFT JOIN equipments e ON s.studio_id = e.studio_id AND e.status <> "inactive"
            WHERE s.host_id = ?
            GROUP BY s.studio_id
            ORDER BY s.studio_id ASC
        ');
        $stmt->execute([$hostId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find studio by ID
     *
     * @param int $studioId
     * @return array|null
     */
    public function findById(int $studioId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM studios WHERE studio_id = ?');
        $stmt->execute([$studioId]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ?: null;
    }

    /**
     * Create new studio
     *
     * @param array $data
     * @return int Inserted studio_id
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO studios (host_id, name, description, address, district, city, phone, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['host_id'],
            $data['name'],
            $data['description'] ?? null,
            $data['address'],
            $data['district'],
            $data['city'],
            $data['phone'],
            $data['status'] ?? 'active',
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update studio
     *
     * @param int $studioId
     * @param array $data
     * @return bool
     */
    public function update(int $studioId, array $data): bool
    {
        $fields = [];
        $params = [];

        $allowedFields = ['name', 'description', 'address', 'district', 'city', 'phone', 'status'];
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $studioId;
        $sql = 'UPDATE studios SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE studio_id = ?';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }
}
