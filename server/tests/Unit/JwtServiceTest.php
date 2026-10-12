<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Services\JwtService;
use PHPUnit\Framework\TestCase;

class JwtServiceTest extends TestCase
{
    private JwtService $jwtService;
    private string $secret = 'test_secret_key_minimum_32_characters_long';

    protected function setUp(): void
    {
        $this->jwtService = new JwtService($this->secret, 'HS256', 3600);
    }

    public function testGenerateAndVerifyValidToken(): void
    {
        $userId = 42;
        $token = $this->jwtService->generate($userId, ['role' => 'customer']);

        $this->assertIsString($token);
        $this->assertNotEmpty($token);

        $payload = $this->jwtService->verify($token);

        $this->assertEquals($userId, $payload['sub']);
        $this->assertEquals('customer', $payload['role']);
        $this->assertArrayHasKey('iat', $payload);
        $this->assertArrayHasKey('exp', $payload);
        $this->assertGreaterThan(time(), $payload['exp']);
    }

    public function testExpiredTokenThrows401ApiException(): void
    {
        // Generate a token with TTL = -10 seconds (expired in the past)
        $token = $this->jwtService->generate(42, [], -10);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(401);

        try {
            $this->jwtService->verify($token);
        } catch (ApiException $e) {
            $this->assertEquals(401, $e->getStatusCode());
            $this->assertEquals('unauthorized', $e->getErrorCode());
            $this->assertIsArray($e->getErrors());
            throw $e;
        }
    }

    public function testCorruptedTokenThrows401ApiException(): void
    {
        $token = $this->jwtService->generate(42);
        $tamperedToken = $token . 'corrupted';

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(401);

        $this->jwtService->verify($tamperedToken);
    }

    public function testWrongSecretSignatureThrows401ApiException(): void
    {
        $otherService = new JwtService('completely_different_secret_key_here', 'HS256', 3600);
        $token = $otherService->generate(42);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(401);

        $this->jwtService->verify($token);
    }
}
