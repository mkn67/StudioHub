<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Backend còn thiếu sau khi nối frontend

Ngày 04/11/2026. Dựa trên source sau merge `618fa2e` và các kết nối frontend mới; PHP/MySQL hiện không chạy để kiểm chứng. Các API dưới đây đều **đề xuất chưa triển khai**, hoặc là **mở rộng API hiện có**, không phải route đã tồn tại.

Không cần tạo lại endpoint cho policy/type_save/application/review_application/status/audit/report nếu nhóm thống nhất dùng workspace/commands. Các luồng đó đã có adapter frontend. Phần còn thiếu được phân thành 13 nhóm sau.

## Quy tắc chung cho mọi đề xuất

Bearer theo user hiện hành, kiểm tra role và owner từ DB; không tin host_id/role phía client. Collections cần pagination/count trong đúng phạm vi quyền; lỗi 400/401/403/404/409/422 được thống nhất. Mutation dùng version/idempotency phù hợp; response envelope hiện có. Không công khai dữ liệu riêng, không ghi token/CCCD/bank vào log, URL hoặc analytics. Đây là yêu cầu cho backend tương lai, không có logic PHP mới trong nhiệm vụ này.

## 1. Customer Account — P2

Frontend vẫn sửa tên/phone, email readonly; ngày sinh/địa chỉ/CCCD chưa thu thập.

| Thiếu | Loại và API đề xuất | Request / Response | Role, phụ thuộc |
|---|---|---|---|
| Ngày sinh, địa chỉ | **Mở rộng** GET/PATCH `/api/auth/profile` | Request `date_of_birth:YYYY-MM-DD|null`, `contact_address:string|null`; trả giá trị đã lưu | Chủ phiên; ngày thật/năm nhuận/không tương lai, Unicode/độ dài địa chỉ; cần migration được duyệt và purpose/retention |
| Đổi email | **Mới** POST `/api/auth/email-change-requests`, POST `/api/auth/email-change-confirmations` | Request new_email + reauth proof; confirm challenge; response pending/confirmed authoritative | Chủ phiên; unique, rate limit, token một lần/hết hạn, xác minh email mới; không giới hạn Gmail |
| Upload avatar | **Mới** POST `/api/account/avatar` | Multipart image; response avatar_url đã chuẩn hóa | Chủ phiên; validate MIME/nội dung/kích thước, path/cleanup. PATCH avatar_url hiện có chỉ lưu URL, không upload |
| Preferences thông báo | **Mới** GET/PATCH `/api/account/notification-preferences` | Các channel/event flags được duyệt; response preferences và version | Chủ phiên; defaults/opt-in cần chốt, không lẫn local compact/reduce-motion |
| Identity verification | **Chưa chốt thu thập** GET/POST `/api/account/identity-verification` | Read status/masked reference; DTO submission chỉ sau duyệt | Mục đích/cơ sở xử lý, quyền, xác thực lại, mã hóa/retention/xóa; không tự thêm CCCD vào PATCH profile |

## 2. Host Profile và pháp lý — P1, quyết định P0

Frontend đang có panel cá nhân/doanh nghiệp không submit. Auth profile chỉ là tài khoản, không phải hồ sơ pháp lý.

- **Mới đề xuất:** GET/PATCH `/api/host/legal-profile`, role Host/chủ pháp nhân có quyền được duyệt.
- Request dự kiến `party_type`, `legal_name`, `legal_address`, `contact_phone/email`; organization có `registration_number`, `tax_id`, `representative_name/position`. Response dữ liệu đã lưu, version, updated_at; verified status chỉ backend có quy trình mới được trả.
- Backend chưa có bảng/DTO này; không lấy tên hiển thị hoặc địa chỉ Studio làm thông tin đã xác minh.
- Cần chốt chủ thể Host/pháp nhân/Studio, trường bắt buộc, quyền đại diện, retention. CCCD/bank cần capability riêng, không thêm form browser-only. Validation số đăng ký/thuế theo thị trường được duyệt.

## 3. Studio Management — P1/P2

- **Mở rộng GET `/api/workspace`:** projection nên trả raw status, metadata đầy đủ, khả năng phân biệt policy chưa lưu và filters/page theo resource. Request studio/status/search/page theo role; response items/pagination và `policy_configured` hoặc bằng chứng tương đương. Owner Host hoặc Admin theo phạm vi hiện hành. Hiện workspace trả snapshot, dùng lọc phía client; dedicated GET mine vẫn giữ thông tin chi tiết tài khoản Host.
- **Mới POST `/api/studios/{id}/cover`:** multipart image → cover URL. Role owner Host; MIME/size/path an toàn, xóa ảnh cũ theo retention. Chưa có endpoint upload cover; không thay bằng ảnh minh họa.
- Không cần tạo mới policy endpoint nếu command `policy` được chọn làm hợp đồng chính.

## 4. Room và Room Type — P1

- `types` và `type_save` đã có, frontend đã nối; **không đề xuất lại CRUD trùng**.
- **Mở rộng workspace:** trả `studioId` trực tiếp trên room, raw status, metadata/image references có nguồn thật; query status/type/studio/search/page; response collection count/owner đúng. Hiện type→Studio là đường nối bắt buộc, projection không phân biệt maintenance/inactive và có fallback image.
- Dedicated POST `/api/rooms` cũ không gắn type_id mới; frontend tạo phòng gắn type bằng `room_save`. Cần backend thống nhất creation contract để phòng không bị rơi khỏi workspace owner scope. Đây là **mở rộng/đồng bộ endpoint có sẵn**, không thêm endpoint thứ ba.
- Nếu cần archive/xóa loại phòng: phải chốt semantics với phòng/giá/booking tham chiếu trước khi thêm command; owner check và 409 khi tài nguyên đang dùng. Hiện không giả thao tác xóa type.

## 5. Equipment Management — P1/P2

Frontend list cả active/non-active theo owner từ workspace; giữ POST/PATCH thiết bị REST, trạng thái không xác định không tự ghi đè.

- **Mở rộng workspace equipment:** raw `status`, `category_id`, brand, metadata/image thật, filter/pagination; response phân biệt total stock và availability theo interval. Query studio/category/status/search/page; Host owner/Admin read theo quyền. Không tạo giá trị availability khi chưa có khoảng thời gian.
- **Mới POST `/api/equipments/{id}/images`:** multipart → image reference, owner Host, MIME/size/retention; hiện command/REST chỉ nhận URL.
- **Mới có điều kiện DELETE `/api/equipments/{id}`:** không body owner; response ID/operation, 409 nếu có booking/reference. Chỉ triển khai khi chốt xóa vĩnh viễn; inactive đã có, không cần route deactivate mới. Không cascade đơn thuê.
- **Rà soát endpoint đang có:** EquipmentController update nhận category_id nhưng chỉ kiểm tra owner thiết bị; cần kiểm tra category mới cùng Studio/Host. Đây là yêu cầu review source, chưa thử exploit hoặc sửa PHP.

## 6. Pricing Management — P0/P1

- **P0 thống nhất mô hình:** REST `room_rates` và workspace room_type/rentalPlans là hai nguồn khác nhau. Cần chốt nguồn giá authoritative cho từng luồng booking, snapshot và migration; frontend không tự sync hoặc tính lại giá lịch sử.
- **Mở rộng read hiện có**, ví dụ GET `/api/rooms/{id}/rates?include_inactive=true` với auth owner, hoặc projection section trong workspace. Request room/status/effective date/page; response `rate_id`, raw status, unit/duration/price/min/max/effective dates. Hiện public GET chỉ active/effective và chặn room inactive; workspace config không thay thế các record rate.
- **DELETE có điều kiện** `/api/rooms/{id}/rates/{rate_id}` chỉ khi không có tham chiếu; response ID hoặc 409. Owner, match room/rate, FK RESTRICT, audit; lịch sử booking không được cập nhật. Ngừng áp dụng qua PATCH đã có.

## 7. Booking và Availability — P0

- **Đồng bộ các API hiện có, không cần route trùng:** REST pending-unpaid/rejected khác workspace awaiting_payment/pending/cancelled và schema migration mới. Request/response status, expire, payment, cancel và tiền phải cùng hợp đồng được backend duyệt. Roles Customer/Host/Admin giữ quyền riêng; cần test migration legacy, concurrency, idempotency, lịch sử và unpaid expiry trên DB riêng.
- **Mở rộng workspace hoặc calendar owner:** query roomIds/from/to/timezone; response busy intervals gồm buffer do backend tính và trạng thái thực, không lộ khách hàng khác. Hiện workspace bookings/availability chỉ có start/end projection, không đủ thay lịch bận authoritative; REST calendar không đọc room inactive. Frontend giữ lịch REST và chỉ thêm danh sách thời gian workspace, không dựng free slots.

## 8. Host Applications — P1/P2

`application` và `review_application` đã nối; không cần endpoint tạo/duyệt mới nếu dùng commands.

- **Mở rộng workspace applications:** query status/search/page và detail fields có thật như created_at/reviewed_at/reviewer theo quyền. Response items/pagination/detail; không đưa legal documents vào response công khai. Customer chỉ hồ sơ của mình, Admin toàn bộ được phép.
- Request create hiện chỉ studioName/address/description; review id/approved/reason. Nếu yêu cầu hồ sơ pháp lý, phải chốt trường và workflow an toàn trước. Không tự coi hồ sơ cơ bản được duyệt là hợp đồng đã ký.

## 9. Partnership Contracts — P1, nghiệp vụ P0

Frontend hiện chỉ có mẫu SVG minh họa.

- **Mới GET `/api/host/contracts`**, GET `/api/host/contracts/{id}`: Host có quan hệ hợp đồng, request page/status hoặc ID/version; response ID/title/status/effective/expiry/version/document_available. Backend hiện không có record hợp đồng tương ứng.
- **Mới POST `/api/host/contracts/{id}/document-access`:** request version; response private stream hoặc `{url,expires_at,mime_type,version}` ngắn hạn. Kiểm tra quyền từng lần, không URL public vĩnh viễn, không log chữ ký/CCCD.
- Upload/ký/approve chưa chốt route vì chưa xác định ai upload, ký, duyệt, chủ thể, bằng chứng hợp lệ, retention và ảnh hưởng khi hết hạn/thay pháp nhân. Không thêm gate cho thuê/đăng tin từ frontend.

## 10. Admin Resource Management — P1/P2

Đã nối read toàn hệ thống, studio_status/room_status có xác nhận và reason. Không có quyền sửa thiết bị qua endpoint Host.

- **Mở rộng commands hiện có** hoặc endpoint Admin được duyệt cho metadata Studio/phòng/equipment. Request ID, allowlist fields, reason/version; response resource/state authoritative. Không chỉ nới Host owner guard. Cần xác định trường được Admin sửa và tác động future bookings; audit bắt buộc.
- **Mới GET `/api/admin/roles`:** danh mục roles/assignable permissions theo phiên Admin; response role/label/permissions, không tự tạo role. Hiện REST role assignment đã có; catalog vẫn hardcode ở UI chứ chưa có API.
- **Mở rộng workspace collections** filters/page/count để tránh tải toàn snapshot. Admin equipment mutation còn thiếu thật; không đề xuất command name như một khả năng đã tồn tại.

## 11. Refund Management — P0

Đã nối read-only refunds từ booking; không có nút execute thật.

- **Mở rộng read** theo exception ID/booking/provider attempt, currency, reason, status, amounts/history, page/filter. Có thể thêm sections vào workspace hoặc GET `/api/admin/refund-exceptions` và `/{id}` nếu cần độc lập; không tạo trùng khi projection đã đủ.
- **Mới capability execute/reconcile thật**, ví dụ POST `/api/admin/refund-exceptions/{id}/actions` sau khi chốt provider và quy trình. Request action/reason/idempotency/version, không nhận số tiền tùy ý từ client; response provider-backed attempt/status/reference. Admin có quyền tài chính, chống lặp, audit, reconciliation và retention; không coi HTTP success mô phỏng là settlement.
- `resolve_refund` hiện bị giới hạn dev/test + development adapter: `SIMULATED_ONLY`, không đáp ứng tiền thật. Không sửa PHP để bật nó trong production.

## 12. Audit Logs — P2

- **Mở rộng workspace audit** với query actor/action/entity/from/to/page hoặc GET `/api/admin/audit-logs` nếu nhóm chọn endpoint riêng.
- Response items/pagination, event ID/timestamp/actor/action/resource/result và metadata đã redaction; detail theo ID nếu có nhu cầu.
- Hiện chỉ tối đa 1000 record gần nhất, thiếu result/full metadata; frontend lọc và phân trang local, không giả full history.
- Admin-only, giới hạn truy vấn, không log bí mật/CCCD/payload toàn bộ; retention và access audit phải được duyệt.

## 13. Reports và Analytics — P2

- **Mở rộng GET `/api/reports`**, không thêm `/host/...series` và `/admin/...series` trùng nếu API hiện có dùng được.
- Query from/to, studioId/roomId, bucket day/week/month sau khi thống nhất timezone/[from,to). Response currency/definitions/period/applied_filters và series có kiểu rõ ràng; metric missing khác 0.
- Hiện reports không đọc filters, chỉ totals và số booking theo phòng/tuần/tháng; không có daily revenue/occupancy series. Frontend hiển thị riêng “toàn bộ dữ liệu” và giữ statistics theo kỳ từ endpoint cũ.
- Host không đọc Studio người khác; Admin system scope; backend định nghĩa deposit/collections/refunded/netCollected so với completed revenue, không để frontend tự tạo số tiền quan trọng.

## Thứ tự gợi ý

1. **P0:** thống nhất hai lifecycle/nguồn giá; review category ownership; chốt hoàn tiền thật/định danh/hợp đồng.
2. **P1:** management metadata/status thật, rates inactive, owner calendar, legal/contracts/upload còn thiếu.
3. **P2:** profile mở rộng, filters/pagination, audit/report nâng cao và role catalog.

Không yêu cầu backend viết lại policy/type/application/review/status command đã có. Xem [audit tích hợp](FRONTEND_BACKEND_INTEGRATION_AUDIT.md) và [coverage](API_COVERAGE_MATRIX.md) để phân biệt frontend đã nối với runtime PHP còn bị chặn.
