<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Failure,Util};
use StudioHub\Helpdesk\Persistence\Store;
$config=require dirname(__DIR__).'/bootstrap.php';
try {
    $store=new Store($config);$counts=[];
    foreach(['helpdesk_conversations','helpdesk_tickets','helpdesk_records'] as $table) $counts[$table]=(int)$store->db->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
    $tls=null;
    if($store->driver()==='mysql') {
        $row=$store->db->query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")->fetch();
        $tls=is_array($row) && ($row['Value']??'')!=='';
    }
    echo Util::json(['status'=>'success','driver'=>$store->driver(),'tls'=>$tls,'counts'=>$counts]).PHP_EOL;
} catch(Throwable $e) {
    echo Util::json(['status'=>'error','reason'=>$e instanceof Failure?$e->reason:'storage_check_failed']).PHP_EOL;exit(1);
}
