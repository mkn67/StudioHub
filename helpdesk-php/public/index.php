<?php
declare(strict_types=1);
ini_set('display_errors','0');
use StudioHub\Helpdesk\{Application,Failure,Util};
$config=require dirname(__DIR__).'/bootstrap.php';
$requestId=Util::id();header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Request-Id: '.$requestId);
try {
    $method=$_SERVER['REQUEST_METHOD']??'GET';$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);
    if($method==='GET'&&$path==='/health'){echo Util::json(['status'=>'success','code'=>200,'message'=>'OK','data'=>['service'=>'helpdesk','mode'=>'connected']]);exit;}
    if(!is_string($path)||str_contains($path,'%')||strlen($path)>256)throw new Failure('invalid_path');
    $headers=[];foreach(getallheaders()as$k=>$v)$headers[strtolower($k)]=$v;
    $body=[];
    if($method==='POST'){
        if(!str_starts_with(strtolower($headers['content-type']??''),'application/json'))throw new Failure('unsupported_media_type',415);
        if((int)($headers['content-length']??0)>8192)throw new Failure('payload_too_large',413);
        $raw=file_get_contents('php://input',false,null,0,8193);
        if($raw===false||strlen($raw)>8192)throw new Failure('payload_too_large',413);
        try{$body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(JsonException){throw new Failure('invalid_json');}
        if(!is_array($body)||!str_starts_with(ltrim($raw),'{'))throw new Failure('invalid_json');
    }elseif($method!=='GET')throw new Failure('method_not_allowed',405);
    [$status,$data]=(new Application($config))->dispatch($method,$path,$headers,$body,$_GET,$_SERVER['REMOTE_ADDR']??'unknown');
    http_response_code($status);echo Util::json(['status'=>'success','code'=>$status,'message'=>'OK','data'=>$data]);
}catch(Throwable $e){
    $reason=$e instanceof Failure?$e->reason:($e instanceof PDOException?'storage_unavailable':'internal_error');
    $status=$e instanceof Failure?$e->status:503;
    error_log(Util::json(['requestId'=>$requestId,'reason'=>$reason]));http_response_code($status);
    if(in_array($status,[409,429],true))header('Retry-After: 2');
    echo Util::json(['status'=>'error','code'=>$status,'message'=>'Không thể xử lý yêu cầu lúc này.','errors'=>[['field'=>'','code'=>$reason,'message'=>'Yêu cầu chưa hoàn tất.']]]);
}
