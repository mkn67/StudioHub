<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Config,Util};
use StudioHub\Helpdesk\LLM\NineRouterClient;
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Persistence\Store;
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Agents\AgentService;
use StudioHub\Helpdesk\Security\Actor;
require dirname(__DIR__).'/bootstrap.php';
$cfg=new Config(dirname(__DIR__),['HELPDESK_DATABASE_URL'=>'sqlite::memory:','NINEROUTER_BASE_URL'=>'http://127.0.0.1:18011/v1','NINEROUTER_API_KEY'=>'fixture-only-key','NINEROUTER_MODEL'=>'fixture-only-tool-model']);
$http=new CurlTransport();$client=new NineRouterClient($cfg,$http);$models=$client->models();
if($models!==['fixture-only-tool-model'])throw new RuntimeException('HTTP models fixture failed');
$store=new Store($cfg);$store->migrate();$knowledge=new Repository(dirname($cfg->root).'/docs/helpdesk/knowledge/knowledge.v1.json',$cfg->path('config/approval-manifest.json'),true);
$agent=new AgentService($cfg,$store,$knowledge,$client,new PublicCatalog($cfg,$http),true);$actor=new Actor('fixture:guest');$id=$agent->create([],$actor)['conversation']['id'];
$r=$agent->send($id,['text'=>'Tôi đến Studio trễ 30 phút thì có được cộng thêm giờ không?','clientMessageId'=>Util::id()],$actor);
if($r['answerKind']!=='rag'||($r['citations'][0]['documentId']??'')!=='KB-026')throw new RuntimeException('HTTP tool/retrieval/citation chain failed');
echo Util::json(['mock_gateway_http'=>true,'real_curl'=>true,'model_directed_tool_roundtrip'=>true,'citation'=>$r['citations'][0]['documentId'],'live_provider'=>false])."\n";
