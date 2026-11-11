<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tools;

use StudioHub\Helpdesk\{Config, Failure};
use StudioHub\Helpdesk\Agents\ToolRegistry;
use StudioHub\Helpdesk\Http\{CurlTransport, Transport};
use StudioHub\Helpdesk\Security\Actor;

/** Fixed API operations only. No caller-supplied path, identity or HTTP method. */
final class ReadOnlyTools
{
    public function __construct(private Config $config, private Transport $http) {}

    public function register(ToolRegistry $registry, array &$evidence): void
    {
        try {CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL'),explode(',',$this->config->get('STUDIOHUB_API_HTTP_HOSTS')));} catch (Failure) {return;}
        $id = ['type'=>'integer','minimum'=>1,'maximum'=>2147483647];
        $result = ToolRegistry::object([
            'state'=>['type'=>'string','enum'=>['SUCCESS','EMPTY','AUTH_REQUIRED','FORBIDDEN','VALIDATION_ERROR','NOT_FOUND','UPSTREAM_UNAVAILABLE','TIMEOUT','CONTRACT_MISMATCH']],
            'data'=>ToolRegistry::object([
                'available'=>['type'=>'boolean'],'room_id'=>$id,
                'start_time'=>ToolRegistry::string(19),'end_time'=>ToolRegistry::string(19),
                'pricing'=>ToolRegistry::object(array_fill_keys(['room_amount','equipment_amount','total_amount','deposit_amount'],['type'=>'integer','minimum'=>0]),['room_amount','equipment_amount','total_amount','deposit_amount']),
                'timezone'=>['type'=>'string','enum'=>['Asia/Ho_Chi_Minh']],
                'checkedAt'=>ToolRegistry::string(50),'reserved'=>['type'=>'boolean'],
                'equipmentScope'=>['type'=>'string','enum'=>['none']],
                'reason'=>['type'=>'string','enum'=>['room_occupied','equipment_insufficient']],
                'items'=>['type'=>'array','maxItems'=>5,'items'=>ToolRegistry::object([
                    'booking_id'=>$id,'booking_code'=>ToolRegistry::string(200),'room_name'=>ToolRegistry::string(200),
                    'start_time'=>ToolRegistry::string(19),'end_time'=>ToolRegistry::string(19),
                    'status'=>['type'=>'string','enum'=>['pending','confirmed','checked_in','completed','cancelled','rejected','expired']],
                    'total_amount'=>['type'=>'integer','minimum'=>0],'deposit_amount'=>['type'=>'integer','minimum'=>0],
                ],['booking_id','booking_code','room_name','start_time','end_time','status','total_amount','deposit_amount'])],
                'page'=>['type'=>'integer','minimum'=>1,'maximum'=>1000],
                'total_items'=>['type'=>'integer','minimum'=>0],
                'paymentMode'=>['type'=>'string','enum'=>['sandbox']],
                'paymentStatus'=>['type'=>'string','enum'=>['not_retrieved']],
            ]),
        ], ['state','data']);
        if ($this->config->bool('STUDIOHUB_PUBLIC_TOOLS')) {
            $registry->add('check_room_availability',
                'Check one complete future interval using the authoritative evaluator. Vietnam time YYYY-MM-DD HH:mm:ss. Requires a real rate_id from pricing; ask if date, interval or room is ambiguous. No reservation. Equipment scope is empty: extra equipment is not checked.',
                ToolRegistry::object(['room_id'=>$id,'rate_id'=>$id,'start_time'=>ToolRegistry::string(19),'end_time'=>ToolRegistry::string(19),'party_size'=>['type'=>'integer','minimum'=>1,'maximum'=>1000]], ['room_id','rate_id','start_time','end_time']),
                $result,
                function(array $args) use (&$evidence,$result): array {
                    $r = $this->availability($args);
                    try {Schema::check($r,$result);} catch (Failure) {$r=self::result('CONTRACT_MISMATCH');}
                    $evidence['availabilityResult'] = $r;
                    return $r;
                }, static fn(Actor $actor): bool=>true);
        }
        if ($this->config->bool('STUDIOHUB_CUSTOMER_READ_TOOLS')) {
            $registry->add('get_my_bookings',
                'List only the verified current Customer bookings, five per page. No user ID input. Stored status is not a payment settlement or cancellation eligibility proof. Booking detail endpoint is disabled because reading it can expire/refund a booking.',
                ToolRegistry::object(['page'=>['type'=>'integer','minimum'=>1,'maximum'=>1000]], []), $result,
                function(array $args, Actor $actor) use (&$evidence,$result): array {
                    $r = $this->bookings($args, $actor);
                    try {Schema::check($r,$result);} catch (Failure) {$r=self::result('CONTRACT_MISMATCH');}
                    $evidence['bookingsResult'] = $r;
                    return $r;
                }, static fn(Actor $actor): bool=>$actor->role === 'customer' && $actor->authenticated() && $actor->authorization() !== null);
        }
    }

    public function availability(array $args): array
    {
        $id=['type'=>'integer','minimum'=>1,'maximum'=>2147483647];
        Schema::check($args, ToolRegistry::object(['room_id'=>$id,'rate_id'=>$id,'start_time'=>ToolRegistry::string(19),'end_time'=>ToolRegistry::string(19),'party_size'=>['type'=>'integer','minimum'=>1,'maximum'=>1000]],['room_id','rate_id','start_time','end_time']));
        $tz = new \DateTimeZone('Asia/Ho_Chi_Minh');
        foreach (['start_time','end_time'] as $field) {
            $dt = \DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $args[$field], $tz);
            if (!$dt || $dt->format('Y-m-d H:i:s') !== $args[$field]) return self::result('VALIDATION_ERROR');
            $dates[$field] = $dt;
        }
        if ($dates['end_time'] <= $dates['start_time'] || $dates['start_time'] <= new \DateTimeImmutable('now', $tz)) return self::result('VALIDATION_ERROR');
        return $this->guard(function() use ($args): array {
            $r=$this->request('POST','/bookings/check-availability', $args + ['equipments'=>[]]);
            $code=$r['body']['error_code']??$r['body']['errors'][0]['code']??null;
            if ($r['status']===409 && in_array($code,['room_occupied','equipment_insufficient'],true)) {
                return self::result('SUCCESS',['available'=>false,'reason'=>$code,'room_id'=>$args['room_id'],'start_time'=>$args['start_time'],'end_time'=>$args['end_time']]);
            }
            $d=$this->data($r);
            if (($d['available']??null)!==true || ($d['room']['room_id']??null)!==$args['room_id']
                || ($d['start_time']??null)!==$args['start_time'] || ($d['end_time']??null)!==$args['end_time']) throw new Failure('contract_mismatch',502);
            $p=$d['pricing']??[];
            foreach (['room_amount','equipment_amount','total_amount','deposit_amount'] as $key) {
                if (!is_int($p[$key]??null) || $p[$key]<0) throw new Failure('contract_mismatch',502);
                $pricing[$key]=$p[$key];
            }
            return self::result('SUCCESS',['available'=>true,'room_id'=>$args['room_id'],'start_time'=>$args['start_time'],'end_time'=>$args['end_time'],
                'pricing'=>$pricing,'timezone'=>'Asia/Ho_Chi_Minh','checkedAt'=>date(DATE_ATOM),'reserved'=>false,'equipmentScope'=>'none']);
        });
    }

    public function bookings(array $args, Actor $actor): array
    {
        Schema::check($args,ToolRegistry::object(['page'=>['type'=>'integer','minimum'=>1,'maximum'=>1000]]));
        if (!$actor->authenticated() || $actor->authorization()===null) return self::result('AUTH_REQUIRED');
        if ($actor->role!=='customer') return self::result('FORBIDDEN');
        return $this->guard(function() use ($args,$actor): array {
            // Backend revalidates JWT/role, then listBookings scopes by the authenticated user.
            $d=$this->data($this->request('GET','/bookings?page='.($args['page']??1).'&limit=5',null,$actor->authorization()));
            if (!is_array($d['items']??null) || !array_is_list($d['items']) || count($d['items'])>5
                || !is_int($d['total_items']??null) || !is_int($d['page']??null)) throw new Failure('contract_mismatch',502);
            $items=[];
            foreach ($d['items'] as $row) {
                // Defense in depth: no mixed-tenant response, even if upstream contract changes.
                if (!is_array($row) || (!is_int($row['customer_id']??null) && !is_string($row['customer_id']??null)) || (string)$row['customer_id']!==$actor->userId) throw new Failure('forbidden',403);
                $item=[];
                foreach (['booking_id','booking_code','room_name','start_time','end_time','status','total_amount','deposit_amount'] as $key) {
                    $v=$row[$key]??null;
                    if ((!is_string($v) && !is_int($v)) || (string)$v==='' || strlen((string)$v)>200) throw new Failure('contract_mismatch',502);
                    $item[$key]=$v;
                }
                foreach(['booking_id','total_amount','deposit_amount'] as $key) {
                    if (!preg_match('/^\d+(?:\.00)?$/D',(string)$item[$key]) || (float)$item[$key]>1000000000000) throw new Failure('contract_mismatch',502);
                    $item[$key]=(int)$item[$key];
                }
                if($item['booking_id']<1) throw new Failure('contract_mismatch',502);
                foreach(['booking_code','room_name','start_time','end_time','status'] as $key) if(!is_string($item[$key])) throw new Failure('contract_mismatch',502);
                foreach(['start_time','end_time'] as $key) {
                    $dt=\DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$item[$key],new \DateTimeZone('Asia/Ho_Chi_Minh'));
                    if(!$dt || $dt->format('Y-m-d H:i:s')!==$item[$key]) throw new Failure('contract_mismatch',502);
                }
                if (!in_array($item['status'],['pending','confirmed','checked_in','completed','cancelled','rejected','expired'],true)) throw new Failure('contract_mismatch',502);
                $items[]=$item;
            }
            return self::result($items?'SUCCESS':'EMPTY',['items'=>$items,'page'=>$d['page'],'total_items'=>$d['total_items'],'paymentMode'=>'sandbox','paymentStatus'=>'not_retrieved']);
        });
    }

    private function request(string $method, string $path, ?array $body=null, #[\SensitiveParameter] ?string $authorization=null): array
    {
        if (!(($method==='POST' && $path==='/bookings/check-availability') || ($method==='GET' && preg_match('~^/bookings\?page=[0-9]+&limit=5$~',$path)))) throw new Failure('tool_not_allowed',403);
        $base=CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL'),explode(',',$this->config->get('STUDIOHUB_API_HTTP_HOSTS')));
        $headers=['Accept: application/json','Content-Type: application/json'];
        if ($authorization!==null) $headers[]='Authorization: '.$authorization;
        return $this->http->request($method,$base.$path,$headers,$body,4);
    }

    private function data(array $r): array
    {
        if ($r['status']!==200) throw new Failure(match($r['status']) {401=>'authentication_required',403=>'forbidden',404=>'not_found',400,422=>'invalid_tool_arguments',default=>'upstream_unavailable'},$r['status']);
        if (($r['body']['status']??null)!=='success' || !is_array($r['body']['data']??null)) throw new Failure('contract_mismatch',502);
        return $r['body']['data'];
    }

    private function guard(callable $call): array
    {
        try {return $call();} catch (Failure $e) {return self::result(self::failureState($e));}
    }

    public static function failureState(Failure $e): string
    {
        return match (true) {
            $e->status===401=>'AUTH_REQUIRED', $e->status===403=>'FORBIDDEN', $e->status===404=>'NOT_FOUND',
            $e->status===504=>'TIMEOUT', $e->status===400 || $e->status===422=>'VALIDATION_ERROR',
            $e->status===502=>'CONTRACT_MISMATCH', default=>'UPSTREAM_UNAVAILABLE',
        };
    }
    private static function result(string $state, array $data=[]): array {return ['state'=>$state,'data'=>$data];}
}
