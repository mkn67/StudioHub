<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util};
use StudioHub\Helpdesk\Knowledge\Repository;
$config=require dirname(__DIR__).'/bootstrap.php';
$root=dirname($config->root);$corpus=json_decode(file_get_contents($root.'/docs/helpdesk/knowledge/knowledge.v1.json'),true,64,JSON_THROW_ON_ERROR);
$out=['manifest_version'=>'1.0.0','corpus_version'=>$corpus['corpus_version'],'notice'=>'Candidate worksheet only. Owner must review each entry; never auto-approve held/conflicting content. Copy approved records into config/approval-manifest.json.','approvals'=>[]];
foreach($corpus['entries']as$e){
    if($e['publication_status']!=='ready_for_approval'||$e['conflict_ids'])continue;
    $hashes=[];foreach($e['sources']as$s)$hashes[$s['document']]=hash_file('sha256',$root.'/'.$s['document']);
    $out['approvals'][$e['id']]=['decision'=>'unapproved','document_version'=>$e['document_version'],'entry_sha256'=>Repository::hash($e),'source_sha256'=>$hashes,'approved_by'=>null,'approved_at'=>null,'valid_from'=>null,'valid_until'=>null,'non_expiring'=>false];
}
echo json_encode($out,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
