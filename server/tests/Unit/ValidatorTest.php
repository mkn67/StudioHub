<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Validator;
use App\Exceptions\ApiException;
use PHPUnit\Framework\TestCase;

class ValidatorTest extends TestCase
{
    public function testValidatorPassesValidData(): void
    {
        $data = [
            'email'    => 'test@studio.local',
            'capacity' => 10,
            'status'   => 'active',
            'created'  => '2026-10-12 18:00:00',
        ];

        $rules = [
            'email'    => 'required|email',
            'capacity' => 'required|int|min:1',
            'status'   => 'required|in:active,inactive',
            'created'  => 'required|datetime',
        ];

        $errors = Validator::validate($data, $rules);
        $this->assertEmpty($errors);
    }

    public function testValidatorDetectsErrorsAndReturnsStandardStructure(): void
    {
        $data = [
            'email'    => 'invalid-email-string',
            'capacity' => 0,
            'status'   => 'unknown_status',
        ];

        $rules = [
            'email'    => 'required|email',
            'name'     => 'required',
            'capacity' => 'required|int|min:1',
            'status'   => 'required|in:active,inactive',
        ];

        $errors = Validator::validate($data, $rules);

        $this->assertNotEmpty($errors);
        $this->assertCount(4, $errors);

        foreach ($errors as $err) {
            $this->assertArrayHasKey('field', $err);
            $this->assertArrayHasKey('code', $err);
            $this->assertArrayHasKey('message', $err);
        }
    }

    public function testAssertValidThrowsApiException(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        Validator::assertValid(['name' => ''], ['name' => 'required']);
    }
}

