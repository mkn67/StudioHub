<?php

declare(strict_types=1);

/**
 * Script kiểm tra (verify) kết nối tới danh mục phòng công khai của StudioHub.
 *
 * Cách hoạt động: gọi thử các API tìm kiếm, xem chi tiết và xem giá của một phòng mẫu.
 * Nếu cả ba đều thành công thì ghi file đánh dấu `var/catalog-verified.json`
 * (có hạn dùng 24 giờ) để các thành phần khác biết danh mục đã được xác minh.
 * Chức năng kiểm tra tình trạng phòng trống (availability) vẫn bị tắt.
 *
 * Mã thoát: 0 nếu thành công, 1 nếu thất bại (kèm JSON mô tả lý do).
 */

use StudioHub\Helpdesk\{Util, Failure};
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Tools\PublicCatalog;

/** Thời hạn hiệu lực của kết quả xác minh: 24 giờ (tính bằng giây). */
const VERIFICATION_TTL_SECONDS = 86400;

$config = require dirname(__DIR__) . '/bootstrap.php';
$file   = $config->path('var/catalog-verified.json');

// Xoá kết quả xác minh cũ trước, để nếu lần kiểm tra này thất bại thì không còn file đánh dấu lỗi thời
if (is_file($file)) {
    unlink($file);
}

try {
    $catalog = new PublicCatalog($config, new CurlTransport());

    // Bước 1: tìm kiếm phòng (không bộ lọc) và lấy một phòng mẫu để thử
    $search = $catalog->search([]);

    if (!$search['items']) {
        throw new Failure('no_catalog_sample_for_verification', 503);
    }

    $roomId = (int) $search['items'][0]['roomId'];

    // Bước 2: thử xem chi tiết và bảng giá của phòng mẫu
    $catalog->details($roomId);
    $catalog->rates($roomId);

    // Bước 3: mọi thứ đều ổn, ghi file đánh dấu đã xác minh (khoá file khi ghi để tránh ghi chồng)
    file_put_contents(
        $file,
        Util::json([
            'base_url' => $config->get('STUDIOHUB_API_BASE_URL'),
            'expires'  => time() + VERIFICATION_TTL_SECONDS,
        ]),
        LOCK_EX
    );

    echo "Public room search/details/rates verified; availability remains disabled.\n";
} catch (Throwable $e) {
    // Lỗi nghiệp vụ (Failure) thì báo đúng lý do; lỗi khác chỉ báo chung để không lộ chi tiết nội bộ
    echo Util::json([
        'verified' => false,
        'reason'   => $e instanceof Failure ? $e->reason : 'catalog_check_failed',
    ]) . "\n";

    exit(1);
}