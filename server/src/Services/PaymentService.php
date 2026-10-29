<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Db;
use App\Exceptions\ApiException;
use App\Repositories\BookingRepository;
use DateTimeImmutable;
use PDO;
use Throwable;

class PaymentService
{
    private BookingRepository $bookingRepo;
    private BookingService $bookingService;
    private PDO $pdo;

    public function __construct(
        ?BookingRepository $bookingRepo = null,
        ?BookingService $bookingService = null,
        ?PDO $pdo = null
    ) {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->bookingRepo = $bookingRepo ?? new BookingRepository($this->pdo);
        $this->bookingService = $bookingService ?? new BookingService(null, $this->bookingRepo, $this->pdo);
    }

    /**
     * Process a simulated sandbox payment (Section 5.6)
     *
     * @param int $bookingId
     * @param array $request
     * @param array $authUser
     * @return array
     * @throws ApiException
     */
    public function processSandboxPayment(int $bookingId, array $request, array $authUser): array
    {
        $paymentType = trim((string) ($request['payment_type'] ?? ''));
        if (!in_array($paymentType, ['deposit', 'remaining', 'full'], true)) {
            throw new ApiException(
                400,
                'invalid_payment_type',
                "Loại thanh toán '{$paymentType}' không hợp lệ (hỗ trợ: deposit, remaining, full)",
                [['field' => 'payment_type', 'code' => 'invalid_value', 'message' => 'Must be deposit, remaining, or full']]
            );
        }

        $paymentMethod = trim((string) ($request['payment_method'] ?? 'sandbox_qr'));
        if ($paymentMethod === '') {
            $paymentMethod = 'sandbox_qr';
        }

        $this->pdo->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
        $this->pdo->beginTransaction();

        try {
            $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            if (!$booking) {
                throw new ApiException(404, 'booking_not_found', 'Đơn đặt phòng không tồn tại');
            }

            // Customer ownership check
            if ((int) $booking['customer_id'] !== (int) $authUser['user_id']) {
                throw new ApiException(403, 'forbidden', 'Bạn không có quyền thanh toán cho đơn đặt phòng của người khác');
            }

            // Expire on access check
            if ($booking['status'] === 'pending') {
                $didExpire = $this->bookingService->expireIfDue($bookingId, $this->pdo);
                if ($didExpire) {
                    throw new ApiException(400, 'booking_expired', 'Đơn đặt phòng đã hết hạn giữ chỗ');
                }
                $booking = $this->bookingRepo->findBookingByIdForUpdate($bookingId, $this->pdo);
            }

            // Read existing successful payments for concurrency and duplicate check
            $existingPayments = $this->bookingRepo->getSuccessfulPayments($bookingId, $this->pdo);

            $amount = 0;
            $newExpiresAt = null;
            $paidAt = date('Y-m-d H:i:s');

            if ($paymentType === 'deposit') {
                if ($booking['status'] !== 'pending') {
                    throw new ApiException(400, 'invalid_booking_status', 'Chỉ có thể đặt cọc cho đơn đang ở trạng thái pending');
                }

                // Check for existing deposit or full payment
                foreach ($existingPayments as $p) {
                    if (in_array($p['payment_type'], ['deposit', 'full'], true)) {
                        throw new ApiException(
                            409,
                            'payment_duplicate',
                            'Đơn đặt phòng đã được thanh toán cọc hoặc trả đủ'
                        );
                    }
                }

                $amount = (int) $booking['deposit_amount'];

                // Update expires_at = LEAST(paid_at + HOST_RESPONSE_HOURS, start_time)
                $hostHours = (int) ($_ENV['HOST_RESPONSE_HOURS'] ?? 24);
                $paidDt = new DateTimeImmutable($paidAt);
                $hostExpiry = $paidDt->modify("+{$hostHours} hours");
                $startDt = new DateTimeImmutable($booking['start_time']);
                $finalExpiry = $hostExpiry < $startDt ? $hostExpiry : $startDt;
                $newExpiresAt = $finalExpiry->format('Y-m-d H:i:s');

                $this->bookingRepo->updateBookingExpiresAt($bookingId, $newExpiresAt, $this->pdo);

            } elseif ($paymentType === 'full') {
                if ($booking['status'] !== 'pending') {
                    throw new ApiException(400, 'invalid_booking_status', 'Chỉ có thể thanh toán toàn bộ cho đơn đang ở trạng thái pending');
                }

                // Must have no successful payments yet
                if (count($existingPayments) > 0) {
                    throw new ApiException(
                        409,
                        'payment_duplicate',
                        'Đơn đặt phòng đã có giao dịch thanh toán thành công trước đó'
                    );
                }

                $amount = (int) $booking['total_amount'];

                // Update expires_at = LEAST(paid_at + HOST_RESPONSE_HOURS, start_time)
                $hostHours = (int) ($_ENV['HOST_RESPONSE_HOURS'] ?? 24);
                $paidDt = new DateTimeImmutable($paidAt);
                $hostExpiry = $paidDt->modify("+{$hostHours} hours");
                $startDt = new DateTimeImmutable($booking['start_time']);
                $finalExpiry = $hostExpiry < $startDt ? $hostExpiry : $startDt;
                $newExpiresAt = $finalExpiry->format('Y-m-d H:i:s');

                $this->bookingRepo->updateBookingExpiresAt($bookingId, $newExpiresAt, $this->pdo);

            } elseif ($paymentType === 'remaining') {
                if (!in_array($booking['status'], ['confirmed', 'checked_in'], true)) {
                    throw new ApiException(
                        400,
                        'invalid_booking_status',
                        'Chỉ có thể thanh toán phần còn lại khi đơn đã được xác nhận (confirmed) hoặc đã check-in'
                    );
                }

                $hasDeposit = false;
                $hasRemainingOrFull = false;

                foreach ($existingPayments as $p) {
                    if ($p['payment_type'] === 'deposit') {
                        $hasDeposit = true;
                    }
                    if (in_array($p['payment_type'], ['remaining', 'full'], true)) {
                        $hasRemainingOrFull = true;
                    }
                }

                if (!$hasDeposit) {
                    throw new ApiException(400, 'deposit_required', 'Đơn đặt phòng chưa thanh toán tiền cọc');
                }

                if ($hasRemainingOrFull) {
                    throw new ApiException(
                        409,
                        'payment_duplicate',
                        'Phần tiền còn lại của đơn đặt phòng đã được thanh toán trước đó'
                    );
                }

                $totalAmount = (int) $booking['total_amount'];
                $depositAmount = (int) $booking['deposit_amount'];
                $amount = max(0, $totalAmount - $depositAmount);
            }

            // Generate transaction code: 'SBX-' + YmdHis + '-' + 8 hex chars
            $txCode = 'SBX-' . date('YmdHis') . '-' . bin2hex(random_bytes(4));

            $paymentId = $this->bookingRepo->insertPayment([
                'booking_id'       => $bookingId,
                'payment_type'     => $paymentType,
                'payment_method'   => $paymentMethod,
                'amount'           => $amount,
                'status'           => 'success',
                'transaction_code' => $txCode,
                'paid_at'          => $paidAt,
            ], $this->pdo);

            // Audit log
            $this->bookingRepo->insertAuditLog(
                (int) $authUser['user_id'],
                'payment_created',
                'payments',
                $paymentId,
                [
                    'booking_id'       => $bookingId,
                    'booking_code'     => $booking['booking_code'],
                    'payment_type'     => $paymentType,
                    'payment_method'   => $paymentMethod,
                    'amount'           => $amount,
                    'status'           => 'success',
                    'transaction_code' => $txCode,
                    'expires_at'       => $newExpiresAt ?? $booking['expires_at'],
                ],
                $this->pdo
            );

            $this->pdo->commit();

            return [
                'payment_id'       => $paymentId,
                'booking_id'       => $bookingId,
                'booking_code'     => $booking['booking_code'],
                'payment_type'     => $paymentType,
                'payment_method'   => $paymentMethod,
                'amount'           => $amount,
                'status'           => 'success',
                'transaction_code' => $txCode,
                'paid_at'          => $paidAt,
                'expires_at'       => $newExpiresAt ?? $booking['expires_at'],
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}

