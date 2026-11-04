<?php

declare(strict_types=1);

namespace App\Modules\Account;

use App\Core\Db;
use App\Exceptions\ApiException;
use App\Modules\Rooms\UploadService;
use PDO;
use PDOException;
use Throwable;

class AccountService
{
    private PDO $pdo;
    private string $identityStorage;

    public function __construct(?PDO $pdo = null, ?string $identityStorage = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $configured = $_ENV['PRIVATE_IDENTITY_STORAGE'] ?? getenv('PRIVATE_IDENTITY_STORAGE');
        $this->identityStorage = $identityStorage ?? (is_string($configured) && $configured !== '' ? $configured : dirname(__DIR__, 3) . '/storage/private-identities');
    }

    public function requestEmailChange(int $userId, array $input): array
    {
        $email = strtolower(trim((string) ($input['new_email'] ?? '')));
        $password = (string) ($input['current_password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150 || $password === '') {
            throw new ApiException(400, 'validation_failed', 'Email mới hợp lệ và mật khẩu hiện tại là bắt buộc');
        }
        $user = $this->user($userId);
        if (!password_verify($password, (string) $user['password_hash'])) {
            throw new ApiException(400, 'invalid_current_password', 'Mật khẩu hiện tại không chính xác');
        }
        if (strcasecmp((string) $user['email'], $email) === 0) {
            throw new ApiException(400, 'same_email', 'Email mới phải khác email hiện tại');
        }
        $check = $this->pdo->prepare('SELECT 1 FROM users WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetchColumn()) {
            throw new ApiException(409, 'email_already_exists', 'Email này đã được sử dụng');
        }

        $code = (string) random_int(100000, 999999);
        $tokenHash = hash('sha256', $code);
        try {
            $this->pdo->beginTransaction();
            $invalidate = $this->pdo->prepare('UPDATE email_change_requests SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL');
            $invalidate->execute([$userId]);
            $insert = $this->pdo->prepare('INSERT INTO email_change_requests (user_id, old_email, new_email, token_hash, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))');
            $insert->execute([$userId, $user['email'], $email, $tokenHash]);
            $requestId = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }

        $environment = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'dev';
        if (in_array($environment, ['dev', 'test'], true)) {
            return ['request_id' => $requestId, 'email' => $email, 'expires_in_seconds' => 900, 'development_code' => $code];
        }
        $from = (string) ($_ENV['EMAIL_FROM'] ?? getenv('EMAIL_FROM') ?: 'no-reply@studiohub.local');
        $sent = function_exists('mail') && @mail($email, 'Xác nhận đổi email StudioHub', "Mã xác nhận của bạn là {$code}. Mã hết hạn sau 15 phút.", 'From: ' . $from);
        if (!$sent) {
            $revoke = $this->pdo->prepare('UPDATE email_change_requests SET consumed_at = NOW() WHERE request_id = ?');
            $revoke->execute([$requestId]);
            throw new ApiException(503, 'email_delivery_unavailable', 'Không gửi được mã xác nhận. Vui lòng thử lại sau');
        }
        return ['request_id' => $requestId, 'email' => $email, 'expires_in_seconds' => 900];
    }

    public function confirmEmailChange(int $userId, array $input): array
    {
        $email = strtolower(trim((string) ($input['new_email'] ?? '')));
        $code = trim((string) ($input['code'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^\d{6}$/', $code)) {
            throw new ApiException(400, 'validation_failed', 'new_email hoặc mã xác nhận không hợp lệ');
        }
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM email_change_requests WHERE user_id = ? AND new_email = ? AND consumed_at IS NULL AND expires_at > NOW() ORDER BY request_id DESC LIMIT 1 FOR UPDATE');
            $stmt->execute([$userId, $email]);
            $request = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$request || !hash_equals((string) $request['token_hash'], hash('sha256', $code))) {
                throw new ApiException(400, 'invalid_or_expired_code', 'Mã xác nhận không đúng hoặc đã hết hạn');
            }
            $update = $this->pdo->prepare('UPDATE users SET email = ?, updated_at = NOW() WHERE user_id = ? AND email = ?');
            $update->execute([$email, $userId, $request['old_email']]);
            if ($update->rowCount() !== 1) {
                throw new ApiException(409, 'email_changed_concurrently', 'Email tài khoản đã thay đổi. Hãy gửi yêu cầu mới');
            }
            $consume = $this->pdo->prepare('UPDATE email_change_requests SET consumed_at = NOW() WHERE request_id = ?');
            $consume->execute([(int) $request['request_id']]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'account_email_changed', 'users', ?, ?)");
            $audit->execute([$userId, $userId, json_encode(['old_email' => $request['old_email'], 'new_email' => $email], JSON_THROW_ON_ERROR)]);
            $this->pdo->commit();
        } catch (PDOException $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            if ((string) ($error->errorInfo[0] ?? '') === '23000') {
                throw new ApiException(409, 'email_already_exists', 'Email này đã được sử dụng');
            }
            throw $error;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
        return ['user_id' => $userId, 'email' => $email];
    }

    public function uploadAvatar(int $userId, array $file): array
    {
        $url = UploadService::uploadImage($file, 'avatars');
        try {
            $stmt = $this->pdo->prepare('SELECT avatar_url FROM users WHERE user_id = ?');
            $stmt->execute([$userId]);
            $oldUrl = $stmt->fetchColumn();
            if ($oldUrl === false) throw new ApiException(404, 'user_not_found', 'Tài khoản không tồn tại');
            $update = $this->pdo->prepare('UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE user_id = ?');
            $update->execute([$url, $userId]);
            $this->deletePublicUpload(is_string($oldUrl) ? $oldUrl : null, 'avatars');
        } catch (Throwable $error) {
            $this->deletePublicUpload($url, 'avatars');
            throw $error;
        }
        return ['avatar_url' => $url];
    }

    public function notificationPreferences(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT email_booking_updates, email_product_updates, sms_booking_updates, in_app_updates, updated_at FROM account_notification_preferences WHERE user_id = ?');
        $stmt->execute([$userId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['email_booking_updates' => 1, 'email_product_updates' => 0, 'sms_booking_updates' => 0, 'in_app_updates' => 1, 'updated_at' => null];
        foreach (['email_booking_updates', 'email_product_updates', 'sms_booking_updates', 'in_app_updates'] as $field) $data[$field] = (bool) $data[$field];
        return $data;
    }

    public function updateNotificationPreferences(int $userId, array $input): array
    {
        $allowed = ['email_booking_updates', 'email_product_updates', 'sms_booking_updates', 'in_app_updates'];
        if ($input === [] || array_diff(array_keys($input), $allowed) !== []) throw new ApiException(400, 'invalid_preferences', 'Payload tùy chọn thông báo rỗng hoặc có field không hỗ trợ');
        foreach ($input as $value) if (!is_bool($value)) throw new ApiException(400, 'invalid_preferences', 'Các tùy chọn thông báo phải là true/false');
        $current = $this->notificationPreferences($userId);
        $merged = array_replace(array_intersect_key($current, array_flip($allowed)), $input);
        $stmt = $this->pdo->prepare('INSERT INTO account_notification_preferences (user_id, email_booking_updates, email_product_updates, sms_booking_updates, in_app_updates) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email_booking_updates = VALUES(email_booking_updates), email_product_updates = VALUES(email_product_updates), sms_booking_updates = VALUES(sms_booking_updates), in_app_updates = VALUES(in_app_updates)');
        $stmt->execute([$userId, (int) $merged['email_booking_updates'], (int) $merged['email_product_updates'], (int) $merged['sms_booking_updates'], (int) $merged['in_app_updates']]);
        return $this->notificationPreferences($userId);
    }

    public function identityVerification(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT verification_id, legal_name, document_type, CONCAT("••••", document_last4) AS document_hint, status, decision_reason, submitted_at, reviewed_at FROM identity_verifications WHERE user_id = ? ORDER BY verification_id DESC LIMIT 1');
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function submitIdentityVerification(int $userId, array $input, array $file): array
    {
        $legalName = trim((string) ($input['legal_name'] ?? ''));
        $type = (string) ($input['document_type'] ?? '');
        $last4 = preg_replace('/\s+/', '', (string) ($input['document_last4'] ?? ''));
        if ($legalName === '' || strlen($legalName) > 150 || !in_array($type, ['national_id', 'passport', 'business_registration'], true) || !preg_match('/^[A-Za-z0-9]{4}$/', (string) $last4)) {
            throw new ApiException(400, 'validation_failed', 'Cần họ tên pháp lý, loại giấy tờ hợp lệ và 4 ký tự cuối của giấy tờ');
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !isset($file['tmp_name'], $file['name'], $file['size']) || (int) $file['size'] < 1 || (int) $file['size'] > 5 * 1024 * 1024 || !is_file((string) $file['tmp_name'])) throw new ApiException(400, 'invalid_document', 'Cần ảnh/PDF giấy tờ xác minh tối đa 5 MiB');
        $finfo = new \finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file((string) $file['tmp_name']);
        if (!in_array($mime, ['application/pdf','image/jpeg','image/png'], true)) throw new ApiException(400, 'invalid_document', 'Giấy tờ phải là PDF, JPG hoặc PNG');
        if (!is_dir($this->identityStorage) && !mkdir($this->identityStorage, 0750, true) && !is_dir($this->identityStorage)) throw new ApiException(500, 'identity_storage_unavailable', 'Không thể lưu tài liệu xác minh riêng tư');
        $storageKey = bin2hex(random_bytes(32)); $destination = rtrim($this->identityStorage, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $storageKey;
        $moved = is_uploaded_file((string) $file['tmp_name']) ? move_uploaded_file((string) $file['tmp_name'], $destination) : copy((string) $file['tmp_name'], $destination);
        if (!$moved) throw new ApiException(500, 'identity_storage_unavailable', 'Không thể lưu tài liệu xác minh riêng tư'); chmod($destination, 0640);
        $documentName = basename(str_replace('\\', '/', (string) $file['name']));
        $documentName = substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $documentName) ?: 'identity-document', 0, 255);
        try {
            $this->pdo->beginTransaction();
            $lock = $this->pdo->prepare('SELECT user_id FROM users WHERE user_id = ? FOR UPDATE');
            $lock->execute([$userId]);
            if (!$lock->fetchColumn()) throw new ApiException(404, 'user_not_found', 'Tài khoản không tồn tại');
            $existing = $this->pdo->prepare("SELECT verification_id FROM identity_verifications WHERE user_id = ? AND status IN ('pending','approved') LIMIT 1");
            $existing->execute([$userId]);
            if ($existing->fetchColumn()) throw new ApiException(409, 'verification_already_submitted', 'Đã có hồ sơ xác minh đang chờ hoặc đã được duyệt');
            $insert = $this->pdo->prepare("INSERT INTO identity_verifications (user_id, legal_name, document_type, document_last4, document_storage_key, document_name, document_mime, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
            $insert->execute([$userId, $legalName, $type, $last4, $storageKey, $documentName, $mime]);
            $id = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();
            return ['verification_id' => $id, 'status' => 'pending', 'document_hint' => '••••' . $last4];
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            @unlink($destination);
            throw $error;
        }
    }

    public function adminIdentityDocument(int $verificationId, int $adminId): array
    {
        $stmt = $this->pdo->prepare('SELECT document_storage_key, document_name, document_mime FROM identity_verifications WHERE verification_id = ?');
        $stmt->execute([$verificationId]); $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !preg_match('/^[a-f0-9]{64}$/', (string) $row['document_storage_key'])) throw new ApiException(404, 'identity_document_not_found', 'Không tìm thấy tài liệu xác minh');
        $path = rtrim($this->identityStorage, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $row['document_storage_key'];
        if (!is_file($path)) throw new ApiException(404, 'identity_document_not_found', 'Tài liệu xác minh không còn tồn tại');
        $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, 'identity_document_accessed', 'identity_verifications', ?, JSON_OBJECT('access', 'admin'))");
        $audit->execute([$adminId, $verificationId]);
        return ['path' => $path, 'name' => $row['document_name'], 'mime' => $row['document_mime']];
    }

    public function listIdentityVerifications(array $query): array
    {
        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '' && !in_array($status, ['pending', 'approved', 'rejected'], true)) throw new ApiException(400, 'invalid_status', 'Trạng thái xác minh không hợp lệ');
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 25)));
        $where = $status === '' ? '' : ' WHERE i.status = ?';
        $params = $status === '' ? [] : [$status];
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM identity_verifications i' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $this->pdo->prepare('SELECT i.verification_id, i.user_id, u.full_name AS account_name, u.email, i.legal_name, i.document_type, CONCAT("••••", i.document_last4) AS document_hint, i.status, i.decision_reason, i.submitted_at FROM identity_verifications i JOIN users u ON u.user_id = i.user_id' . $where . ' ORDER BY i.submitted_at DESC LIMIT ? OFFSET ?');
        foreach ($params as $idx => $value) $stmt->bindValue($idx + 1, $value, PDO::PARAM_STR);
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, ($page - 1) * $limit, PDO::PARAM_INT);
        $stmt->execute();
        return ['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'pagination' => ['page' => $page, 'limit' => $limit, 'total_items' => $total, 'total_pages' => $total ? (int) ceil($total / $limit) : 0]];
    }

    public function decideIdentity(int $verificationId, int $adminId, bool $approved, string $reason): array
    {
        $reason = trim($reason);
        if (!$approved && $reason === '') throw new ApiException(400, 'rejection_reason_required', 'Cần ghi lý do từ chối');
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM identity_verifications WHERE verification_id = ? FOR UPDATE');
            $stmt->execute([$verificationId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) throw new ApiException(404, 'verification_not_found', 'Không tìm thấy hồ sơ xác minh');
            if ($row['status'] !== 'pending') throw new ApiException(409, 'verification_already_decided', 'Hồ sơ xác minh đã được xử lý');
            $status = $approved ? 'approved' : 'rejected';
            $update = $this->pdo->prepare('UPDATE identity_verifications SET status = ?, decision_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE verification_id = ?');
            $update->execute([$status, $reason ?: null, $adminId, $verificationId]);
            $audit = $this->pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'identity_verifications', ?, ?)");
            $audit->execute([$adminId, 'identity_verification_' . $status, $verificationId, json_encode(['user_id' => (int) $row['user_id'], 'reason' => $reason], JSON_THROW_ON_ERROR)]);
            $this->pdo->commit();
            return ['verification_id' => $verificationId, 'status' => $status, 'reason' => $reason ?: null];
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    private function user(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT user_id, email, password_hash FROM users WHERE user_id = ? AND status = \'active\'');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) throw new ApiException(404, 'user_not_found', 'Tài khoản không tồn tại hoặc đã khóa');
        return $user;
    }

    private function deletePublicUpload(?string $url, string $directory): void
    {
        if ($url === null || !preg_match('#^/uploads/' . preg_quote($directory, '#') . '/[A-Za-z0-9_.-]+$#', $url)) return;
        $path = dirname(__DIR__, 3) . '/public' . $url;
        if (is_file($path)) @unlink($path);
    }
}
