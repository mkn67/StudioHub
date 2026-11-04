<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Exceptions\ApiException;

class ServicePackageController
{
    public function __construct(private readonly ServicePackageService $service = new ServicePackageService())
    {
    }

    public function publicList(Request $request, array $vars = []): void
    {
        $studioId = (int) ($vars['studio_id'] ?? 0);
        ApiResponse::success($this->service->publicPackages($studioId), 'Lấy danh sách gói dịch vụ thành công');
    }

    public function create(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $result = $this->service->createPackage((int) $user['user_id'], (int) ($vars['studio_id'] ?? 0), $request->body());
        ApiResponse::created($result, 'Tạo gói dịch vụ thành công');
    }

    public function update(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $body = $request->body();
        if ($body === []) throw new ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        ApiResponse::success($this->service->updatePackage((int) $user['user_id'], (int) ($vars['package_id'] ?? 0), $body), 'Cập nhật gói dịch vụ thành công');
    }

    public function createOrder(Request $request): void
    {
        $user = $request->user();
        $body = $request->body();
        $projectId = isset($body['project_id']) ? (int) $body['project_id'] : null;
        $result = $this->service->createOrder((int) $user['user_id'], (int) ($body['package_id'] ?? 0), (int) ($body['quantity'] ?? 1), $projectId);
        ApiResponse::created($result, 'Tạo đơn dịch vụ thành công');
    }

    public function listOrders(Request $request): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->listOrders((int) $user['user_id']), 'Lấy đơn dịch vụ thành công');
    }

    public function payOrder(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $result = $this->service->paySandbox(
            (int) $user['user_id'],
            (int) ($vars['order_id'] ?? 0),
            trim((string) $request->header('idempotency-key', ''))
        );
        ApiResponse::created($result, 'Thanh toán đơn dịch vụ sandbox thành công');
    }

    public function cancelOrder(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->cancelOrder((int) $user['user_id'], (int) ($vars['order_id'] ?? 0)), 'Hủy đơn dịch vụ thành công');
    }
}
