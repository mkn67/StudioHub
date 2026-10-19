<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Services\AvailabilityService;
use App\Services\BookingService;

class BookingController
{
    private AvailabilityService $availabilityService;
    private BookingService $bookingService;

    public function __construct(
        ?AvailabilityService $availabilityService = null,
        ?BookingService $bookingService = null
    ) {
        $this->availabilityService = $availabilityService ?? new AvailabilityService();
        $this->bookingService = $bookingService ?? new BookingService();
    }

    /**
     * POST /api/bookings/check-availability
     * Public endpoint to check room & equipment availability and preview pricing
     */
    public function checkAvailability(Request $request): void
    {
        $body = $request->json() ?? [];
        $result = $this->availabilityService->evaluate($body, false);

        ApiResponse::ok([
            'available'  => true,
            'room'       => [
                'room_id'   => (int) $result['room']['room_id'],
                'name'      => $result['room']['name'],
                'capacity'  => (int) $result['room']['capacity'],
            ],
            'start_time' => $result['start_time'],
            'end_time'   => $result['end_time'],
            'busy_start' => $result['busy_start'],
            'busy_end'   => $result['busy_end'],
            'pricing'    => $result['pricing'],
        ], 'Phòng và thiết bị khả dụng');
    }

    /**
     * POST /api/bookings
     * Customer authenticated endpoint to create a booking
     */
    public function create(Request $request): void
    {
        $body = $request->json() ?? [];
        $user = $request->getAttribute('user');

        $result = $this->bookingService->create($body, $user);

        ApiResponse::created($result, 'Đặt phòng thành công');
    }
}
