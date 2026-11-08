<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
if(class_exists(Dotenv\Dotenv::class))Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$runId='';foreach($argv as $arg)if(str_starts_with($arg,'--run-id='))$runId=substr($arg,9);
if(!preg_match('/^[a-f0-9]{32}$/D',$runId))throw new RuntimeException('Provide --run-id=<databaseBackupRunId>. This command exports SQL and never executes rollback.');
$db=App\Core\Db::getConnection();
$q=$db->prepare('SELECT backup_json,summary_json FROM demo_catalog_update_runs WHERE run_id=?');$q->execute([$runId]);$run=$q->fetch(PDO::FETCH_ASSOC);
if(!$run)throw new RuntimeException('Backup run not found');
$backup=json_decode($run['backup_json'],true,64,JSON_THROW_ON_ERROR);$summary=json_decode($run['summary_json'],true,64,JSON_THROW_ON_ERROR);
$value=static fn($v):string=>$v===null?'NULL':$db->quote((string)$v);
$sql=['-- Review this rollback before executing against database '.$backup['database'].'.',
    '-- Preserve subsequent Host edits; newly added rooms are deactivated, never deleted.',
    'START TRANSACTION;'];
foreach($backup['rooms'] as $entry){
    if(!$entry['existing'])continue;
    $old=$entry['existing'];$id=(int)$old['room_id'];$new=$entry['definition'];
    $sql[]='UPDATE rooms SET description='.$value($old['description']).' WHERE room_id='.$id.' AND description <=> '.$value($new['description']).';';
    foreach($entry['images'] as $image){
        $urls=implode(',',array_map(static fn($p)=>$value($p['url']),$new['photos']));
        $sql[]='UPDATE room_images SET image_url='.$value($image['image_url']).',is_primary='.(int)$image['is_primary'].',sort_order='.(int)$image['sort_order'].' WHERE image_id='.(int)$image['image_id'].' AND room_id='.$id.' AND image_url IN('.$urls.');';
    }
    $originalTypeIds=array_column($entry['types'],'space_type_id');
    if(!in_array((int)$entry['typeId'],array_map('intval',$originalTypeIds),true))$sql[]='DELETE FROM room_space_types WHERE room_id='.$id.' AND space_type_id='.(int)$entry['typeId'].' AND is_primary=1;';
    foreach($entry['types'] as $type)$sql[]='INSERT INTO room_space_types(room_id,space_type_id,is_primary) VALUES('.$id.','.(int)$type['space_type_id'].','.(int)$type['is_primary'].') ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary);';
}
foreach($summary['createdImageIds']??[] as $imageId){
    $q=$db->prepare('SELECT room_id,image_url FROM room_images WHERE image_id=?');$q->execute([$imageId]);$image=$q->fetch(PDO::FETCH_ASSOC);
    if($image && !in_array((int)$image['room_id'],array_map('intval',$summary['createdRoomIds']??[]),true)
        && str_starts_with($image['image_url'],'/images/demo-rooms/'))$sql[]='DELETE FROM room_images WHERE image_id='.(int)$imageId.' AND image_url='.$value($image['image_url']).';';
}
foreach($summary['createdRoomIds']??[] as $id)$sql[]="UPDATE rooms SET status='inactive' WHERE room_id=".(int)$id." AND status='active';";
foreach($backup['studios'] as $entry){
    $old=$entry['existing'];$new=$entry['definition'];
    $sql[]='UPDATE studios SET cover_url='.$value($old['cover_url']).' WHERE studio_id='.(int)$old['studio_id'].' AND cover_url='.$value($new['cover_url']).';';
    $sql[]='UPDATE users SET avatar_url='.$value($old['avatar_url']).' WHERE user_id='.(int)$old['user_id'].' AND avatar_url='.$value($new['avatar_url']).';';
}
$sql[]="UPDATE demo_catalog_update_runs SET summary_json=JSON_SET(summary_json,'$.rolledBack',true) WHERE run_id=".$value($runId).';';
$sql[]='COMMIT;';
$dir=dirname(__DIR__).'/storage/demo-catalog-backups';if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Cannot create export directory');
$file=$dir.'/rollback-'.$runId.'.sql';
// Create with private permissions; the SQL remains an operator-reviewed artifact.
$oldMask=umask(0077);try{if(file_put_contents($file,implode("\n",$sql)."\n",LOCK_EX)===false)throw new RuntimeException('Cannot export rollback');}finally{umask($oldMask);}
echo json_encode(['exported'=>$file,'executed'=>false,'runId'=>$runId])."\n";
