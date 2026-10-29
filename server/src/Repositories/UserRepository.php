<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

class UserRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Find a user by their email address including role information.
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT u.user_id, u.role_id, r.role_name AS role, u.full_name, u.email,
                   u.password_hash, u.phone, u.avatar_url, u.status, u.created_at, u.updated_at
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.email = ?
            LIMIT 1
        ');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user ?: null;
    }

    /**
     * Find a user by ID including role information.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT u.user_id, u.role_id, r.role_name AS role, u.full_name, u.email,
                   u.password_hash, u.phone, u.avatar_url, u.status, u.created_at, u.updated_at
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = ?
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user ?: null;
    }

    /**
     * Check if an email is already registered.
     */
    public function isEmailTaken(string $email, ?int $excludeUserId = null): bool
    {
        if ($excludeUserId !== null) {
            $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE email = ? AND user_id <> ? LIMIT 1');
            $stmt->execute([$email, $excludeUserId]);
        } else {
            $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
        }

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Create a new user record.
     *
     * @param array{role_id: int, full_name: string, email: string, password_hash: string, phone: ?string, avatar_url: ?string, status: string} $data
     * @return int Inserted user_id
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO users (role_id, full_name, email, password_hash, phone, avatar_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $stmt->execute([
            $data['role_id'],
            $data['full_name'],
            $data['email'],
            $data['password_hash'],
            $data['phone'] ?? null,
            $data['avatar_url'] ?? null,
            $data['status'] ?? 'active',
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update fields of a user record.
     */
    public function update(int $id, array $data): bool
    {
        $allowedFields = ['full_name', 'phone', 'avatar_url', 'password_hash', 'status', 'role_id'];
        $fieldsToUpdate = [];
        $params = [];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fieldsToUpdate)) {
            return false;
        }

        $params[] = $id;
        $sql = 'UPDATE users SET ' . implode(', ', $fieldsToUpdate) . ' WHERE user_id = ?';
        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute($params);
    }

    /**
     * Find role ID by role name
     */
    public function findRoleIdByName(string $roleName): ?int
    {
        $stmt = $this->pdo->prepare('SELECT role_id FROM roles WHERE role_name = ? LIMIT 1');
        $stmt->execute([$roleName]);
        $id = $stmt->fetchColumn();
        return $id !== false ? (int) $id : null;
    }

    /**
     * List users with filtering and pagination
     */
    public function listUsers(array $filters, int $page = 1, int $limit = 12): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['role'])) {
            $where[] = 'r.role_name = :role';
            $params['role'] = $filters['role'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'u.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(u.full_name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $whereSql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            {$whereSql}
        ");
        $countStmt->execute($params);
        $totalItems = (int) $countStmt->fetchColumn();

        $offset = ($page - 1) * $limit;
        $totalPages = $totalItems > 0 ? (int) ceil($totalItems / $limit) : 1;

        $stmt = $this->pdo->prepare("
            SELECT u.user_id, u.role_id, r.role_name AS role, u.full_name, u.email,
                   u.phone, u.avatar_url, u.status, u.created_at, u.updated_at
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            {$whereSql}
            ORDER BY u.user_id ASC
            LIMIT :limit OFFSET :offset
        ");

        foreach ($params as $k => $v) {
            $stmt->bindValue(":{$k}", $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items'       => $items,
            'total_items' => $totalItems,
            'total_pages' => $totalPages,
            'page'        => $page,
            'limit'       => $limit,
        ];
    }
}
