<?php
declare(strict_types=1);
namespace App\Modules\Rooms;

/** Curated media for explicitly identified demo accounts, never arbitrary Host inventory. */
final class DemoCatalog
{
    public static function data(): array
    {
        static $data;
        return $data ??= json_decode(file_get_contents(dirname(__DIR__,3).'/database/demo/catalog.v2.json'), true, 64, JSON_THROW_ON_ERROR);
    }

    public static function room(string $name, string $email): ?array
    {
        foreach (self::data()['rooms'] as $room) {
            if ($room['name'] === $name && $room['owner_email'] === $email) return $room;
        }
        return null;
    }

    public static function studio(string $email): ?array
    {
        foreach (self::data()['studios'] as $studio) if ($studio['owner_email'] === $email) return $studio;
        return null;
    }

    public static function demoImage(?string $url): bool
    {
        if (!$url) return true;
        $withoutQuery = explode('?', $url, 2)[0];
        if (in_array($withoutQuery, self::data()['legacy_image_paths'] ?? [], true)) return true;
        foreach (self::data()['rooms'] as $room) foreach ($room['photos'] as $photo) if ($photo['url'] === $url) return true;
        foreach (self::data()['studios'] as $studio) if (in_array($url, [$studio['cover_url'], $studio['avatar_url']], true)) return true;
        return false;
    }
}
