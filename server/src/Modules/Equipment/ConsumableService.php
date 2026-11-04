<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;

class ConsumableService
{
    private ConsumableRepository $repository;
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->repository = new ConsumableRepository($this->pdo);
    }

    public function create(int $hostId, int $studioId, array $input): array
    {
        if ($this->repository->findStudioHost($studioId) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý studio này');
        $name = trim((string) ($input['name'] ?? ''));
        $unit = trim((string) ($input['unit'] ?? ''));
        if ($name === '' || mb_strlen($name) > 150 || $unit === '' || mb_strlen($unit) > 30) {
            throw new ApiException(400, 'validation_error', 'Tên vật tư và đơn vị tính là bắt buộc');
        }
        $this->pdo->beginTransaction();
        try {
            $id = $this->repository->createItem($studioId, $name, $unit, '0');
            $this->pdo->commit();
            return ['item_id' => $id, 'studio_id' => $studioId, 'name' => $name, 'unit' => $unit, 'on_hand' => '0.000'];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function listForStudio(int $hostId, int $studioId): array
    {
        if ($this->repository->findStudioHost($studioId) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền xem kho vật tư này');
        return $this->repository->listForStudio($studioId);
    }

    public function listMovements(int $hostId, int $itemId): array
    {
        $item = $this->repository->findById($itemId);
        if (!$item) throw new ApiException(404, 'consumable_not_found', 'Vật tư không tồn tại');
        if ($this->repository->findStudioHost((int) $item['studio_id']) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền xem biến động kho này');
        return $this->repository->listMovements($itemId);
    }

    public function move(int $hostId, int $itemId, array $input): array
    {
        $type = (string) ($input['movement_type'] ?? '');
        $quantity = trim((string) ($input['quantity_delta'] ?? ''));
        $key = trim((string) ($input['idempotency_key'] ?? ''));
        $allowedTypes = ['receipt', 'consume', 'adjust', 'reversal'];
        $reversalId = $type === 'reversal' ? filter_var($input['reversal_of_movement_id'] ?? null, FILTER_VALIDATE_INT) : null;
        $quantityValid = $type === 'reversal' || (preg_match('/^-?(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/', $quantity) && (float) $quantity !== 0.0);
        if (!in_array($type, $allowedTypes, true) || !$quantityValid || $key === '' || strlen($key) > 100 || ($type === 'reversal' && (!$reversalId || $reversalId <= 0))) {
            throw new ApiException(400, 'validation_error', 'Loại biến động, số lượng hoặc idempotency key không hợp lệ');
        }
        if (($type === 'receipt' && str_starts_with($quantity, '-')) || ($type === 'consume' && !str_starts_with($quantity, '-'))) {
            throw new ApiException(400, 'invalid_movement_sign', 'receipt phải dương, consume phải âm');
        }
        $this->pdo->beginTransaction();
        try {
            $item = $this->repository->findForUpdate($itemId);
            if (!$item) throw new ApiException(404, 'consumable_not_found', 'Vật tư không tồn tại');
            if ($this->repository->findStudioHost((int) $item['studio_id']) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý vật tư này');
            $prior = $this->repository->movementByKey($key);
            if ($prior) {
                $sameQuantity = $type === 'reversal' || (string) $prior['quantity_delta'] === number_format((float) $quantity, 3, '.', '');
                $same = (int) $prior['item_id'] === $itemId && $prior['movement_type'] === $type && $sameQuantity
                    && (int) ($prior['reversal_of_movement_id'] ?? 0) === (int) ($reversalId ?? 0);
                if (!$same) throw new ApiException(409, 'idempotency_key_conflict', 'Idempotency key đã được dùng cho biến động khác');
                $this->pdo->commit();
                return $prior;
            }
            if ($item['status'] !== 'active') throw new ApiException(409, 'consumable_inactive', 'Vật tư đã ngừng hoạt động');
            if ($type === 'reversal') {
                $original = $this->repository->movementByIdForUpdate((int) $reversalId);
                if (!$original || (int) $original['item_id'] !== $itemId || $original['movement_type'] === 'reversal' || $this->repository->findReversal((int) $reversalId)) {
                    throw new ApiException(409, 'invalid_reversal', 'Biến động gốc không hợp lệ hoặc đã được hoàn tác');
                }
                $quantity = (string) (-(float) $original['quantity_delta']);
            }
            if (isset($input['booking_id']) && !$this->repository->bookingBelongsToStudio((int) $input['booking_id'], (int) $item['studio_id'])) {
                throw new ApiException(404, 'booking_not_found', 'Booking không thuộc studio này');
            }
            $normalized = number_format((float) $quantity, 3, '.', '');
            $reserved = (float) $this->repository->reservedQuantity($itemId);
            if ((float) $normalized < 0 && $reserved > 0 && abs((float) $normalized) > (float) $item['on_hand'] - $reserved + 0.000001) {
                throw new ApiException(409, 'stock_reserved', 'Số lượng này đang được giữ cho booking khác');
            }
            try {
                $this->repository->applyMovement([
                    'item_id' => $itemId,
                    'booking_id' => isset($input['booking_id']) ? (int) $input['booking_id'] : null,
                    'movement_type' => $type,
                    'quantity_delta' => $normalized,
                    'idempotency_key' => $key,
                    'reversal_of_movement_id' => $reversalId,
                    'actor_user_id' => $hostId,
                    'reason' => isset($input['reason']) ? trim((string) $input['reason']) : null,
                ]);
            } catch (\DomainException) {
                throw new ApiException(409, 'insufficient_stock', 'Biến động này làm tồn kho âm');
            }
            $this->pdo->commit();
            return ['item_id' => $itemId, 'movement_type' => $type, 'quantity_delta' => $normalized, 'reversal_of_movement_id' => $reversalId, 'idempotency_key' => $key];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function reserve(int $hostId, int $itemId, array $input): array
    {
        $bookingId = filter_var($input['booking_id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = trim((string) ($input['quantity'] ?? ''));
        $key = trim((string) ($input['idempotency_key'] ?? ''));
        if (!$bookingId || $bookingId <= 0 || !preg_match('/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0 || $key === '' || strlen($key) > 100) {
            throw new ApiException(400, 'validation_error', 'Booking, số lượng hoặc idempotency key không hợp lệ');
        }
        $normalized = number_format((float) $quantity, 3, '.', '');
        $this->pdo->beginTransaction();
        try {
            $item = $this->repository->findForUpdate($itemId);
            if (!$item) throw new ApiException(404, 'consumable_not_found', 'Vật tư không tồn tại');
            $studioId = (int) $item['studio_id'];
            if ($this->repository->findStudioHost($studioId) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý vật tư này');
            if ($item['status'] !== 'active') throw new ApiException(409, 'consumable_inactive', 'Vật tư đã ngừng hoạt động');
            $booking = $this->repository->bookingForReservation((int) $bookingId, $studioId);
            if (!$booking) throw new ApiException(404, 'booking_not_found', 'Booking không thuộc studio này');
            if (!in_array($booking['status'], ['pending', 'confirmed', 'checked_in'], true) || strtotime((string) $booking['start_time']) < time()) {
                throw new ApiException(409, 'booking_inactive', 'Chỉ có thể giữ vật tư cho booking sắp diễn ra');
            }
            $byKey = $this->repository->reservationByKey($key);
            if ($byKey) {
                $same = (int) $byKey['item_id'] === $itemId && (int) $byKey['booking_id'] === (int) $bookingId && (string) $byKey['quantity'] === $normalized;
                if (!$same) throw new ApiException(409, 'idempotency_key_conflict', 'Idempotency key đã được dùng cho lượt giữ kho khác');
                $this->pdo->commit();
                return $byKey;
            }
            $existing = $this->repository->reservationByItemBooking($itemId, (int) $bookingId);
            if ($existing) throw new ApiException(409, 'reservation_exists', 'Booking này đã có lượt giữ vật tư');
            $available = (float) $item['on_hand'] - (float) $this->repository->reservedQuantity($itemId);
            if ($available + 0.000001 < (float) $normalized) throw new ApiException(409, 'insufficient_available_stock', 'Không đủ tồn kho khả dụng để giữ vật tư');
            $id = $this->repository->createReservation($itemId, (int) $bookingId, $normalized, $key, $hostId);
            $this->pdo->commit();
            return ['reservation_id' => $id, 'item_id' => $itemId, 'booking_id' => (int) $bookingId, 'quantity' => $normalized, 'status' => 'reserved'];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function settleReservation(int $hostId, int $itemId, int $reservationId, string $action): array
    {
        if (!in_array($action, ['consume', 'release'], true)) throw new ApiException(400, 'validation_error', 'Thao tác không hợp lệ');
        $this->pdo->beginTransaction();
        try {
            $item = $this->repository->findForUpdate($itemId);
            if (!$item) throw new ApiException(404, 'consumable_not_found', 'Vật tư không tồn tại');
            if ($this->repository->findStudioHost((int) $item['studio_id']) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý vật tư này');
            // Lock by id after locking the item to serialize stock changes.
            $stmt = $this->pdo->prepare('SELECT * FROM inventory_reservations WHERE reservation_id = ? AND item_id = ? FOR UPDATE');
            $stmt->execute([$reservationId, $itemId]);
            $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$reservation) throw new ApiException(404, 'reservation_not_found', 'Lượt giữ kho không tồn tại');
            if ($reservation['status'] !== 'reserved') {
                if (($action === 'consume' && $reservation['status'] === 'consumed') || ($action === 'release' && $reservation['status'] === 'released')) {
                    $this->pdo->commit();
                    return $reservation;
                }
                throw new ApiException(409, 'reservation_already_settled', 'Lượt giữ kho đã được xử lý theo thao tác khác');
            }
            if ($action === 'consume') {
                $this->repository->applyMovement([
                    'item_id' => $itemId, 'booking_id' => (int) $reservation['booking_id'], 'movement_type' => 'consume',
                    'quantity_delta' => number_format(-(float) $reservation['quantity'], 3, '.', ''),
                    'idempotency_key' => 'reservation-consume-' . $reservationId, 'reversal_of_movement_id' => null,
                    'actor_user_id' => $hostId, 'reason' => 'inventory_reservation_consumed',
                ]);
            }
            $status = $action === 'consume' ? 'consumed' : 'released';
            $this->repository->updateReservationStatus($reservationId, $status);
            $this->pdo->commit();
            $reservation['status'] = $status;
            return $reservation;
        } catch (\DomainException) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw new ApiException(409, 'insufficient_stock', 'Không đủ tồn kho để xác nhận sử dụng vật tư');
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }
}
