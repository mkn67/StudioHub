<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
use StudioHub\Helpdesk\{Config,Failure,Util};
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Agents\AgentService;
use StudioHub\Helpdesk\LLM\NineRouterClient;
use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Tools\{PublicCatalog,ReadOnlyTools};
use StudioHub\Helpdesk\Security\{Actor,Identity};
use StudioHub\Helpdesk\Persistence\Store;
$cfg=new Config(dirname(__DIR__),['HELPDESK_DATABASE_URL'=>'sqlite::memory:','HELPDESK_BRIDGE_SECRET'=>str_repeat('fixture-',6),
    'STUDIOHUB_API_BASE_URL'=>'http://127.0.0.1:18012/api','STUDIOHUB_PUBLIC_TOOLS'=>'true','STUDIOHUB_CUSTOMER_READ_TOOLS'=>'true',
    'NINEROUTER_BASE_URL'=>'http://127.0.0.1:18012/v1','NINEROUTER_API_KEY'=>'synthetic-http-key','NINEROUTER_MODEL'=>'synthetic-http-model']);
$http=new CurlTransport();$actor=(new Identity($cfg,$http))->resolve(['x-helpdesk-bridge'=>$cfg->secret(),'authorization'=>'Bearer synthetic-http-customer']);
$store=new Store($cfg);$store->migrate();
$s=new AgentService($cfg,$store,new Repository(dirname($cfg->root).'/docs/helpdesk/knowledge/knowledge.v1.json',$cfg->path('config/approval-manifest.json')),new NineRouterClient($cfg,$http),new PublicCatalog($cfg,$http),true);
foreach([['actor'=>new Actor('guest:http'),'text'=>'AVAILABILITY','expected'=>'300000 VND'],['actor'=>$actor,'text'=>'HISTORY','expected'=>'SH-HTTP-7']] as $case) {
    $id=$s->create([],$case['actor'])['conversation']['id'];$r=$s->send($id,['text'=>$case['text'],'clientMessageId'=>Util::id()],$case['actor']);
    if($r['response']['state']!=='answered' || !str_contains($r['response']['text'],$case['expected']))throw new RuntimeException('HTTP structured roundtrip failed');
    $payload=$store->get('helpdesk_conversations',$id)['payload'];
    foreach(['synthetic-http-key','synthetic-http-customer','never-expose@example.test'] as $secret)if(str_contains($payload,$secret))throw new RuntimeException('Privacy failure');
}
$r=(new ReadOnlyTools($cfg,$http))->bookings([],new Actor('user:1','customer','1',false,'Bearer revoked'));
if($r['state']!=='AUTH_REQUIRED')throw new RuntimeException('Upstream auth denial not preserved');
echo Util::json(['real_curl'=>true,'fixture_backend'=>true,'fixture_provider'=>true,'structured_roundtrips'=>2,'auth_denial'=>true,'live_StudioHub'=>false,'live_9Router'=>false]).PHP_EOL;
