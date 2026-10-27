<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util};
use StudioHub\Helpdesk\Persistence\Store;
$config=require dirname(__DIR__).'/bootstrap.php';
$options=getopt('',['conversation:','contact:','attest-externally-verified']);
if(!isset($options['attest-externally-verified'],$options['conversation'],$options['contact'])){fwrite(STDERR,"Local operator only, AFTER independently verifying guest contact: --conversation=UUID --contact=CONTACT --attest-externally-verified\nNo email/SMS is sent by this command.\n");exit(2);}
$store=new Store($config);$id=Util::uuid($options['conversation']);$contact=Util::text($options['contact'],150);
$store->transaction(function()use($store,$id,$contact){
    $r=$store->get('helpdesk_conversations',$id);if(!$r||$r['expires']<time())throw new RuntimeException('Conversation unavailable');
    $c=json_decode($r['payload'],true);$c['verifiedContact']=$contact;$c['events'][]=['type'=>'contact_externally_verified','actor'=>'local_operator','at'=>Util::now()];
    $store->put('helpdesk_conversations',$id,$c,['owner'=>$r['owner']]);
});echo "External verification attestation recorded. No ticket created.\n";
