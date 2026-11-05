<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](../api/FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Hồ sơ khách hàng: khả năng API và phần cần bổ sung

Ngày kiểm tra: 04/11/2026. Đây là kiểm tra chỉ đọc. Mọi hợp đồng ghi thêm bên dưới đều **là đề xuất, chưa triển khai**. Không sửa PHP, schema, migrations hoặc dữ liệu.

## Bằng chứng và hợp đồng hiện có

- `server/database/schema.sql`: bảng `users` có `full_name`, `email`, `phone`, `avatar_url`, `status`, dấu thời gian và khóa vai trò; không có ngày sinh, địa chỉ hoặc CCCD.
- `server/src/Modules/Auth/UserRepository.php`: truy vấn JOIN vai trò, danh sách cột được phép cập nhật.
- `server/src/Modules/Auth/AuthService.php`: `getProfile` loại bỏ `password_hash`; `updateProfile` chấp nhận tên, điện thoại, URL avatar và đổi mật khẩu có kiểm tra mật khẩu hiện tại.
- `server/src/Modules/Auth/AuthController.php`, `server/public/index.php`: GET/PATCH `/api/auth/profile` được bảo vệ bởi AuthMiddleware.
- `server/src/Modules/Auth/AuthMiddleware.php`: xác minh JWT, lấy người dùng từ `sub`, tải lại vai trò/trạng thái từ DB; chặn người dùng bị khóa. Controller lấy ID từ người dùng đã xác thực, không nhận ID chủ hồ sơ từ body.
- `client/src/components/api-session.tsx`: tải GET profile khi khởi tạo và khi cửa sổ nhận focus; phiên/token giữ nguyên. `apiRequest` dùng `cache: no-store`.

GET `/api/auth/profile` trả envelope `{status,code,message,data}`. `data` có `user_id`, `role_id`, `role`, `full_name`, `email`, `phone`, `avatar_url`, `status`, `created_at`, `updated_at`. Một số ID từ PDO có thể là chuỗi số; frontend không dùng ID để phân quyền backend.

PATCH `/api/auth/profile` hiện hỗ trợ:

```json
{"full_name":"Tên khách hàng","phone":"0123456789"}
```

Trang này chỉ gửi hai khóa trên. API trả lại hồ sơ sau cập nhật; frontend lấy giá trị trả về làm mốc sạch và refresh session. Thông báo thành công chỉ được đặt sau khi PATCH trả thành công. Lỗi giữ nguyên bản nháp và cho phép thử lại. Không gửi `email`, ngày sinh, địa chỉ, vai trò hoặc dữ liệu định danh.

Không chạy PATCH thật trong QA vì yêu cầu cấm thay đổi records. Đường thành công đã kiểm tra qua mã nguồn, **chưa kiểm chứng lưu/đọc lại sau ghi trên DB**. GET thật, đăng nhập và đăng xuất không ghi DB theo mã nguồn đã đọc. Không dùng phản hồi thành công giả để thay cho kiểm chứng này.

## Ma trận trường

| Trường | Đọc API | Cập nhật API | Lưu DB | Frontend hiện tại |
|---|---|---|---|---|
| Họ tên | Có | Có, `full_name` 2–100 ký tự | Có | Giá trị thật, sửa/lưu bằng PATCH hiện có |
| Điện thoại | Có, nullable | Có, `phone` tối đa 20 ký tự, rỗng thành null | Có | `type=tel`, không ép số hoặc áp mẫu mới; giữ số 0, dấu + và khoảng trắng |
| Email | Có | Không | Có, unique, tối đa 150 | Chỉ đọc, mọi nhà cung cấp; không badge xác minh |
| Ngày sinh | Không | Không | Không | Input ngày bị vô hiệu hóa, nêu rõ chưa hỗ trợ; không lưu tạm |
| Địa chỉ | Không | Không | Không | Mục riêng với trạng thái chưa khả dụng, không tạo các ô tỉnh/huyện giả |
| CCCD/xác minh danh tính | Không | Không | Không | Mục riêng, không input, không thu thập, không badge xác minh |
| Avatar | Có `avatar_url` | Có URL tối đa 255, không có upload avatar | Có URL nullable | Chữ viết tắt từ tên thật; không nút upload giả, không tạo URL ảnh |

Vai trò hiển thị là “Khách hàng”. Chỉ hiển thị trạng thái “đang hoạt động” khi GET thực sự cung cấp `status=active`; dữ liệu login không có status thì không suy diễn. Không hiển thị trạng thái chưa xác định như một trạng thái xác minh.

## Ngày sinh — đề xuất DTO, chưa triển khai

- Bổ sung `date_of_birth: string | null` vào GET/PATCH profile và lưu kiểu DATE nullable sau khi duyệt migration.
- Dạng truyền `YYYY-MM-DD`; giao diện có thể định dạng `DD/MM/YYYY` độc lập. Input ngày hiện bị disabled, trình duyệt quyết định placeholder bản địa; không tuyên bố đã hỗ trợ nhập/lưu.
- Backend kiểm tra ngày lịch thật, năm nhuận, ngày không ở tương lai theo múi giờ sản phẩm đã thống nhất; không tự đặt tuổi tối thiểu.
- Frontend chỉ bật nhập sau khi backend được triển khai và kiểm chứng. Cần test ngày 29/02 hợp lệ/không hợp lệ, ngày tương lai, null và refresh.
- Cần quyết định mục đích sử dụng và tính tùy chọn. Không gửi ngày sinh vào URL/analytics; quyền đọc/sửa chỉ chủ tài khoản và các quyền được duyệt rõ ràng.

## Địa chỉ — đề xuất DTO, chưa triển khai

- Không có dữ liệu địa chỉ khách hàng hiện hữu. Địa chỉ studio thuộc tài nguyên khác, tuyệt đối không dùng làm địa chỉ khách hàng.
- Đề xuất ban đầu `contact_address: string | null` trong GET/PATCH profile; giới hạn độ dài phải được thống nhất, ví dụ tối đa 500 ký tự. Chưa có cột DB tương ứng.
- Không giả định schema chuẩn hóa tỉnh/huyện; nếu nghiệp vụ cần cấu trúc, phải duyệt DTO và chiến lược dữ liệu trước. Không hardcode đơn vị hành chính hoặc gọi dịch vụ ngoài.
- Trim, kiểm tra độ dài phía server, giữ Unicode, escape khi hiển thị; cho phép xóa thành null; không dùng làm bằng chứng địa chỉ đã xác minh.
- Cần quyết định mục đích liên hệ và người được truy cập; giới hạn lưu giữ/xóa dữ liệu, không ghi địa chỉ đầy đủ vào log.

## Email — API chưa cho đổi, không phải thiếu cột DB

- `updateProfile` bỏ qua email; không bật ô sửa vì không có luồng xác nhận email mới.
- Đề xuất riêng, đồng bộ với `docs/api/PROPOSED_API_CONTRACTS.md` C31/C32: POST `/api/auth/email-change-requests` và POST `/api/auth/email-change-confirmations`.
- Chủ phiên xác thực; xác thực lại khi cần, kiểm tra định dạng không giới hạn Gmail, unique, xác nhận chủ email mới, token hết hạn/dùng một lần/rate limit. Không thay email ngay trong request đầu.
- Cần duyệt chính sách xác minh, gửi thư, chống chiếm tài khoản và hiệu lực phiên. Chưa triển khai, chưa có test runtime.

## CCCD — cần quyết định nghiệp vụ và thiết kế bảo mật trước

Hiện không tìm thấy trường, repository, route hoặc workflow xác minh danh tính trong backend. Không có căn cứ để bật thu thập CCCD. Đây không phải trường phụ có thể thêm vào PATCH profile.

Chỉ xem xét sau khi chủ sản phẩm duyệt mục đích, tính cần thiết, thông báo/cơ sở xử lý, phạm vi quyền truy cập, thời hạn lưu và cơ chế xóa. Báo cáo này không xác nhận tuân thủ pháp lý; chưa triển khai luồng pháp lý hay định danh.

Hợp đồng **đề xuất có điều kiện**, chưa được phê duyệt:

- GET `/api/account/identity-verification`: chỉ trạng thái thực do backend cung cấp, `masked_identifier`, thời điểm; không trả CCCD đầy đủ trong profile thường.
- POST `/api/account/identity-verification`: body tối thiểu sau khi thống nhất purpose và hợp đồng, chỉ chủ phiên được gửi. Chưa chốt DTO nhận số CCCD để tránh biến đề xuất thành cơ chế thu thập mặc định.
- Cần thẩm định validation server, xác thực lại, chống dò tìm/rate limit, TLS, mã hóa lưu trữ và quản lý khóa, masking, audit có biên tập dữ liệu, retention/xóa và mô hình quyền riêng. Không log số đầy đủ hoặc đưa vào URL, analytics, localStorage/sessionStorage.
- Lỗi phải phân biệt không có quyền, chưa được phép thu thập, dữ liệu không hợp lệ và dịch vụ chưa khả dụng mà không lộ danh tính khác. Không thêm OCR hoặc tải ảnh CCCD trong nhiệm vụ này.

## Avatar — hỗ trợ URL không đồng nghĩa hỗ trợ tải ảnh

- `avatar_url` có trong GET/PATCH và DB nhưng validation hiện chỉ giới hạn độ dài, chưa phải hợp đồng upload an toàn. Trang dùng initials là lựa chọn thực hiện trong scope, không tuyên bố không có trường avatar.
- Nếu cần tải ảnh: đề xuất POST `/api/account/avatar` nhận multipart, backend xác minh MIME/kích thước/nội dung, quyền sở hữu, tên file ngẫu nhiên, đường dẫn tin cậy và xóa ảnh cũ; DTO trả URL đã chuẩn hóa. Phải quyết định dung lượng, định dạng và retention trước.
- Không tái sử dụng endpoint upload ảnh phòng vì sai tài nguyên/quyền sở hữu. Không mở ô URL tự do chỉ để giả chức năng tải ảnh.

## Kiểm chứng và giới hạn

- Đọc GET profile thật bằng tài khoản seed khách hàng; kiểm tra render đúng tên/điện thoại/email, trạng thái khi có. Không ghi thông tin cá nhân/token vào báo cáo kiểm thử.
- Browser QA chặn PATCH trước khi gửi tới server; kiểm tra đúng whitelist hai khóa, pending, chống gửi trùng, lỗi mạng, giữ bản nháp và hủy thay đổi.
- Không kiểm chứng runtime đường ghi thành công, thay đổi email/avatar/mật khẩu hoặc CCCD; không thay đổi bản ghi để đáp ứng bài kiểm tra.
- PHP, Helpdesk, Host, Admin, Workspace dùng chung và xác thực được đối chiếu hash trước/sau. Các đề xuất trên dành cho giai đoạn backend sau, không phải API đã tồn tại.
