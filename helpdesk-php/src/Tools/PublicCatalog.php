<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tools;
use StudioHub\Helpdesk\{Config,Failure};
use StudioHub\Helpdesk\Http\{Transport,CurlTransport};
final class PublicCatalog
{
    public function __construct(private Config $config,private Transport $http) {}
    public function readOnlyTools(): ReadOnlyTools {return new ReadOnlyTools($this->config,$this->http);}
    public function enabled(): bool
    {
        if (!$this->config->bool('STUDIOHUB_PUBLIC_TOOLS')) return false;
        try { CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL'), explode(',', $this->config->get('STUDIOHUB_API_HTTP_HOSTS'))); }
        catch (Failure) { return false; }
        // Each fixed read-only endpoint validates its response at call time.
        // Do not require a transient CLI-created file on production containers.
        return true;
    }
    public function get(string $path,array $query=[]): array
    {
        if(!preg_match('~^/rooms(?:/[1-9][0-9]*(?:/(?:rates|helpdesk-facts))?)?$~',$path))throw new Failure('tool_unavailable',503);
        $r=$this->http->request('GET',CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL'),explode(',', $this->config->get('STUDIOHUB_API_HTTP_HOSTS'))).$path.($query?'?'.http_build_query($query):''),['Accept: application/json'],null,4);
        if($r['status']!==200)throw new Failure('catalog_unavailable',in_array($r['status'],[400,401,403,404,422,504],true)?$r['status']:503);
        if(($r['body']['status']??'')!=='success'||!is_array($r['body']['data']??null))throw new Failure('invalid_catalog_response',502);
        return $r['body']['data'];
    }
    public function search(array $args): array
    {
        $query=['limit'=>5,'page'=>1];
        if(isset($args['keyword']))$query['keyword']=$args['keyword'];
        if(isset($args['people']))$query['min_capacity']=$args['people'];
        foreach (['district','max_price','rate_unit'] as $key) if(isset($args[$key]))$query[$key]=$args[$key];
        $data=$this->get('/rooms',$query);if(!is_array($data['items']??null))throw new Failure('invalid_catalog_response',502);
        $items=[];
        foreach(array_slice($data['items'],0,5)as$r){
            $item=$this->project($r);
            if(isset($args['people'])&&$item['capacity']<$args['people'])continue;
            $items[]=$item;
        }
        return ['items'=>$items,'scope'=>'up to five matching active listings; not an exhaustive search','availability'=>'not_checked'];
    }
    private function project(mixed $r): array
    {
        if(!is_array($r))throw new Failure('invalid_catalog_response',502);
        if(!is_numeric($r['room_id']??null)||!is_string($r['name']??null)||!is_numeric($r['capacity']??null))throw new Failure('invalid_catalog_response',502);
        $item=['roomId'=>(string)(int)$r['room_id'],'name'=>mb_substr($r['name'],0,150),'capacity'=>(int)$r['capacity'],'description'=>mb_substr((string)($r['description']??''),0,400)];
        $rate=$r['display_rate']??null;
        if($rate!==null) {
            if(!is_array($rate) || !is_int($rate['unit_price']??null) || $rate['unit_price']<0 || !in_array($rate['rate_unit']??null,['hour','session','half_day','day','week','month'],true))throw new Failure('invalid_catalog_response',502);
            $item['basePrice']=$rate['unit_price'];$item['rateUnit']=$rate['rate_unit'];
        }
        return $item;
    }
    public function resolve(string $query): array
    {
        $normalize=\StudioHub\Helpdesk\Retrieval\LexicalRetriever::normalize(...);
        $needle=preg_replace('/^(?:phong|studio)\s+/','',$normalize($query));
        if($needle==='')throw new Failure('invalid_tool_arguments',422);
        $data=$this->get('/rooms',['keyword'=>$query,'limit'=>20,'page'=>1]);
        if(!is_array($data['items']??null))throw new Failure('invalid_catalog_response',502);
        $exact=[];$partial=[];
        foreach(array_slice($data['items'],0,20) as $row) {
            $item=$this->project($row);$name=$normalize($item['name']);
            if($name===$needle)$exact[]=$item;
            elseif(!array_filter(explode(' ',$needle),static fn($token)=>!str_contains($name,$token)))$partial[]=$item;
        }
        $items=$exact ?: $partial;
        return ['match'=>count($items)===1?'unique':($items?'ambiguous':'empty'),'items'=>array_slice($items,0,5)];
    }
    public static function nameMatches(string $query,string $name): bool
    {
        $needle=preg_replace('/^(?:phong|studio)\s+/','',\StudioHub\Helpdesk\Retrieval\LexicalRetriever::normalize($query));
        $name=\StudioHub\Helpdesk\Retrieval\LexicalRetriever::normalize($name);
        return $needle!=='' && !array_filter(explode(' ',$needle),static fn($token)=>!str_contains($name,$token));
    }
    public function details(int $id): array
    {
        $room=$this->project($this->get('/rooms/'.$id));
        if($room['roomId']!==(string)$id)throw new Failure('invalid_catalog_response',502);
        return $room+['availability'=>'not_checked'];
    }
    public function facts(int $id): array
    {
        $data=$this->get('/rooms/'.$id.'/helpdesk-facts');
        if (($data['roomId']??null)!==(string)$id || !is_string($data['text']??null)
            || mb_strlen($data['text'])>16000 || !is_array($data['missingFields']??null)
            || !array_is_list($data['missingFields']) || count($data['missingFields'])>30
            || !is_string($data['checkedAt']??null)) throw new Failure('invalid_catalog_response',502);
        foreach($data['missingFields'] as $field)if(!is_string($field)||strlen($field)>100)throw new Failure('invalid_catalog_response',502);
        return array_intersect_key($data,array_flip(['roomId','text','missingFields','checkedAt']));
    }
    public function rates(int $id): array
    {
        $rows=$this->get('/rooms/'.$id.'/rates');$out=[];
        if(!array_is_list($rows))throw new Failure('invalid_catalog_response',502);
        foreach(array_slice($rows,0,10)as$r){
            if(!is_numeric($r['unit_price']??null)||!is_string($r['rate_unit']??null))throw new Failure('invalid_catalog_response',502);
            $item=['unitPrice'=>(int)$r['unit_price'],'rateUnit'=>mb_substr($r['rate_unit'],0,30),'currency'=>'VND'];
            foreach(['rate_id','unit_minutes','minimum_units','maximum_units'] as $key) {
                if(isset($r[$key])) {
                    if(!is_int($r[$key]) || $r[$key]<0)throw new Failure('invalid_catalog_response',502);
                    $item[$key]=$r[$key];
                }
            }
            foreach(['effective_from','effective_to'] as $key)if(isset($r[$key])) {
                if(!is_string($r[$key]) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$r[$key]))throw new Failure('invalid_catalog_response',502);
                $item[$key]=$r[$key];
            }
            $out[]=$item;
        }
        return ['roomId'=>(string)$id,'rates'=>$out,'quote'=>false,'checkedAt'=>date(DATE_ATOM)];
    }
}
