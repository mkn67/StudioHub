<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Http;
interface Transport
{
    /** @return array{status:int,body:array,headers:array} */
    public function request(string $method, string $url, array $headers, ?array $body, float $timeout): array;
}
