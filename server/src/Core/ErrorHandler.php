<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ApiException;
use PDOException;
use Throwable;

class ErrorHandler
{
    /**
     * Map any exception into a standard response payload
     *
     * @param Throwable $e
     * @return array{status_code: int, error_code: string, message: string, errors: array}
     */
    public static function formatException(Throwable $e): array
    {
        if ($e instanceof ApiException) {
            $errors = $e->getErrors();
            if ($errors === []) {
                $errors = [[
                    'field'   => '',
                    'code'    => $e->getErrorCode(),
                    'message' => $e->getMessage(),
                ]];
            }
            return [
                'status_code' => $e->getStatusCode(),
                'error_code'  => $e->getErrorCode(),
                'message'     => $e->getMessage(),
                'errors'      => $errors,
            ];
        }

        if ($e instanceof PDOException) {
            $code = $e->getCode();
            $msg = $e->getMessage();

            // SQLSTATE 45000 from triggers
            if ($code === '45000' || str_contains($msg, 'ROOM_OCCUPIED')) {
                return [
                    'status_code' => 409,
                    'error_code'  => 'room_occupied',
                    'message'     => 'Phòng đã có người đặt trong khoảng thời gian này',
                    'errors'      => [
                        [
                            'field'   => 'time',
                            'code'    => 'room_occupied',
                            'message' => 'Khung giờ này đã bị chiếm dụng',
                        ]
                    ],
                ];
            }

            // Log detailed error internally, never expose to client
            error_log("[Database Error] " . $msg);

            return [
                'status_code' => 500,
                'error_code'  => 'server_error',
                'message'     => 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
                'errors'      => [],
            ];
        }

        // Generic unexpected exception
        error_log("[Internal Error] " . $e->getMessage() . "\n" . $e->getTraceAsString());

        return [
            'status_code' => 500,
            'error_code'  => 'server_error',
            'message'     => 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
            'errors'      => [],
        ];
    }

    /**
     * Handle uncaught exception and output standard JSON envelope
     */
    public static function handleException(Throwable $e): void
    {
        $payload = self::formatException($e);
        ApiResponse::error(
            $payload['status_code'],
            $payload['error_code'],
            $payload['message'],
            $payload['errors']
        );
    }

    /**
     * Convert PHP errors/warnings to ErrorException
     */
    public static function handleError(int $level, string $message, string $file = '', int $line = 0): bool
    {
        if (!(error_reporting() & $level)) {
            return false;
        }

        throw new \ErrorException($message, 0, $level, $file, $line);
    }

    /**
     * Register global error and exception handlers
     */
    public static function register(): void
    {
        set_exception_handler([self::class, 'handleException']);
        set_error_handler([self::class, 'handleError']);
    }
}

