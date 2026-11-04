<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
date_default_timezone_set('Asia/Ho_Chi_Minh');
use App\Services\RentalRules as R;
use App\Exceptions\ApiException;
$passed=0;
function check(string $name,callable $test): void { global $passed; $test(); $passed++; echo "PASS $name\n"; }
function equal(mixed $a,mixed $b): void { if($a!==$b) throw new RuntimeException('Expected '.json_encode($b).', got '.json_encode($a)); }
function rejects(callable $test,int $status=422): void { try { $test(); } catch(ApiException $e) { equal($e->getStatusCode(),$status); return; } throw new RuntimeException('Expected rejection'); }
$now=strtotime('2026-11-02 09:00:00')*1000; $start=strtotime('2026-11-05 09:00:00')*1000;
$policy=['paymentMinutes'=>30,'depositPercent'=>30,'cancelHours'=>24,'changeHours'=>48,'refundTiers'=>[['hours'=>48,'percent'=>100],['hours'=>24,'percent'=>50]],'overtimePerBlock'=>50000,'openHour'=>8,'closeHour'=>22];
$s=['now'=>$now,'studios'=>[['id'=>'1','hostId'=>'2','active'=>true,'policy'=>$policy]],'types'=>[['id'=>'1','studioId'=>'1','plans'=>['hourly','combo3'],'hourlyRate'=>100001]],'rooms'=>[['id'=>'1','typeId'=>'1','active'=>true,'capacity'=>10],['id'=>'2','typeId'=>'1','active'=>true,'capacity'=>10]],'equipment'=>[['id'=>'1','studioId'=>'1','active'=>true,'quantity'=>2,'hourlyRate'=>25000]],'bookings'=>[]];
$x=['roomId'=>'1','start'=>$start,'end'=>$start+2*R::HOUR,'participants'=>2,'plan'=>'hourly','equipment'=>['1'=>1]];
check('integer VND quote and deposit, including equipment',function() use($s,$x) { $q=R::quote($s,$x); equal($q['breakdown']['total'],250002); equal($q['breakdown']['deposit'],75001); });
check('legacy session equipment charges once, not per hour',function() use($s,$x) { $s['equipment'][0]['pricingUnit']='session'; equal(R::quote($s,$x)['breakdown']['equipment'],25000); });
check('zero extras do not add inventory or fees',function() use($s,$x) { $x['equipment']['1']=0; equal(R::quote($s,$x)['breakdown']['equipment'],0); });
check('room override and no invented package discount',function() use($s,$x) { $s['rooms'][0]['rateOverride']=200000; $x['plan']='combo3'; $x['end']=$x['start']+3*R::HOUR; equal(R::quote($s,$x)['breakdown']['rental'],600000); });
check('configured package and included stock bill only extras',function() use($s,$x) { $s['types'][0]['rentalPlans']=[['plan'=>'combo3','title'=>'3h','kind'=>'duration','price'=>240000,'durationMinutes'=>180,'includedEquipment'=>['1'=>1],'includedServices'=>[],'active'=>true]]; $x['plan']='combo3'; $x['end']=$x['start']+3*R::HOUR; $q=R::quote($s,$x); equal($q['breakdown']['rental'],240000); equal($q['totalEquipment']['1'],2); equal($q['breakdown']['equipment'],75000); });
check('lead time includes selected deposit window at exact boundary',function() use($s,$x) { $s['studios'][0]['policy']['paymentMinutes']=180; $s['now']=$x['start']-27*R::HOUR; R::quote($s,$x); $s['now']++; rejects(fn()=>R::quote($s,$x)); });
check('inactive room and studio fail closed',function() use($s,$x) { $s['rooms'][0]['active']=false; rejects(fn()=>R::quote($s,$x)); $s['rooms'][0]['active']=true; $s['studios'][0]['active']=false; rejects(fn()=>R::quote($s,$x)); });
check('capacity, fractional units and invalid duration rejected',function() use($s,$x) { $x['participants']=11; rejects(fn()=>R::quote($s,$x)); $x['participants']=1; $x['end']++; rejects(fn()=>R::quote($s,$x)); });
check('room hold and symmetric cleaning buffer, exact end free',function() use($s,$x) { $s['bookings'][]=['id'=>'10','roomId'=>'1','start'=>$x['end']+R::BUFFER-1,'end'=>$x['end']+R::HOUR,'status'=>'awaiting_payment','equipment'=>[]]; rejects(fn()=>R::quote($s,$x),409); $s['bookings'][0]['start']++; R::quote($s,$x); });
check('checked-in reservation continues to block until checkout',function() use($s,$x) { $s['bookings'][]=['id'=>'10','roomId'=>'1','start'=>$x['start'],'end'=>$x['end'],'status'=>'checked_in','equipment'=>[]]; rejects(fn()=>R::quote($s,$x),409); });
check('cancelled reservation releases room',function() use($s,$x) { $s['bookings'][]=['id'=>'10','roomId'=>'1','start'=>$x['start'],'end'=>$x['end'],'status'=>'cancelled','equipment'=>[]]; R::quote($s,$x); });
check('shared inventory across physical rooms uses peak not sum',function() use($s,$x) { $s['bookings']=[['id'=>'10','roomId'=>'2','start'=>$x['start'],'end'=>$x['start']+R::BUFFER,'status'=>'confirmed','equipment'=>['1'=>1]],['id'=>'11','roomId'=>'2','start'=>$x['start']+R::HOUR,'end'=>$x['end'],'status'=>'pending','equipment'=>['1'=>1]]]; R::quote($s,$x); $s['bookings'][1]['start']--; rejects(fn()=>R::quote($s,$x),409); });
check('shared inventory from immutable package snapshot',function() use($s,$x) { $s['bookings']=[['id'=>'10','roomId'=>'2','start'=>$x['start'],'end'=>$x['end'],'status'=>'pending','equipment'=>[],'rentalSnapshot'=>['totalEquipment'=>['1'=>2]]]]; rejects(fn()=>R::quote($s,$x),409); });
check('reschedule ignores only its original reservation',function() use($s,$x) { $s['bookings']=[['id'=>'10','roomId'=>'1','start'=>$x['start'],'end'=>$x['end'],'status'=>'confirmed','equipment'=>['1'=>1]]]; R::quote($s,$x,'10'); rejects(fn()=>R::quote($s,$x,'11'),409); });
check('foreign and inactive equipment rejected',function() use($s,$x) { $s['equipment'][0]['studioId']='2'; rejects(fn()=>R::quote($s,$x)); $s['equipment'][0]['studioId']='1'; $s['equipment'][0]['active']=false; rejects(fn()=>R::quote($s,$x)); });
check('overnight operating hours are Vietnam based',function() use($s,$x) { $s['studios'][0]['operatingHours']=['mode'=>'fixed','opens'=>'20:00','closes'=>'03:00']; $x['start']=strtotime('2026-11-05 23:00:00')*1000; $x['end']=$x['start']+2*R::HOUR; R::quote($s,$x); $x['end']+=3*R::HOUR; rejects(fn()=>R::quote($s,$x)); });
check('percentage surcharge apportions only overlapping minutes',function() use($s,$x) { $s['studios'][0]['timeSurcharge']=['enabled'=>true,'start'=>'10:00','end'=>'11:00','method'=>'percentage','value'=>10]; equal(R::quote($s,$x)['breakdown']['timeSurcharge'],10000); });
check('fixed surcharge rounds integer VND',function() use($s,$x) { $s['studios'][0]['timeSurcharge']=['enabled'=>true,'start'=>'09:30','end'=>'10:00','method'=>'fixed','value'=>25001]; equal(R::quote($s,$x)['breakdown']['timeSurcharge'],12501); });
check('crew fee and maximum',function() use($s,$x) { $s['types'][0]['crewPolicy']=['included'=>1,'maximum'=>5,'surchargeEnabled'=>true,'unit'=>'hour','amount'=>20000]; equal(R::quote($s,$x)['breakdown']['crewSurcharge'],40000); $x['participants']=6; rejects(fn()=>R::quote($s,$x)); });
check('valid policy and exact payment choices',function() use($policy) { R::policy($policy); $policy['paymentMinutes']=45; rejects(fn()=>R::policy($policy)); });
check('refund tiers cannot grow as deadline approaches',function() use($policy) { $policy['refundTiers'][1]['percent']=101; rejects(fn()=>R::policy($policy)); });
check('money rejects floats, negative and numeric strings',function() { foreach([1.5,-1,'100'] as $v) rejects(fn()=>R::integer($v)); });
check('plan validation rejects duplicate and foreign bundles',function() use($s) { $p=['plan'=>'combo3','title'=>'3h','kind'=>'duration','price'=>240000,'durationMinutes'=>180,'includedEquipment'=>['1'=>1],'includedServices'=>[],'active'=>true]; R::plans($s,[$p],'1',10,null); rejects(fn()=>R::plans($s,[$p,$p],'1',10,null)); rejects(fn()=>R::plans($s,[$p],'2',10,null)); });
check('completed is separate from settlement and partial collections',function() { $b=['total'=>100000,'overtime'=>50000,'deposit'=>30000,'payment'=>'paid','collections'=>[['amount'=>20000]],'status'=>'completed']; equal(R::balance($b),100000); });
check('unconfigured JWT rejects predictable fallback',function() { rejects(fn()=>new App\Services\JwtService('supersecretjwtkey_change_in_production_min32chars'),503); });
echo "$passed rule tests passed. No MySQL/concurrency/provider claim.\n";
