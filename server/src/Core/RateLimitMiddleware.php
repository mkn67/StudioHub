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
        $clientIp = $this->clientIp();
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

    /**
     * Render terminates public traffic at its edge proxy, so Apache can see the
     * local proxy address instead of the visitor. Only accept the edge-provided
     * Cloudflare client IP header when the immediate peer is explicitly trusted.
     * Never trust forwarding headers from arbitrary clients.
     */
    private function clientIp(): string
    {
        $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $configured = $_ENV['RATE_LIMIT_TRUSTED_PROXY_IPS']
            ?? getenv('RATE_LIMIT_TRUSTED_PROXY_IPS')
            ?: '127.0.0.1,::1';
        $trustedProxies = array_filter(array_map('trim', explode(',', (string) $configured)));

        if (in_array($remoteAddress, $trustedProxies, true)) {
            $forwardedAddress = trim((string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));
            if (filter_var($forwardedAddress, FILTER_VALIDATE_IP) !== false) {
                return $forwardedAddress;
            }
        }

        return filter_var($remoteAddress, FILTER_VALIDATE_IP) !== false ? $remoteAddress : 'unknown';
    }

    private function configuredPositiveInt(mixed $value, int $default): int
    {
        $parsed = filter_var($value, FILTER_VALIDATE_INT);
        return $parsed !== false && $parsed > 0 ? $parsed : $default;
    }
}
