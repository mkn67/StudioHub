<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Core\Db;
use PDO;

class EquipmentCategoryRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Find categories by studio ID
     *
     * @param int $studioId
     * @return array
     */
    public function findByStudioId(int $studioId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT c.*, COUNT(e.equipment_id) as total_equipments
            FROM equipment_categories c
            LEFT JOIN equipments e ON c.category_id = e.category_id AND e.status <> \'inactive\'
            WHERE c.studio_id = ?
            GROUP BY c.category_id
            ORDER BY c.category_id ASC
        ');
        $stmt->execute([$studioId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find category by ID
     *
     * @param int $categoryId
     * @return array|null
     */
    public function findById(int $categoryId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM equipment_categories WHERE category_id = ?');
        $stmt->execute([$categoryId]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ?: null;
    }

    /**
     * Create equipment category
     *
     * @param array $data
     * @return int
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO equipment_categories (studio_id, name, description)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([
            $data['studio_id'],
            $data['name'],
            $data['description'] ?? null,
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}

