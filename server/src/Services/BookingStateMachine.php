<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ApiException;

class BookingStateMachine
{
    public const STATUS_PENDING    = 'pending';
    public const STATUS_CONFIRMED  = 'confirmed';
    public const STATUS_CHECKED_IN = 'checked_in';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_CANCELLED  = 'cancelled';
    public const STATUS_REJECTED   = 'rejected';
    public const STATUS_EXPIRED    = 'expired';

    /**
     * Map of valid transitions: from_status => array of allowed to_statuses
     */
    private const ALLOWED_TRANSITIONS = [
        self::STATUS_PENDING => [
            self::STATUS_CONFIRMED,
            self::STATUS_REJECTED,
            self::STATUS_CANCELLED,
            self::STATUS_EXPIRED,
        ],
        self::STATUS_CONFIRMED => [
            self::STATUS_CHECKED_IN,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_CHECKED_IN => [
            self::STATUS_COMPLETED,
        ],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
        self::STATUS_REJECTED  => [],
        self::STATUS_EXPIRED   => [],
    ];

    /**
     * Check if a transition from $from to $to is structurally valid.
     *
     * @param string $from
     * @param string $to
     * @return bool
     */
    public static function canTransition(string $from, string $to): bool
    {
        $allowed = self::ALLOWED_TRANSITIONS[$from] ?? null;
        if ($allowed === null) {
            return false;
        }

        return in_array($to, $allowed, true);
    }

    /**
     * Assert that transition is valid, or throw ApiException(400)
     *
     * @param string $from
     * @param string $to
     * @throws ApiException
     */
    public static function assertCanTransition(string $from, string $to): void
    {
        if (!self::canTransition($from, $to)) {
            throw new ApiException(
                400,
                'invalid_status_transition',
                "Không thể chuyển trạng thái đơn đặt phòng từ '{$from}' sang '{$to}'",
                [
                    [
                        'field'   => 'status',
                        'code'    => 'invalid_transition',
                        'message' => "Transition from '{$from}' to '{$to}' is not allowed",
                    ]
                ]
            );
        }
    }

    /**
     * Get all terminal (final) statuses
     *
     * @return string[]
     */
    public static function getTerminalStatuses(): array
    {
        return [
            self::STATUS_COMPLETED,
            self::STATUS_CANCELLED,
            self::STATUS_REJECTED,
            self::STATUS_EXPIRED,
        ];
    }
}

