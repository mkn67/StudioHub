<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Tools;
use StudioHub\Helpdesk\Failure;
final class Schema
{
    public static function check(mixed $value,array $schema): void
    {
        if(isset($schema['enum'])&&!in_array($value,$schema['enum'],true))throw new Failure('invalid_tool_arguments',422);
        $type=$schema['type']??null;
        $valid=match($type){'object'=>is_array($value)&&($value===[]||!array_is_list($value)),'array'=>is_array($value)&&array_is_list($value),'string'=>is_string($value),'integer'=>is_int($value),'boolean'=>is_bool($value),'number'=>is_int($value)||is_float($value),null=>true,default=>false};
        if(!$valid)throw new Failure('invalid_tool_arguments',422);
        if($type==='object'){
            foreach($schema['required']??[]as$key)if(!array_key_exists($key,$value))throw new Failure('invalid_tool_arguments',422);
            foreach($value as$key=>$v){if(!isset($schema['properties'][$key]))throw new Failure('invalid_tool_arguments',422);self::check($v,$schema['properties'][$key]);}
        }
        if($type==='string'&&(mb_strlen($value)<($schema['minLength']??0)||mb_strlen($value)>($schema['maxLength']??4000)))throw new Failure('invalid_tool_arguments',422);
        if($type==='integer'&&($value<($schema['minimum']??PHP_INT_MIN)||$value>($schema['maximum']??PHP_INT_MAX)))throw new Failure('invalid_tool_arguments',422);
        if($type==='array'){if(count($value)>($schema['maxItems']??50))throw new Failure('invalid_tool_arguments',422);foreach($value as$v)self::check($v,$schema['items']);}
    }
}
