<?php
declare(strict_types=1);
namespace App\Services;

use App\Exceptions\ApiException;

/** Pure rules. All timestamps are UTC epoch milliseconds; all money is integer VND. */
final class RentalRules
{
    public const MINUTE = 60000;
    public const HOUR = 3600000;
    public const BUFFER = 1800000;
    public const ACTIVE = ['awaiting_payment', 'pending', 'confirmed', 'checked_in'];

    public static function require(bool $valid, string $message, int $status = 422): void
    {
        if (!$valid) throw new ApiException($status, 'business_rule', $message);
    }
    public static function item(array $items, string|int $id): array
    {
        foreach ($items as $item) if ((string)$item['id'] === (string)$id) return $item;
        throw new ApiException(404, 'not_found', 'Không tìm thấy dữ liệu.');
    }
    public static function integer(mixed $v, int $minimum = 0, int $maximum = 1000000000000): int
    {
        self::require(is_int($v) && $v >= $minimum && $v <= $maximum, 'Cần số nguyên trong giới hạn cho phép.');
        return $v;
    }
    public static function text(mixed $v, int $min = 1, int $max = 255): string
    {
        self::require(is_string($v) && mb_strlen(trim($v)) >= $min && mb_strlen($v) <= $max, 'Thông tin văn bản không hợp lệ.');
        return trim($v);
    }
    public static function policy(array $p): void
    {
        self::require(in_array($p['paymentMinutes'] ?? null, [15,30,60,120,180], true), 'Hạn cọc: 15, 30, 60, 120 hoặc 180 phút.');
        self::integer($p['depositPercent'] ?? null, 1, 100);
        self::require(in_array($p['cancelHours'] ?? null, [24,48,72], true) && in_array($p['changeHours'] ?? null, [24,48,72], true), 'Hạn hủy/đổi: 24, 48 hoặc 72 giờ.');
        self::integer($p['overtimePerBlock'] ?? null);
        self::integer($p['openHour'] ?? null, 0, 23); self::integer($p['closeHour'] ?? null, 1, 24);
        self::require($p['openHour'] < $p['closeHour'], 'Giờ hoạt động không hợp lệ.');
        self::require(is_array($p['refundTiers'] ?? null) && count($p['refundTiers']) > 0, 'Cần cấu hình chính sách hoàn cọc.');
        $tiers = $p['refundTiers']; usort($tiers, fn($a,$b) => $b['hours'] <=> $a['hours']);
        foreach ($tiers as $i => $tier) {
            self::integer($tier['hours'] ?? null, $p['cancelHours'], 8760); self::integer($tier['percent'] ?? null, 0, 100);
            if ($i) self::require($tier['hours'] < $tiers[$i-1]['hours'] && $tier['percent'] <= $tiers[$i-1]['percent'], 'Các mốc hoàn cọc mâu thuẫn.');
        }
    }
    public static function clock(mixed $v): int
    {
        self::require(is_string($v) && preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/D', $v) === 1, 'Giờ không hợp lệ.');
        [$h,$m] = array_map('intval', explode(':',$v)); return $h*60+$m;
    }
    public static function hours(array $h): void
    {
        if (($h['mode'] ?? '') === 'all_day') return;
        self::require(($h['mode'] ?? '') === 'fixed' && self::clock($h['opens'] ?? null) < 1440 && self::clock($h['closes'] ?? null) !== self::clock($h['opens']), 'Khung giờ không hợp lệ.');
    }
    public static function surcharge(?array $r): void
    {
        if (!$r) return;
        self::require(is_bool($r['enabled'] ?? null) && self::clock($r['start'] ?? null) < 1440 && self::clock($r['end'] ?? null) !== self::clock($r['start']), 'Khung phụ thu không hợp lệ.');
        self::require(in_array($r['method'] ?? '', ['fixed','percentage'], true), 'Kiểu phụ thu không hợp lệ.');
        self::integer($r['value'] ?? null, 0, $r['method'] === 'percentage' ? 100 : 1000000000);
    }
    public static function crew(?array $c, int $capacity): void
    {
        if (!$c) return;
        self::integer($c['included'] ?? null, 1, $capacity); self::integer($c['maximum'] ?? null, $c['included'], $capacity);
        self::require(in_array($c['unit'] ?? '', ['hour','booking'], true) && is_bool($c['surchargeEnabled'] ?? null), 'Chính sách ekip không hợp lệ.'); self::integer($c['amount'] ?? null);
    }
    public static function plans(array $s, array $plans, string $studioId, int $capacity, ?array $crew): void
    {
        self::require(count($plans) > 0 && count($plans) <= 5, 'Cần từ 1 đến 5 gói thuê.'); $seen=[];
        foreach ($plans as $p) {
            self::require(in_array($p['plan'] ?? '', ['hourly','session','combo3','combo5','combo10'], true) && !isset($seen[$p['plan']]), 'Mã gói không hợp lệ hoặc trùng.'); $seen[$p['plan']]=true;
            self::text($p['title'] ?? null, 1, 100); self::integer($p['price'] ?? null, 1);
            self::require(in_array($p['kind'] ?? '', ['hourly','duration','session'], true) && is_bool($p['active'] ?? null), 'Loại gói không hợp lệ.');
            $d=self::integer($p['durationMinutes'] ?? null,30,1440); self::require($d%30===0, 'Thời lượng phải theo bước 30 phút.');
            if ($p['kind']==='session') self::require(self::clock($p['sessionStart'] ?? null)<1440 && (self::clock($p['sessionEnd'] ?? null)-self::clock($p['sessionStart'])+1440)%1440===$d, 'Khung buổi không khớp thời lượng.');
            self::require(is_array($p['includedEquipment'] ?? null) && is_array($p['includedServices'] ?? null), 'Cấu hình thiết bị/dịch vụ không hợp lệ.');
            foreach ($p['includedServices'] as $text) self::text($text,0,300);
            if (isset($p['includedCrew'])) { self::require($crew!==null,'Cần cấu hình ekip.'); self::integer($p['includedCrew'],1,min($capacity,$crew['maximum'])); }
            foreach ($p['includedEquipment'] as $id=>$q) {
                $e=self::item($s['equipment'],$id); self::integer($q,1,$e['quantity']);
                self::require($e['studioId']===$studioId && (!$p['active'] || $e['active']), 'Thiết bị kèm gói không thuộc kho hoặc ngưng hoạt động.');
            }
            if (isset($p['promotion'])) {
                $promo=$p['promotion']; self::integer($promo['originalPrice'] ?? null,$p['price']+1);
                foreach (['startsOn','endsOn'] as $key) self::require(is_string($promo[$key] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/D',$promo[$key])===1 && date('Y-m-d',strtotime($promo[$key]))===$promo[$key], 'Ngày ưu đãi không hợp lệ.');
                self::require($promo['endsOn'] >= $promo['startsOn'],'Khoảng ưu đãi không hợp lệ.');
            }
        }
    }
    public static function effectivePlans(array $room, array $type): array
    {
        $plans=$room['rentalPlans'] ?? $type['rentalPlans'] ?? [];
        if (!$plans) {
            $durations=['hourly'=>60,'session'=>240,'combo3'=>180,'combo5'=>300,'combo10'=>600];
            foreach ($type['plans'] as $key) {
                if (!isset($durations[$key])) continue;
                $plans[]=['plan'=>$key,'title'=>$key,'kind'=>$key==='hourly'?'hourly':($key==='session'?'session':'duration'),'price'=>intdiv(($room['rateOverride'] ?? $type['hourlyRate'])*$durations[$key],60),'durationMinutes'=>$durations[$key], 'sessionStart'=>'08:00','sessionEnd'=>'12:00','includedEquipment'=>[],'includedServices'=>[],'active'=>true];
            }
        } elseif (!isset($room['rentalPlans']) && isset($room['rateOverride'])) {
            foreach ($plans as &$p) if ($p['kind']==='hourly') $p['price']=$room['rateOverride']; unset($p);
        }
        return array_values(array_filter($plans,fn($p)=>$p['active'] && $p['price']>0));
    }
    public static function overlaps(array $a,array $b): bool { return $a['start']<$b['end']+self::BUFFER && $b['start']<$a['end']+self::BUFFER; }
    public static function blocks(array $b, int $now): bool
    {
        // Expired holds with uncertain provider outcomes stay reserved until reconciliation.
        return in_array($b['status'],self::ACTIVE,true);
    }
    public static function quote(array $s,array $x,?string $ignore=null): array
    {
        self::require(is_string($x['roomId'] ?? null) && is_string($x['plan'] ?? null),'Mã phòng/gói phải là chuỗi hợp lệ.');
        $start=self::integer($x['start'] ?? null,1,9007199254740991); $end=self::integer($x['end'] ?? null,$start+1,9007199254740991);
        $minutes=intdiv($end-$start,self::MINUTE);
        self::require(($end-$start)%self::MINUTE===0 && $minutes>=30 && $minutes<=1440 && $minutes%30===0 && $start%(30*self::MINUTE)===0,'Chọn thời gian theo bước 30 phút, tối đa 24 giờ.');
        $room=self::item($s['rooms'],$x['roomId'] ?? ''); $type=self::item($s['types'],$room['typeId']); $studio=self::item($s['studios'],$type['studioId']);
        self::require($room['active'] && $studio['active'],'Phòng ngưng hoạt động.');
        self::require($start >= $s['now']+(24*60+$studio['policy']['paymentMinutes'])*self::MINUTE,'Phải đặt trước ít nhất 24 giờ cộng hạn cọc.');
        $plan=null; foreach(self::effectivePlans($room,$type) as $p) if($p['plan']===($x['plan'] ?? '')) $plan=$p;
        self::require($plan!==null,'Gói thuê không khả dụng.');
        if($plan['kind']!=='hourly') self::require($minutes===$plan['durationMinutes'],'Thời lượng không khớp gói.');
        if($plan['kind']==='session') self::require((int)date('G',intdiv($start,1000))*60+(int)date('i',intdiv($start,1000))===self::clock($plan['sessionStart']),'Giờ bắt đầu không khớp buổi.');
        $hours=$studio['operatingHours'] ?? ['mode'=>'fixed','opens'=>sprintf('%02d:00',$studio['policy']['openHour']),'closes'=>sprintf('%02d:00',$studio['policy']['closeHour'])];
        $day=strtotime(date('Y-m-d',intdiv($start,1000)).' 00:00:00')*1000;
        if($hours['mode']!=='all_day') {
            $open=self::clock($hours['opens']); $close=self::clock($hours['closes']); if($close<=$open) $close+=1440; $inside=false;
            foreach([$day-86400000,$day] as $d) if($start>=$d+$open*self::MINUTE && $end<=$d+$close*self::MINUTE) $inside=true;
            self::require($inside,'Ngoài giờ hoạt động.');
        }
        $crew=$room['crewPolicy'] ?? $type['crewPolicy'] ?? null;
        if($crew && isset($plan['includedCrew'])) $crew['included']=$plan['includedCrew'];
        self::integer($x['participants'] ?? null,1,min($room['capacity'],$crew['maximum'] ?? $room['capacity']));
        $price=$plan['price']; $promotion=$plan['promotion'] ?? null; $date=date('Y-m-d',intdiv($start,1000)); $savings=0;
        if($promotion) { if($date<$promotion['startsOn'] || $date>$promotion['endsOn']) $price=$promotion['originalPrice']; else $savings=$promotion['originalPrice']-$price; }
        $rental=self::roundRatio($price*($plan['kind']==='hourly'?$minutes:60),60);
        $savings=self::roundRatio($savings*($plan['kind']==='hourly'?$minutes:60),60);
        $extras=$x['equipment'] ?? []; self::require(is_array($extras) && count($extras)<=100,'Danh sách thiết bị không hợp lệ.');
        $totalEquipment=$plan['includedEquipment']; $equipment=0;
        foreach($extras as $id=>$q) {
            self::integer($q,0,10000); if($q===0) continue; $e=self::item($s['equipment'],$id); self::require($e['active'] && $e['studioId']===$studio['id'],'Thiết bị không thuộc Studio.');
            $equipment+=self::roundRatio($e['hourlyRate']*$q*(($e['pricingUnit'] ?? 'hour')==='session'?60:$minutes),60); $totalEquipment[$id]=($totalEquipment[$id] ?? 0)+$q;
        }
        $eligible=0; $rule=$studio['timeSurcharge'] ?? null;
        if($rule && $rule['enabled']) {
            $a=self::clock($rule['start']); $b=self::clock($rule['end']); if($b<=$a) $b+=1440;
            for($d=$day-86400000;$d<$end;$d+=86400000) $eligible+=intdiv(max(0,min($end,$d+$b*self::MINUTE)-max($start,$d+$a*self::MINUTE)),self::MINUTE);
        }
        $timeSurcharge= !$eligible?0:($rule['method']==='fixed'?self::roundRatio($rule['value']*$eligible,60):self::roundRatio($rental*$rule['value']*$eligible,100*$minutes));
        $extraPeople=$crew?max(0,$x['participants']-$crew['included']):0;
        $crewSurcharge=$crew && $crew['surchargeEnabled']?self::roundRatio($extraPeople*$crew['amount']*($crew['unit']==='hour'?$minutes:60),60):0;
        $total=$rental+$equipment+$timeSurcharge+$crewSurcharge; self::integer($total,1);
        $relevant=array_values(array_filter($s['bookings'],fn($b)=>$b['id']!==$ignore && self::blocks($b,$s['now']) && self::overlaps($x,$b)));
        foreach($relevant as $b) self::require($b['roomId']!==$x['roomId'],'Phòng đã có lịch thuê hoặc đang chuẩn bị.',409);
        foreach($totalEquipment as $id=>$q) {
            $e=self::item($s['equipment'],$id); self::require($e['active'] && $e['studioId']===$studio['id'],'Thiết bị kèm gói không khả dụng.');
            $points=[$start]; foreach($relevant as $b) { if($b['start']>=$start && $b['start']<$end+self::BUFFER) $points[]=$b['start']; }
            foreach($points as $t) {
                $used=0; foreach($relevant as $b) if($b['start']<=$t && $t<$b['end']+self::BUFFER) $used+=($b['rentalSnapshot']['totalEquipment'][$id] ?? $b['equipment'][$id] ?? 0);
                self::require($q+$used<=$e['quantity'],'Thiết bị không đủ trong khoảng thuê và chuẩn bị.',409);
            }
        }
        return ['plan'=>$plan,'breakdown'=>compact('rental','equipment','timeSurcharge','crewSurcharge','extraPeople','total')+['timeSurchargeMinutes'=>$eligible,'discountSavings'=>$savings,'deposit'=>self::roundRatio($total*$studio['policy']['depositPercent'],100)],'totalEquipment'=>$totalEquipment,'crewPolicy'=>$crew,'operatingHours'=>$hours,'timeSurcharge'=>$rule];
    }
    public static function roundRatio(int $numerator,int $denominator): int { return intdiv($numerator+intdiv($denominator,2),$denominator); }
    public static function balance(array $b): int { return max(0,$b['total']+$b['overtime']-($b['payment']==='paid'?$b['deposit']:0)-array_sum(array_column($b['collections'],'amount'))); }
}
