# Rà soát mức khớp Frontend – Backend

Ngày rà soát: 04/11/2026

## Phạm vi và kết luận

Rà trên mã frontend/backend trong snapshot gộp cục bộ `877f080` tại `/tmp/studiohub-pr2-fix`, cộng với `server/openapi.yaml`, `server/BUSINESS-LOGIC.md` và các tài liệu kế hoạch trong repo. Snapshot này chưa được đẩy lên GitHub do môi trường chưa có thông tin đăng nhập.

File `Đồ án Web.pdf` ở đường dẫn đã nhắc trước đó không có trong máy hiện tại. Vì vậy tài liệu này chưa thể xác nhận đầy đủ mức khớp với báo cáo đồ án gốc; các mục dưới đây đối chiếu theo hợp đồng API và tài liệu đang có trong repo.

**Kết luận:** phần đọc catalog công khai và tên trường trong request tạo booking khá gần backend. Luồng tổng thể chưa khớp để demo end-to-end: frontend đang dùng hai đường API, xác thực không được chuyển sang một trong hai đường, và booking tạo qua REST không dùng được lifecycle đang hiển thị trong workspace.

Danh sách đối chiếu từng API theo checklist yêu cầu mới nằm trong [PROJECT-API-COVERAGE-CHECKLIST.md](PROJECT-API-COVERAGE-CHECKLIST.md).

## Danh sách việc cần khớp và sửa

| Ưu tiên | Hạng mục | Hiện trạng / ảnh hưởng | Việc cần làm |
| --- | --- | --- | --- |
| P0 | Một đường xác thực cho toàn bộ API | Đăng nhập qua `/api/business` đặt JWT trong cookie `HttpOnly`. `apiRequest` gọi thẳng API và chỉ đọc JWT từ `sessionStorage`; các trang host và wizard đặt phòng dùng `apiRequest`. Request được bảo vệ có thể nhận 401 dù đã đăng nhập. Proxy hiện cũng chưa cho phép các route REST đó. | Chuyển các request REST qua Next proxy; proxy đọc cookie và gắn Bearer token. Mở allowlist theo endpoint cần dùng, giới hạn method/body, hỗ trợ multipart riêng cho upload ảnh. Không đưa JWT vào `NEXT_PUBLIC_*` hoặc JavaScript storage. |
| P0 | Chọn một nguồn dữ liệu và lifecycle cho booking | Wizard gọi `POST /api/bookings` của `BookingService`. Danh sách booking và thao tác trong dashboard lại dùng `/api/workspace` + `/api/commands` của `WorkspaceService`. Booking REST không lưu `integration_snapshot`; workspace coi nó là `legacy` và từ chối mutation. Dashboard còn hiểu `pending` là “chờ Host duyệt”, trong khi REST booking tạo `pending` trước khi cọc. | Chọn REST modules hoặc Workspace commands làm nguồn chính. Khuyến nghị: dùng REST cho tạo/đọc/hủy/thanh toán/Host xác nhận; nối lịch sử và dashboard vào các endpoint đó. Nếu giữ Workspace làm nguồn chính thì không được tạo booking bằng service REST riêng, hoặc phải thiết kế migration/snapshot và lifecycle tương thích trước. |
| P0 | Trạng thái và bước thanh toán | Wizard báo “Chờ thanh toán cọc”, hiện hạn 15 phút và thông tin tài khoản ngân hàng tĩnh; frontend không gọi `POST /api/bookings/{id}/payments`. Backend có sandbox payment riêng. Đơn vì vậy vẫn chưa được ghi nhận thanh toán và sẽ hết hạn theo cron. | Với demo, ghi rõ “mô phỏng, không chuyển tiền thật” và có nút gọi sandbox payment endpoint để trạng thái đổi trên DB; hoặc bỏ hướng dẫn chuyển khoản tĩnh và ghi “chưa hỗ trợ thanh toán”. Không dùng tài khoản mẫu như chỉ dẫn giao dịch thật. |
| P1 | Hợp đồng trạng thái booking | Frontend model có `awaiting_payment`, `pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `expired`, `no_show`. Module Booking API khởi tạo `pending`; Workspace flow dùng `awaiting_payment` rồi mới `pending`. Hai màn hình có thể gắn cùng nhãn cho hai giai đoạn nghiệp vụ khác nhau. | Chốt state machine chung, mapping DB/API/TypeScript, điều kiện chuyển trạng thái và nhãn giao diện. Thêm acceptance cases cho tạo → cọc → chờ Host → xác nhận → hoàn tất/hủy/hết hạn. |
| P1 | Một công thức giá/chính sách | Demo domain có `hourly/session/combo3/5/10`, giờ hoạt động, phụ thu, crew, refund tiers và chính sách studio. REST booking tính qua `rate_id`, các rate unit của backend và cọc cấu hình; các tuỳ chỉnh phong phú chưa được biểu diễn đầy đủ trong REST contract. Workspace quote lại có engine/policy riêng. | Đối chiếu từng quy tắc với đồ án; chọn đúng một calculator server-side. Frontend chỉ gửi lựa chọn/ID, hiển thị lại quote server trả về. Không để tổng tiền, cọc, giờ hoạt động, buffer hay hoàn tiền được tính độc lập ở nhiều engine. |
| P1 | Lịch sử và thao tác booking ở customer/host | Backend có `GET /api/bookings`, `GET /api/bookings/{id}`, cancel, payments và Host status endpoints; client dashboard hiện đọc state qua workspace. Tài liệu `client/docs/BACKEND-INTEGRATION.md` lại ghi nhiều endpoint trong số này chưa có. | Nối các màn lịch sử, chi tiết, hủy và Host duyệt vào cùng API nguồn booking đã chọn; hoặc ghi rõ đây là demo workspace. Cập nhật tài liệu sau khi chốt. |
| P1 | Giới hạn chức năng backend chưa có UI | Backend có service packages, service orders, projects/files/members, consumables/reservations. Chưa thấy trang frontend tương ứng trong luồng sử dụng hiện tại. | Đối chiếu phạm vi đồ án: nếu bắt buộc, thêm màn hình và API client; nếu ngoài phạm vi, ghi “API backend chưa được frontend sử dụng” và không tính là chức năng đã tích hợp. |
| P2 | Cấu hình chạy ngoài Docker | `client/.env.example` đặt `NEXT_PUBLIC_APP_MODE=connected` nhưng không đặt `NEXT_PUBLIC_API_URL`. `backendEnabled` dựa vào biến sau, nên app store gọi backend qua workspace trong khi các trang phụ thuộc `backendEnabled` có thể rẽ sang component demo; hai khu vực sẽ chạy ở mode khác nhau. Compose khai báo `NEXT_PUBLIC_API_URL`, nên cách chạy ngoài Docker khác. | Thống nhất env cho Docker và local; thêm `NEXT_PUBLIC_API_URL` vào ví dụ hoặc chuyển hết qua proxy server-side để client không cần biết API origin. Bổ sung hướng dẫn khởi động và kiểm tra health. |
| P2 | Tài liệu API/đồ án là một nguồn duy nhất | `client/docs/BACKEND-INTEGRATION.md` còn nội dung cũ và có phần Data & Contract Harmonization bị lặp. Repo hiện có `server/openapi.yaml`, nhưng file đặc tả API gốc được kế hoạch backend tham chiếu chưa có trong `docs/`. | Cập nhật tài liệu tích hợp theo route thật; xóa phần lặp; liên kết yêu cầu đồ án → endpoint → màn frontend → test. Đính kèm/khôi phục PDF hoặc trích yêu cầu liên quan để kiểm tra chính thức. |

## Phần đã khớp ở mức code review

- `GET /api/rooms`, chi tiết phòng, calendar và rates đều được khai báo trong backend; frontend đọc catalog bằng các route tương ứng.
- Payload availability/booking gửi `room_id`, `rate_id`, `start_time`, `end_time`, `party_size`, `equipments`; backend availability nhận cùng tên trường.
- Request/response API đang dùng envelope `status`, `code`, `message`, `data`; client có xử lý envelope này.
- Định danh phòng từ catalog backend là số; trang catalog backend dùng numeric `room_id` thay vì slug demo.

Đây là đối chiếu tĩnh; chưa chạy luồng trình duyệt hoặc xác nhận tất cả dữ liệu seed trả đúng kiểu tại runtime.

## Thứ tự triển khai đề xuất

1. Chốt nguồn booking và state machine chung.
2. Dùng một cơ chế auth/proxy cho mọi endpoint được bảo vệ.
3. Nối payment sandbox đúng ngữ nghĩa; bỏ thông tin chuyển khoản giả hoặc gắn nhãn mô phỏng rõ ràng.
4. Đồng bộ giá, cọc, buffer, giờ hoạt động, hủy/hoàn và trạng thái giữa API, UI và tài liệu đồ án.
5. Bổ sung cấu hình local, cập nhật tài liệu và ma trận truy vết.
6. Sau khi sửa, kiểm tra bằng kịch bản end-to-end trên MySQL test: đăng nhập, tìm phòng, quote, tạo booking, thanh toán sandbox, Host xác nhận, customer xem/hủy, hết hạn; đồng thời kiểm tra quyền customer/host/admin và upload ảnh.

## Quyết định nghiệp vụ cần chốt từ đồ án

- Booking chuẩn dùng state machine của REST module hay workspace command.
- Gói combo, phụ thu theo giờ, crew và refund tiers có nằm trong yêu cầu chính thức không.
- UI được phép hiển thị thanh toán sandbox như thế nào khi chưa có cổng thanh toán.
- Hủy/hoàn, thời hạn Host phản hồi, giờ mở cửa/ngày nghỉ và xử lý đơn đang hoạt động khi phòng/Studio ngừng hoạt động.
- Các module projects, service packages và consumables có thuộc phạm vi frontend đồ án hay chỉ là phần mở rộng backend.
