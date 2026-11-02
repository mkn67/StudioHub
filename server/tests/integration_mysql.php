<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
date_default_timezone_set('Asia/Ho_Chi_Minh');
use App\Core\Db;
use App\Services\WorkspaceService;
use App\Services\RentalRules as R;
use App\Exceptions\ApiException;
if(($_ENV['APP_ENV'] ?? getenv('APP_ENV'))!=='test' || !preg_match('/_test$/D',(string)($_ENV['DB_NAME'] ?? getenv('DB_NAME')))) { fwrite(STDERR,"Requires APP_ENV=test and a dedicated DB_NAME ending _test. No database changed.\n"); exit(77); }
try { $db=Db::getConnection(); } catch(Throwable) { fwrite(STDERR,"MySQL unavailable. Workflow and concurrency tests NOT executed.\n"); exit(77); }
if(($argv[1] ?? '')==='--race') {
    $job=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
    try { (new WorkspaceService($db))->command($job['actor'],$job['command'],$job['key']); echo 'RESERVED'; }
    catch(ApiException $e) { if($e->getStatusCode()!==409) throw $e; echo 'CONFLICT'; } exit;
}
$_ENV['PAYMENT_ADAPTER']='development';
$service=new WorkspaceService($db); $prefix='qa-'.bin2hex(random_bytes(6)); $count=0;
function ok(bool $condition,string $message): void { global $count; if(!$condition) throw new RuntimeException($message); $count++; echo "PASS $message\n"; }
function denied(callable $fn,int $status): void { try { $fn(); } catch(ApiException $e) { ok($e->getStatusCode()===$status,'expected HTTP '.$status); return; } throw new RuntimeException('Expected denial'); }
$run=function(string $sql,array $args=[]) use($db): int { $db->prepare($sql)->execute($args); return (int)$db->lastInsertId(); };
$roles=[]; foreach(['customer','host','admin'] as $role) { $q=$db->prepare('SELECT role_id FROM roles WHERE role_name=?'); $q->execute([$role]); $id=$q->fetchColumn(); if(!$id) $id=$run('INSERT INTO roles(role_name) VALUES(?)',[$role]); $roles[$role]=(int)$id; }
$actor=function(string $role,string $suffix) use($roles,$run,$prefix): array {
    $id=$run('INSERT INTO users(role_id,full_name,email,password_hash,phone) VALUES(?,?,?,?,?)',[$roles[$role],$prefix.$suffix,$prefix.$suffix.'@test.invalid',password_hash(bin2hex(random_bytes(16)),PASSWORD_BCRYPT),'0901234567']); return ['user_id'=>$id,'role'=>$role];
};
$customer=$actor('customer','customer'); $other=$actor('customer','other'); $host=$actor('host','host'); $foreign=$actor('host','foreign'); $admin=$actor('admin','admin');
$studio=$run('INSERT INTO studios(host_id,name,address) VALUES(?,?,?)',[$host['user_id'],$prefix,'Test only']);
$policy=['paymentMinutes'=>30,'depositPercent'=>30,'cancelHours'=>24,'changeHours'=>24,'refundTiers'=>[['hours'=>24,'percent'=>100]],'overtimePerBlock'=>50000,'openHour'=>0,'closeHour'=>24];
$type=$run('INSERT INTO room_types(studio_id,name,config) VALUES(?,?,?)',[$studio,$prefix,json_encode(['category'=>'Test','hourlyRate'=>100000,'plans'=>['hourly']])]);
$room=$run('INSERT INTO rooms(studio_id,type_id,name,area,capacity) VALUES(?,?,?,20,5)',[$studio,$type,$prefix]);
$room2=$run('INSERT INTO rooms(studio_id,type_id,name,area,capacity) VALUES(?,?,?,20,5)',[$studio,$type,$prefix.'2']);
foreach([$room,$room2] as $r) $run("INSERT INTO room_rates(room_id,rate_unit,unit_minutes,unit_price,effective_from) VALUES(?,'hour',60,100000,CURDATE())",[$r]);
$category=$run('INSERT INTO equipment_categories(studio_id,name) VALUES(?,?)',[$studio,$prefix]);
$equipment=$run("INSERT INTO equipments(studio_id,category_id,name,unit_price,pricing_unit,total_quantity) VALUES(?,?,?,20000,'hour',1)",[$studio,$category,$prefix]);
$command=fn($who,$c,$key=null)=>$service->command($who,$c,$key ?? bin2hex(random_bytes(16)));
$command($host,['type'=>'policy','studioId'=>(string)$studio,'policy'=>$policy]);
$command($host,['type'=>'rental_settings','studioId'=>(string)$studio,'operatingHours'=>['mode'=>'all_day']]);
$base=time(); $start=strtotime('+4 days 09:00');
$selection=fn($r,$offset=0)=>['roomId'=>(string)$r,'start'=>($start+$offset)*1000,'end'=>($start+$offset+7200)*1000,'participants'=>2,'plan'=>'hourly','equipment'=>[(string)$equipment=>1]];
$create=function($who,array $x) use($service,$command,$policy): array { $quote=$service->quote($who,$x)['breakdown']; $state=$command($who,['type'=>'create','selection'=>$x,'expectedTotal'=>$quote['total'],'expectedDeposit'=>$quote['deposit'],'expectedPolicy'=>$policy]); return $state['bookings'][array_key_last($state['bookings'])]; };
$booking=$create($customer,$selection($room)); $id=$booking['id']; ok($booking['status']==='awaiting_payment','A booking persists as payment hold');
$request=['type'=>'payment','id'=>$id,'outcome'=>'paid']; $key=bin2hex(random_bytes(16)); $command($customer,$request,$key); $state=$command($customer,$request,$key);
$b=R::item($state['bookings'],$id); ok($b['status']==='pending' && $b['payment']==='paid','A deposit becomes pending Host review, retry idempotent');
denied(fn()=>$command($other,['type'=>'cancel','id'=>$id,'reason'=>'attack']),403);
denied(fn()=>$command($foreign,['type'=>'approve','id'=>$id]),403);
denied(fn()=>$command($customer,['type'=>'restore','userId'=>(string)$other['user_id'],'reason'=>'attack']),403);
denied(fn()=>$create($other,$selection($room)),409);
denied(fn()=>$create($other,$selection($room2)),409);
$command($host,['type'=>'approve','id'=>$id]);
$change=$selection($room,86400); $command($customer,['type'=>'change','id'=>$id,'selection'=>$change]);
$old=R::item($service->state($customer)['bookings'],$id); ok($old['start']===$selection($room)['start'],'E original reservation intact pending approval');
$command($host,['type'=>'approve_change','id'=>$id]);
denied(fn()=>$command($customer,['type'=>'change','id'=>$id,'selection'=>$change]),409);
$db->exec('SET timestamp='.(int)($change['start']/1000+60)); $command($host,['type'=>'checkin','id'=>$id]);
$db->exec('SET timestamp='.(int)($change['end']/1000+31*60)); $command($host,['type'=>'checkout','id'=>$id]);
$b=R::item($service->state($customer)['bookings'],$id); ok($b['status']==='completed' && $b['overtime']===100000 && R::balance($b)>0,'F checkout completes with debt, 31m overtime is two blocks');
$command($host,['type'=>'collect','id'=>$id,'amount'=>10000,'method'=>'cash','collectionId'=>bin2hex(random_bytes(16))]);
ok($service->report($host)['collections']===10000,'I server report records partial collection');
$db->exec('SET timestamp='.$base);
$b=$create($customer,$selection($room,2*86400)); $command($customer,['type'=>'payment','id'=>$b['id'],'outcome'=>'paid']); $command($host,['type'=>'reject','id'=>$b['id'],'reason'=>'Test rejection']);
$b=R::item($service->state($customer)['bookings'],$b['id']); ok($b['refund']['amount']===$b['deposit'] && $b['refund']['status']==='pending','C rejection creates full refund obligation');
for($i=0;$i<3;$i++) $command($host,['type'=>'refund','id'=>$b['id'],'outcome'=>'failed']);
denied(fn()=>$command($host,['type'=>'refund','id'=>$b['id'],'outcome'=>'refunded']),409);
$command($admin,['type'=>'resolve_refund','id'=>$b['id'],'reason'=>'Verified development adapter']);
$b=$create($customer,$selection($room,3*86400)); $command($customer,['type'=>'payment','id'=>$b['id'],'outcome'=>'paid']);
$db->exec('SET timestamp='.($base+7201)); $service->expire(); $b=R::item($service->state($customer)['bookings'],$b['id']); ok($b['status']==='cancelled' && $b['refund']['amount']===$b['deposit'],'C two-hour timeout processed without frontend');
$db->exec('SET timestamp='.$base);
for($i=0;$i<3;$i++) { $b=$create($other,$selection($room,(4+$i)*86400)); $command($other,['type'=>'cancel','id'=>$b['id'],'reason'=>'Test unpaid cancellation']); }
$u=R::item($service->state($other)['users'],(string)$other['user_id']); ok($u['restricted'] && !$u['locked'] && count($u['strikes'])===3,'B/H three strikes restrict booking only');
$command($admin,['type'=>'restore','userId'=>(string)$other['user_id'],'reason'=>'Test restoration']);
$u=R::item($service->state($other)['users'],(string)$other['user_id']); ok(!$u['restricted'] && count($u['strikes'])===3 && !array_filter($u['strikes'],fn($i)=>$i['active']),'H restore retains historical incidents');
$public=$service->state(); ok(!$public['users'] && !$public['bookings'] && !$public['applications'],'J public projection contains no identities/private bookings');
// Actual simultaneous PHP processes sharing the same MySQL database/stock.
$x=$selection($room,8*86400); $price=$service->quote($customer,$x)['breakdown']['total'];
$jobs=[];
foreach([$customer,$other] as $who) {
    $pipes=[]; $args=[PHP_BINARY]; if(php_ini_loaded_file()) { $args[]='-c'; $args[]=php_ini_loaded_file(); } $args[] = __FILE__; $args[]='--race';
    $process=proc_open($args,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    if(!is_resource($process)) throw new RuntimeException('Unable to spawn concurrency test');
    fwrite($pipes[0],json_encode(['actor'=>$who,'command'=>['type'=>'create','selection'=>$x,'expectedTotal'=>$price,'expectedDeposit'=>R::roundRatio($price*30,100),'expectedPolicy'=>$policy],'key'=>bin2hex(random_bytes(16))])); fclose($pipes[0]); $jobs[]=[$process,$pipes];
}
$outcomes=[]; foreach($jobs as [$process,$pipes]) { $outcomes[]=stream_get_contents($pipes[1]); $error=stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]); if(proc_close($process)!==0) throw new RuntimeException('Concurrency worker failed: '.$error); }
sort($outcomes); ok($outcomes===['CONFLICT','RESERVED'],'K concurrent room requests yield one reservation');
$db->exec('SET timestamp=0');
echo "$count checks passed; isolated fixtures retained with prefix $prefix. No real provider calls.\n";
