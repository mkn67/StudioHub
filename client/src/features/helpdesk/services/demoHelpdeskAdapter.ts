import { demoFaq } from "../data/demoFaq";
import { MAX_MESSAGE_LENGTH, type HelpdeskResponse, type HelpdeskTransport } from "../types/helpdesk.types";

const unavailable = (text: string, href = "/my-bookings", label = "Mở đơn thuê của tôi"): HelpdeskResponse => ({
  mode: "demo", state: "unavailable", text, links: [{ label, href }],
});

export const demoHelpdeskAdapter: HelpdeskTransport = {
  mode: "demo",
  async sendMessage(message, _context, options) {
    options?.signal?.throwIfAborted();
    const text = message.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) throw new Error("Tin nhắn cần có từ 1 đến 1.000 ký tự.");
    const q = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();
    // Private/live/action requests take priority over public keyword matching.
    if (/ticket|handoff|nhan vien|tao (phieu|yeu cau)|ho tro|lien he/.test(q))
      return unavailable("Tạo ticket và chuyển cho nhân viên chưa được kết nối trong bản demo. Chưa có yêu cầu hỗ trợ nào được gửi hoặc lưu. Bạn có thể mở đơn thuê để xem thông tin và các thao tác sẵn có; đừng gửi mật khẩu hay thông tin thanh toán trong cuộc trò chuyện này.");
    if (/don (cua toi|thue|hang)|ma don|booking|xac nhan chua|thanh toan chua|tien.*(ve|chua)|trang thai|\bsh[-\s]?\d|\b[a-z]{2,}-\d{3,}/.test(q))
      return unavailable("Mình chưa kết nối API tra cứu đơn thuê, thanh toán hoặc hoàn tiền có xác thực. Mình không thể xác nhận trạng thái từ mã đơn bạn nhập. Bạn hãy kiểm tra trực tiếp tại Đơn thuê của tôi; bản demo không tra cứu dữ liệu riêng tư.");
    if (/\b(huy|hoan|doi lich)\b.*\b(giup|ngay|cho toi|cua toi|thuc hien)\b/.test(q))
      return unavailable("Mình chưa thể hủy đơn, đổi lịch hay thực hiện hoàn cọc. Chưa có thay đổi nào được thực hiện. Bạn hãy mở đơn thuê để kiểm tra điều kiện và thao tác sẵn có.");
    if (/con trong|phong trong|kha dung|lich trong|ngay mai|hom nay|\d{1,2}[/-]\d{1,2}/.test(q))
      return unavailable("Mình chưa kết nối nguồn dữ liệu khả dụng trực tiếp nên không thể xác nhận ngày hoặc giờ còn trống. Hãy xem lịch trên trang chi tiết phòng; cuộc trò chuyện không giữ chỗ hoặc thay đổi lịch.", "/rooms", "Xem danh sách phòng");
    const topic = /huy|hoan coc|hoan tien/.test(q) ? "cancellation"
      : /thanh toan|tien coc|dat coc|ty le coc/.test(q) ? "payment"
      : /tim phong|tim studio|phu hop|suc chua|ngan sach/.test(q) ? "discovery"
      : /dat studio|dat phong|cach dat|lam sao de dat/.test(q) ? "booking" : null;
    return topic ? { ...demoFaq[topic], mode: "demo", state: "answered" }
      : unavailable("Mình chưa có câu trả lời đã được kiểm chứng cho câu hỏi này. Bản demo dùng các câu trả lời định sẵn về đặt phòng, tiền cọc, hủy/hoàn và tìm phòng; không sử dụng AI hoặc tra cứu trực tiếp. Bạn có thể chọn một gợi ý bên dưới.", "/rooms", "Tìm Studio");
  },
};
