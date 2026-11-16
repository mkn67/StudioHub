<?php
declare(strict_types=1);
use StudioHub\Helpdesk\Agents\{StudioContactFallback,RoomSummary};
use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Tests\{FakeTransport,ScriptedModel};
use StudioHub\Helpdesk\Util;
use function StudioHub\Helpdesk\Tests\{config,call};

function publicContactRoom(?string $phone='0901234567', int $id=12, int $studioId=3): array {
    return ['room_id'=>$id,'name'=>'Phòng công khai','capacity'=>4,'studio_id'=>$studioId,
        'studio'=>['studio_id'=>$studioId,'name'=>'Studio công khai','phone'=>$phone,
            'host_email'=>'private@example.test','host_phone'=>'0999999999','email'=>'unapproved@example.test']];
}
test('rental prices are separated readable offers without internal IDs or timestamps',function(){
    $rows=[];
    foreach ([850000=>180,1100000=>240] as $amount=>$minutes) $rows[]=['rate_id'=>count($rows)+12,'unit_price'=>$amount,'rate_unit'=>'session',
        'unit_minutes'=>$minutes,'minimum_units'=>1,'maximum_units'=>2,'effective_from'=>'2026-01-01'];
    $http=new FakeTransport([roomResponse(12,'Zenith Live Commerce'),apiResponse($rows)]);
    [$s]=readService(new ScriptedModel([call('get_room_rates',['roomId'=>12]),['content'=>'{"kind":"rates"}']]),$http);
    $a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Giá phòng này?','context'=>roomContext(12),'clientMessageId'=>Util::id()],$a)['response']['text'];
    check(substr_count($r,'Zenith Live Commerce')===1);
    check(str_contains($r,"**850.000 ₫ / buổi**\n\n- Thời lượng: 3 giờ / buổi."));
    check(str_contains($r,"**1.100.000 ₫ / buổi**\n\n- Thời lượng: 4 giờ / buổi."));
    check(substr_count($r,'Thuê từ 1 đến 2 buổi.')===2);
    check(str_contains($r,'Áp dụng từ 01/01/2026.'));
    check(!str_contains($r,'mã giá'));check(!str_contains($r,'kiểm tra 20'));
    check(str_contains($r,'Chưa kiểm tra lịch trống.'));
});
test('public contact only projects published Studio phone and validates relationship',function(){
    foreach (['0901234567'=> '0901234567', '+84 (90) 123-4567'=>'+84901234567', 'bad:value'=>null, ''=>null] as $input=>$expected) {
        $catalog=new PublicCatalog(config(),new FakeTransport([apiResponse(publicContactRoom((string)$input))]));
        $r=$catalog->publicContact(12);check($r['publicPhone']===$expected);check($r['publicEmail']===null);
        check(!str_contains(Util::json($r),'private'));check(!str_contains(Util::json($r),'0999999999'));
    }
    $row=publicContactRoom();$row['studio']['studio_id']=9;
    fails(fn()=>(new PublicCatalog(config(),new FakeTransport([apiResponse($row)])))->publicContact(12),'invalid_catalog_response');
    fails(fn()=>(new PublicCatalog(config(),new FakeTransport([apiResponse(publicContactRoom(null,99))])))->publicContact(12),'invalid_catalog_response');
});
test('contact ambiguity and failed explicit lookup do not select page or first candidate',function(){
    $http=new FakeTransport([]);$catalog=new PublicCatalog(config(['STUDIOHUB_PUBLIC_TOOLS'=>'true']),$http);
    foreach ([[],['resolvedRooms'=>['match'=>'empty']],['resolvedRooms'=>['match'=>'ambiguous']],['agentState'=>['selectionRequired'=>true]],
        ['rooms'=>[12=>[],13=>[]]],['roomFacts'=>[12=>[],13=>[]]]] as $e) {
        if($e)$e['viewedRoom']=['roomId'=>'12'];
        $r=StudioContactFallback::resolve($catalog,$e,'explicit_contact_request');check($r['status']==='ambiguous');check($r['publicPhone']===null);
    }
    check(count($http->requests)===0);
    fails(fn()=>StudioContactFallback::resolve($catalog,['context'=>['roomId'=>99], 'agentState'=>['selectedRoomId'=>12]],'explicit_contact_request'),'catalog_unavailable');
});
test('unique different room overrides page contact and missing phone stays missing',function(){
    $http=new FakeTransport([apiResponse(publicContactRoom(null,15,7))]);
    $r=StudioContactFallback::resolve(new PublicCatalog(config(['STUDIOHUB_PUBLIC_TOOLS'=>'true']),$http),
        ['viewedRoom'=>['roomId'=>'12'],'resolvedRooms'=>['match'=>'unique','items'=>[['roomId'=>'15']]]],'explicit_contact_request');
    check($r['studioId']===7);check($r['roomId']===15);check($r['status']==='missing');check($r['publicEmail']===null);
    check(str_contains(StudioContactFallback::response($r)['text'],'chưa có thông tin liên hệ công khai'));
    $r=StudioContactFallback::resolve(new PublicCatalog(config(['STUDIOHUB_PUBLIC_TOOLS'=>'true']),new FakeTransport([apiResponse(publicContactRoom('0901234567',15,7))])),
        ['viewedRoom'=>['roomId'=>'12'],'rooms'=>[15=>['roomId'=>'15']]],'explicit_contact_request');
    check($r['roomId']===15);
});
test('fallback eligibility uses actual evidence not model uncertainty',function(){
    check(!StudioContactFallback::insufficient([]));
    check(!StudioContactFallback::insufficient(['knowledgeSearched'=>true,'chunks'=>['verified']]));
    check(StudioContactFallback::insufficient(['knowledgeSearched'=>true,'chunks'=>[]]));
    check(StudioContactFallback::insufficient(['roomFacts'=>[12=>['missingFields'=>['studio_policy']]]]));
    check(StudioContactFallback::explicit('Tôi muốn gặp nhân viên hỗ trợ'));
    check(!StudioContactFallback::explicit('Tôi không muốn liên hệ Studio'));
    $e=['chunks'=>['a'=>['content'=>'Điều kiện A'], 'b'=>['content'=>'Điều kiện B'], 'c'=>['content'=>'Điều kiện A']]];
    check(StudioContactFallback::verifyConflict(['a','b'],$e));
    check(!StudioContactFallback::verifyConflict(['a','invented'],$e));
    check(!StudioContactFallback::verifyConflict(['a','a'],$e));
    check(!StudioContactFallback::verifyConflict(['a','c'],$e));
    check(StudioContactFallback::insufficient(['verifiedConflict'=>true]));
});
test('explicit contact tool persists fallback without ticket or human queue',function(){
    $http=new FakeTransport([apiResponse(publicContactRoom()),apiResponse(publicContactRoom())]);
    $contactCall=call('get_studio_public_contact',[]);
    $contactCall['tool_calls'][0]['function']['arguments']='{}';
    $model=new ScriptedModel([$contactCall]);
    [$s]=readService($model,$http);$actor=customerActor();$id=$s->create([],$actor)['conversation']['id'];
    $r=$s->send($id,['text'=>'Tôi muốn liên hệ Studio','context'=>roomContext(12),'clientMessageId'=>Util::id()],$actor);
    check($r['response']['contactFallback']['publicPhone']==='0901234567');
    check($model->calls===1);
    check($r['response']['state']==='answered');check(!isset($r['response']['ticketProposal']));
    $history=$s->history($id,$actor);
    check($history['conversation']['state']==='bot_active');
    check($history['messages'][1]['response']['contactFallback']===$r['response']['contactFallback']);
});
test('empty approved retrieval triggers contact fallback but provider failure stays failure',function(){
    $http=new FakeTransport([apiResponse(publicContactRoom()),apiResponse(publicContactRoom())]);
    $model=new ScriptedModel([call('search_knowledge',['query'=>'unpublished special studio policy']),['content'=>'{"kind":"unsupported"}']]);
    [$s]=readService($model,$http);$a=customerActor();$id=$s->create([],$a)['conversation']['id'];
    $r=$s->send($id,['text'=>'Chính sách đặc biệt của phòng này?','context'=>roomContext(12),'clientMessageId'=>Util::id()],$a);
    check($r['response']['contactFallback']['reason']==='insufficient_verified_information');
    [$s]=readService(new ScriptedModel([new \StudioHub\Helpdesk\Failure('provider_unavailable',503)]),new FakeTransport([]));
    $id=$s->create([],$a)['conversation']['id'];
    fails(fn()=>$s->send($id,['text'=>'Tôi muốn liên hệ Studio','context'=>['surface'=>'public','scope'=>'catalog'],'clientMessageId'=>Util::id()],$a),'provider_unavailable');
});
test('normal grounded room summary retains conditions with compact Markdown and safe data escaping',function(){
    $r=RoomSummary::format("Phòng: **Tên** — Studio: A\nSức chứa: 4 người\nGiá phòng: 100đ/hour; tối thiểu 2 đơn vị thuê.\nTiện ích: ánh sáng\nNội quy phòng: không hút thuốc\n[click](https://evil.test)",12);
    foreach(['**Thông tin cơ bản**','**Giá thuê tham khảo**','**Tiện ích nổi bật**','**Lưu ý**','tối thiểu 2 đơn vị thuê','/rooms/12'] as $value)check(str_contains($r,$value));
    check(str_contains($r,'\\*\\*Tên\\*\\*'));check(!str_contains($r,'[click]'));
});
