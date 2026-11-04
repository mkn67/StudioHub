<?php

declare(strict_types=1);
namespace App\Modules\Studios;
use App\Core\ApiResponse;
use App\Core\Request;

class StudioPolicyController
{
    private StudioPolicyService $service;
    public function __construct(?StudioPolicyService $service = null) { $this->service = $service ?? new StudioPolicyService(); }
    public function index(Request $request): void
    {
        $studioId = $request->query('studio_id');
        ApiResponse::ok($this->service->getForHost((int) $request->user()['user_id'], $studioId !== null ? (int) $studioId : null), 'Lấy chính sách thuê thành công');
    }
    public function update(Request $request): void
    {
        $userId = (int) $request->user()['user_id'];
        ApiResponse::ok($this->service->update($userId, $userId, $request->body()), 'Cập nhật chính sách thuê thành công');
    }
}
