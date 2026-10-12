<?php

namespace App\Middlewares;

class CorsMiddleware
{
    /**
     * Handle CORS preflight and headers.
     */
    public static function handle(): void
    {
        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            header("Access-Control-Allow-Origin: http://localhost:3000");
        }

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 86400");

        // Handle preflight OPTIONS request
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit(0);
        }
    }
}
