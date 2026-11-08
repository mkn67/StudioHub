<?php
declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Core\Db;
use PDO;

/** Read-only public facts. Never return users, bookings, payments or policy editor IDs. */
final class RoomHelpdeskService
{
    public function __construct(private ?PDO $pdo = null, private ?RoomService $rooms = null) {}

    public function get(int $roomId): array
    {
        $db = $this->pdo ?? Db::getConnection();
        // Reuse the public active-room AND active-studio access check.
        $room = ($this->rooms ?? new RoomService())->getRoomDetail($roomId);
        $policy = $db->prepare('SELECT payment_minutes, deposit_percent, cancel_hours, change_hours, refund_tiers, open_hour, close_hour FROM studio_policies WHERE studio_id = ?');
        $policy->execute([$room['studio_id']]);
        $equipment = $db->prepare("SELECT name, unit_price, pricing_unit FROM equipments WHERE studio_id = ? AND status = 'active' ORDER BY equipment_id LIMIT 10");
        $equipment->execute([$room['studio_id']]);
        return self::project($room, $policy->fetch(PDO::FETCH_ASSOC) ?: null, $equipment->fetchAll(PDO::FETCH_ASSOC));
    }

    public static function project(array $room, ?array $policy, array $equipment): array
    {
        $missing = [];
        $text = ['Phòng: ' . $room['name'] . ' — Studio: ' . ($room['studio']['name'] ?? ''),
            'Sức chứa: ' . $room['capacity'] . ' người; diện tích: ' . $room['area'] . ' m².'];
        foreach (['address'=>'Địa chỉ', 'district'=>'Quận/khu vực', 'city'=>'Thành phố', 'phone'=>'Điện thoại Studio'] as $key=>$label) {
            if (!empty($room['studio'][$key])) $text[] = $label . ': ' . $room['studio'][$key];
            else $missing[] = 'studio.' . $key;
        }
        foreach (['description'=>'Mô tả phòng', 'rules'=>'Nội quy phòng'] as $key=>$label) {
            if (!empty($room[$key])) $text[] = $label . ': ' . mb_substr($room[$key], 0, 700);
            else $missing[] = 'room.' . $key;
        }
        $names = array_column(array_slice($room['amenities'] ?? [], 0, 15), 'name');
        if ($names) $text[] = 'Tiện ích: ' . implode(', ', $names);
        else $missing[] = 'amenities';
        foreach (array_slice($room['rates'] ?? [], 0, 10) as $rate) {
            $text[] = 'Giá phòng: ' . number_format((float)$rate['unit_price'], 0, ',', '.') . 'đ/' . $rate['rate_unit']
                . '; tối thiểu ' . ($rate['minimum_units'] ?? 1) . ' đơn vị thuê.';
        }
        if (empty($room['rates'])) $missing[] = 'active_rates';
        foreach (array_slice($equipment, 0, 10) as $item) {
            $text[] = 'Thiết bị thuê thêm: ' . $item['name'] . ' — ' . number_format((float)$item['unit_price'], 0, ',', '.') . 'đ/' . $item['pricing_unit'];
        }
        if (!$equipment) $missing[] = 'active_equipment';
        $policyStart = count($text);
        if ($policy !== null) {
            $text[] = 'Cấu hình thuê hiện tại của Studio: cọc ' . $policy['deposit_percent'] . '%; thời hạn thanh toán ' . $policy['payment_minutes'] . ' phút.';
            $text[] = 'Ngưỡng hủy đơn đã thanh toán: ' . $policy['cancel_hours'] . ' giờ trước giờ bắt đầu; ngưỡng đổi lịch: ' . $policy['change_hours'] . ' giờ.';
            $text[] = 'Giờ hoạt động: ' . $policy['open_hour'] . 'h–' . $policy['close_hour'] . 'h.';
            $tiers = is_array($policy['refund_tiers'] ?? null) ? $policy['refund_tiers'] : json_decode($policy['refund_tiers'] ?? 'null', true);
            $valid = is_array($tiers) && count($tiers) <= 10;
            $previous = PHP_INT_MAX;
            foreach ($valid ? $tiers : [] as $tier) {
                if (!is_array($tier) || !is_numeric($tier['hours'] ?? null) || !is_numeric($tier['percent'] ?? null)
                    || $tier['hours'] < 0 || $tier['hours'] >= $previous || $tier['percent'] < 0 || $tier['percent'] > 100) { $valid = false; break; }
                $previous = $tier['hours'];
            }
            if ($valid && $tiers) {
                foreach ($tiers as $tier) $text[] = 'Mức hoàn cấu hình: trước giờ bắt đầu ít nhất ' . $tier['hours'] . ' giờ → ' . $tier['percent'] . '% số tiền đã thanh toán.';
            } else $missing[] = 'refund_tiers';
            $text[] = 'Đây là cấu hình hiện tại; đơn đã đặt có thể áp dụng bản chính sách chụp tại thời điểm đặt. Cần kiểm tra đơn để xác định khoản hoàn thực tế.';
        } else $missing[] = 'studio_policy';
        // Keep policy conditions together and prioritise them before optional long descriptions.
        $policyLines = array_splice($text, $policyStart);
        array_splice($text, 2, 0, $policyLines);
        $result = ''; $omitted = false;
        foreach ($text as $line) {
            if (mb_strlen($result . "\n" . $line) > 3200) { $omitted = true; continue; }
            $result .= ($result === '' ? '' : "\n") . $line;
        }
        if ($omitted) $result .= "\nMột số thông tin dài đã lược bớt; xem đầy đủ tại trang phòng.";
        if ($missing) $result .= "\nChưa có dữ liệu hoặc dữ liệu chưa hợp lệ: " . implode(', ', $missing) . '. Liên hệ Studio để bổ sung/xác nhận.';
        $result .= "\nChưa xác nhận lịch trống, số lượng thiết bị còn lại hoặc giữ chỗ; giá trên chưa phải báo giá toàn bộ đơn.";
        return ['roomId'=>(string)$room['room_id'], 'text'=>$result, 'missingFields'=>$missing, 'checkedAt'=>date(DATE_ATOM)];
    }
}
