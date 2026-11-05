<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Hợp đồng API đề xuất — CHƯA TRIỂN KHAI

> Cập nhật sau merge `618fa2e`: các đường dẫn riêng dưới đây vẫn chưa có, nhưng một số chức năng đã có qua `/api/workspace`, `/api/commands` và `/api/reports`. Xem [đối chiếu sau pull](API_REQUIREMENTS_RECHECK.md) trước khi triển khai để tránh viết trùng. Nội dung còn lại là bản đề xuất/audit tại thời điểm trước merge.

Tài liệu này là đầu vào cho quyết định nghiệp vụ/backend sau kiểm toán. **Không endpoint nào dưới đây được thêm vào router trong task hiện tại.** Tên route, DTO, trạng thái và lỗi đều là đề xuất; không khẳng định bảng/cột tương ứng đã tồn tại. Mọi mục cần chủ sản phẩm và backend duyệt trước khi phát triển.

Nguồn bằng chứng và mức kiểm chứng: [API_GAP_AUDIT.md](API_GAP_AUDIT.md), [API_RUNTIME_EVIDENCE.json](API_RUNTIME_EVIDENCE.json). Không tạo route mới để thay thế khả năng đã có: cập nhật hồ sơ, đổi mật khẩu, gán Host/customer, cập nhật Studio/phòng/thiết bị/rate và upload ảnh phòng tiếp tục dùng hợp đồng hiện tại.

## Quy ước đề xuất chung

- Xác thực Bearer bằng AuthMiddleware; role kiểm tra phía server, không dựa vào nút ẩn hoặc role gửi từ client. Owner xác minh từ user hiện hành trong DB; không nhận host_id như bằng chứng quyền.
- Giữ envelope quen thuộc `status`, `code`, `message`, `data`; lỗi có `errors[{field,code,message}]`. Với collection mới, đề xuất `data.items` và `data.pagination{page,limit,total_items,total_pages}`. Không âm thầm sửa kiểu pagination của endpoint cũ.
- `page>=1`, `limit<=50`; sort dùng allowlist. ISO date/datetime và múi giờ Việt Nam phải được ghi rõ. Reporting `[from,to)` khác calendar inclusive date; không tự đổi quy ước hiện hữu.
- Lỗi chung đề xuất: 400 validation/filter không hợp lệ, 401 chưa đăng nhập, 403 sai role/owner, 404 không có tài nguyên, 409 xung đột trạng thái/idempotency. Các mã nghiệp vụ cụ thể chỉ chốt khi duyệt contract.
- Mutation ảnh/media phải xác minh MIME thực, giới hạn kích thước, tên lưu an toàn, quyền truy cập và vòng đời tệp. Không coi một URL là khả năng upload.
- Mọi can thiệp Admin vào tài nguyên/tài chính cần audit actor, lý do và kết quả; không ghi mật khẩu/token vào metadata. Không thay workflow Host bằng việc nới RoleMiddleware của route cũ.

## Danh mục 34 thao tác được đề xuất

Đây là **34 cặp method–route dự kiến**, không phải 34 API đã được duyệt hoặc 34 route đang có. Các mục có phụ thuộc mô hình/nghiệp vụ có thể bị gộp, đổi tên hoặc bỏ sau review.

| Mã | Method | Route ĐỀ XUẤT | Role | Ưu tiên | Nhóm hợp đồng |
|---|---|---|---|---|---|
| C01 | GET | `/api/host/rooms` | Host | P1 | H-Room |
| C02 | GET | `/api/host/rooms/{id}` | Host | P1 | H-Room |
| C03 | GET | `/api/host/equipments` | Host | P1 | H-Equipment |
| C04 | GET | `/api/host/rooms/{id}/rates` | Host | P1 | H-Rate |
| C05 | GET | `/api/host/calendar` | Host | P1 | H-Calendar |
| C06 | GET | `/api/host/overview` | Host | P2 | H-Overview |
| C07 | GET | `/api/host/policies` | Host | P1 | H-Policy |
| C08 | PATCH | `/api/host/policies` | Host | P1 | H-Policy |
| C09 | POST | `/api/studios/{id}/cover` | Host | P3 | H-Media |
| C10 | POST | `/api/equipments/{id}/images` | Host | P3 | H-Media |
| C11 | POST | `/api/host-applications` | Customer, chờ duyệt quy tắc | P1 | A-Partner |
| C12 | GET | `/api/admin/host-applications` | Admin | P1 | A-Partner |
| C13 | GET | `/api/admin/host-applications/{id}` | Admin | P1 | A-Partner |
| C14 | PATCH | `/api/admin/host-applications/{id}/decision` | Admin | P1 | A-Partner |
| C15 | GET | `/api/admin/studios` | Admin | P1 | A-Resources |
| C16 | GET | `/api/admin/rooms` | Admin | P1 | A-Resources |
| C17 | GET | `/api/admin/equipments` | Admin | P1 | A-Resources |
| C18 | PATCH | `/api/admin/studios/{id}` | Admin | P2 | A-Resource actions |
| C19 | PATCH | `/api/admin/rooms/{id}` | Admin | P2 | A-Resource actions |
| C20 | PATCH | `/api/admin/equipments/{id}` | Admin | P2 | A-Resource actions |
| C21 | GET | `/api/admin/roles` | Admin | P2 | A-Role catalog |
| C22 | GET | `/api/admin/refund-exceptions` | Admin | P1 | A-Refund |
| C23 | GET | `/api/admin/refund-exceptions/{id}` | Admin | P1 | A-Refund |
| C24 | POST | `/api/admin/refund-exceptions/{id}/actions` | Admin | P1 | A-Refund |
| C25 | GET | `/api/admin/audit-logs` | Admin | P2 | A-Audit |
| C26 | GET | `/api/admin/reports/series` | Admin | P2 | Reports |
| C27 | GET | `/api/host/reports/series` | Host | P2 | Reports |
| C28 | GET | `/api/host/room-types` | Host | P1 | H-Type, chờ mô hình |
| C29 | POST | `/api/host/room-types` | Host | P1 | H-Type, chờ mô hình |
| C30 | PATCH | `/api/host/room-types/{id}` | Host | P1 | H-Type, chờ mô hình |
| C31 | POST | `/api/auth/email-change-requests` | Tài khoản hiện hành | P3 | S-Email |
| C32 | POST | `/api/auth/email-change-confirmations` | Tài khoản hiện hành | P3 | S-Email |
| C33 | GET | `/api/account/notification-preferences` | Tài khoản hiện hành | P3 | S-Notification |
| C34 | PATCH | `/api/account/notification-preferences` | Tài khoản hiện hành | P3 | S-Notification |

## H-Room — C01, C02

**Hiện tại:** list/detail công khai chỉ active room của active Studio; mutation owner đã có. Pagination trước lọc Studio ở client có thể tạo trang trống. Bằng chứng: RoomService/RoomRepository và `client/src/features/host/host-resources.tsx`.

**Request:** C01 query `studio_id` bắt buộc thuộc Host; tùy chọn `status`, `keyword`, `space_type_id`, `page`, `limit`, `sort` allowlist. C02 nhận room ID và suy ra owner qua Studio. GET không body.

**Response:** collection/detail có `room_id`, `studio_id`, name, area, capacity, status, primary classification, images/thumbnail và các thuộc tính thật đang có. Pagination/count phải trong phạm vi owner/filter. Không dùng space_type như Room Type mới. Detail phải đọc được inactive/maintenance nếu owner được phép.

**Lỗi/phụ thuộc:** 403 wrong owner, 404 unknown ID, 400 invalid status/filter. Chốt cách ẩn Studio và khả năng xem tài nguyên inactive. Dùng rooms/studios/room_space_types/room_images hiện hữu; không cần tự thêm model type.

**Consumer:** `HostResourcesPage`, `RoomsList`, `RoomEditor`. **Nghiệm thu:** không lọc owner sau global pagination; mutation cũ tiếp tục dùng; GET không expire hoặc sửa dữ liệu.

## H-Equipment — C03

**Hiện tại:** public GET active-only; POST/PATCH có owner guard, metadata URL đã có. Không có toàn bộ inventory owner.

**Request:** Host, query `studio_id`, `status`, `category_id`, `search`, pagination; category phải thuộc cùng Studio. Không body.

**Response:** equipment_id, studio_id, category_id/name, name, brand, description, image_url, total_quantity, pricing_unit, unit_price, status và pagination. Không trả “available_quantity” nếu không có interval và tính toán authoritative.

**Lỗi/phụ thuộc:** 400 invalid category scope, 403 owner, 404 Studio; tách rõ total stock với stock theo booking. Review R01 trước khi mở edit category.

**Consumer:** `EquipmentList` trong host-resources. **Ưu tiên:** P1; không thay StockCalculator hoặc mutation tồn kho cũ.

## H-Rate — C04

**Hiện tại:** GET rates lọc active/effective và yêu cầu room active.

**Request:** room ID, `status`, `effective_from`, `effective_to`, tùy chọn include future/history và pagination nếu cần; owner từ room. Không body.

**Response:** toàn bộ rate thuộc scope cho phép: rate_id, room_id, rate_unit, unit_minutes, unit_price, minimum_units, maximum_units, status, effective_from/to. Không tự thêm discount/featured/type override chưa có model.

**Lỗi/phụ thuộc:** 403 owner, 404 room; 400 invalid dates/filter. Chốt việc sửa rate đã được booking snapshot và quy tắc overlap giá trong review riêng.

**Consumer:** `RoomRates`. POST/PATCH rates hiện hữu vẫn giữ hợp đồng, không tạo route ghi trùng.

## H-Calendar — C05

**Hiện tại:** public busy intervals gồm cleaning, không có identity/status hoặc phần cleaning riêng.

**Request:** `studio_id`, tùy chọn room_ids, from/to với timezone và inclusive/exclusive được chốt rõ; giữ giới hạn tối đa tương thích hoặc duyệt giới hạn mới. Owner xác minh mọi room.

**Response:** room identities và events có booking_id (nếu được phép), room_id, start_time/end_time, busy_start/busy_end, booking status và `cleaning_start/end` **chỉ khi backend có nguồn chính xác**. PII tối thiểu phục vụ Host; không chuyển public endpoint thành kênh lộ khách hàng.

**Lỗi/phụ thuộc:** 400 range, 403 any foreign room, 404 missing; cần định nghĩa event kinds, setup/cleaning ownership. Không tính buffer ở frontend.

**Consumer:** `HostCalendar`. **Ưu tiên:** P1. DTO mới, không khẳng định đang có các cột cleaning_start/end trong DB.

## H-Overview — C06

**Hiện tại:** status totals có qua GET bookings, today's preview chỉ latest 50; thiếu complete daily operational view.

**Request:** `date`, tùy chọn owned studio_id; không body. Host từ phiên, không nhận host_id tùy ý.

**Response:** date/timezone, authoritative status totals, today/upcoming items với room/reference/time, scope metadata và pagination nếu danh sách dài. Pending nên phân biệt unpaid hold và paid awaiting Host **sau khi chốt định nghĩa**, không tự áp deadline mới.

**Lỗi/phụ thuộc:** 400 date, 403 studio; định nghĩa KPI và ngày hoạt động phải được duyệt. Không tự có metric công nợ/thu tiền nếu thiếu ledger.

**Consumer:** `HostOverview`, P2.

## H-Policy — C07, C08

**Hiện tại:** không có policy GET/PATCH; demo store không phải dữ liệu backend.

**Request:** GET theo owned studio_id; PATCH chỉ các trường được chủ sản phẩm phê duyệt cùng version/effective boundary nếu cần. **Không đề xuất giá trị mặc định hay tỷ lệ cọc mới.**

**Response:** current allowed policy fields, ownership, editable/read-only metadata, version/effective time nếu model được duyệt.

**Lỗi/phụ thuộc:** 403 owner/platform-owned field, 400 validation, 409 concurrent version. Phải quyết định platform versus Host control, ảnh hưởng đơn cũ, policy snapshot, cancellation/reschedule/deposit rules và operating hours. Schema chưa có model policy độc lập được xác nhận.

**Consumer:** `/host/policies` hiện unavailable. P1, **business approval bắt buộc trước khi thiết kế schema**.

## H-Media — C09, C10

**Hiện tại:** ảnh phòng upload có route; equipment có image_url nhưng không file upload; Studio không có cover contract/cột được xác nhận.

**Request:** multipart image cho tài nguyên owner; xác minh resource và category scope. Không nhận đường dẫn filesystem từ client.

**Response:** canonical served image URL và identity/version cần cho lifecycle. Chốt một cover hay nhiều ảnh, thay ảnh cũ, cleanup và quyền truy cập trước khi chọn DTO.

**Lỗi/phụ thuộc:** 400 missing/invalid image, 403, 404; giới hạn dung lượng theo quyết định, không mặc định coi 5MB của room áp dụng cho mọi media. UploadService có thể tái sử dụng sau review, không cần dependency storage mới vô cớ.

**Consumer:** Host Studio/equipment editors, P3. Metadata `image_url` hiện có không cần thêm endpoint để nhập URL; đó là việc frontend riêng.

## A-Partner — C11 đến C14

**Hiện tại:** không có application route/model trong schema chính; `/api/admin/users/{id}/role` chỉ đổi role trực tiếp.

**Request:** C11 gửi thông tin ứng tuyển và đồng ý cần thiết **sau khi phê duyệt bộ trường**; C12 query status/search/date/page/limit; C13 application ID; C14 body decision và reason, version/idempotency nếu cần. Không nhận admin/host role mới trực tiếp từ payload ứng tuyển.

**Response:** application reference, applicant identity tối thiểu, submitted_at, actual workflow status, review decision/actor/time; list/detail không lộ chứng từ nhạy cảm quá mức. Trường này là DTO đề xuất, không khẳng định bảng `host_applications` đang tồn tại.

**Lỗi/phụ thuộc:** 400 invalid decision, 403 reviewer, 404 application, 409 duplicate/already decided. Chốt người được nộp, reapply, required evidence, retention/privacy, điều kiện approve và tác động role atomically. Không dùng approve như shortcut cấp admin.

**Consumer:** `/admin/host-requests`; luồng nộp public/customer cần được duyệt riêng. P1.

## A-Resources — C15 đến C17

**Hiện tại:** public catalog không bao gồm inactive/maintenance; mine là Host-only; chưa có Admin inventory.

**Request:** Admin. C15 filters host_id/status/search; C16 studio_id/host_id/status/space classification/search; C17 studio_id/host_id/category/status/search; page/limit/sort allowlist. GET không body.

**Response:** tài nguyên với primary IDs hiện có, Studio/Host relation, real status, media và count theo đúng scope. Room Type/physical unit phải phân biệt sau model review. Equipment quantity không tự trở thành availability.

**Lỗi/phụ thuộc:** 400 filter, 403, 404 related IDs. Chốt dữ liệu PII nào Admin cần xem và quyền xem tài nguyên đã ẩn. Dùng resources hiện hữu, không tạo bản sao inventory riêng.

**Consumer:** AdminCatalog tại `/admin/studios`, `/admin/equipments`. P1.

## A-Resource actions — C18 đến C20

**Hiện tại:** route ghi tài nguyên hiện hành chỉ cho Host, không được nới role từ frontend.

**Request:** Admin, resource ID, **allowlist trường quản trị được duyệt** và reason. Không cho tùy ý sửa owner, giá, quantity hoặc booking-related field chỉ vì là Admin.

**Response:** authoritative updated record và audit reference nếu có; không fake success nếu mutation không đổi dữ liệu.

**Lỗi/phụ thuộc:** 403 field/action denied, 404, 409 version/active booking conflict, 400 invalid reason. Cần quyết định suspend/hide versus edit, nghĩa vụ thông báo Host và ảnh hưởng booking hiện tại. Các bảo vệ inventory/pricing phải được giữ nguyên.

**Consumer:** Admin resource screens sau review. P2, chưa tạo nút ghi ở UI hiện tại.

## A-Role catalog — C21

**Hiện tại:** roles table và RoleMiddleware có thật; chưa có permission catalog. PATCH user role đã có và giữ nguyên.

**Request:** Admin GET, không body; chỉ read catalog của role hiện có.

**Response:** role identifier/name/description nếu có nguồn; capabilities/permissions chỉ thêm khi backend có mô hình authoritative được duyệt. Không tạo ma trận dựa vào suy diễn nhãn role.

**Lỗi/phụ thuộc:** 401/403; chủ sản phẩm quyết định có cần quyền granular hay chỉ fixed roles. Không đề xuất tạo role hoặc permission mới trong task này.

**Consumer:** `/admin/roles`, P2. Frontend hiện chỉ hiển thị roles và assignment thực tế từ users API.

## A-Refund — C22 đến C24

**Hiện tại:** không có refund exception API; payments chỉ deposit/remaining/full; một số yêu cầu hoàn ghi audit metadata. Không có chứng cứ tiền đã được chuyển hoàn.

**Request:** C22 filter status/booking/date/page; C23 exception ID; C24 action + reason + idempotency key + expected version, **enum action phải được duyệt**. Không cho UI tùy ý chọn số tiền ngoài quyết định authoritative.

**Response:** case reference, booking/payment references, amount/currency do backend tính, recorded versus settled state, attempt/history/escalation và allowed actions sau review.

**Lỗi/phụ thuộc:** 400 unsupported action, 403, 404, 409 already processed/conflict; failure provider/reconciliation phải có trạng thái rõ. Cần model refund, state machine, payment provider, retry policy, idempotency và separation of duties. Đây là thiết kế tương lai, không giả định có bảng refund.

**Consumer:** `/admin/refunds`, P1 sau phê duyệt tài chính/nghiệp vụ. Không phát triển mutation trước khi model và nguồn tiền được chốt.

## A-Audit — C25

**Hiện tại:** schema có `audit_logs(log_id,user_id,action,entity_type,entity_id,metadata,created_at)`, các service đã ghi một số hoạt động; không có route đọc.

**Request:** Admin GET; action/entity_type/entity_id/actor/from/to/page/limit, sort created_at allowlist.

**Response:** các trường log hiện hữu, actor display name nếu join được, metadata đã redaction; pagination. Không sửa/xóa log qua UI này.

**Lỗi/phụ thuộc:** 400 range/filter, 401/403. Chốt retention, PII visibility, timezone và index/performance; không trả nguyên metadata chứa dữ liệu nhạy cảm chỉ vì là Admin.

**Consumer:** `/admin/audit-logs`, P2. Không cần giả định thêm cột/bảng để bắt đầu read-only catalog sau review.

## Reports — C26, C27

**Hiện tại:** aggregate statistics đã tồn tại, không có time series hay đầy đủ cash ledger.

**Request:** from/to half-open, timezone, granularity allowlist; Host tùy chọn owned studio, Admin tùy chọn approved scope. Không body.

**Response:** metric definitions/scope, buckets với thời điểm, totals và các metric **được duyệt và có nguồn**. Không trộn tổng giá trị đơn hoàn tất với dòng tiền thu/cọc/hoàn. Room popularity hoặc receivable chỉ thêm khi định nghĩa, nguồn và quyền đã rõ.

**Lỗi/phụ thuộc:** 400 range/granularity, 403 scope; chốt revenue recognition, occupancy denominator, historical resource counts. Không đổi StatsService hiện hữu để hợp giao diện.

**Consumer:** HostReports dùng chung cho `/host/reports`, `/admin/reports`. P2.

## H-Type — C28 đến C30

**Hiện tại:** `space_types` là category, rooms là physical unit; chưa xác nhận model Host-owned Room Type như demo.

**Request đề xuất sau quyết định model:** C28 owned studio_id; C29 studio_id/name/description/classification được duyệt; C30 type ID với allowlist trường chỉnh sửa. Không tự nhận room IDs/price hierarchy trước khi chốt quan hệ.

**Response:** type identity và physical-unit relationship authoritative; count đúng scope. Không khẳng định các field này là cột DB hiện có.

**Lỗi/phụ thuộc:** 403 owner, 404, 409 referenced type, 400 validation. Phải quyết định type/template, override, unlink/archive và tác động giá/booking trước schema/CRUD. P1 sau quyết định, không ưu tiên mutation trước owner read C01–C02.

**Consumer:** `/host/rooms`; hiện chỉ grouping classification, không giả lập quản lý type.

## S-Email — C31, C32

**Hiện tại:** PATCH profile không xử lý email; user email unique trong schema, chưa có xác minh email-change.

**Request đề xuất:** C31 new_email + reauthentication proof theo cơ chế được duyệt; C32 challenge token/code. Không gửi hoặc lưu password/token vào browser preference store.

**Response:** trạng thái yêu cầu/challenge cần thiết, và authoritative account sau khi xác minh. Không coi gửi yêu cầu là email đã đổi.

**Lỗi/phụ thuộc:** 400 email/challenge, 409 email taken, 401/403, rate limits. Chốt mail provider, verification TTL/replay, session/JWT handling và recovery; không tạo schema verification tùy ý.

**Consumer:** Settings nếu được duyệt, P3; hiện email readonly.

## S-Notification — C33, C34

**Hiện tại:** không có notification preferences API hoặc provider contract được xác minh.

**Request:** GET self; PATCH chỉ kênh/loại thông báo thực sự được triển khai và người dùng được phép tắt. Không tự cho tắt thông báo bắt buộc.

**Response:** channels/types supported, current values và mandatory flags có nguồn; không trả capabilities giả.

**Lỗi/phụ thuộc:** 400 unsupported setting, 401/403; cần notification delivery/consent/legal policy được duyệt. Không claim đồng bộ vì localStorage.

**Consumer:** Settings tương lai, P3; **không có switch thông báo trong UI hiện tại**.

## R01 — Điều chỉnh cần review trên API hiện có, KHÔNG phải route mới

`PATCH /api/equipments/{id}`: đề xuất xác minh category mới thuộc đúng Studio của equipment và Host; create cũng cần đối chiếu Studio–category. Giữ nguyên field contract, return 400/403 khi scope không hợp lệ, không đổi bản ghi khi validation thất bại. Cần test server-side IDOR/cross-Studio trong môi trường kiểm thử biệt lập. P0 để xác minh và xử lý nếu xác nhận, **không triển khai hoặc thử ghi trong task này**.

Không đề xuất API cho compact/reduced-motion: đây là preference giao diện cục bộ. Cũng không tạo endpoint đổi mật khẩu mới vì khả năng đó đã nằm trong PATCH profile; thêm form bảo mật là một frontend task riêng nếu chủ sản phẩm yêu cầu.
