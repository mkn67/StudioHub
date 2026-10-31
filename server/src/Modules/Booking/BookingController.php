<?php

declare(strict_types=1);

namespace App\Modules\Booking;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Booking\AvailabilityService;
use App\Modules\Booking\BookingService;
use App\Modules\Booking\PaymentService;

class BookingController
{
    private AvailabilityService $availabilityService;
    private BookingService $bookingService;
    private PaymentService $paymentService;

    public function __construct(
        ?AvailabilityService $availabilityService = null,
        ?BookingService $bookingService = null,
        ?PaymentService $paymentService = null
    ) {
        $this->availabilityService = $availabilityService ?? new AvailabilityService();
        $this->bookingService = $bookingService ?? new BookingService();
        $this->paymentService = $paymentService ?? new PaymentService();
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

    /**
     * GET /api/bookings
     * Authenticated endpoint (customer or host) to list bookings
     */
    public function index(Request $request): void
    {
        $query = $request->query();
        $user = $request->getAttribute('user');

        $result = $this->bookingService->listBookings($query, $user);

        ApiResponse::ok($result, 'Lấy danh sách đơn đặt phòng thành công');
    }

    /**
     * GET /api/bookings/{id}
     * Authenticated endpoint to view a single booking's details
     */
    public function show(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $user = $request->getAttribute('user');

        $result = $this->bookingService->getBookingDetail($id, $user);

        ApiResponse::ok($result, 'Lấy chi tiết đơn đặt phòng thành công');
    }

    /**
     * PATCH /api/bookings/{id}/status
     * Host authenticated endpoint to change booking status
     */
    public function updateStatus(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $body = $request->json() ?? [];
        $user = $request->getAttribute('user');

        $status = trim((string) ($body['status'] ?? ''));
        $result = $this->bookingService->updateStatus($id, $status, $user);

        ApiResponse::ok($result, 'Cập nhật trạng thái đơn đặt phòng thành công');
    }

    /**
     * POST /api/bookings/{id}/cancel
     * Customer authenticated endpoint to cancel booking
     */
    public function cancel(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $user = $request->getAttribute('user');

        $result = $this->bookingService->cancelByCustomer($id, $user);

        ApiResponse::ok($result, 'Hủy đơn đặt phòng thành công');
    }

    /**
     * POST /api/bookings/{id}/payments
     * Customer authenticated endpoint to simulate payment
     */
    public function pay(Request $request, array $vars = []): void
    {
        $id = (int) ($vars['id'] ?? $request->param('id') ?? 0);
        $body = $request->json() ?? [];
        $user = $request->getAttribute('user');

        $result = $this->paymentService->processSandboxPayment($id, $body, $user);

        ApiResponse::created($result, 'Thanh toán thành công');
    }
}
