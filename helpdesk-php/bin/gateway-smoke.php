<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util,Failure};
use StudioHub\Helpdesk\LLM\NineRouterClient;
use StudioHub\Helpdesk\Http\CurlTransport;
$config=require dirname(__DIR__).'/bootstrap.php';
$file=$config->path('var/gateway-verified.json');
if(is_file($file))unlink($file);
try{
    $client=new NineRouterClient($config,new CurlTransport());$ids=$client->models();
    if(in_array('--models',$argv,true)){echo Util::json(['availableModels'=>$ids])."\n";exit;}
    $model=$config->get('NINEROUTER_MODEL');if(!in_array($model,$ids,true))throw new Failure('configured_model_not_available',503);
    $simple=$client->complete([['role'=>'user','content'=>'Reply OK.']],[],microtime(true)+30);
    if(!$simple['message']['content'])throw new Failure('chat_probe_failed',503);
    $tools=[['type'=>'function','function'=>['name'=>'capability_probe','description'=>'Return the probe nonce.','parameters'=>['type'=>'object','properties'=>['nonce'=>['type'=>'string']],'required'=>['nonce'],'additionalProperties'=>false]]]];
    $nonce=bin2hex(random_bytes(8));$messages=[['role'=>'user','content'=>'Call capability_probe exactly once with nonce '.$nonce.'.']];
    $probe=$client->complete($messages,$tools,microtime(true)+30,['type'=>'function','function'=>['name'=>'capability_probe']]);
    $calls=$probe['message']['tool_calls'];
    if(count($calls)!==1||$calls[0]['function']['name']!=='capability_probe'||(json_decode($calls[0]['function']['arguments'],true)['nonce']??'')!==$nonce)throw new Failure('tool_calling_incompatible',503);
    $messages[]=$probe['message'];$messages[]=['role'=>'tool','tool_call_id'=>$calls[0]['id'],'content'=>Util::json(['nonce'=>$nonce])];
    $messages[]=['role'=>'user','content'=>'Return the nonce from the tool in your final text; do not call tools again.'];
    $final=$client->complete($messages,[],microtime(true)+30);
    if(!str_contains($final['message']['content'],$nonce))throw new Failure('tool_roundtrip_incompatible',503);
    file_put_contents($file,Util::json(['fingerprint'=>$config->gatewayFingerprint(),'expires'=>time()+86400,'tool_roundtrip'=>true]),LOCK_EX);
    echo Util::json(['models_reachable'=>true,'configured_model_available'=>true,'chat'=>true,'tool_roundtrip'=>true,'usage'=>$final['usage']])."\n";
}catch(Throwable $e){echo Util::json(['verified'=>false,'reason'=>$e instanceof Failure?$e->reason:'connectivity_check_failed'])."\n";exit(1);}
