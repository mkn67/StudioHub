<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/vendor/autoload.php';
if (class_exists(Dotenv\Dotenv::class)) Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
use App\Core\Db;
use App\Modules\Rooms\DemoCatalog;

// Explicit fixture maintenance; optional startup invocation requires two configured env values.
$apply=in_array('--apply',$argv,true);$db=Db::getConnection();$data=DemoCatalog::data();
$database=(string)$db->query('SELECT DATABASE()')->fetchColumn();
if ($apply && !preg_match('/_(dev|test)$/D',$database)
    && !(in_array('--allow-production',$argv,true) && in_array('--confirm-database='.$database,$argv,true))) {
    throw new RuntimeException('Non-development apply requires --allow-production and --confirm-database=<exact database name>, after reviewing the dry run and backup plan.');
}
if (!(int)$db->query("SELECT GET_LOCK('studiohub_demo_catalog',10)")->fetchColumn()) throw new RuntimeException('Demo catalog maintenance is already running.');
$plan=[];$backup=['database'=>$database,'createdAt'=>date(DATE_ATOM),'rooms'=>[],'studios'=>[]];
try {
    if ($apply) {
        // Durable audit/backup storage survives Render's ephemeral filesystem.
        $db->exec('CREATE TABLE IF NOT EXISTS demo_catalog_update_runs (
            run_id CHAR(32) PRIMARY KEY, dataset_version VARCHAR(100) NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            backup_json JSON NOT NULL, summary_json JSON NOT NULL,
            INDEX idx_demo_catalog_version (dataset_version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        if(in_array('--once',$argv,true)){
            $previous=$db->prepare('SELECT run_id FROM demo_catalog_update_runs WHERE dataset_version=? LIMIT 1');
            $previous->execute(['demo-room-catalog-v2']);
            if($run=$previous->fetchColumn()){echo json_encode(['skipped'=>true,'reason'=>'already_applied','runId'=>$run])."\n";exit;}
        }
    }
    foreach($data['rooms'] as $room){
        $owner=$db->prepare('SELECT s.studio_id FROM studios s JOIN users u ON u.user_id=s.host_id WHERE u.email=? ORDER BY s.studio_id LIMIT 1');
        $owner->execute([$room['owner_email']]);$studioId=$owner->fetchColumn();
        if(!$studioId)continue;
        $q=$db->prepare('SELECT * FROM rooms WHERE studio_id=? AND name=?');$q->execute([$studioId,$room['name']]);$existing=$q->fetch(PDO::FETCH_ASSOC)?:null;
        if(!$existing && empty($room['new']))continue;
        $images=[];$relations=[];
        if($existing){
            $q=$db->prepare('SELECT * FROM room_images WHERE room_id=? ORDER BY is_primary DESC,sort_order,image_id');$q->execute([$existing['room_id']]);$images=$q->fetchAll(PDO::FETCH_ASSOC);
            if(array_filter($images,static fn(array $img):bool=>!DemoCatalog::demoImage($img['image_url']))){$plan[]=['name'=>$room['name'],'action'=>'skip_custom_media'];continue;}
            $q=$db->prepare('SELECT * FROM room_space_types WHERE room_id=? ORDER BY space_type_id');$q->execute([$existing['room_id']]);$relations=$q->fetchAll(PDO::FETCH_ASSOC);
        }
        $type=$db->prepare('SELECT space_type_id FROM space_types WHERE name=?');$type->execute([$room['type_name']]);$typeId=$type->fetchColumn();
        if(!$typeId)throw new RuntimeException('Missing type: '.$room['type_name']);
        $plan[]=['name'=>$room['name'],'action'=>$existing?'repair_demo_media':'add_demo_room','studioId'=>(int)$studioId];
        $backup['rooms'][]=['definition'=>$room,'existing'=>$existing,'images'=>$images,'types'=>$relations,'studioId'=>(int)$studioId,'typeId'=>(int)$typeId];
    }
    foreach($data['studios'] as $profile){
        $q=$db->prepare('SELECT s.studio_id,s.cover_url,u.user_id,u.avatar_url FROM studios s JOIN users u ON u.user_id=s.host_id WHERE u.email=? ORDER BY s.studio_id LIMIT 1');$q->execute([$profile['owner_email']]);
        if($row=$q->fetch(PDO::FETCH_ASSOC))$backup['studios'][]=['existing'=>$row,'definition'=>$profile];
    }
    if(!$apply){echo json_encode(['dryRun'=>true,'database'=>$database,'plan'=>$plan],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";exit;}
    if (!$backup['rooms']) {
        if (in_array('--skip-if-empty', $argv, true) && preg_match('/_(dev|test)$/D', $database)) {
            echo json_encode(['skipped'=>true,'reason'=>'no_demo_rooms'])."\n";
            exit;
        }
        throw new RuntimeException('No recognised demo rooms matched; dataset was not marked applied. Check the existing demo accounts before enabling the update.');
    }
    $dir=dirname(__DIR__).'/storage/demo-catalog-backups';if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Cannot create backup directory');
    $file=$dir.'/'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';
    $handle=fopen($file,'x');if(!$handle)throw new RuntimeException('Cannot create backup');chmod($file,0600);
    $payload=json_encode($backup,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
    if(fwrite($handle,$payload)!==strlen($payload)){fclose($handle);throw new RuntimeException('Backup write failed; database was not modified.');}
    fflush($handle);fclose($handle);
    $db->beginTransaction();
    $runId=bin2hex(random_bytes(16));$createdRoomIds=[];$createdImageIds=[];$removedImageIds=[];
    $db->prepare('INSERT INTO demo_catalog_update_runs(run_id,dataset_version,backup_json,summary_json) VALUES(?,?,?,?)')
        ->execute([$runId,'demo-room-catalog-v2',$payload,'{}']);
    foreach($backup['rooms'] as $entry){
        $r=$entry['definition'];$roomId=$entry['existing']['room_id']??null;
        if($roomId){
            // Refuse to overwrite edits made after the backup snapshot was read.
            $q=$db->prepare('SELECT description FROM rooms WHERE room_id=? FOR UPDATE');$q->execute([$roomId]);
            if($q->fetchColumn()!==$entry['existing']['description'])throw new RuntimeException('A demo room changed during catalog maintenance; retry after reviewing edits.');
            $q=$db->prepare('SELECT * FROM room_images WHERE room_id=? ORDER BY is_primary DESC,sort_order,image_id FOR UPDATE');$q->execute([$roomId]);
            if($q->fetchAll(PDO::FETCH_ASSOC)!==$entry['images'])throw new RuntimeException('Room media changed during catalog maintenance; no partial update was committed.');
            $q=$db->prepare('SELECT * FROM room_space_types WHERE room_id=? ORDER BY space_type_id FOR UPDATE');$q->execute([$roomId]);
            if($q->fetchAll(PDO::FETCH_ASSOC)!==$entry['types'])throw new RuntimeException('Room categories changed during catalog maintenance; no partial update was committed.');
        }
        if(!$roomId){
            $q=$db->prepare('INSERT INTO rooms(studio_id,name,description,area,ceiling_height,capacity,rules,status) VALUES(?,?,?,?,?,?,?,?)');
            $q->execute([$entry['studioId'],$r['name'],$r['description'],$r['area'],$r['ceiling_height'],$r['capacity'],$r['rules'],$r['status']]);$roomId=(int)$db->lastInsertId();
            $createdRoomIds[]=$roomId;
            $q=$db->prepare("INSERT INTO room_rates(room_id,rate_unit,unit_minutes,unit_price,minimum_units,effective_from,status) VALUES(?,'hour',60,?,1,CURDATE(),'active')");$q->execute([$roomId,$r['hourly_rate']]);
        } else {
            $db->prepare('UPDATE rooms SET description=? WHERE room_id=?')->execute([$r['description'],$roomId]);
        }
        // Retain existing relations and their IDs; only correct which is primary.
        $db->prepare('UPDATE room_space_types SET is_primary=0 WHERE room_id=?')->execute([$roomId]);
        if($r['name']==='Zenith Black Box Theatre')$db->prepare("DELETE FROM room_space_types WHERE room_id=? AND space_type_id IN(SELECT space_type_id FROM space_types WHERE name='Workshop & Event Studio')")->execute([$roomId]);
        $db->prepare('INSERT INTO room_space_types(room_id,space_type_id,is_primary) VALUES(?,?,1) ON DUPLICATE KEY UPDATE is_primary=1')->execute([$roomId,$entry['typeId']]);
        foreach($r['photos'] as $n=>$photo){
            if(isset($entry['images'][$n]))$db->prepare('UPDATE room_images SET image_url=?,is_primary=?,sort_order=? WHERE image_id=?')->execute([$photo['url'],$n===0?1:0,$n,$entry['images'][$n]['image_id']]);
            else {
                $db->prepare('INSERT INTO room_images(room_id,image_url,is_primary,sort_order) VALUES(?,?,?,?)')->execute([$roomId,$photo['url'],$n===0?1:0,$n]);
                $createdImageIds[]=(int)$db->lastInsertId();
            }
        }
        // Older Compose runs could add surplus stock photos to an imported gallery.
        // Every row here was verified as demo media and captured in the backup.
        $removeImage = $db->prepare('DELETE FROM room_images WHERE room_id=? AND image_id=?');
        foreach (array_slice($entry['images'], count($r['photos'])) as $image) {
            $removeImage->execute([$roomId, $image['image_id']]);
            $removedImageIds[] = (int) $image['image_id'];
        }
        if(!empty($r['new']))foreach($r['amenity_names']??[] as $name){
            $db->prepare('INSERT IGNORE INTO room_amenities(room_id,amenity_id) SELECT ?,amenity_id FROM amenities WHERE name=?')->execute([$roomId,$name]);
        }
    }
    foreach($backup['studios'] as $entry){
        $old=$entry['existing'];$p=$entry['definition'];
        $q=$db->prepare('SELECT s.cover_url,u.avatar_url FROM studios s JOIN users u ON u.user_id=s.host_id WHERE s.studio_id=? AND u.user_id=? FOR UPDATE');$q->execute([$old['studio_id'],$old['user_id']]);$current=$q->fetch(PDO::FETCH_ASSOC);
        if(!$current || $current['cover_url']!==$old['cover_url'] || $current['avatar_url']!==$old['avatar_url'])throw new RuntimeException('Studio profile changed during catalog maintenance; no partial update was committed.');
        if(DemoCatalog::demoImage($old['cover_url']))$db->prepare('UPDATE studios SET cover_url=? WHERE studio_id=?')->execute([$p['cover_url'],$old['studio_id']]);
        if(DemoCatalog::demoImage($old['avatar_url']))$db->prepare('UPDATE users SET avatar_url=? WHERE user_id=?')->execute([$p['avatar_url'],$old['user_id']]);
    }
    $summary=['rooms'=>count($backup['rooms']),'createdRoomIds'=>$createdRoomIds,'createdImageIds'=>$createdImageIds,'removedImageIds'=>$removedImageIds];
    $db->prepare('UPDATE demo_catalog_update_runs SET summary_json=? WHERE run_id=?')->execute([json_encode($summary,JSON_THROW_ON_ERROR),$runId]);
    $db->commit();echo json_encode(['applied'=>true,'rooms'=>count($backup['rooms']),'backup'=>$file,'databaseBackupRunId'=>$runId],JSON_UNESCAPED_UNICODE)."\n";
} catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
finally{$db->query("SELECT RELEASE_LOCK('studiohub_demo_catalog')");}
