<?php
declare(strict_types=1);
$config=require dirname(__DIR__).'/bootstrap.php';
if(!in_array('--apply',$argv,true)){fwrite(STDERR,"Explicit retention cleanup: php bin/retention.php --apply\n");exit(2);}
echo (new StudioHub\Helpdesk\Persistence\Store($config))->prune()." expired Helpdesk records removed.\n";
