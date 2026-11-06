<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Modules\Rooms\RoomRepository;
use App\Modules\Rooms\RoomService;
use PHPUnit\Framework\TestCase;

class RoomServiceTest extends TestCase
{
    private RoomRepository $roomRepository;
    private RoomService $roomService;

    protected function setUp(): void
    {
        $this->roomRepository = $this->createMock(RoomRepository::class);
        $this->roomService = new RoomService($this->roomRepository);
    }

    public function testGetRoomsSuccessWithDefaults(): void
    {
        $this->roomRepository->expects($this->once())
            ->method('searchRooms')
            ->with([
                'keyword'       => null,
                'space_type_id' => null,
                'rate_unit'     => 'hour',
                'min_price'     => null,
                'max_price'     => null,
                'min_area'      => null,
                'min_capacity'  => null,
                'district'      => null,
                'amenity_id'    => null,
                'available_from'=> null,
                'available_to'  => null,
                'sort'          => 'recommended',
                'page'          => 1,
                'limit'         => 12,
            ])
            ->willReturn([
                'items'       => [['room_id' => 1, 'name' => 'Room 1']],
                'total_items' => 1,
            ]);

        $result = $this->roomService->getRooms([]);

        $this->assertCount(1, $result['items']);
        $this->assertEquals(1, $result['pagination']['page']);
        $this->assertEquals(12, $result['pagination']['limit']);
        $this->assertEquals(1, $result['pagination']['total_items']);
        $this->assertEquals(1, $result['pagination']['total_pages']);
    }

    public function testGetRoomsWithInvalidRateUnit(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->roomService->getRooms(['rate_unit' => 'decade']);
    }

    public function testGetRoomsWithInvalidPriceRange(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->roomService->getRooms([
            'min_price' => 500000,
            'max_price' => 200000,
        ]);
    }

    public function testGetRoomsWithInvalidLimit(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->roomService->getRooms(['limit' => 100]); // Max is 50
    }

    public function testGetRoomDetailSuccess(): void
    {
        $mockDetail = [
            'room_id'     => 1,
            'name'        => 'Artemis Phòng Cyclorama Trắng',
            'studio'      => ['studio_id' => 1, 'name' => 'Artemis Studio'],
            'space_types' => [],
            'amenities'   => [],
            'images'      => [],
            'rates'       => [],
        ];

        $this->roomRepository->method('findActiveRoomById')->with(1)->willReturn($mockDetail);

        $result = $this->roomService->getRoomDetail(1);
        $this->assertEquals('Artemis Phòng Cyclorama Trắng', $result['name']);
        $this->assertEquals(1, $result['room_id']);
    }

    public function testGetRoomDetailNotFound(): void
    {
        $this->roomRepository->method('findActiveRoomById')->with(999)->willReturn(null);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(404);

        $this->roomService->getRoomDetail(999);
    }

    public function testGetRoomCalendarSuccess(): void
    {
        $this->roomRepository->method('isRoomActive')->with(1)->willReturn(true);
        $this->roomRepository->method('getRoomBusySlots')
            ->willReturn([
                ['busy_start' => '2026-10-20 09:00:00', 'busy_end' => '2026-10-20 12:00:00'],
            ]);

        $result = $this->roomService->getRoomCalendar(1, '2026-10-20', '2026-10-25');

        $this->assertEquals(1, $result['room_id']);
        $this->assertEquals('2026-10-20', $result['from']);
        $this->assertEquals('2026-10-25', $result['to']);
        $this->assertCount(1, $result['busy_slots']);
        $this->assertArrayNotHasKey('customer_id', $result['busy_slots'][0]);
        $this->assertArrayNotHasKey('customer_name', $result['busy_slots'][0]);
    }

    public function testGetRoomCalendarRoomNotFound(): void
    {
        $this->roomRepository->method('isRoomActive')->with(3)->willReturn(false);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(404);

        $this->roomService->getRoomCalendar(3);
    }

    public function testGetRoomCalendarExceeds62Days(): void
    {
        $this->roomRepository->method('isRoomActive')->with(1)->willReturn(true);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->roomService->getRoomCalendar(1, '2026-10-01', '2026-12-15'); // 75 days > 62
    }

    public function testGetRoomCalendarFromAfterTo(): void
    {
        $this->roomRepository->method('isRoomActive')->with(1)->willReturn(true);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->roomService->getRoomCalendar(1, '2026-10-25', '2026-10-20');
    }

    public function testGetRoomRatesSuccess(): void
    {
        $this->roomRepository->method('isRoomActive')->with(1)->willReturn(true);
        $this->roomRepository->method('getActiveRatesByRoomId')->with(1)->willReturn([
            ['rate_id' => 1, 'rate_unit' => 'hour', 'unit_price' => 350000],
        ]);

        $result = $this->roomService->getRoomRates(1);
        $this->assertCount(1, $result);
        $this->assertEquals(350000, $result[0]['unit_price']);
    }

    public function testGetRoomRatesNotFound(): void
    {
        $this->roomRepository->method('isRoomActive')->with(3)->willReturn(false);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(404);

        $this->roomService->getRoomRates(3);
    }
}

