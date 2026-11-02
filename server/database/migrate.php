<?php
declare(strict_types=1);
// Compatibility entrypoint. No implicit seed, reset, table drop or truncation.
if(in_array('--fresh',$argv,true)) { fwrite(STDERR,"Database resets are disabled. Use versioned migrations.\n"); exit(1); }
require dirname(__DIR__).'/bin/init.php';
