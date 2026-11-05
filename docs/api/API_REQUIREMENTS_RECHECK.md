<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Đối chiếu yêu cầu API sau pull/merge

Kiểm tra ngày 04/11/2026, commit `618fa2e`. GitHub main và local cùng commit tại thời điểm kiểm tra. Chỉ đọc router, controller/service, repository và migrations; không chạy migration, API ghi hoặc thay đổi database. Kết luận dưới đây là **khả năng theo source**, chưa xác nhận runtime với DB hiện tại.

## Kết luận

**Chưa đủ toàn bộ yêu cầu.** Backend tăng từ **37 lên 72 cặp method–route `/api/` dùng cho ứng dụng**, không tính `/health` alias và 3 route test. Có 35 thao tác mới; nhiều thao tác thuộc dịch vụ sản xuất, project/file và kho vật tư, không nằm trong danh sách 34 API đề xuất trước.

Không route nào trong C01–C34 được thêm đúng cặp method/path đã đề xuất. Tuy nhiên, một số **chức năng** đã được triển khai qua API dùng chung. Không nên yêu cầu viết trùng chỉ vì tên đường dẫn khác.

## API dùng chung mới cần thống nhất với frontend

| API thực tế | Chức năng theo source |
|---|---|
| `GET /api/catalog` | Projection danh mục công khai |
| `GET /api/workspace` | Dữ liệu quản lý theo tài khoản: studios, types, rooms, equipment, bookings, applications, audit... |
| `POST /api/commands` | Xử lý lệnh theo trường `type`, role/ownership phía server; bắt buộc `Idempotency-Key` |
| `POST /api/booking-quotes` | Kiểm tra/báo giá theo mô hình workspace |
| `GET /api/reports` | Tổng hợp tài chính và số đơn theo phòng/tuần/tháng cho Host/Admin |

`GET workspace` trả cả projection, không phải collection endpoint có pagination/filter/detail đầy đủ. `POST commands` không dùng DTO giống các REST endpoint cũ. Dữ liệu yêu cầu các bảng/cột từ migration integration; chưa xác nhận DB đang chạy đã áp dụng chúng.

## Đối chiếu đủ C01–C34 theo chức năng

“Có qua API chung” nghĩa là có xử lý trong source, chưa chứng minh chạy thành công. “Một phần” nghĩa là vẫn thiếu contract/dữ liệu hoặc khả năng yêu cầu. Các đường dẫn ở cột thứ hai vẫn là đề xuất, chưa có route riêng.

| Mã | API đề xuất trước | API/thao tác hiện có | Đánh giá và phần còn thiếu |
|---|---|---|---|
| C01 | `GET /api/host/rooms` | `GET /api/workspace`, `rooms` | Một phần: Host đọc được phòng thuộc mình kể cả inactive; chưa có filter/pagination theo hợp đồng đề xuất |
| C02 | `GET /api/host/rooms/{id}` | `GET /api/workspace`, tìm trong `rooms` | Một phần: có dữ liệu phòng; chưa có endpoint detail owner riêng và cùng DTO REST |
| C03 | `GET /api/host/equipments` | `GET /api/workspace`, `equipment` | Một phần: có inventory inactive; chưa có filter/pagination owner. Projection còn có thiết bị công khai ngoài cơ sở Host, frontend không được coi cả mảng là tài sản của mình |
| C04 | `GET /api/host/rooms/{id}/rates` | REST hiện chỉ trả active; workspace có pricing config | Chưa đủ: pricing config/type khác các record `room_rates`; chưa có danh sách `rate_id` inactive/history để quản lý |
| C05 | `GET /api/host/calendar` | Workspace `bookings`/`availability` và lịch REST từng phòng | Một phần: có dữ liệu để dựng lịch; chưa có query khoảng ngày/nhiều phòng và DTO lịch riêng |
| C06 | `GET /api/host/overview` | Workspace `report`, `GET /api/reports`, statistics cũ | Một phần: có số liệu tổng hợp; chưa đủ contract overview và phạm vi thời gian yêu cầu |
| C07 | `GET /api/host/policies` | Workspace `studios[].policy` | Một phần: policy đã lưu có trong config; khi chưa lưu source trả giá trị mặc định cho editor, chưa có dấu phân biệt cấu hình authoritative rõ ràng |
| C08 | `PATCH /api/host/policies` | `POST /api/commands`, `type=policy` | Có qua API chung: kiểm tra Host/owner, validate và lưu policy |
| C09 | `POST /api/studios/{id}/cover` | Không có upload tương ứng | Chưa có |
| C10 | `POST /api/equipments/{id}/images` | `equipment_save` nhận URL ảnh | Chưa có upload; lưu URL không tương đương tải file |
| C11 | `POST /api/host-applications` | `POST /api/commands`, `type=application` | Có qua API chung: Customer gửi thông tin ứng tuyển cơ bản |
| C12 | `GET /api/admin/host-applications` | Workspace `applications` cho Admin | Một phần: có danh sách, chưa filter/pagination riêng |
| C13 | `GET /api/admin/host-applications/{id}` | Record trong workspace `applications` | Một phần: có nội dung hồ sơ cơ bản, chưa detail endpoint riêng |
| C14 | `PATCH /api/admin/host-applications/{id}/decision` | `POST /api/commands`, `type=review_application` | Có qua API chung: duyệt/từ chối, lý do; khi duyệt gán Host và tạo Studio |
| C15 | `GET /api/admin/studios` | Workspace `studios` cho Admin | Một phần: có cả inactive, chưa filter/pagination theo đề xuất |
| C16 | `GET /api/admin/rooms` | Workspace `rooms` cho Admin | Một phần: có cả inactive, chưa filter/pagination theo đề xuất |
| C17 | `GET /api/admin/equipments` | Workspace `equipment` cho Admin | Một phần: có cả inactive, chưa filter/pagination theo đề xuất |
| C18 | `PATCH /api/admin/studios/{id}` | `POST /api/commands`, `type=studio_status` | Một phần: Admin đổi active có lý do; không phải sửa toàn bộ thông tin Studio |
| C19 | `PATCH /api/admin/rooms/{id}` | `POST /api/commands`, `type=room_status` | Một phần: Admin đổi active có lý do; không phải sửa toàn bộ phòng |
| C20 | `PATCH /api/admin/equipments/{id}` | Equipment REST và `equipment_save` kiểm tra Host owner | Chưa có thao tác quản lý thiết bị dành riêng cho Admin |
| C21 | `GET /api/admin/roles` | REST gán role đã có, không có danh mục quyền | Chưa có; gán role không thay thế API danh mục vai trò/quyền |
| C22 | `GET /api/admin/refund-exceptions` | Workspace `bookings[].refund`/`refundHistory` | Một phần: có dữ liệu lỗi/escalated, chưa collection exception có filter/pagination |
| C23 | `GET /api/admin/refund-exceptions/{id}` | Refund nằm trong booking projection | Một phần: chưa record/detail exception độc lập theo đề xuất |
| C24 | `POST /api/admin/refund-exceptions/{id}/actions` | `POST /api/commands`, `type=resolve_refund` | Một phần: xử lý mô phỏng dev/test khi PAYMENT_ADAPTER=development; chưa tích hợp hoàn tiền thật |
| C25 | `GET /api/admin/audit-logs` | Workspace `audit` cho Admin | Một phần: tối đa 1000 bản ghi gần nhất, chưa tìm kiếm/filter/pagination API |
| C26 | `GET /api/admin/reports/series` | `GET /api/reports` theo quyền Admin | Một phần: có weeklyRooms/monthlyRooms và tổng tiền, chưa series/filter thời gian theo contract đề xuất |
| C27 | `GET /api/host/reports/series` | `GET /api/reports` theo quyền Host | Một phần: cùng giới hạn như C26, không phải route riêng |
| C28 | `GET /api/host/room-types` | Workspace `types` | Một phần: có model thật `room_types`, chưa query/filter/pagination và phạm vi collection riêng |
| C29 | `POST /api/host/room-types` | `POST /api/commands`, `type=type_save`, ID mới | Có qua API chung: tạo loại phòng thuộc Studio của Host |
| C30 | `PATCH /api/host/room-types/{id}` | `POST /api/commands`, `type=type_save`, ID có sẵn | Có qua API chung: sửa loại phòng, chặn chuyển Studio |
| C31 | `POST /api/auth/email-change-requests` | Không có | Chưa có |
| C32 | `POST /api/auth/email-change-confirmations` | Không có | Chưa có |
| C33 | `GET /api/account/notification-preferences` | Workspace có mảng notifications rỗng | Chưa có; mảng thông báo không phải cấu hình nhận thông báo |
| C34 | `PATCH /api/account/notification-preferences` | Không có | Chưa có |

## Yêu cầu bổ sung từ Customer Profile và hợp đồng Host

| Yêu cầu | Hiện trạng |
|---|---|
| Ngày sinh, địa chỉ cá nhân | Chưa có trong profile API, repository hoặc migration tương ứng |
| `POST /api/account/avatar` | Chưa có; PATCH profile chỉ nhận `avatar_url` |
| GET/POST `/api/account/identity-verification` | Chưa có; không được thu thập CCCD qua profile thường |
| GET/PATCH `/api/host/legal-profile` | Chưa có pháp nhân, tên pháp lý, thuế, đại diện, địa chỉ pháp lý |
| GET `/api/host/contracts` và `/{id}` | Chưa có record/status/hiệu lực/hết hạn/phê duyệt hợp đồng |
| POST `/api/host/contracts/{id}/document-access` | Chưa có truy cập tài liệu hợp đồng có quyền |
| DELETE `/api/equipments/{id}` | Chưa có; PATCH status=inactive đã có |
| DELETE `/api/rooms/{id}/rates/{rate_id}` | Chưa có; PATCH status=inactive đã có |

File của project mới là sản phẩm dự án sản xuất; không được coi API đó là API hợp đồng pháp lý Host. `types` mới cũng khác danh mục phân loại `space-types` cũ.

## Những nhóm mới ngoài danh sách cũ

- Gói dịch vụ Studio và đơn mua dịch vụ: xem gói, Host tạo/sửa, Customer tạo/list đơn, thanh toán/hủy đơn.
- Dự án sản xuất: tạo/list/detail, thành viên và quyền, track, revision, liên kết booking.
- File dự án: list/upload multipart hoặc raw/download/delete theo quyền.
- Kho vật tư tiêu hao: danh sách/thêm, nhập/xuất, reservation, consume/release.

Các nhóm này có route và controller/service tương ứng trong source. Không kiểm thử ghi để chứng minh chúng chạy thành công trên DB hiện tại.

## Việc cần thống nhất với backend

1. Chọn hợp đồng dùng chung hay triển khai các route REST riêng. Nếu chọn API chung, cập nhật danh sách yêu cầu bằng ánh xạ trên và bổ sung phần dữ liệu/filter còn thiếu; không viết trùng toàn bộ C01–C34.
2. Frontend mặc định hiện vẫn dùng REST/JWT. Có API trong backend chưa có nghĩa các màn hình Host/Admin hiện tại đã sử dụng workspace/commands. Không tự đổi mode trong lượt audit này.
3. Ưu tiên hoàn thiện inventory owner/bảng giá inactive; sau đó profile bổ sung, hồ sơ pháp lý/hợp đồng và upload ảnh. Xóa vĩnh viễn/CCCD/duyệt hợp đồng cần quyết định nghiệp vụ trước.
4. Backend cần xác nhận migrations đã được áp dụng và runtime tests trên DB phát triển riêng; audit source này không chứng minh DB đang chạy đã sẵn sàng.

Nguồn chính: `server/public/index.php`, `server/src/Controllers/WorkspaceController.php`, `server/src/Services/WorkspaceService.php`, `server/src/Modules/Auth/AuthService.php`, `server/src/Modules/Rooms/RoomRepository.php`, `server/src/Modules/Equipment/EquipmentRepository.php`, `server/database/migrations/001_integration.php` và các migrations sau đó.
