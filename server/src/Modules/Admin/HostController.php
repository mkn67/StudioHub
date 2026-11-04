<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\ApiResponse;
use App\Core\Request;
use App\Modules\Admin\StatsService;

class HostController
{
    private StatsService $statsService;

    public function __construct(?StatsService $statsService = null)
    {
        $this->statsService = $statsService ?? new StatsService();
    }

    /**
     * GET /api/host/statistics
     * Host authenticated endpoint to view studio statistics
     */
    public function statistics(Request $request): void
    {
        $query = $request->query();
        $user = $request->getAttribute('user');

        $result = $this->statsService->getHostStatistics((int) $user['user_id'], $query);

        ApiResponse::ok($result, 'Lấy thống kê cơ sở studio thành công');
    }
}

