<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Validator;
use App\Exceptions\ApiException;
use App\Modules\Auth\UserRepository;

class AuthService
{
    private UserRepository $userRepository;
    private JwtService $jwtService;

    public function __construct(?UserRepository $userRepository = null, ?JwtService $jwtService = null)
    {
        $this->userRepository = $userRepository ?? new UserRepository();
        $this->jwtService = $jwtService ?? new JwtService();
    }

    /**
     * Register a new customer account.
     * Rule: Always ignores client 'role' and assigns 'customer' (role_id = 3).
     *
     * @param array $input
     * @return array{token: string, user: array}
     * @throws ApiException
     */
    public function register(array $input): array
    {
        // 1. Validate input
        Validator::assertValid($input, [
            'full_name' => 'required|min:2|max:100',
            'email'     => 'required|email|max:150',
            'password'  => 'required|min:8',
            'phone'     => 'max:20',
        ]);

        $email = strtolower(trim($input['email']));

        // 2. Check email uniqueness
        if ($this->userRepository->isEmailTaken($email)) {
            throw new ApiException(
                409,
                'email_already_exists',
                'Email này đã được sử dụng trên hệ thống',
                [
                    [
                        'field'   => 'email',
                        'code'    => 'email_exists',
                        'message' => 'Địa chỉ email đã tồn tại',
                    ]
                ]
            );
        }

        // 3. Hash password and persist user (always customer role_id = 3)
        $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT);

        $userId = $this->userRepository->create([
            'role_id'       => 3, // Always customer
            'full_name'     => trim($input['full_name']),
            'email'         => $email,
            'password_hash' => $passwordHash,
            'phone'         => isset($input['phone']) && trim($input['phone']) !== '' ? trim($input['phone']) : null,
            'avatar_url'    => null,
            'status'        => 'active',
        ]);

        // 4. Generate JWT token
        $token = $this->jwtService->generate($userId, ['role' => 'customer']);

        return [
            'token' => $token,
            'user'  => [
                'user_id'    => $userId,
                'full_name'  => trim($input['full_name']),
                'email'      => $email,
                'phone'      => $input['phone'] ?? null,
                'avatar_url' => null,
                'role'       => 'customer',
            ],
        ];
    }

    /**
     * Authenticate user credentials and return JWT token.
     *
     * @param array $input
     * @return array{token: string, user: array}
     * @throws ApiException
     */
    public function login(array $input): array
    {
        Validator::assertValid($input, [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $email = strtolower(trim($input['email']));
        $user = $this->userRepository->findByEmail($email);

        // Same error for non-existent email and wrong password to prevent user enumeration
        if (!$user || !password_verify($input['password'], $user['password_hash'])) {
            throw new ApiException(
                401,
                'invalid_credentials',
                'Email hoặc mật khẩu không chính xác',
                [
                    [
                        'field'   => 'credentials',
                        'code'    => 'invalid_credentials',
                        'message' => 'Thông tin đăng nhập không hợp lệ',
                    ]
                ]
            );
        }

        // Account lock check
        if ($user['status'] === 'locked') {
            throw new ApiException(
                403,
                'account_locked',
                'Tài khoản của bạn đã bị khóa',
                [
                    [
                        'field'   => 'status',
                        'code'    => 'account_locked',
                        'message' => 'Vui lòng liên hệ quản trị viên để mở khóa tài khoản',
                    ]
                ]
            );
        }

        $token = $this->jwtService->generate((int) $user['user_id'], ['role' => $user['role']]);

        return [
            'token' => $token,
            'user'  => [
                'user_id'    => (int) $user['user_id'],
                'full_name'  => $user['full_name'],
                'email'      => $user['email'],
                'phone'      => $user['phone'],
                'avatar_url' => $user['avatar_url'],
                'role'       => $user['role'],
            ],
        ];
    }

    /**
     * Retrieve the profile of an authenticated user.
     *
     * @param int $userId
     * @return array
     * @throws ApiException
     */
    public function getProfile(int $userId): array
    {
        $user = $this->userRepository->findById($userId);

        if (!$user) {
            throw new ApiException(404, 'user_not_found', 'Người dùng không tồn tại');
        }

        if ($user['status'] === 'locked') {
            throw new ApiException(403, 'account_locked', 'Tài khoản của bạn đã bị khóa');
        }

        unset($user['password_hash']);

        return $user;
    }

    /**
     * Update user profile and optionally change password.
     *
     * @param int $userId
     * @param array $input
     * @return array
     * @throws ApiException
     */
    public function updateProfile(int $userId, array $input): array
    {
        $user = $this->userRepository->findById($userId);

        if (!$user) {
            throw new ApiException(404, 'user_not_found', 'Người dùng không tồn tại');
        }

        // Validate basic fields if provided
        Validator::assertValid($input, [
            'full_name'  => 'min:2|max:100',
            'phone'      => 'max:20',
            'avatar_url' => 'max:255',
        ]);

        $updateData = [];

        if (array_key_exists('full_name', $input) && trim((string) $input['full_name']) !== '') {
            $updateData['full_name'] = trim((string) $input['full_name']);
        }

        if (array_key_exists('phone', $input)) {
            $updateData['phone'] = trim((string) $input['phone']) !== '' ? trim((string) $input['phone']) : null;
        }

        if (array_key_exists('avatar_url', $input)) {
            $updateData['avatar_url'] = trim((string) $input['avatar_url']) !== '' ? trim((string) $input['avatar_url']) : null;
        }

        // Password change logic
        if (!empty($input['new_password'])) {
            if (empty($input['current_password'])) {
                throw new ApiException(
                    400,
                    'current_password_required',
                    'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu',
                    [
                        [
                            'field'   => 'current_password',
                            'code'    => 'required',
                            'message' => 'Mật khẩu hiện tại là bắt buộc',
                        ]
                    ]
                );
            }

            if (!password_verify((string) $input['current_password'], $user['password_hash'])) {
                throw new ApiException(
                    400,
                    'invalid_current_password',
                    'Mật khẩu hiện tại không chính xác',
                    [
                        [
                            'field'   => 'current_password',
                            'code'    => 'invalid_password',
                            'message' => 'Mật khẩu hiện tại không khớp',
                        ]
                    ]
                );
            }

            if (mb_strlen((string) $input['new_password']) < 8) {
                throw new ApiException(
                    400,
                    'password_too_short',
                    'Mật khẩu mới phải có ít nhất 8 ký tự',
                    [
                        [
                            'field'   => 'new_password',
                            'code'    => 'min_length',
                            'message' => 'Mật khẩu mới phải có tối thiểu 8 ký tự',
                        ]
                    ]
                );
            }

            $updateData['password_hash'] = password_hash((string) $input['new_password'], PASSWORD_BCRYPT);
        }

        if (!empty($updateData)) {
            $this->userRepository->update($userId, $updateData);
        }

        return $this->getProfile($userId);
    }
}

