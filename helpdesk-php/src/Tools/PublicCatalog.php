<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tools;
use StudioHub\Helpdesk\{Config,Failure};
use StudioHub\Helpdesk\Http\{Transport,CurlTransport};
final class PublicCatalog
{
    public function __construct(private Config $config,private Transport $http) {}
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
        if($r['status']!==200||($r['body']['status']??'')!=='success'||!is_array($r['body']['data']??null))throw new Failure('catalog_unavailable',503);
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
    private function project(array $r): array
    {
        if(!is_numeric($r['room_id']??null)||!is_string($r['name']??null)||!is_numeric($r['capacity']??null))throw new Failure('invalid_catalog_response',502);
        return ['roomId'=>(string)(int)$r['room_id'],'name'=>mb_substr($r['name'],0,150),'capacity'=>(int)$r['capacity'],'description'=>mb_substr((string)($r['description']??''),0,400)];
    }
    public function details(int $id): array
    {return $this->project($this->get('/rooms/'.$id))+['availability'=>'not_checked'];}
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
            $out[]=['unitPrice'=>(int)$r['unit_price'],'rateUnit'=>mb_substr($r['rate_unit'],0,30),'currency'=>'VND'];
        }
        return ['roomId'=>(string)$id,'rates'=>$out,'quote'=>false,'checkedAt'=>date(DATE_ATOM)];
    }
}
