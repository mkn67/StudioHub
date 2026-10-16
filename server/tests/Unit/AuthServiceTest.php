<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Repositories\UserRepository;
use App\Services\AuthService;
use App\Services\JwtService;
use PHPUnit\Framework\TestCase;

class AuthServiceTest extends TestCase
{
    private UserRepository $userRepository;
    private JwtService $jwtService;
    private AuthService $authService;

    protected function setUp(): void
    {
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->jwtService = new JwtService('test_secret_key_minimum_32_characters_long', 'HS256', 3600);
        $this->authService = new AuthService($this->userRepository, $this->jwtService);
    }

    public function testRegisterSuccess(): void
    {
        $input = [
            'full_name' => 'Nguyễn Văn A',
            'email'     => 'vana@test.local',
            'password'  => 'password123',
            'phone'     => '0912345678',
        ];

        $this->userRepository->method('isEmailTaken')->with('vana@test.local')->willReturn(false);
        $this->userRepository->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data) {
                return $data['role_id'] === 3 // Must be customer
                    && $data['email'] === 'vana@test.local'
                    && password_verify('password123', $data['password_hash']);
            }))
            ->willReturn(10);

        $result = $this->authService->register($input);

        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
        $this->assertEquals(10, $result['user']['user_id']);
        $this->assertEquals('customer', $result['user']['role']);
        $this->assertArrayNotHasKey('password_hash', $result['user']);
    }

    public function testRegisterIgnoresClientRole(): void
    {
        // Client sends role = 'admin' (T6)
        $input = [
            'full_name' => 'Hacker Admin',
            'email'     => 'hacker@test.local',
            'password'  => 'password123',
            'role'      => 'admin',
        ];

        $this->userRepository->method('isEmailTaken')->willReturn(false);
        $this->userRepository->expects($this->once())
            ->method('create')
            ->with($this->callback(function (array $data) {
                return $data['role_id'] === 3; // Must be customer, not admin!
            }))
            ->willReturn(11);

        $result = $this->authService->register($input);

        $this->assertEquals('customer', $result['user']['role']);
    }

    public function testRegisterDuplicateEmailThrows409(): void
    {
        $input = [
            'full_name' => 'Nguyễn Văn B',
            'email'     => 'duplicate@test.local',
            'password'  => 'password123',
        ];

        $this->userRepository->method('isEmailTaken')->with('duplicate@test.local')->willReturn(true);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(409);

        try {
            $this->authService->register($input);
        } catch (ApiException $e) {
            $this->assertEquals('email_already_exists', $e->getErrorCode());
            $this->assertNotEmpty($e->getErrors());
            throw $e;
        }
    }

    public function testRegisterShortPasswordThrows400(): void
    {
        $input = [
            'full_name' => 'Nguyễn Văn C',
            'email'     => 'vanc@test.local',
            'password'  => '12345', // < 8 characters
        ];

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->authService->register($input);
    }

    public function testLoginSuccess(): void
    {
        $input = [
            'email'    => 'host1@studio.local',
            'password' => 'password123',
        ];

        $this->userRepository->method('findByEmail')->with('host1@studio.local')->willReturn([
            'user_id'       => 2,
            'role_id'       => 2,
            'role'          => 'host',
            'full_name'     => 'Nguyễn Hoàng Nam (Artemis)',
            'email'         => 'host1@studio.local',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'phone'         => '0901234567',
            'avatar_url'    => null,
            'status'        => 'active',
        ]);

        $result = $this->authService->login($input);

        $this->assertArrayHasKey('token', $result);
        $this->assertEquals(2, $result['user']['user_id']);
        $this->assertEquals('host', $result['user']['role']);
    }

    public function testLoginInvalidEmailThrows401(): void
    {
        $input = [
            'email'    => 'unknown@studio.local',
            'password' => 'password123',
        ];

        $this->userRepository->method('findByEmail')->willReturn(null);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(401);

        try {
            $this->authService->login($input);
        } catch (ApiException $e) {
            $this->assertEquals('invalid_credentials', $e->getErrorCode());
            throw $e;
        }
    }

    public function testLoginWrongPasswordThrows401(): void
    {
        $input = [
            'email'    => 'host1@studio.local',
            'password' => 'wrongpassword',
        ];

        $this->userRepository->method('findByEmail')->willReturn([
            'user_id'       => 2,
            'role_id'       => 2,
            'role'          => 'host',
            'full_name'     => 'Host 1',
            'email'         => 'host1@studio.local',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'status'        => 'active',
        ]);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(401);

        $this->authService->login($input);
    }

    public function testLoginLockedAccountThrows403(): void
    {
        $input = [
            'email'    => 'locked@studio.local',
            'password' => 'password123',
        ];

        $this->userRepository->method('findByEmail')->willReturn([
            'user_id'       => 5,
            'role_id'       => 3,
            'role'          => 'customer',
            'full_name'     => 'Locked User',
            'email'         => 'locked@studio.local',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'status'        => 'locked',
        ]);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(403);

        try {
            $this->authService->login($input);
        } catch (ApiException $e) {
            $this->assertEquals('account_locked', $e->getErrorCode());
            throw $e;
        }
    }

    public function testUpdateProfileWrongCurrentPasswordThrows400(): void
    {
        $this->userRepository->method('findById')->with(4)->willReturn([
            'user_id'       => 4,
            'role'          => 'customer',
            'full_name'     => 'Customer',
            'email'         => 'customer@studio.local',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'status'        => 'active',
        ]);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->authService->updateProfile(4, [
            'current_password' => 'incorrectpassword',
            'new_password'     => 'newpassword123',
        ]);
    }

    public function testUpdateProfileShortNewPasswordThrows400(): void
    {
        $this->userRepository->method('findById')->with(4)->willReturn([
            'user_id'       => 4,
            'role'          => 'customer',
            'full_name'     => 'Customer',
            'email'         => 'customer@studio.local',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'status'        => 'active',
        ]);

        $this->expectException(ApiException::class);
        $this->expectExceptionCode(400);

        $this->authService->updateProfile(4, [
            'current_password' => 'password123',
            'new_password'     => 'short', // < 8 characters
        ]);
    }
}

