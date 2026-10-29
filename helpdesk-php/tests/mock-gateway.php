<?php
declare(strict_types=1);
// Isolated HTTP test fixture, never included by the Helpdesk application.
header('Content-Type: application/json');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path==='/v1/models'){echo json_encode(['data'=>[['id'=>'fixture-only-tool-model']]]);exit;}
if($path!=='/v1/chat/completions'){http_response_code(404);echo '{}';exit;}
$body=json_decode(file_get_contents('php://input'),true);
$messages=$body['messages']??[];$last=end($messages);$tool=null;
foreach($messages as$m)if(($m['role']??'')==='tool')$tool=$m;
if($tool){
    $data=json_decode($tool['content'],true);$chunk=$data['data']['chunks'][0]??null;
    $content=$chunk?json_encode(['kind'=>'policy','claims'=>[['chunk_id'=>$chunk['chunk_id'],'text'=>$chunk['content']]]],JSON_UNESCAPED_UNICODE):json_encode(['kind'=>'unsupported']);
    $message=['role'=>'assistant','content'=>$content];
}else{
    $message=['role'=>'assistant','content'=>null,'tool_calls'=>[['id'=>'fixture_call_1','type'=>'function','function'=>['name'=>'search_knowledge','arguments'=>json_encode(['query'=>$last['content']??''])]]]];
}
echo json_encode(['choices'=>[['message'=>$message]],'usage'=>['total_tokens'=>7]],JSON_UNESCAPED_UNICODE);
