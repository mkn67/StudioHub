<?php
declare(strict_types=1);
// Synthetic HTTP contract fixture. Never loaded by the application.
header('Content-Type: application/json');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$body=json_decode(file_get_contents('php://input'),true)??[];
$emit=static function(array $data): never {echo json_encode(['status'=>'success','data'=>$data]);exit;};
if($path==='/health') $emit([]);
if($path==='/api/auth/profile' || $path==='/api/bookings') {
    $users=['Bearer synthetic-http-customer'=>1,'Bearer synthetic-http-other'=>2];
    $userId=$users[$_SERVER['HTTP_AUTHORIZATION']??'']??null;
    if(!$userId) {http_response_code(401);echo '{}';exit;}
    if($path==='/api/auth/profile')$emit(['user_id'=>$userId,'role'=>'customer']);
    $emit(['items'=>[['booking_id'=>7,'customer_id'=>1,'booking_code'=>'SH-HTTP-7','room_name'=>'HTTP Podcast','status'=>'confirmed','start_time'=>'2099-11-15 09:00:00','end_time'=>'2099-11-15 12:00:00','total_amount'=>'300000.00','deposit_amount'=>'90000.00','customer_email'=>'never-expose@example.test']], 'page'=>1,'total_items'=>1]);
}
if($path==='/api/bookings/check-availability' && $_SERVER['REQUEST_METHOD']==='POST') {
    $emit(['available'=>true,'room'=>['room_id'=>$body['room_id']],'start_time'=>$body['start_time'],'end_time'=>$body['end_time'],'pricing'=>['room_amount'=>300000,'equipment_amount'=>0,'total_amount'=>300000,'deposit_amount'=>90000]]);
}
if($path==='/v1/chat/completions') {
    $messages=$body['messages'];$last=end($messages);
    if($last['role']==='tool') {
        $data=json_decode($last['content'],true);
        $kind=isset($data['data']['data']['items'])?'my_bookings':'availability';
        $message=['role'=>'assistant','content'=>json_encode(['kind'=>$kind])];
    } else {
        $booking=false;
        foreach($messages as $m) if(($m['role']??'')==='user') $booking=str_contains($m['content'],'HISTORY');
        $message=['role'=>'assistant','content'=>null,'tool_calls'=>[['id'=>'fixture-http-call','type'=>'function','function'=>[
            'name'=>$booking?'get_my_bookings':'check_room_availability',
            'arguments'=>json_encode($booking?['page'=>1]:['room_id'=>12,'rate_id'=>3,'start_time'=>'2099-11-15 09:00:00','end_time'=>'2099-11-15 12:00:00'])]]]];
    }
    echo json_encode(['choices'=>[['message'=>$message]]]);exit;
}
http_response_code(404);echo '{}';
