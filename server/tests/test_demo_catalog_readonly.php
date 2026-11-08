<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
if(class_exists(Dotenv\Dotenv::class))Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
use App\Core\Db;
use App\Modules\Rooms\{DemoCatalog,RoomRepository};
function verify(bool $ok,string $why):void{if(!$ok)throw new RuntimeException($why);}
$db=Db::getConnection();$repo=new RoomRepository($db);$manifest=DemoCatalog::data();$checked=0;
verify(!DemoCatalog::demoImage('/uploads/rooms/host-owned.jpg'),'Custom uploads must be preserved');
verify(!DemoCatalog::demoImage('https://images.unsplash.com/photo-not-in-the-seed'),'Unknown Host-supplied stock media must be preserved');
foreach($manifest['rooms'] as $definition){
    if($definition['status']!=='active')continue;
    $q=$db->prepare('SELECT r.room_id FROM rooms r JOIN studios s ON s.studio_id=r.studio_id JOIN users u ON u.user_id=s.host_id WHERE r.name=? AND u.email=?');
    $q->execute([$definition['name'],$definition['owner_email']]);$id=$q->fetchColumn();verify($id!==false,'Missing demo room '.$definition['name']);
    $r=$repo->findActiveRoomById((int)$id);verify($r!==null,'Missing active room');verify(count($r['images'])>=3,'Missing gallery');
    verify(count(array_unique(array_column($r['images'],'image_url')))===count($r['images']),'Duplicate gallery URLs');
    verify(!empty($r['studio']['host_avatar_url']),'Missing host avatar');$checked++;
}
$q=$db->query("SELECT space_type_id FROM space_types WHERE name='Workshop & Event Studio'");$typeId=(int)$q->fetchColumn();
$workshops=$repo->searchRooms(['space_type_id'=>$typeId,'limit'=>50]);
verify(!in_array('Zenith Black Box Theatre',array_column($workshops['items'],'name'),true),'Black Box remains misclassified as Workshop');
$search=$repo->searchRooms(['keyword'=>'Artemis Daylight Lookbook Loft','sort'=>'recommended','limit'=>5]);
verify(($search['items'][0]['name']??'')==='Artemis Daylight Lookbook Loft','Exact match is not ranked first');
$duplicates=$db->query('SELECT COUNT(*) FROM (SELECT studio_id,name FROM rooms GROUP BY studio_id,name HAVING COUNT(*)>1) x')->fetchColumn();verify((int)$duplicates===0,'Duplicate room rows');
echo json_encode(['passed'=>true,'activeDemoRooms'=>$checked,'workshopRooms'=>count($workshops['items']),'readOnly'=>true])."\n";
