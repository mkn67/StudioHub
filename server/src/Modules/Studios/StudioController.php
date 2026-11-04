<?php

declare(strict_types=1);

namespace App\Modules\Studios;

use App\Core\Request;
use App\Core\ApiResponse;
use App\Core\Validator;
use App\Modules\Studios\StudioRepository;
use App\Modules\Shared\OwnershipGuard;
use App\Exceptions\ApiException;
use App\Modules\Rooms\UploadService;

class StudioController
{
    private StudioRepository $studioRepo;

    public function __construct(?StudioRepository $studioRepo = null)
    {
        $this->studioRepo = $studioRepo ?? new StudioRepository();
    }

    /**
     * GET /api/studios/mine
     * List all studios owned by current host
     */
    public function mine(Request $req): void
    {
        $user = $req->user();
        $studios = $this->studioRepo->findByHostId((int) $user['user_id']);
        ApiResponse::success($studios, 'Lấy danh sách studio của tôi thành công');
    }

    /**
     * POST /api/studios
     * Create a new studio for current host
     */
    public function create(Request $req): void
    {
        $user = $req->user();
        $body = $req->body();

        Validator::assertValid($body, [
            'name'     => 'required|min:3|max:150',
            'address'  => 'required|min:3|max:255',
            'district' => 'required|min:2|max:100',
            'city'     => 'required|min:2|max:100',
            'phone'    => 'required|min:9|max:20',
        ]);

        $body['host_id'] = (int) $user['user_id'];
        $studioId = $this->studioRepo->create($body);
        $studio = $this->studioRepo->findById($studioId);

        ApiResponse::created($studio, 'Tạo cơ sở studio thành công');
    }

    /**
     * PATCH /api/studios/{id}
     * Update an existing studio
     */
    public function update(Request $req, array $vars = []): void
    {
        $user = $req->user();
        $studioId = (int) ($vars['id'] ?? 0);

        OwnershipGuard::assertOwnsStudio((int) $user['user_id'], $studioId);

        $body = $req->body();
        if (empty($body)) {
            throw new ApiException(400, 'empty_payload', 'Không có dữ liệu cập nhật');
        }

        Validator::assertValid($body, [
            'name'     => 'min:3|max:150',
            'address'  => 'min:3|max:255',
            'district' => 'min:2|max:100',
            'city'     => 'min:2|max:100',
            'phone'    => 'min:9|max:20',
            'status'   => 'in:active,inactive',
        ]);

        $this->studioRepo->update($studioId, $body);
        $updated = $this->studioRepo->findById($studioId);

        ApiResponse::success($updated, 'Cập nhật cơ sở studio thành công');
    }

    public function uploadCover(Request $req, array $vars = []): void
    {
        $userId = (int) $req->user()['user_id'];
        $studioId = (int) ($vars['id'] ?? 0);
        OwnershipGuard::assertOwnsStudio($userId, $studioId);
        $file = $_FILES['image'] ?? [];
        if (!$file) throw new ApiException(400, 'missing_file', 'Vui lòng gửi ảnh trong trường image');
        $url = UploadService::uploadImage($file, 'studios');
        try {
            $existing = $this->studioRepo->findById($studioId);
            $this->studioRepo->updateCover($studioId, $url);
        } catch (\Throwable $error) {
            $this->deleteCoverFile($url);
            throw $error;
        }
        $this->deleteCoverFile(is_array($existing) ? ($existing['cover_url'] ?? null) : null);
        ApiResponse::created(['studio_id' => $studioId, 'cover_url' => $url], 'Tải ảnh đại diện Studio thành công');
    }

    private function deleteCoverFile(?string $url): void
    {
        if (is_string($url) && preg_match('#^/uploads/studios/[A-Za-z0-9_.-]+$#', $url)) {
            $path = dirname(__DIR__, 3) . '/public' . $url;
            if (is_file($path)) @unlink($path);
        }
    }
}

