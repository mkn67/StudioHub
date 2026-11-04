<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use PDO;

class ServicePackageRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findActive(int $studioId, int $packageId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM service_packages WHERE studio_id = ? AND package_id = ? AND status = 'active'");
        $stmt->execute([$studioId, $packageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $items = $this->pdo->prepare('SELECT item_type, name, quantity, duration_minutes, details FROM service_package_items WHERE package_id = ? ORDER BY item_id');
        $items->execute([$packageId]);
        $row['items'] = $items->fetchAll(PDO::FETCH_ASSOC);
        return $row;
    }

    public function listActive(int $studioId): array
    {
        $stmt = $this->pdo->prepare("SELECT p.package_id, p.studio_id, p.name, p.description, p.category, p.pricing_unit, p.base_price, p.included_duration_minutes, p.included_sessions, p.included_revisions FROM service_packages p JOIN studios s ON s.studio_id = p.studio_id WHERE p.studio_id = ? AND p.status = 'active' AND s.status = 'active' ORDER BY p.package_id");
        $stmt->execute([$studioId]);
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $items = $this->pdo->prepare('SELECT item_type, name, quantity, duration_minutes, details FROM service_package_items WHERE package_id = ? ORDER BY item_id');
        foreach ($packages as &$package) {
            $items->execute([(int) $package['package_id']]);
            $package['items'] = $items->fetchAll(PDO::FETCH_ASSOC);
        }
        unset($package);
        return $packages;
    }

    public function findForUpdate(int $packageId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM service_packages WHERE package_id = ? FOR UPDATE');
        $stmt->execute([$packageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(array $data, PDO $pdo): int
    {
        $stmt = $pdo->prepare('INSERT INTO service_packages (studio_id, name, description, category, pricing_unit, base_price, included_duration_minutes, included_sessions, included_revisions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['studio_id'], $data['name'], $data['description'], $data['category'], $data['pricing_unit'],
            $data['base_price'], $data['included_duration_minutes'], $data['included_sessions'],
            $data['included_revisions'], $data['status'],
        ]);
        $id = (int) $pdo->lastInsertId();
        $item = $pdo->prepare('INSERT INTO service_package_items (package_id, item_type, name, quantity, duration_minutes, details) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($data['items'] as $value) {
            $item->execute([$id, $value['item_type'], $value['name'], $value['quantity'], $value['duration_minutes'], $value['details']]);
        }
        return $id;
    }

    public function updatePackage(int $packageId, array $changes): void
    {
        if ($changes === []) return;
        $columns = [];
        foreach (array_keys($changes) as $column) {
            if (!in_array($column, ['name', 'description', 'base_price', 'status', 'included_duration_minutes', 'included_sessions', 'included_revisions'], true)) {
                throw new \InvalidArgumentException('Unsupported service package field');
            }
            $columns[] = "{$column} = :{$column}";
        }
        $changes['package_id'] = $packageId;
        $stmt = $this->pdo->prepare('UPDATE service_packages SET ' . implode(', ', $columns) . ' WHERE package_id = :package_id');
        $stmt->execute($changes);
    }

    public function replaceItems(int $packageId, array $items): void
    {
        $delete = $this->pdo->prepare('DELETE FROM service_package_items WHERE package_id = ?');
        $delete->execute([$packageId]);
        $insert = $this->pdo->prepare('INSERT INTO service_package_items (package_id, item_type, name, quantity, duration_minutes, details) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($items as $item) {
            $insert->execute([$packageId, $item['item_type'], $item['name'], $item['quantity'], $item['duration_minutes'], $item['details']]);
        }
    }

    public function findStudioHost(int $studioId): ?int
    {
        $stmt = $this->pdo->prepare('SELECT host_id FROM studios WHERE studio_id = ?');
        $stmt->execute([$studioId]);
        $hostId = $stmt->fetchColumn();
        return $hostId === false ? null : (int) $hostId;
    }

    public function createOrder(array $order, PDO $pdo): int
    {
        $stmt = $pdo->prepare("INSERT INTO service_orders (order_code, customer_id, studio_id, package_id, project_id, package_name_snapshot, pricing_unit_snapshot, unit_price_snapshot, included_duration_minutes_snapshot, included_sessions_snapshot, included_revisions_snapshot, quantity, total_amount, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)");
        $stmt->execute([
            $order['order_code'], $order['customer_id'], $order['studio_id'], $order['package_id'], $order['project_id'], $order['package_name'],
            $order['pricing_unit'], $order['unit_price'], $order['included_duration_minutes'], $order['included_sessions'],
            $order['included_revisions'], $order['quantity'], $order['total_amount'], $order['expires_at'],
        ]);
        return (int) $pdo->lastInsertId();
    }

    public function snapshotItems(int $packageId, int $orderId, PDO $pdo): void
    {
        $stmt = $pdo->prepare('INSERT INTO service_order_items (order_id, item_type, name_snapshot, quantity_snapshot, duration_minutes_snapshot, details_snapshot) SELECT ?, item_type, name, quantity, duration_minutes, details FROM service_package_items WHERE package_id = ?');
        $stmt->execute([$orderId, $packageId]);
    }

    public function orderForUpdate(int $orderId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM service_orders WHERE order_id = ? FOR UPDATE');
        $stmt->execute([$orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function createOrderPayment(array $data, PDO $pdo): int
    {
        $stmt = $pdo->prepare("INSERT INTO service_order_payments (order_id, amount, payment_method, status, transaction_code, idempotency_key) VALUES (?, ?, 'sandbox_qr', 'success', ?, ?)");
        $stmt->execute([$data['order_id'], $data['amount'], $data['transaction_code'], $data['idempotency_key']]);
        return (int) $pdo->lastInsertId();
    }
}
