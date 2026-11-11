<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Application,Util};
use StudioHub\Helpdesk\Tests\{FakeTransport,ScriptedModel};
use StudioHub\Helpdesk\Security\Actor;
use function StudioHub\Helpdesk\Tests\{config,call};
function roomResponse(int $id,string $name): array {return apiResponse(['room_id'=>$id,'name'=>$name,'capacity'=>5,'description'=>'Actual public room']);}
function factsResponse(int $id,string $name): array {return apiResponse(['roomId'=>(string)$id,'text'=>$name.' — dữ liệu phòng đã xác minh.','missingFields'=>[],'checkedAt'=>date(DATE_ATOM)]);}
function rateResponse(int $amount): array {return apiResponse([['rate_id'=>2,'rate_unit'=>'hour','unit_price'=>$amount,'unit_minutes'=>60,'minimum_units'=>1]]);}
function roomContext(int $id): array {return ['surface'=>'public','scope'=>'catalog','roomId'=>$id];}
test('HTTP boundary rejects guests before any database or identity API work',function(){
    fails(fn()=>(new Application(config()))->dispatch('POST','/api/v1/helpdesk/conversations',['x-helpdesk-session'=>str_repeat('a',64)],[]),'authentication_required');
});
test('current room is API verified before model reasoning and prices use its name',function(){
    $http=new FakeTransport([roomResponse(6,'Zenith Music Recording'),rateResponse(250000)]);
    $model=new ScriptedModel([function($messages){$data=json_decode(end($messages)['content'],true);check($data['data']['name']==='Zenith Music Recording');return call('get_room_pricing',['roomId'=>6]);},['content'=>'{"kind":"rates"}']]);
    [$service,$store]=readService($model,$http);$actor=customerActor();$id=$service->create([],$actor)['conversation']['id'];
    $r=$service->send($id,['text'=>'Phòng này giá bao nhiêu?','context'=>roomContext(6),'clientMessageId'=>Util::id()],$actor);
    check(str_contains($r['response']['text'],'Zenith Music Recording'));check(str_contains($r['response']['text'],'250000 VND'));check(count($http->requests)===2);
    $saved=json_decode($store->get('helpdesk_conversations',$id)['payload'],true);check($saved['agentState']['selectedRoomId']===6);
});
test('navigation changes the viewed room while preserving conversation and previous messages',function(){
    $http=new FakeTransport([roomResponse(6,'Music'),factsResponse(6,'Music'),roomResponse(15,'Vocal'),factsResponse(15,'Vocal')]);
    $model=new ScriptedModel([call('get_room_facts',['roomId'=>6]),['content'=>'{"kind":"room_facts","roomId":6}'],call('get_room_facts',['roomId'=>15],'call_2'),['content'=>'{"kind":"room_facts","roomId":15}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $one=$s->send($id,['text'=>'Phòng này có gì?','context'=>roomContext(6),'clientMessageId'=>Util::id()],$a);
    $two=$s->send($id,['text'=>'Phòng này có gì?','context'=>roomContext(15),'clientMessageId'=>Util::id()],$a);
    check(str_contains($one['response']['text'],'Music'));check(str_contains($two['response']['text'],'Vocal'));
    check(count($s->history($id,$a)['messages'])===4);check($s->current($a)['conversation']['id']===$id);
});
test('explicit full room name resolves another room without silently using the viewed room',function(){
    $http=new FakeTransport([roomResponse(6,'Zenith Music Recording'),apiResponse(['items'=>[
        ['room_id'=>6,'name'=>'Zenith Music Recording','capacity'=>5],['room_id'=>15,'name'=>'Zenith Vocal Recording Booth','capacity'=>3],
    ]]),rateResponse(180000)]);
    $model=new ScriptedModel([call('resolve_room',['query'=>'Zenith Vocal Recording Booth']),call('get_room_rates',['roomId'=>15],'call_2'),['content'=>'{"kind":"rates"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Zenith Vocal Recording Booth giá bao nhiêu?','context'=>roomContext(6),'clientMessageId'=>Util::id()],$a);
    check(str_contains($r['response']['text'],'Zenith Vocal Recording Booth'));check(str_contains($r['response']['text'],'180000 VND'));
});
test('ambiguous room name produces actual named choices instead of asking generic purpose',function(){
    $http=new FakeTransport([apiResponse(['items'=>[['room_id'=>6,'name'=>'Zenith Music','capacity'=>5],['room_id'=>15,'name'=>'Zenith Vocal','capacity'=>3]]])]);
    $model=new ScriptedModel([call('resolve_room',['query'=>'Zenith']),['content'=>'{"kind":"clarification","field":"studio"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'phòng Zenith','context'=>['surface'=>'public','scope'=>'catalog'],'clientMessageId'=>Util::id()],$a);
    check(count($r['response']['cards'])===2);check(str_contains($r['response']['text'],'nhiều phòng'));check($r['response']['cards'][0]['title']==='Zenith Music');
});
test('category price discovery includes actual base prices from the existing catalog contract',function(){
    $http=new FakeTransport([apiResponse(['items'=>[['room_id'=>6,'name'=>'Recording','capacity'=>5,'display_rate'=>['unit_price'=>250000,'rate_unit'=>'hour']]]])]);
    $model=new ScriptedModel([call('search_rooms',['keyword'=>'recording']),['content'=>'{"kind":"rooms"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'phòng thu âm giá bao nhiêu','clientMessageId'=>Util::id()],$a);
    check(str_contains($r['response']['cards'][0]['description'],'250.000 VND'));check(!str_contains($r['response']['text'],'Bạn đang hỏi Studio'));
});
test('account-scoped conversation resume cannot return another user history',function(){
    [$s]=readService(new ScriptedModel([]),new FakeTransport([]));$one=customerActor();$two=new Actor('user:2','customer','2');
    $id=$s->create([],$one)['conversation']['id'];check($s->current($one)['conversation']['id']===$id);check($s->current($two)['conversation']===null);
    $new=$s->create([],$one)['conversation']['id'];check($s->current($one)['conversation']['id']===$new);check($s->history($id,$one)['conversation']['id']===$id);
});
test('same client message ID with changed page context cannot replay the previous room answer',function(){
    [$s]=service(new ScriptedModel([['content'=>'{"kind":"greeting"}']]));$a=customerActor();$id=$s->create([],$a)['conversation']['id'];$key=Util::id();
    $s->send($id,['text'=>'Xin chào','context'=>roomContext(6),'clientMessageId'=>$key],$a);
    fails(fn()=>$s->send($id,['text'=>'Xin chào','context'=>roomContext(15),'clientMessageId'=>$key],$a),'idempotency_conflict');
});
test('harness repairs a request for room identity when the page was already verified',function(){
    $http=new FakeTransport([roomResponse(6,'Zenith Music Recording'),factsResponse(6,'Zenith Music Recording')]);
    $model=new ScriptedModel([['content'=>'{"kind":"clarification","field":"studio"}'],call('get_room_facts',['roomId'=>6]),['content'=>'{"kind":"room_facts","roomId":6}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Tiện ích phòng này?','context'=>roomContext(6),'clientMessageId'=>Util::id()],$a);
    check(str_contains($r['response']['text'],'Zenith Music Recording'));check($model->calls===3);
});
test('harness prevents picking the first ambiguous name without a resolved selection',function(){
    $http=new FakeTransport([apiResponse(['items'=>[['room_id'=>6,'name'=>'Zenith Music','capacity'=>5],['room_id'=>15,'name'=>'Zenith Vocal','capacity'=>3]]])]);
    $model=new ScriptedModel([call('resolve_room',['query'=>'Zenith']),call('get_room_rates',['roomId'=>6],'call_2'),function($messages){$r=json_decode(end($messages)['content'],true);check($r['error']==='room_selection_required');return ['content'=>'{"kind":"rooms"}'];}]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Phòng Zenith giá bao nhiêu?','clientMessageId'=>Util::id()],$a);
    check(count($r['response']['cards'])===2);check(count($http->requests)===1);
});
test('matching short name resolves to the verified viewed room while explicit other names still override it',function(){
    $rows=apiResponse(['items'=>[['room_id'=>6,'name'=>'Zenith Music','capacity'=>5],['room_id'=>15,'name'=>'Zenith Vocal','capacity'=>3]]]);
    $http=new FakeTransport([roomResponse(6,'Zenith Music'),$rows,rateResponse(250000)]);
    $model=new ScriptedModel([call('resolve_room',['query'=>'Zenith','prefer_viewed'=>null]),call('get_room_rates',['roomId'=>6],'call_2'),['content'=>'{"kind":"rates"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'phòng Zenith','context'=>roomContext(6),'clientMessageId'=>Util::id()],$a);check(str_contains($r['response']['text'],'Zenith Music'));check(str_contains($r['response']['text'],'250000 VND'));
});
test('failed lookup for another name cannot turn page-context metadata into a search answer',function(){
    $http=new FakeTransport([roomResponse(6,'Zenith Music'),new \StudioHub\Helpdesk\Failure('catalog_unavailable',503)]);
    $model=new ScriptedModel([call('resolve_room',['query'=>'Other room']),['content'=>'{"kind":"rooms"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Other room','context'=>roomContext(6),'clientMessageId'=>Util::id()],$a);
    check($r['response']['state']==='unavailable');check(empty($r['response']['cards']));
});
