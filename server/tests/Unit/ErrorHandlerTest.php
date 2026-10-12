<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\ErrorHandler;
use App\Exceptions\ApiException;
use Exception;
use PDOException;
use PHPUnit\Framework\TestCase;

class ErrorHandlerTest extends TestCase
{
    public function testFormatApiException(): void
    {
        $errors = [
            ['field' => 'email', 'code' => 'invalid_email', 'message' => 'Email sai định dạng']
        ];
        $e = new ApiException(400, 'validation_failed', 'Dữ liệu không hợp lệ', $errors);

        $formatted = ErrorHandler::formatException($e);

        $this->assertEquals(400, $formatted['status_code']);
        $this->assertEquals('validation_failed', $formatted['error_code']);
        $this->assertEquals('Dữ liệu không hợp lệ', $formatted['message']);
        $this->assertIsArray($formatted['errors']);
        $this->assertCount(1, $formatted['errors']);
        $this->assertEquals('email', $formatted['errors'][0]['field']);
    }

    public function testFormatTriggerRoomOccupiedPDOException(): void
    {
        $pdoException = new PDOException("SQLSTATE[45000]: <<Unknown error>>: 1644 ROOM_OCCUPIED");

        $formatted = ErrorHandler::formatException($pdoException);

        $this->assertEquals(409, $formatted['status_code']);
        $this->assertEquals('room_occupied', $formatted['error_code']);
        $this->assertIsArray($formatted['errors']);
        $this->assertNotEmpty($formatted['errors']);
        $this->assertEquals('room_occupied', $formatted['errors'][0]['code']);
    }

    public function testFormatGenericPDOExceptionDoesNotLeakDetails(): void
    {
        $pdoException = new PDOException("SELECT * FROM secret_table WHERE password = 'leak'");

        $formatted = ErrorHandler::formatException($pdoException);

        $this->assertEquals(500, $formatted['status_code']);
        $this->assertEquals('server_error', $formatted['error_code']);
        $this->assertStringNotContainsString('secret_table', $formatted['message']);
        $this->assertStringNotContainsString('password', $formatted['message']);
        $this->assertIsArray($formatted['errors']);
        $this->assertEmpty($formatted['errors']);
    }

    public function testFormatGenericExceptionDoesNotLeakStackTrace(): void
    {
        $genericException = new Exception("Critical internal server failure details");

        $formatted = ErrorHandler::formatException($genericException);

        $this->assertEquals(500, $formatted['status_code']);
        $this->assertEquals('server_error', $formatted['error_code']);
        $this->assertStringNotContainsString('Critical internal server', $formatted['message']);
        $this->assertIsArray($formatted['errors']);
        $this->assertEmpty($formatted['errors']);
    }
}

