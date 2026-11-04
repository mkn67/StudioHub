<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Exceptions\ApiException;

class UploadService
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    /**
     * Upload room image and return relative web path
     *
     * @param array $file $_FILES['image'] entry
     * @param string $targetDir Target storage directory on disk
     * @return string Relative URL path (/uploads/rooms/{filename})
     * @throws ApiException
     */
    public static function uploadRoomImage(array $file, ?string $targetDir = null): string
    {
        return self::uploadImage($file, 'rooms', $targetDir);
    }

    /** Store a validated image in an entity-specific public upload directory. */
    public static function uploadImage(array $file, string $entity, ?string $targetDir = null): string
    {
        if (!in_array($entity, ['rooms', 'avatars', 'studios', 'equipments'], true)) {
            throw new ApiException(400, 'invalid_upload_target', 'Loại ảnh tải lên không hợp lệ');
        }
        if (!isset($file['error']) || is_array($file['error'])) {
            throw new ApiException(400, 'invalid_upload', 'Tập tin tải lên không hợp lệ');
        }

        switch ($file['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_NO_FILE:
                throw new ApiException(400, 'missing_file', 'Vui lòng chọn ảnh để tải lên');
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new ApiException(400, 'file_too_large', 'Dung lượng ảnh vượt quá giới hạn 5 MB');
            default:
                throw new ApiException(500, 'upload_failed', 'Không thể tải ảnh lên máy chủ');
        }

        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new ApiException(400, 'file_too_large', 'Dung lượng ảnh vượt quá giới hạn 5 MB');
        }

        $tmpPath = (string) $file['tmp_name'];
        if (!is_file($tmpPath) || !is_readable($tmpPath)) {
            throw new ApiException(400, 'invalid_upload', 'Không tìm thấy file tạm tải lên');
        }

        // Real MIME type check using finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? finfo_file($finfo, $tmpPath) : null;
        if ($finfo) {
            finfo_close($finfo);
        }

        if (!$mime || !isset(self::ALLOWED_MIME_TYPES[$mime])) {
            throw new ApiException(400, 'invalid_file_type', 'Chỉ chấp nhận định dạng ảnh JPG, PNG hoặc WebP');
        }

        $extension = self::ALLOWED_MIME_TYPES[$mime];
        $randomName = rtrim($entity, 's') . '_' . bin2hex(random_bytes(16)) . '.' . $extension;

        if ($targetDir === null) {
            $targetDir = dirname(__DIR__, 3) . '/public/uploads/' . $entity;
        }

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $destPath = rtrim($targetDir, '/') . '/' . $randomName;

        if (is_uploaded_file($tmpPath)) {
            if (!move_uploaded_file($tmpPath, $destPath)) {
                throw new ApiException(500, 'upload_save_failed', 'Lưu file ảnh thất bại');
            }
        } else {
            // Fallback for testing environments
            if (!copy($tmpPath, $destPath)) {
                throw new ApiException(500, 'upload_save_failed', 'Lưu file ảnh thất bại');
            }
        }

        return '/uploads/' . $entity . '/' . $randomName;
    }
}

