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
}

