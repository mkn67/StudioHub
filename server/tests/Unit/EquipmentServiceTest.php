<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Modules\Equipment\EquipmentRepository;
use App\Modules\Equipment\EquipmentService;
use PHPUnit\Framework\TestCase;

class EquipmentServiceTest extends TestCase
{
    private EquipmentRepository $equipmentRepository;
    private EquipmentService $equipmentService;

    protected function setUp(): void
    {
        $this->equipmentRepository = $this->createMock(EquipmentRepository::class);
        $this->equipmentService = new EquipmentService($this->equipmentRepository);
    }

    public function testGetEquipmentsSuccess(): void
    {
        $this->equipmentRepository->method('isStudioActive')->with(1)->willReturn(true);
        $this->equipmentRepository->expects($this->once())
            ->method('getActiveEquipmentsByStudio')
            ->with(1, null)
            ->willReturn([
                [
                    'equipment_id'  => 1,
                    'studio_id'     => 1,
                    'category_id'   => 1,
                    'category_name' => 'Đèn & Nguồn Sáng',
                    'name'          => 'Đèn Godox AD600 Pro',
                    'unit_price'    => 50000,
                    'pricing_unit'  => 'hour',
                ],
            ]);

        $result = $this->equipmentService->getEquipments(['studio_id' => '1']);

        $this->assertCount(1, $result);
        $this->assertEquals('Đèn Godox AD600 Pro', $result[0]['name']);
        $this->assertEquals('Đèn & Nguồn Sáng', $result[0]['category_name']);
    }

    public function testGetEquipmentsWithCategoryId(): void
    {
        $this->equipmentRepository->method('isStudioActive')->with(1)->willReturn(true);
        $this->equipmentRepository->expects($this->once())
            ->method('getActiveEquipmentsByStudio')
            ->with(1, 2)
            ->willReturn([]);

        $result = $this->equipmentService->getEquipments(['studio_id' => 1, 'category_id' => 2]);
        $this->assertIsArray($result);
    }

    public function testGetEquipmentsMissingStudioId(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->equipmentService->getEquipments([]);
    }

    public function testGetEquipmentsInvalidStudioId(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->equipmentService->getEquipments(['studio_id' => '-5']);
    }

    public function testGetEquipmentsStudioNotFound(): void
    {
        $this->equipmentRepository->method('isStudioActive')->with(999)->willReturn(false);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(404);

        $this->equipmentService->getEquipments(['studio_id' => 999]);
    }

    public function testGetEquipmentsInvalidCategoryId(): void
    {
        $this->equipmentRepository->method('isStudioActive')->with(1)->willReturn(true);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->equipmentService->getEquipments(['studio_id' => 1, 'category_id' => 'abc']);
    }
}
