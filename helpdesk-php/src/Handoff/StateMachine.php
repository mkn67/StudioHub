<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Handoff;
use StudioHub\Helpdesk\Failure;
final class StateMachine
{
    public static function transition(string $from,string $action,bool $operator): string
    {
        if(in_array($action,['activate','resume','resolve'],true)&&!$operator)throw new Failure('support_permission_required',403);
        return match($from.':'.$action) {
            'bot_active:request','resolved:request'=>'handoff_requested',
            'handoff_requested:queue'=>'human_pending',
            'human_pending:activate'=>'human_active',
            'human_active:resume','human_pending:resume','resolved:resume'=>'bot_active',
            'human_active:resolve','human_pending:resolve'=>'resolved',
            default=>throw new Failure('invalid_handoff_transition',409)
        };
    }
}
