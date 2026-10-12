# Quy ước cho AI khi viết back-end

- Đọc docs/3.2-database.md, docs/3.3-api.md và docs/implementation-plan.md trước khi làm. Chỉ làm đúng phase được giao, không thêm endpoint ngoài tài liệu. Nếu plan và 3.3.2 mâu thuẫn thì theo plan.
- Stack: PHP 8.2 thuần chia module, nikic/fast-route, PDO MySQL, firebase/php-jwt. Không ORM, không framework. Code nằm trong server/.
- Luồng bắt buộc cho mỗi endpoint: validate đầu vào → xác thực/role (middleware) → kiểm tra sở hữu (OwnershipGuard) → Service → trả response.
- Controller không chứa SQL và không mở transaction. Transaction và khóa chỉ nằm trong Service.
- SQL chỉ dùng prepared statement với tham số. Không nối chuỗi người dùng vào SQL.
- Response luôn theo envelope: thành công {status,code,message,data}; lỗi {status:"error",code,message,errors:[{field,code,message}]}. `errors` luôn là mảng.
- Tiền là số nguyên VND. Thời gian là chuỗi "YYYY-MM-DD HH:mm:ss" giờ Asia/Ho_Chi_Minh, không offset. PHP đặt date_default_timezone_set('Asia/Ho_Chi_Minh'); mỗi kết nối MySQL chạy SET time_zone = '+07:00'.
- AuthMiddleware luôn nạp lại user từ DB (trạng thái, vai trò hiện tại); không tin role trong token. Quyền sở hữu luôn kiểm tra lại bằng DB (studio_id, room_id, booking_id, equipment_id từ client là dữ liệu chưa tin cậy). Sai quyền sở hữu → 403.
- Mọi thao tác ghi lên một booking (đổi trạng thái, hủy, thanh toán, hết hạn): mở transaction, SELECT ... FOR UPDATE dòng booking, rồi đọc lại trạng thái và lịch sử thanh toán trước khi quyết định.
- Không chạy UPDATE hàng loạt trong đường xử lý request. Việc chuyển pending quá hạn sang expired do bin/expire-bookings.php, xử lý từng đơn qua BookingService::expireIfDue (khóa dòng, đọc thanh toán, ghi audit_logs kèm khoản cần hoàn); trong request chỉ gọi cùng hàm đó cho đúng một booking đang thao tác.
- Đơn pending luôn có expires_at và chỉ chiếm lịch khi expires_at > NOW(). Giá bảng giá chốt theo DATE(start_time) và lưu snapshot vào đơn.
- migrate.php --fresh chỉ chạy được khi APP_ENV là dev hoặc test và tên DB kết thúc bằng _dev hoặc _test.
- Không trả stack trace, SQL hay đường dẫn trong response. Chi tiết chỉ ghi log phía server (HTTP 500 trả thông báo chung).
- Không đặt secret trong code hoặc biến NEXT_PUBLIC_*. Secret chỉ đọc từ .env phía server.
- Viết test PHPUnit cho logic thuần (giá, trùng lịch, tồn kho, state machine). Sau khi code xong phase, chạy test và báo kết quả thật, không tự khẳng định "đã pass".

