<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Services\PricingService;
use PHPUnit\Framework\TestCase;

class PricingServiceTest extends TestCase
{
    public function testHourlyRounding(): void
    {
        // 60 mins -> 1.0 hr
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('hour', 60));

        // 70 mins -> 1.5 hr
        $this->assertEquals(1.5, PricingService::calculateRentalUnits('hour', 70));

        // 90 mins -> 1.5 hr
        $this->assertEquals(1.5, PricingService::calculateRentalUnits('hour', 90));

        // 95 mins -> 2.0 hr
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('hour', 95));

        // 120 mins -> 2.0 hr
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('hour', 120));
    }

    public function testNonHourlyUnitsCeil(): void
    {
        // session with 180 min
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('session', 120, 180));
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('session', 200, 180));

        // half_day (240 min)
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('half_day', 240));
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('half_day', 250));

        // day (1440 min)
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('day', 1440));
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('day', 1441));

        // week (10080 min)
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('week', 10080));
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('week', 10081));

        // month (43200 min = 30 days)
        $this->assertEquals(1.0, PricingService::calculateRentalUnits('month', 43200));
        $this->assertEquals(2.0, PricingService::calculateRentalUnits('month', 43201));
    }

    public function testRateMinMaxValidation(): void
    {
        $rate = [
            'rate_unit'     => 'hour',
            'unit_price'    => 200000,
            'minimum_units' => 2.0,
            'maximum_units' => 8.0,
        ];

        // 60 min -> 1.0 hr < minimum_units 2.0 -> throws 400
        try {
            PricingService::calculate($rate, 60);
            $this->fail('Expected exception for duration below minimum_units');
        } catch (ApiException $e) {
            $this->assertEquals(400, $e->getStatusCode());
            $this->assertEquals('rate_limit_exceeded', $e->getErrorCode());
        }

        // 600 min -> 10.0 hr > maximum_units 8.0 -> throws 400
        try {
            PricingService::calculate($rate, 600);
            $this->fail('Expected exception for duration above maximum_units');
        } catch (ApiException $e) {
            $this->assertEquals(400, $e->getStatusCode());
            $this->assertEquals('rate_limit_exceeded', $e->getErrorCode());
        }

        // 180 min -> 3.0 hr within [2.0, 8.0] -> passes
        $res = PricingService::calculate($rate, 180);
        $this->assertEquals(3.0, $res['rental_units']);
        $this->assertEquals(600000, $res['room_amount']);
    }

    public function testEquipmentCalculation(): void
    {
        $rate = [
            'rate_unit'     => 'hour',
            'unit_price'    => 300000,
            'minimum_units' => 1.0,
        ];

        $equipments = [
            [
                'equipment_id' => 1,
                'name'         => 'Đèn chiếu sáng',
                'quantity'     => 2,
                'pricing_unit' => 'session',
                'unit_price'   => 100000,
            ],
            [
                'equipment_id' => 2,
                'name'         => 'Micro thu âm',
                'quantity'     => 1,
                'pricing_unit' => 'hour',
                'unit_price'   => 50000,
            ],
        ];

        // Duration 90 mins (1.5 hours)
        $res = PricingService::calculate($rate, 90, $equipments, 0.30);

        $this->assertEquals('short_term', $res['booking_type']);
        $this->assertEquals(1.5, $res['rental_units']);
        $this->assertEquals(450000, $res['room_amount']); // 1.5 * 300k

        // Equipments:
        // Item 1: 2 * 100k = 200k (session)
        // Item 2: 1 * 50k * 1.5 = 75k (hour)
        $this->assertEquals(275000, $res['equipment_amount']);
        $this->assertEquals(725000, $res['total_amount']);
        $this->assertEquals(217500, $res['deposit_amount']); // round(725000 * 0.30)
    }

    /**
     * T18: Long term month booking with hourly equipment
     */
    public function testT18LongTermMonthWithHourlyEquipment(): void
    {
        $rate = [
            'rate_unit'     => 'month',
            'unit_price'    => 20000000,
            'unit_minutes'  => 43200,
            'minimum_units' => 1.0,
        ];

        $equipments = [
            [
                'equipment_id' => 10,
                'name'         => 'Bộ phát livestream',
                'quantity'     => 2,
                'pricing_unit' => 'hour',
                'unit_price'   => 50000,
            ],
        ];

        // 45 days = 45 * 24 * 60 = 64800 minutes
        $duration = 45 * 24 * 60;
        $res = PricingService::calculate($rate, $duration, $equipments, 0.30);

        // rental_units = ceil(64800 / 43200) = 2.0
        $this->assertEquals('long_term', $res['booking_type']);
        $this->assertEquals(2.0, $res['rental_units']);
        $this->assertEquals(40000000, $res['room_amount']);

        // equipment_hours = ceil((64800 / 60) * 2) / 2 = 1080.0
        $this->assertEquals(1080.0, $res['equipments'][0]['equipment_hours']);
        // subtotal = 2 * 50,000 * 1080 = 108,000,000
        $this->assertEquals(108000000, $res['equipments'][0]['subtotal']);
        $this->assertEquals(108000000, $res['equipment_amount']);

        // total = 40m + 108m = 148,000,000
        $this->assertEquals(148000000, $res['total_amount']);
        $this->assertEquals(44400000, $res['deposit_amount']);
    }
}
