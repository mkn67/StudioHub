<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Persistence;

use PDO;
use PDOException;
use LogicException;
use Throwable;
use StudioHub\Helpdesk\{Config, Failure, Util};

/**
 * Lớp lưu trữ dữ liệu (persistence) cho Helpdesk.
 *
 * - Hỗ trợ hai hệ CSDL: SQLite (mặc định) và MySQL.
 * - Mọi bản ghi được lưu dạng JSON trong cột `payload`, kèm thời điểm hết hạn `expires`
 *   (Unix timestamp) để job dọn dẹp (`prune`) xoá dữ liệu cũ.
 */
final class Store
{
    /** Danh sách bảng được phép thao tác (whitelist chống SQL injection qua tên bảng). */
    private const ALLOWED_TABLES = [
        'helpdesk_conversations',
        'helpdesk_tickets',
        'helpdesk_records',
    ];

    /** Danh sách cột được phép ghi (whitelist chống SQL injection qua tên cột). */
    private const ALLOWED_COLUMNS = [
        'id', 'payload', 'expires', 'owner', 'conversation_id', 'proposal_id', 'kind',
    ];

    /** Kết nối PDO, chỉ đọc sau khi khởi tạo. */
    public readonly PDO $db;

    /** Cờ đánh dấu đang ở trong một transaction (để hỗ trợ gọi lồng nhau). */
    private bool $transaction = false;

    public function __construct(private Config $config)
    {
        $dsn = $this->resolveDsn();

        try {
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Lỗi SQL ném ra exception
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Mặc định trả về mảng kết hợp
            ];
            if (str_starts_with($dsn, 'mysql:')) {
                $sslCa = $config->get('HELPDESK_DB_SSL_CA');
                if ($sslCa === '' || !is_file($sslCa) || !is_readable($sslCa)) {
                    throw new Failure('invalid_storage_configuration', 503);
                }
                $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
            }
            $this->db = new PDO(
                $dsn,
                $config->get('HELPDESK_DB_USER'),
                $config->get('HELPDESK_DB_PASSWORD'),
                $options
            );

            if ($this->driver() === 'sqlite') {
                // Chờ tối đa 5 giây nếu DB đang bị khoá, thay vì báo lỗi ngay
                $this->db->exec('PRAGMA busy_timeout=5000');
            } else {
                // MySQL: cố định múi giờ phiên làm việc là GMT+7 (giờ Việt Nam)
                $this->db->exec("SET time_zone = '+07:00'");
            }
        } catch (PDOException) {
            // Không lộ chi tiết lỗi kết nối ra bên ngoài
            throw new Failure('storage_unavailable', 503);
        }
    }

    /**
     * Xác định chuỗi DSN cuối cùng từ cấu hình.
     * - Với SQLite dùng đường dẫn tương đối: chuyển thành đường dẫn tuyệt đối theo thư mục dự án.
     * - Chỉ chấp nhận driver `sqlite:` hoặc `mysql:`.
     */
    private function resolveDsn(): string
    {
        $dsn = $this->config->get('HELPDESK_DATABASE_URL');
        if ($dsn === '') {
            $host = $this->config->get('HELPDESK_DB_HOST');
            if ($host !== '') {
                $port = $this->config->get('HELPDESK_DB_PORT', '3306');
                $database = $this->config->get('HELPDESK_DB_NAME');
                if (!preg_match('/^[A-Za-z0-9.-]+$/D', $host)
                    || !ctype_digit($port)
                    || (int) $port < 1
                    || (int) $port > 65535
                    || !preg_match('/^[A-Za-z0-9_$-]+$/D', $database)
                ) {
                    throw new Failure('invalid_storage_configuration', 503);
                }

                $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            } else {
                $dsn = 'sqlite:var/helpdesk.sqlite';
            }
        }

        if (str_starts_with($dsn, 'sqlite:')) {
            $target = substr($dsn, 7);

            $isMemory   = $target === ':memory:';
            // Đường dẫn tuyệt đối: dạng Windows (C:...) hoặc Unix (/...)
            $isAbsolute = (bool) preg_match('~^(?:[A-Za-z]:|/)~', $target);

            if (!$isMemory && !$isAbsolute) {
                $dsn = 'sqlite:' . $this->config->path($target);
            }
        }

        if (!str_starts_with($dsn, 'sqlite:') && !str_starts_with($dsn, 'mysql:')) {
            throw new Failure('invalid_storage_configuration', 503);
        }

        return $dsn;
    }

    /** Trả về tên driver đang dùng ('sqlite' hoặc 'mysql'). */
    public function driver(): string
    {
        return $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
    }

    /** Chạy file migration SQL tương ứng với driver hiện tại. */
    public function migrate(): void
    {
        $isMysql = $this->driver() === 'mysql';
        if ($isMysql && (int) $this->db->query("SELECT GET_LOCK('studiohub_helpdesk_migrations', 10)")->fetchColumn() !== 1) {
            throw new Failure('storage_unavailable', 503);
        }

        try {
            $migration = file_get_contents($this->config->path('database/migrations/' . $this->driver() . '.sql'));
            if ($migration === false || trim($migration) === '') {
                throw new Failure('invalid_storage_configuration', 503);
            }
            $this->db->exec($migration);
        } finally {
            if ($isMysql) {
                $this->db->query("SELECT RELEASE_LOCK('studiohub_helpdesk_migrations')");
            }
        }
    }

    /**
     * Chạy $callback trong một transaction.
     *
     * - Nếu đã ở trong transaction thì chạy thẳng callback (không mở transaction lồng).
     * - SQLite dùng `BEGIN IMMEDIATE` để giành khoá ghi ngay từ đầu, tránh deadlock/đọc-rồi-ghi xung đột.
     * - Có lỗi thì ROLLBACK và ném lại exception; thành công thì COMMIT.
     */
    public function transaction(callable $callback): mixed
    {
        if ($this->transaction) {
            return $callback();
        }

        $isSqlite = $this->driver() === 'sqlite';

        if ($isSqlite) {
            $this->db->exec('BEGIN IMMEDIATE');
        } else {
            $this->db->beginTransaction();
        }
        $this->transaction = true;

        try {
            $result = $callback();

            if ($isSqlite) {
                $this->db->exec('COMMIT');
            } else {
                $this->db->commit();
            }

            return $result;
        } catch (Throwable $e) {
            if ($isSqlite) {
                $this->db->exec('ROLLBACK');
            } elseif ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        } finally {
            $this->transaction = false;
        }
    }

    /**
     * Lấy một bản ghi theo id.
     * Trong transaction trên MySQL sẽ thêm `FOR UPDATE` để khoá dòng, tránh race condition.
     *
     * @return array<string, mixed>|null  Trả về null nếu không tìm thấy.
     */
    public function get(string $table, string $id): ?array
    {
        $table = $this->table($table);

        $sql = "SELECT * FROM $table WHERE id = ?";
        if ($this->transaction && $this->driver() === 'mysql') {
            $sql .= ' FOR UPDATE';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    /**
     * Thêm mới hoặc cập nhật (upsert) một bản ghi.
     *
     * @param array<string, mixed> $payload  Dữ liệu chính, được lưu dạng JSON.
     * @param array<string, mixed> $extra    Các cột phụ (owner, kind, conversation_id, ...).
     */
    public function put(string $table, string $id, array $payload, array $extra = []): void
    {
        $table = $this->table($table);

        // Thời gian lưu giữ mặc định: 24 giờ (cấu hình được trong khoảng 1–720 giờ)
        $retentionHours = $this->config->int('HELPDESK_RETENTION_HOURS', 24, 1, 720);

        $row = [
            'id'      => $id,
            'payload' => Util::json($payload),
            'expires' => time() + $retentionHours * 3600,
        ] + $extra; // Lưu ý: khoá bên trái luôn được ưu tiên hơn $extra

        // Riêng hội thoại: nếu payload có `expiresAt` thì dùng đúng thời điểm đó
        if ($table === 'helpdesk_conversations' && isset($payload['expiresAt'])) {
            $row['expires'] = (int) strtotime($payload['expiresAt']);
        }

        // Chặn tên cột lạ (phòng ngừa SQL injection qua khoá của mảng $extra)
        if (array_diff(array_keys($row), self::ALLOWED_COLUMNS)) {
            throw new LogicException('Invalid storage column');
        }

        $isSqlite = $this->driver() === 'sqlite';
        $columns  = array_keys($row);

        $names = implode(',', $columns);
        $marks = implode(',', array_fill(0, count($columns), '?'));

        // Phần cập nhật khi trùng id (mọi cột trừ `id`); cú pháp khác nhau giữa SQLite và MySQL
        $updates = implode(',', array_map(
            fn(string $c) => $isSqlite ? "$c=excluded.$c" : "$c=VALUES($c)",
            array_diff($columns, ['id'])
        ));

        $upsert = $isSqlite
            ? "ON CONFLICT(id) DO UPDATE SET $updates"
            : "ON DUPLICATE KEY UPDATE $updates";

        $sql = "INSERT INTO $table ($names) VALUES ($marks) $upsert";

        $this->db->prepare($sql)->execute(array_values($row));
    }

    /** Kiểm tra tên bảng nằm trong whitelist rồi trả lại chính tên đó. */
    private function table(string $name): string
    {
        if (!in_array($name, self::ALLOWED_TABLES, true)) {
            throw new LogicException('Invalid storage table');
        }

        return $name;
    }

    /**
     * Giới hạn tần suất (rate limit) theo từng phút cho một khoá $key.
     * Vượt quá $limit lượt/phút thì ném Failure 429.
     */
    public function rate(string $key, int $limit): void
    {
        $this->transaction(function () use ($key, $limit) {
            // Mỗi (khoá, phút) có một bản ghi bộ đếm riêng
            $id = 'rate:' . hash('sha256', $key) . ':' . (int) floor(time() / 60);

            $record = $this->get('helpdesk_records', $id);
            $count  = $record ? (int) json_decode($record['payload'], true)['count'] : 0;

            if ($count >= $limit) {
                throw new Failure('rate_limited', 429);
            }

            $this->put('helpdesk_records', $id, ['count' => $count + 1], ['kind' => 'rate']);
        });
    }

    /** Ghi lại vết (trace) của một lần chạy agent để phục vụ gỡ lỗi/audit. */
    public function trace(string $conversationId, array $metadata): void
    {
        $this->put(
            'helpdesk_records',
            Util::id(),
            ['conversationId' => $conversationId, 'at' => Util::now()] + $metadata,
            ['kind' => 'agent_run']
        );
    }

    /**
     * Xoá toàn bộ bản ghi đã hết hạn ở các bảng.
     *
     * @return int Tổng số dòng đã xoá.
     */
    public function prune(): int
    {
        return $this->transaction(function () {
            $deleted = 0;

            foreach (['helpdesk_tickets', 'helpdesk_conversations', 'helpdesk_records'] as $table) {
                $stmt = $this->db->prepare("DELETE FROM $table WHERE expires < ?");
                $stmt->execute([time()]);
                $deleted += $stmt->rowCount();
            }

            return $deleted;
        });
    }

    /**
     * Lấy hàng đợi ticket còn hiệu lực (tối đa 50 ticket, sắp theo thời hạn giảm dần).
     *
     * @return array<int, array<string, mixed>>
     */
    public function ticketQueue(): array
    {
        $stmt = $this->db->prepare(
            'SELECT payload FROM helpdesk_tickets WHERE expires > ? ORDER BY expires DESC LIMIT 50'
        );
        $stmt->execute([time()]);

        return array_map(
            fn(array $row) => json_decode($row['payload'], true),
            $stmt->fetchAll()
        );
    }
}
