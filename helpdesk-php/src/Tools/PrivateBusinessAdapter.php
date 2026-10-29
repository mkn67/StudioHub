<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tools;
use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Security\Actor;
final class PrivateBusinessAdapter
{
    public const CONTRACTS = [
        'get_my_booking'=>['input'=>['bookingId'=>'string'],'output'=>['bookingStatus'=>'string','ownedByCurrentActor'=>'boolean'],'required'=>'server-verified current-user booking HTTP API'],
        'get_booking_payment'=>['input'=>['bookingId'=>'string'],'output'=>['paymentStatus'=>'string'],'required'=>'scoped current-user payment HTTP API'],
        'get_refund_status'=>['input'=>['bookingId'=>'string'],'output'=>['refundStatus'=>'string'],'required'=>'scoped current-user refund HTTP API'],
        'check_room_availability'=>['input'=>['roomId'=>'integer','from'=>'ISO8601','to'=>'ISO8601'],'output'=>['available'=>'boolean','checkedAt'=>'ISO8601'],'required'=>'complete availability evaluator, not busy calendar']
    ];
    public function enabled(string $name): bool {return false;}
    public function execute(string $name,array $arguments,Actor $actor): never
    {
        if(!$actor->authenticated())throw new Failure('authentication_required',401);
        // No missing business endpoint is guessed; no arbitrary SQL or fixture fallback.
        throw new Failure('live_api_unavailable',503);
    }
}
