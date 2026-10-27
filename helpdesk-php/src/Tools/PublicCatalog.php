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
        $f=$this->config->path('var/catalog-verified.json');if(!$this->config->bool('STUDIOHUB_PUBLIC_TOOLS')||!is_file($f))return false;
        $r=json_decode(file_get_contents($f),true);
        return ($r['base_url']??null)===$this->config->get('STUDIOHUB_API_BASE_URL')&&($r['expires']??0)>time();
    }
    public function get(string $path,array $query=[]): array
    {
        if(!preg_match('~^/rooms(?:/[1-9][0-9]*(?:/rates)?)?$~',$path))throw new Failure('tool_unavailable',503);
        $r=$this->http->request('GET',CurlTransport::base($this->config->get('STUDIOHUB_API_BASE_URL')).$path.($query?'?'.http_build_query($query):''),['Accept: application/json'],null,4);
        if($r['status']!==200||($r['body']['status']??'')!=='success'||!is_array($r['body']['data']??null))throw new Failure('catalog_unavailable',503);
        return $r['body']['data'];
    }
    public function search(array $args): array
    {
        $query=['limit'=>5,'page'=>1];
        if(isset($args['keyword']))$query['keyword']=$args['keyword'];
        $data=$this->get('/rooms',$query);if(!is_array($data['items']??null))throw new Failure('invalid_catalog_response',502);
        $items=[];
        foreach(array_slice($data['items'],0,5)as$r){
            $item=$this->project($r);
            if(isset($args['people'])&&$item['capacity']<$args['people'])continue;
            $items[]=$item;
        }
        return ['items'=>$items,'scope'=>'first page of active listings; capacity filtered after retrieval','availability'=>'not_checked'];
    }
    private function project(array $r): array
    {
        if(!is_numeric($r['room_id']??null)||!is_string($r['name']??null)||!is_numeric($r['capacity']??null))throw new Failure('invalid_catalog_response',502);
        return ['roomId'=>(string)(int)$r['room_id'],'name'=>mb_substr($r['name'],0,150),'capacity'=>(int)$r['capacity'],'description'=>mb_substr((string)($r['description']??''),0,400)];
    }
    public function details(int $id): array
    {return $this->project($this->get('/rooms/'.$id))+['availability'=>'not_checked'];}
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
