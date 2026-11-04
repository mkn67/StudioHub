<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;

class ServicePackageService
{
    private ServicePackageRepository $repository;
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->repository = new ServicePackageRepository($this->pdo);
    }

    public function publicPackages(int $studioId): array
    {
        if ($studioId <= 0) {
            throw new ApiException(400, 'invalid_studio_id', 'Studio không hợp lệ');
        }
        return $this->repository->listActive($studioId);
    }

    public function createPackage(int $hostId, int $studioId, array $input): array
    {
        if ($this->repository->findStudioHost($studioId) !== $hostId) {
            throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý studio này');
        }
        $unit = (string) ($input['pricing_unit'] ?? '');
        $validUnits = ['hour', 'session', 'day', 'song', 'project'];
        if (!in_array($unit, $validUnits, true)) {
            throw new ApiException(400, 'validation_error', 'Đơn vị giá gói dịch vụ không hợp lệ', [
                ['field' => 'pricing_unit', 'code' => 'invalid_value', 'message' => 'Allowed: hour, session, day, song, project'],
            ]);
        }
        $name = trim((string) ($input['name'] ?? ''));
        $price = isset($input['base_price']) ? filter_var($input['base_price'], FILTER_VALIDATE_INT) : false;
        if ($name === '' || mb_strlen($name) > 150 || $price === false || $price < 0) {
            throw new ApiException(400, 'validation_error', 'Tên gói và giá hợp lệ là bắt buộc');
        }
        $items = $input['items'] ?? [];
        if (!is_array($items) || count($items) > 50) {
            throw new ApiException(400, 'validation_error', 'Danh sách thành phần gói không hợp lệ');
        }
        foreach ($items as $index => $item) {
            if (!is_array($item) || trim((string) ($item['name'] ?? '')) === '' || !in_array($item['item_type'] ?? '', ['service','session','staff','equipment','revision','deliverable'], true)) {
                throw new ApiException(400, 'validation_error', 'Thành phần gói không hợp lệ', [
                    ['field' => "items.{$index}", 'code' => 'invalid_item', 'message' => 'Each item needs a name and valid item_type'],
                ]);
            }
            foreach (['quantity', 'duration_minutes'] as $field) {
                $integer = isset($item[$field]) ? filter_var($item[$field], FILTER_VALIDATE_INT) : null;
                if ($integer === false || ($integer !== null && $integer < 0)) {
                    throw new ApiException(400, 'validation_error', 'Số lượng và thời lượng phải là số nguyên');
                }
            }
        }
        $data = [
            'studio_id' => $studioId,
            'name' => $name,
            'description' => $input['description'] ?? null,
            'category' => $input['category'] ?? null,
            'pricing_unit' => $unit,
            'base_price' => $price,
            'included_duration_minutes' => $this->optionalNonNegativeInt($input, 'included_duration_minutes'),
            'included_sessions' => $this->optionalNonNegativeInt($input, 'included_sessions'),
            'included_revisions' => $this->optionalNonNegativeInt($input, 'included_revisions'),
            'status' => (string) ($input['status'] ?? 'draft'),
            'items' => array_map(static fn(array $item): array => [
                'item_type' => $item['item_type'], 'name' => trim($item['name']),
                'quantity' => $item['quantity'] ?? null, 'duration_minutes' => $item['duration_minutes'] ?? null,
                'details' => $item['details'] ?? null,
            ], $items),
        ];
        if (!in_array($data['status'], ['draft', 'active', 'inactive'], true)) {
            throw new ApiException(400, 'validation_error', 'Trạng thái gói không hợp lệ');
        }
        $this->pdo->beginTransaction();
        try {
            $id = $this->repository->create($data, $this->pdo);
            $this->pdo->commit();
            return ['package_id' => $id, 'studio_id' => $studioId, 'name' => $name, 'pricing_unit' => $unit, 'base_price' => $data['base_price'], 'status' => $data['status']];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    private function optionalNonNegativeInt(array $input, string $field): ?int
    {
        if (!array_key_exists($field, $input) || $input[$field] === null) return null;
        $value = filter_var($input[$field], FILTER_VALIDATE_INT);
        if ($value === false || $value < 0) throw new ApiException(400, 'validation_error', "{$field} phải là số nguyên không âm");
        return $value;
    }

    public function updatePackage(int $hostId, int $packageId, array $input): array
    {
        $this->pdo->beginTransaction();
        try {
            $package = $this->repository->findForUpdate($packageId);
            if (!$package) throw new ApiException(404, 'package_not_found', 'Gói dịch vụ không tồn tại');
            if ($this->repository->findStudioHost((int) $package['studio_id']) !== $hostId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền quản lý gói này');
            $changes = [];
            if (array_key_exists('name', $input)) {
                $name = trim((string) $input['name']);
                if ($name === '' || mb_strlen($name) > 150) throw new ApiException(400, 'validation_error', 'Tên gói không hợp lệ');
                $changes['name'] = $name;
            }
            if (array_key_exists('description', $input)) $changes['description'] = $input['description'];
            if (array_key_exists('base_price', $input)) {
                $price = filter_var($input['base_price'], FILTER_VALIDATE_INT);
                if ($price === false || $price < 0) throw new ApiException(400, 'validation_error', 'Giá phải là số nguyên VND không âm');
                $changes['base_price'] = $price;
            }
            if (array_key_exists('status', $input)) {
                if (!in_array($input['status'], ['draft', 'active', 'inactive'], true)) throw new ApiException(400, 'validation_error', 'Trạng thái gói không hợp lệ');
                $changes['status'] = $input['status'];
            }
            foreach (['included_duration_minutes', 'included_sessions', 'included_revisions'] as $field) {
                if (array_key_exists($field, $input)) $changes[$field] = $this->optionalNonNegativeInt($input, $field);
            }
            $items = null;
            if (array_key_exists('items', $input)) {
                if (!is_array($input['items']) || count($input['items']) > 50) throw new ApiException(400, 'validation_error', 'Danh sách thành phần gói không hợp lệ');
                $items = $this->validatePackageItems($input['items']);
            }
            $this->repository->updatePackage($packageId, $changes);
            if ($items !== null) $this->repository->replaceItems($packageId, $items);
            $this->pdo->commit();
            return ['package_id' => $packageId, 'name' => $changes['name'] ?? $package['name'], 'base_price' => $changes['base_price'] ?? (int) $package['base_price'], 'status' => $changes['status'] ?? $package['status']];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    private function validatePackageItems(array $items): array
    {
        $validTypes = ['service','session','staff','equipment','revision','deliverable'];
        $normalized = [];
        foreach ($items as $index => $item) {
            if (!is_array($item) || trim((string) ($item['name'] ?? '')) === '' || !in_array($item['item_type'] ?? '', $validTypes, true)) {
                throw new ApiException(400, 'validation_error', 'Thành phần gói không hợp lệ', [
                    ['field' => "items.{$index}", 'code' => 'invalid_item', 'message' => 'Each item needs a name and valid item_type'],
                ]);
            }
            $quantity = isset($item['quantity']) ? filter_var($item['quantity'], FILTER_VALIDATE_INT) : null;
            $duration = isset($item['duration_minutes']) ? filter_var($item['duration_minutes'], FILTER_VALIDATE_INT) : null;
            if ($quantity === false || $duration === false || ($quantity !== null && $quantity < 0) || ($duration !== null && $duration < 0)) {
                throw new ApiException(400, 'validation_error', 'Số lượng và thời lượng phải là số nguyên không âm');
            }
            $normalized[] = [
                'item_type' => $item['item_type'], 'name' => trim($item['name']),
                'quantity' => $quantity, 'duration_minutes' => $duration, 'details' => $item['details'] ?? null,
            ];
        }
        return $normalized;
    }

    public function createOrder(int $customerId, int $packageId, int $quantity, ?int $projectId = null): array
    {
        if ($customerId <= 0 || $packageId <= 0 || $quantity <= 0 || $quantity > 100) {
            throw new ApiException(400, 'validation_error', 'Package và số lượng không hợp lệ');
        }
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("SELECT p.* FROM service_packages p JOIN studios s ON s.studio_id = p.studio_id WHERE p.package_id = ? AND p.status = 'active' AND s.status = 'active' FOR UPDATE");
            $stmt->execute([$packageId]);
            $package = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$package) throw new ApiException(404, 'package_not_found', 'Gói dịch vụ không tồn tại hoặc đã ngừng bán');
            if ($projectId !== null) {
                $projectStmt = $this->pdo->prepare('SELECT project_id FROM production_projects WHERE project_id = ? AND customer_id = ? AND studio_id = ?');
                $projectStmt->execute([$projectId, $customerId, (int) $package['studio_id']]);
                if (!$projectStmt->fetchColumn()) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại hoặc không thuộc studio của gói');
            }
            $includesEntitlements = (int) $package['included_sessions'] > 0 || (int) $package['included_duration_minutes'] > 0 || (int) $package['included_revisions'] > 0;
            if ($includesEntitlements && $projectId === null) {
                throw new ApiException(400, 'project_required', 'Gói có session/thời lượng/quyền chỉnh sửa cần gắn với production project');
            }
            $code = 'SO-' . bin2hex(random_bytes(12));
            $holdSetting = $_ENV['SERVICE_ORDER_HOLD_MINUTES'] ?? getenv('SERVICE_ORDER_HOLD_MINUTES');
            if ($holdSetting === false) $holdSetting = '15';
            $holdMinutes = filter_var($holdSetting, FILTER_VALIDATE_INT);
            if ($holdMinutes === false || $holdMinutes < 1 || $holdMinutes > 10080) {
                throw new \RuntimeException('SERVICE_ORDER_HOLD_MINUTES must be between 1 and 10080');
            }
            $expiresAt = date('Y-m-d H:i:s', time() + ($holdMinutes * 60));
            $unitPrice = (int) $package['base_price'];
            if ($unitPrice > intdiv(PHP_INT_MAX, $quantity)) {
                throw new ApiException(400, 'amount_too_large', 'Giá trị đơn dịch vụ vượt giới hạn');
            }
            $total = $unitPrice * $quantity;
            $id = $this->repository->createOrder([
                'order_code' => $code, 'customer_id' => $customerId, 'studio_id' => (int) $package['studio_id'],
                'package_id' => $packageId, 'project_id' => $projectId, 'package_name' => $package['name'], 'pricing_unit' => $package['pricing_unit'],
                'unit_price' => $unitPrice, 'included_duration_minutes' => $package['included_duration_minutes'],
                'included_sessions' => $package['included_sessions'], 'included_revisions' => $package['included_revisions'], 'quantity' => $quantity,
                'total_amount' => $total, 'expires_at' => $expiresAt,
            ], $this->pdo);
            $this->repository->snapshotItems($packageId, $id, $this->pdo);
            $this->pdo->commit();
            return ['order_id' => $id, 'order_code' => $code, 'package_name' => $package['name'], 'quantity' => $quantity, 'total_amount' => $total, 'status' => 'pending', 'expires_at' => $expiresAt];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function listOrders(int $customerId): array
    {
        $expire = $this->pdo->prepare("UPDATE service_orders SET status = 'expired' WHERE customer_id = ? AND status = 'pending' AND expires_at <= CURRENT_TIMESTAMP");
        $expire->execute([$customerId]);
        $stmt = $this->pdo->prepare('SELECT order_id, order_code, studio_id, package_name_snapshot, pricing_unit_snapshot, unit_price_snapshot, included_duration_minutes_snapshot, included_sessions_snapshot, included_revisions_snapshot, quantity, total_amount, status, expires_at, created_at FROM service_orders WHERE customer_id = ? ORDER BY order_id DESC');
        $stmt->execute([$customerId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function paySandbox(int $customerId, int $orderId, string $idempotencyKey): array
    {
        if ($idempotencyKey === '' || strlen($idempotencyKey) > 100) {
            throw new ApiException(400, 'idempotency_key_required', 'Cần gửi header Idempotency-Key hợp lệ');
        }
        $this->pdo->beginTransaction();
        try {
            $order = $this->repository->orderForUpdate($orderId, $this->pdo);
            if (!$order) throw new ApiException(404, 'service_order_not_found', 'Đơn dịch vụ không tồn tại');
            if ((int) $order['customer_id'] !== $customerId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền thanh toán đơn này');
            $prior = $this->pdo->prepare('SELECT payment_id, order_id, amount, status, transaction_code FROM service_order_payments WHERE idempotency_key = ?');
            $prior->execute([$idempotencyKey]);
            $existing = $prior->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                if ((int) $existing['order_id'] !== $orderId) throw new ApiException(409, 'idempotency_key_conflict', 'Idempotency-Key đã được dùng cho đơn khác');
                $this->pdo->commit();
                return $existing;
            }
            if ($order['status'] === 'pending' && strtotime($order['expires_at']) <= time()) {
                $expire = $this->pdo->prepare("UPDATE service_orders SET status = 'expired' WHERE order_id = ?");
                $expire->execute([$orderId]);
                $this->pdo->commit();
                throw new ApiException(409, 'service_order_expired', 'Đơn dịch vụ đã hết hạn');
            }
            if ($order['status'] !== 'pending') {
                throw new ApiException(409, 'service_order_expired', 'Đơn dịch vụ không còn khả dụng để thanh toán');
            }
            $tx = 'SBOX-' . bin2hex(random_bytes(12));
            $paymentId = $this->repository->createOrderPayment([
                'order_id' => $orderId, 'amount' => (int) $order['total_amount'],
                'transaction_code' => $tx, 'idempotency_key' => $idempotencyKey,
            ], $this->pdo);
            $update = $this->pdo->prepare("UPDATE service_orders SET status = 'paid' WHERE order_id = ?");
            $update->execute([$orderId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'service_order_paid', 'service_orders', ?, JSON_OBJECT('payment_id', ?, 'amount', ?, 'status', 'success'))");
            $audit->execute([$customerId, $orderId, $paymentId, (int) $order['total_amount']]);
            foreach (['sessions' => 'included_sessions_snapshot', 'minutes' => 'included_duration_minutes_snapshot', 'revisions' => 'included_revisions_snapshot'] as $type => $field) {
                $perUnit = (int) ($order[$field] ?? 0);
                if ($perUnit > 0) {
                    if ($perUnit > intdiv(PHP_INT_MAX, (int) $order['quantity'])) throw new ApiException(409, 'entitlement_overflow', 'Quyền lợi gói vượt giới hạn');
                    $entitlement = $this->pdo->prepare('INSERT INTO service_order_entitlements (order_id, entitlement_type, included_quantity, consumed_quantity) VALUES (?, ?, ?, 0)');
                    $entitlement->execute([$orderId, $type, $perUnit * (int) $order['quantity']]);
                }
            }
            $this->pdo->commit();
            return ['payment_id' => $paymentId, 'order_id' => $orderId, 'amount' => (int) $order['total_amount'], 'status' => 'success', 'transaction_code' => $tx];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function cancelOrder(int $customerId, int $orderId): array
    {
        $this->pdo->beginTransaction();
        try {
            $order = $this->repository->orderForUpdate($orderId, $this->pdo);
            if (!$order) throw new ApiException(404, 'service_order_not_found', 'Đơn dịch vụ không tồn tại');
            if ((int) $order['customer_id'] !== $customerId) throw new ApiException(403, 'forbidden', 'Bạn không có quyền hủy đơn này');
            if ($order['status'] === 'cancelled') {
                $this->pdo->commit();
                return ['order_id' => $orderId, 'status' => 'cancelled', 'refund_amount' => 0];
            }
            if (!in_array($order['status'], ['pending', 'paid'], true)) throw new ApiException(409, 'service_order_not_cancellable', 'Đơn này không thể hủy');
            $used = $this->pdo->prepare('SELECT COALESCE(SUM(consumed_quantity), 0) FROM service_order_entitlements WHERE order_id = ?');
            $used->execute([$orderId]);
            if ((int) $used->fetchColumn() > 0) throw new ApiException(409, 'service_order_in_use', 'Không thể hủy gói sau khi đã sử dụng quyền lợi');
            $payments = $this->pdo->prepare("SELECT payment_id, amount FROM service_order_payments WHERE order_id = ? AND status = 'success' FOR UPDATE");
            $payments->execute([$orderId]);
            $refundTotal = 0;
            foreach ($payments->fetchAll(PDO::FETCH_ASSOC) as $payment) {
                $amount = (int) $payment['amount'];
                if ($amount <= 0) continue;
                $refundKey = "service-cancel-{$orderId}-{$payment['payment_id']}";
                $tx = 'SBRF-' . bin2hex(random_bytes(12));
                $refund = $this->pdo->prepare("INSERT INTO service_order_refunds (payment_id, order_id, amount, status, reason, transaction_code, idempotency_key) VALUES (?, ?, ?, 'success', 'customer_cancelled', ?, ?)");
                $refund->execute([(int) $payment['payment_id'], $orderId, $amount, $tx, $refundKey]);
                $refundTotal += $amount;
            }
            $update = $this->pdo->prepare("UPDATE service_orders SET status = 'cancelled' WHERE order_id = ?");
            $update->execute([$orderId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'service_order_cancelled', 'service_orders', ?, JSON_OBJECT('refund_amount', ?, 'refund_mode', 'sandbox_full_refund'))");
            $audit->execute([$customerId, $orderId, $refundTotal]);
            $this->pdo->commit();
            return ['order_id' => $orderId, 'status' => 'cancelled', 'refund_amount' => $refundTotal, 'refund_mode' => 'sandbox'];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }
}
