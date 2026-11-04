<?php
declare(strict_types=1);
namespace App\Modules\Studios;
use App\Core\ApiResponse;
use App\Core\Request;
class HostRoomTypeController
{
    private HostRoomTypeService $service;
    public function __construct(?HostRoomTypeService $service = null) { $this->service = $service ?? new HostRoomTypeService(); }
    public function index(Request $request): void
    {
        $studioId = $request->query('studio_id');
        ApiResponse::ok($this->service->list((int) $request->user()['user_id'], $studioId !== null ? (int) $studioId : null), 'Lấy loại phòng riêng thành công');
    }
    public function create(Request $request): void
    {
        ApiResponse::created($this->service->create((int) $request->user()['user_id'], $request->body()), 'Tạo loại phòng thành công');
    }
    public function update(Request $request, array $vars): void
    {
        ApiResponse::ok($this->service->update((int) $request->user()['user_id'], (int) $vars['id'], $request->body()), 'Cập nhật loại phòng thành công');
    }
}
