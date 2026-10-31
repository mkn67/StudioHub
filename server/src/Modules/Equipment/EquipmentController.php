<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Equipment\EquipmentService;

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

    /**
     * POST /api/equipments
     * Create equipment (Host only)
     */
    public function create(Request $request): void
    {
        $user = $request->user();
        $body = $request->body();

        \App\Core\Validator::assertValid($body, [
            'studio_id'      => 'required|int|min:1',
            'category_id'    => 'required|int|min:1',
            'name'           => 'required|min:2|max:150',
            'unit_price'     => 'required|numeric|min:0',
            'pricing_unit'   => 'required|in:session,hour',
            'total_quantity' => 'required|int|min:1',
        ]);

        \App\Modules\Shared\OwnershipGuard::assertOwnsStudio((int) $user['user_id'], (int) $body['studio_id']);
        \App\Modules\Shared\OwnershipGuard::assertOwnsCategory((int) $user['user_id'], (int) $body['category_id']);

        $res = $this->equipmentService->createEquipment($body);
        ApiResponse::created($res, 'Tạo thiết bị thành công');
    }

    /**
     * PATCH /api/equipments/{id}
     * Update equipment (Host only)
     */
    public function update(Request $request, array $vars): void
    {
        $user = $request->user();
        $equipmentId = (int) ($vars['id'] ?? 0);

        \App\Modules\Shared\OwnershipGuard::assertOwnsEquipment((int) $user['user_id'], $equipmentId);

        $body = $request->body();
        if (empty($body)) {
            throw new \App\Exceptions\ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        }

        if (array_key_exists('studio_id', $body)) {
            throw new \App\Exceptions\ApiException(400, 'cannot_change_studio', 'Không được phép thay đổi studio của thiết bị');
        }

        $res = $this->equipmentService->updateEquipment($equipmentId, $body);
        ApiResponse::success($res, 'Cập nhật thiết bị thành công');
    }
}

