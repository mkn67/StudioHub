# STUDIOHUB — BÁO CÁO ĐỐI CHIẾU DATABASE, RÀNG BUỘC VÀ API

**Ngày:** 25/10/2026  
**Phạm vi đã kiểm tra:** văn bản `web.md` (đặc tả use case, ERD/từ điển dữ liệu, API, Site Map), `Đồ án Web (3).md` (mục 3.2–3.3), và `StudioHub_Design_Business_Specification_v1.0.md`.  
**Chưa kiểm chứng:** file SQL migration thực tế, cấu trúc database đang chạy, backend/API thật, repository source của Codex, test và runtime. Đây là **static document audit**, không phải kiểm thử database thực tế.

## A. Kết quả tổng quan

- **Có thể tái sử dụng:** phân quyền cơ bản, cấu trúc Studio/Room/Equipment, khóa PK/FK/UNIQUE/CHECK căn bản, snapshot giá, logic interval half-open và đề xuất dùng MySQL InnoDB transaction, kiểm tra chủ sở hữu của Host.
- **Cần sửa trước khi viết backend/schema v2:** thiếu `Room Type`, Booking Hold/2 mốc timeout, trạng thái tách biệt, chính sách refund, change request, strike/restriction, No-show, overtime, công nợ thu nhiều lần, các cấu hình Host.
- **Lỗi nội tại trong tài liệu:** API dùng cột `expires_at` và `unit_minutes` nhưng bảng không khai báo; trạng thái room lệch; trạng thái `rejected/expired` API không thuộc enum BOOKINGS; việc đặt giữ chỗ `pending` khác với flow đã duyệt.
- **Khuyến cáo:** sửa **domain contracts + frontend mock** trước (giai đoạn 1); thiết kế migrations/API mới nhưng không tự khởi tạo backend/MySQL ngoài phạm vi đã duyệt.

## B. Ma trận vấn đề ưu tiên

| ID | Tài liệu cũ | Hệ quả | Chuẩn đã chốt / hướng sửa | Ưu tiên |
|---|---|---|---|---|
| 01 | 16 bảng chưa có `ROOM_TYPES` | Không thể quản lý phòng theo nhóm, giá mặc định/override rõ ràng | Bổ sung cấp Room Type; `ROOMS` là Room Unit và có `room_type_id` cùng Studio; `SPACE_TYPES` chỉ là tag sử dụng | P0 |
| 02 | `BOOKINGS.status` thiếu `awaiting_payment`, `expired`, `no_show` | Không mô phỏng đúng giữ chỗ, timeout và khách không đến | Thống nhất enum 8 trạng thái, chuyển trạng thái có điều kiện | P0 |
| 03 | `pending` = chờ cọc lẫn chờ Host; hoạt động `deposit` dường như confirmed | Bỏ qua bước duyệt Host | Tạo `awaiting_payment` → deposit paid → `pending` → Host duyệt `confirmed` | P0 |
| 04 | Giữ chỗ mặc định 15 phút | Không đúng Host-configurable 15–180 phút và đặt trước 24h+window | Policy snapshot và `payment_deadline` per booking | P0 |
| 05 | Không có processing grace + reconciliation | Có thể thả phòng khi tiền đang xử lý hợp lệ hoặc tính strike sai | 5 phút grace với attempt đã bắt đầu đúng hạn; unknown → reconciliation/no strike | P0 |
| 06 | Không có thời hạn Host duyệt 2 giờ | Booking có thể `pending` vô hạn | `host_response_deadline`, auto-cancel + 100% auto refund; không strike | P0 |
| 07 | Thiếu model refund/attempt/status | Không biểu diễn được hoàn một phần, Host confirm, retry, Admin escalation | `REFUNDS`, lịch sử thử lại và idempotency, payment/refund riêng booking | P0 |
| 08 | Không có data strike/booking restriction | Không thể áp dụng 3 strike, mở khóa và giữ đơn hợp lệ | Event ledger + effective counter + restriction riêng login status | P0 |
| 09 | Không có request đổi lịch | Không thể bảo toàn lịch cũ, kiểm tra 1 lần đổi thành công | Change request + snapshots + atomic switch và audit | P0 |
| 10 | Thiếu policy snapshot | Hủy/đổi lịch có thể bị thay đổi hồi tố | Snapshot cutoff, refund tiers, policy per booking | P0 |
| 11 | `PAYMENTS.status` pending/success/failed; thiếu refund | Khó tách các lần thử và thu tiền từng đợt | Chuyển về vocabulary thống nhất; mỗi attempt có lịch sử, tổng hợp financial summary riêng | P0 |
| 12 | `ROOM_RATES` liên kết mỗi room | Trùng cấu hình giá giữa nhiều Room Unit cùng loại | Rate mặc định ở Room Type và optional override Room Unit, snapshot theo booking | P1 |
| 13 | API dùng `ROOM_RATES.unit_minutes` không khai báo | Session/combo không thể định thời lượng chính xác | Thêm định nghĩa duration cho rate plans/session/combo | P1 |
| 14 | API dùng `BOOKINGS.expires_at`, bảng không có | Query timeout/hold không có dữ liệu tồn tại | Đồng nhất schema và API; lưu `payment_deadline`, `hold_expires_at` và deadline duyệt | P0 |
| 15 | Schema room status `available/maintenance`, API `active/inactive` | Filter công khai sai, updates dễ bị CHECK chặn | Chọn cùng một enum xuyên 4 lớp; status Studio, Room Unit, Equipment độc lập | P1 |
| 16 | API `rejected`, `expired` chuyển đổi nhưng không có trong CHECK booking | Endpoint thất bại hoặc status không hợp lệ | Reject Host → `cancelled` + reason, expire predeposit → `expired` | P0 |
| 17 | Trigger kiểm tra chỉ pending/confirmed/checked_in | `awaiting_payment` có thể bị double-booked | Kiểm tra hold còn hiệu lực trong transaction, khóa dòng Room Unit; không chỉ dựa trigger đếm | P0 |
| 18 | Công nợ không có ledger, quá giờ chưa tính | `completed` dễ bị hiểu là đã thu đủ | Lưu checkout actual, overtime blocks, charges, partial collections, remaining balance | P0 |
| 19 | `USERS.status=locked` chặn login | Trái quy tắc cấm đặt mới nhưng vẫn cho xử lý đơn | Booking-right suspension tách khỏi security lock | P0 |
| 20 | Cổng thanh toán giả `sandbox_qr` mặc định | Dễ diễn giải sai là có QR/cổng thật | Mô phỏng nút trả thành công/thất bại; tách khỏi phần tích hợp tương lai | P1 |
| 21 | Admin/host status API khá rộng | Có thể sửa đơn sau bắt đầu hoặc bỏ qua điều kiện | Action-specific guards, Admin chỉ exceptional-cancel trước start + reason audit | P1 |
| 22 | `EQUIPMENT_CATEGORIES` khai báo 1:N theo Studio nhưng kiểm tra studio không có FK ghép | Có thể gán equipment sai category Studio | Validate studio ownership trên server; cân nhắc composite FK/index khi thiết kế SQL | P1 |
| 23 | Có lời khẳng định 3NF nhưng vẫn có các snapshot/derived columns | Không đủ cơ sở khẳng định đã chứng minh 3NF | Chỉ ghi 'hướng đến 3NF'; nêu các cột dẫn xuất cố ý và invariant đồng bộ | P2 |
| 24 | Use case đánh giá/phản hồi, week/month rates | Scope rộng hơn quyết định v1 | Ghi vào backlog, không tự thêm reviews/rating hoặc gói dài hạn | P2 |

## C. Ràng buộc SQL: đúng/sai/cần kiểm tra thêm

### C1. Những CHECK/UNIQUE hợp lý

- `email` unique; `booking_code` unique; `transaction_code` unique; bảng N–N có composite PK.
- `area > 0`, `capacity > 0`, `start_at < end_at`, `party_size > 0`, `quantity > 0`, `unit_price >= 0`, `amount >= 0` khi loại dòng cho phép 0.
- Bổ sung invariant `deposit_required >= 0`, `paid_deposit >= 0`, timestamps mốc hết hạn không null khi trạng thái tương ứng; `minimum_units <= maximum_units` nếu có max; `effective_from <= effective_to` nếu có end; room code unique trong Studio.
- **MySQL 8.0:** chỉ nên nói `CHECK` được thực thi từ MySQL **8.0.16 trở lên**; kiểm tra phiên bản môi trường thực tế trước khi kết luận.

### C2. Vì sao `SELECT COUNT(*)` trong Trigger không đủ để khẳng định chống trùng lịch?

Tài liệu cũ nêu `BEFORE INSERT/UPDATE` trigger đọc `BOOKINGS` và `SIGNAL SQLSTATE '45000'` khi giao nhau. Dù logic so sánh khoảng thời gian đúng, một kiểm tra đếm **không tự nó tạo ra khóa trên hàng phòng/thiết bị chung và bảo đảm tuần tự hóa mọi transaction cạnh tranh**. Khi hai transaction đồng thời cùng thấy trống, có nguy cơ cả hai cùng chèn nếu không có locking protocol toàn diện. Nếu thêm check trước mà không khóa đúng thực thể chung, cũng dễ race.

**[KIẾN NGHỊ]:** trong backend MySQL tương lai, transaction khóa dòng **physical Room Unit** (`SELECT ... FOR UPDATE`) trước, khóa các dòng Equipment theo thứ tự cố định, sau đó kiểm tra lại tất cả booking/hold còn hiệu lực và tồn kho; insert/update và commit một cách nguyên tử. Khi đổi lịch, khóa cả phòng cũ/mới theo thứ tự ID tăng dần để giảm deadlock. Trigger, nếu còn giữ, chỉ là phòng vệ bổ sung, **không thay thế transaction locking**. Viết integration tests gửi yêu cầu đồng thời. Phía frontend mock chỉ hỗ trợ demo, không bảo đảm đồng thời giữa nhiều trình duyệt.

### C3. Điều kiện interval chuẩn

Đặt `busy_end = scheduled_end + 30 minutes`. Hai khoảng nửa mở [start, busy_end) giao nhau khi:

```text
new.start_at < existing.busy_end
AND existing.start_at < new.busy_end
```

Lúc kiểm tra, phải có **cùng physical Room Unit**, xét `awaiting_payment` hold hiệu lực, `pending`, `confirmed`, `checked_in` và xác minh grace. Chỉ so các record có quyền chiếm lịch đang còn hiệu lực. Trong quá giờ thực tế, cảnh báo vận hành thay vì tự ý làm mất booking kế tiếp.

### C4. Ràng buộc phức tạp không gói được bằng CHECK đơn giản

- Inventory concurrency theo SUM(quantity) của các đơn giao nhau.
- Đổi lịch bảo toàn cả old hold và new hold trước khi switch.
- Các mốc 5 phút grace / 2 giờ Host timeout, hoàn 100%, retry idempotent.
- Cộng strike không trùng, reset effective count khi Admin khôi phục.
- Thực thu/công nợ/hoàn dư và nhiều giao dịch tiền.
- Quyền sở hữu Host/Studio/Equipment/Room Type; chỉ đúng người được update.

Những ràng buộc này cần tầng dịch vụ transactional/authorization; ở phase 1 có thể kiểm thử bằng pure functions trên mock store.

## D. Khung điều chỉnh mô hình dữ liệu (chưa phải migration đã duyệt)

| Thực thể/cấu trúc bổ sung hoặc sửa | Trường/invariant tối thiểu được đề xuất |
|---|---|
| `ROOM_TYPES` | `room_type_id`, `studio_id`, tên, defaults, giá mặc định, trạng thái |
| `ROOMS` (= Room Units) | `room_type_id`, `studio_id`, `room_code`, physical location, capacity, status, unique(studio_id,room_code) |
| `RATE_PLANS` / `ROOM_RATES` | owner room_type_id, optional room_unit_id override; unit_minutes/combos, effective range, rates |
| `STUDIO_POLICY_VERSIONS` | payment window, cancellation cutoff, reschedule cutoff, refund tiers, overtime_per_30m, effective version |
| `BOOKING_POLICY_SNAPSHOTS` | terms as of booking creation, unchanged by Host policy edits |
| `BOOKINGS` | booked exact room_unit_id, enum 8 trạng thái, deadlines, scheduled/actual check times, original/current prices, completed with balance |
| `BOOKING_HOLDS` (hoặc fields tương đương) | active hold expiry, processing grace, release/reconcile, room/equipment claims |
| `BOOKING_CHANGE_REQUESTS` | pending/approved/rejected/completed; original vs requested room/time/price; completed count max 1 |
| `PAYMENT_ATTEMPTS` | deposit/remaining/partial, initiation time, status, provider reference, idempotency key |
| `REFUNDS` + `REFUND_ATTEMPTS` | refundable amount, status, confirm actor, attempts count/max 2 retries, exception escalation |
| `STRIKE_EVENTS` + `BOOKING_RESTRICTIONS` | source booking/event, dedup, effective counter, Admin clearance while preserving history |
| `CHARGES/COLLECTIONS` or ledger | room/equipment/overtime charges, cash/transfer mock collections, adjustments, outstanding balance |
| `BOOKING_STATUS_HISTORY`, `AUDIT_LOGS` | actor, action, reason, before/after, time, idempotent transitions |
| `HOST_APPLICATIONS` | application payload, pending/approved/rejected reason, admin decision |

Chỉ chọn các bảng thực sự cần khi chuyển sang backend; có thể gộp một số bảng nếu vẫn đảm bảo invariant. Không làm migration phá hủy bảng/dữ liệu hiện có tự động.

## E. Phạm vi sửa với Codex ngay bây giờ

1. Đọc `StudioHub_Business_Policy_VI_v1.1.md` làm nguồn policy chuẩn, so với repo hiện tại và hai file đồ án cũ.
2. **Kiểm tra có database/schema/API thực hay không**. Nếu không có: chỉ sửa frontend/mock domain/services/tests; không tạo backend/MySQL mới.
3. Nếu có schema/migrations hiện hữu: báo cáo diff và đề xuất migration an toàn; không drop/alter dữ liệu production khi chưa được chấp thuận.
4. Ưu tiên P0 trước: room types, booking lifecycle, hold deadlines, refund, strike, reschedule, balance, no-show/overstay.
5. Giữ nguyên bố cục UI đã chốt; không làm lại thiết kế màu/typography trong đợt sửa nghiệp vụ.
6. Viết unit tests và scenario tests để ngăn lặp lại sai khác.

## F. Căn cứ nội bộ theo phần tài liệu

- `web.md` §3.1.3: UC02/UC03; §3.2.1: 16 thực thể và ràng buộc; §3.2.2: trigger, khóa; §3.2.3: từ điển dữ liệu; §3.3.2: API, `expires_at`, `unit_minutes`, lifecycle; §3.4.1: navigation.
- `Đồ án Web (3).md` §3.2–3.3: nội dung schema và API tương đồng với web.md.
- `StudioHub_Design_Business_Specification_v1.0.md` §2, §5–§10 và §13: tất cả các quyết định chính sách về Room Type, booking, thanh toán, hoàn tiền, strike, reschedule, check-in/out, no-show và overtime.

**Kết luận:** Đây là **báo cáo sai khác thiết kế**, chưa chứng minh mã nguồn Codex đang có lỗi hoặc database thực đang vi phạm. Muốn kết luận thực thi phải chạy audit trong repo/database của người dùng.
