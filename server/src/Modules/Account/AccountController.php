<?php

declare(strict_types=1);

namespace App\Modules\Account;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Exceptions\ApiException;

class AccountController
{
    private AccountService $service;

    public function __construct(?AccountService $service = null)
    {
        $this->service = $service ?? new AccountService();
    }

    public function requestEmailChange(Request $request): void
    {
        $result = $this->service->requestEmailChange((int) $request->user()['user_id'], $request->body());
        ApiResponse::ok($result, 'Đã tạo yêu cầu đổi email; mã xác nhận có hiệu lực 15 phút');
    }

    public function confirmEmailChange(Request $request): void
    {
        $result = $this->service->confirmEmailChange((int) $request->user()['user_id'], $request->body());
        ApiResponse::ok($result, 'Xác nhận đổi email thành công');
    }

    public function uploadAvatar(Request $request): void
    {
        $file = $_FILES['image'] ?? [];
        if (!$file) throw new ApiException(400, 'missing_file', 'Vui lòng gửi ảnh trong trường image');
        ApiResponse::ok($this->service->uploadAvatar((int) $request->user()['user_id'], $file), 'Cập nhật ảnh đại diện thành công');
    }

    public function notificationPreferences(Request $request): void
    {
        ApiResponse::ok($this->service->notificationPreferences((int) $request->user()['user_id']), 'Lấy tùy chọn thông báo thành công');
    }

    public function updateNotificationPreferences(Request $request): void
    {
        ApiResponse::ok($this->service->updateNotificationPreferences((int) $request->user()['user_id'], $request->body()), 'Lưu tùy chọn thông báo thành công');
    }

    public function identityVerification(Request $request): void
    {
        ApiResponse::ok($this->service->identityVerification((int) $request->user()['user_id']), 'Lấy trạng thái xác minh danh tính thành công');
    }

    public function submitIdentityVerification(Request $request): void
    {
        $file = $_FILES['document'] ?? [];
        if (!$file) throw new ApiException(400, 'missing_file', 'Vui lòng gửi giấy tờ trong trường document');
        ApiResponse::created($this->service->submitIdentityVerification((int) $request->user()['user_id'], $request->body(), $file), 'Đã gửi hồ sơ xác minh danh tính');
    }

    public function adminIdentityVerifications(Request $request): void
    {
        ApiResponse::ok($this->service->listIdentityVerifications($request->query()), 'Lấy danh sách hồ sơ xác minh thành công');
    }

    public function decideIdentityVerification(Request $request, array $vars): void
    {
        $body = $request->body();
        if (!isset($body['approved']) || !is_bool($body['approved'])) throw new ApiException(400, 'invalid_decision', 'approved phải là true hoặc false');
        ApiResponse::ok($this->service->decideIdentity((int) $vars['id'], (int) $request->user()['user_id'], $body['approved'], (string) ($body['reason'] ?? '')), 'Đã xử lý hồ sơ xác minh');
    }

    public function adminIdentityDocument(Request $request, array $vars): never
    {
        $file = $this->service->adminIdentityDocument((int) $vars['id'], (int) $request->user()['user_id']);
        header('Content-Type: ' . $file['mime']);
        header('Content-Length: ' . filesize($file['path']));
        header('Content-Disposition: attachment; filename="identity-document"; filename*=UTF-8\'\'' . rawurlencode($file['name']));
        header('Cache-Control: private, no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        readfile($file['path']);
        exit;
    }
}
