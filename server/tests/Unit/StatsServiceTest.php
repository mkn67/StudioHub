<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Services\StatsService;
use PHPUnit\Framework\TestCase;

class StatsServiceTest extends TestCase
{
    /**
     * Test T26: Overlap hours calculation across period boundary
     * Booking 31/10 20:00 to 01/11 02:00 in October period [2026-10-01 00:00:00, 2026-11-01 00:00:00)
     * Must calculate exactly 4.0 hours (from 20:00 to 00:00).
     */
    public function testOverlapHoursBoundarySplit(): void
    {
        $periodFrom = '2026-10-01 00:00:00';
        $periodTo   = '2026-11-01 00:00:00';

        // Case A: 2026-10-31 20:00 to 2026-11-01 02:00
        $overlapA = StatsService::calculateOverlapHours(
            '2026-10-31 20:00:00',
            '2026-11-01 02:00:00',
            $periodFrom,
            $periodTo
        );
        $this->assertEqualsWithDelta(4.0, $overlapA, 0.001, "Should count exactly 4 hours of booking spanning into next period");

        // Case B: Completely inside period: 2026-10-15 09:00 to 2026-10-15 12:30 -> 3.5 hours
        $overlapB = StatsService::calculateOverlapHours(
            '2026-10-15 09:00:00',
            '2026-10-15 12:30:00',
            $periodFrom,
            $periodTo
        );
        $this->assertEqualsWithDelta(3.5, $overlapB, 0.001);

        // Case C: Spanning from previous period into current period
        // 2026-09-30 22:00 to 2026-10-01 03:00 -> exactly 3 hours inside Oct
        $overlapC = StatsService::calculateOverlapHours(
            '2026-09-30 22:00:00',
            '2026-10-01 03:00:00',
            $periodFrom,
            $periodTo
        );
        $this->assertEqualsWithDelta(3.0, $overlapC, 0.001);

        // Case D: Completely outside
        $overlapD = StatsService::calculateOverlapHours(
            '2026-11-01 00:00:00',
            '2026-11-01 04:00:00',
            $periodFrom,
            $periodTo
        );
        $this->assertEqualsWithDelta(0.0, $overlapD, 0.001);
    }

    /**
     * Test Occupancy Rate formula
     */
    public function testComputeOccupancyRate(): void
    {
        // 1 room, 30 days, 12 operating hours = 360 capacity hours
        // 36 hours used -> 36 / 360 * 100 = 10.0%
        $rate = StatsService::computeOccupancyRate(36.0, 1, 30, 12);
        $this->assertSame(10.0, $rate);

        // 2 rooms, 10 days, 12 operating hours = 240 capacity hours
        // 120 hours used -> 120 / 240 * 100 = 50.0%
        $rate2 = StatsService::computeOccupancyRate(120.0, 2, 10, 12);
        $this->assertSame(50.0, $rate2);

        // 0 rooms or 0 days -> 0.0%
        $this->assertSame(0.0, StatsService::computeOccupancyRate(50.0, 0, 30, 12));
        $this->assertSame(0.0, StatsService::computeOccupancyRate(50.0, 2, 0, 12));
    }

    /**
     * Test Period validation: from >= to must throw 400
     */
    public function testResolvePeriodInvalidRange(): void
    {
        $service = new StatsService();

        // from == to
        try {
            $service->resolvePeriod(['from' => '2026-10-15', 'to' => '2026-10-15']);
            $this->fail("Expected ApiException for from == to");
        } catch (ApiException $e) {
            $this->assertSame(400, $e->getStatusCode());
            $this->assertSame('invalid_date_range', $e->getErrorCode());
        }

        // from > to
        try {
            $service->resolvePeriod(['from' => '2026-10-20', 'to' => '2026-10-10']);
            $this->fail("Expected ApiException for from > to");
        } catch (ApiException $e) {
            $this->assertSame(400, $e->getStatusCode());
            $this->assertSame('invalid_date_range', $e->getErrorCode());
        }
    }

    /**
     * Test Period validation: range > 366 days must throw 400
     */
    public function testResolvePeriodRangeTooLong(): void
    {
        $service = new StatsService();

        try {
            $service->resolvePeriod(['from' => '2025-01-01', 'to' => '2026-02-01']); // > 366 days
            $this->fail("Expected ApiException for span > 366 days");
        } catch (ApiException $e) {
            $this->assertSame(400, $e->getStatusCode());
            $this->assertSame('range_too_long', $e->getErrorCode());
        }
    }

    /**
     * Test Period validation: valid period
     */
    public function testResolvePeriodValid(): void
    {
        $service = new StatsService();
        $p = $service->resolvePeriod(['from' => '2026-10-01', 'to' => '2026-11-01']);

        $this->assertSame('2026-10-01', $p['from']);
        $this->assertSame('2026-11-01', $p['to']);
        $this->assertSame('2026-10-01 00:00:00', $p['from_dt']);
        $this->assertSame('2026-11-01 00:00:00', $p['to_dt']);
        $this->assertSame(31, $p['days']);
    }
}

