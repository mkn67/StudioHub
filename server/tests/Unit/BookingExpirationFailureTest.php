<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Modules\Booking\BookingRepository;
use App\Modules\Booking\BookingService;
use PDO;
use PDOException;
use PHPUnit\Framework\TestCase;

final class BookingExpirationFailureTest extends TestCase
{
    public function testDatabaseFailureIsNotReportedAsNotDue(): void
    {
        $pdo = new FailingTransactionPdo();
        $repository = $this->createMock(BookingRepository::class);
        $repository->method('findBookingByIdForUpdate')->willThrowException(new PDOException('simulated database failure'));

        $service = new BookingService(null, $repository, $pdo);

        try {
            $service->expireIfDue(17, $pdo);
            $this->fail('Expiration storage errors must fail closed.');
        } catch (ApiException $exception) {
            $this->assertSame(500, $exception->getStatusCode());
            $this->assertSame('booking_expiration_failed', $exception->getErrorCode());
        }
        $this->assertTrue($pdo->rolledBack);
    }
}

final class FailingTransactionPdo extends PDO
{
    public bool $active = false;
    public bool $rolledBack = false;

    public function __construct()
    {
    }

    public function inTransaction(): bool
    {
        return $this->active;
    }

    public function exec(string $statement): int|false
    {
        return 0;
    }

    public function beginTransaction(): bool
    {
        $this->active = true;
        return true;
    }

    public function rollBack(): bool
    {
        $this->active = false;
        $this->rolledBack = true;
        return true;
    }
}
