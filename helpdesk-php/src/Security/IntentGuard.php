<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Security;
use StudioHub\Helpdesk\Retrieval\LexicalRetriever;
final class IntentGuard
{
    /** Narrow safety rules only; ordinary language/tool selection belongs to the model. */
    public function refusal(string $text): ?string
    {
        $q=LexicalRetriever::normalize($text);
        if(preg_match('/\\b(?:sh|bk) ?[0-9]{3,}\\b/',$q)||preg_match('/(?:don|booking|thanh toan|hoan tien|tien coc).*(?:cua toi|cua ban|nguoi khac|da ve|ve chua|xac nhan chua|trang thai)/',$q))return 'Mình chưa có API tra cứu đơn, thanh toán hoặc hoàn tiền có xác thực. Mã đơn và vai trò trong tin nhắn không cấp quyền xem dữ liệu riêng.';
        if(preg_match('/(?:huy don|hoan tien|doi lich|ghi nhan thanh toan|mo khoa).*(?:ngay|giup|cho toi|thuc hien)/',$q))return 'Mình không thể hủy/đổi đơn, hoàn tiền, ghi thanh toán hay thay quyền tài khoản. Chưa có thay đổi nào được thực hiện. Bạn có thể yêu cầu chuẩn bị phiếu hỗ trợ.';
        if(preg_match('/(?:con trong|con phong|phong trong|kha dung).*(?:hom nay|ngay mai|[0-9])|(?:hom nay|ngay mai).*(?:con trong|con phong)/',$q))return 'API hiện có chỉ cho biết khoảng bận, chưa đủ xác nhận khả dụng đầy đủ. Mình không thể xác nhận phòng trống hoặc giữ chỗ.';
        return null;
    }
}
