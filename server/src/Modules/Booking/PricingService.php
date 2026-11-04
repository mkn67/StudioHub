<?php

declare(strict_types=1);

namespace App\Modules\Booking;

use App\Exceptions\ApiException;

class PricingService
{
    public const UNIT_MINUTES_MAP = [
        'hour'     => 60,
        'half_day' => 240,
        'day'      => 1440,
        'week'     => 10080,
        'month'    => 43200, // 30 days
    ];

    /**
     * Calculate rental units based on rate unit and duration in minutes
     *
     * @param string $rateUnit
     * @param int $durationMinutes
     * @param int|null $rateUnitMinutes Custom unit_minutes for session or overrides
     * @return float
     * @throws ApiException
     */
    public static function calculateRentalUnits(string $rateUnit, int $durationMinutes, ?int $rateUnitMinutes = null): float
    {
        if ($durationMinutes <= 0) {
            throw new ApiException(400, 'invalid_duration', 'Thời lượng thuê phải lớn hơn 0 phút');
        }

        if ($rateUnit === 'hour') {
            // Round up to multiples of 0.5 hours (30 minutes)
            return ceil(($durationMinutes / 60.0) * 2.0) / 2.0;
        }

        $divisor = $rateUnitMinutes;
        if ($divisor === null) {
            $divisor = self::UNIT_MINUTES_MAP[$rateUnit] ?? null;
        }

        if ($divisor === null || $divisor <= 0) {
            throw new ApiException(400, 'invalid_rate_unit', "Đơn vị tính giá không hợp lệ: {$rateUnit}");
        }

        return (float) ceil($durationMinutes / $divisor);
    }

    /**
     * Pure function to calculate full pricing breakdown for a booking
     *
     * @param array{
     *     rate_unit: string,
     *     unit_price: int|float|string,
     *     unit_minutes?: int|string|null,
     *     minimum_units?: int|float|string|null,
     *     maximum_units?: int|float|string|null
     * } $rate
     * @param int $durationMinutes
     * @param array<int, array{
     *     equipment_id: int,
     *     quantity: int,
     *     pricing_unit: string,
     *     unit_price: int|float|string,
     *     name?: string
     * }> $equipments
     * @param float $depositRate
     * @return array{
     *     booking_type: string,
     *     rate_unit: string,
     *     rental_units: float,
     *     room_unit_price: int,
     *     room_amount: int,
     *     equipment_amount: int,
     *     total_amount: int,
     *     deposit_amount: int,
     *     equipments: array<int, array{
     *         equipment_id: int,
     *         name?: string,
     *         quantity: int,
     *         pricing_unit: string,
     *         unit_price: int,
     *         equipment_hours: float|null,
     *         subtotal: int
     *     }>
     * }
     * @throws ApiException
     */
    public static function calculate(
        array $rate,
        int $durationMinutes,
        array $equipments = [],
        float $depositRate = 0.30
    ): array {
        $rateUnit = (string) $rate['rate_unit'];
        $unitMinutes = isset($rate['unit_minutes']) && is_numeric($rate['unit_minutes'])
            ? (int) $rate['unit_minutes']
            : null;

        $rentalUnits = self::calculateRentalUnits($rateUnit, $durationMinutes, $unitMinutes);

        // Check minimum_units
        $minUnits = isset($rate['minimum_units']) && is_numeric($rate['minimum_units'])
            ? (float) $rate['minimum_units']
            : 1.0;
        if ($rentalUnits < $minUnits) {
            throw new ApiException(
                400,
                'rate_limit_exceeded',
                "Thời lượng thuê ({$rentalUnits} {$rateUnit}) nhỏ hơn số lượng tối thiểu ({$minUnits} {$rateUnit})",
                [
                    [
                        'field'   => 'rental_units',
                        'code'    => 'below_minimum',
                        'message' => "Thời lượng thuê tối thiểu là {$minUnits} {$rateUnit}",
                    ]
                ]
            );
        }

        // Check maximum_units
        if (isset($rate['maximum_units']) && is_numeric($rate['maximum_units']) && (float) $rate['maximum_units'] > 0) {
            $maxUnits = (float) $rate['maximum_units'];
            if ($rentalUnits > $maxUnits) {
                throw new ApiException(
                    400,
                    'rate_limit_exceeded',
                    "Thời lượng thuê ({$rentalUnits} {$rateUnit}) vượt quá số lượng tối đa ({$maxUnits} {$rateUnit})",
                    [
                        [
                            'field'   => 'rental_units',
                            'code'    => 'above_maximum',
                            'message' => "Thời lượng thuê tối đa là {$maxUnits} {$rateUnit}",
                        ]
                    ]
                );
            }
        }

        $roomUnitPrice = (int) round((float) $rate['unit_price']);
        $roomAmount = (int) round($rentalUnits * $roomUnitPrice);

        // Equipment hours calculated from real booking duration rounded up to 0.5h
        $equipmentHours = ceil(($durationMinutes / 60.0) * 2.0) / 2.0;

        $calculatedEquipments = [];
        $equipmentTotal = 0;

        foreach ($equipments as $item) {
            $eqId = (int) $item['equipment_id'];
            $qty = (int) $item['quantity'];
            if ($qty <= 0) {
                continue;
            }

            $pricingUnit = (string) $item['pricing_unit'];
            $eqUnitPrice = (int) round((float) $item['unit_price']);

            if ($pricingUnit === 'session') {
                $hours = null;
                $subtotal = (int) round($qty * $eqUnitPrice);
            } elseif ($pricingUnit === 'hour') {
                $hours = $equipmentHours;
                $subtotal = (int) round($qty * $eqUnitPrice * $equipmentHours);
            } else {
                throw new ApiException(
                    400,
                    'invalid_pricing_unit',
                    "Đơn vị tính giá thiết bị không hợp lệ: {$pricingUnit}"
                );
            }

            $equipmentTotal += $subtotal;
            $line = [
                'equipment_id'    => $eqId,
                'quantity'        => $qty,
                'pricing_unit'    => $pricingUnit,
                'unit_price'      => $eqUnitPrice,
                'equipment_hours' => $hours,
                'subtotal'        => $subtotal,
            ];
            if (isset($item['name'])) {
                $line['name'] = (string) $item['name'];
            }
            $calculatedEquipments[] = $line;
        }

        $totalAmount = $roomAmount + $equipmentTotal;
        $depositAmount = (int) round($totalAmount * $depositRate);
        $bookingType = in_array($rateUnit, ['week', 'month'], true) ? 'long_term' : 'short_term';

        return [
            'booking_type'     => $bookingType,
            'rate_unit'        => $rateUnit,
            'rental_units'     => $rentalUnits,
            'room_unit_price'  => $roomUnitPrice,
            'room_amount'      => $roomAmount,
            'equipment_amount' => $equipmentTotal,
            'total_amount'     => $totalAmount,
            'deposit_amount'   => $depositAmount,
            'equipments'       => $calculatedEquipments,
        ];
    }
}

