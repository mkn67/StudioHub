<?php

declare(strict_types=1);

namespace App\Modules\HostApplications;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Exceptions\ApiException;

class HostApplicationController
{
    private HostApplicationService $service;

    public function __construct(?HostApplicationService $service = null)
    {
        $this->service = $service ?? new HostApplicationService();
    }

    public function submit(Request $request): void
    {
        ApiResponse::created($this->service->submit((int) $request->user()['user_id'], $request->body()), 'Gửi hồ sơ đăng ký Host thành công');
    }

    public function current(Request $request): void
    {
        ApiResponse::ok($this->service->currentForUser((int) $request->user()['user_id']), 'Lấy trạng thái hồ sơ Host thành công');
    }

    public function index(Request $request): void
    {
        ApiResponse::ok($this->service->list($request->query()), 'Lấy danh sách hồ sơ Host thành công');
    }

    public function show(Request $request, array $vars): void
    {
        ApiResponse::ok($this->service->show((int) $vars['id']), 'Lấy chi tiết hồ sơ Host thành công');
    }

    public function decide(Request $request, array $vars): void
    {
        $body = $request->body();
        if (!array_key_exists('approved', $body) || !is_bool($body['approved'])) {
            throw new ApiException(400, 'invalid_decision', 'Trường approved phải là true hoặc false');
        }
        $result = $this->service->decide((int) $vars['id'], (int) $request->user()['user_id'], $body['approved'], (string) ($body['reason'] ?? ''));
        ApiResponse::ok($result, 'Cập nhật quyết định hồ sơ Host thành công');
    }
}
