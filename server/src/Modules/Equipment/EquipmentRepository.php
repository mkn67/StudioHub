<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

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
                   COALESCE((SELECT JSON_ARRAYAGG(ei.image_url) FROM equipment_images ei WHERE ei.equipment_id = e.equipment_id), JSON_ARRAY()) AS images,
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
            'images'         => is_string($item['images']) ? (json_decode($item['images'], true) ?: []) : [],
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

    /**
     * Create equipment
     *
     * @param array $data
     * @return int
     * @throws \App\Exceptions\ApiException
     */
    public function create(array $data): int
    {
        $pricingUnit = (string) ($data['pricing_unit'] ?? '');
        if (!in_array($pricingUnit, ['session', 'hour'], true)) {
            throw new \App\Exceptions\ApiException(400, 'invalid_pricing_unit', 'pricing_unit phải là session hoặc hour');
        }

        $totalQty = (int) ($data['total_quantity'] ?? 0);
        if ($totalQty <= 0) {
            throw new \App\Exceptions\ApiException(400, 'invalid_quantity', 'total_quantity phải lớn hơn 0');
        }

        $status = (string) ($data['status'] ?? 'active');
        if (!in_array($status, ['active', 'maintenance', 'inactive'], true)) {
            throw new \App\Exceptions\ApiException(400, 'invalid_status', 'Trạng thái thiết bị không hợp lệ');
        }

        $stmt = $this->pdo->prepare('
            INSERT INTO equipments (
                studio_id, category_id, name, brand, description,
                unit_price, pricing_unit, total_quantity, image_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['studio_id'],
            $data['category_id'] ?? null,
            $data['name'],
            $data['brand'] ?? null,
            $data['description'] ?? null,
            $data['unit_price'],
            $pricingUnit,
            $totalQty,
            $data['image_url'] ?? null,
            $status,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update equipment with stock check against future active bookings
     *
     * @param int $equipmentId
     * @param array $data
     * @return bool
     * @throws \App\Exceptions\ApiException
     */
    public function update(int $equipmentId, array $data): bool
    {
        if (isset($data['pricing_unit']) && !in_array($data['pricing_unit'], ['session', 'hour'], true)) {
            throw new \App\Exceptions\ApiException(400, 'invalid_pricing_unit', 'pricing_unit phải là session hoặc hour');
        }

        if (isset($data['status']) && !in_array($data['status'], ['active', 'maintenance', 'inactive'], true)) {
            throw new \App\Exceptions\ApiException(400, 'invalid_status', 'Trạng thái thiết bị không hợp lệ');
        }

        // Check stock reduction against future active bookings (Section 5.9)
        if (isset($data['total_quantity'])) {
            $newTotal = (int) $data['total_quantity'];
            if ($newTotal < 0) {
                throw new \App\Exceptions\ApiException(400, 'invalid_quantity', 'total_quantity không được âm');
            }

            $futureUsage = $this->getFutureActiveBookingsUsage($equipmentId);
            $peak = \App\Modules\Booking\StockCalculator::peakFutureUsage($futureUsage);
            if ($newTotal < $peak) {
                throw new \App\Exceptions\ApiException(
                    400,
                    'stock_reduction_conflict',
                    "Không thể giảm số lượng tồn kho xuống {$newTotal} vì mức sử dụng cao nhất của các đơn trong tương lai là {$peak}"
                );
            }
        }

        $allowed = ['category_id', 'name', 'brand', 'description', 'unit_price', 'pricing_unit', 'total_quantity', 'image_url', 'status'];
        $fields = [];
        $params = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $equipmentId;
        $sql = 'UPDATE equipments SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE equipment_id = ?';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function addImage(int $equipmentId, string $imageUrl, bool $isPrimary): int
    {
        $this->pdo->beginTransaction();
        try {
            if ($isPrimary) {
                $clear = $this->pdo->prepare('UPDATE equipment_images SET is_primary = 0 WHERE equipment_id = ?');
                $clear->execute([$equipmentId]);
                $update = $this->pdo->prepare('UPDATE equipments SET image_url = ?, updated_at = NOW() WHERE equipment_id = ?');
                $update->execute([$imageUrl, $equipmentId]);
            }
            $stmt = $this->pdo->prepare('INSERT INTO equipment_images (equipment_id, image_url, is_primary) VALUES (?, ?, ?)');
            $stmt->execute([$equipmentId, $imageUrl, $isPrimary ? 1 : 0]);
            $id = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();
            return $id;
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    public function deleteIfUnused(int $equipmentId, int $actorId): array
    {
        $this->pdo->beginTransaction();
        try {
            $lock = $this->pdo->prepare('SELECT image_url FROM equipments WHERE equipment_id = ? FOR UPDATE');
            $lock->execute([$equipmentId]);
            $imageUrl = $lock->fetchColumn();
            if ($imageUrl === false) throw new \App\Exceptions\ApiException(404, 'equipment_not_found', 'Không tìm thấy thiết bị');
            $usage = $this->pdo->prepare('SELECT 1 FROM booking_details WHERE equipment_id = ? LIMIT 1');
            $usage->execute([$equipmentId]);
            if ($usage->fetchColumn()) throw new \App\Exceptions\ApiException(409, 'equipment_in_use', 'Không thể xóa thiết bị đã xuất hiện trong lịch sử đặt phòng');
            $images = $this->pdo->prepare('SELECT image_url FROM equipment_images WHERE equipment_id = ?');
            $images->execute([$equipmentId]);
            $urls = $images->fetchAll(PDO::FETCH_COLUMN);
            if (is_string($imageUrl) && $imageUrl !== '') $urls[] = $imageUrl;
            $delete = $this->pdo->prepare('DELETE FROM equipments WHERE equipment_id = ?');
            $delete->execute([$equipmentId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'equipment_permanently_deleted', 'equipments', ?, JSON_OBJECT('image_count', ?))");
            $audit->execute([$actorId, $equipmentId, count($urls)]);
            $this->pdo->commit();
            return array_values(array_unique($urls));
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    /**
     * Get future active bookings using this equipment for peakUsage calculation
     *
     * @param int $equipmentId
     * @return array<int, array{busy_start: string, busy_end: string, quantity: int}>
     */
    public function getFutureActiveBookingsUsage(int $equipmentId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT bd.quantity, b.busy_start, b.busy_end
            FROM booking_details bd
            JOIN bookings b ON bd.booking_id = b.booking_id
            WHERE bd.equipment_id = ?
              AND (
                b.status IN ('confirmed', 'checked_in')
                OR (b.status = 'pending' AND b.expires_at > NOW())
              )
              AND b.busy_end >= NOW()
        ");
        $stmt->execute([$equipmentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

