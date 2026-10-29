<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util,Failure};
use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Http\CurlTransport;
$config=require dirname(__DIR__).'/bootstrap.php';$file=$config->path('var/catalog-verified.json');if(is_file($file))unlink($file);
try{
    $catalog=new PublicCatalog($config,new CurlTransport());$search=$catalog->search([]);
    if(!$search['items'])throw new Failure('no_catalog_sample_for_verification',503);
    $id=(int)$search['items'][0]['roomId'];$catalog->details($id);$catalog->rates($id);
    file_put_contents($file,Util::json(['base_url'=>$config->get('STUDIOHUB_API_BASE_URL'),'expires'=>time()+86400]),LOCK_EX);
    echo "Public room search/details/rates verified; availability remains disabled.\n";
}catch(Throwable $e){echo Util::json(['verified'=>false,'reason'=>$e instanceof Failure?$e->reason:'catalog_check_failed'])."\n";exit(1);}
