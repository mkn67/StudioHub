<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

class StudioPolicyService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    public function getForHost(int $hostId, ?int $studioId = null): array
    {
        if ($studioId !== null) {
            $this->assertOwnership($hostId, $studioId);
            $stmt = $this->pdo->prepare('SELECT * FROM studio_policies WHERE studio_id = ?');
            $stmt->execute([$studioId]);
            return $this->withDefaults($studioId, $stmt->fetch(PDO::FETCH_ASSOC) ?: []);
        }
        $stmt = $this->pdo->prepare('SELECT studio_id FROM studios WHERE host_id = ? ORDER BY studio_id');
        $stmt->execute([$hostId]);
        $result = [];
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $policy = $this->pdo->prepare('SELECT * FROM studio_policies WHERE studio_id = ?');
            $policy->execute([(int) $id]);
            $result[] = $this->withDefaults((int) $id, $policy->fetch(PDO::FETCH_ASSOC) ?: []);
        }
        return $result;
    }

    public function update(int $hostId, int $actorId, array $input): array
    {
        $studioId = filter_var($input['studio_id'] ?? null, FILTER_VALIDATE_INT);
        if ($studioId === false || $studioId === null || $studioId < 1) throw new ApiException(400, 'studio_id_required', 'studio_id hợp lệ là bắt buộc');
        $this->assertOwnership($hostId, (int) $studioId);
        $allowed = ['payment_minutes','deposit_percent','cancel_hours','change_hours','refund_tiers','overtime_per_30m','open_hour','close_hour'];
        if (array_diff(array_keys($input), [...$allowed, 'studio_id']) !== []) throw new ApiException(400, 'unknown_fields', 'Payload có field không hỗ trợ');
        $current = $this->getForHost($hostId, (int) $studioId);
        $value = array_replace($current, array_intersect_key($input, array_flip($allowed)));
        foreach (['payment_minutes' => [1, 1440], 'cancel_hours' => [0, 720], 'change_hours' => [0, 720], 'overtime_per_30m' => [0, 100000000], 'open_hour' => [0, 23], 'close_hour' => [1, 24]] as $field => [$min, $max]) {
            if (filter_var($value[$field], FILTER_VALIDATE_INT) === false || (int) $value[$field] < $min || (int) $value[$field] > $max) throw new ApiException(400, 'invalid_' . $field, "{$field} nằm ngoài giới hạn cho phép");
            $value[$field] = (int) $value[$field];
        }
        if (!is_numeric($value['deposit_percent']) || (float) $value['deposit_percent'] < 0 || (float) $value['deposit_percent'] > 100) throw new ApiException(400, 'invalid_deposit_percent', 'deposit_percent phải trong khoảng 0..100');
        $value['deposit_percent'] = (float) $value['deposit_percent'];
        if ($value['open_hour'] >= $value['close_hour']) throw new ApiException(400, 'invalid_operating_hours', 'close_hour phải sau open_hour');
        $tiers = $value['refund_tiers'];
        if (!is_array($tiers) || count($tiers) > 10) throw new ApiException(400, 'invalid_refund_tiers', 'refund_tiers phải là mảng tối đa 10 mức');
        $previousHours = PHP_INT_MAX;
        foreach ($tiers as $tier) {
            if (!is_array($tier)) throw new ApiException(400, 'invalid_refund_tiers', 'Mỗi mức hoàn phải có hours và percent');
            $hours = filter_var($tier['hours'] ?? null, FILTER_VALIDATE_INT);
            $percent = $tier['percent'] ?? null;
            if ($hours === false || $hours < 0 || $hours >= $previousHours || !is_numeric($percent) || (float) $percent < 0 || (float) $percent > 100) throw new ApiException(400, 'invalid_refund_tiers', 'Mức hoàn phải giảm dần theo giờ và phần trăm nằm trong 0..100');
            $previousHours = $hours;
        }
        $stmt = $this->pdo->prepare('INSERT INTO studio_policies (studio_id, payment_minutes, deposit_percent, cancel_hours, change_hours, refund_tiers, overtime_per_30m, open_hour, close_hour, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE payment_minutes = VALUES(payment_minutes), deposit_percent = VALUES(deposit_percent), cancel_hours = VALUES(cancel_hours), change_hours = VALUES(change_hours), refund_tiers = VALUES(refund_tiers), overtime_per_30m = VALUES(overtime_per_30m), open_hour = VALUES(open_hour), close_hour = VALUES(close_hour), updated_by = VALUES(updated_by)');
        $stmt->execute([(int) $studioId, $value['payment_minutes'], $value['deposit_percent'], $value['cancel_hours'], $value['change_hours'], json_encode(array_values($tiers), JSON_THROW_ON_ERROR), $value['overtime_per_30m'], $value['open_hour'], $value['close_hour'], $actorId]);
        $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'studio_policy_updated', 'studios', ?, ?)");
        $audit->execute([$actorId, (int) $studioId, json_encode(['policy_fields' => array_keys(array_intersect_key($input, array_flip($allowed)))], JSON_THROW_ON_ERROR)]);
        return $this->withDefaults((int) $studioId, $this->fetchRow((int) $studioId));
    }

    private function fetchRow(int $studioId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM studio_policies WHERE studio_id = ?');
        $stmt->execute([$studioId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function withDefaults(int $studioId, array $row): array
    {
        $policy = array_replace(['studio_id' => $studioId, 'payment_minutes' => (int) ($_ENV['HOLD_MINUTES'] ?? 15), 'deposit_percent' => 100 * (float) ($_ENV['DEPOSIT_RATE'] ?? 0.30), 'cancel_hours' => 24, 'change_hours' => 24, 'refund_tiers' => [], 'overtime_per_30m' => 0, 'open_hour' => 8, 'close_hour' => 22], $row);
        if (is_string($policy['refund_tiers'])) $policy['refund_tiers'] = json_decode($policy['refund_tiers'], true) ?: [];
        foreach (['payment_minutes','cancel_hours','change_hours','overtime_per_30m','open_hour','close_hour'] as $field) $policy[$field] = (int) $policy[$field];
        $policy['deposit_percent'] = (float) $policy['deposit_percent'];
        return $policy;
    }

    private function assertOwnership(int $hostId, int $studioId): void
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM studios WHERE studio_id = ? AND host_id = ?');
        $stmt->execute([$studioId, $hostId]);
        if (!$stmt->fetchColumn()) throw new ApiException(404, 'studio_not_found', 'Studio không tồn tại hoặc không thuộc tài khoản này');
    }
}
