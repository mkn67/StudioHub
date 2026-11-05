<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Kiểm toán API Host và Admin — StudioHub

## Phạm vi và bằng chứng

Kiểm toán ngày 04/11/2026, chỉ đọc backend. Không sửa PHP, cấu hình backend, schema, migration, seed hoặc bản ghi nghiệp vụ. Nguồn chính là `server/public/index.php`, các controller/service/repository bên dưới và frontend đang kết nối. Không suy luận endpoint tồn tại từ giao diện demo hoặc từ tên bảng.

Kiểm kê máy đọc được và kết quả HTTP: [API_RUNTIME_EVIDENCE.json](API_RUNTIME_EVIDENCE.json). Tái chạy bằng `node client/scripts/management-api-audit.mjs` từ gốc repo. Script chỉ GET và gọi login/logout đã được xác minh trong mã nguồn không ghi DB. Không gửi PATCH hồ sơ/quyền, không tạo tài nguyên, không gọi chi tiết đơn pending có thể hết hạn khi đọc.

**Số liệu kiểm kê:** 41 cặp HTTP method–route được khai báo trong router chính; gồm 37 route `/api/` cho ứng dụng, một alias `/health` và ba probe `/api/test/*` chỉ dành dev/test. Không tính Helpdesk độc lập vào các số này. Đã chạy 32 kiểm tra HTTP, cả 32 đúng trạng thái mong đợi, bao phủ 17 thao tác API khác nhau trả 200; 401/403 đúng kỳ vọng là kiểm tra phân quyền đạt, không phải lỗi kiểm toán. 20 thao tác ứng dụng còn lại chỉ được kiểm chứng mã nguồn, chưa thực thi trong task này.

Trong 17 thao tác chạy được có 7 API đọc vẫn thiếu dữ liệu/phạm vi cho quản trị đầy đủ: rooms list/detail/rates/calendar, equipments list, host statistics, admin statistics. HTTP 200 không đồng nghĩa tính năng quản trị hoàn chỉnh. Có 34 cặp method–route **đề xuất** trong tài liệu hợp đồng; không coi chúng là endpoint hiện có hoặc tất cả đã được duyệt để phát triển.

## Ý nghĩa trạng thái

| Trạng thái | Cách sử dụng |
|---|---|
| `CONNECTED_VERIFIED` | Frontend đã kết nối và thao tác đọc/đăng nhập/đăng xuất cụ thể được kiểm tra HTTP trong task này. |
| `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Đã đọc route và triển khai, nhưng không thực thi; đặc biệt mọi mutation dữ liệu bị loại khỏi kiểm thử. |
| `FRONTEND_NOT_CONNECTED` | Backend có khả năng tương ứng nhưng frontend thiếu hoặc từng gọi/điều hướng sai; ghi rõ đã sửa hay còn tồn tại. |
| `PARTIAL_API` | Có API, nhưng thiếu phạm vi, trường hoặc bộ lọc cần cho toàn bộ trải nghiệm mong muốn. |
| `MISSING_API` | Không tìm thấy route/chức năng tương ứng sau khi kiểm tra router và implementation. |
| `BUSINESS_RULE_UNCLEAR` | Cần quyết định nghiệp vụ hoặc mô hình dữ liệu trước khi chốt hợp đồng. |
| `RUNTIME_BLOCKED` | Không thể tiếp cận runtime cần thiết; không dùng để mô tả mutation chủ động không chạy. |

Runtime PHP/MySQL đang truy cập được; không có mục nào bị gán `RUNTIME_BLOCKED` chỉ vì chưa chạy mutation. P0: nguy cơ bảo mật/toàn vẹn dữ liệu; P1: chặn luồng cốt lõi; P2: thiếu năng lực quản lý đáng kể; P3: cải tiến phụ. Không tự coi mọi chức năng thiếu là P0.

## Ma trận Host

| Module | Screen | Function | Current API | Status | Missing Requirement | Priority |
|---|---|---|---|---|---|---|
| H01 Hồ sơ | `/host/settings` | Đọc tài khoản | GET `/api/auth/profile` | `CONNECTED_VERIFIED` | Không thiếu cho tên/email/điện thoại/vai trò/trạng thái; chỉ hiển thị trường có thật. | P2 |
| H02 Hồ sơ | `/host/settings` | Sửa tên/điện thoại | PATCH `/api/auth/profile` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | UI đã nối endpoint cũ; chưa kiểm tra lưu thành công vì không được sửa DB. Email không nằm trong hợp đồng cập nhật. | P2 |
| H03 Studio | `/host/studios` | Danh sách của Host | GET `/api/studios/mine` | `CONNECTED_VERIFIED` | Trả Studio, thông tin liên hệ, `total_rooms`, `total_equipments`; count loại inactive, không phải count công khai/active. | P2 |
| H04 Studio | `/host/studios` | Chi tiết | Dữ liệu từ GET mine; không có GET `/api/studios/{id}` | `PARTIAL_API` | Sửa hiện dùng dữ liệu mine, đủ trường đang có; chưa có owner detail riêng hoặc ảnh bìa. Không bắt buộc tạo endpoint trùng nếu mine tiếp tục đủ dữ liệu. | P3 |
| H05 Studio | Modal Studio | Tạo/sửa/ẩn | POST `/api/studios`; PATCH `/api/studios/{id}` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Có route Host và OwnershipGuard; `description` backend hỗ trợ nhưng form hiện chưa dùng. Không thử mutation. | P2 |
| H06 Room Type | `/host/rooms` | Quản lý loại phòng | Chỉ GET `/api/space-types` | `BUSINESS_RULE_UNCLEAR` | Space type là phân loại toàn cục; chưa có Room Type do Host quản lý và quan hệ template–physical unit. Không coi demo `types` là API thật. | P1 |
| H07 Phòng | `/host/rooms` | Danh sách/chi tiết vật lý | GET `/api/rooms`; GET `/api/rooms/{id}` | `PARTIAL_API` | Chỉ active room trong active Studio. Frontend phân trang toàn catalog rồi lọc Studio tại client; count/page không phải tồn kho owner. C01–C02. | P1 |
| H08 Phòng | Modal phòng | Tạo/sửa/status | POST `/api/rooms`; PATCH `/api/rooms/{id}` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | OwnershipGuard có thật; khi ẩn/bảo trì, public detail không đọc lại được. Cần owner read, không cần phát minh mutation thứ hai. | P1 |
| H09 Ảnh phòng | Modal ảnh | Upload | POST `/api/rooms/{id}/images` multipart | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Có UploadService và guard; chưa có route delete/reorder/đổi ảnh chính riêng. Chưa chốt nhu cầu mở rộng nên không tạo nút giả. | P2 |
| H10 Thiết bị | `/host/equipments` | Danh sách | GET `/api/equipments?studio_id` | `PARTIAL_API` | Chỉ active; total_quantity không phải tồn kho trống theo lịch. C03. | P1 |
| H11 Nhóm thiết bị | Modal nhóm | Đọc/tạo | GET/POST `/api/equipment-categories` | `CONNECTED_VERIFIED` / `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | GET owner-scoped đã kiểm tra; POST chỉ đọc mã nguồn. Không có update/delete nhóm. | P2 |
| H12 Thiết bị | Modal thiết bị | Tạo/sửa/status | POST `/api/equipments`; PATCH `/api/equipments/{id}` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Kiểm tra tồn kho tương lai nằm ở repository, không thay đổi trong task. Cần review quan hệ category ở mục S01. | P0 |
| H13 Media thiết bị | Modal thiết bị | Ảnh/metadata | `image_url`, brand, description đã có trong POST/PATCH | `FRONTEND_NOT_CONNECTED` | Form chưa nhập các trường này; đây không phải API metadata bị thiếu. Upload file thiết bị riêng chưa có: C10. | P3 |
| H14 Media Studio | `/host/studios` | Ảnh bìa | Không có route, schema studios chưa có cover field | `MISSING_API` | Quyết định lưu trữ/media lifecycle trước C09; placeholder không phải ảnh đã tải. | P3 |
| H15 Giá | `/host/rates` | Đọc bảng giá | GET `/api/rooms/{id}/rates` | `PARTIAL_API` | Chỉ active/effective, phụ thuộc phòng active. Thiếu toàn bộ lịch sử, giá tương lai/ẩn. C04. | P1 |
| H16 Giá | Modal giá | Tạo/sửa | POST `/api/rooms/{id}/rates`; PATCH `/api/rooms/{id}/rates/{rate_id}` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Scope physical room, duration/min/max/effective do backend quyết định. Không tự có type default/override/featured package. | P1 |
| H17 Lịch | `/host/calendar` | Khoảng bận | GET `/api/rooms/{id}/calendar` | `PARTIAL_API` | Có busy_start/end, gồm dọn phòng; `to` inclusive, tối đa 62 ngày. Thiếu booking ID/status/customer và buffer tách riêng. C05. | P1 |
| H18 Đơn | `/host/bookings` | Danh sách | GET `/api/bookings?page&limit&status` | `CONNECTED_VERIFIED` | Server lọc theo host_id; chưa hỗ trợ date/Studio/room/search/sort. Không gửi bộ lọc giả. | P2 |
| H19 Đơn | `/host/bookings/{id}` | Chi tiết | GET `/api/bookings/{id}` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Nguồn có owner checks; đọc pending có expire-on-access nên không chạy để giữ DB bất biến. | P1 |
| H20 Đơn | Chi tiết | Duyệt/chuyển trạng thái | PATCH `/api/bookings/{id}/status` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Confirm cần payment, completed cần trả đủ. Không sửa transition hay giả định pending luôn duyệt được. | P1 |
| H21 Tổng quan | `/host` | Tổng trạng thái và hôm nay | GET bookings theo status và 50 đơn mới nhất | `PARTIAL_API` | Tổng trạng thái dùng total_items, lịch hôm nay chỉ là subset đã ghi nhãn. C06 cho summary/today đầy đủ. | P2 |
| H22 Báo cáo | `/host/reports` | Tổng hợp | GET `/api/host/statistics?from&to` | `PARTIAL_API` | Có aggregate bookings/completed revenue/occupancy/current resources; không có series/cash/refund/receivable. C27. | P2 |
| H23 Chính sách | `/host/policies` | Đọc/cập nhật | Không có route | `BUSINESS_RULE_UNCLEAR` | Phân định platform/Host, snapshot và effective date trước C07–C08. `/host/settings` nay là cài đặt tài khoản. | P1 |

## Ma trận Admin

| Module | Screen | Function | Current API | Status | Missing Requirement | Priority |
|---|---|---|---|---|---|---|
| A01 Hồ sơ | `/admin/settings` | GET/PATCH hồ sơ | `/api/auth/profile` | `CONNECTED_VERIFIED` / `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Dùng cùng hợp đồng self-profile, không cho form sửa role/status/email. PATCH không chạy ghi thật. | P2 |
| A02 Tài khoản | `/admin/users` | List/search/role/status/page | GET `/api/admin/users` | `CONNECTED_VERIFIED` | search so khớp name/email/phone; role, status đã có backend. UI cũ bỏ status, task này đã nối. Không có sort tùy chọn. | P2 |
| A03 Tài khoản | `/admin/users` | Khóa/mở khóa | PATCH `/api/admin/users/{id}/status` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Server cấm self-lock; UI có xác nhận và hậu quả. Không thực thi khóa tài khoản. | P1 |
| A04 Phân quyền | `/admin/roles` | Gán Host/customer | PATCH `/api/admin/users/{id}/role` | `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Có thật, không cho self-change và không nhận role admin mới. Đã tách khỏi màn hình trạng thái tài khoản; không đổi vai trò thật khi kiểm thử. | P1 |
| A05 Phân quyền | `/admin/roles` | Danh mục role/permission | Không có GET role/permission catalog | `MISSING_API` | roles table tồn tại, RoleMiddleware dùng allowlist; chưa có permission matrix/CRUD. C21 chỉ đề xuất đọc, không tự tạo RBAC mới. | P2 |
| A06 Đối tác | `/admin/host-requests` | List/detail/approve/reject | Không có route | `MISSING_API` | C11–C14; schema chính chưa có bảng hồ sơ ứng tuyển. Đổi role trực tiếp không thay thế quy trình xét duyệt. | P1 |
| A07 Đối tác | Luồng đăng ký Host | Intake/decision rules | Chỉ có customer registration | `BUSINESS_RULE_UNCLEAR` | Chốt người nộp, chứng từ, trạng thái, tái nộp và tác động khi duyệt; không giả định cấu trúc demo là schema thật. | P1 |
| A08 Studio/phòng | `/admin/studios` | Toàn bộ tồn kho quản trị | GET public rooms chỉ là tham khảo | `PARTIAL_API` | Đã nối danh mục công khai read-only, ghi rõ phạm vi. C15–C16 cho inventory đầy đủ. | P1 |
| A09 Studio/phòng | `/admin/studios` | Admin sửa/ẩn | Existing write chỉ RoleMiddleware host | `MISSING_API` | Không được nới quyền route Host bằng frontend. C18–C19, phụ thuộc phạm vi can thiệp của Admin. | P2 |
| A10 Thiết bị | `/admin/equipments` | Global read/update | Public GET cần studio_id; host-only writes | `PARTIAL_API` | Không có global owner inventory/Admin write. C17/C20; không coi public catalog là quản lý toàn hệ thống. | P1 |
| A11 Giám sát đơn | `/admin/bookings` | List all/detail | GET `/api/bookings`; GET `/api/bookings/{id}` | `CONNECTED_VERIFIED` / `IMPLEMENTED_NOT_RUNTIME_VERIFIED` | Admin list đã kiểm tra. Detail không chạy vì expire-on-access; task đã sửa base link sang `/admin/bookings/{id}` và giữ view Admin chỉ đọc. | P2 |
| A12 Hoàn tiền | `/admin/refunds` | Exceptions/escalation/actions | Không có route | `MISSING_API` | C22–C24; payments chỉ deposit/remaining/full; một số refund requirement được ghi audit metadata, không phải tiền đã hoàn. | P1 |
| A13 Hoàn tiền | `/admin/refunds` | State machine/settlement | Không có refund model hoàn chỉnh | `BUSINESS_RULE_UNCLEAR` | Chốt nguồn số tiền, nhà cung cấp, retry/idempotency, reconciliation và escalation trước khi làm mutation. | P1 |
| A14 Nhật ký | `/admin/audit-logs` | List/filter/detail | Có bảng audit_logs, chưa có GET route | `MISSING_API` | C25 dùng dữ liệu có thật; không tuyên bố backend không ghi log. | P2 |
| A15 Báo cáo | `/admin/reports` | Aggregate | GET `/api/admin/statistics` | `PARTIAL_API` | Đã tách Overview/Reports; số khách active là current count, revenue theo completed_at. Không có trends/ledger. C26. | P2 |
| A16 Tổng quan | `/admin` | User/Host/Studio/room metrics | GET admin users + statistics | `CONNECTED_VERIFIED` | Dùng total_items/aggregate, không count page length. Queue đối tác/refund/recent activity chưa có API nên không gán 0. | P2 |

## Settings và các khả năng đã có nhưng chưa hiển thị

| Module | Screen | Function | Current API | Status | Missing Requirement | Priority |
|---|---|---|---|---|---|---|
| T01 Mật khẩu | Settings | Đổi mật khẩu | PATCH profile: current_password + new_password | `FRONTEND_NOT_CONNECTED` | Đã tồn tại trong AuthService::updateProfile, kiểm tra mật khẩu cũ và min 8. Task không thêm form bảo mật hoặc thử đổi mật khẩu; không đề xuất endpoint trùng. | P3 |
| T02 Avatar | Settings | Cập nhật URL | PATCH profile: avatar_url | `FRONTEND_NOT_CONNECTED` | Backend có URL field; chưa có file upload/avatar lifecycle. Không coi icon/initials là ảnh upload. | P3 |
| T03 Email | Settings | Thay email | Không có flow; PATCH profile bỏ qua email | `MISSING_API` | UI readonly. C31–C32 đề xuất yêu cầu/xác minh, chờ quyết định tái xác thực và unique email. | P3 |
| T04 Thông báo | Settings | Notification preferences | Không có route/provider contract | `MISSING_API` | C33–C34 chỉ là đề xuất; không có switch giả email/SMS. | P3 |
| T05 Giao diện | Settings | Compact/reduced motion | Browser storage, không cần API | `CONNECTED_VERIFIED` | Namespaced theo role/user, chỉ booleans, không credential; có keyboard/persistence test. Không hứa đồng bộ thiết bị. | P3 |
| T06 Gợi ý UI | Settings | Hiện/ẩn hints | Không có hệ thống hints tùy chọn nhất quán | `BUSINESS_RULE_UNCLEAR` | Không thêm switch vô tác dụng; không ẩn cảnh báo/phạm vi API/validation. | P3 |

## Các lỗi nối frontend đã sửa

1. Avatar Host dùng Link `/profile`, nên đi vào shell Customer. Nay AccountMenu dẫn `/{role}/settings`.
2. Admin header cũ do `Application` chỉ bỏ public header cho Host. Nay bỏ ở cấu trúc render cho cả hai role quản lý, không giấu bằng CSS.
3. `/admin/users` và `/admin/roles` cùng render AdminUsers không phân biệt. Nay chia mục đích và hành động status/role; không tạo ma trận permission giả.
4. `AdminService::listUsers` đã nhận status nhưng form cũ không gửi; nay đã nối status.
5. Admin booking list trước dùng component Customer với link `/my-bookings`, và detail không có view giám sát riêng. Nay dùng base path Admin và detail read-only; không cho Admin thao tác payment dành Customer hoặc transition dành Host.

## S01 — Nguy cơ ràng buộc nhóm thiết bị (P0, mã nguồn, chưa khai thác runtime)

`EquipmentController::update` kiểm tra quyền sở hữu **equipment**, nhưng không thấy kiểm tra ownership của `category_id` mới. `EquipmentRepository::update` cho phép cập nhật category_id; schema chỉ có FK tới category, không ràng buộc category cùng Studio. Đường create kiểm tra Host sở hữu cả Studio và category nhưng chưa thấy đối chiếu chúng thuộc cùng một Studio. Vì vậy có **nguy cơ** gắn thiết bị với nhóm sai Studio/khác chủ; đây là suy luận từ chuỗi mã nguồn, không phải kết quả thử ghi/khai thác.

Frontend edit hiện không gửi category_id, nhưng không thay thế được bảo vệ server. Đưa R01 vào backlog kiểm tra bảo mật/toàn vẹn dữ liệu, không sửa backend trong task này. Không cần endpoint mới: xem lại validation và guard của endpoint đang tồn tại. Các ownership guard cho Studio/room/rate/booking đã được đọc; test 403 runtime chỉ chứng minh những đường GET cụ thể trong JSON, không chứng minh mọi mutation chống IDOR.

## Giới hạn kiểm chứng và quyết định tiếp theo

- Không có mutation dữ liệu hoặc fake success response trong QA mới. PATCH profile của UI được chặn mạng để kiểm tra mapping và giữ bản nháp khi lỗi; đây **không** xác minh lưu thành công.
- Chi tiết đơn pending có tác dụng expire-on-access; chỉ đọc source, không gọi runtime. Không thực thi check-in/out, payment, refund hay đổi quyền.
- Login tạo JWT và logout hiện trả success stateless; logout không phải thu hồi JWT server-side. Yêu cầu token revocation nếu cần phải được quyết định riêng, không tự sửa mô hình xác thực.
- Ba bảng/khái niệm ứng tuyển Host, permission matrix và refund workflow không được giả định tồn tại vì demo có chúng. Schema chính có roles/users/studios/rooms/equipments/bookings/payments/audit_logs cùng bảng liên quan; mọi schema bổ sung phải được duyệt sau.
- Đọc `StatsService::resolvePeriod` xác nhận `[from,to)`; calendar dùng `to` inclusive. Không thay reporting boundary hoặc công thức occupancy, doanh thu, tồn kho.
- Danh sách hợp đồng chỉ là đề xuất trong [PROPOSED_API_CONTRACTS.md](PROPOSED_API_CONTRACTS.md); thứ tự thực hiện và tiêu chí nghiệm thu ở [API_IMPLEMENTATION_BACKLOG.md](API_IMPLEMENTATION_BACKLOG.md).

## Tham chiếu mã nguồn theo nhóm

| Nhóm | Frontend | Backend được đọc |
|---|---|---|
| Account/session | `features/workspace/workspace-settings.tsx`, `components/api-session.tsx`, `services/api/client.ts` | AuthController, AuthService::getProfile/updateProfile, UserRepository, AuthMiddleware, JwtService |
| Admin users | `features/admin/system-pages.tsx` | AdminController, AdminService::listUsers/updateUserStatus/updateUserRole, UserRepository::listUsers, RoleMiddleware |
| Studio/room | `features/host/host-resources.tsx`, AdminCatalog | StudioController/Repository, RoomController/Service/Repository, OwnershipGuard, UploadService |
| Equipment | `features/host/host-resources.tsx` | EquipmentController/Service/Repository, EquipmentCategoryController/Repository, OwnershipGuard |
| Booking/calendar | `features/host/host-calendar.tsx`, `host-activity.tsx`, `features/booking/backend-booking.tsx` | BookingController/Service/Repository, BookingStateMachine, RoomService::getRoomCalendar |
| Reports | `host-activity.tsx`, `admin-workspace.tsx` | AdminController/HostController, StatsService |
| DB/model | Không thay đổi | `server/database/schema.sql`, `server/database/seed.sql`, `server/public/index.php`, backend tests hiện có; không chạy test ghi DB |

## Kiểm kê runtime theo từng route ứng dụng

Bảng này chỉ thể hiện mức kiểm chứng thao tác HTTP; thiếu capability được ghi riêng trong ma trận phía trên. Không coi các route chưa chạy là thiếu hoặc runtime bị chặn.

| Method | Route chuẩn hóa | Mức kiểm chứng |
|---|---|---|
| GET | `/api/health` | CONNECTED_VERIFIED |
| POST | `/api/auth/register` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/auth/login` | CONNECTED_VERIFIED |
| POST | `/api/auth/logout` | CONNECTED_VERIFIED |
| GET | `/api/auth/profile` | CONNECTED_VERIFIED |
| PATCH | `/api/auth/profile` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| GET | `/api/rooms` | CONNECTED_VERIFIED |
| GET | `/api/rooms/{id}` | CONNECTED_VERIFIED |
| GET | `/api/rooms/{id}/calendar` | CONNECTED_VERIFIED |
| GET | `/api/rooms/{id}/rates` | CONNECTED_VERIFIED |
| GET | `/api/equipments` | CONNECTED_VERIFIED |
| GET | `/api/space-types` | CONNECTED_VERIFIED |
| GET | `/api/amenities` | CONNECTED_VERIFIED |
| GET | `/api/studios/mine` | CONNECTED_VERIFIED |
| POST | `/api/studios` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/studios/{id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| GET | `/api/equipment-categories` | CONNECTED_VERIFIED |
| POST | `/api/equipment-categories` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/rooms` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/rooms/{id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/rooms/{id}/rates` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/rooms/{id}/rates/{rate_id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/rooms/{id}/images` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/equipments` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/equipments/{id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/bookings/check-availability` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/bookings` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| GET | `/api/bookings` | CONNECTED_VERIFIED |
| GET | `/api/bookings/{id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/bookings/{id}/status` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/bookings/{id}/cancel` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| POST | `/api/bookings/{id}/payments` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| GET | `/api/admin/users` | CONNECTED_VERIFIED |
| PATCH | `/api/admin/users/{id}/status` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| PATCH | `/api/admin/users/{id}/role` | IMPLEMENTED_NOT_RUNTIME_VERIFIED |
| GET | `/api/admin/statistics` | CONNECTED_VERIFIED |
| GET | `/api/host/statistics` | CONNECTED_VERIFIED |
