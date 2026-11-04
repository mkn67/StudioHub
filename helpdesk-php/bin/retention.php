<?php

declare(strict_types=1);

/**
 * Script dọn dẹp dữ liệu hết hạn (retention) của Helpdesk.
 *
 * Xoá các bản ghi đã quá hạn khỏi các bảng ticket, hội thoại và bản ghi phụ trợ
 * (xem Store::prune()). Vì thao tác này xoá dữ liệu thật nên bắt buộc phải truyền
 * cờ `--apply` một cách tường minh, tránh chạy nhầm.
 *
 * Cách dùng:
 *   php bin/retention.php --apply
 *
 * Mã thoát: 0 nếu thành công, 2 nếu thiếu cờ `--apply`.
 */

use StudioHub\Helpdesk\Persistence\Store;

$config = require dirname(__DIR__) . '/bootstrap.php';

// Không có cờ --apply thì chỉ in hướng dẫn ra STDERR và thoát, không xoá gì cả
if (!in_array('--apply', $argv, true)) {
    fwrite(STDERR, "Explicit retention cleanup: php bin/retention.php --apply\n");
    exit(2);
}

// Thực hiện dọn dẹp và báo số bản ghi đã xoá
$removed = (new Store($config))->prune();

echo $removed . " expired Helpdesk records removed.\n";