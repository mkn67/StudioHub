<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use PDO;

class ConsumableRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function createItem(int $studioId, string $name, string $unit, string $quantity): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO consumable_items (studio_id, name, unit, on_hand) VALUES (?, ?, ?, ?)");
        $stmt->execute([$studioId, $name, $unit, $quantity]);
        return (int) $this->pdo->lastInsertId();
    }

    public function findForUpdate(int $itemId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM consumable_items WHERE item_id = ? FOR UPDATE');
        $stmt->execute([$itemId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findById(int $itemId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM consumable_items WHERE item_id = ?');
        $stmt->execute([$itemId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function movementByKey(string $key): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM inventory_movements WHERE idempotency_key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function movementByIdForUpdate(int $movementId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM inventory_movements WHERE movement_id = ? FOR UPDATE');
        $stmt->execute([$movementId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findReversal(int $movementId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM inventory_movements WHERE reversal_of_movement_id = ?');
        $stmt->execute([$movementId]);
        return (bool) $stmt->fetchColumn();
    }

    public function applyMovement(array $data): void
    {
        $delta = $data['quantity_delta'];
        $stmt = $this->pdo->prepare('UPDATE consumable_items SET on_hand = on_hand + CAST(? AS DECIMAL(12,3)) WHERE item_id = ? AND on_hand + CAST(? AS DECIMAL(12,3)) >= 0');
        $stmt->execute([$delta, $data['item_id'], $delta]);
        if ($stmt->rowCount() !== 1) {
            throw new \DomainException('Insufficient stock');
        }
        $insert = $this->pdo->prepare('INSERT INTO inventory_movements (item_id, booking_id, movement_type, quantity_delta, idempotency_key, reversal_of_movement_id, actor_user_id, reason) VALUES (?, ?, ?, CAST(? AS DECIMAL(12,3)), ?, ?, ?, ?)');
        $insert->execute([$data['item_id'], $data['booking_id'], $data['movement_type'], $delta, $data['idempotency_key'], $data['reversal_of_movement_id'], $data['actor_user_id'], $data['reason']]);
    }

    public function findStudioHost(int $studioId): ?int
    {
        $stmt = $this->pdo->prepare('SELECT host_id FROM studios WHERE studio_id = ?');
        $stmt->execute([$studioId]);
        $value = $stmt->fetchColumn();
        return $value === false ? null : (int) $value;
    }

    public function bookingBelongsToStudio(int $bookingId, int $studioId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? AND r.studio_id = ?');
        $stmt->execute([$bookingId, $studioId]);
        return (bool) $stmt->fetchColumn();
    }

    public function listForStudio(int $studioId): array
    {
        $stmt = $this->pdo->prepare('SELECT item_id, studio_id, name, unit, on_hand, status, created_at, updated_at FROM consumable_items WHERE studio_id = ? ORDER BY item_id');
        $stmt->execute([$studioId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listMovements(int $itemId): array
    {
        $stmt = $this->pdo->prepare('SELECT movement_id, item_id, booking_id, movement_type, quantity_delta, reversal_of_movement_id, reason, created_at FROM inventory_movements WHERE item_id = ? ORDER BY movement_id DESC LIMIT 200');
        $stmt->execute([$itemId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function bookingForReservation(int $bookingId, int $studioId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT b.booking_id, b.status, b.start_time FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? AND r.studio_id = ? FOR UPDATE");
        $stmt->execute([$bookingId, $studioId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function reservationByItemBooking(int $itemId, int $bookingId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM inventory_reservations WHERE item_id = ? AND booking_id = ? FOR UPDATE');
        $stmt->execute([$itemId, $bookingId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function reservationByKey(string $key): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM inventory_reservations WHERE idempotency_key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function reservedQuantity(int $itemId): string
    {
        $stmt = $this->pdo->prepare("SELECT COALESCE(SUM(quantity), 0) FROM inventory_reservations WHERE item_id = ? AND status = 'reserved'");
        $stmt->execute([$itemId]);
        return (string) $stmt->fetchColumn();
    }

    public function createReservation(int $itemId, int $bookingId, string $quantity, string $key, int $hostId): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO inventory_reservations (item_id, booking_id, quantity, idempotency_key, status, created_by) VALUES (?, ?, ?, ?, 'reserved', ?)");
        $stmt->execute([$itemId, $bookingId, $quantity, $key, $hostId]);
        return (int) $this->pdo->lastInsertId();
    }

    public function updateReservationStatus(int $reservationId, string $status): void
    {
        $stmt = $this->pdo->prepare('UPDATE inventory_reservations SET status = ? WHERE reservation_id = ?');
        $stmt->execute([$status, $reservationId]);
    }

    public function releaseBookingReservations(int $bookingId, PDO $pdo): void
    {
        $stmt = $pdo->prepare("UPDATE inventory_reservations SET status = 'released' WHERE booking_id = ? AND status = 'reserved'");
        $stmt->execute([$bookingId]);
    }
}
