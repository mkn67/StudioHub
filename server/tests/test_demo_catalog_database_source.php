<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
if(class_exists(Dotenv\Dotenv::class))Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db=App\Core\Db::getConnection();
if(!preg_match('/_(dev|test)$/D',(string)$db->query('SELECT DATABASE()')->fetchColumn()))throw new RuntimeException('This rollback-only test requires a dev/test database.');
$q=$db->query("SELECT r.room_id,ri.image_id,r.name FROM rooms r JOIN studios s ON s.studio_id=r.studio_id JOIN users u ON u.user_id=s.host_id JOIN room_images ri ON ri.room_id=r.room_id AND ri.is_primary=1 WHERE u.email='host1@studio.local' AND r.name='Artemis Phòng Cyclorama Trắng' LIMIT 1");
$sample=$q->fetch(PDO::FETCH_ASSOC);if(!$sample)throw new RuntimeException('Missing demo fixture');
$repo=new App\Modules\Rooms\RoomRepository($db);
$db->beginTransaction();
try {
    $url='https://example.invalid/owner-upload.jpg';$description='The database is the source of room descriptions.';
    $db->prepare('UPDATE room_images SET image_url=? WHERE image_id=?')->execute([$url,$sample['image_id']]);
    $db->prepare('UPDATE rooms SET description=? WHERE room_id=?')->execute([$description,$sample['room_id']]);
    $detail=$repo->findActiveRoomById((int)$sample['room_id']);
    if($detail['images'][0]['image_url']!==$url || $detail['description']!==$description)throw new RuntimeException('Manifest still overrides database detail values');
    $list=$repo->searchRooms(['keyword'=>$sample['name'],'limit'=>1]);
    if($list['items'][0]['thumbnail_url']!==$url || $list['items'][0]['description']!==$description)throw new RuntimeException('Manifest still overrides database listing values');
    echo json_encode(['passed'=>true,'source'=>'MySQL room_images/rooms','rolledBack'=>true])."\n";
} finally {$db->rollBack();}
