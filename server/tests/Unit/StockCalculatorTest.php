<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Booking\StockCalculator;
use PHPUnit\Framework\TestCase;

class StockCalculatorTest extends TestCase
{
    /**
     * Test T14: Stock calculation with non-contiguous intervals (4 lamps warehouse)
     */
    public function testPeakUsageWithFourLampsExample(): void
    {
        // Existing bookings:
        // A: 09:00 - 10:00, 2 lamps
        // B: 11:00 - 12:00, 2 lamps
        $existing = [
            [
                'busy_start' => '2026-10-20 09:00:00',
                'busy_end'   => '2026-10-20 10:00:00',
                'quantity'   => 2,
            ],
            [
                'busy_start' => '2026-10-20 11:00:00',
                'busy_end'   => '2026-10-20 12:00:00',
                'quantity'   => 2,
            ],
        ];

        // New request: 09:30 - 11:30
        $from = '2026-10-20 09:30:00';
        $to   = '2026-10-20 11:30:00';

        $peak = StockCalculator::peakUsage($existing, $from, $to);
        // During 09:30 - 11:30, A overlaps [09:30, 10:00) with 2 lamps.
        // B overlaps [11:00, 11:30) with 2 lamps.
        // At 09:30: usage is 2. At 11:00: usage is 2.
        // Max concurrent existing usage is 2.
        $this->assertSame(2, $peak);

        $totalQuantity = 4;
        $requestedQuantity = 2;
        $this->assertTrue($peak + $requestedQuantity <= $totalQuantity, '2 lamps should be accepted');

        // Variant 1: Request 3 lamps
        $requestedQuantity3 = 3;
        $this->assertFalse($peak + $requestedQuantity3 <= $totalQuantity, '3 lamps should be rejected (2 + 3 > 4)');

        // Variant 2: Add C: 09:45 - 10:15 (1 lamp)
        $existingWithC = $existing;
        $existingWithC[] = [
            'busy_start' => '2026-10-20 09:45:00',
            'busy_end'   => '2026-10-20 10:15:00',
            'quantity'   => 1,
        ];

        $peakWithC = StockCalculator::peakUsage($existingWithC, $from, $to);
        // At 09:45, both A (2) and C (1) are active -> total 3 lamps.
        $this->assertSame(3, $peakWithC);
        $this->assertFalse($peakWithC + $requestedQuantity <= $totalQuantity, 'With C, 2 lamps should be rejected (3 + 2 > 4)');
    }

    public function testPeakUsageReturnsZeroWhenNoOverlappingBookings(): void
    {
        $existing = [
            [
                'busy_start' => '2026-10-20 07:00:00',
                'busy_end'   => '2026-10-20 08:30:00',
                'quantity'   => 4,
            ],
            [
                'busy_start' => '2026-10-20 14:00:00',
                'busy_end'   => '2026-10-20 16:00:00',
                'quantity'   => 4,
            ],
        ];

        $from = '2026-10-20 09:00:00';
        $to   = '2026-10-20 11:00:00';

        $peak = StockCalculator::peakUsage($existing, $from, $to);
        $this->assertSame(0, $peak);
    }
}

