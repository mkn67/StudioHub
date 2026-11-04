<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;
use Throwable;

class ProjectFileService
{
    private const MAX_FILE_BYTES = 104857600;
    private const ALLOWED_TYPES = [
        'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/x-wav' => 'wav',
        'audio/flac' => 'flac', 'audio/mp4' => 'm4a', 'video/mp4' => 'mp4',
        'application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png',
    ];

    private ProductionProjectRepository $projects;
    private ProjectFileRepository $files;
    private PDO $pdo;
    private string $storageDirectory;

    public function __construct(?PDO $pdo = null, ?string $storageDirectory = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
        $this->projects = new ProductionProjectRepository($this->pdo);
        $this->files = new ProjectFileRepository($this->pdo);
        $configured = $_ENV['PRIVATE_PROJECT_STORAGE'] ?? getenv('PRIVATE_PROJECT_STORAGE');
        $this->storageDirectory = $storageDirectory ?? (is_string($configured) && $configured !== ''
            ? $configured
            : dirname(__DIR__, 3) . '/storage/private-projects');
    }

    public function list(int $projectId, int $userId): array
    {
        $project = $this->requireProject($projectId, $userId);
        if ((int) $project['customer_id'] !== $userId && (int) $project['can_download_files'] !== 1) {
            throw new ApiException(403, 'forbidden', 'Bạn chưa được cấp quyền xem tệp dự án');
        }
        return $this->files->list($projectId);
    }

    public function upload(int $projectId, int $userId, array $upload): array
    {
        $project = $this->requireProject($projectId, $userId);
        if ((int) $project['customer_id'] !== $userId && (int) $project['can_manage_files'] !== 1) {
            throw new ApiException(403, 'forbidden', 'Bạn chưa được cấp quyền tải tệp lên dự án');
        }
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !isset($upload['tmp_name'], $upload['name'], $upload['size'])) {
            throw new ApiException(400, 'upload_failed', 'Không nhận được tệp hợp lệ');
        }
        $size = (int) $upload['size'];
        if ($size <= 0 || $size > self::MAX_FILE_BYTES || !is_file((string) $upload['tmp_name'])) {
            throw new ApiException(400, 'invalid_file_size', 'Tệp phải có dung lượng từ 1 byte đến 100 MiB');
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file((string) $upload['tmp_name']);
        if (!is_string($mime) || !isset(self::ALLOWED_TYPES[$mime])) {
            throw new ApiException(400, 'unsupported_file_type', 'Định dạng tệp này chưa được hỗ trợ');
        }
        $originalName = basename(str_replace('\\', '/', (string) $upload['name']));
        $originalName = preg_replace('/[\x00-\x1F\x7F]/u', '', $originalName) ?: 'private-file';
        $originalName = mb_substr($originalName, 0, 255);
        $storageKey = bin2hex(random_bytes(32));
        $destination = $this->pathFor($storageKey);
        if (!is_dir($this->storageDirectory) && !mkdir($this->storageDirectory, 0750, true) && !is_dir($this->storageDirectory)) {
            throw new ApiException(500, 'private_storage_unavailable', 'Không thể lưu tệp riêng tư');
        }
        chmod($this->storageDirectory, 0750);
        $moved = is_uploaded_file((string) $upload['tmp_name'])
            ? move_uploaded_file((string) $upload['tmp_name'], $destination)
            : copy((string) $upload['tmp_name'], $destination);
        if (!$moved) throw new ApiException(500, 'private_storage_unavailable', 'Không thể lưu tệp riêng tư');
        chmod($destination, 0640);
        $this->pdo->beginTransaction();
        try {
            $fileId = $this->files->insert([
                'project_id' => $projectId, 'uploaded_by' => $userId, 'storage_key' => $storageKey,
                'original_name' => $originalName, 'media_type' => $mime, 'file_size' => $size,
                'sha256' => hash_file('sha256', $destination),
            ]);
            $this->projects->auditAction($projectId, $userId, 'project_file_uploaded', ['file_id' => $fileId, 'bytes' => $size]);
            $this->pdo->commit();
            return ['file_id' => $fileId, 'file_name' => $originalName, 'media_type' => $mime, 'file_size' => $size];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            @unlink($destination);
            throw $exception;
        }
    }

    public function download(int $projectId, int $fileId, int $userId): array
    {
        $project = $this->requireProject($projectId, $userId);
        if ((int) $project['customer_id'] !== $userId && (int) $project['can_download_files'] !== 1) {
            throw new ApiException(403, 'forbidden', 'Bạn chưa được cấp quyền tải tệp dự án');
        }
        $file = $this->files->find($projectId, $fileId);
        if (!$file) throw new ApiException(404, 'file_not_found', 'Tệp không tồn tại');
        $path = $this->pathFor((string) $file['storage_key']);
        if (!is_file($path)) throw new ApiException(404, 'file_not_found', 'Tệp không còn khả dụng');
        $this->projects->auditAction($projectId, $userId, 'project_file_downloaded', ['file_id' => $fileId]);
        return ['path' => $path, 'file_name' => $file['original_name'], 'media_type' => $file['media_type'], 'file_size' => (int) $file['file_size']];
    }

    public function delete(int $projectId, int $fileId, int $userId): void
    {
        $project = $this->requireProject($projectId, $userId);
        $file = $this->files->find($projectId, $fileId);
        if (!$file) throw new ApiException(404, 'file_not_found', 'Tệp không tồn tại');
        $owner = (int) $project['customer_id'] === $userId;
        if (!$owner && (int) $project['can_manage_files'] !== 1 && (int) $file['uploaded_by'] !== $userId) {
            throw new ApiException(403, 'forbidden', 'Bạn chưa được cấp quyền xóa tệp này');
        }
        $this->pdo->beginTransaction();
        try {
            $this->files->softDelete($projectId, $fileId);
            $this->projects->auditAction($projectId, $userId, 'project_file_deleted', ['file_id' => $fileId]);
            $this->pdo->commit();
            @unlink($this->pathFor((string) $file['storage_key']));
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $exception;
        }
    }

    private function requireProject(int $projectId, int $userId): array
    {
        $project = $this->projects->access($projectId, $userId);
        if (!$project) throw new ApiException(404, 'project_not_found', 'Dự án không tồn tại');
        return $project;
    }

    private function pathFor(string $storageKey): string
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $storageKey)) throw new ApiException(404, 'file_not_found', 'Tệp không tồn tại');
        return rtrim($this->storageDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $storageKey;
    }
}
