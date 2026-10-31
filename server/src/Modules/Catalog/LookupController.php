<?php

declare(strict_types=1);

namespace App\Modules\Catalog;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Catalog\LookupRepository;

class LookupController
{
    private LookupRepository $lookupRepo;

    public function __construct(?LookupRepository $lookupRepo = null)
    {
        $this->lookupRepo = $lookupRepo ?? new LookupRepository();
    }

    /**
     * GET /api/space-types
     */
    public function spaceTypes(Request $request): void
    {
        $types = $this->lookupRepo->getSpaceTypes();
        ApiResponse::success($types, 'Lấy danh sách loại hình không gian thành công', 200);
    }

    /**
     * GET /api/amenities
     */
    public function amenities(Request $request): void
    {
        $amenities = $this->lookupRepo->getAmenities();
        ApiResponse::success($amenities, 'Lấy danh sách tiện ích thành công', 200);
    }
}

