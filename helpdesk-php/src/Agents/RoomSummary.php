<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Agents;

/** Presentation only: retain API wording and all policy conditions. */
final class RoomSummary
{
    public static function format(string $text, int $roomId): string
    {
        if (!str_starts_with($text, 'Phòng: ')) return $text;
        $groups = ['Thông tin cơ bản'=>[], 'Giá thuê tham khảo'=>[], 'Tiện ích nổi bật'=>[], 'Lưu ý'=>[]];
        $lines = explode("\n", $text);
        $title = self::escape(array_shift($lines) ?? '');
        foreach ($lines as $line) {
            if ($line === '') continue;
            $section = match (true) {
                str_starts_with($line, 'Giá phòng:') => 'Giá thuê tham khảo',
                str_starts_with($line, 'Tiện ích:'), str_starts_with($line, 'Thiết bị thuê thêm:') => 'Tiện ích nổi bật',
                (bool)preg_match('/^(Sức chứa:|Địa chỉ:|Quận\/khu vực:|Thành phố:|Điện thoại Studio:|Mô tả phòng:)/u', $line) => 'Thông tin cơ bản',
                default => 'Lưu ý',
            };
            $groups[$section][] = '- '.self::escape($line);
        }
        $out = '**'.$title.'**';
        foreach ($groups as $heading=>$items) if ($items) $out .= "\n\n**".$heading."**\n".implode("\n", $items);
        $out .= "\n\n[Xem trang chi tiết phòng](/rooms/".$roomId.')';
        // Preserve the existing API message ceiling without dropping policy conditions.
        return mb_strlen($out) <= 4000 ? $out : $text;
    }

    public static function escape(string $value): string
    {
        return preg_replace('/([\\\\`*_{}\[\]<>#+.!|~-])/u', '\\\\$1', $value);
    }
}
