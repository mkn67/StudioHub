<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\ApiException;
use App\Services\BookingStateMachine;
use PHPUnit\Framework\TestCase;

class BookingStateMachineTest extends TestCase
{
    /**
     * Test all structurally valid transitions
     */
    public function testValidTransitions(): void
    {
        $validPairs = [
            ['pending', 'confirmed'],
            ['pending', 'rejected'],
            ['pending', 'cancelled'],
            ['pending', 'expired'],
            ['confirmed', 'checked_in'],
            ['confirmed', 'cancelled'],
            ['checked_in', 'completed'],
        ];

        foreach ($validPairs as [$from, $to]) {
            $this->assertTrue(
                BookingStateMachine::canTransition($from, $to),
                "Expected transition from {$from} to {$to} to be valid"
            );

            // Should not throw exception
            BookingStateMachine::assertCanTransition($from, $to);
        }
    }

    /**
     * Test all structurally invalid transitions
     */
    public function testInvalidTransitions(): void
    {
        $allStatuses = [
            'pending',
            'confirmed',
            'checked_in',
            'completed',
            'cancelled',
            'rejected',
            'expired',
        ];

        $validSet = [
            'pending->confirmed'   => true,
            'pending->rejected'    => true,
            'pending->cancelled'   => true,
            'pending->expired'     => true,
            'confirmed->checked_in' => true,
            'confirmed->cancelled' => true,
            'checked_in->completed' => true,
        ];

        foreach ($allStatuses as $from) {
            foreach ($allStatuses as $to) {
                $key = "{$from}->{$to}";
                if (isset($validSet[$key])) {
                    continue;
                }

                $this->assertFalse(
                    BookingStateMachine::canTransition($from, $to),
                    "Transition {$key} should NOT be allowed"
                );

                try {
                    BookingStateMachine::assertCanTransition($from, $to);
                    $this->fail("Expected assertCanTransition to throw for {$key}");
                } catch (ApiException $e) {
                    $this->assertSame(400, $e->getStatusCode());
                    $this->assertSame('invalid_status_transition', $e->getErrorCode());
                }
            }
        }
    }

    /**
     * Test terminal statuses have no outgoing transitions
     */
    public function testTerminalStatusesHaveNoTransitions(): void
    {
        $terminals = BookingStateMachine::getTerminalStatuses();
        $this->assertContains('completed', $terminals);
        $this->assertContains('cancelled', $terminals);
        $this->assertContains('rejected', $terminals);
        $this->assertContains('expired', $terminals);

        $allStatuses = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'expired'];

        foreach ($terminals as $terminal) {
            foreach ($allStatuses as $target) {
                $this->assertFalse(
                    BookingStateMachine::canTransition($terminal, $target),
                    "Terminal status {$terminal} should not be able to transition to {$target}"
                );
            }
        }
    }
}

