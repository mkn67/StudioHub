<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Core\ApiResponse;
use App\Core\Request;

final class ReviewController
{
    public function __construct(private readonly ?ReviewService $reviews = null) {}

    private function service(): ReviewService
    {
        return $this->reviews ?? new ReviewService();
    }

    public function listForRoom(Request $request, array $vars): void
    {
        ApiResponse::success($this->service()->listForRoom((int) ($vars['id'] ?? 0)), 'Lấy đánh giá phòng thành công');
    }

    public function showForBooking(Request $request, array $vars): void
    {
        $user = $request->getAttribute('user');
        ApiResponse::success($this->service()->getForBooking((int) ($vars['id'] ?? 0), (int) $user['user_id']), 'Lấy đánh giá đơn thuê thành công');
    }

    public function createForBooking(Request $request, array $vars): void
    {
        $user = $request->getAttribute('user');
        ApiResponse::created($this->service()->createForBooking((int) ($vars['id'] ?? 0), (int) $user['user_id'], $request->body()), 'Đã gửi đánh giá');
    }
}
