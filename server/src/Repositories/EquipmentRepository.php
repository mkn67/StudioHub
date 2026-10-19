<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

class EquipmentRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Get active equipments for a studio, optionally filtered by category.
     * Includes category name from equipment_categories.
     *
     * @param int $studioId
     * @param int|null $categoryId
     * @return array<int, array>
     */
    public function getActiveEquipmentsByStudio(int $studioId, ?int $categoryId = null): array
    {
        $sql = "
            SELECT e.equipment_id,
                   e.studio_id,
                   e.category_id,
                   ec.name as category_name,
                   e.name,
                   e.brand,
                   e.description,
                   e.unit_price,
                   e.pricing_unit,
                   e.total_quantity,
                   e.image_url,
                   e.status
            FROM equipments e
            JOIN equipment_categories ec ON e.category_id = ec.category_id
            WHERE e.studio_id = :studio_id
              AND e.status = 'active'
        ";

        $params = ['studio_id' => $studioId];

        if ($categoryId !== null) {
            $sql .= ' AND e.category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        $sql .= ' ORDER BY ec.category_id ASC, e.name ASC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return array_map(fn($item) => [
            'equipment_id'   => (int) $item['equipment_id'],
            'studio_id'      => (int) $item['studio_id'],
            'category_id'    => (int) $item['category_id'],
            'category_name'  => $item['category_name'],
            'name'           => $item['name'],
            'brand'          => $item['brand'],
            'description'    => $item['description'],
            'unit_price'     => (int) round((float) $item['unit_price']),
            'pricing_unit'   => $item['pricing_unit'],
            'total_quantity' => (int) $item['total_quantity'],
            'image_url'      => $item['image_url'],
            'status'         => $item['status'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Check if a studio exists and is active.
     *
     * @param int $studioId
     * @return bool
     */
    public function isStudioActive(int $studioId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT 1
            FROM studios
            WHERE studio_id = :studio_id
              AND status = 'active'
        ");
        $stmt->execute(['studio_id' => $studioId]);

        return (bool) $stmt->fetchColumn();
    }
}

