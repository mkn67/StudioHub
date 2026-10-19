<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use App\Repositories\EquipmentRepository;

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
}

