<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Booking\AvailabilityService;
use PHPUnit\Framework\TestCase;

class AvailabilityServiceTest extends TestCase
{
    /**
     * Test intervals overlap logic:
     * [startA, endA) and [startB, endB) overlap if startA < endB AND endA > startB
     */
    public function testIntervalsOverlap(): void
    {
        // 1. Exactly adjacent intervals (endA == startB): do NOT overlap
        $this->assertFalse(AvailabilityService::intervalsOverlap(
            '2026-10-25 09:00:00',
            '2026-10-25 12:00:00',
            '2026-10-25 12:00:00',
            '2026-10-25 14:00:00'
        ));

        // 2. Completely separated (endA < startB): do NOT overlap
        $this->assertFalse(AvailabilityService::intervalsOverlap(
            '2026-10-25 08:00:00',
            '2026-10-25 09:00:00',
            '2026-10-25 10:00:00',
            '2026-10-25 12:00:00'
        ));

        // 3. Partial overlap (startB < endA < endB): overlaps
        $this->assertTrue(AvailabilityService::intervalsOverlap(
            '2026-10-25 09:00:00',
            '2026-10-25 12:00:00',
            '2026-10-25 11:00:00',
            '2026-10-25 14:00:00'
        ));

        // 4. One strictly inside the other: overlaps
        $this->assertTrue(AvailabilityService::intervalsOverlap(
            '2026-10-25 09:00:00',
            '2026-10-25 15:00:00',
            '2026-10-25 10:00:00',
            '2026-10-25 11:00:00'
        ));

        // 5. Example from Section 5.1 / T3:
        // Existing booking 09:00 - 12:00 has busy interval [09:00, 12:30).
        // New booking 12:15 - 14:00 has busy interval [12:15, 14:30).
        // They overlap because 12:15 < 12:30 and 14:30 > 09:00!
        $this->assertTrue(AvailabilityService::intervalsOverlap(
            '2026-10-25 09:00:00',
            '2026-10-25 12:30:00',
            '2026-10-25 12:15:00',
            '2026-10-25 14:30:00'
        ));

        // New booking starting at 12:30: [12:30, 14:30).
        // Does NOT overlap with [09:00, 12:30). Accepted!
        $this->assertFalse(AvailabilityService::intervalsOverlap(
            '2026-10-25 09:00:00',
            '2026-10-25 12:30:00',
            '2026-10-25 12:30:00',
            '2026-10-25 14:30:00'
        ));

        // T4: Booking ending at 08:30 (busy [08:30, 09:00)) before booking starting at 09:00 ([09:00, 12:30))
        // 09:00 is not < 09:00, so does NOT overlap!
        $this->assertFalse(AvailabilityService::intervalsOverlap(
            '2026-10-25 07:00:00',
            '2026-10-25 09:00:00', // 08:30 + 30m buffer = 09:00
            '2026-10-25 09:00:00',
            '2026-10-25 12:30:00'
        ));
    }
}

