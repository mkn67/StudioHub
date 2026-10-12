<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Throwable;

class ApiException extends Exception
{
    private int $statusCode;
    private string $errorCode;
    private array $errors;

    /**
     * @param int $statusCode HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
     * @param string $errorCode Machine-readable error code string (e.g. 'validation_failed', 'unauthorized')
     * @param string $message Human-readable message
     * @param array $errors Array of detailed error objects [['field' => '...', 'code' => '...', 'message' => '...']]
     * @param Throwable|null $previous
     */
    public function __construct(
        int $statusCode,
        string $errorCode,
        string $message,
        array $errors = [],
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->errors = $errors;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}

