<?php

declare(strict_types=1);

use StudioHub\Helpdesk\Persistence\Store;

/**
 * Script dòng lệnh: khởi tạo các bảng của helpdesk trong cơ sở dữ liệu.
 *
 * Cách dùng:
 *   php bin/migrate.php --apply
 *
 * Script có hai lớp bảo vệ để tránh chạy nhầm:
 *   1. Bắt buộc có cờ --apply (không có thì không làm gì cả).
 *   2. Với MySQL, chỉ chạy trên CSDL cô lập dành cho dev/test của Helpdesk.
 *
 * Mã thoát: 0 = thành công, 2 = bị từ chối (thiếu --apply hoặc CSDL không an toàn).
 */

$config = require dirname(__DIR__) . '/bootstrap.php';

// Lớp bảo vệ 1: phải yêu cầu tường minh bằng --apply.
if (!in_array('--apply', $argv, true)) {
    fwrite(STDERR, "Explicit initialization only: php bin/migrate.php --apply\n");
    exit(2);
}

$dsn = $config->get('HELPDESK_DATABASE_URL', 'sqlite:var/helpdesk.sqlite');

// Lớp bảo vệ 2: với MySQL, tên CSDL phải chứa "helpdesk" và kết thúc bằng "_dev" hoặc "_test"
// (ví dụ: studiohub_helpdesk_dev). Nhờ vậy không thể vô tình chạy lên CSDL nghiệp vụ hoặc production.
if (str_starts_with($dsn, 'mysql:')
    && !preg_match('/dbname=[A-Za-z0-9_]*helpdesk[A-Za-z0-9_]*_(dev|test)(?:;|$)/', $dsn)
) {
    fwrite(STDERR, "Refusing migration outside an isolated Helpdesk dev/test database.\n");
    exit(2);
}

// Chỉ tạo các bảng do Helpdesk sở hữu; không đụng tới schema nghiệp vụ.
(new Store($config))->migrate();

echo "Helpdesk-owned tables initialized; no business schema touched.\n";