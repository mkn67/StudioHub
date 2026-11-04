<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Exceptions\ApiException;
use App\Modules\Equipment\EquipmentRepository;

class EquipmentService
{
    private EquipmentRepository $equipmentRepo;

    public function __construct(?EquipmentRepository $equipmentRepo = null)
    {
        $this->equipmentRepo = $equipmentRepo ?? new EquipmentRepository();
    }

    /**
     * Get active equipments for a studio.
     *
     * @param array $queryParams
     * @return array<int, array>
     * @throws ApiException
     */
    public function getEquipments(array $queryParams): array
    {
        // studio_id is strictly required
        if (!isset($queryParams['studio_id']) || trim((string) $queryParams['studio_id']) === '') {
            throw new ApiException(400, 'validation_failed', 'Dữ liệu đầu vào không hợp lệ', [
                [
                    'field'   => 'studio_id',
                    'code'    => 'required',
                    'message' => 'Trường studio_id là bắt buộc',
                ],
            ]);
        }

        if (!is_numeric($queryParams['studio_id']) || (int) $queryParams['studio_id'] < 1) {
            throw new ApiException(400, 'validation_failed', 'Dữ liệu đầu vào không hợp lệ', [
                [
                    'field'   => 'studio_id',
                    'code'    => 'invalid',
                    'message' => 'studio_id phải là số nguyên dương',
                ],
            ]);
        }

        $studioId = (int) $queryParams['studio_id'];

        if (!$this->equipmentRepo->isStudioActive($studioId)) {
            throw new ApiException(404, 'studio_not_found', 'Studio không tồn tại hoặc không khả dụng');
        }

        $categoryId = null;
        if (isset($queryParams['category_id']) && trim((string) $queryParams['category_id']) !== '') {
            if (!is_numeric($queryParams['category_id']) || (int) $queryParams['category_id'] < 1) {
                throw new ApiException(400, 'validation_failed', 'Dữ liệu đầu vào không hợp lệ', [
                    [
                        'field'   => 'category_id',
                        'code'    => 'invalid',
                        'message' => 'category_id phải là số nguyên dương',
                    ],
                ]);
            }
            $categoryId = (int) $queryParams['category_id'];
        }

        return $this->equipmentRepo->getActiveEquipmentsByStudio($studioId, $categoryId);
    }

    /**
     * Create equipment
     *
     * @param array $data
     * @return array
     */
    public function createEquipment(array $data): array
    {
        $id = $this->equipmentRepo->create($data);
        return [
            'equipment_id' => $id,
            'name'         => $data['name'],
            'message'      => 'Tạo thiết bị thành công',
        ];
    }

    /**
     * Update equipment
     *
     * @param int $equipmentId
     * @param array $data
     * @return array
     */
    public function updateEquipment(int $equipmentId, array $data): array
    {
        $this->equipmentRepo->update($equipmentId, $data);
        return [
            'equipment_id' => $equipmentId,
            'message'      => 'Cập nhật thiết bị thành công',
        ];
    }

    public function uploadImage(int $equipmentId, string $imageUrl, bool $isPrimary): array
    {
        $imageId = $this->equipmentRepo->addImage($equipmentId, $imageUrl, $isPrimary);
        return ['image_id' => $imageId, 'equipment_id' => $equipmentId, 'image_url' => $imageUrl, 'is_primary' => $isPrimary];
    }

    public function deleteEquipment(int $equipmentId, int $actorId): void
    {
        $urls = $this->equipmentRepo->deleteIfUnused($equipmentId, $actorId);
        foreach ($urls as $url) {
            if (!is_string($url) || !preg_match('#^/uploads/equipments/[A-Za-z0-9_.-]+$#', $url)) continue;
            $path = dirname(__DIR__, 3) . '/public' . $url;
            if (is_file($path)) @unlink($path);
        }
    }
}

