<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Security;
final class Actor
{
    public function __construct(public readonly string $owner,public readonly string $role='guest',public readonly ?string $userId=null,public readonly bool $support=false, #[\SensitiveParameter] private readonly ?string $authorization=null) {}
    public function authenticated(): bool {return $this->userId!==null;}
    // Request-local credential. Never include Actor in model messages or persistence.
    public function authorization(): ?string {return $this->authorization;}
    public function __debugInfo(): array {return ['owner'=>$this->owner,'role'=>$this->role];}
    public function __serialize(): array {throw new \LogicException('Actor is request-local');}
}
