<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$pdo = App\Core\Db::getConnection();
$pdo->beginTransaction();
try {
    foreach ([
        1 => ['admin', 'Quản trị viên toàn hệ thống'],
        2 => ['host', 'Chủ cơ sở studio'],
        3 => ['customer', 'Khách hàng thuê studio và thiết bị'],
    ] as $id => [$name, $description]) {
        $check = $pdo->prepare('SELECT role_name FROM roles WHERE role_id = ?');
        $check->execute([$id]);
        $existing = $check->fetchColumn();
        if ($existing !== false && $existing !== $name) {
            throw new RuntimeException("Role ID {$id} has an unexpected name; refusing to change existing roles.");
        }
        if ($existing === false) {
            $insert = $pdo->prepare('INSERT INTO roles (role_id, role_name, description) VALUES (?, ?, ?)');
            $insert->execute([$id, $name, $description]);
        }
    }

    $email = strtolower(trim((string) ($_ENV['BOOTSTRAP_ADMIN_EMAIL'] ?? getenv('BOOTSTRAP_ADMIN_EMAIL') ?: '')));
    $password = (string) ($_ENV['BOOTSTRAP_ADMIN_PASSWORD'] ?? getenv('BOOTSTRAP_ADMIN_PASSWORD') ?: '');
    if ($email !== '' || $password !== '') {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
            throw new RuntimeException('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters) must both be valid.');
        }
        $check = $pdo->prepare('SELECT user_id, role_id FROM users WHERE email = ?');
        $check->execute([$email]);
        $user = $check->fetch(PDO::FETCH_ASSOC);
        if ($user !== false && (int) $user['role_id'] !== 1) {
            throw new RuntimeException('Bootstrap admin email belongs to a non-admin account.');
        }
        if ($user === false) {
            $insert = $pdo->prepare("INSERT INTO users (role_id, full_name, email, password_hash, status) VALUES (1, ?, ?, ?, 'active')");
            $insert->execute(['StudioHub Admin', $email, password_hash($password, PASSWORD_BCRYPT)]);
            echo "Created initial admin account.\n";
        } else {
            echo "Admin account already exists; preserving its password.\n";
        }
    } else {
        echo "Roles ready; admin bootstrap credentials not configured.\n";
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}
