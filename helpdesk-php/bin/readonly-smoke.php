<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Failure,Util};
use StudioHub\Helpdesk\Http\CurlTransport;
use StudioHub\Helpdesk\Tools\PublicCatalog;

// Optional real HTTP probe. No login, DB writes, model calls or marker files.
$config=require dirname(__DIR__).'/bootstrap.php';
$report=['provider_called'=>false,'private_api_verified'=>false];
try {
    $catalog=new PublicCatalog($config,new CurlTransport());
    $rooms=$catalog->search([]);$report['search']='SUCCESS';$report['sample_count']=count($rooms['items']);
    if (!$rooms['items']) {$report['details']='NOT_EXECUTED';$report['availability']='NOT_EXECUTED';}
    else {
        $id=(int)$rooms['items'][0]['roomId'];$catalog->details($id);$report['details']='SUCCESS';
        $rates=$catalog->rates($id);$report['pricing']='SUCCESS';$report['rate_count']=count($rates['rates']);
        $report['availability']='NOT_EXECUTED';
        foreach($rates['rates'] as $rate) if(isset($rate['rate_id']) && $rate['rateUnit']==='hour') {
            $start=(new DateTimeImmutable('tomorrow 10:00',new DateTimeZone('Asia/Ho_Chi_Minh')));
            $minutes=max(60,(int)($rate['minimum_units']??1)*60);
            $r=$catalog->readOnlyTools()->availability(['room_id'=>$id,'rate_id'=>$rate['rate_id'],'start_time'=>$start->format('Y-m-d H:i:s'),'end_time'=>$start->modify('+'.$minutes.' minutes')->format('Y-m-d H:i:s'),'party_size'=>1]);
            $report['availability']=$r['state'];$report['available']=$r['data']['available']??null;break;
        }
    }
} catch (Failure $e) {$report['failure']=$e->reason;$report['http_status']=$e->status;}
echo Util::json($report).PHP_EOL;
exit(isset($report['failure'])?1:0);
