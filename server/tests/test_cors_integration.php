<?php

declare(strict_types=1);

// Run against a running API; sends only preflights, reads and invalid auth input.
// API_BASE_URL is the API origin, without /api.
$baseUrl = rtrim(getenv('API_BASE_URL') ?: 'http://127.0.0.1', '/');
$origins = explode(',', getenv('TEST_CORS_ORIGINS') ?: 'http://localhost:3000,http://127.0.0.1:3000');

foreach ($origins as $origin) {
    $origin = trim($origin);
    $cases = [
        ['OPTIONS', '/api/auth/register', 204, 'POST', 'Content-Type'],
        ['OPTIONS', '/api/auth/login', 204, 'POST', 'Content-Type'],
        ['OPTIONS', '/api/auth/profile', 204, 'PATCH', 'Content-Type, Authorization'],
        ['OPTIONS', '/api/bookings', 204, 'GET', 'Authorization'],
        ['POST', '/api/auth/register', 400, null, null],
        ['GET', '/api/auth/profile', 401, null, null],
        ['GET', '/api/does-not-exist', 404, null, null],
        ['DELETE', '/api/auth/register', 405, null, null],
    ];

    foreach ($cases as [$method, $path, $expectedStatus, $requestedMethod, $requestedHeaders]) {
        $headers = ['Origin: ' . $origin, 'Accept: application/json'];
        if ($requestedMethod !== null) {
            $headers[] = 'Access-Control-Request-Method: ' . $requestedMethod;
            $headers[] = 'Access-Control-Request-Headers: ' . $requestedHeaders;
        }
        if ($method === 'POST') {
            $headers[] = 'Content-Type: application/json';
        }
        $context = stream_context_create(['http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $method === 'POST' ? '{}' : '',
            'ignore_errors' => true,
            'timeout' => 10,
        ]]);
        $body = file_get_contents($baseUrl . $path, false, $context);
        $responseHeaders = $http_response_header ?? [];
        preg_match('/^HTTP\/\S+ (\d+)/', $responseHeaders[0] ?? '', $matches);
        $status = (int) ($matches[1] ?? 0);
        $corsOrigin = null;
        foreach ($responseHeaders as $header) {
            if (stripos($header, 'Access-Control-Allow-Origin:') === 0) {
                $corsOrigin = trim(substr($header, strlen('Access-Control-Allow-Origin:')));
            }
        }
        if ($body === false || $status !== $expectedStatus || $corsOrigin !== $origin) {
            fwrite(STDERR, "FAIL {$origin} {$method} {$path}: status={$status}, CORS=" . ($corsOrigin ?? 'missing') . "\n");
            exit(1);
        }
        if ($method === 'OPTIONS' && $body !== '') {
            fwrite(STDERR, "FAIL preflight must have an empty body\n");
            exit(1);
        }
        echo "PASS {$origin} {$method} {$path}: {$status}\n";
    }
}
