<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util,Failure};
use StudioHub\Helpdesk\Persistence\Store;
$config=require dirname(__DIR__).'/bootstrap.php';
$id='';foreach($argv as $arg)if(str_starts_with($arg,'--conversation='))$id=substr($arg,15);
try {
    $id=Util::uuid($id);$store=new Store($config);
    $expression=$store->driver()==='mysql'?"JSON_UNQUOTE(JSON_EXTRACT(payload, '$.conversationId'))":"json_extract(payload, '$.conversationId')";
    $stmt=$store->db->prepare("SELECT payload FROM helpdesk_records WHERE kind='agent_run' AND {$expression}=? AND expires>? LIMIT 20");
    $stmt->execute([$id,time()]);$runs=[];
    foreach($stmt->fetchAll() as $row) {
        $run=json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR);
        $tools=[];foreach($run['tools']??[] as $tool)$tools[]=['tool'=>$tool['tool']??'unknown','outcome'=>$tool['outcome']??'unknown'];
        $runs[]=['outcome'=>$run['outcome']??'unknown','tools'=>$tools];
    }
    // CLI metadata only: no chat text, arguments, tool results, owner or credentials.
    echo Util::json(['runs'=>$runs]).PHP_EOL;
}catch(Throwable $e) {
    echo Util::json(['reason'=>$e instanceof Failure?$e->reason:'trace_check_failed']).PHP_EOL;exit(1);
}
