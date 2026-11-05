<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Backlog API sau kiểm toán — chờ phê duyệt

Không có hạng mục backend nào được triển khai trong task Workspace. Tài liệu này chỉ sắp xếp công việc tương lai theo bằng chứng từ [API_GAP_AUDIT.md](API_GAP_AUDIT.md) và mã hợp đồng trong [PROPOSED_API_CONTRACTS.md](PROPOSED_API_CONTRACTS.md).

P0 chỉ dùng cho nguy cơ bảo mật/toàn vẹn dữ liệu có dấu vết mã nguồn; P1 cho luồng quản lý cốt lõi; P2 cho năng lực quản trị bổ sung; P3 cho tiện ích/media. Một endpoint tồn tại nhưng chưa kiểm thử ghi không được gọi là “missing”. Phê duyệt backlog không thay thế review schema, phân quyền và nghiệp vụ từng mục.

## G0 — Xác minh bảo vệ dữ liệu hiện hữu

### G0.1 Quan hệ equipment–category–Studio

- **Yêu cầu / ưu tiên:** xác minh và khép ràng buộc category ownership/same-Studio trên create/update equipment nếu nguy cơ được xác nhận; P0.
- **Bằng chứng:** S01, EquipmentController::update + EquipmentRepository::update + FK độc lập trong schema. Chưa thử khai thác hoặc ghi runtime.
- **Phụ thuộc:** kiểm thử server-side trên database biệt lập; phân định category có được chuyển Studio không. Không sửa StockCalculator/booking inventory vô cớ.
- **Trang ảnh hưởng / hợp đồng:** `/host/equipments`; R01, không có route mới.
- **Bảo mật:** foreign category/Studio phải bị từ chối trước UPDATE, không chỉ giới hạn option trong UI.
- **Nghiệm thu:** test khác owner, cùng owner khác Studio, category hợp lệ; khi lỗi không đổi bản ghi; regression stock conflict và ownership đều đạt.
- **Cần chủ sản phẩm duyệt:** có, nếu thay semantics chuyển category/Studio; security owner cần xác nhận vấn đề và kế hoạch remediation. Task hiện tại không tự sửa.

## H1 — Dữ liệu quản lý tài nguyên Host

### H1.1 Owner room inventory và owner detail

- **Yêu cầu / ưu tiên:** đọc active/maintenance/inactive trong đúng Studio của Host; P1.
- **Phụ thuộc:** thống nhất owner scope/status và danh mục; không phụ thuộc tạo Room Type mới.
- **Trang / hợp đồng:** `/host/rooms`, `/host/rates`, `/host/calendar`; C01–C02.
- **Bảo mật:** ownership ở SQL/service, pagination sau filter owner, 403 cho ID thuộc Host khác.
- **Nghiệm thu:** count/page đúng khi nhiều Host; không có trang trống do lọc owner tại client; room vừa ẩn vẫn đọc lại được bởi owner; public endpoint tiếp tục chỉ công khai như cũ.
- **Cần chủ sản phẩm duyệt:** có, phạm vi status và quyền đọc; không đề xuất nới public catalog.

### H1.2 Owner equipment và rate lifecycle

- **Yêu cầu / ưu tiên:** đọc toàn bộ thiết bị và lịch sử/giá tương lai được phép quản lý; P1.
- **Phụ thuộc:** G0.1, H1.1, định nghĩa status/effective date; mutations hiện tại đã tồn tại.
- **Trang / hợp đồng:** `/host/equipments`, `/host/rates`; C03–C04.
- **Bảo mật:** category và equipment cùng scope; rate thuộc đúng room; không expose stock trống giả.
- **Nghiệm thu:** inactive/maintenance không biến mất khỏi management; giá future/history phân biệt; min/max units, duration, price không bị frontend tự diễn giải lại; GET không ghi dữ liệu.
- **Cần chủ sản phẩm duyệt:** có, lifecycle, lịch sử và khả năng sửa rate đã có booking.

### H1.3 Model Room Type và chính sách

- **Yêu cầu / ưu tiên:** quyết định type/template versus space category và policy ownership/version; P1 nhưng chỉ bắt đầu implementation sau model review.
- **Phụ thuộc:** chủ sản phẩm quyết định quan hệ physical unit, pricing overrides, policy snapshot và effective time; schema hiện tại không chứng minh có type/policy model giống demo.
- **Trang / hợp đồng:** `/host/rooms`, `/host/policies`; C28–C30 và C07–C08.
- **Bảo mật:** không để Host sửa platform policy hoặc type của người khác; tránh client điều khiển nghĩa vụ booking đã xác nhận.
- **Nghiệm thu:** có tài liệu model được duyệt trước migration; hợp đồng read/edit rõ; test không làm đổi nghĩa booking cũ ngoài quyết định đã duyệt.
- **Cần chủ sản phẩm duyệt:** **bắt buộc**, không chọn chính sách mặc định trong code UI.

### H1.4 Media Studio/thiết bị

- **Yêu cầu / ưu tiên:** upload/replace ảnh đúng loại tài nguyên; P3.
- **Phụ thuộc:** owner reads, storage lifecycle/retention, cover representation; room upload hiện có được giữ nguyên.
- **Trang / hợp đồng:** Host Studio/equipment; C09–C10.
- **Bảo mật:** MIME thực, kích thước, tên lưu an toàn, owner guard, cleanup/URL policy.
- **Nghiệm thu:** có file/URL thật sau lưu, lỗi không mất ảnh cũ, không có orphan upload do retry, không dùng ảnh stock như ảnh tài nguyên.
- **Cần chủ sản phẩm duyệt:** có, media fields/lifecycle. Việc nhập image_url/brand/description đã có backend là frontend task riêng, không cần API mới.

## H2 — Vận hành và lịch Host

### H2.1 Owner calendar và operational overview

- **Yêu cầu / ưu tiên:** lịch có references/status/interval kinds authoritative và summary hôm nay đầy đủ; calendar P1, overview P2.
- **Phụ thuộc:** H1.1, định nghĩa pending/actionable và phạm vi PII; không thay buffer hay availability formulas.
- **Trang / hợp đồng:** `/host/calendar`, `/host`; C05–C06.
- **Bảo mật:** mọi room trong query phải thuộc Host; không lộ customer qua public endpoints.
- **Nghiệm thu:** exact timestamps qua nửa đêm; cleaning tách riêng chỉ khi có nguồn thật; today totals không bị giới hạn 50 bản ghi; API metadata phân biệt actual zero với unavailable.
- **Cần chủ sản phẩm duyệt:** có, định nghĩa KPI và event kinds.

### H2.2 Xác minh mutations đang tồn tại

- **Yêu cầu / ưu tiên:** kiểm thử các route ghi Studio/room/equipment/rate/upload/booking trên môi trường test biệt lập; P1.
- **Phụ thuộc:** được phép tạo dữ liệu kiểm thử và cô lập side effects; không thuộc task UI hiện tại.
- **Trang / hợp đồng:** các Host editors, booking detail; **dùng endpoint hiện có**, không đề xuất route trùng.
- **Bảo mật:** ownership, category same-Studio, invalid fields, replay/upload safety, state-machine prerequisites.
- **Nghiệm thu:** request/response đúng contract, negative tests không đổi dữ liệu, completion/confirmation guard giữ nguyên, không coi source review là runtime verified.
- **Cần chủ sản phẩm duyệt:** cho phép test data; business review riêng nếu phát hiện semantics khác kỳ vọng.

## A1 — Quản trị tài khoản, đối tác và tài nguyên

### A1.1 Quy trình hồ sơ đối tác

- **Yêu cầu / ưu tiên:** intake + list/detail + approve/reject; P1.
- **Phụ thuộc:** định nghĩa applicant, bộ hồ sơ, status, reapply, evidence retention và cập nhật role atomic; không có model DB được xác nhận.
- **Trang / hợp đồng:** `/admin/host-requests`, luồng đăng ký Host tương lai; C11–C14.
- **Bảo mật:** hồ sơ nhạy cảm chỉ cấp đúng quyền, chỉ Admin ra quyết định, chống duplicate decision, không nhận role admin từ applicant.
- **Nghiệm thu:** có nguồn hồ sơ thật, audit decision/reason, conflict rõ, duyệt không tự cấp quyền vượt thiết kế, UI không fake queue count.
- **Cần chủ sản phẩm duyệt:** **bắt buộc** trước schema/workflow.

### A1.2 Inventory quản trị toàn hệ thống

- **Yêu cầu / ưu tiên:** Admin list Studio/room/equipment gồm mọi status được phép; P1. Intervention mutations P2.
- **Phụ thuộc:** approved Admin override boundary và audit requirements; không dùng Host-only route cho Admin.
- **Trang / hợp đồng:** `/admin/studios`, `/admin/equipments`; C15–C20.
- **Bảo mật:** role server-side; allowlist trường/actions, reason và audit; không cho Admin tùy ý làm sai giá/tồn kho/booking chỉ vì UI có nút.
- **Nghiệm thu:** pagination/filter đúng toàn hệ thống, hidden resources đọc được đúng quyền; ghi bị từ chối khi ngoài scope; không ảnh hưởng public visibility semantics hoặc safeguards.
- **Cần chủ sản phẩm duyệt:** có, đặc biệt quyền sửa owner, suspend Studio và ảnh hưởng đơn hiện hữu.

### A1.3 Danh mục quyền và assignment

- **Yêu cầu / ưu tiên:** cung cấp catalog authoritative nếu cần; P2.
- **Phụ thuộc:** quyết định fixed roles có đủ hay cần granular permissions; PATCH user role đã có và không được gọi là missing API.
- **Trang / hợp đồng:** `/admin/roles`; C21.
- **Bảo mật:** không thêm self-escalation hoặc cấp admin qua assignment hiện hành; RBAC mới cần design/review riêng.
- **Nghiệm thu:** phân biệt role catalog với account list; UI chỉ hiển thị permission có nguồn thật; assignment existing guards không đổi.
- **Cần chủ sản phẩm duyệt:** có; không tự tạo vai trò/quyền mới.

## A2 — Tài chính và ngoại lệ hoàn tiền

### A2.1 Mô hình refund và xử lý ngoại lệ

- **Yêu cầu / ưu tiên:** case list/detail và action contract sau review; P1.
- **Phụ thuộc:** ledger/recorded versus settled, provider, refund state machine, amount authority, idempotency, retries, escalation và reconciliation. Không có refund model hoàn chỉnh được xác nhận từ schema.
- **Trang / hợp đồng:** `/admin/refunds`; C22–C24.
- **Bảo mật:** mọi action có quyền/lý do/audit, chống double refund, không tin amount từ client; cân nhắc separation of duties.
- **Nghiệm thu:** không thể thanh toán hoàn hai lần, retry không nhân tiền, provider failure không được báo settled, state/history đầy đủ, con số phản ánh authoritative source.
- **Cần chủ sản phẩm duyệt:** **bắt buộc** cùng owner tài chính trước implementation. Không sửa công thức hoàn tiền trong backlog UI.

## A3 — Nhật ký và báo cáo

### A3.1 Read-only audit explorer

- **Yêu cầu / ưu tiên:** tra cứu audit_logs hiện có bằng endpoint Admin; P2.
- **Phụ thuộc:** retention/redaction/timezone, sort/pagination/index review.
- **Trang / hợp đồng:** `/admin/audit-logs`; C25.
- **Bảo mật:** Admin-only, metadata redaction, không có thao tác sửa/xóa log.
- **Nghiệm thu:** kết quả có log_id/user/action/entity/time thật; filters đúng; không lộ secret, mật khẩu, token hoặc PII quá mức; empty khác request failure.
- **Cần chủ sản phẩm duyệt:** có, visibility/retention; backend đã ghi log nên không thiết kế lại logger vô cớ.

### A3.2 Chuỗi báo cáo Host/Admin

- **Yêu cầu / ưu tiên:** trends/series có định nghĩa metric; P2.
- **Phụ thuộc:** revenue recognition, occupancy denominator, lịch sử resource, timezone, ledger nếu cần cash metrics.
- **Trang / hợp đồng:** `/host/reports`, `/admin/reports`; C26–C27.
- **Bảo mật:** Host owner-scoped; Admin financial visibility được duyệt.
- **Nghiệm thu:** tổng series khớp aggregate theo cùng phạm vi, boundary `[from,to)` chính xác, zero khác unavailable, không dựng chart từ dữ liệu giả.
- **Cần chủ sản phẩm duyệt:** có. GET statistics hiện hành đã chạy được, không phải thiếu toàn bộ Reporting API.

## S1 — Tài khoản và tùy chọn

### S1.1 Xác minh cập nhật hồ sơ hiện có

- **Yêu cầu / ưu tiên:** kiểm thử success/error/refresh/duplicate submit của PATCH profile trong môi trường cho phép ghi; P2.
- **Phụ thuộc:** tài khoản test và cho phép mutation; hiện UI chỉ runtime-verified read và kiểm tra failure bằng chặn mạng.
- **Trang / hợp đồng:** `/host/settings`, `/admin/settings`; PATCH `/api/auth/profile` **đã có**.
- **Bảo mật:** chỉ self-profile; không cho form sửa email/role/status; credentials không nằm trong preference store.
- **Nghiệm thu:** server-confirmed persistence, refresh giữ dữ liệu, failure giữ draft, không duplicate request.
- **Cần chủ sản phẩm duyệt:** cho phép dữ liệu kiểm thử; không cần API mới cho họ tên/điện thoại.

### S1.2 Email và notification preferences tùy nhu cầu

- **Yêu cầu / ưu tiên:** email change verification C31–C32, supported notification settings C33–C34; P3.
- **Phụ thuộc:** mail/provider/consent/re-auth/challenge/session policy và scope thông báo bắt buộc.
- **Trang:** Settings tương lai; hiện email readonly và không có switch email/SMS giả.
- **Bảo mật:** chống account takeover/replay, uniqueness, rate limit, không để tắt thông báo bắt buộc trái quyết định nghiệp vụ.
- **Nghiệm thu:** chỉ đổi email sau xác minh, preference được lưu thật và delivery tôn trọng những setting được hỗ trợ.
- **Cần chủ sản phẩm duyệt:** **bắt buộc**, không thêm schema/notification provider trong task hiện tại.

### S1.3 Các việc chỉ cần frontend

Đổi mật khẩu đã được hỗ trợ bởi `AuthService::updateProfile(current_password,new_password)`; avatar URL và equipment metadata cũng đã có khả năng ghi. Nếu muốn thêm form cho các trường này, làm frontend follow-up với kiểm thử ghi được duyệt, không mở ticket “missing endpoint” trùng. Compact/reduced-motion đang lưu browser-local và không cần backend. Hints chưa có hệ thống tùy chọn có ý nghĩa nên không thêm switch vô tác dụng; yêu cầu đồng bộ preference nhiều thiết bị là scope riêng nếu được duyệt sau.

## Trình tự đề nghị và cổng nghiệm thu

1. Xác minh G0 trong môi trường biệt lập; không đợi triển khai UI mới để xử lý rủi ro server nếu xác nhận.
2. Chốt owner inventory và làm H1.1–H1.2; giữ nguyên public endpoints để tránh regression Customer.
3. Chốt quyết định model/type/policy/partner trước migrations; read-only Admin inventory có thể phát triển độc lập khi role/PII scope rõ.
4. Calendar/overview authoritative, audit explorer và series report theo dữ liệu sẵn có.
5. Refund implementation chỉ bắt đầu sau phê duyệt tài chính, state machine, provider và reconciliation.
6. Mỗi milestone có contract review, ownership/role tests, read/write regression trên test DB, và frontend acceptance. Không tự đánh dấu mutation verified dựa vào route/source hoặc test frontend chặn mạng.

Danh mục đề xuất gồm 34 cặp method–route trong tài liệu hợp đồng; số này không bao gồm R01 vì đó là endpoint đã tồn tại cần review, và không bao gồm các việc frontend-only hoặc kiểm thử mutation có sẵn.
