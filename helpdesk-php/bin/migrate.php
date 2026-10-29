<?php
declare(strict_types=1);
use StudioHub\Helpdesk\{Failure};
use StudioHub\Helpdesk\Persistence\Store;
$config=require dirname(__DIR__).'/bootstrap.php';
if(!in_array('--apply',$argv,true)){fwrite(STDERR,"Explicit initialization only: php bin/migrate.php --apply\n");exit(2);}
$dsn=$config->get('HELPDESK_DATABASE_URL','sqlite:var/helpdesk.sqlite');
if(str_starts_with($dsn,'mysql:')&&!preg_match('/dbname=[A-Za-z0-9_]*helpdesk[A-Za-z0-9_]*_(dev|test)(?:;|$)/',$dsn)){fwrite(STDERR,"Refusing migration outside an isolated Helpdesk dev/test database.\n");exit(2);}
(new Store($config))->migrate();echo "Helpdesk-owned tables initialized; no business schema touched.\n";
