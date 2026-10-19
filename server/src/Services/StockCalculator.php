<?php

declare(strict_types=1);

namespace App\Services;

class StockCalculator
{
    /**
     * Calculate peak simultaneous equipment usage within interval [from, to)
     *
     * @param array<int, array{busy_start: string, busy_end: string, quantity: int|string}> $existing
     * @param string $from Format: 'YYYY-MM-DD HH:mm:ss'
     * @param string $to   Format: 'YYYY-MM-DD HH:mm:ss'
     * @return int Peak usage quantity
     */
    public static function peakUsage(array $existing, string $from, string $to): int
    {
        if (empty($existing)) {
            return 0;
        }

        $fromTs = strtotime($from);
        $toTs = strtotime($to);

        // Normalize intervals that overlap with [from, to)
        $intervals = [];
        $points = [$fromTs];

        foreach ($existing as $item) {
            $start = strtotime((string) $item['busy_start']);
            $end = strtotime((string) $item['busy_end']);
            $qty = (int) $item['quantity'];

            // Overlaps with [from, to) when start < to and end > from
            if ($start < $toTs && $end > $fromTs) {
                $intervals[] = [
                    'start' => $start,
                    'end'   => $end,
                    'qty'   => $qty,
                ];

                // Points to inspect: busy_start strictly inside (from, to)
                if ($start > $fromTs && $start < $toTs) {
                    $points[] = $start;
                }
            }
        }

        $points = array_unique($points);
        $maxUsage = 0;

        foreach ($points as $t) {
            $currentUsage = 0;
            foreach ($intervals as $inv) {
                if ($inv['start'] <= $t && $t < $inv['end']) {
                    $currentUsage += $inv['qty'];
                }
            }

            if ($currentUsage > $maxUsage) {
                $maxUsage = $currentUsage;
            }
        }

        return $maxUsage;
    }

    /**
     * Calculate peak simultaneous usage of equipment in all future active bookings from reference time
     *
     * @param array<int, array{busy_start: string, busy_end: string, quantity: int|string}> $futureBookings
     * @param string $now Format: 'YYYY-MM-DD HH:mm:ss'
     * @return int Peak usage in future
     */
    public static function peakFutureUsage(array $futureBookings, ?string $now = null): int
    {
        if (empty($futureBookings)) {
            return 0;
        }

        $nowTs = $now ? strtotime($now) : time();
        $intervals = [];
        $points = [$nowTs];

        foreach ($futureBookings as $item) {
            $start = strtotime((string) $item['busy_start']);
            $end = strtotime((string) $item['busy_end']);
            $qty = (int) $item['quantity'];

            if ($end > $nowTs) {
                $intervals[] = [
                    'start' => $start,
                    'end'   => $end,
                    'qty'   => $qty,
                ];

                if ($start >= $nowTs) {
                    $points[] = $start;
                }
            }
        }

        $points = array_unique($points);
        $maxUsage = 0;

        foreach ($points as $t) {
            $currentUsage = 0;
            foreach ($intervals as $inv) {
                if ($inv['start'] <= $t && $t < $inv['end']) {
                    $currentUsage += $inv['qty'];
                }
            }

            if ($currentUsage > $maxUsage) {
                $maxUsage = $currentUsage;
            }
        }

        return $maxUsage;
    }
}
