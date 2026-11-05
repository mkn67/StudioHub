# Vấn đề tích hợp còn tồn tại — 05/11/2026

Các route trong danh sách đều có source. Báo cáo này phân biệt lỗi frontend, rủi ro backend theo source, giới hạn nghiệp vụ và thiếu môi trường. Không gọi các trường hợp bên dưới là “thiếu API”. Không có kết luận lỗi runtime PHP được tái hiện thành công trong lượt này vì PHP/MySQL chưa truy cập được.

## A — Frontend

Các lỗi phát hiện trong lượt này đã sửa:

| Lỗi trước sửa | File / endpoint | Cách tái hiện trước sửa | Cách sửa / mức độ |
|---|---|---|---|
| Ngày sinh/địa chỉ bị vô hiệu hóa; chưa có upload/email/preferences/identity | customer-profile.tsx, account-capabilities.tsx; auth/profile, account/*, email-change-* | Mở hồ sơ, không gửi được các trường được backend hỗ trợ | Nối API thật, re-fetch, không lưu giấy tờ ở localStorage; P1, frontend |
| Quản lý phòng/thiết bị phụ thuộc snapshot workspace | host-resources.tsx; GET host/rooms, host/equipments | Tài nguyên REST không có type_id của workspace có thể không xuất hiện | Đọc endpoint owner, giữ raw inactive/maintenance, tách room_type_id của REST; P1, frontend |
| Giá quản lý chỉ đọc public active; xóa thiết bị/giá không được nối | host-resources.tsx; host/rooms/{id}/rates, hai DELETE | Không xem giá inactive; thiếu thao tác xóa vĩnh viễn | Đọc owner rates; confirm DELETE; giữ lỗi 409 của backend; P1, frontend |
| Form phòng dùng bước số nguyên cho diện tích thập phân | host-ui.tsx, host-resources.tsx; PATCH rooms/{id} | Phòng có area=24.5, sửa tên rồi lưu: native validation chặn request | HostField hỗ trợ step, area dùng any; chờ danh mục trước mở form; P1, frontend; phát hiện bằng browser fixture |
| Ảnh Studio dùng sai tên trường | host-types.ts, host-contract.ts, host-resources.tsx; studios/mine, studios/{id}/cover | Upload trả cover_url nhưng UI đọc cover_image_url | Dùng cover_url, decode theo source; P1, frontend |
| Lỗi PHP error_code chưa được đọc đầy đủ | services/api/client.ts; mọi API | Response 403, code=403, error_code=account_locked không có errors[] | Đọc error_code, hết phiên tài khoản khóa; test mock; P1, frontend |
| Tải hợp đồng không thể dùng link thường khi cần JWT | host-legal.tsx, management.ts; document-access và download phụ | Mở access_url không gửi Authorization | Xin grant, kiểm tra path cùng hợp đồng, fetch PDF với Bearer rồi tải Blob; P1, frontend |
| Báo cáo/nghiệp vụ quản trị còn placeholder | rest-pages.tsx, rest-reporting.tsx | Admin equipment read-only; hoàn tiền chỉ theo dõi workspace; series chưa dùng | Nối REST Admin, đối soát có evidence, audit và series theo kỳ; P1, frontend |

Chưa phát hiện thêm lỗi frontend đã tái hiện và chưa sửa trong phạm vi kiểm thử hiện tại. Điều này **không có nghĩa frontend đã được nghiệm thu trên backend thật**. Các component workspace/connected mode cũ và script `workspace-integration-qa.mjs` được giữ cho luồng riêng; bài kiểm thử REST mới là `rest-integration-qa.mjs`. Không dùng kỳ vọng command/workspace của script cũ để kết luận REST mới hỏng.

## B — Backend / database theo source, chưa xác nhận runtime

### B1 — Hai runner dùng tracker migration không thống nhất — P1

- File: `server/bin/migrate.php` dùng `schema_migrations.version`; `server/database/migrate-up.php` và `database/migrate.php` dùng `schema_migrations.migration`.
- Ảnh hưởng: tất cả API phụ thuộc schema/migrations, đặc biệt các nhóm 009–012.
- Tái hiện dự kiến trên **DB test riêng**: tạo tracker bằng runner SQL, rồi gọi runner PHP; truy vấn `WHERE version=?` sẽ không khớp cấu trúc tracker chỉ có `migration`. Chiều ngược lại có rủi ro tương tự. Đây là suy luận trực tiếp từ source, chưa chạy trên DB.
- Gốc rễ: cùng tên bảng nhưng hai định nghĩa cột; `CREATE TABLE IF NOT EXISTS` không nâng cấp bảng đã có.
- Đề nghị: người phụ trách backend thống nhất tracker/runner và upgrade path; kiểm tra `SHOW COLUMNS FROM schema_migrations` trước khi chạy. Không sửa PHP/SQL trong lượt này.

### B2 — Migration workspace thay lifecycle booking nhưng REST vẫn dùng lifecycle cũ — P0 trước nghiệm thu

- File: `server/database/migrations/001_integration.php`, `server/src/Modules/Booking/BookingStateMachine.php`, `BookingService.php`, `server/src/Services/WorkspaceService.php`.
- Endpoint: các API booking/payment/status/calendar/statistics; shared workspace/commands.
- Bằng chứng source: migration PHP đổi `pending` chưa thanh toán thành `awaiting_payment`, đổi `rejected` thành `cancelled`, tạo CHECK lifecycle không có `rejected`; REST state machine vẫn có `pending -> rejected` và không xử lý `awaiting_payment`.
- Tái hiện cần backend thực hiện trên DB test: áp dụng đúng schema đang triển khai, tạo/đọc/hủy/thanh toán/từ chối một booking qua REST, đối chiếu CHECK/status. Không tự chạy migration PHP trên DB thật để chứng minh lỗi.
- Đề nghị: backend thống nhất schema/lifecycle authoritative, chính sách tương thích và test dữ liệu cũ. Frontend REST đã tránh gọi commands đồng thời, nhưng không thể tự giải quyết xung đột backend này.
- Chưa kết luận DB hiện tại đã áp dụng migration đó; chưa ghi nhận HTTP/SQL error thực tế.

### B3 — Bootstrap bỏ qua migration khi DB có bảng — P1 readiness

- File: `server/bin/init-db.php`; endpoint bị ảnh hưởng: profile/account, owner inventory, pháp lý, hợp đồng, refund actions.
- Source: nếu database có bất kỳ bảng nào, init trả “Existing database detected; automatic migration and seeding skipped”. Vì vậy khởi động stack không chứng minh migration 009–012 đã được áp dụng.
- Tái hiện read-only cần chủ DB: đối chiếu `schema_migrations` và `information_schema` theo hướng dẫn runtime report.
- Đề nghị: review và áp dụng migration còn thiếu trên DB test trước; không dùng `--fresh`, không seed DB hiện hữu. Chưa xác nhận bảng/cột nào thực sự thiếu trên DB đang chạy.

## C — Giới hạn nghiệp vụ / dữ liệu API

| Giới hạn | Endpoint / source | Cách kiểm tra | Đề nghị / mức độ / chủ trì |
|---|---|---|---|
| Hoàn tiền là đối soát thủ công, không chuyển tiền provider | POST admin/refund-exceptions/{id}/actions; RefundExceptionService::act | Source chỉ UPDATE status + INSERT action/audit; confirm_succeeded cần evidence_reference | UI đã ghi nhãn đúng. Tích hợp provider thật là quyết định nghiệp vụ/backend sau; P1 |
| Chưa có ma trận permissions chi tiết | GET admin/roles; AdminController::roles | Response chỉ role_id,role_name,description, giới hạn host/customer | UI dùng danh mục thật, không bịa checkbox quyền; P2, backend/product nếu cần |
| Chưa đủ luồng ký/gia hạn/phê duyệt hợp đồng hoàn chỉnh | LegalContractService/Controller | Có tạo record/PDF, list/detail, grant/download; document-access yêu cầu status active; không coi active là chữ ký đã xác minh | Không bịa “đã ký”; quy trình chữ ký cần chốt riêng; P1, product/backend |
| Báo cáo Host không lọc theo Studio/phòng | StatsService, HostController::reportSeries | Các query scope theo host_id và thời gian, không đọc studio_id/room_id | UI ghi rõ tất cả Studio của Host; không gửi filter giả hoặc lọc doanh thu trên client; P2 nếu muốn mở rộng |
| Admin tài nguyên/audit/refund list không có tổng count; audit chưa có filter/result | AdminController::listResource/auditLogs; RefundExceptionService::list | Response items,page,limit; audit trả trường từ bảng, không có result riêng | UI phân trang trước/sau, không bịa total_pages/result; P2 nếu cần nâng cấp |
| Owner rooms list chưa trả thumbnail/images của mỗi phòng | HostController::rooms/room | List SELECT r.*; detail mới tải room_images | Danh sách dùng placeholder trung thực; mở “Ảnh phòng” lấy detail để xem ảnh; P2 nếu backend muốn thêm thumbnail vào list |
| Gửi mã email phụ thuộc PHP mail production | AccountService::requestEmailChange | APP_ENV dev/test trả development_code; production mail() lỗi thì 503 | Cấu hình mail và kiểm tra giao nhận thật trước dùng production; P1, vận hành/backend |

## D — Môi trường kiểm thử — đang chặn nghiệm thu thật

| Mức độ | Bằng chứng thực tế | API ảnh hưởng | Bước tiếp theo / chủ trì |
|---|---|---|---|
| P0 nghiệm thu | GET localhost:8000/api/health và /api/rooms: ECONNREFUSED; không có HTTP status | Toàn bộ 80 thao tác | Cung cấp/chạy môi trường PHP test riêng rồi thực hiện HTTP và persistence; vận hành/backend |
| P1 | PHP/MySQL không có trên PATH; Docker daemon pipe không tồn tại | PHP tests, truy vấn schema, migration readiness | Chuẩn bị runtime test; không tự bật stack có bootstrap/cron ghi dữ liệu thật |
| P1 | Không có kết nối DB test hoặc tài khoản test đã được xác minh runtime | Mutation, ownership, role, concurrency, persistence | Tạo DB test độc lập; cấu hình credentials qua env, không đưa bí mật vào báo cáo |
| Đã khắc phục cho frontend tests | Sandbox gây uv_os_get_passwd ENOMEM trong tsx | npm test | Đã chạy npm test ngoài sandbox với auto-review cho phép; không cần sửa dependency hoặc runtime dự án |

Không có migration/seed/PHP source/database source/Helpdesk source nào được sửa. Không commit, push hoặc deploy.
