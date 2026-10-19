<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\ApiResponse;
use App\Core\Validator;
use App\Repositories\StudioRepository;
use App\Services\OwnershipGuard;
use App\Exceptions\ApiException;

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
}
