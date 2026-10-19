<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Services\RoomService;

class RoomController
{
    private RoomService $roomService;

    public function __construct(?RoomService $roomService = null)
    {
        $this->roomService = $roomService ?? new RoomService();
    }

    /**
     * GET /api/rooms
     */
    public function index(Request $request): void
    {
        $result = $this->roomService->getRooms($request->query());
        ApiResponse::success($result, 'Lấy danh sách phòng thành công', 200);
    }

    /**
     * GET /api/rooms/{id}
     */
    public function show(Request $request, array $vars): void
    {
        $roomId = (int) ($vars['id'] ?? 0);
        $room = $this->roomService->getRoomDetail($roomId);
        ApiResponse::success($room, 'Lấy chi tiết phòng thành công', 200);
    }

    /**
     * GET /api/rooms/{id}/calendar?from=&to=
     */
    public function calendar(Request $request, array $vars): void
    {
        $roomId = (int) ($vars['id'] ?? 0);
        $from = $request->query('from');
        $to = $request->query('to');

        $calendar = $this->roomService->getRoomCalendar($roomId, $from, $to);
        ApiResponse::success($calendar, 'Lấy lịch bận của phòng thành công', 200);
    }

    /**
     * GET /api/rooms/{id}/rates
     */
    public function rates(Request $request, array $vars): void
    {
        $roomId = (int) ($vars['id'] ?? 0);
        $rates = $this->roomService->getRoomRates($roomId);
        ApiResponse::success($rates, 'Lấy bảng giá của phòng thành công', 200);
    }
}

