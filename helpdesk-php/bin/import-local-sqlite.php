<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Util,Failure};
use StudioHub\Helpdesk\Persistence\Store;
$config=require dirname(__DIR__).'/bootstrap.php';
if(PHP_SAPI!=='cli' || !in_array('--apply',$argv,true) || $config->get('HELPDESK_ENV')!=='development'
    || !preg_match('/(?:^|;)dbname=studiohub_helpdesk_dev(?:;|$)/',$config->get('HELPDESK_DATABASE_URL'))) {
    fwrite(STDERR,"Only an explicit local Helpdesk SQLite-to-MySQL import is supported.\n");exit(2);
}
$file=$config->path('var/helpdesk.sqlite');
if(!is_file($file)){echo "No existing SQLite file to import.\n";exit;}
$source=new PDO('sqlite:'.$file,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$source->exec('PRAGMA query_only=ON');
$target=new Store($config);
$tables=['helpdesk_conversations'=>['id','owner','payload','expires'],'helpdesk_tickets'=>['id','owner','conversation_id','proposal_id','payload','expires'],'helpdesk_records'=>['id','kind','payload','expires']];
$counts=[];$target->db->beginTransaction();
try {
    foreach($tables as $table=>$columns) {
        $exists=$source->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?");$exists->execute([$table]);
        if(!$exists->fetchColumn())continue;
        $names=implode(',',$columns);
        $read=$source->query("SELECT {$names} FROM {$table}");
        $write=$target->db->prepare("INSERT INTO {$table} ({$names}) VALUES (".implode(',',array_fill(0,count($columns),'?')).") ON DUPLICATE KEY UPDATE id=id");
        $counts[$table]=0;
        while($row=$read->fetch(PDO::FETCH_ASSOC)) {
            $write->execute(array_map(static fn($key)=>$row[$key],$columns));
            if($write->rowCount()===1)$counts[$table]++;
        }
    }
    $target->db->commit();
    echo Util::json(['imported'=>$counts,'source_preserved'=>true]).PHP_EOL;
} catch(Throwable) {
    $target->db->rollBack();fwrite(STDERR,"Helpdesk import failed and was rolled back; SQLite source was preserved.\n");exit(1);
}
