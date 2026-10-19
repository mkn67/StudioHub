<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Services\EquipmentService;

class EquipmentController
{
    private EquipmentService $equipmentService;

    public function __construct(?EquipmentService $equipmentService = null)
    {
        $this->equipmentService = $equipmentService ?? new EquipmentService();
    }

    /**
     * GET /api/equipments?studio_id=&category_id=
     */
    public function index(Request $request): void
    {
        $equipments = $this->equipmentService->getEquipments($request->query());
        ApiResponse::success($equipments, 'Lấy danh sách thiết bị thành công', 200);
    }
}

