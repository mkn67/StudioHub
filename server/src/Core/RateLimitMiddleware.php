<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ApiException;

final class RateLimitMiddleware
{
    private readonly int $limit;
    private readonly int $windowSeconds;

    public function __construct(
        private readonly string $scope,
        ?int $limit = null,
        ?int $windowSeconds = null,
        private readonly ?RateLimitService $service = null
    ) {
        $prefix = strtoupper($scope);
        $configuredLimit = $_ENV[$prefix . '_RATE_LIMIT'] ?? getenv($prefix . '_RATE_LIMIT');
        $configuredWindow = $_ENV[$prefix . '_RATE_WINDOW_SECONDS'] ?? getenv($prefix . '_RATE_WINDOW_SECONDS');
        $this->limit = $limit ?? $this->configuredPositiveInt($configuredLimit, $scope === 'login' ? 10 : 60);
        $this->windowSeconds = $windowSeconds ?? $this->configuredPositiveInt($configuredWindow, $scope === 'login' ? 900 : 60);
    }

    public function handle(Request $request, callable $next): mixed
    {
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $result = ($this->service ?? new RateLimitService())->consume(
            $this->scope,
            (string) $clientIp,
            $this->limit,
            $this->windowSeconds
        );
        header('X-RateLimit-Limit: ' . $result['limit']);
        header('X-RateLimit-Remaining: ' . $result['remaining']);
        if (!$result['allowed']) {
            header('Retry-After: ' . $result['retry_after']);
            throw new ApiException(429, 'rate_limited', 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.', [
                ['field' => 'request', 'code' => 'rate_limited', 'message' => 'Too many requests for this endpoint'],
            ]);
        }
        return $next($request);
    }

    private function configuredPositiveInt(mixed $value, int $default): int
    {
        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        return $parsed !== false && $parsed > 0 ? $parsed : $default;
    }
}
