<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Security;
final class Actor
{
    public function __construct(public readonly string $owner,public readonly string $role='guest',public readonly ?string $userId=null,public readonly bool $support=false) {}
    public function authenticated(): bool {return $this->userId!==null;}
}
