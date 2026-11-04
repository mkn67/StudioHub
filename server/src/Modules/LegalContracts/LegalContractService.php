<?php
declare(strict_types=1);
namespace App\Modules\LegalContracts;
use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;
class LegalContractService
{
    private PDO $pdo;
    private string $storage;
    public function __construct(?PDO $pdo = null, ?string $storage = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $configured = $_ENV['PRIVATE_CONTRACT_STORAGE'] ?? getenv('PRIVATE_CONTRACT_STORAGE');
        $this->storage = $storage ?? (is_string($configured) && $configured !== '' ? $configured : dirname(__DIR__, 3) . '/storage/private-contracts');
    }
    public function legalProfile(int $hostId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM host_legal_profiles WHERE host_id = ?'); $stmt->execute([$hostId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    public function listLegalProfiles(array $query): array
    {
        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '' && !in_array($status, ['submitted', 'verified', 'rejected'], true)) throw new ApiException(400, 'invalid_status', 'Trạng thái hồ sơ pháp lý không hợp lệ');
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 25)));
        $where = $status === '' ? '' : ' WHERE p.status = ?';
        $params = $status === '' ? [] : [$status];
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM host_legal_profiles p' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $this->pdo->prepare('SELECT p.*, u.full_name AS host_name, u.email AS host_email FROM host_legal_profiles p JOIN users u ON u.user_id = p.host_id' . $where . ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?');
        foreach ($params as $index => $value) $stmt->bindValue($index + 1, $value, PDO::PARAM_STR);
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, ($page - 1) * $limit, PDO::PARAM_INT);
        $stmt->execute();
        return ['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'pagination' => ['page' => $page, 'limit' => $limit, 'total_items' => $total, 'total_pages' => $total ? (int) ceil($total / $limit) : 0]];
    }
    public function decideLegalProfile(int $hostId, int $adminId, bool $verified, string $reason): array
    {
        $reason = trim($reason);
        if (!$verified && $reason === '') throw new ApiException(400, 'rejection_reason_required', 'Cần ghi lý do từ chối');
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT status FROM host_legal_profiles WHERE host_id = ? FOR UPDATE');
            $stmt->execute([$hostId]);
            $status = $stmt->fetchColumn();
            if ($status === false) throw new ApiException(404, 'legal_profile_not_found', 'Không tìm thấy hồ sơ pháp lý');
            if ($status !== 'submitted') throw new ApiException(409, 'legal_profile_not_submitted', 'Chỉ hồ sơ đã gửi mới được xét duyệt');
            $next = $verified ? 'verified' : 'rejected';
            $update = $this->pdo->prepare('UPDATE host_legal_profiles SET status = ?, decision_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE host_id = ?');
            $update->execute([$next, $reason ?: null, $adminId, $hostId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'host_legal_profiles', ?, ?)");
            $audit->execute([$adminId, 'host_legal_profile_' . $next, $hostId, json_encode(['reason' => $reason], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
            $this->pdo->commit();
            return $this->legalProfile($hostId) ?? [];
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }
    public function updateLegalProfile(int $hostId, array $data): array
    {
        $allowed = ['entity_type','legal_name','tax_id','legal_address','representative_name','representative_title','contact_email','contact_phone'];
        if ($data === [] || array_diff(array_keys($data), $allowed) !== []) throw new ApiException(400, 'invalid_legal_profile', 'Payload hồ sơ pháp lý rỗng hoặc có field không hỗ trợ');
        foreach ($data as $value) {
            if ($value !== null && !is_scalar($value)) throw new ApiException(400, 'invalid_legal_profile', 'Các trường hồ sơ pháp lý phải là giá trị đơn');
        }
        $current = $this->legalProfile($hostId) ?? [];
        $profile = array_replace(['entity_type' => 'individual', 'legal_name' => '', 'tax_id' => null, 'legal_address' => '', 'representative_name' => null, 'representative_title' => null, 'contact_email' => '', 'contact_phone' => ''], $current, $data);
        if (!in_array($profile['entity_type'], ['individual','company'], true) || trim((string) $profile['legal_name']) === '' || strlen((string) $profile['legal_name']) > 180 || trim((string) $profile['legal_address']) === '' || strlen((string) $profile['legal_address']) > 255 || !filter_var($profile['contact_email'], FILTER_VALIDATE_EMAIL) || strlen((string) $profile['contact_email']) > 150 || trim((string) $profile['contact_phone']) === '' || strlen((string) $profile['contact_phone']) > 20) throw new ApiException(400, 'invalid_legal_profile', 'Thông tin pháp lý bắt buộc chưa hợp lệ');
        if ($profile['entity_type'] === 'company' && (trim((string) $profile['tax_id']) === '' || trim((string) $profile['representative_name']) === '')) throw new ApiException(400, 'company_details_required', 'Hồ sơ doanh nghiệp cần mã số thuế và người đại diện');
        $profile['status'] = 'submitted';
        $stmt = $this->pdo->prepare('INSERT INTO host_legal_profiles (host_id, entity_type, legal_name, tax_id, legal_address, representative_name, representative_title, contact_email, contact_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE entity_type = VALUES(entity_type), legal_name = VALUES(legal_name), tax_id = VALUES(tax_id), legal_address = VALUES(legal_address), representative_name = VALUES(representative_name), representative_title = VALUES(representative_title), contact_email = VALUES(contact_email), contact_phone = VALUES(contact_phone), status = \'submitted\', decision_reason = NULL, reviewed_by = NULL, reviewed_at = NULL');
        $stmt->execute([$hostId, $profile['entity_type'], trim((string) $profile['legal_name']), $profile['tax_id'] ?: null, trim((string) $profile['legal_address']), $profile['representative_name'] ?: null, $profile['representative_title'] ?: null, strtolower(trim((string) $profile['contact_email'])), trim((string) $profile['contact_phone']), 'submitted']);
        $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'host_legal_profile_submitted', 'host_legal_profiles', ?, JSON_OBJECT('entity_type', ?))");
        $audit->execute([$hostId, $hostId, $profile['entity_type']]);
        return $this->legalProfile($hostId) ?? [];
    }
    public function listContracts(int $hostId): array
    {
        $stmt = $this->pdo->prepare('SELECT c.contract_id, c.studio_id, s.name AS studio_name, c.contract_code, c.title, c.status, c.effective_from, c.effective_to, c.document_name, c.created_at, c.updated_at, (c.document_storage_key IS NOT NULL) AS document_available FROM host_contracts c JOIN studios s ON s.studio_id = c.studio_id WHERE c.host_id = ? ORDER BY c.created_at DESC');
        $stmt->execute([$hostId]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function contract(int $hostId, int $contractId): array
    {
        $stmt = $this->pdo->prepare('SELECT c.contract_id, c.host_id, c.studio_id, s.name AS studio_name, c.contract_code, c.title, c.status, c.effective_from, c.effective_to, c.document_name, c.created_at, c.updated_at, (c.document_storage_key IS NOT NULL) AS document_available FROM host_contracts c JOIN studios s ON s.studio_id = c.studio_id WHERE c.contract_id = ? AND c.host_id = ?');
        $stmt->execute([$contractId, $hostId]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new ApiException(404, 'contract_not_found', 'Không tìm thấy hợp đồng thuộc tài khoản này');
        return $row;
    }
    public function createContract(int $adminId, int $studioId, array $data, array $file): array
    {
        $code = trim((string) ($data['contract_code'] ?? '')); $title = trim((string) ($data['title'] ?? ''));
        $status = (string) ($data['status'] ?? 'draft'); $from = $this->dateOrNull($data['effective_from'] ?? null); $to = $this->dateOrNull($data['effective_to'] ?? null);
        if ($code === '' || strlen($code) > 80 || $title === '' || strlen($title) > 180 || !in_array($status, ['draft','pending','active'], true) || ($from && $to && $to < $from)) throw new ApiException(400, 'invalid_contract', 'Thông tin hợp đồng hoặc thời hạn không hợp lệ');
        $studio = $this->pdo->prepare('SELECT host_id FROM studios WHERE studio_id = ?'); $studio->execute([$studioId]); $hostId = $studio->fetchColumn();
        if ($hostId === false) throw new ApiException(404, 'studio_not_found', 'Không tìm thấy Studio');
        $tmp = (string) ($file['tmp_name'] ?? ''); $size = (int) ($file['size'] ?? 0);
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || $size < 1 || $size > 2 * 1024 * 1024 || !is_file($tmp)) throw new ApiException(400, 'invalid_contract_document', 'Cần tệp PDF hợp lệ tối đa 2 MiB');
        $finfo = new \finfo(FILEINFO_MIME_TYPE); if ($finfo->file($tmp) !== 'application/pdf') throw new ApiException(400, 'invalid_contract_document', 'Tài liệu hợp đồng phải là PDF');
        $name = basename(str_replace('\\', '/', (string) ($file['name'] ?? 'contract.pdf')));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?: 'contract.pdf';
        $name = substr($name, 0, 255); $key = bin2hex(random_bytes(32)); $path = $this->pathFor($key);
        if (!is_dir($this->storage) && !mkdir($this->storage, 0750, true) && !is_dir($this->storage)) throw new ApiException(500, 'contract_storage_unavailable', 'Không thể lưu tài liệu hợp đồng');
        $moved = is_uploaded_file($tmp) ? move_uploaded_file($tmp, $path) : copy($tmp, $path);
        if (!$moved) throw new ApiException(500, 'contract_storage_unavailable', 'Không thể lưu tài liệu hợp đồng'); chmod($path, 0640);
        try {
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('INSERT INTO host_contracts (host_id, studio_id, contract_code, title, status, effective_from, effective_to, document_storage_key, document_name, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([(int) $hostId, $studioId, $code, $title, $status, $from, $to, $key, $name, $adminId]);
            $id = (int) $this->pdo->lastInsertId();
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'host_contract_created', 'host_contracts', ?, JSON_OBJECT('studio_id', ?, 'status', ?))"); $audit->execute([$adminId, $id, $studioId, $status]);
            $this->pdo->commit();
            return $this->contract((int) $hostId, $id);
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); @unlink($path); throw $error; }
    }
    public function grantDocumentAccess(int $hostId, int $contractId): array
    {
        $contract = $this->contract($hostId, $contractId);
        if ($contract['status'] !== 'active') throw new ApiException(409, 'contract_not_active', 'Tài liệu chỉ được cấp cho hợp đồng đang hoạt động');
        $stmt = $this->pdo->prepare('SELECT document_storage_key FROM host_contracts WHERE contract_id = ?'); $stmt->execute([$contractId]); $key = $stmt->fetchColumn();
        if (!is_string($key) || !is_file($this->pathFor($key))) throw new ApiException(404, 'contract_document_missing', 'Tài liệu hợp đồng chưa được lưu');
        $token = bin2hex(random_bytes(32));
        $insert = $this->pdo->prepare('INSERT INTO contract_document_access_grants (contract_id, host_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))'); $insert->execute([$contractId, $hostId, hash('sha256', $token)]);
        $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'contract_document_access_granted', 'host_contracts', ?, JSON_OBJECT('expires_in_seconds', 300))"); $audit->execute([$hostId, $contractId]);
        return ['contract_id' => $contractId, 'access_url' => '/api/host/contracts/' . $contractId . '/documents/' . $token, 'expires_in_seconds' => 300];
    }
    public function redeemDocument(int $hostId, int $contractId, string $token): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) throw new ApiException(404, 'contract_document_access_denied', 'Quyền truy cập tài liệu không hợp lệ');
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT g.grant_id, c.document_storage_key, c.document_name FROM contract_document_access_grants g JOIN host_contracts c ON c.contract_id = g.contract_id WHERE g.contract_id = ? AND g.host_id = ? AND g.token_hash = ? AND g.used_at IS NULL AND g.expires_at > NOW() FOR UPDATE');
            $stmt->execute([$contractId, $hostId, hash('sha256', $token)]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || !is_file($this->pathFor((string) $row['document_storage_key']))) throw new ApiException(404, 'contract_document_access_denied', 'Quyền truy cập đã hết hạn hoặc tài liệu không còn tồn tại');
            $update = $this->pdo->prepare('UPDATE contract_document_access_grants SET used_at = NOW() WHERE grant_id = ?'); $update->execute([(int) $row['grant_id']]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'contract_document_downloaded', 'host_contracts', ?, JSON_OBJECT('access', 'one_time'))"); $audit->execute([$hostId, $contractId]);
            $this->pdo->commit();
            return ['path' => $this->pathFor((string) $row['document_storage_key']), 'name' => $row['document_name']];
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); throw $error; }
    }
    private function dateOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') return null;
        if (!is_string($value) && !is_int($value)) throw new ApiException(400, 'invalid_date', 'Ngày hợp đồng phải theo định dạng YYYY-MM-DD');
        $date = trim((string) $value); $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new ApiException(400, 'invalid_date', 'Ngày hợp đồng phải theo định dạng YYYY-MM-DD');
        return $date;
    }
    private function pathFor(string $key): string
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $key)) throw new ApiException(404, 'contract_document_missing', 'Tài liệu hợp đồng không tồn tại');
        return rtrim($this->storage, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $key;
    }
}
