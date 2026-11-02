<?php
declare(strict_types=1);
namespace App\Services;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

/** Read projection for the existing UI, plus transactional application commands. */
final class WorkspaceService
{
    private PDO $db;
    public function __construct(?PDO $db=null) { $this->db=$db ?? Db::getConnection(); }
    private function rows(string $sql,array $args=[]): array { $q=$this->db->prepare($sql); $q->execute($args); return $q->fetchAll(PDO::FETCH_ASSOC); }
    private function run(string $sql,array $args=[]): void { $this->db->prepare($sql)->execute($args); }
    private static function json(mixed $v): string { return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    private static function decode(?string $v): array { return $v===null?[]:json_decode($v,true,512,JSON_THROW_ON_ERROR); }
    private static function ms(?string $v): int { return $v===null?0:strtotime($v)*1000; }
    private static function sql(int $ms): string { return date('Y-m-d H:i:s',intdiv($ms,1000)); }
    private function audit(?array $actor,string $action,string $target,string $reason=''): void {
        $this->run('INSERT INTO audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)',[$actor?(int)$actor['user_id']:null,$action,'integration',(int)$target,self::json(['target'=>$target,'reason'=>$reason])]);
    }
    public function state(?array $actor=null,bool $internal=false): array
    {
        $now=(int)$this->db->query('SELECT UNIX_TIMESTAMP(NOW())*1000')->fetchColumn();
        $s=['version'=>1,'now'=>$now,'sessionId'=>$actor?(string)$actor['user_id']:null,'users'=>[],'studios'=>[],'types'=>[],'rooms'=>[],'equipment'=>[],'bookings'=>[],'applications'=>[],'audit'=>[],'notifications'=>[],'supportRequests'=>[],'availability'=>[]];
        $allUsers=$this->rows('SELECT u.*,r.role_name AS role FROM users u JOIN roles r USING(role_id)');
        $incidents=$this->rows('SELECT * FROM booking_incidents');
        foreach($allUsers as $u) {
            $strikes=[]; foreach($incidents as $i) if($i['user_id']===$u['user_id']) $strikes[]=['bookingId'=>(string)$i['booking_id'],'at'=>self::ms($i['created_at']),'active'=>(bool)$i['active']];
            $s['users'][]=['id'=>(string)$u['user_id'],'name'=>$u['full_name'],'email'=>$u['email'],'phone'=>$u['phone'] ?? '', 'role'=>$u['role'],'locked'=>$u['status']==='locked','restricted'=>(bool)$u['booking_restricted'],'strikes'=>$strikes];
        }
        foreach($this->rows('SELECT * FROM studios') as $st) {
            $config=self::decode($st['integration_config']);
            $s['studios'][]=$config+['id'=>(string)$st['studio_id'],'hostId'=>(string)$st['host_id'],'name'=>$st['name'],'address'=>$st['address'],'district'=>$st['district'] ?? '', 'description'=>$st['description'] ?? '', 'active'=>$st['status']==='active',
                // Editor defaults only. Booking requires a policy explicitly saved by the Host.
                'policy'=>['paymentMinutes'=>15,'depositPercent'=>30,'cancelHours'=>24,'changeHours'=>24,'refundTiers'=>[],'overtimePerBlock'=>0,'openHour'=>8,'closeHour'=>22]];
        }
        foreach($this->rows('SELECT * FROM room_types') as $t) $s['types'][]=['id'=>(string)$t['type_id'],'studioId'=>(string)$t['studio_id'],'name'=>$t['name']]+self::decode($t['config']);
        foreach($this->rows('SELECT * FROM rooms') as $r) {
            $images=array_column($this->rows('SELECT image_url FROM room_images WHERE room_id=? ORDER BY is_primary DESC,sort_order',[$r['room_id']]),'image_url');
            $amenities=array_column($this->rows('SELECT a.name FROM amenities a JOIN room_amenities ra USING(amenity_id) WHERE ra.room_id=?',[$r['room_id']]),'name');
            $s['rooms'][]=['id'=>(string)$r['room_id'],'typeId'=>(string)$r['type_id'],'name'=>$r['name'],'area'=>(float)$r['area'],'capacity'=>(int)$r['capacity'],'active'=>$r['status']==='active','images'=>$images?:['/images/daylight.jpg'],'amenities'=>$amenities]+self::decode($r['integration_config'])+['code'=>(string)$r['room_id'],'floor'=>'','feature'=>$r['description'] ?? '', 'included'=>[]];
        }
        foreach($this->rows('SELECT e.*,c.name AS category FROM equipments e JOIN equipment_categories c USING(category_id)') as $e) $s['equipment'][]=['id'=>(string)$e['equipment_id'],'studioId'=>(string)$e['studio_id'],'name'=>$e['name'],'category'=>$e['category'],'quantity'=>(int)$e['total_quantity'],'hourlyRate'=>(int)$e['unit_price'],'pricingUnit'=>$e['pricing_unit'],'active'=>$e['status']==='active','image'=>$e['image_url']?:'/images/daylight.jpg','description'=>$e['description'] ?? '']+self::decode($e['integration_config']);
        foreach($this->rows('SELECT * FROM bookings') as $row) {
            $b=self::decode($row['integration_snapshot']);
            if(!$b) {
                // Legacy records stay readable; lifecycle mutations require an audited migration of missing policy evidence.
                $b=['id'=>(string)$row['booking_id'],'customerId'=>(string)$row['customer_id'],'roomId'=>(string)$row['room_id'],'start'=>self::ms($row['start_time']),'end'=>self::ms($row['end_time']),'participants'=>(int)$row['party_size'],'plan'=>'hourly','equipment'=>[], 'status'=>$row['status'],'createdAt'=>self::ms($row['created_at']),'deadline'=>self::ms($row['expires_at']),'policy'=>['paymentMinutes'=>15,'depositPercent'=>30,'cancelHours'=>24,'changeHours'=>24,'refundTiers'=>[],'overtimePerBlock'=>0,'openHour'=>8,'closeHour'=>22],'total'=>(int)$row['total_amount'],'deposit'=>(int)$row['deposit_amount'],'payment'=>$row['payment_status'],'paymentAttempts'=>[],'reconciliation'=>false,'refund'=>['status'=>'not_required','amount'=>0,'reason'=>'','attempts'=>[],'escalated'=>false],'collections'=>[],'overtime'=>0,'changes'=>[],'history'=>[['at'=>self::ms($row['created_at']),'text'=>'Đơn lịch sử — cần đối chiếu chính sách trước khi thay đổi.']],'legacy'=>true];
                foreach($this->rows('SELECT equipment_id,quantity FROM booking_details WHERE booking_id=?',[$row['booking_id']]) as $d) $b['equipment'][(string)$d['equipment_id']]=(int)$d['quantity'];
            }
            $s['bookings'][]=$b;
        }
        foreach($this->rows('SELECT * FROM host_applications') as $a) $s['applications'][]=['id'=>(string)$a['application_id'],'userId'=>(string)$a['user_id'],'studioName'=>$a['studio_name'],'address'=>$a['address'],'description'=>$a['description'],'status'=>$a['status'],'reason'=>$a['reason']];
        foreach($this->rows('SELECT * FROM booking_support_requests') as $r) $s['supportRequests'][]=['id'=>(string)$r['request_id'],'userId'=>(string)$r['user_id'],'at'=>self::ms($r['created_at']),'reason'=>$r['reason'],'status'=>$r['status']];
        if($internal) return $s;
        $admin=($actor['role'] ?? '')==='admin'; $host=($actor['role'] ?? '')==='host'; $id=$actor?(string)$actor['user_id']:'';
        $hostStudios=array_column(array_filter($s['studios'],fn($st)=>$st['hostId']===$id),'id');
        $hostTypes=array_column(array_filter($s['types'],fn($t)=>in_array($t['studioId'],$hostStudios,true)),'id');
        $hostRooms=array_column(array_filter($s['rooms'],fn($r)=>in_array($r['typeId'],$hostTypes,true)),'id');
        $visible=[];
        foreach($s['bookings'] as $b) {
            if($admin || ($host && in_array($b['roomId'],$hostRooms,true)) || $b['customerId']===$id) $visible[]=$b;
            elseif(RentalRules::blocks($b,$now)) $s['availability'][]=['roomId'=>$b['roomId'],'start'=>$b['start'],'end'=>$b['end'],'equipment'=>(object)($b['rentalSnapshot']['totalEquipment'] ?? $b['equipment'])];
        }
        $s['bookings']=$visible;
        if($admin || $host) $s['report']=$this->summarize($visible);
        $customerIds=$host?array_column($visible,'customerId'):[];
        $s['users']=array_values(array_filter($s['users'],fn($u)=>$admin || $u['id']===$id || in_array($u['id'],$customerIds,true)));
        if($host) foreach($s['users'] as &$u) if($u['id']!==$id) { $u['strikes']=[]; $u['restricted']=false; $u['locked']=false; } unset($u);
        $s['applications']=array_values(array_filter($s['applications'],fn($a)=>$admin || $a['userId']===$id));
        $s['supportRequests']=array_values(array_filter($s['supportRequests'],fn($a)=>$admin || $a['userId']===$id));
        if($admin) foreach($this->rows('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 1000') as $a) {
            $meta=self::decode($a['metadata']); $s['audit'][]=['id'=>(string)$a['log_id'],'at'=>self::ms($a['created_at']),'actorId'=>(string)($a['user_id'] ?? 'system'),'action'=>$a['action'],'target'=>$meta['target'] ?? (string)$a['entity_id'],'reason'=>$meta['reason'] ?? ''];
        }
        // Private historical catalog stays available for booked rooms, public lists filter active.
        $historyRooms=array_column($visible,'roomId');
        $s['rooms']=array_values(array_filter($s['rooms'],fn($r)=>$admin || in_array($r['id'],$hostRooms,true) || in_array($r['id'],$historyRooms,true) || ($r['active'] && RentalRules::item($s['studios'],RentalRules::item($s['types'],$r['typeId'])['studioId'])['active'])));
        $usedTypes=array_column($s['rooms'],'typeId');
        $s['types']=array_values(array_filter($s['types'],fn($t)=>$admin || in_array($t['id'],$usedTypes,true) || in_array($t['studioId'],$hostStudios,true)));
        $usedStudios=array_column($s['types'],'studioId');
        $s['studios']=array_values(array_filter($s['studios'],fn($st)=>$admin || $st['active'] || in_array($st['id'],$usedStudios,true) || in_array($st['id'],$hostStudios,true)));
        $studioIds=array_column($s['studios'],'id');
        $s['equipment']=array_values(array_filter($s['equipment'],fn($e)=>$admin || in_array($e['studioId'],$hostStudios,true) || ($e['active'] && in_array($e['studioId'],$studioIds,true))));
        return $s;
    }
    private function lock(): void { RentalRules::require($this->db->query('SELECT id FROM integration_mutex WHERE id=1 FOR UPDATE')->fetch()!==false,'Cần hoàn tất nâng cấp cơ sở dữ liệu.',503); }
    public function quote(array $actor,array $selection): array {
        $s=$this->state($actor,true); return RentalRules::quote($s,$selection);
    }
    public function command(array $actor,array $command,string $key): array
    {
        RentalRules::require(preg_match('/^[A-Za-z0-9_-]{16,100}$/D',$key)===1,'Cần Idempotency-Key hợp lệ.');
        $this->db->beginTransaction();
        try {
            $this->lock();
            // Auth middleware ran before the lock: revalidate after waiting for another writer.
            $live=$this->rows('SELECT u.*,r.role_name AS role FROM users u JOIN roles r USING(role_id) WHERE user_id=?',[$actor['user_id']])[0] ?? null;
            RentalRules::require($live!==null && $live['status']==='active','Tài khoản không khả dụng.',403); $actor=$live;
            $hash=hash('sha256',self::json($command));
            $old=$this->rows('SELECT payload_hash FROM integration_requests WHERE user_id=? AND request_key=?',[$actor['user_id'],$key]);
            if($old) RentalRules::require(hash_equals($old[0]['payload_hash'],$hash),'Khóa yêu cầu đã được dùng cho nội dung khác.',409);
            else {
                $this->apply($actor,$command,$key);
                $this->run('INSERT INTO integration_requests(user_id,request_key,payload_hash) VALUES(?,?,?)',[$actor['user_id'],$key,$hash]);
            }
            $result=$this->state($actor); $this->db->commit(); return $result;
        } catch(\Throwable $e) { if($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    private function role(array $a,string $role): void { RentalRules::require($a['role']===$role,'Bạn không có quyền thực hiện thao tác.',403); }
    private function ownStudio(array $s,array $a,string $id): array {
        $this->role($a,'host'); $st=RentalRules::item($s['studios'],$id); RentalRules::require($st['hostId']===(string)$a['user_id'],'Bạn không quản lý Studio này.',403); return $st;
    }
    private function studioFor(array $s,string $roomId): array { return RentalRules::item($s['studios'],RentalRules::item($s['types'],RentalRules::item($s['rooms'],$roomId)['typeId'])['studioId']); }
    private function saveBooking(array $b,?array $actor,string $action,string $reason=''): void {
        $labels=['booking.created'=>'Đã giữ phòng và thiết bị, chờ cọc','booking.payment'=>'Đã cập nhật thanh toán mô phỏng','booking.approve'=>'Chủ Studio đã xác nhận','booking.reject'=>'Chủ Studio từ chối, tạo nghĩa vụ hoàn cọc','booking.checkin'=>'Đã nhận phòng','booking.checkout'=>'Đã trả phòng, ghi nhận công nợ','booking.cancel'=>'Khách đã hủy đơn','booking.admin_cancel'=>'Quản trị viên đã hủy ngoại lệ','booking.change'=>'Đã gửi yêu cầu đổi lịch','booking.approve_change'=>'Đã duyệt và giữ lịch thay thế','booking.reject_change'=>'Đã từ chối đổi lịch','booking.withdraw_change'=>'Đã rút yêu cầu đổi lịch','booking.collect'=>'Đã ghi nhận khoản thu bổ sung','booking.refund'=>'Đã cập nhật hoàn cọc mô phỏng','booking.reconcile'=>'Đã đối soát giao dịch mô phỏng','booking.resolve_refund'=>'Đã xác nhận hoàn cọc mô phỏng','booking.deadline'=>'Đã xử lý thời hạn của đơn'];
        $b['history'][]=['at'=>(int)$this->db->query('SELECT UNIX_TIMESTAMP(NOW())*1000')->fetchColumn(),'text'=>($labels[$action] ?? 'Đã cập nhật đơn').($reason?': '.$reason:'')];
        $this->run('UPDATE bookings SET room_id=?,start_time=?,end_time=?,busy_start=?,busy_end=?,status=?,payment_status=?,approval_deadline=?,completed_at=?,total_amount=?,deposit_amount=?,integration_snapshot=? WHERE booking_id=?',
            [(int)$b['roomId'],self::sql($b['start']),self::sql($b['end']),self::sql($b['start']),self::sql($b['end']+RentalRules::BUFFER),$b['status'],$b['payment'],isset($b['paidAt'])?self::sql($b['paidAt']+2*RentalRules::HOUR):null,$b['status']==='completed'?self::sql($b['actualOut']):null,$b['total'],$b['deposit'],self::json($b),(int)$b['id']]);
        $this->audit($actor,$action,$b['id'],$reason);
        if(in_array($action,['booking.created','booking.approve_change'],true)) {
            $p=$b['rentalSnapshot']['plan']; $breakdown=$b['rentalSnapshot']['breakdown'];
            $rate=$this->rows("SELECT rate_id FROM room_rates WHERE room_id=? AND status='active' AND unit_minutes=? AND (rate_unit=? OR (?='package' AND rate_unit<>'hour')) ORDER BY rate_id DESC LIMIT 1",[(int)$b['roomId'],$p['kind']==='hourly'?60:$p['durationMinutes'],$p['kind']==='hourly'?'hour':'session',$p['kind']==='hourly'?'hour':'package']);
            RentalRules::require(count($rate)>0,'Không tìm thấy bản ghi giá tương ứng.',409);
            $this->run('UPDATE bookings SET rate_id=?,rate_unit=?,rental_units=?,room_unit_price=?,room_amount=?,equipment_amount=?,party_size=? WHERE booking_id=?',[(int)$rate[0]['rate_id'],$p['kind']==='hourly'?'hour':'session',($b['end']-$b['start'])/RentalRules::HOUR,$p['price'],$breakdown['rental'],$breakdown['equipment'],$b['participants'],(int)$b['id']]);
            $this->run('DELETE FROM booking_details WHERE booking_id=?',[(int)$b['id']]);
            foreach($b['rentalSnapshot']['totalEquipment'] as $id=>$quantity) {
                $e=$this->rows('SELECT * FROM equipments WHERE equipment_id=?',[(int)$id])[0];
                $minutes=intdiv($b['end']-$b['start'],RentalRules::MINUTE); $extras=$b['equipment'][$id] ?? 0;
                $subtotal=RentalRules::roundRatio((int)$e['unit_price']*$extras*($e['pricing_unit']==='session'?60:$minutes),60);
                $this->run('INSERT INTO booking_details(booking_id,equipment_id,quantity,pricing_unit,unit_price,equipment_hours,subtotal) VALUES(?,?,?,?,?,?,?)',[(int)$b['id'],(int)$id,$quantity,$e['pricing_unit'],(int)$e['unit_price'],$minutes/60,$subtotal]);
            }
        }
    }
    private function incident(array $b): void {
        $this->run('INSERT IGNORE INTO booking_incidents(user_id,booking_id) VALUES(?,?)',[(int)$b['customerId'],(int)$b['id']]);
        $this->run('UPDATE users SET booking_restricted=1 WHERE user_id=? AND (SELECT COUNT(*) FROM booking_incidents WHERE user_id=? AND active=1)>=3',[(int)$b['customerId'],(int)$b['customerId']]);
    }
    private function refund(array &$b,int $amount,string $reason): void {
        if($amount<=0) return;
        $historical=array_sum(array_column($b['refundHistory'] ?? [],'amount'));
        $current=$b['refund']['status']==='not_required'?0:$b['refund']['amount'];
        $additional=max(0,min($amount,$b['deposit'])-$historical-$current);
        if(!$additional) return;
        if($b['refund']['status']==='pending') { $b['refund']['amount']+=$additional; $b['refund']['reason']=$reason; return; }
        RentalRules::require(in_array($b['refund']['status'],['not_required','refunded'],true),'Khoản hoàn trước cần đối soát trước khi tạo thêm.',409);
        if($b['refund']['status']==='refunded') $b['refundHistory'][]=$b['refund'];
        $b['refund']=['status'=>'pending','amount'=>$additional,'reason'=>$reason,'attempts'=>[],'escalated'=>false];
    }
    private function adapter(): void {
        $env=$_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '';
        RentalRules::require(in_array($env,['dev','test'],true) && ($_ENV['PAYMENT_ADAPTER'] ?? getenv('PAYMENT_ADAPTER'))==='development','Chưa cấu hình dịch vụ thanh toán/hoàn tiền. Không ghi nhận giao dịch thật.',503);
    }
    private function apply(array $a,array $c,string $key): void
    {
        $s=$this->state($a,true); $now=$s['now']; $kind=$c['type'] ?? ''; $user=RentalRules::item($s['users'],(string)$a['user_id']);
        if($kind==='pricing_batch') {
            $this->role($a,'host'); RentalRules::require(is_array($c['commands'] ?? null) && count($c['commands'])<=100,'Gói thay đổi không hợp lệ.');
            foreach($c['commands'] as $sub) { RentalRules::require(in_array($sub['type'] ?? '',['rate','rental_plans','crew_policy','featured_pricing'],true),'Thao tác ngoài phạm vi bảng giá.'); $this->apply($a,$sub,$key); } return;
        }
        if($kind==='create') {
            $this->role($a,'customer'); RentalRules::require(!$user['restricted'],'Quyền đặt thuê đang tạm ngưng.',403);
            RentalRules::require(preg_match('/^0\d{9}$/D',$user['phone'])===1,'Cập nhật số điện thoại trong hồ sơ.');
            $x=$this->selection($c['selection'] ?? []); $st=$this->studioFor($s,$x['roomId'] ?? '');
            $config=$this->rows('SELECT integration_config FROM studios WHERE studio_id=?',[(int)$st['id']])[0];
            RentalRules::require(isset(self::decode($config['integration_config'])['policy']),'Chủ Studio cần lưu chính sách trước khi nhận đặt thuê.',409);
            RentalRules::policy($st['policy']); $snap=RentalRules::quote($s,$x);
            RentalRules::require(($c['expectedTotal'] ?? null)===$snap['breakdown']['total'],'Giá đã thay đổi. Tải lại phòng và kiểm tra giá trước khi xác nhận.',409);
            RentalRules::require(($c['expectedDeposit'] ?? null)===$snap['breakdown']['deposit'] && ($c['expectedPolicy'] ?? null)==$st['policy'],'Cọc hoặc chính sách đã thay đổi. Tải lại và xác nhận điều khoản mới.',409);
            $rate=$this->rows("SELECT rate_id FROM room_rates WHERE room_id=? AND status='active' AND (rate_unit=? OR (?='package' AND rate_unit<>'hour')) AND unit_minutes=? ORDER BY rate_id DESC LIMIT 1",[(int)$x['roomId'],$snap['plan']['kind']==='hourly'?'hour':'session',$snap['plan']['kind']==='hourly'?'hour':'package',$snap['plan']['kind']==='hourly'?60:$snap['plan']['durationMinutes']]);
            RentalRules::require(count($rate)>0,'Phòng chưa có bản ghi giá.',409);
            $total=$snap['breakdown']['total']; $deposit=$snap['breakdown']['deposit'];
            $this->run("INSERT INTO bookings(booking_code,room_id,customer_id,rate_id,start_time,end_time,busy_start,busy_end,party_size,rate_unit,rental_units,room_unit_price,room_amount,equipment_amount,total_amount,deposit_amount,customer_name,customer_phone,customer_email,status,expires_at,request_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'awaiting_payment',?,?)",
                ['SH-'.bin2hex(random_bytes(10)),(int)$x['roomId'],(int)$a['user_id'],(int)$rate[0]['rate_id'],self::sql($x['start']),self::sql($x['end']),self::sql($x['start']),self::sql($x['end']+RentalRules::BUFFER),$x['participants'],'hour',($x['end']-$x['start'])/RentalRules::HOUR,$snap['plan']['price'],$snap['breakdown']['rental'],$snap['breakdown']['equipment'],$total,$deposit,$user['name'],$user['phone'],$user['email'],self::sql($now+$st['policy']['paymentMinutes']*RentalRules::MINUTE),$key]);
            $id=(string)$this->db->lastInsertId();
            $b=$x+['id'=>$id,'customerId'=>(string)$a['user_id'],'status'=>'awaiting_payment','createdAt'=>$now,'deadline'=>$now+$st['policy']['paymentMinutes']*RentalRules::MINUTE,'policy'=>$st['policy'],'total'=>$total,'deposit'=>$deposit,'payment'=>'unpaid','paymentAttempts'=>[],'reconciliation'=>false,'refund'=>['status'=>'not_required','amount'=>0,'reason'=>'','attempts'=>[],'escalated'=>false],'collections'=>[],'overtime'=>0,'changes'=>[],'history'=>[],'rentalSnapshot'=>$snap];
            $this->saveBooking($b,$a,'booking.created'); return;
        }
        $bookingKinds=['payment','approve','reject','checkin','checkout','cancel','admin_cancel','collect','refund','change','approve_change','reject_change','withdraw_change','reconcile','resolve_refund'];
        if(in_array($kind,$bookingKinds,true)) {
            $b=RentalRules::item($s['bookings'],$c['id'] ?? ''); $st=$this->studioFor($s,$b['roomId']);
            RentalRules::require($a['role']==='admin' || ($a['role']==='host' && $st['hostId']===(string)$a['user_id']) || ($a['role']==='customer' && $b['customerId']===(string)$a['user_id']),'Bạn không thể truy cập đơn này.',403);
            RentalRules::require(!($b['legacy'] ?? false),'Đơn lịch sử thiếu snapshot; cần đối chiếu chính sách và sổ thu trước khi thay đổi.',409);
            $reason=isset($c['reason'])?RentalRules::text($c['reason'],1,2000):'';
            if($kind==='payment') {
                $this->role($a,'customer'); $this->adapter();
                if($b['payment']==='paid') return;
                RentalRules::require($b['status']==='awaiting_payment','Đơn không còn chờ cọc.',409);
                $last=array_key_last($b['paymentAttempts']); $processing=$last!==null && $b['paymentAttempts'][$last]['status']==='processing';
                RentalRules::require($now<$b['deadline'] || ($processing && $now<$b['deadline']+5*RentalRules::MINUTE),'Đã hết hạn bắt đầu hoặc xác nhận thanh toán.',409);
                $outcome=$c['outcome'] ?? ''; RentalRules::require(in_array($outcome,['paid','failed','processing'],true),'Kết quả mô phỏng không hợp lệ.');
                if(!$processing) $b['paymentAttempts'][]=['id'=>$key,'at'=>$now,'status'=>'processing'];
                $last=array_key_last($b['paymentAttempts']); $b['paymentAttempts'][$last]['status']=$outcome; $b['payment']=$outcome;
                if($outcome==='failed') $b['providerFailure']=true;
                if($outcome==='paid') {
                    $b['status']='pending'; $b['paidAt']=$now;
                    $this->run("INSERT INTO payments(booking_id,payment_type,payment_method,amount,status,transaction_code) VALUES(?,'deposit','development',?,'success',?)",[(int)$b['id'],$b['deposit'],'dev-'.$key]);
                }
            } elseif(in_array($kind,['approve','reject','checkin','checkout','approve_change','reject_change'],true)) {
                $this->role($a,'host');
                if($kind==='approve' || $kind==='reject') {
                    RentalRules::require($b['status']==='pending' && $b['payment']==='paid' && $now<$b['paidAt']+2*RentalRules::HOUR,'Đơn không còn chờ duyệt hợp lệ.',409);
                    if($kind==='approve') $b['status']='confirmed'; else { RentalRules::text($reason); $b['status']='cancelled'; $this->refund($b,$b['deposit'],'host_rejected'); }
                } elseif($kind==='checkin') {
                    RentalRules::require($b['status']==='confirmed' && $now>=$b['start'] && $now<$b['end'],'Chỉ nhận phòng trong ca đã xác nhận.',409); $b['status']='checked_in'; $b['actualIn']=$now;
                } elseif($kind==='checkout') {
                    RentalRules::require($b['status']==='checked_in','Đơn chưa nhận phòng.',409); $b['status']='completed'; $b['actualOut']=$now;
                    $blocks=intdiv(max(0,$now-$b['end'])+RentalRules::BUFFER-1,RentalRules::BUFFER); $b['overtime']=$blocks*$b['policy']['overtimePerBlock'];
                    $b['overtimeConflict']=false;
                    foreach($s['bookings'] as $other) if($other['id']!==$b['id'] && $other['roomId']===$b['roomId'] && RentalRules::blocks($other,$now) && $other['start']<$now+RentalRules::BUFFER && $other['end']>$b['end']) $b['overtimeConflict']=true;
                } else {
                    $i=array_key_last($b['changes']); RentalRules::require($i!==null && $b['changes'][$i]['status']==='pending' && $b['status']==='confirmed','Không có yêu cầu đổi lịch hợp lệ.',409);
                    if($kind==='reject_change') $b['changes'][$i]['status']='rejected';
                    else {
                        $customer=RentalRules::item($s['users'],$b['customerId']); RentalRules::require(!$customer['restricted'],'Khách đang bị hạn chế đổi lịch.',403);
                        RentalRules::require($now<=$b['start']-$b['policy']['changeHours']*RentalRules::HOUR,'Đã qua hạn đổi lịch.',409);
                        $x=$b['changes'][$i]['selection']; RentalRules::require($this->studioFor($s,$x['roomId'])['id']===$st['id'],'Phòng thay thế phải cùng Studio.');
                        $snapshot=RentalRules::quote($s,$x,$b['id']);
                        foreach(['roomId','start','end','participants','plan','equipment'] as $field) $b[$field]=$x[$field];
                        $b['rentalSnapshot']=$snapshot; $b['total']=$snapshot['breakdown']['total'];
                        $b['changes'][$i]['status']='approved'; $this->refund($b,max(0,$b['deposit']-$b['total']),'reschedule_excess');
                    }
                }
            } elseif($kind==='cancel' || $kind==='admin_cancel') {
                RentalRules::text($reason); RentalRules::require(in_array($b['status'],['awaiting_payment','pending','confirmed'],true) && $now<$b['start'],'Không thể hủy đơn này.',409);
                if($kind==='admin_cancel') $this->role($a,'admin'); else $this->role($a,'customer');
                RentalRules::require(!$b['reconciliation'] && $b['payment']!=='processing','Cần đối soát thanh toán trước khi hủy.',409);
                if($b['payment']==='paid') {
                    $hours=intdiv($b['start']-$now,RentalRules::HOUR); $percent=$kind==='admin_cancel'?100:0;
                    if($kind==='cancel') {
                        RentalRules::require($hours>=$b['policy']['cancelHours'],'Đã qua hạn tự hủy.');
                        $tiers=$b['policy']['refundTiers']; usort($tiers,fn($x,$y)=>$y['hours']<=>$x['hours']);
                        foreach($tiers as $tier) if($hours>=$tier['hours']) { $percent=$tier['percent']; break; }
                    }
                    $this->refund($b,RentalRules::roundRatio($b['deposit']*$percent,100),'cancellation');
                } elseif($kind==='cancel' && !($b['providerFailure'] ?? false)) $this->incident($b);
                $b['status']='cancelled'; $b['cancelReason']=$reason;
            } elseif($kind==='change') {
                $this->role($a,'customer'); RentalRules::require(!$user['restricted'] && $b['status']==='confirmed' && $now<=$b['start']-$b['policy']['changeHours']*RentalRules::HOUR,'Không đủ điều kiện đổi lịch.');
                foreach($b['changes'] as $ch) RentalRules::require(!in_array($ch['status'],['pending','approved'],true),'Chỉ một lần đổi thành công và một yêu cầu đang chờ.',409);
                $x=$this->selection($c['selection'] ?? []); RentalRules::require($this->studioFor($s,$x['roomId'] ?? '')['id']===$st['id'],'Phòng thay thế phải cùng Studio.'); RentalRules::quote($s,$x,$b['id']);
                $b['changes'][]=['selection'=>$x,'status'=>'pending','at'=>$now];
            } elseif($kind==='withdraw_change') {
                $this->role($a,'customer'); $i=array_key_last($b['changes']); RentalRules::require($i!==null && $b['changes'][$i]['status']==='pending','Không có yêu cầu chờ.'); $b['changes'][$i]['status']='withdrawn';
            } elseif($kind==='collect') {
                $this->role($a,'host'); RentalRules::require(in_array($b['status'],['checked_in','completed'],true),'Chỉ ghi thu cho đơn đã nhận/trả phòng.');
                $amount=RentalRules::integer($c['amount'] ?? null,1,RentalRules::balance($b)); RentalRules::require(in_array($c['method'] ?? '',['cash','transfer'],true),'Hình thức thu không hợp lệ.');
                $collectionId=RentalRules::text($c['collectionId'] ?? $key,1,100);
                foreach($b['collections'] as $collection) if($collection['id']===$collectionId) { RentalRules::require($collection['amount']===$amount && $collection['method']===$c['method'],'Mã thu đã được dùng.',409); return; }
                $b['collections'][]=['id'=>$collectionId,'at'=>$now,'amount'=>$amount,'method'=>$c['method'],'actorId'=>(string)$a['user_id']];
                $this->run("INSERT INTO payments(booking_id,payment_type,payment_method,amount,status,transaction_code) VALUES(?,'remaining',?,?,'success',?)",[(int)$b['id'],$c['method'],$amount,'collection-'.$key]);
            } elseif($kind==='refund') {
                $this->role($a,'host'); $this->adapter(); $r=&$b['refund'];
                RentalRules::require(in_array($r['status'],['pending','failed'],true) && count($r['attempts'])<3 && !$r['escalated'],'Khoản hoàn không thể thử lại.',409);
                $outcome=$c['outcome'] ?? ''; RentalRules::require(in_array($outcome,['refunded','failed'],true),'Kết quả mô phỏng không hợp lệ.');
                $r['attempts'][]=['at'=>$now,'status'=>$outcome]; $r['status']=$outcome; if($outcome==='failed' && count($r['attempts'])>=3) $r['escalated']=true; unset($r);
            } elseif($kind==='reconcile') {
                $this->role($a,'admin'); $this->adapter(); RentalRules::text($reason); RentalRules::require($b['reconciliation'],'Không có thanh toán cần đối soát.');
                RentalRules::require(is_bool($c['paid'] ?? null),'Cần kết quả đối soát.'); $b['reconciliation']=false; $b['payment']=$c['paid']?'paid':'failed';
                $last=array_key_last($b['paymentAttempts']); if($last!==null) $b['paymentAttempts'][$last]['status']=$b['payment'];
                if($c['paid']) { $b['paidAt']=$now; $b['status']='cancelled'; $this->refund($b,$b['deposit'],'late_payment');
                    $this->run("INSERT INTO payments(booking_id,payment_type,payment_method,amount,status,transaction_code) VALUES(?,'deposit','development',?,'success',?)",[(int)$b['id'],$b['deposit'],'reconcile-'.$key]);
                } else { $b['providerFailure']=true; $b['status']='expired'; }
            } elseif($kind==='resolve_refund') {
                $this->role($a,'admin'); $this->adapter(); RentalRules::text($reason); RentalRules::require($b['refund']['escalated'],'Khoản hoàn chưa chuyển Admin.'); $b['refund']['status']='refunded'; $b['refund']['escalated']=false;
            }
            $this->saveBooking($b,$a,'booking.'.$kind,$reason); return;
        }
        $this->manage($s,$a,$c);
    }
    private function selection(array $x): array { return array_intersect_key($x,array_flip(['roomId','start','end','participants','plan','equipment'])); }
    private function url(mixed $value): string {
        $v=RentalRules::text($value,1,255);
        RentalRules::require(str_starts_with($v,'/images/') || (filter_var($v,FILTER_VALIDATE_URL)!==false && parse_url($v,PHP_URL_SCHEME)==='https'),'Ảnh cần URL HTTPS hoặc ảnh dự án.'); return $v;
    }
    private function manage(array $s,array $a,array $c): void
    {
        $kind=$c['type'] ?? ''; $target='0';
        if($kind==='profile') {
            $name=RentalRules::text($c['name'] ?? null,2,100); $phone=RentalRules::text($c['phone'] ?? null,10,20);
            RentalRules::require(preg_match('/^0\d{9}$/D',$phone)===1,'Số điện thoại không hợp lệ.');
            $this->run('UPDATE users SET full_name=?,phone=? WHERE user_id=?',[$name,$phone,$a['user_id']]); $target=(string)$a['user_id'];
        } elseif($kind==='application') {
            $this->role($a,'customer'); RentalRules::require(!$this->rows("SELECT 1 FROM host_applications WHERE user_id=? AND status='pending'",[$a['user_id']]),'Hồ sơ trước đang chờ duyệt.',409);
            $this->run('INSERT INTO host_applications(user_id,studio_name,address,description) VALUES(?,?,?,?)',[$a['user_id'],RentalRules::text($c['studioName'] ?? null,2,150),RentalRules::text($c['address'] ?? null,2),RentalRules::text($c['description'] ?? null,2,10000)]); $target=(string)$this->db->lastInsertId();
        } elseif($kind==='review_application') {
            $this->role($a,'admin'); $app=RentalRules::item($s['applications'],$c['id'] ?? ''); RentalRules::require($app['status']==='pending' && is_bool($c['approved'] ?? null),'Hồ sơ không còn chờ duyệt.',409);
            $reason=RentalRules::text($c['reason'] ?? null,1,2000);
            $this->run('UPDATE host_applications SET status=?,reason=? WHERE application_id=?',[$c['approved']?'approved':'rejected',$reason,(int)$app['id']]);
            if($c['approved']) {
                $this->run("UPDATE users SET role_id=(SELECT role_id FROM roles WHERE role_name='host') WHERE user_id=?",[(int)$app['userId']]);
                $this->run('INSERT INTO studios(host_id,name,address,description) VALUES(?,?,?,?)',[(int)$app['userId'],$app['studioName'],$app['address'],$app['description']]);
            } $target=$app['id'];
        } elseif(in_array($kind,['restore','restrict','lock'],true)) {
            $this->role($a,'admin'); $u=RentalRules::item($s['users'],$c['userId'] ?? ''); RentalRules::text($c['reason'] ?? null,1,2000);
            RentalRules::require($u['id']!==(string)$a['user_id'] && $u['role']!=='admin','Không thay đổi khóa của Admin qua thao tác này.',403);
            if($kind==='lock') $this->run("UPDATE users SET status=? WHERE user_id=?",[$u['locked']?'active':'locked',(int)$u['id']]);
            else {
                RentalRules::require($u['role']==='customer','Hạn chế đặt thuê chỉ áp dụng cho khách hàng.');
                $this->run('UPDATE users SET booking_restricted=? WHERE user_id=?',[$kind==='restrict'?1:0,(int)$u['id']]);
                if($kind==='restore') {
                    $this->run('UPDATE booking_incidents SET active=0 WHERE user_id=?',[(int)$u['id']]);
                    $this->run("UPDATE booking_support_requests SET status='resolved' WHERE user_id=? AND status='pending'",[(int)$u['id']]);
                }
            } $target=$u['id'];
        } elseif($kind==='request_restore') {
            $this->role($a,'customer'); $u=RentalRules::item($s['users'],(string)$a['user_id']); RentalRules::require($u['restricted'],'Tài khoản chưa bị hạn chế.');
            RentalRules::require(!$this->rows("SELECT 1 FROM booking_support_requests WHERE user_id=? AND status='pending'",[$a['user_id']]),'Yêu cầu trước đang chờ.',409);
            $this->run('INSERT INTO booking_support_requests(user_id,reason) VALUES(?,?)',[$a['user_id'],RentalRules::text($c['reason'] ?? null,1,2000)]); $target=(string)$a['user_id'];
        } elseif($kind==='studio_save') {
            $st=$c['studio'] ?? []; $id=(string)($st['id'] ?? ''); $this->ownStudio($s,$a,$id);
            // Existing studios are created by approved Host applications.
            $this->run('UPDATE studios SET name=?,address=?,district=?,description=? WHERE studio_id=?',[RentalRules::text($st['name'] ?? null,2,150),RentalRules::text($st['address'] ?? null,2),RentalRules::text($st['district'] ?? '',0,100),RentalRules::text($st['description'] ?? '',0,10000),(int)$id]); $target=$id;
        } elseif($kind==='studio_status' || $kind==='room_status') {
            $id=(string)($c['id'] ?? ''); RentalRules::require(is_bool($c['active'] ?? null),'Trạng thái không hợp lệ.');
            $st=$kind==='studio_status'?RentalRules::item($s['studios'],$id):$this->studioFor($s,$id);
            if($a['role']==='admin') RentalRules::text($c['reason'] ?? null,1,2000); else $this->ownStudio($s,$a,$st['id']);
            foreach($s['bookings'] as $b) if(!$c['active'] && $b['end']>$s['now'] && RentalRules::blocks($b,$s['now']) && ($kind==='room_status'?$b['roomId']===$id:$this->studioFor($s,$b['roomId'])['id']===$id)) throw new ApiException(409,'future_reservations','Cần xử lý các đơn tương lai trước khi ngưng hoạt động.');
            $table=$kind==='room_status'?'rooms':'studios'; $column=$kind==='room_status'?'room_id':'studio_id'; $this->run("UPDATE $table SET status=? WHERE $column=?",[$c['active']?'active':'inactive',(int)$id]); $target=$id;
        } elseif($kind==='policy' || $kind==='rental_settings') {
            $id=(string)($c['studioId'] ?? ''); $this->ownStudio($s,$a,$id); $config=self::decode($this->rows('SELECT integration_config FROM studios WHERE studio_id=?',[(int)$id])[0]['integration_config']);
            if($kind==='policy') { RentalRules::policy($c['policy'] ?? []); $config['policy']=$c['policy']; }
            else { RentalRules::hours($c['operatingHours'] ?? []); RentalRules::surcharge($c['timeSurcharge'] ?? null); $config['operatingHours']=$c['operatingHours']; $config['timeSurcharge']=$c['timeSurcharge'] ?? null; }
            $this->run('UPDATE studios SET integration_config=? WHERE studio_id=?',[self::json($config),(int)$id]); $target=$id;
        } elseif($kind==='type_save') {
            $t=$c['roomType'] ?? []; $this->ownStudio($s,$a,(string)($t['studioId'] ?? '')); $id=(string)($t['id'] ?? '');
            $config=['category'=>RentalRules::text($t['category'] ?? null,1,100),'hourlyRate'=>RentalRules::integer($t['hourlyRate'] ?? null,1),'plans'=>$t['plans'] ?? ['hourly']];
            RentalRules::require(is_array($config['plans']) && count($config['plans'])>0 && !array_diff($config['plans'],['hourly','session','combo3','combo5','combo10']),'Gói thuê không hợp lệ.');
            $name=RentalRules::text($t['name'] ?? null,1,150);
            if(ctype_digit($id)) {
                $old=RentalRules::item($s['types'],$id); RentalRules::require($old['studioId']===$t['studioId'],'Không chuyển loại phòng giữa Studio.'); $previous=self::decode($this->rows('SELECT config FROM room_types WHERE type_id=?',[(int)$id])[0]['config']);
                $this->run('UPDATE room_types SET name=?,config=? WHERE type_id=?',[$name,self::json($config+array_diff_key($previous,$config)),(int)$id]);
            } else { $this->run('INSERT INTO room_types(studio_id,name,config) VALUES(?,?,?)',[(int)$t['studioId'],$name,self::json($config)]); $id=(string)$this->db->lastInsertId(); } $target=$id;
        } elseif($kind==='room_save') {
            $r=$c['room'] ?? []; $id=(string)($r['id'] ?? ''); $t=RentalRules::item($s['types'],$r['typeId'] ?? ''); $this->ownStudio($s,$a,$t['studioId']);
            $name=RentalRules::text($r['name'] ?? null,1,150); $code=RentalRules::text($r['code'] ?? null,1,50); $area=$r['area'] ?? 0; RentalRules::require(is_numeric($area) && $area>0 && $area<100000,'Diện tích không hợp lệ.'); $capacity=RentalRules::integer($r['capacity'] ?? null,1,1000);
            foreach($s['rooms'] as $other) if($other['id']!==$id && $other['code']===$code && RentalRules::item($s['types'],$other['typeId'])['studioId']===$t['studioId']) throw new ApiException(409,'room_code_exists','Mã phòng đã có trong Studio.');
            $images=$r['images'] ?? []; RentalRules::require(is_array($images) && count($images)>0 && count($images)<=20,'Cần từ 1 đến 20 ảnh.'); foreach($images as $url) $this->url($url);
            $config=['code'=>$code,'floor'=>RentalRules::text($r['floor'] ?? '',0,50),'feature'=>RentalRules::text($r['feature'] ?? '',0,2000),'included'=>$r['included'] ?? []];
            if(isset($r['rateOverride'])) $config['rateOverride']=RentalRules::integer($r['rateOverride'],1);
            RentalRules::require(is_array($config['included']) && count($config['included'])<=100,'Tiện ích không hợp lệ.'); foreach($config['included'] as $text) RentalRules::text($text,1,255);
            if(ctype_digit($id)) {
                $old=RentalRules::item($s['rooms'],$id); RentalRules::require($this->studioFor($s,$id)['id']===$t['studioId'],'Không chuyển phòng giữa Studio.');
                foreach($s['bookings'] as $b) if($b['roomId']===$id && $b['end']>$s['now'] && RentalRules::blocks($b,$s['now'])) RentalRules::require($capacity>=$b['participants'],'Sức chứa thấp hơn đơn đã giữ.');
                $previous=self::decode($this->rows('SELECT integration_config FROM rooms WHERE room_id=?',[(int)$id])[0]['integration_config']);
                if(!isset($r['rateOverride'])) unset($previous['rateOverride']);
                RentalRules::crew($previous['crewPolicy'] ?? $t['crewPolicy'] ?? null,$capacity);
                if(isset($previous['rentalPlans'])) RentalRules::plans($s,$previous['rentalPlans'],$t['studioId'],$capacity,$previous['crewPolicy'] ?? $t['crewPolicy'] ?? null);
                $this->run('UPDATE rooms SET type_id=?,name=?,area=?,capacity=?,integration_config=? WHERE room_id=?',[(int)$t['id'],$name,$area,$capacity,self::json($config+array_diff_key($previous,$config)),(int)$id]);
            } else {
                $this->run('INSERT INTO rooms(studio_id,type_id,name,area,capacity,integration_config) VALUES(?,?,?,?,?,?)',[(int)$t['studioId'],(int)$t['id'],$name,$area,$capacity,self::json($config)]); $id=(string)$this->db->lastInsertId();
                $this->run("INSERT INTO room_rates(room_id,rate_unit,unit_minutes,unit_price,effective_from) VALUES(?,'hour',60,?,CURDATE())",[(int)$id,$config['rateOverride'] ?? $t['hourlyRate']]);
            }
            $this->run('DELETE FROM room_images WHERE room_id=?',[(int)$id]); foreach($images as $i=>$url) $this->run('INSERT INTO room_images(room_id,image_url,is_primary,sort_order) VALUES(?,?,?,?)',[(int)$id,$url,$i===0?1:0,$i]); $target=$id;
        } elseif($kind==='equipment_save') {
            $e=$c['equipment'] ?? []; $this->ownStudio($s,$a,(string)($e['studioId'] ?? '')); $id=(string)($e['id'] ?? ''); $quantity=RentalRules::integer($e['quantity'] ?? null,0,10000); $price=RentalRules::integer($e['hourlyRate'] ?? null);
            $name=RentalRules::text($e['name'] ?? null,1,150); $category=RentalRules::text($e['category'] ?? null,1,100); $image=empty($e['image'])?'':$this->url($e['image']); RentalRules::require(is_bool($e['active'] ?? null),'Trạng thái thiết bị không hợp lệ.');
            $pricingUnit=$e['pricingUnit'] ?? 'hour'; RentalRules::require(in_array($pricingUnit,['hour','session'],true),'Đơn vị tính giá không hợp lệ.');
            if(ctype_digit($id)) {
                $old=RentalRules::item($s['equipment'],$id); RentalRules::require($old['studioId']===$e['studioId'],'Không chuyển kho thiết bị.');
                // Conservatively retain stock while any future reservation includes this equipment.
                $reserved=[]; foreach($s['bookings'] as $b) if($b['end']+RentalRules::BUFFER>$s['now'] && RentalRules::blocks($b,$s['now'])) {
                    $q=$b['rentalSnapshot']['totalEquipment'][$id] ?? $b['equipment'][$id] ?? 0; if($q) $reserved[]=[$b['start'], $b['end']+RentalRules::BUFFER,$q];
                }
                foreach($reserved as $point) { $used=0; foreach($reserved as $r) if($r[0]<=$point[0] && $point[0]<$r[1]) $used+=$r[2]; RentalRules::require($e['active'] && $quantity>=$used,'Tồn kho thấp hơn số lượng đã giữ.',409); }
            }
            $cats=$this->rows('SELECT category_id FROM equipment_categories WHERE studio_id=? AND name=?',[(int)$e['studioId'],$category]);
            if($cats) $cat=(int)$cats[0]['category_id']; else { $this->run('INSERT INTO equipment_categories(studio_id,name) VALUES(?,?)',[(int)$e['studioId'],$category]); $cat=(int)$this->db->lastInsertId(); }
            $args=[$cat,$name,$price,$quantity,$image,$e['active']?'active':'inactive',RentalRules::text($e['description'] ?? '',0,5000)];
            if(ctype_digit($id)) $this->run("UPDATE equipments SET category_id=?,name=?,unit_price=?,total_quantity=?,image_url=?,status=?,description=?,pricing_unit=? WHERE equipment_id=?",[...$args,$pricingUnit,(int)$id]);
            else { $this->run("INSERT INTO equipments(category_id,name,unit_price,total_quantity,image_url,status,description,studio_id,pricing_unit) VALUES(?,?,?,?,?,?,?,?,?)",[...$args,(int)$e['studioId'],$pricingUnit]); $id=(string)$this->db->lastInsertId(); } $target=$id;
        } elseif(in_array($kind,['rate','rental_plans','crew_policy','featured_pricing'],true)) {
            $roomTarget=$kind==='crew_policy' || $kind==='featured_pricing' || ($kind==='rental_plans' && ($c['target'] ?? '')==='room');
            $id=(string)($c['roomId'] ?? $c['id'] ?? ''); $item=RentalRules::item($roomTarget?$s['rooms']:$s['types'],$id); $t=$roomTarget?RentalRules::item($s['types'],$item['typeId']):$item;
            $this->ownStudio($s,$a,$t['studioId']); $table=$roomTarget?'rooms':'room_types'; $col=$roomTarget?'room_id':'type_id'; $field=$roomTarget?'integration_config':'config';
            $config=self::decode($this->rows("SELECT $field FROM $table WHERE $col=?",[(int)$id])[0][$field]);
            if($kind==='rate') {
                $config['hourlyRate']=RentalRules::integer($c['hourlyRate'] ?? null,1); $plans=$c['plans'] ?? [];
                RentalRules::require(is_array($plans) && count($plans)>0 && !array_diff($plans,['hourly','session','combo3','combo5','combo10']),'Gói thuê không hợp lệ.'); $config['plans']=$plans;
            } elseif($kind==='rental_plans') {
                if(($c['plans'] ?? null)===null) unset($config['rentalPlans']);
                else {
                    $rooms=$roomTarget?[$item]:array_values(array_filter($s['rooms'],fn($r)=>$r['typeId']===$id && !isset($r['rentalPlans'])));
                    foreach($rooms?:[['capacity'=>1000]] as $r) RentalRules::plans($s,$c['plans'],$t['studioId'],$r['capacity'],$r['crewPolicy'] ?? $t['crewPolicy'] ?? null);
                    $config['rentalPlans']=$c['plans'];
                }
            } elseif($kind==='crew_policy') {
                RentalRules::crew($c['policy'] ?? null,$item['capacity']); if(isset($c['policy'])) $config['crewPolicy']=$c['policy']; else unset($config['crewPolicy']);
            } else {
                if(($c['selection'] ?? null)===null) unset($config['featuredPricing']);
                else {
                    $sel=$c['selection']; RentalRules::require(in_array($sel['badge'] ?? '',['featured','recommended'],true) && in_array($sel['plan'] ?? '',array_column(RentalRules::effectivePlans($item,$t),'plan'),true),'Gói nổi bật không hợp lệ.');
                    $config['featuredPricing']=['typeId'=>$t['id'],'plan'=>$sel['plan'],'badge'=>$sel['badge']];
                }
            }
            $this->run("UPDATE $table SET $field=? WHERE $col=?",[self::json($config),(int)$id]); $target=$id;
        } else throw new ApiException(422,'unsupported_command','Thao tác chưa được hỗ trợ bởi API.');
        $this->audit($a,$kind,$target,is_string($c['reason'] ?? null)?$c['reason']:'');
        if(in_array($kind,['room_save','type_save','rate','rental_plans'],true)) {
            $fresh=$this->state($a,true);
            foreach($fresh['rooms'] as $r) if(($kind==='room_save' || ($kind==='rental_plans' && ($c['target'] ?? '')==='room'))?$r['id']===$target:$r['typeId']===$target) {
                $this->run("UPDATE room_rates SET status='inactive' WHERE room_id=? AND status='active'",[(int)$r['id']]);
                $t=RentalRules::item($fresh['types'],$r['typeId']);
                foreach(RentalRules::effectivePlans($r,$t) as $p) $this->run('INSERT INTO room_rates(room_id,rate_unit,unit_minutes,unit_price,effective_from) VALUES(?,?,?,?,CURDATE())',[(int)$r['id'],$p['kind']==='hourly'?'hour':'session',$p['kind']==='hourly'?60:$p['durationMinutes'],$p['price']]);
            }
        }
    }
    public function expire(): int
    {
        $this->db->beginTransaction(); $count=0;
        try {
            $this->lock(); $s=$this->state(null,true); $now=$s['now'];
            foreach($s['bookings'] as $b) {
                if($b['legacy'] ?? false) continue;
                $changed=false;
                if($b['status']==='awaiting_payment' && $now>=$b['deadline']) {
                    if($b['payment']==='processing') {
                        if($now<$b['deadline']+5*RentalRules::MINUTE || $b['reconciliation']) continue;
                        $b['reconciliation']=true; $changed=true; // Resources remain held; no customer strike.
                    } else { $b['status']='expired'; if(!($b['providerFailure'] ?? false)) $this->incident($b); $changed=true; }
                } elseif($b['status']==='pending' && isset($b['paidAt']) && $now>=$b['paidAt']+2*RentalRules::HOUR) {
                    $b['status']='cancelled'; $b['cancelReason']='host_timeout'; $this->refund($b,$b['deposit'],'host_timeout'); $changed=true;
                } elseif($b['status']==='confirmed' && $now>=$b['end']) { $b['status']='no_show'; $changed=true; }
                if($changed) { $this->saveBooking($b,null,'booking.deadline'); $count++; }
            }
            $this->run('DELETE FROM auth_revocations WHERE expires_at<NOW()');
            $this->run('DELETE FROM auth_rate_limits WHERE expires_at<NOW()');
            $this->db->commit(); return $count;
        } catch(\Throwable $e) { if($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function report(array $actor): array
    {
        RentalRules::require(in_array($actor['role'],['host','admin'],true),'Bạn không có quyền xem báo cáo.',403);
        return $this->state($actor)['report'];
    }
    private function summarize(array $bookings): array
    {
        $deposits=0; $collections=0; $refunded=0; $refundDue=0; $outstanding=0; $weeks=[]; $months=[];
        foreach($bookings as $b) {
            if($b['payment']==='paid') $deposits+=$b['deposit'];
            $collections+=array_sum(array_column($b['collections'],'amount'));
            if($b['refund']['status']==='refunded') $refunded+=$b['refund']['amount']; elseif($b['refund']['status']!=='not_required') $refundDue+=$b['refund']['amount'];
            foreach($b['refundHistory'] ?? [] as $r) { if($r['status']==='refunded') $refunded+=$r['amount']; elseif($r['status']!=='not_required') $refundDue+=$r['amount']; }
            if(in_array($b['status'],['confirmed','checked_in','completed'],true)) $outstanding+=RentalRules::balance($b);
            if(in_array($b['status'],['confirmed','checked_in','completed'],true)) {
                $week=date('o-\WW',intdiv($b['start'],1000)); $month=date('Y-m',intdiv($b['start'],1000));
                $weeks[$week][$b['roomId']]=($weeks[$week][$b['roomId']] ?? 0)+1; $months[$month][$b['roomId']]=($months[$month][$b['roomId']] ?? 0)+1;
            }
        }
        return ['bookingCount'=>count($bookings),'deposits'=>$deposits,'collections'=>$collections,'refunded'=>$refunded,'refundDue'=>$refundDue,'outstanding'=>$outstanding,'netCollected'=>$deposits+$collections-$refunded,'weeklyRooms'=>$weeks,'monthlyRooms'=>$months,'timezone'=>'Asia/Ho_Chi_Minh'];
    }
}
