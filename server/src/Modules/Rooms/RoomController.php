<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Rooms\RoomService;

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

    /**
     * POST /api/rooms
     * Create room (Host only)
     */
    public function create(Request $request): void
    {
        $user = $request->user();
        $body = $request->body();

        \App\Core\Validator::assertValid($body, [
            'studio_id'       => 'required|int|min:1',
            'name'            => 'required|min:3|max:150',
            'area'            => 'required|numeric|min:1',
            'capacity'        => 'required|int|min:1',
            'space_type_ids'  => 'required|array|min:1',
        ]);

        \App\Modules\Shared\OwnershipGuard::assertOwnsStudio((int) $user['user_id'], (int) $body['studio_id']);

        $room = $this->roomService->createRoom($body);
        ApiResponse::created($room, 'Tạo phòng thành công');
    }

    /**
     * PATCH /api/rooms/{id}
     * Update room details (Host only)
     */
    public function update(Request $request, array $vars): void
    {
        $user = $request->user();
        $roomId = (int) ($vars['id'] ?? 0);

        \App\Modules\Shared\OwnershipGuard::assertOwnsRoom((int) $user['user_id'], $roomId);

        $body = $request->body();
        if (empty($body)) {
            throw new \App\Exceptions\ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        }

        $room = $this->roomService->updateRoom($roomId, $body);
        ApiResponse::success($room, 'Cập nhật phòng thành công');
    }

    /**
     * POST /api/rooms/{id}/rates
     * Create room rate (Host only)
     */
    public function createRate(Request $request, array $vars): void
    {
        $user = $request->user();
        $roomId = (int) ($vars['id'] ?? 0);

        \App\Modules\Shared\OwnershipGuard::assertOwnsRoom((int) $user['user_id'], $roomId);

        $body = $request->body();
        \App\Core\Validator::assertValid($body, [
            'rate_unit'     => 'required|in:hour,session,half_day,day,week,month',
            'unit_price'    => 'required|numeric|min:0',
            'minimum_units' => 'int|min:1',
        ]);

        $res = $this->roomService->createRate($roomId, $body);
        ApiResponse::created($res, 'Tạo bảng giá thành công');
    }

    /**
     * PATCH /api/rooms/{id}/rates/{rate_id}
     * Update room rate (Host only)
     */
    public function updateRate(Request $request, array $vars): void
    {
        $user = $request->user();
        $roomId = (int) ($vars['id'] ?? 0);
        $rateId = (int) ($vars['rate_id'] ?? 0);

        \App\Modules\Shared\OwnershipGuard::assertOwnsRate((int) $user['user_id'], $roomId, $rateId);

        $body = $request->body();
        if (empty($body)) {
            throw new \App\Exceptions\ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        }

        $res = $this->roomService->updateRate($rateId, $body);
        ApiResponse::success($res, 'Cập nhật bảng giá thành công');
    }

    /**
     * POST /api/rooms/{id}/images
     * Upload room image (Host only, multipart/form-data)
     */
    public function uploadImage(Request $request, array $vars): void
    {
        $user = $request->user();
        $roomId = (int) ($vars['id'] ?? 0);

        \App\Modules\Shared\OwnershipGuard::assertOwnsRoom((int) $user['user_id'], $roomId);

        if (empty($_FILES['image'])) {
            throw new \App\Exceptions\ApiException(400, 'missing_file', 'Vui lòng chọn tập tin ảnh trong trường "image"');
        }

        $isPrimary = filter_var($request->body('is_primary', false), FILTER_VALIDATE_BOOLEAN);

        $res = $this->roomService->uploadImage($roomId, $_FILES['image'], (bool) $isPrimary);
        ApiResponse::created($res, 'Tải ảnh lên thành công');
    }
}

