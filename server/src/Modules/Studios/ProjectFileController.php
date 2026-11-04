<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Exceptions\ApiException;

class ProjectFileController
{
    public function __construct(private readonly ProjectFileService $service = new ProjectFileService())
    {
    }

    public function list(Request $request, array $vars = []): void
    {
        $user = $request->user();
        ApiResponse::success($this->service->list((int) ($vars['project_id'] ?? 0), (int) $user['user_id']), 'Lấy danh sách tệp dự án thành công');
    }

    public function uploadMultipart(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $file = $_FILES['file'] ?? [];
        ApiResponse::created($this->service->upload((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], $file), 'Tải tệp riêng tư lên thành công');
    }

    public function uploadRaw(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $name = $request->header('x-file-name', 'private-file');
        $mime = $request->header('content-type', 'application/octet-stream');
        $temp = tempnam(sys_get_temp_dir(), 'studio-project-');
        if ($temp === false) throw new ApiException(500, 'upload_failed', 'Không thể nhận tệp');
        $input = fopen('php://input', 'rb');
        $output = fopen($temp, 'wb');
        if ($input === false || $output === false) {
            if (is_resource($input)) fclose($input);
            if (is_resource($output)) fclose($output);
            @unlink($temp);
            throw new ApiException(400, 'upload_failed', 'Không thể đọc nội dung tệp');
        }
        $bytes = stream_copy_to_stream($input, $output, 104857601);
        fclose($input);
        fclose($output);
        if ($bytes === false || $bytes <= 0 || $bytes > 104857600) {
            @unlink($temp);
            throw new ApiException(400, 'invalid_file_size', 'Tệp phải có dung lượng từ 1 byte đến 100 MiB');
        }
        try {
            $result = $this->service->upload((int) ($vars['project_id'] ?? 0), (int) $user['user_id'], [
                'error' => UPLOAD_ERR_OK, 'tmp_name' => $temp, 'name' => $name, 'size' => $bytes,
            ]);
        } finally {
            @unlink($temp);
        }
        ApiResponse::created($result, 'Tải tệp riêng tư lên thành công');
    }

    public function download(Request $request, array $vars = []): never
    {
        $user = $request->user();
        $file = $this->service->download((int) ($vars['project_id'] ?? 0), (int) ($vars['file_id'] ?? 0), (int) $user['user_id']);
        header('Content-Type: application/octet-stream');
        header('Content-Length: ' . $file['file_size']);
        header('Content-Disposition: attachment; filename="private-file"; filename*=UTF-8\'\'' . rawurlencode($file['file_name']));
        header('Cache-Control: private, no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        readfile($file['path']);
        exit;
    }

    public function delete(Request $request, array $vars = []): void
    {
        $user = $request->user();
        $this->service->delete((int) ($vars['project_id'] ?? 0), (int) ($vars['file_id'] ?? 0), (int) $user['user_id']);
        ApiResponse::success(['deleted' => true], 'Đã xóa tệp dự án');
    }
}
