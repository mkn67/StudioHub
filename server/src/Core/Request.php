<?php

declare(strict_types=1);

namespace App\Core;

class Request
{
    private string $method;
    private string $uri;
    private array $queryParams;
    private ?array $jsonBody = null;
    private array $headers;
    private array $attributes = [];

    public function __construct(
        string $method = 'GET',
        string $uri = '/',
        array $queryParams = [],
        ?array $jsonBody = null,
        array $headers = []
    ) {
        $this->method = strtoupper($method);
        $this->uri = $uri;
        $this->queryParams = $queryParams;
        $this->jsonBody = $jsonBody;
        $this->headers = $headers;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        if (false !== $pos = strpos($uri, '?')) {
            $uri = substr($uri, 0, $pos);
        }
        $uri = rawurldecode($uri);
        $uri = rtrim($uri, '/');
        if ($uri === '') {
            $uri = '/';
        }

        // Parse headers
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$name] = (string) $value;
            } elseif ($key === 'CONTENT_TYPE') {
                $headers['content-type'] = (string) $value;
            } elseif ($key === 'CONTENT_LENGTH') {
                $headers['content-length'] = (string) $value;
            }
        }

        return new self($method, $uri, $_GET, null, $headers);
    }

    public function method(): string
    {
        return $this->method;
    }

    public function uri(): string
    {
        return $this->uri;
    }

    public function query(?string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $this->queryParams;
        }

        return $this->queryParams[$key] ?? $default;
    }

    public function json(): array
    {
        if ($this->jsonBody !== null) {
            return $this->jsonBody;
        }

        $input = file_get_contents('php://input');
        if ($input === false || trim($input) === '') {
            $this->jsonBody = [];
            return $this->jsonBody;
        }

        $decoded = json_decode($input, true);
        if (!is_array($decoded)) {
            $this->jsonBody = [];
            return $this->jsonBody;
        }

        $this->jsonBody = $decoded;
        return $this->jsonBody;
    }

    public function body(?string $key = null, mixed $default = null): mixed
    {
        $data = $this->json();
        if (empty($data) && !empty($_POST)) {
            $data = $_POST;
        }

        if ($key === null) {
            return $data;
        }

        return $data[$key] ?? $default;
    }

    public function headers(): array
    {
        return $this->headers;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        $normalized = strtolower($name);
        return $this->headers[$normalized] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $authHeader = $this->header('authorization');
        if ($authHeader === null) {
            // Also check Apache REDIRECT_HTTP_AUTHORIZATION or $_SERVER
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        }

        if ($authHeader === null || !preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            return null;
        }

        return $matches[1];
    }

    public function setAttribute(string $key, mixed $value): void
    {
        $this->attributes[$key] = $value;
    }

    public function getAttribute(string $key, mixed $default = null): mixed
    {
        return $this->attributes[$key] ?? $default;
    }

    public function user(): ?array
    {
        return $this->getAttribute('user');
    }
}

