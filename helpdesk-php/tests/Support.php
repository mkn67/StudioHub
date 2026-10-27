<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tests;
use StudioHub\Helpdesk\{Config,Failure,Util};
use StudioHub\Helpdesk\Http\Transport;
use StudioHub\Helpdesk\LLM\LanguageModel;
final class FakeTransport implements Transport
{
    public array $requests=[];
    public function __construct(private array $responses) {}
    public function request(string $method,string $url,array $headers,?array $body,float $timeout): array
    {
        $this->requests[]=compact('method','url','body','timeout');
        $r=array_shift($this->responses);if($r instanceof \Throwable)throw $r;
        if(!is_array($r))throw new \RuntimeException('Unexpected HTTP call');return $r+['headers'=>[]];
    }
}
final class ScriptedModel implements LanguageModel
{
    public int $calls=0;
    public function __construct(private array $responses) {}
    public function complete(array $messages,array $tools,float $deadline,mixed $toolChoice='auto'): array
    {
        $this->calls++;$r=array_shift($this->responses);
        if($r instanceof \Throwable)throw $r;
        if(is_callable($r))$r=$r($messages,$tools);
        if(!is_array($r))throw new \RuntimeException('Unexpected model call');
        return ['message'=>['role'=>'assistant','content'=>$r['content']??'','tool_calls'=>$r['tool_calls']??[]],'usage'=>['total_tokens'=>1]];
    }
}
function config(array $values=[]): Config
{
    return new Config(dirname(__DIR__),$values+['HELPDESK_DATABASE_URL'=>'sqlite::memory:','HELPDESK_BRIDGE_SECRET'=>str_repeat('test-only-',5),'NINEROUTER_BASE_URL'=>'http://127.0.0.1:20128/v1','NINEROUTER_API_KEY'=>'test-only-key','NINEROUTER_MODEL'=>'test-model-not-a-live-id','STUDIOHUB_API_BASE_URL'=>'http://127.0.0.1:8000/api']);
}
function call(string $name,array $arguments,string $id='call_1'): array
{return ['tool_calls'=>[['id'=>$id,'type'=>'function','function'=>['name'=>$name,'arguments'=>Util::json($arguments)]]]];}
function finalPolicy(array $messages,array $tools): array
{
    $tool=json_decode($messages[array_key_last($messages)]['content'],true);
    $c=$tool['data']['chunks'][0]??null;
    if(!$c)return ['content'=>Util::json(['kind'=>'unsupported'])];
    return ['content'=>Util::json(['kind'=>'policy','claims'=>[['chunk_id'=>$c['chunk_id'],'text'=>$c['content']]]])];
}
