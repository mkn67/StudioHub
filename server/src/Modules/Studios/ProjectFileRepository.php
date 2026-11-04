<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use PDO;

class ProjectFileRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function insert(array $file): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO project_files (project_id, uploaded_by, storage_key, original_name, media_type, file_size, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$file['project_id'], $file['uploaded_by'], $file['storage_key'], $file['original_name'], $file['media_type'], $file['file_size'], $file['sha256']]);
        return (int) $this->pdo->lastInsertId();
    }

    public function list(int $projectId): array
    {
        $stmt = $this->pdo->prepare("SELECT file_id, original_name, media_type, file_size, sha256, created_at FROM project_files WHERE project_id = ? AND status = 'active' ORDER BY file_id DESC");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $projectId, int $fileId): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM project_files WHERE project_id = ? AND file_id = ? AND status = 'active'");
        $stmt->execute([$projectId, $fileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function softDelete(int $projectId, int $fileId): bool
    {
        $stmt = $this->pdo->prepare("UPDATE project_files SET status = 'deleted' WHERE project_id = ? AND file_id = ? AND status = 'active'");
        $stmt->execute([$projectId, $fileId]);
        return $stmt->rowCount() === 1;
    }
}
