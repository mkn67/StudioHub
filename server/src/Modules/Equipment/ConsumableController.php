<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Core\ApiResponse;
use App\Core\Request;

class ConsumableController
{
    public function __construct(private readonly ConsumableService $service = new ConsumableService())
    {
    }

    public function create(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->create((int) $user['user_id'], (int) ($vars['studio_id'] ?? 0), $request->body()), 'Tạo vật tư thành công');
    }

    public function listForStudio(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->listForStudio((int) $user['user_id'], (int) ($vars['studio_id'] ?? 0)), 'Lấy kho vật tư thành công');
    }

    public function listMovements(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->listMovements((int) $user['user_id'], (int) ($vars['item_id'] ?? 0)), 'Lấy lịch sử kho thành công');
    }

    public function move(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->move((int) $user['user_id'], (int) ($vars['item_id'] ?? 0), $request->body()), 'Ghi nhận biến động kho thành công');
    }

    public function reserve(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->reserve((int) $user['user_id'], (int) ($vars['item_id'] ?? 0), $request->body()), 'Đã giữ vật tư cho booking');
    }

    public function consumeReservation(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->settleReservation((int) $user['user_id'], (int) ($vars['item_id'] ?? 0), (int) ($vars['reservation_id'] ?? 0), 'consume'), 'Đã xác nhận sử dụng vật tư');
    }

    public function releaseReservation(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->settleReservation((int) $user['user_id'], (int) ($vars['item_id'] ?? 0), (int) ($vars['reservation_id'] ?? 0), 'release'), 'Đã giải phóng vật tư');
    }
}
