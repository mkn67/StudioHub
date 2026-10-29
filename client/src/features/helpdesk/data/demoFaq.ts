export const suggestedQuestions = [
  "Làm sao để đặt Studio?",
  "Chính sách hủy và hoàn cọc?",
  "Tôi muốn tìm phòng phù hợp",
  "Tôi cần hỗ trợ đơn thuê",
] as const;

export const welcomeMessage = "Xin chào! Mình là trợ lý hỗ trợ StudioHub. Bạn cần tìm hiểu về đặt phòng, thanh toán, chính sách hay yêu cầu hỗ trợ?";

// Public guidance manually mapped to approved policy; no retrieval or LLM is run.
export const demoFaq = {
  booking: {
    text: "Bạn vào Tìm Studio, chọn đúng phòng vật lý, lịch thuê và thiết bị cần dùng, rồi kiểm tra thông tin trước khi xác nhận. Cần đăng nhập để tạo đơn. Sau khi cọc thành công, đơn vẫn chờ Chủ Studio duyệt; chỉ khi được duyệt mới là đã xác nhận. Thanh toán trong bản hiện tại là mô phỏng.",
    sources: [{ title: "Hướng dẫn đặt thuê StudioHub", reference: "Chính sách v1.1 · BP-01, BP-05, BP-11, BP-14–15" }],
    links: [{ label: "Tìm Studio", href: "/rooms" }],
  },
  payment: {
    text: "Tỷ lệ cọc tùy chính sách Studio, không mặc định là 30%. Khoản cọc đã trả được tính vào tổng tiền thuê. Trạng thái đơn, thanh toán và hoàn cọc được theo dõi riêng. Bản hiện tại chỉ mô phỏng thanh toán, không chuyển tiền thật.",
    sources: [{ title: "Thanh toán và tiền cọc", reference: "Chính sách v1.1 · BP-11, BP-16–19" }],
    links: [{ label: "Xem đơn thuê của tôi", href: "/my-bookings" }],
  },
  cancellation: {
    text: "Hạn tự hủy do Chủ Studio cấu hình (24, 48 hoặc 72 giờ trước giờ thuê). Nếu đã cọc và hủy trong hạn, mức hoàn dựa trên chính sách được lưu khi tạo đơn; không mặc định hoàn toàn bộ. Chủ Studio từ chối hoặc quá hạn duyệt thuộc nhánh hoàn 100% tiền cọc. Đây là hướng dẫn chung, không xác nhận quyền lợi hay thực hiện hủy/hoàn cho một đơn cụ thể.",
    sources: [{ title: "Hủy đơn và hoàn cọc", reference: "Chính sách v1.1 · BP-22–25" }],
    links: [{ label: "Kiểm tra chính sách trong đơn thuê", href: "/my-bookings" }],
  },
  discovery: {
    text: "Bạn có thể lọc phòng theo nhu cầu, sức chứa và ngân sách tại Tìm Studio, rồi xem ảnh, thông số và chính sách của từng phòng. Mình chưa kết nối dữ liệu khả dụng trực tiếp nên không thể xác nhận phòng trống, giá hiện tại hoặc giữ lịch giúp bạn.",
    sources: [{ title: "Chọn phòng phù hợp", reference: "Chính sách v1.1 · BP-05–09" }],
    links: [{ label: "Khám phá và lọc phòng", href: "/rooms" }],
  },
};
