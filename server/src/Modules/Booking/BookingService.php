<?php

declare(strict_types=1);

namespace App\Modules\Booking;

use App\Core\Db;
use App\Exceptions\ApiException;
use App\Modules\Booking\BookingRepository;
use DateTimeImmutable;
use PDO;
use PDOException;
use Throwable;

class BookingService
{
    private AvailabilityService $availabilityService;
    private BookingRepository $bookingRepo;
    private PDO $pdo;

    public function __construct(
        ?AvailabilityService $availabilityService = null,
        ?BookingRepository $bookingRepo = null,
        ?PDO $pdo = null
    ) {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->availabilityService = $availabilityService ?? new AvailabilityService($this->pdo);
        $this->bookingRepo = $bookingRepo ?? new BookingRepository($this->pdo);
    }

    /**
     * Create a booking implementing the 10 sequential steps in Section 5.3
     *
     * @param array $request
     * @param array{user_id: int, name: string, email: string, phone: string|null, role: string} $authUser
     * @return array
     * @throws ApiException
     */
    public function create(array $request, array $authUser): array
    {
        // Step 1: Validate input fields
        $roomId = (int) ($request['room_id'] ?? 0);
        $rateId = (int) ($request['rate_id'] ?? 0);
        $startTime = trim((string) ($request['start_time'] ?? ''));
        $endTime = trim((string) ($request['end_time'] ?? ''));

        if ($roomId <= 0 || $rateId <= 0 || $startTime === '' || $endTime === '') {
            throw new ApiException(400, 'validation_error', 'Vui lòng cung cấp đầy đủ thông tin phòng, bảng giá và thời gian', [
                ['field' => 'general', 'code' => 'missing_fields', 'message' => 'room_id, rate_id, start_time and end_time are required']
            ]);
        }

        $customerName = trim((string) ($request['customer_name'] ?? ''));
        if ($customerName === '') {
            $customerName = $authUser['name'];
        }

        $customerEmail = trim((string) ($request['customer_email'] ?? ''));
        if ($customerEmail === '') {
            $customerEmail = $authUser['email'];
        }

        $customerPhone = trim((string) ($request['customer_phone'] ?? ''));
        if ($customerPhone === '') {
            $customerPhone = (string) ($authUser['phone'] ?? '');
        }

        if ($customerName === '' || $customerEmail === '' || $customerPhone === '') {
            throw new ApiException(400, 'validation_error', 'Thông tin liên hệ (họ tên, email, số điện thoại) không được để trống', [
                ['field' => 'customer_info', 'code' => 'required', 'message' => 'customer_name, customer_email, and customer_phone are required']
            ]);
        }

        if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(400, 'invalid_email', 'Email khách hàng không hợp lệ', [
                ['field' => 'customer_email', 'code' => 'invalid_format', 'message' => 'Invalid email format']
            ]);
        }

        $note = isset($request['note']) ? trim((string) $request['note']) : null;
        $partySize = isset($request['party_size']) && is_numeric($request['party_size'])
            ? (int) $request['party_size']
            : 1;

        // Step 2-10: Execute in transaction with READ COMMITTED and deadlock retry (max 2 attempts)
        $attempts = 0;
        $maxAttempts = 2;

        while (true) {
            $attempts++;
            try {
                $this->pdo->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
                $this->pdo->beginTransaction();

                // Steps 3 to 7: Evaluate booking with locking=true
                $eval = $this->availabilityService->evaluate($request, true, $this->pdo);

                $pricing = $eval['pricing'];
                $startDt = new DateTimeImmutable($eval['start_time']);
                $nowDt = new DateTimeImmutable('now');

                // Step 8: Determine expires_at = LEAST(created_at + HOLD_MINUTES, start_time)
                $holdMinutes = (int) ($_ENV['HOLD_MINUTES'] ?? 15);
                $holdExpiry = $nowDt->modify("+{$holdMinutes} minutes");
                $finalExpiry = $holdExpiry < $startDt ? $holdExpiry : $startDt;
                $expiresAt = $finalExpiry->format('Y-m-d H:i:s');

                // Generate temporary unique booking code: 'TMP-' + 24 hex chars (28 chars total)
                $tmpBookingCode = 'TMP-' . bin2hex(random_bytes(12));

                $bookingData = [
                    'booking_code'     => $tmpBookingCode,
                    'room_id'          => $eval['room']['room_id'],
                    'customer_id'      => $authUser['user_id'],
                    'rate_id'          => $eval['rate']['rate_id'],
                    'booking_type'     => $pricing['booking_type'],
                    'start_time'       => $eval['start_time'],
                    'end_time'         => $eval['end_time'],
                    'busy_start'       => $eval['busy_start'],
                    'busy_end'         => $eval['busy_end'],
                    'party_size'       => $partySize,
                    'rate_unit'        => $pricing['rate_unit'],
                    'rental_units'     => $pricing['rental_units'],
                    'room_unit_price'  => $pricing['room_unit_price'],
                    'room_amount'      => $pricing['room_amount'],
                    'equipment_amount' => $pricing['equipment_amount'],
                    'total_amount'     => $pricing['total_amount'],
                    'deposit_amount'   => $pricing['deposit_amount'],
                    'customer_name'    => $customerName,
                    'customer_phone'   => $customerPhone,
                    'customer_email'   => $customerEmail,
                    'note'             => $note,
                    'status'           => 'pending',
                    'expires_at'       => $expiresAt,
                ];

                // Insert bookings
                $bookingId = $this->bookingRepo->insertBooking($bookingData, $this->pdo);

                // Insert booking_details
                $detailsInserted = [];
                foreach ($pricing['equipments'] as $eqItem) {
                    $detailData = [
                        'booking_id'      => $bookingId,
                        'equipment_id'    => $eqItem['equipment_id'],
                        'quantity'        => $eqItem['quantity'],
                        'pricing_unit'    => $eqItem['pricing_unit'],
                        'unit_price'      => $eqItem['unit_price'],
                        'equipment_hours' => $eqItem['equipment_hours'],
                        'subtotal'        => $eqItem['subtotal'],
                    ];
                    $detailId = $this->bookingRepo->insertBookingDetail($detailData, $this->pdo);
                    $detailsInserted[] = array_merge(['detail_id' => $detailId], $detailData, [
                        'equipment_name' => $eqItem['name'] ?? null,
                    ]);
                }

                // Update booking_code = 'BK-YYYYMMDD-' + booking_id (padded to 4 digits)
                $datePart = date('Ymd', strtotime($eval['start_time']));
                $finalBookingCode = 'BK-' . $datePart . '-' . str_pad((string) $bookingId, 4, '0', STR_PAD_LEFT);
                $this->bookingRepo->updateBookingCode($bookingId, $finalBookingCode, $this->pdo);

                // Step 9: Write audit_logs
                $auditMetadata = [
                    'booking_id'       => $bookingId,
                    'booking_code'     => $finalBookingCode,
                    'room_id'          => $eval['room']['room_id'],
                    'room_name'        => $eval['room']['name'],
                    'customer_id'      => $authUser['user_id'],
                    'start_time'       => $eval['start_time'],
                    'end_time'         => $eval['end_time'],
                    'busy_start'       => $eval['busy_start'],
                    'busy_end'         => $eval['busy_end'],
                    'total_amount'     => $pricing['total_amount'],
                    'deposit_amount'   => $pricing['deposit_amount'],
                    'status'           => 'pending',
                    'expires_at'       => $expiresAt,
                    'equipments_count' => count($detailsInserted),
                ];

                $this->bookingRepo->insertAuditLog(
                    $authUser['user_id'],
                    'booking_created',
                    'bookings',
                    $bookingId,
                    $auditMetadata,
                    $this->pdo
                );

                // Commit transaction
                $this->pdo->commit();

                // Prepare and return response data
                $createdAt = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

                return [
                    'booking_id'       => $bookingId,
                    'booking_code'     => $finalBookingCode,
                    'room_id'          => $eval['room']['room_id'],
                    'room_name'        => $eval['room']['name'],
                    'studio_id'        => (int) $eval['room']['studio_id'],
                    'customer_id'      => $authUser['user_id'],
                    'customer_name'    => $customerName,
                    'customer_phone'   => $customerPhone,
                    'customer_email'   => $customerEmail,
                    'party_size'       => $partySize,
                    'rate_id'          => $eval['rate']['rate_id'],
                    'booking_type'     => $pricing['booking_type'],
                    'rate_unit'        => $pricing['rate_unit'],
                    'rental_units'     => $pricing['rental_units'],
                    'room_unit_price'  => $pricing['room_unit_price'],
                    'room_amount'      => $pricing['room_amount'],
                    'equipment_amount' => $pricing['equipment_amount'],
                    'total_amount'     => $pricing['total_amount'],
                    'deposit_amount'   => $pricing['deposit_amount'],
                    'start_time'       => $eval['start_time'],
                    'end_time'         => $eval['end_time'],
                    'busy_start'       => $eval['busy_start'],
                    'busy_end'         => $eval['busy_end'],
                    'note'             => $note,
                    'status'           => 'pending',
                    'expires_at'       => $expiresAt,
                    'created_at'       => $createdAt,
                    'equipments'       => $detailsInserted,
                ];
            } catch (ApiException $e) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                throw $e;
            } catch (PDOException $e) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }

                $errCode = $e->errorInfo[1] ?? (int) $e->getCode();

                if (in_array($errCode, [1205, 1213], true) && $attempts < $maxAttempts) {
                    usleep(50000);
                    continue;
                }

                if (in_array($errCode, [1205, 1213], true)) {
                    throw new ApiException(500, 'concurrency_timeout', 'Không thể hoàn tất đặt phòng do xung đột tài nguyên, vui lòng thử lại');
                }

                if (($e->errorInfo[0] ?? '') === '45000' || str_contains($e->getMessage(), 'ROOM_OCCUPIED')) {
                    throw new ApiException(
                        409,
                        'room_occupied',
                        'Phòng đã có người đặt trong khoảng thời gian này',
                        [
                            [
                                'field'   => 'time',
                                'code'    => 'room_occupied',
                                'message' => 'Khung giờ này đã bị chiếm dụng',
                            ]
                        ]
                    );
                }

                error_log("[BookingService] DB Error: " . $e->getMessage());
                throw new ApiException(500, 'server_error', 'Đã xảy ra lỗi hệ thống khi tạo đơn');
            } catch (Throwable $e) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                error_log("[BookingService] Unexpected Error: " . $e->getMessage());
                throw new ApiException(500, 'server_error', 'Đã xảy ra lỗi hệ thống khi tạo đơn');
            }
        }

    }

    /**
     * Expire a booking if it is pending and past expires_at (Section 5.5)
     * Handles single-booking transaction and records refund_due in audit_logs.
     *
     * @param int $bookingId
     * @param PDO|null $pdo
     * @return bool True if expired, false if not due or already non-pending
     */
    public function expireIfDue(int $bookingId, ?PDO $pdo = null): bool
    {
        $ownTx = false;
        $db = $pdo ?? $this->pdo;

        if (!$db->inTransaction()) {
            $db->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
            $db->beginTransaction();
            $ownTx = true;
        }

        try {
            $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $db);
            if (!$booking) {
                if ($ownTx) {
                    $db->commit();
                }
                return false;
            }

            if ($booking['status'] !== 'pending') {
                if ($ownTx) {
                    $db->commit();
                }
                return false;
            }

            $expiresAt = $booking['expires_at'];
            if ($expiresAt === null || strtotime($expiresAt) > time()) {
                if ($ownTx) {
                    $db->commit();
                }
                return false;
            }

            // Booking is past expires_at -> expire it
            $payments = $this->bookingRepo->getSuccessfulPayments($bookingId, $db);
            $paidTotal = 0;
            $paymentRecords = [];

            foreach ($payments as $p) {
                $amt = (int) $p['amount'];
                $paidTotal += $amt;
                $paymentRecords[] = [
                    'payment_id'       => (int) $p['payment_id'],
                    'payment_type'     => $p['payment_type'],
                    'amount'           => $amt,
                    'transaction_code' => $p['transaction_code'],
                ];
            }

            $reason = $paidTotal > 0 ? 'host_no_response' : 'unpaid_hold_timeout';
            $this->bookingRepo->updateBookingStatus($bookingId, 'expired', null, null, $db);
            $releaseReservations = $db->prepare("UPDATE inventory_reservations SET status = 'released' WHERE booking_id = ? AND status = 'reserved'");
            $releaseReservations->execute([$bookingId]);
            $refundTotal = $this->recordSandboxRefunds($bookingId, 'booking_expired', $db);

            $this->bookingRepo->insertAuditLog(
                null,
                'booking_expired',
                'bookings',
                $bookingId,
                [
                    'from'          => 'pending',
                    'to'            => 'expired',
                    'reason'        => $reason,
                    'paid_total'    => $paidTotal,
                    'refund_due'    => 0,
                    'refunded_total' => $refundTotal,
                    'refund_status' => 'sandbox_success',
                    'payments'      => $paymentRecords,
                ],
                $db
            );

            if ($ownTx) {
                $db->commit();
            }

            return true;
        } catch (Throwable $e) {
            if ($ownTx && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log("[BookingService::expireIfDue] Error expiring booking {$bookingId}: " . $e->getMessage());
            // A storage/transaction failure is not the same as "not due". Callers
            // must stop the payment/status operation instead of proceeding.
            throw new ApiException(
                500,
                'booking_expiration_failed',
                'Không thể xác nhận trạng thái hết hạn của đơn. Vui lòng thử lại.',
                [],
                $e
            );
        }
    }

    /**
     * Update booking status by Host (Section 5.4, 5.5)
     *
     * @param int $bookingId
     * @param string $newStatus
     * @param array $authUser
     * @return array
     * @throws ApiException
     */
    public function updateStatus(int $bookingId, string $newStatus, array $authUser): array
    {
        $allowedHostStatuses = ['confirmed', 'rejected', 'checked_in', 'completed', 'cancelled'];
        if (!in_array($newStatus, $allowedHostStatuses, true)) {
            throw new ApiException(
                400,
                'invalid_status',
                "Trạng thái '{$newStatus}' không hợp lệ cho thao tác của host"
            );
        }

        $this->pdo->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
        $this->pdo->beginTransaction();

        try {
            $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            if (!$booking) {
                throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
            }

            // Ownership check: must belong to host's studio
            if ((int) $booking['host_id'] !== (int) $authUser['user_id']) {
                throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý đơn đặt phòng này');
            }

            // Expire on access check
            if ($booking['status'] === 'pending') {
                $didExpire = $this->expireIfDue($bookingId, $this->pdo);
                if ($didExpire) {
                    $this->pdo->commit();
                    throw new ApiException(400, 'booking_expired', 'Đơn đặt phòng đã hết hạn');
                }
                $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            }

            // State machine validation
            BookingStateMachine::assertCanTransition($booking['status'], $newStatus);

            $completedAt = null;
            $payments = $this->bookingRepo->getSuccessfulPayments($bookingId, $this->pdo);
            $paidTotal = 0;
            $paymentRecords = [];

            foreach ($payments as $p) {
                $amt = (int) $p['amount'];
                $paidTotal += $amt;
                $paymentRecords[] = [
                    'payment_id'       => (int) $p['payment_id'],
                    'payment_type'     => $p['payment_type'],
                    'amount'           => $amt,
                    'transaction_code' => $p['transaction_code'],
                ];
            }

            // Specific requirements per target status
            if ($newStatus === 'confirmed') {
                $hasValidPayment = false;
                foreach ($payments as $p) {
                    if (in_array($p['payment_type'], ['deposit', 'full'], true)) {
                        $hasValidPayment = true;
                        break;
                    }
                }

                if (!$hasValidPayment) {
                    throw new ApiException(400, 'deposit_required', 'Đơn đặt phòng chưa được thanh toán cọc hoặc trả đủ');
                }

                if ($booking['expires_at'] && strtotime($booking['expires_at']) <= time()) {
                    throw new ApiException(400, 'booking_expired', 'Đơn đặt phòng đã hết hạn giữ chỗ');
                }
            } elseif ($newStatus === 'completed') {
                $totalAmount = (int) $booking['total_amount'];
                if ($paidTotal < $totalAmount) {
                    throw new ApiException(400, 'payment_incomplete', 'Đơn đặt phòng chưa thanh toán đủ tổng tiền thuê');
                }
                $completedAt = date('Y-m-d H:i:s');
            }

            // Update status in DB
            $this->bookingRepo->updateBookingStatus($bookingId, $newStatus, $completedAt, null, $this->pdo);
            $refundTotal = 0;
            if (in_array($newStatus, ['rejected', 'cancelled'], true)) {
                $releaseReservations = $this->pdo->prepare("UPDATE inventory_reservations SET status = 'released' WHERE booking_id = ? AND status = 'reserved'");
                $releaseReservations->execute([$bookingId]);
                $refundTotal = $this->recordSandboxRefunds($bookingId, $newStatus === 'rejected' ? 'host_rejected' : 'host_cancelled', $this->pdo);
            }

            // Audit log
            if (in_array($newStatus, ['rejected', 'cancelled'], true) && $paidTotal > 0) {
                $auditMeta = [
                    'from'          => $booking['status'],
                    'to'            => $newStatus,
                    'reason'        => $newStatus === 'rejected' ? 'host_rejected' : 'host_cancelled',
                    'paid_total'    => $paidTotal,
                    'refund_due'    => 0,
                    'refunded_total' => $refundTotal,
                    'refund_status' => 'sandbox_success',
                    'payments'      => $paymentRecords,
                ];
            } else {
                $auditMeta = [
                    'from'         => $booking['status'],
                    'to'           => $newStatus,
                    'booking_code' => $booking['booking_code'],
                ];
                if ($completedAt !== null) {
                    $auditMeta['completed_at'] = $completedAt;
                }
            }

            $this->bookingRepo->insertAuditLog(
                (int) $authUser['user_id'],
                'booking_status_updated',
                'bookings',
                $bookingId,
                $auditMeta,
                $this->pdo
            );

            $this->pdo->commit();

            return $this->getBookingDetail($bookingId, $authUser);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Cancel booking by Customer (Section 5.4, 5.5)
     *
     * @param int $bookingId
     * @param array $authUser
     * @return array
     * @throws ApiException
     */
    public function cancelByCustomer(int $bookingId, array $authUser): array
    {
        $this->pdo->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
        $this->pdo->beginTransaction();

        try {
            $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            if (!$booking) {
                throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
            }

            if ((int) $booking['customer_id'] !== (int) $authUser['user_id']) {
                throw new ApiException(403, 'forbidden', 'Bạn không có quyền hủy đơn đặt phòng của người khác');
            }

            if ($booking['status'] === 'pending') {
                $didExpire = $this->expireIfDue($bookingId, $this->pdo);
                if ($didExpire) {
                    $this->pdo->commit();
                    throw new ApiException(400, 'booking_expired', 'Đơn đặt phòng đã hết hạn');
                }
                $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            }

            BookingStateMachine::assertCanTransition($booking['status'], 'cancelled');

            $payments = $this->bookingRepo->getSuccessfulPayments($bookingId, $this->pdo);
            $paidTotal = 0;
            $paymentRecords = [];

            foreach ($payments as $p) {
                $amt = (int) $p['amount'];
                $paidTotal += $amt;
                $paymentRecords[] = [
                    'payment_id'       => (int) $p['payment_id'],
                    'payment_type'     => $p['payment_type'],
                    'amount'           => $amt,
                    'transaction_code' => $p['transaction_code'],
                ];
            }

            $this->bookingRepo->updateBookingStatus($bookingId, 'cancelled', null, null, $this->pdo);
            $releaseReservations = $this->pdo->prepare("UPDATE inventory_reservations SET status = 'released' WHERE booking_id = ? AND status = 'reserved'");
            $releaseReservations->execute([$bookingId]);
            $refundTotal = $this->recordSandboxRefunds($bookingId, 'customer_cancelled', $this->pdo);

            $this->bookingRepo->insertAuditLog(
                (int) $authUser['user_id'],
                'booking_cancelled',
                'bookings',
                $bookingId,
                [
                    'from'          => $booking['status'],
                    'to'            => 'cancelled',
                    'reason'        => 'customer_cancelled',
                    'paid_total'    => $paidTotal,
                    'refund_due'    => 0,
                    'refunded_total' => $refundTotal,
                    'refund_status' => 'sandbox_success',
                    'payments'      => $paymentRecords,
                ],
                $this->pdo
            );

            $this->pdo->commit();

            return $this->getBookingDetail($bookingId, $authUser);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * List bookings with role scoping and status filtering
     *
     * @param array $query
     * @param array $authUser
     * @return array
     */
    public function listBookings(array $query, array $authUser): array
    {
        $role = $authUser['role'] ?? 'customer';
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(50, max(1, (int) ($query['limit'] ?? 12)));

        $filters = [];
        if ($role === 'customer') {
            $filters['customer_id'] = (int) $authUser['user_id'];
        } elseif ($role === 'host') {
            $filters['host_id'] = (int) $authUser['user_id'];
        }

        if (!empty($query['status'])) {
            $filters['status'] = trim((string) $query['status']);
        }

        return $this->bookingRepo->listBookings($filters, $page, $limit, $this->pdo);
    }

    /**
     * Get booking detail with permission check and expire on access
     *
     * @param int $bookingId
     * @param array $authUser
     * @return array
     * @throws ApiException
     */
    public function getBookingDetail(int $bookingId, array $authUser): array
    {
        $booking = $this->bookingRepo->findBookingById($bookingId, $this->pdo);
        if (!$booking) {
            throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
        }

        $role = $authUser['role'] ?? 'customer';
        $userId = (int) $authUser['user_id'];

        if ($role === 'customer' && (int) $booking['customer_id'] !== $userId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền xem đơn đặt phòng của người khác');
        }

        if ($role === 'host' && (int) $booking['host_id'] !== $userId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền xem đơn đặt phòng của studio khác');
        }

        // Expire on access if pending and expired
        if ($booking['status'] === 'pending' && $booking['expires_at'] && strtotime($booking['expires_at']) <= time()) {
            $this->expireIfDue($bookingId, $this->pdo);
            $booking = $this->bookingRepo->findBookingById($bookingId, $this->pdo);
        }

        $equipments = $this->bookingRepo->getBookingDetails($bookingId, $this->pdo);
        $payments = $this->bookingRepo->getAllPayments($bookingId, $this->pdo);

        return array_merge($booking, [
            'equipments' => $equipments,
            'payments'   => $payments,
        ]);
    }

    private function recordSandboxRefunds(int $bookingId, string $reason, PDO $pdo): int
    {
        $payments = $this->bookingRepo->getSuccessfulPayments($bookingId, $pdo);
        $refundTotal = 0;
        foreach ($payments as $payment) {
            $amount = (int) $payment['amount'];
            if ($amount <= 0) continue;
            $paymentId = (int) $payment['payment_id'];
            $check = $pdo->prepare('SELECT amount FROM booking_refunds WHERE payment_id = ?');
            $check->execute([$paymentId]);
            $existing = $check->fetchColumn();
            if ($existing !== false) {
                $refundTotal += (int) $existing;
                continue;
            }
            $key = "booking-refund-{$bookingId}-{$paymentId}";
            $transactionCode = 'BRF-' . bin2hex(random_bytes(12));
            $insert = $pdo->prepare("INSERT INTO booking_refunds (payment_id, booking_id, amount, status, reason, transaction_code, idempotency_key) VALUES (?, ?, ?, 'success', ?, ?, ?)");
            $insert->execute([$paymentId, $bookingId, $amount, $reason, $transactionCode, $key]);
            $refundTotal += $amount;
        }
        return $refundTotal;
    }
}
