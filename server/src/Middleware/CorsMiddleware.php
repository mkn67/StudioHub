<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;

class CorsMiddleware
{
    /**
     * Handle CORS headers and OPTIONS preflight
     */
    public function handle(Request $request, callable $next): mixed
    {
        $allowedOriginsStr = $_ENV['ALLOWED_ORIGINS'] ?? getenv('ALLOWED_ORIGINS') ?: 'http://localhost:3000,http://127.0.0.1:3000';
        $allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
        header('Vary: Origin');

        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key");
        header("Access-Control-Max-Age: 86400");

        if ($request->method() === 'OPTIONS') {
            http_response_code(204);
            exit(0);
        }

        return $next($request);
    }
}

