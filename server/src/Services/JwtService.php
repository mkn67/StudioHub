<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Throwable;

class JwtService
{
    private string $secret;
    private string $algorithm;
    private int $ttl;

    public function __construct(?string $secret = null, string $algorithm = 'HS256', int $ttl = 7200)
    {
        $this->secret = $secret ?? $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: 'supersecretjwtkey_change_in_production_min32chars';
        $this->algorithm = $algorithm;
        $this->ttl = $ttl; // 2 hours
    }

    /**
     * Generate a signed JWT token
     *
     * @param int $userId
     * @param array $extraClaims
     * @param int|null $customTtl
     * @return string
     */
    public function generate(int $userId, array $extraClaims = [], ?int $customTtl = null): string
    {
        $now = time();
        $ttl = $customTtl ?? $this->ttl;

        $payload = array_merge($extraClaims, [
            'sub' => $userId,
            'iat' => $now,
            'exp' => $now + $ttl,
        ]);

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Verify and decode a JWT token.
     *
     * @param string $token
     * @return array Decoded payload as associative array
     * @throws ApiException
     */
    public function verify(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return (array) $decoded;
        } catch (Throwable $e) {
            throw new ApiException(
                401,
                'unauthorized',
                'Token không hợp lệ hoặc đã hết hạn',
                [
                    [
                        'field'   => 'token',
                        'code'    => 'invalid_token',
                        'message' => $e->getMessage(),
                    ]
                ],
                $e
            );
        }
    }
}

