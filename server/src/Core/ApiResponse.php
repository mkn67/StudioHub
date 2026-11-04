<?php

declare(strict_types=1);

namespace App\Core;

class ApiResponse
{
    /**
     * Send standard success JSON response
     *
     * @param mixed $data
     * @param string $message
     * @param int $code
     */
    public static function success(mixed $data = null, string $message = 'Success', int $code = 200): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($code);
        }

        echo json_encode([
            'status'  => 'success',
            'code'    => $code,
            'message' => $message,
            'data'    => $data,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit(0);
    }

    /**
     * Send 200 OK JSON response (alias for success)
     *
     * @param mixed $data
     * @param string $message
     */
    public static function ok(mixed $data = null, string $message = 'Success'): void
    {
        self::success($data, $message, 200);
    }

    /**
     * Send 201 Created JSON response
     *
     * @param mixed $data
     * @param string $message
     */
    public static function created(mixed $data = null, string $message = 'Created'): void
    {
        self::success($data, $message, 201);
    }

    /**
     * Send standard error JSON response
     *
     * @param int $statusCode HTTP status code
     * @param string $errorCode Machine-readable error code
     * @param string $message
     * @param array $errors List of field errors: [['field' => '...', 'code' => '...', 'message' => '...']]
     */
    public static function error(int $statusCode, string $errorCode, string $message, array $errors = []): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($statusCode);
        }

        echo json_encode([
            'status'  => 'error',
            'error_code' => $errorCode,
            'code'    => $statusCode,
            'message' => $message,
            'errors'  => $errors,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit(0);
    }
}

