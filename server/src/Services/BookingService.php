<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Db;
use App\Exceptions\ApiException;
use App\Repositories\BookingRepository;
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
            $customerName = (string) ($authUser['full_name'] ?? $authUser['name'] ?? '');
        }

        $customerEmail = trim((string) ($request['customer_email'] ?? ''));
        if ($customerEmail === '') {
            $customerEmail = $authUser['email'] ?? '';
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

        while ($attempts < $maxAttempts) {
            $attempts++;
            try {
                $this->pdo->exec("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
                $this->pdo->beginTransaction();

                // Steps 3 to 7: Evaluate booking with locking=true
                // 3. Lock room (FOR UPDATE) & verify party_size
                // 4. Verify studio active & rate active at DATE(start_time)
                // 5. Consolidate equipments, sort by ID asc, lock (FOR UPDATE)
                // 6. Check room schedule conflict -> 409 room_occupied
                // 7. Check peak usage equipment stock -> 409 equipment_insufficient
                // 8. Pricing calculation via PricingService
                $eval = $this->availabilityService->evaluate($request, true, $this->pdo);

                $pricing = $eval['pricing'];
                $startDt = new DateTimeImmutable($eval['start_time']);
                $nowDt = new DateTimeImmutable('now');

                // Step 8 (cont): Determine expires_at = LEAST(created_at + HOLD_MINUTES, start_time)
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
                // Date formatted from start_time
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

                // Check for MySQL deadlock (1213) or lock wait timeout (1205)
                if (in_array($errCode, [1205, 1213], true) && $attempts < $maxAttempts) {
                    usleep(50000); // 50ms before retry
                    continue;
                }

                // Check for trigger SQLSTATE 45000 ROOM_OCCUPIED
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

        throw new ApiException(500, 'concurrency_timeout', 'Không thể hoàn tất đặt phòng do xung đột tài nguyên, vui lòng thử lại');
    }
}
