<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\ApiResponse;
use App\Core\Request;

class ProductionProjectController
{
    public function __construct(private readonly ProductionProjectService $service = new ProductionProjectService())
    {
    }

    public function create(Request $request): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->create((int) $user['user_id'], $request->body()), 'Tạo dự án sản xuất thành công');
    }

    public function listMine(Request $request): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->listMine((int) $user['user_id']), 'Lấy dự án của tôi thành công');
    }

    public function listAuthorizedForHost(Request $request): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->listAuthorizedForHost((int) $user['user_id']), 'Lấy dự án được cấp quyền thành công');
    }

    public function members(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->members((int) ($vars['project_id'] ?? 0), (int) $user['user_id']), 'Lấy danh sách quyền dự án thành công');
    }

    public function grantMember(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->grantMember((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], $request->body()), 'Cấp quyền dự án thành công');
    }

    public function revokeMember(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $this->service->revokeMember((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], (int) ($vars['user_id'] ?? 0));
        ApiResponse::success(['revoked' => true], 'Đã thu hồi quyền dự án');
    }

    public function updateTrackStatus(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $body = $request->body();
        ApiResponse::success($this->service->updateTrackStatus((int) ($vars['project_id'] ?? 0), (int) ($vars['track_id'] ?? 0), (int) $user['user_id'], (string) ($body['production_status'] ?? '')), 'Cập nhật trạng thái track thành công');
    }

    public function requestRevision(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->requestRevision((int) ($vars['project_id'] ?? 0), (int) ($vars['track_id'] ?? 0), (int) $user['user_id'], $request->body()), 'Gửi yêu cầu chỉnh sửa thành công');
    }

    public function show(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->show((int) ($vars['project_id'] ?? 0), (int) $user['user_id']), 'Lấy dự án thành công');
    }

    public function createTrack(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->createTrack((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], $request->body()), 'Tạo track thành công');
    }

    public function linkBooking(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::created($this->service->linkBooking((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], (int) ($vars['booking_id'] ?? 0), $request->body()), 'Liên kết phiên với dự án thành công');
    }
}
