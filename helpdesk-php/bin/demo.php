<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util,Failure};
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Security\Actor;
use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Agents\AgentService;
use StudioHub\Helpdesk\LLM\NineRouterClient;
$config=require dirname(__DIR__).'/bootstrap.php';
$options=getopt('',['draft','mock','scenario:']);
$draft=isset($options['draft']);$mock=isset($options['mock']);$scenario=$options['scenario']??'rag';
if($mock&&!$draft){fwrite(STDERR,"Mock demonstrations require explicit --draft and never run through HTTP.\n");exit(2);}
$cfg=new StudioHub\Helpdesk\Config($config->root,[
    'HELPDESK_DATABASE_URL'=>'sqlite:var/demo.sqlite',
    'NINEROUTER_BASE_URL'=>$config->get('NINEROUTER_BASE_URL'),'NINEROUTER_API_KEY'=>$config->get('NINEROUTER_API_KEY'),'NINEROUTER_MODEL'=>$config->get('NINEROUTER_MODEL')
]);
$store=new Store($cfg);$store->migrate(); // Dedicated disposable demo database ONLY.
$knowledge=new Repository(dirname($cfg->root).'/docs/helpdesk/knowledge/knowledge.v1.json',$cfg->path('config/approval-manifest.json'),$draft);
$http=new CurlTransport();$model=new NineRouterClient($cfg,$http);
$queries=['rag'=>'Tôi đến Studio trễ 30 phút thì có được cộng thêm giờ không?','rooms'=>'Tôi muốn tìm Studio chụp ảnh cho khoảng 5 người.','privacy'=>'Đơn SH-123 của người khác đã xác nhận chưa?','ticket'=>'Tôi đến Studio nhưng thiếu thiết bị đã thuê. Tôi muốn báo sự cố.','handoff'=>'/handoff','unsupported'=>'Hủy đơn và hoàn tiền ngay cho tôi.'];
if(!isset($queries[$scenario])){fwrite(STDERR,"Scenario: rag|rooms|privacy|ticket|handoff|unsupported\n");exit(2);}
if($mock){
    require dirname(__DIR__).'/tests/Support.php';
    $responses=match($scenario){
        'rag'=>[StudioHub\Helpdesk\Tests\call('search_knowledge',['query'=>$queries['rag']]),StudioHub\Helpdesk\Tests\finalPolicy(...)],
        'ticket'=>[StudioHub\Helpdesk\Tests\call('prepare_support_ticket',['category'=>'equipment','description'=>'Thiếu thiết bị đã thuê; cần kiểm tra tại Studio.']),['content'=>Util::json(['kind'=>'support'])]],
        default=>[['content'=>Util::json(['kind'=>'unsupported'])]]
    };
    $model=new StudioHub\Helpdesk\Tests\ScriptedModel($responses);
}
$service=new AgentService($cfg,$store,$knowledge,$model,new PublicCatalog($cfg,$http),$draft);
$actor=new Actor('demo:'.Util::id(),'guest');$id=$service->create([],$actor)['conversation']['id'];
try{
    $result=$service->send($id,['text'=>$queries[$scenario],'clientMessageId'=>Util::id()],$actor);
    if($scenario==='ticket'&&isset($result['response']['ticketProposal'])){
        // Demonstration-only identity attestation, never an HTTP bypass.
        $row=$store->get('helpdesk_conversations',$id);$c=json_decode($row['payload'],true);$c['verifiedContact']='SYNTHETIC DEMO CONTACT — not a real recipient';$store->put('helpdesk_conversations',$id,$c,['owner'=>$actor->owner]);
        if(in_array('--confirm-ticket',$argv,true)){
            $result['persistedTicket']=(new StudioHub\Helpdesk\Tickets\TicketService($store))->confirm(['conversationId'=>$id,'proposalId'=>$c['proposal']['id'],'clientMessageId'=>Util::id(),'confirmed'=>true],$actor);
        }
    }
    echo json_encode(['mode'=>$mock?'MOCK PROVIDER / CLI UNPUBLISHED EVALUATION':($draft?'LIVE PROVIDER / CLI UNPUBLISHED EVALUATION':'NORMAL APPROVED KNOWLEDGE'),'scenario'=>$scenario,'result'=>$result],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable$e){echo Util::json(['completed'=>false,'reason'=>$e instanceof Failure?$e->reason:'demo_failed'])."\n";exit(1);}
