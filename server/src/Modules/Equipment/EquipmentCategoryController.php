<?php

declare(strict_types=1);

namespace App\Modules\Equipment;

use App\Core\Request;
use App\Core\ApiResponse;
use App\Core\Validator;
use App\Modules\Equipment\EquipmentCategoryRepository;
use App\Modules\Shared\OwnershipGuard;
use App\Exceptions\ApiException;

class EquipmentCategoryController
{
    private EquipmentCategoryRepository $categoryRepo;

    public function __construct(?EquipmentCategoryRepository $categoryRepo = null)
    {
        $this->categoryRepo = $categoryRepo ?? new EquipmentCategoryRepository();
    }

    /**
     * GET /api/equipment-categories?studio_id=
     * List equipment categories for a studio
     */
    public function index(Request $req): void
    {
        $user = $req->user();
        $studioId = (int) $req->query('studio_id', 0);

        if ($studioId <= 0) {
            throw new ApiException(400, 'missing_studio_id', 'studio_id là bắt buộc');
        }

        OwnershipGuard::assertOwnsStudio((int) $user['user_id'], $studioId);

        $categories = $this->categoryRepo->findByStudioId($studioId);
        ApiResponse::success($categories, 'Lấy danh mục thiết bị thành công');
    }

    /**
     * POST /api/equipment-categories
     * Create new equipment category in a studio
     */
    public function create(Request $req): void
    {
        $user = $req->user();
        $body = $req->body();

        Validator::assertValid($body, [
            'studio_id'   => 'required|int|min:1',
            'name'        => 'required|min:2|max:100',
            'description' => 'max:255',
        ]);

        $studioId = (int) $body['studio_id'];
        OwnershipGuard::assertOwnsStudio((int) $user['user_id'], $studioId);

        $catId = $this->categoryRepo->create($body);
        $category = $this->categoryRepo->findById($catId);

        ApiResponse::created($category, 'Tạo danh mục thiết bị thành công');
    }
}

