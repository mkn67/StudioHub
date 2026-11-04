<?php
declare(strict_types=1);
namespace App\Modules\Refunds;
use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;
class RefundExceptionService
{
    private const SERVICE_CASE_OFFSET = 1000000000000;
    private PDO $pdo;
    public function __construct(?PDO $pdo = null) { $this->pdo = $pdo ?? Db::getConnection(); }
    public function list(array $query): array
    {
        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '' && !in_array($status, ['pending','failed','success'], true)) throw new ApiException(400, 'invalid_status', 'Trạng thái hoàn tiền không hợp lệ');
        $sql = "SELECT br.refund_id AS case_id, 'booking' AS refund_kind, br.refund_id, br.booking_id AS reference_id, b.booking_code AS reference_code, br.payment_id, br.amount, br.status, br.reason, br.created_at FROM booking_refunds br JOIN bookings b ON b.booking_id = br.booking_id UNION ALL SELECT so_refund.refund_id + " . self::SERVICE_CASE_OFFSET . " AS case_id, 'service_order' AS refund_kind, so_refund.refund_id, so_refund.order_id AS reference_id, CAST(so_refund.order_id AS CHAR) AS reference_code, so_refund.payment_id, so_refund.amount, so_refund.status, so_refund.reason, so_refund.created_at FROM service_order_refunds so_refund";
        $wrapped = 'SELECT * FROM (' . $sql . ') refunds WHERE (? = \'\' OR status = ?)';
        if ($status === '') $wrapped .= " AND status IN ('pending','failed')";
        $wrapped .= ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        $page = max(1, (int) ($query['page'] ?? 1)); $limit = min(100, max(1, (int) ($query['limit'] ?? 25)));
        $stmt = $this->pdo->prepare($wrapped);
        $stmt->bindValue(1, $status, PDO::PARAM_STR); $stmt->bindValue(2, $status, PDO::PARAM_STR);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT); $stmt->bindValue(4, ($page - 1) * $limit, PDO::PARAM_INT); $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return ['items' => $items, 'page' => $page, 'limit' => $limit];
    }
    public function show(int $caseId): array
    {
        [$kind, $id] = $this->decodeCaseId($caseId);
        if ($kind === 'booking') {
            $sql = 'SELECT br.refund_id + 0 AS case_id, \'booking\' AS refund_kind, br.*, b.booking_code AS reference_code, p.payment_type, p.amount AS payment_amount FROM booking_refunds br JOIN bookings b ON b.booking_id = br.booking_id JOIN payments p ON p.payment_id = br.payment_id WHERE br.refund_id = ?';
        } else {
            $sql = 'SELECT so_refund.refund_id + ' . self::SERVICE_CASE_OFFSET . ' AS case_id, \'service_order\' AS refund_kind, so_refund.*, CAST(so_refund.order_id AS CHAR) AS reference_code, so_payment.amount AS payment_amount FROM service_order_refunds so_refund JOIN service_order_payments so_payment ON so_payment.payment_id = so_refund.payment_id WHERE so_refund.refund_id = ?';
        }
        $stmt = $this->pdo->prepare($sql); $stmt->execute([$id]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new ApiException(404, 'refund_not_found', 'Không tìm thấy trường hợp hoàn tiền');
        $actions = $this->pdo->prepare('SELECT action_id, refund_kind, action, previous_status, new_status, evidence_reference, reason, admin_id, created_at FROM refund_exception_actions WHERE refund_kind = ? AND refund_id = ? ORDER BY action_id DESC');
        $actions->execute([$kind, $id]);
        $row['actions'] = $actions->fetchAll(PDO::FETCH_ASSOC);
        return $row;
    }
    public function act(int $caseId, int $adminId, array $input): array
    {
        $action = (string) ($input['action'] ?? '');
        $evidence = trim((string) ($input['evidence_reference'] ?? ''));
        $reason = trim((string) ($input['reason'] ?? ''));
        if (!in_array($action, ['confirm_succeeded','mark_failed'], true)) throw new ApiException(400, 'invalid_action', 'action phải là confirm_succeeded hoặc mark_failed');
        if ($action === 'confirm_succeeded' && ($evidence === '' || strlen($evidence) > 255)) throw new ApiException(400, 'evidence_required', 'Cần mã tham chiếu giao dịch đối soát tối đa 255 ký tự');
        if ($action === 'mark_failed' && $reason === '') throw new ApiException(400, 'reason_required', 'Cần lý do khi đánh dấu hoàn tiền thất bại');
        [$kind, $id] = $this->decodeCaseId($caseId);
        $table = $kind === 'booking' ? 'booking_refunds' : 'service_order_refunds';
        $idColumn = 'refund_id';
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("SELECT status FROM {$table} WHERE {$idColumn} = ? FOR UPDATE"); $stmt->execute([$id]);
            $previous = $stmt->fetchColumn();
            if ($previous === false) throw new ApiException(404, 'refund_not_found', 'Không tìm thấy trường hợp hoàn tiền');
            if (!in_array($previous, ['pending','failed'], true)) throw new ApiException(409, 'refund_not_actionable', 'Chỉ khoản hoàn pending/failed được xử lý thủ công');
            $next = $action === 'confirm_succeeded' ? 'success' : 'failed';
            $update = $this->pdo->prepare("UPDATE {$table} SET status = ? WHERE refund_id = ?"); $update->execute([$next, $id]);
            $log = $this->pdo->prepare('INSERT INTO refund_exception_actions (refund_kind, refund_id, action, previous_status, new_status, evidence_reference, reason, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $log->execute([$kind, $id, $action, $previous, $next, $evidence !== '' ? $evidence : null, $reason !== '' ? $reason : null, $adminId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'refund_exception_resolved', ?, ?, ?)");
            $audit->execute([$adminId, $kind === 'booking' ? 'booking_refunds' : 'service_order_refunds', $id, json_encode(['case_id' => $caseId, 'action' => $action, 'status' => $next, 'evidence_reference' => $evidence ?: null], JSON_THROW_ON_ERROR)]);
            $this->pdo->commit();
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); throw $error; }
        return $this->show($caseId);
    }
    private function decodeCaseId(int $caseId): array
    {
        if ($caseId < 1) throw new ApiException(404, 'refund_not_found', 'Không tìm thấy trường hợp hoàn tiền');
        return $caseId >= self::SERVICE_CASE_OFFSET ? ['service_order', $caseId - self::SERVICE_CASE_OFFSET] : ['booking', $caseId];
    }
}
