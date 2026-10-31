# Implementation Plan: Back-end API (PHP 8.2 + MySQL 8.0), phiên bản 2.1

> Nguồn: mục 3.2 (CSDL, 16 bảng) và mục 3.3 (kiến trúc, API) của báo cáo.
> Phiên bản này đã sửa theo hai vòng review: giữ nguyên cấu trúc Phase 0 đến 9 và bộ test T1 đến T13, sửa các lỗi logic trong kế hoạch, thêm test T14 đến T23 (vòng 1) và T24 đến T27 (vòng 2).
> Quy mô: S = nhỏ (1 phiên), M = vừa (1 đến 2 phiên), L = lớn (2 đến 3 phiên, cần review kỹ).

## Các thay đổi so với bản trước

| Review | Đã xử lý ở |
| --- | --- |
| P0.1 `DELIMITER` không chạy được qua PDO | Mục 5.1, Phase 1 (mỗi trigger một file, không có `DELIMITER`) |
| P0.2 Tồn kho cộng dồn làm từ chối đơn hợp lệ | Mục 5.3 bước 7, mục 5.9 (`StockCalculator::peakUsage`), T14 |
| P0.3 Giá thiết bị theo giờ nhân nhầm `rental_units` | Mục 5.2, T18 |
| P0.4 Thanh toán `full`, hoàn tất đơn, doanh thu, đồng thời | Mục 5.4, 5.6, 5.7, T16, T20 |
| P0.5 `booking_code` tạm có thể trùng UNIQUE | Mục 5.3 bước 8, T15 |
| P0.6 `booking_type` luôn `short_term` | Mục 2 (D10), mục 5.2, T18 |
| P1.7 `check-availability` vừa đọc vừa khóa | Mục 5.3 (tách `evaluate`), T23 |
| P1.8 Đơn đã cọc giữ lịch vô thời hạn | Mục 2 (D5), 5.4, 5.5, 5.6, T19 |
| P1.9 JWT giữ quyền sau khi khóa/đổi vai trò | Mục 1, 5.8, Phase 2, T17 |
| P1.10 Hết hạn chạy quá nhiều, thiếu index | Mục 5.5, D9 |
| P2.11 `unit_minutes` cho `month`, `half_day`, `session` | Mục 2 (D6) |
| P2.12 `--fresh` trên production | Phase 1, T21 |
| Stack, repo, cách chia phase, MySQL ≥ 8.0.16 | Mục 0, 1, 2 (D13), T22 |

**Vòng review 2:**

| Review | Đã xử lý ở |
| --- | --- |
| R2-1 Cron hết hạn chưa ghi audit log và khoản cần hoàn; `deposit_refund_due` không bao phủ đơn thanh toán `full` | Mục 5.4, 5.5, 5.6, Phase 7, T19, T24 |
| R2-2 `pending` có thể có `expires_at = NULL` và giữ lịch vô thời hạn | Mục 2 (D5), 5.1 (định nghĩa + trigger), Phase 1, T22, T25 |
| R2-3 Kỳ thống kê chưa rõ: nửa mở, mốc phân kỳ doanh thu, đơn vắt qua ranh giới kỳ | Mục 2 (D14), 5.7, Phase 7 và 8, T20, T26 |
| R2-4 Hiệu lực bảng giá với đơn thuê dài hạn | Mục 2 (D15), 5.2, Phase 6, T27 |
| R2-5 Mã tạm dài 28 ký tự, không phải 27 | Mục 5.3 bước 8 |

---

## 0. Cách dùng file này

1. Dùng **monorepo**: `client/` (Next.js) và `server/` (back-end), tài liệu ở `docs/`: `3.2-database.md`, `3.3-api.md`, `implementation-plan.md` (file này).
2. Copy mục 4 ("Quy ước code") vào `CLAUDE.md` ở gốc repo để AI đọc lại ở mỗi phiên.
3. Mỗi phase có **một branch riêng** (`phase-3-auth`, ...). Một phase được làm nhiều phiên và nhiều commit. Chỉ merge vào `main` khi mọi tiêu chí "Done khi" đã đạt và đã dán kết quả lệnh thật vào mô tả merge.
4. Không bảo AI "làm hết backend" một lần.
5. Tự đọc kỹ các file sau, vì lỗi ở đây là lỗi bảo mật, đặt trùng lịch hoặc sai tiền: `AuthMiddleware`, `OwnershipGuard`, `BookingService`, `PaymentService`, `StockCalculator`.
6. Khi plan này và 3.3.2 mâu thuẫn: **plan thắng** cho đến khi đồng bộ ngược vào báo cáo (mục 11).

---

## 1. Quyết định kỹ thuật (mặc định, đổi được trước Phase 0)

| Hạng mục | Chọn | Ghi chú |
| --- | --- | --- |
| Ngôn ngữ / kiến trúc | **PHP 8.2 thuần, chia module** (không framework). Router dùng `nikic/fast-route`, middleware là pipeline tự viết rất nhỏ | Khớp "PHP RESTful API" ở 3.3.1. Nếu nhóm muốn Slim 4 thì chỉ đổi Phase 0 và Phase 2; từ Phase 3 trở đi không đổi. |
| Thư viện | `nikic/fast-route`, `firebase/php-jwt`, `vlucas/phpdotenv`, `phpunit/phpunit` (dev) | Không ORM, chỉ PDO. |
| Repo | Monorepo `client/` + `server/` | Chốt một lần, mọi đường dẫn trong plan dùng `server/`. |
| Cách tổ chức code | **Module nghiệp vụ trước**: Auth, Catalog, Studios, Rooms, Equipment, Booking, Admin, Shared; mỗi module gom controller, service, repository và middleware liên quan | Không chia toàn bộ source thành các thư mục layer ở cấp `src/`. Thành phần hạ tầng dùng chung đặt trong `Core/`; transaction và SQL vẫn nằm cạnh nghiệp vụ trong module tương ứng. |
| CSDL | MySQL 8.0, image `mysql:8.0`, InnoDB, tên bảng **chữ thường snake_case** | `CHECK` chỉ được thực thi từ **8.0.16** trở lên; VPS cũng phải đạt mức này (D13). |
| Xác thực | JWT HS256, TTL 2 giờ, claims `sub`, `iat`, `exp`. **AuthMiddleware nạp lại user từ DB ở mọi request được bảo vệ** (trạng thái và vai trò hiện tại) | Khóa tài khoản hoặc đổi vai trò có hiệu lực ngay. Role trong token chỉ để Front-end hiển thị. Đăng xuất vẫn không thu hồi token (giới hạn ở 3.3.3). |
| Mật khẩu | `password_hash(..., PASSWORD_BCRYPT)` | Theo data dictionary. |
| Môi trường dev | `docker compose`: `api` cổng 8000, `db` ánh xạ `3307:3306`, `cron` (chạy `bin/expire-bookings.php` mỗi 60 giây) | Front-end nằm ở `client/`, chạy riêng. |
| Upload ảnh | `server/public/uploads/rooms/`, chỉ jpg/png/webp, tối đa 5 MB, đổi tên ngẫu nhiên | |
| Test | PHPUnit cho logic thuần, script đa luồng cho đồng thời, Postman | Khớp 3.3.3. |

Biến `.env` cấu hình nghiệp vụ: `DEPOSIT_RATE=0.30`, `HOLD_MINUTES=15`, `HOST_RESPONSE_HOURS=24`, `OPERATING_HOURS=12`, `BUFFER_MINUTES=30`.

---

## 2. Chỗ lệch giữa 3.2 (CSDL) và 3.3 (API): chốt trước khi code

Phase 1 phải áp các thay đổi sau (đồng thời sửa lại 3.2 cho khớp).

| # | Vấn đề | Quyết định |
| --- | --- | --- |
| D1 | `rooms.status` là `available/maintenance`, 3.3 dùng `active/inactive` | `CHECK (status IN ('active','maintenance','inactive'))`, mặc định `'active'`. Chỉ `active` hiện ở tìm kiếm và đặt được. |
| D2 | `equipments.status` thiếu `inactive` | `CHECK (status IN ('active','maintenance','inactive'))`. |
| D3 | `room_rates.status` là `active/expired` | `CHECK (status IN ('active','inactive'))`. "Hết hạn" suy ra từ `effective_to`. |
| D4 | `bookings.status` thiếu `rejected`, `expired` | `CHECK (status IN ('pending','confirmed','checked_in','completed','cancelled','rejected','expired'))`. |
| D5 | Không có hạn giữ chỗ | Thêm `bookings.expires_at DATETIME NULL` kèm `CHECK (status <> 'pending' OR expires_at IS NOT NULL)`: **đơn `pending` luôn phải có `expires_at`**. Giá trị: lúc tạo = `LEAST(created_at + HOLD_MINUTES, start_time)`; sau khi cọc hoặc trả đủ = `LEAST(paid_at + HOST_RESPONSE_HOURS, start_time)` (Host phải phản hồi trong thời gian này); khi Host xác nhận (`confirmed`) = `NULL`, vì lúc đó đơn không còn hạn. `NULL` chỉ hợp lệ với đơn không còn ở `pending`. |
| D6 | `room_rates` thiếu độ dài 1 đơn vị | Thêm `room_rates.unit_minutes INT UNSIGNED NOT NULL`, **do server quyết định theo bảng dưới**. |
| D7 | `equipments.pricing_unit` ghi `session, hour, day` nhưng 3.3 chỉ có `session`, `hour` | `CHECK (pricing_unit IN ('session','hour'))`. |
| D8 | Trigger ở 3.2 chỉ có INSERT, không tính hạn của `pending`, không loại trừ chính bản ghi khi UPDATE | Viết lại 2 trigger (mục 5.1), mỗi trigger một file. |
| D9 | Chưa có chỉ mục | Thêm: `bookings(room_id, status, busy_start, busy_end)`, **`bookings(status, expires_at)`**, `bookings(status, completed_at)`, `bookings(customer_id)`, `booking_details(equipment_id, booking_id)`, `room_rates(room_id, status)`, `rooms(studio_id, status)`, `studios(host_id)`, `payments(booking_id, payment_type, status)`. |
| D10 | `bookings.booking_type` luôn mặc định `short_term` | Server suy ra từ `rate_unit`: `week`, `month` → `long_term`; còn lại → `short_term`. API không nhận trường này từ client. |
| D11 | Create room chỉ gửi `space_type_ids` | Phần tử đầu của mảng là `is_primary = 1`. |
| D12 | 3.3.2 chưa có cách Host tạo Studio, lấy danh mục thiết bị, danh sách loại hình/tiện ích | Thêm endpoint bổ sung ở mục 7 và cập nhật vào 3.3.2 mục 6. |
| D13 | `CHECK` chỉ có hiệu lực từ MySQL 8.0.16 | Dùng `mysql:8.0`; Phase 1 kiểm tra `SELECT VERSION()` và chèn thử dòng vi phạm `CHECK` phải bị từ chối. Cùng yêu cầu cho VPS. |
| D14 | Không có mốc hoàn tất để phân kỳ doanh thu | Thêm `bookings.completed_at DATETIME NULL`, gán `NOW()` khi đơn chuyển sang `completed`; `CHECK (status <> 'completed' OR completed_at IS NOT NULL)`. |
| D15 | Chưa có chính sách hiệu lực bảng giá với đơn thuê dài | Giá **chốt theo ngày bắt đầu thuê** (`DATE(start_time)`) và lưu snapshot vào đơn. Bảng giá hết hiệu lực, bị sửa hoặc ngừng sau đó, kể cả giữa chừng thời gian thuê, không ảnh hưởng đơn đã tạo. Không kiểm tra `effective_to` theo ngày kết thúc thuê. |

**Bảng `unit_minutes` (D6).** Client không gửi `unit_minutes`, trừ `session`.

| `rate_unit` | `unit_minutes` | Ý nghĩa |
| --- | --- | --- |
| `hour` | 60 (cố định) | Làm tròn lên bội số 0,5 giờ |
| `half_day` | 240 (cố định) | Nửa ngày = 4 giờ liên tục |
| `day` | 1440 (cố định) | 1 ngày = 24 giờ liên tục tính từ `start_time` |
| `week` | 10080 (cố định) | 7 ngày |
| `month` | 43200 (cố định) | 1 tháng = **30 ngày**, không dùng tháng lịch |
| `session` | Host nhập khi tạo bảng giá (bắt buộc, > 0), ví dụ 180 | Một buổi là khoảng cố định do Host định nghĩa |

Quy tắc tiền tệ: DB lưu `DECIMAL(..., 2)`, nhưng PHP xử lý và trả JSON bằng **số nguyên VND**.

---

## 3. Cấu trúc thư mục

```
repo/
├─ docker-compose.yml
├─ CLAUDE.md                  # mục 4 của file này
├─ docs/                      # 3.2, 3.3, plan
├─ client/                    # Next.js
└─ server/
   ├─ composer.json
   ├─ .env.example
   ├─ docker/api.Dockerfile   # php:8.2-apache + pdo_mysql + mod_rewrite
   ├─ public/
   │  ├─ index.php
   │  ├─ .htaccess
   │  └─ uploads/rooms/
   ├─ src/
   │  ├─ Core/                # Router, Request, Pipeline, ApiResponse, Db, ErrorHandler, Validator, CORS, health
   │  ├─ Exceptions/          # ApiException(status, code, message, errors[])
   │  └─ Modules/
   │     ├─ Auth/             # AuthController, AuthService, UserRepository, JwtService, AuthMiddleware
   │     ├─ Catalog/          # LookupController, LookupRepository
   │     ├─ Studios/          # StudioController, StudioRepository
   │     ├─ Rooms/            # RoomController, RoomService, RoomRepository, UploadService
   │     ├─ Equipment/        # Equipment controllers, service and repositories
   │     ├─ Booking/          # BookingController, booking/payment services, pricing and stock logic
   │     ├─ Admin/            # AdminController, HostController, AdminService, StatsService
   │     └─ Shared/           # OwnershipGuard, RoleMiddleware, AuditLogger
   ├─ database/
   │  ├─ schema.sql
   │  ├─ triggers/            # mỗi trigger 1 file .sql, KHÔNG có DELIMITER
   │  ├─ seed.sql
   │  └─ migrate.php
   ├─ bin/expire-bookings.php
   ├─ tests/                  # Unit/, concurrency_test.py, postman/
   └─ openapi.yaml
```

---

## 4. Quy ước code (copy vào `CLAUDE.md`)

```markdown
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
```

---

## 5. Thuật toán lõi (đọc trước Phase 6)

### 5.1 Định nghĩa "đơn chiếm lịch" và phát hiện trùng

Đơn chiếm lịch khi:

```sql
status IN ('confirmed','checked_in')
OR (status = 'pending' AND expires_at > NOW())
```

`pending` luôn có `expires_at` (ràng buộc ở D5) và chỉ chiếm lịch khi còn hạn, nên không có đơn `pending` nào giữ lịch vô thời hạn.

Khoảng chiếm dụng của đơn: `[busy_start, busy_end)` với `busy_start = start_time`, `busy_end = end_time + buffer_minutes (30)`.
Hai đơn cùng phòng xung đột khi `new.busy_start < b.busy_end AND new.busy_end > b.busy_start`.

Ví dụ: đơn cũ 09:00 đến 12:00 (chiếm đến 12:30). Đơn mới bắt đầu 12:15 bị từ chối, bắt đầu 12:30 được nhận.

**Trigger (lớp phòng vệ thứ hai)** nằm ở `database/triggers/001_bookings_overlap_ins.sql` và `002_bookings_overlap_upd.sql`. Mỗi file chứa **đúng một** câu `CREATE TRIGGER ... END`, **không có** dòng `DELIMITER` (đó là lệnh của client `mysql`, không phải câu lệnh gửi lên server).

`001_bookings_overlap_ins.sql`:

```sql
CREATE TRIGGER trg_bookings_no_overlap_ins
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status IN ('confirmed','checked_in')
     OR (NEW.status = 'pending' AND NEW.expires_at > NOW()) THEN
    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.room_id = NEW.room_id
        AND (b.status IN ('confirmed','checked_in')
             OR (b.status = 'pending' AND b.expires_at > NOW()))
        AND NEW.busy_start < b.busy_end
        AND NEW.busy_end   > b.busy_start
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROOM_OCCUPIED';
    END IF;
  END IF;
END
```

`002_bookings_overlap_upd.sql`: giống file trên nhưng `BEFORE UPDATE`, tên `trg_bookings_no_overlap_upd`, và thêm điều kiện `AND b.booking_id <> NEW.booking_id` trong `WHERE`.

**Cách `migrate.php` chạy file** (để không vướng lỗi `DELIMITER`):
- `schema.sql` và `seed.sql`: tách câu lệnh theo dấu `;` ở **cuối dòng**. Quy ước viết hai file này: không có `;` bên trong chuỗi hay comment, và không chứa trigger.
- Mỗi file trong `triggers/`: đọc nguyên văn và gửi bằng **một** lệnh `exec()` riêng, từ `CREATE TRIGGER` đến `END`. Không được tách trong thân trigger theo dấu `;`.
- Chạy theo thứ tự: schema, triggers (sắp theo tên file), seed. Dừng ngay khi có lỗi.

Trigger chỉ là lớp dự phòng; khóa ở tầng ứng dụng (mục 5.3) mới là lớp chính, vì SELECT thường trong trigger không thấy dòng chưa commit của giao dịch khác. `ErrorHandler` phải map `SQLSTATE 45000 + ROOM_OCCUPIED` thành `409 room_occupied`.

### 5.2 Tính giá

- `duration_minutes = end_time - start_time`.
- `rental_units` (theo bảng giá phòng đã chọn, `unit_minutes` theo bảng ở mục 2):
  - `hour`: `ceil((duration_minutes / 60) * 2) / 2`.
  - `session`, `half_day`, `day`, `week`, `month`: `ceil(duration_minutes / unit_minutes)`.
- Phải nằm trong `[minimum_units, maximum_units]` (`maximum_units` NULL = không giới hạn), nếu không trả 400.
- `rate_id` hợp lệ khi: thuộc `room_id`, `status = 'active'`, và `effective_from <= DATE(start_time) <= effective_to` (hoặc `effective_to` NULL).
- **Chính sách hiệu lực (D15):** giá được **chốt theo ngày bắt đầu thuê** và lưu snapshot vào đơn. Chỉ kiểm tra hiệu lực tại `DATE(start_time)`; một đơn kéo dài qua `effective_to` (ví dụ bảng giá tháng hết hiệu lực 31/10, đặt 30 ngày từ 30/10) vẫn hợp lệ và giữ nguyên giá đã chốt. Việc Host sửa, ngừng hoặc để bảng giá hết hiệu lực sau đó không đổi `room_unit_price` của đơn đã tạo (T27).
- `room_amount = rental_units × room_unit_price` (làm tròn VND).
- **Thiết bị tính độc lập với `rental_units` của phòng:**
  - `pricing_unit = session`: `quantity × unit_price` (một lần cho cả đơn).
  - `pricing_unit = hour`: `quantity × unit_price × equipment_hours`, với `equipment_hours = ceil((duration_minutes / 60) * 2) / 2` tính từ **thời lượng thật** của đơn (làm tròn lên 0,5 giờ), bất kể phòng thuê theo đơn vị nào. Thiết bị thuê theo giờ trong đơn dài hạn sẽ tính theo toàn bộ số giờ; nếu không muốn vậy, Host đặt `pricing_unit = session` cho thiết bị đó.
  - Lưu snapshot `unit_price` và `subtotal` vào `booking_details`.
- `total_amount = room_amount + equipment_amount`; `deposit_amount = round(DEPOSIT_RATE × total_amount)`.
- `booking_type`: `week` hoặc `month` → `long_term`, còn lại `short_term` (D10).

### 5.3 Tạo đơn (`BookingService::create`) và kiểm tra khả dụng

**Logic kiểm tra dùng chung** nằm trong `AvailabilityService::evaluate($request, bool $locking)` và trả về kết quả hoặc ném `ApiException` (400/404/409). Hai nơi gọi:

- `check-availability`: gọi `evaluate(..., locking = false)`, **không** mở transaction, **không** khóa, **không** ghi, public. Kết quả chỉ để tham khảo, không giữ chỗ. Request nhận thêm `party_size` (tùy chọn) để kiểm tra sức chứa ngay bước này.
- `create`: gọi trong transaction với khóa ở bước 3 và 5 (`locking = true`).

**Các bước `create`:**

1. Validate hình dạng dữ liệu → 400. Parse thời gian giờ VN; `end > start`, `start` ở tương lai.
2. `SET TRANSACTION ISOLATION LEVEL READ COMMITTED` rồi `BEGIN`.
3. Khóa phòng: `SELECT room_id, studio_id, capacity, status FROM rooms WHERE room_id = ? FOR UPDATE`. Không có hoặc không `active` → 404. `party_size > capacity` → 400.
4. Kiểm tra studio `active`. Load và kiểm tra `rate_id`, tính `rental_units` (mục 5.2) → 400 nếu sai.
5. Gộp thiết bị trùng `equipment_id`, sắp xếp tăng dần, rồi khóa: `SELECT ... FROM equipments WHERE equipment_id IN (...) AND studio_id = ? AND status = 'active' ORDER BY equipment_id FOR UPDATE`. Thiếu dòng (sai studio hoặc không active) → 400. Thứ tự khóa luôn là `rooms` rồi `equipments` theo id tăng dần để tránh deadlock.
6. Kiểm tra trùng lịch phòng theo mục 5.1 → 409 `room_occupied`.
7. **Kiểm tra tồn kho theo mức dùng đồng thời cao nhất** (không cộng dồn mọi đơn giao với đơn mới): với mỗi thiết bị, lấy các dòng `booking_details` của đơn chiếm lịch có khoảng chiếm dụng giao với `[new.busy_start, new.busy_end)` (mọi phòng của cùng studio), rồi gọi `StockCalculator::peakUsage` (mục 5.9). Nếu `peakUsage + quantity_mới > total_quantity` → 409 `equipment_insufficient`, `field = equipments[i].equipment_id`.
8. Tính giá (mục 5.2). `INSERT bookings` (status `pending`, `busy_start`, `busy_end`, `booking_type`, `expires_at = LEAST(created_at + HOLD_MINUTES, start_time)`) với `booking_code` **tạm duy nhất cho từng đơn**: `'TMP-' + bin2hex(random_bytes(12))` (28 ký tự: `TMP-` 4 ký tự + 24 ký tự hex; cột `booking_code VARCHAR(50)` đủ dài; không bao giờ dùng giá trị cố định). Sau đó `INSERT booking_details`, rồi `UPDATE booking_code = 'BK-YYYYMMDD-' + booking_id (đệm 4 chữ số)` với ngày lấy từ `start_time`.
9. Ghi `audit_logs`, `COMMIT`, trả 201.
10. Lỗi: `ROLLBACK`. Deadlock (1213) hoặc lock wait timeout (1205) thì thử lại tối đa 1 lần. `ROOM_OCCUPIED` từ trigger → 409. Lỗi khác → 500 thông báo chung.

### 5.4 Vòng đời đơn (`BookingStateMachine`)

Hàm thuần cho các cặp (từ, sang); các điều kiện dữ liệu (thanh toán, hạn) do `BookingService` kiểm tra thêm.

| Từ | Sang | Ai làm | Điều kiện / ghi chú |
| --- | --- | --- | --- |
| pending | confirmed | Host sở hữu (`PATCH status`) | Phải có ít nhất một thanh toán `success` loại `deposit` **hoặc** `full`, và đơn chưa quá `expires_at`; nếu không 400 `deposit_required` / `booking_expired`. Đặt `expires_at = NULL`. |
| pending | rejected | Host sở hữu | Không chiếm lịch nữa. |
| pending | cancelled | Customer sở hữu (`POST /cancel`) | |
| pending | expired | Hệ thống | `expires_at <= NOW()`: chưa cọc quá `HOLD_MINUTES`, hoặc đã cọc nhưng Host không phản hồi trong `HOST_RESPONSE_HOURS`. |
| confirmed | checked_in | Host sở hữu | |
| confirmed | cancelled | Customer (`/cancel`) hoặc Host (`PATCH status = cancelled`) | |
| checked_in | completed | Host sở hữu | Chỉ khi **đã thanh toán đủ**: `Σ amount` của các giao dịch `success` ≥ `total_amount`; nếu không 400 `payment_incomplete`. Gán `completed_at = NOW()` (D14). |
| completed, cancelled, rejected, expired | (không) | | Trạng thái cuối. Mọi chuyển đổi khác → 400. |

`PATCH status` của Host chỉ nhận `confirmed, rejected, checked_in, completed, cancelled`; không bao giờ nhận `pending` hay `expired`. Mỗi lần đổi trạng thái: khóa dòng booking (`FOR UPDATE`), ghi `audit_logs` (trước/sau). Khi đơn chuyển sang `rejected`, `cancelled` hoặc `expired` mà đã có thanh toán (`paid_total > 0`), `audit_logs` phải kèm khoản cần hoàn theo mục 5.5.

### 5.5 Hết hạn giữ chỗ

- **Cơ chế chính:** `bin/expire-bookings.php` chạy mỗi 60 giây (service `cron` trong docker compose; cron trên VPS). Script **không** chạy một câu `UPDATE` hàng loạt mà xử lý từng đơn:
  1. Lấy tối đa 200 id: `SELECT booking_id FROM bookings WHERE status = 'pending' AND expires_at <= NOW() ORDER BY expires_at LIMIT 200` (dùng index `(status, expires_at)`); lặp lại đến khi không còn đơn.
  2. Với mỗi id gọi `BookingService::expireIfDue($bookingId)`: `BEGIN` → `SELECT ... FROM bookings WHERE booking_id = ? FOR UPDATE` → nếu không còn `pending` hoặc chưa quá hạn thì bỏ qua → đọc các giao dịch `payments` `success` → `UPDATE bookings SET status = 'expired'` → ghi `audit_logs` → `COMMIT`.
  3. Mỗi đơn một transaction riêng; lỗi ở một đơn thì ghi log rồi đi tiếp, không làm hỏng các đơn khác. Chạy lại script không tạo thêm log cho đơn đã `expired`.
- **Ghi nhận khoản cần hoàn (mọi chuyển sang `expired`, `cancelled`, `rejected`):** một dòng `audit_logs` với `entity_type = bookings`, `user_id = NULL` nếu do hệ thống, `action` là `booking_expired` / `booking_cancelled` / `booking_rejected`, và `metadata`:
  ```json
  {
    "from": "pending",
    "to": "expired",
    "reason": "unpaid_hold_timeout",
    "paid_total": 285000,
    "refund_due": 285000,
    "refund_status": "recorded_only",
    "payments": [
      { "payment_id": 12, "payment_type": "deposit", "amount": 285000, "transaction_code": "SBX-20261019141000-ab12" }
    ]
  }
  ```
  `reason` nhận một trong: `unpaid_hold_timeout` (chưa thanh toán, quá `HOLD_MINUTES`), `host_no_response` (đã thanh toán, Host không phản hồi), `customer_cancelled`, `host_rejected`, `host_cancelled`. `refund_due = paid_total`, tính cho **mọi loại** thanh toán thành công (`deposit`, `full`, `remaining`); đơn chưa thanh toán thì `paid_total = 0` và `refund_due = 0`. `refund_status = recorded_only` nghĩa là chỉ ghi nhận, không hoàn tiền thật (phạm vi sandbox). Chính sách giữ lại một phần cọc khi khách hủy là mở rộng, ngoài phạm vi.
- **Trong request:** không chạy `UPDATE` hàng loạt. Chỉ "hết hạn khi truy cập" cho đúng một booking đang được đọc/ghi (`GET /bookings/{id}`, đổi trạng thái, hủy, thanh toán), gọi chính `BookingService::expireIfDue` (dùng chung với cron nên logic và audit log giống hệt nhau) sau khi đã khóa dòng booking.
- **Tính đúng đắn không phụ thuộc cron:** điều kiện chiếm lịch ở mục 5.1 đã loại đơn quá hạn nên không chặn đặt mới dù trạng thái chưa kịp cập nhật.
- Khi dữ liệu lớn, kiểm tra `EXPLAIN` của câu `SELECT` lấy id ở bước 1 để chắc nó dùng index `(status, expires_at)`.

### 5.6 Thanh toán mô phỏng (`POST /api/bookings/{id}/payments`)

Body: `{ "payment_type": "deposit" | "remaining" | "full", "payment_method": "sandbox_qr" }`. Customer chủ đơn mới gọi được. Số tiền do server tính. Giao dịch sandbox luôn `success` ngay (`paid_at = NOW()`, `transaction_code = SBX-<yyyymmddHHmmss>-<random>`).

**Tuần tự hóa:** trong một transaction: `BEGIN` → `SELECT ... FROM bookings WHERE booking_id = ? FOR UPDATE` → xử lý "hết hạn khi truy cập" → **đọc lại** các thanh toán `success` của đơn → kiểm tra điều kiện → `INSERT payments` → cập nhật `expires_at` (nếu có) → `COMMIT`. Hai yêu cầu cọc đến đồng thời: đúng một yêu cầu tạo giao dịch `success`, yêu cầu còn lại nhận 409 `payment_duplicate`.

| payment_type | Điều kiện | amount | Hệ quả |
| --- | --- | --- | --- |
| deposit | đơn `pending`, chưa quá hạn, chưa có `deposit`/`full` thành công | `deposit_amount` | `expires_at = LEAST(paid_at + HOST_RESPONSE_HOURS, start_time)` |
| full | đơn `pending`, chưa quá hạn, chưa có thanh toán thành công nào | `total_amount` | Như `deposit`; coi như đã thỏa điều kiện xác nhận **và** đã trả đủ |
| remaining | đơn `confirmed` hoặc `checked_in`, đã có `deposit`, chưa có `remaining`/`full` | `total_amount - deposit_amount` | Không đổi trạng thái |

`paid_total = Σ amount` của các giao dịch `success`. Đơn chỉ được `completed` khi `paid_total >= total_amount` (mục 5.4). Khoản cần hoàn khi hủy, từ chối hoặc hết hạn chỉ được ghi vào `audit_logs` theo mục 5.5, không có giao dịch hoàn tiền.

### 5.7 Thống kê

**Kỳ thống kê.** `from` và `to` là ngày `YYYY-MM-DD` theo giờ Asia/Ho_Chi_Minh; kỳ là khoảng **nửa mở** `[from 00:00:00, to 00:00:00)`: gồm `from`, **không** gồm `to` (tháng 10/2026 là `from=2026-10-01&to=2026-11-01`). Mặc định là tháng hiện tại: `from` = ngày 1 của tháng này, `to` = ngày 1 của tháng sau. Yêu cầu `from < to` và độ dài tối đa 366 ngày, nếu không 400. Response trả lại `period {from, to}` theo đúng quy ước này. Mỗi chỉ số có mốc phân kỳ riêng như dưới đây.

- `total_bookings`: mốc phân kỳ là **thời điểm bắt đầu thuê**: số đơn có `from <= start_time < to`, trừ `expired`.
- `total_revenue`: mốc phân kỳ là **thời điểm hoàn tất đơn**: tổng `total_amount` của các đơn `completed` có `from <= completed_at < to` (D14). Vì đơn chỉ hoàn tất khi đã thanh toán đủ (mục 5.4), con số này đúng bằng số tiền thực thu của các đơn đó; **không** dùng `payments` thay thế cho định nghĩa này. Tiền cọc của đơn hủy hoặc hết hạn không tính vào doanh thu. Có test đối chiếu `Σ payments success` của các đơn `completed` bằng `Σ total_amount` (T20).
- `occupancy_rate`: lấy các đơn `confirmed`, `checked_in`, `completed` có khoảng sử dụng `[start_time, end_time)` giao với kỳ. Mỗi đơn chỉ tính **phần giờ nằm trong kỳ**: `giờ = min(end_time, to) - max(start_time, from)` đổi ra giờ (đơn 31/10 20:00 đến 01/11 02:00 trong kỳ tháng 10 tính 4 giờ), không tính 30 phút dọn dẹp. `occupancy_rate = Σ giờ ÷ (số phòng active × số ngày của kỳ × OPERATING_HOURS) × 100`, làm tròn 1 chữ số thập phân, trả dạng số. Không cắt trần 100%: nếu có đơn thuê ngoài khung giờ vận hành thì tỷ lệ có thể vượt 100% (đơn giản hóa chấp nhận cho đồ án, nên ghi chú trong báo cáo).
- `total_studios`, `total_rooms`: số lượng đang `active` tại thời điểm gọi API, không phụ thuộc kỳ. Host stats cùng công thức nhưng chỉ tính phòng/đơn thuộc Studio của Host đó.

### 5.8 Xác thực mỗi request

`AuthMiddleware`: kiểm tra chữ ký và `exp` của JWT → tải user theo `sub` từ DB: không tồn tại → 401; `status = 'locked'` → 403 `account_locked`; vai trò dùng cho `RoleMiddleware` và controller luôn lấy từ DB, không từ token. Chi phí: một truy vấn theo khóa chính mỗi request được bảo vệ. Giới hạn còn lại: `POST /auth/logout` không thu hồi token đã phát hành (ghi ở 3.3.3).

### 5.9 `StockCalculator::peakUsage` (hàm thuần, có PHPUnit)

```text
peakUsage(existing[], from, to) -> int
  existing: các dòng {busy_start, busy_end, quantity} của đơn chiếm lịch có khoảng
            chiếm dụng giao với [from, to)
  1. Điểm cần xét: `from` và mọi busy_start nằm trong (from, to).
  2. Với mỗi điểm t: usage(t) = Σ quantity của các dòng thỏa busy_start <= t < busy_end.
  3. Trả về max usage(t).
Điều kiện chấp nhận: peakUsage + quantity_mới <= total_quantity.
```

Ví dụ phải pass (kho 4 đèn): đơn A 09:00 đến 10:00 (2 đèn), đơn B 11:00 đến 12:00 (2 đèn), đơn mới 09:30 đến 11:30 xin 2 đèn → chấp nhận (mức dùng đồng thời cao nhất là 2, 2 + 2 ≤ 4). Cộng dồn như bản cũ (2 + 2 + 2 = 6 > 4) sẽ từ chối sai.

Hàm này cũng dùng cho `PATCH /api/equipments/{id}` ở Phase 5: lấy các đơn chiếm lịch trong tương lai, điểm cần xét là `now` và mọi `busy_start ≥ now`; từ chối nếu `total_quantity` mới nhỏ hơn `peakUsage`.

---

## 6. Các phase

### Phase 0: Khởi tạo và môi trường (S)

**Mục tiêu:** repo chạy được, API trả `{"status":"success"}` ở `GET /api/health`.

**Việc cần làm**
- `docker-compose.yml` ở gốc repo: `api` (php:8.2-apache, bật `pdo_mysql` và `mod_rewrite`, cổng 8000, mount `server/`), `db` (`mysql:8.0`, `3307:3306`, volume dữ liệu, healthcheck), `cron` (cùng image với `api`, chạy vòng lặp `php bin/expire-bookings.php` mỗi 60 giây; script có thể tạm là khung rỗng).
- `server/composer.json` với các thư viện ở mục 1; `public/index.php` + `.htaccess` (rewrite mọi request về `index.php`).
- `server/.env.example`: `APP_ENV=dev`, `JWT_SECRET`, `DB_HOST=db`, `DB_PORT=3306`, `DB_NAME=studio_dev`, `DB_USER`, `DB_PASS`, `ALLOWED_ORIGINS`, `DEPOSIT_RATE=0.30`, `HOLD_MINUTES=15`, `HOST_RESPONSE_HOURS=24`, `OPERATING_HOURS=12`, `BUFFER_MINUTES=30`. `.env` nằm trong `.gitignore`.
- `GET /api/health` trả envelope chuẩn (Router sơ khai dùng FastRoute).

**Done khi:** `docker compose up -d` xong thì `curl localhost:8000/api/health` trả 200; từ container `api` kết nối được `db:3306`; `SELECT VERSION()` trả ≥ 8.0.16.

```text
Đọc CLAUDE.md và docs/implementation-plan.md. Làm Phase 0 trong thư mục server/: docker-compose (api PHP 8.2 Apache, db mysql:8.0 ánh xạ 3307:3306, cron chạy bin/expire-bookings.php mỗi 60 giây), composer.json (nikic/fast-route, firebase/php-jwt, vlucas/phpdotenv, phpunit dev), public/index.php + .htaccess, .env.example, .gitignore, và GET /api/health. Không làm gì ngoài phạm vi. Chạy thử và báo kết quả thật của lệnh curl và SELECT VERSION().
```

### Phase 1: Cơ sở dữ liệu (M)

**Mục tiêu:** DB dựng lại bằng một lệnh, có dữ liệu mẫu để test.

**Việc cần làm**
- `database/schema.sql`: 16 bảng theo 3.2.3, **áp D1 đến D15** ở mục 2, tên bảng chữ thường, PK/FK/CHECK/UNIQUE/ON DELETE theo 3.2.2, thêm chỉ mục D9 (có `bookings(status, expires_at)` và `bookings(status, completed_at)`).
- `database/triggers/001_...ins.sql` và `002_...upd.sql`: đúng như mục 5.1, **không có `DELIMITER`**.
- `database/seed.sql`: 3 role; 7 loại hình không gian; vài tiện ích; 1 admin; 2 host + mỗi host 1 studio (để test 403 chéo quyền); 1 customer; mỗi studio vài phòng, bảng giá (hour, day, month), danh mục + thiết bị (cả `session` và `hour`). Mật khẩu dev băm bcrypt, ghi rõ trong README là chỉ dùng cho dev.
- `database/migrate.php`: chạy theo cách ở mục 5.1 (schema → từng file trigger bằng một `exec()` riêng → seed), dừng khi có lỗi. Có `--fresh` (drop rồi tạo lại) với **bảo vệ**: từ chối (thoát mã khác 0, không đụng DB) nếu `APP_ENV` không phải `dev` hoặc `test`, hoặc `DB_NAME` không kết thúc bằng `_dev` / `_test`.
- Cập nhật `docs/3.2-database.md` cho khớp D1 đến D15.

**Done khi:**
- `php database/migrate.php --fresh` chạy sạch qua PDO (không lỗi cú pháp ở trigger); `SHOW TABLES` ra đúng 16 bảng; `SHOW TRIGGERS` ra đúng 2 trigger.
- Chèn thủ công 2 đơn trùng khoảng chiếm dụng vào cùng phòng thì bị trigger chặn (`ROOM_OCCUPIED`); đơn `pending` đã quá `expires_at` thì không chặn đơn mới; đơn sát nhau đúng 30 phút được nhận.
- Chèn dòng vi phạm `CHECK` (ví dụ `area = 0`) phải bị từ chối. Chèn đơn `pending` với `expires_at = NULL` bị từ chối; chèn đơn `completed` không có `completed_at` bị từ chối (T25).
- `EXPLAIN` câu `SELECT booking_id ... WHERE status='pending' AND expires_at <= NOW()` dùng index `(status, expires_at)`.
- Chạy `--fresh` với `APP_ENV=production` hoặc `DB_NAME` không hợp lệ: bị từ chối, dữ liệu không đổi.

```text
Làm Phase 1 theo docs/implementation-plan.md. Tạo server/database/schema.sql (16 bảng theo docs/3.2-database.md nhưng ÁP các thay đổi D1-D15 ở mục 2 của plan; tên bảng chữ thường), triggers/001 và 002 (mỗi file đúng một CREATE TRIGGER, KHÔNG có DELIMITER), seed.sql (2 host + 2 studio, 1 admin, 1 customer, dữ liệu phòng/giá/thiết bị mẫu), migrate.php chạy theo mục 5.1 (mỗi file trigger một lệnh exec riêng) và có --fresh với bảo vệ APP_ENV/DB_NAME. Kiểm thử và dán kết quả thật cho từng mục "Done khi" của Phase 1.
```

### Phase 2: Hạ tầng lõi (M)

**Mục tiêu:** khung chạy được, chưa có nghiệp vụ.

**Việc cần làm**
- `Router` (FastRoute) + `Request` + `Pipeline` middleware tự viết (nếu chọn Slim thì thay bằng Slim ở bước này).
- `Db` (PDO: `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, tắt emulate prepares, `SET time_zone = '+07:00'`, helper transaction).
- `ApiResponse`, `ApiException(status, code, message, errors[])`, `ErrorHandler` (map exception → envelope; `PDOException` → 500 chung; SQLSTATE 45000 `ROOM_OCCUPIED` → 409; không lộ stack trace).
- `Validator` nhỏ (required, email, int, min, in-list, datetime).
- `CorsMiddleware` theo `ALLOWED_ORIGINS`, xử lý preflight OPTIONS, không dùng `*`.
- `JwtService` (HS256, TTL 2 giờ), `AuthMiddleware` theo mục 5.8 (**nạp lại user từ DB mỗi request**), `RoleMiddleware(roles[])` dùng vai trò từ DB.
- `OwnershipGuard`: `assertOwnsStudio`, `assertOwnsRoom`, `assertOwnsEquipment`, `assertOwnsBooking` (host), `assertBookingOfCustomer`; sai quyền → 403, không tồn tại → 404.
- `AuditLogger::log($userId,$action,$entityType,$entityId,$meta)`.

**Done khi:** route bảo vệ không có token → 401; token sai chữ ký/hết hạn → 401; sai role → 403; user bị khóa hoặc bị đổi role trong DB thì token cũ bị áp dụng trạng thái/role mới ngay ở request kế tiếp; response lỗi luôn có `errors` là mảng; không có stack trace trong body.

```text
Làm Phase 2 theo docs/implementation-plan.md: Router (FastRoute), Request, Pipeline, Db, ApiResponse, ApiException, ErrorHandler, Validator, CorsMiddleware, JwtService, AuthMiddleware (mục 5.8: nạp lại user từ DB mỗi request), RoleMiddleware, OwnershipGuard, AuditLogger. Viết PHPUnit cho JwtService (hết hạn, sai chữ ký) và ErrorHandler (envelope, errors là mảng); viết test tích hợp: khóa user hoặc đổi role trong DB rồi gọi lại bằng token cũ. Chạy test và báo kết quả thật.
```

### Phase 3: Xác thực và tài khoản (S)

**Endpoint:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/profile`, `PATCH /api/auth/profile`.

**Quy tắc**
- Register: bỏ qua mọi trường `role` do client gửi; luôn gán role `customer`. Email trùng → 409. Mật khẩu < 8 ký tự, email sai định dạng, thiếu trường → 400.
- Login: sai email/mật khẩu → 401 (cùng một thông báo, không lộ email tồn tại). Kiểm tra `locked` sau khi mật khẩu đúng → 403. Trả `token` + `user` (role là tên role).
- Logout: yêu cầu token hợp lệ, trả 200, không lưu trạng thái (client xóa token).
- Profile: `GET` trả họ tên, email, số điện thoại, role. `PATCH` cho đổi `full_name`, `phone`; đổi mật khẩu yêu cầu `current_password` + `new_password` (≥ 8 ký tự).

**Done khi:** đăng ký → đăng nhập → gọi profile bằng token thành công; gửi `"role":"admin"` khi đăng ký vẫn ra `customer`; tài khoản `locked` đăng nhập trả 403; T17 pass.

```text
Làm Phase 3 theo docs/implementation-plan.md và docs/3.3-api.md mục 1 (Auth) + PATCH /api/auth/profile ở bảng mục 6. Register phải bỏ qua trường role từ client. Viết test cho các case: email trùng, mật khẩu ngắn, role giả mạo, tài khoản bị khóa, token hết hạn, token cũ sau khi admin khóa hoặc đổi role (T17). Chạy test và báo kết quả.
```

### Phase 4: Danh mục công khai (M)

**Endpoint:** `GET /api/rooms`, `GET /api/rooms/{id}`, `GET /api/rooms/{id}/calendar`, `GET /api/rooms/{id}/rates`, `GET /api/equipments?studio_id=`; bổ sung: `GET /api/space-types`, `GET /api/amenities`.

**Quy tắc**
- `GET /api/rooms`: chỉ phòng `active` của studio `active`. Bộ lọc `keyword`, `space_type_id`, `rate_unit` (mặc định `hour`), `min_price`/`max_price` tính theo `rate_unit` trên bảng giá đang hiệu lực (nhiều bảng giá cùng đơn vị thì lấy giá thấp nhất để hiển thị), `min_area`, `page`, `limit` (mặc định 12, tối đa 50). Có lọc giá mà phòng không có bảng giá cho đơn vị đó → loại. Mỗi phòng trả `display_rate {rate_unit, unit_price}` (null nếu không có), `primary_space_type`, `thumbnail_url` (ảnh `is_primary`), `amenities`. Tránh N+1 truy vấn.
- `GET /api/rooms/{id}`: đủ thông tin theo 3.3.2 mục 2b (ảnh theo `sort_order`, tiện ích, loại hình, bảng giá đang hiệu lực, thông tin studio). Phòng không `active` → 404.
- `GET /api/rooms/{id}/calendar?from=&to=`: chỉ trả các khoảng `[busy_start, busy_end]` của đơn chiếm lịch, không lộ thông tin khách; mặc định 30 ngày tới, tối đa 62 ngày.
- `GET /api/equipments`: thiếu `studio_id` → 400; chỉ thiết bị `active`; kèm tên danh mục.

**Done khi:** tìm kiếm với từng bộ lọc cho kết quả đúng trên seed; phân trang đúng `total_items`/`total_pages`; `inactive` không xuất hiện.

```text
Làm Phase 4 theo docs/implementation-plan.md (mục Phase 4) và docs/3.3-api.md mục 2 và 3a. Dùng JOIN/subquery để tránh N+1, mọi SQL dùng prepared statement. Viết smoke test (curl hoặc PHPUnit) cho từng bộ lọc trên dữ liệu seed và báo kết quả thật.
```

### Phase 5: Quản lý của Host (L)

**Endpoint:** `POST /api/rooms`, `PATCH /api/rooms/{id}`, `POST /api/rooms/{id}/rates`, `PATCH /api/rooms/{id}/rates/{rate_id}`, `POST /api/rooms/{id}/images`, `POST /api/equipments`, `PATCH /api/equipments/{id}`; bổ sung: `GET /api/studios/mine`, `POST /api/studios`, `PATCH /api/studios/{id}`, `GET /api/equipment-categories?studio_id=`, `POST /api/equipment-categories`.

**Quy tắc**
- Mọi endpoint bắt buộc role `host` + `OwnershipGuard` (`studio_id`/`room_id`/`equipment_id` phải thuộc Studio của Host đang đăng nhập → 403).
- `POST /api/rooms`: một transaction chèn `rooms` + `room_space_types` (phần tử đầu là primary) + `room_amenities`; id loại hình/tiện ích không tồn tại → 400. `area`, `capacity` > 0.
- `PATCH /api/rooms/{id}`: không cho đổi `studio_id`; `status` ∈ `active|maintenance|inactive`. Không xóa cứng phòng/thiết bị.
- Rates: `rate_unit` hợp lệ; `unit_minutes` do server gán theo bảng ở mục 2 (client chỉ gửi `unit_minutes` khi `rate_unit = session`, bắt buộc và > 0); `minimum_units` > 0, `maximum_units` ≥ `minimum_units`, `effective_to` ≥ `effective_from`. Sửa bảng giá không ảnh hưởng đơn đã tạo (đơn đã lưu snapshot).
- Images: `multipart/form-data`, kiểm MIME thật bằng `finfo`, tối đa 5 MB, đổi tên ngẫu nhiên; `is_primary = 1` thì bỏ cờ ở ảnh khác của phòng.
- `PATCH /api/equipments/{id}`: giảm `total_quantity` xuống dưới `StockCalculator::peakUsage` của các đơn chiếm lịch trong tương lai (mục 5.9) → 400.

**Done khi:** Host A thao tác trên tài nguyên của Host B nhận 403 ở **mọi** endpoint trên; customer gọi các endpoint này nhận 403; upload file không phải ảnh bị từ chối; tạo bảng giá `month` cho ra `unit_minutes = 43200`, `session` thiếu `unit_minutes` bị 400.

```text
Làm Phase 5 theo docs/implementation-plan.md (Phase 5, mục 2 bảng unit_minutes, mục 5.9) và docs/3.3-api.md mục 2c và 3b/3c. Mọi endpoint phải qua RoleMiddleware('host') và OwnershipGuard. Viết test 403 chéo quyền: host A không được tạo phòng/thiết bị/bảng giá/ảnh trên studio của host B. Chạy test và báo kết quả thật.
```

### Phase 6: Engine đặt phòng (L, rủi ro cao nhất)

**Endpoint:** `POST /api/bookings/check-availability`, `POST /api/bookings`.

**Việc cần làm**
- `PricingService` (mục 5.2) là hàm thuần, PHPUnit đầy đủ: làm tròn 0,5 giờ; `ceil` theo `unit_minutes` cho mọi đơn vị, kể cả `month = 43200`; min/max; thiết bị `session` và `hour` (tính theo thời lượng thật, **không** theo `rental_units`); cọc 30%; `booking_type` suy ra từ `rate_unit`.
- `StockCalculator::peakUsage` (mục 5.9): hàm thuần, PHPUnit có ví dụ 4 đèn và các biến thể (xem T14).
- `AvailabilityService::evaluate($request, bool $locking)` dùng chung cho cả hai endpoint; hàm kiểm tra trùng khoảng ở dạng hàm thuần để test.
- `BookingService::create` đúng 10 bước ở mục 5.3, tuần tự, kể cả `booking_code` tạm ngẫu nhiên.
- `check-availability`: không transaction, không khóa, không ghi; nhận thêm `party_size` tùy chọn.
- Lỗi theo 3.3.2: `rate_id` sai/hết hiệu lực, vượt min/max, thiết bị khác studio, thời gian không hợp lệ, `party_size` > sức chứa → 400; không có phòng → 404; trùng lịch/thiết bị vượt kho → 409 với `errors[]` có `code` là `room_occupied` hoặc `equipment_insufficient`.
- Response 201 có `status`, `created_at`, `expires_at`.

**Done khi:** ví dụ ở mục 5.1 (12:15 bị từ chối, 12:30 được nhận) đúng; T1 đến T4, T10, T11, T14, T15, T18, T23, T25, T27 pass (T1, T2, T15 chạy bằng script đa luồng).

```text
Làm Phase 6 theo docs/implementation-plan.md mục 5.1, 5.2, 5.3, 5.9 và docs/3.3-api.md mục 4 (i)-(vii), 4a, 4b. Làm đúng thứ tự khóa rooms → equipments (id tăng dần) và 10 bước ở mục 5.3, dùng READ COMMITTED, booking_code tạm là TMP-<random>. PricingService, StockCalculator::peakUsage và hàm kiểm tra trùng khoảng phải là hàm thuần có PHPUnit (có ví dụ 4 đèn ở mục 5.9). check-availability dùng AvailabilityService::evaluate với locking=false. Bảng giá chốt theo DATE(start_time) và lưu snapshot (D15). Viết tests/concurrency_test.py (đa luồng, dùng barrier để gửi đồng thời) cho T1, T2, T15. Chạy tất cả và báo kết quả thật, kể cả khi fail.
```

### Phase 7: Vòng đời đơn và thanh toán (M)

**Endpoint:** `PATCH /api/bookings/{id}/status`, `POST /api/bookings/{id}/cancel`, `GET /api/bookings`, `GET /api/bookings/{id}`, `POST /api/bookings/{id}/payments`.

**Quy tắc**
- `BookingStateMachine` là hàm thuần theo bảng ở mục 5.4, PHPUnit bao phủ **mọi** cặp (từ, sang) hợp lệ và không hợp lệ.
- `BookingService`/`PaymentService` luôn khóa dòng booking (`FOR UPDATE`) rồi đọc lại trạng thái và thanh toán trước khi quyết định (mục 4, 5.6).
- `confirmed` cần thanh toán `deposit` hoặc `full` thành công và chưa quá hạn; `completed` cần `paid_total >= total_amount` và gán `completed_at = NOW()` (mục 5.4, D14).
- `GET /api/bookings`: Customer thấy đơn của mình; Host thấy đơn thuộc Studio của mình; lọc `status`, phân trang. `GET /api/bookings/{id}`: kiểm quyền như vậy, kèm chi tiết thiết bị và thanh toán.
- `POST /cancel`: Customer chủ đơn, đơn `pending` hoặc `confirmed`.
- Thanh toán theo mục 5.6; hết hạn theo mục 5.5.
- Mọi thay đổi trạng thái và thanh toán ghi `audit_logs`.
- Hoàn thiện `BookingService::expireIfDue` và `bin/expire-bookings.php` theo mục 5.5: xử lý từng đơn, khóa dòng, ghi `audit_logs` kèm `refund_due` cho mọi chuyển sang `expired`, `cancelled`, `rejected` có thanh toán (kể cả thanh toán `full`).

**Done khi:** luồng đầy đủ qua curl: tạo đơn → trả cọc → Host xác nhận → check-in → trả phần còn lại → hoàn tất; T7 đến T9, T16, T19, T20, T24 pass.

```text
Làm Phase 7 theo docs/implementation-plan.md mục 5.4, 5.5, 5.6 và docs/3.3-api.md mục 4c và mục 6 (list/detail/cancel/payments). BookingStateMachine là hàm thuần, PHPUnit bao phủ mọi cặp trạng thái. Mọi thao tác ghi lên booking phải khóa dòng booking rồi đọc lại thanh toán trong cùng transaction. Cron bin/expire-bookings.php xử lý từng đơn qua BookingService::expireIfDue và ghi audit_logs kèm refund_due (mục 5.5). Viết script e2e cho luồng đầy đủ, luồng quá hạn chưa cọc, luồng đã cọc nhưng Host không phản hồi, luồng thanh toán full mà Host không phản hồi (T24), và script đa luồng cho T16 (hai thanh toán cọc đồng thời). Chạy và báo kết quả thật.
```

### Phase 8: Quản trị và thống kê (S/M)

**Endpoint:** `GET /api/admin/users`, `PATCH /api/admin/users/{id}/status`, `PATCH /api/admin/users/{id}/role`, `GET /api/admin/statistics`, `GET /api/host/statistics`.

**Quy tắc**
- Chỉ role `admin`. Không cho admin khóa chính mình. `role` chỉ nhận `host` hoặc `customer` (không cấp `admin` qua API).
- Thống kê theo mục 5.7: kỳ nửa mở `[from, to)`, có `period` trong response; `total_revenue` phân kỳ theo `completed_at`; `occupancy_rate` chỉ tính phần giờ nằm trong kỳ. PHPUnit cho `occupancy_rate` với dữ liệu nhỏ tính tay được, gồm đơn vắt qua ranh giới kỳ (T26); test đối chiếu doanh thu (T20).
- Host statistics chỉ gộp dữ liệu thuộc Studio của Host đó.

**Done khi:** số liệu khớp dữ liệu seed đã tính tay; customer/host gọi `/api/admin/*` nhận 403; T17 vẫn pass sau khi admin đổi role; T26 pass.

```text
Làm Phase 8 theo docs/implementation-plan.md mục 5.7 và docs/3.3-api.md mục 5 (a-d) + GET /api/host/statistics. Viết test với dữ liệu nhỏ tính tay được cho total_revenue và occupancy_rate, và test đối chiếu Σ payments success = Σ total_amount của đơn completed. Kỳ là nửa mở [from, to), doanh thu phân kỳ theo completed_at, occupancy chỉ tính phần giờ nằm trong kỳ; viết test T26 (đơn vắt qua ranh giới kỳ, ranh giới completed_at, from >= to trả 400). Chạy test và báo kết quả thật.
```

### Phase 9: Hoàn thiện, kiểm thử, triển khai (M)

**Việc cần làm**
- `openapi.yaml` (OpenAPI 3.0) khớp envelope và `errors[]`; chạy Swagger UI (image `swaggerapi/swagger-ui` trỏ tới file).
- Postman collection: mỗi endpoint ít nhất 1 case thành công + các mã lỗi chính; biến môi trường `base_url`, `token`. Có test script (`pm.test`) thì ghi là kiểm thử tự động, chỉ gửi tay thì ghi là thủ công.
- Chạy đầy đủ mục 8 (T1 đến T27), lưu kết quả (log/ảnh chụp) làm minh chứng cho 3.3.3.
- Rà bảo mật: CORS đúng origin, không secret trong code/`NEXT_PUBLIC_*`, tài khoản MySQL không dùng root, lỗi 500 không lộ chi tiết, `--fresh` bị chặn ngoài dev/test.
- README: cách chạy, tài khoản dev, biến môi trường; cron `bin/expire-bookings.php`.
- (Nếu triển khai) hướng dẫn LAMP trên VPS với MySQL ≥ 8.0.16, HTTPS, MySQL không mở cổng ra Internet.
- Đồng bộ ngược vào báo cáo theo mục 11.

**Done khi:** mọi test ở mục 8 pass; bảng "Trạng thái" ở 3.3.3 được cập nhật ("Đã triển khai" kèm minh chứng cho những gì đã làm thật).

```text
Làm Phase 9 theo docs/implementation-plan.md: tạo openapi.yaml khớp 3.3.2 (envelope, errors là mảng), Postman collection có test script, README (kèm cách chạy cron expire). Chạy toàn bộ T1-T27 và lập bảng kết quả. Rà soát bảo mật theo mục 3 của 3.3.1 và liệt kê điểm nào chưa đạt. Không tự khẳng định đã pass nếu chưa chạy.
```

---

## 7. Bảng endpoint ↔ phase

| Endpoint | Quyền | Kiểm tra sở hữu | Phase |
| --- | --- | --- | --- |
| `GET /api/health` | Công khai | | 0 |
| `POST /api/auth/register` | Công khai | | 3 |
| `POST /api/auth/login` | Công khai | | 3 |
| `POST /api/auth/logout` | Đã đăng nhập | | 3 |
| `GET /api/auth/profile` | Đã đăng nhập | | 3 |
| `PATCH /api/auth/profile` | Đã đăng nhập | | 3 |
| `GET /api/rooms` | Công khai | | 4 |
| `GET /api/rooms/{id}` | Công khai | | 4 |
| `GET /api/rooms/{id}/calendar` | Công khai | | 4 |
| `GET /api/rooms/{id}/rates` | Công khai | | 4 |
| `GET /api/equipments?studio_id=` | Công khai | | 4 |
| `GET /api/space-types`, `GET /api/amenities` (bổ sung) | Công khai | | 4 |
| `POST /api/rooms` | host | `studio_id` | 5 |
| `PATCH /api/rooms/{id}` | host | phòng | 5 |
| `POST /api/rooms/{id}/rates` | host | phòng | 5 |
| `PATCH /api/rooms/{id}/rates/{rate_id}` | host | phòng + rate thuộc phòng | 5 |
| `POST /api/rooms/{id}/images` | host | phòng | 5 |
| `POST /api/equipments` | host | `studio_id` | 5 |
| `PATCH /api/equipments/{id}` | host | thiết bị | 5 |
| `GET /api/studios/mine`, `POST /api/studios`, `PATCH /api/studios/{id}` (bổ sung) | host | studio | 5 |
| `GET/POST /api/equipment-categories` (bổ sung) | host | `studio_id` | 5 |
| `POST /api/bookings/check-availability` | Công khai | | 6 |
| `POST /api/bookings` | customer | | 6 |
| `PATCH /api/bookings/{id}/status` | host | đơn thuộc studio của host | 7 |
| `POST /api/bookings/{id}/cancel` | customer | đơn của chính mình | 7 |
| `GET /api/bookings`, `GET /api/bookings/{id}` | customer, host | đơn của mình / của studio mình | 7 |
| `POST /api/bookings/{id}/payments` | customer | đơn của chính mình | 7 |
| `GET /api/admin/users` | admin | | 8 |
| `PATCH /api/admin/users/{id}/status` | admin | | 8 |
| `PATCH /api/admin/users/{id}/role` | admin | | 8 |
| `GET /api/admin/statistics` | admin | | 8 |
| `GET /api/host/statistics` | host | studio của host | 8 |

Các endpoint ghi "bổ sung" chưa có trong 3.3.2; nếu thêm thì cập nhật báo cáo ở mục 6 của 3.3.2.

---

## 8. Kịch bản kiểm thử bắt buộc

| # | Kịch bản | Kết quả đúng |
| --- | --- | --- |
| T1 | 2 yêu cầu **đồng thời** đặt cùng phòng, cùng khung giờ | Đúng 1 yêu cầu 201, yêu cầu còn lại 409 `room_occupied` |
| T2 | Tồn kho thiết bị = 2; 2 yêu cầu đồng thời ở **2 phòng khác nhau** (cùng studio), mỗi yêu cầu xin 2 thiết bị đó | Đúng 1 yêu cầu thành công, yêu cầu kia 409 `equipment_insufficient` |
| T3 | Đơn cũ 09:00 đến 12:00; đặt mới bắt đầu 12:15 / 12:30 | 12:15 bị 409; 12:30 được 201 |
| T4 | Đặt mới kết thúc 08:30 trước đơn bắt đầu 09:00 | 201 (08:30 + 30 phút = 09:00, không giao) |
| T5 | Host A gọi API ghi trên phòng/thiết bị/đơn của Host B | 403 ở mọi endpoint ghi |
| T6 | Đăng ký kèm `"role":"admin"` | Tài khoản có role `customer` |
| T7 | Đơn `pending` chưa cọc quá `HOLD_MINUTES` | Chuyển `expired`; phòng đặt lại được; `audit_logs` có `refund_due = 0` |
| T8 | Host xác nhận đơn chưa cọc | 400 `deposit_required` |
| T9 | Chuyển trạng thái `cancelled → completed` | 400 |
| T10 | Thiết bị thuộc studio khác với phòng được đặt | 400 |
| T11 | `rate_id` thuộc phòng khác hoặc đã `inactive`/hết hiệu lực | 400 |
| T12 | Token hết hạn / sai chữ ký | 401 |
| T13 | Mọi response lỗi | Có `errors` là mảng, không lộ stack trace/SQL |
| T14 | **Tồn kho theo khoảng không đồng nhất**, kho 4 đèn: A 09:00 đến 10:00 (2), B 11:00 đến 12:00 (2). Đặt mới 09:30 đến 11:30 xin 2 đèn. Biến thể: xin 3 đèn; thêm C 09:45 đến 10:15 (1) rồi xin 2 đèn | Xin 2 đèn: 201. Xin 3 đèn: 409 (mức dùng đồng thời cao nhất 2 + 3 > 4). Với C: 409 (3 + 2 > 4). Phải có thêm PHPUnit cho `peakUsage` với đúng các số liệu này |
| T15 | **≥ 10 yêu cầu tạo đơn đồng thời ở nhiều phòng khác nhau** | Không có lỗi UNIQUE `booking_code`; mọi mã có dạng `BK-YYYYMMDD-NNNN`; không còn mã `TMP-` |
| T16 | **Hai yêu cầu thanh toán cọc đồng thời** cho cùng một đơn | Đúng 1 giao dịch `success`; yêu cầu còn lại 409 `payment_duplicate`; bảng `payments` chỉ có 1 dòng `success` |
| T17 | Admin khóa user hoặc đổi role, rồi gọi API bằng token cũ | Bị 403 `account_locked`, hoặc quyền mới áp dụng ngay (vd Host bị hạ thành customer thì mất quyền Host) |
| T18 | **Đơn dài hạn:** thuê bảng giá `month` kèm thiết bị `pricing_unit = hour` | `booking_type = long_term`; `rental_units = ceil(phút / 43200)`; tiền thiết bị = `quantity × unit_price × equipment_hours` theo thời lượng thật |
| T19 | Đơn đã cọc (`deposit`), Host không phản hồi trong `HOST_RESPONSE_HOURS` | Chuyển `expired`; phòng giải phóng; `audit_logs` có `booking_expired` với `reason = host_no_response` và `refund_due` = số tiền cọc |
| T20 | Host `completed` khi chưa trả đủ; sau đó trả `remaining` | Trước: 400 `payment_incomplete`; sau: 200 và `completed_at` được gán. Đối chiếu `Σ payments success = Σ total_amount` của các đơn `completed` trong kỳ (phân kỳ theo `completed_at`) |
| T21 | `migrate.php --fresh` với `APP_ENV=production` hoặc `DB_NAME` không kết thúc `_dev`/`_test` | Bị từ chối, mã thoát khác 0, dữ liệu không đổi |
| T22 | Sau `migrate.php` qua PDO | Có đúng 16 bảng và 2 trigger; `SELECT VERSION()` ≥ 8.0.16; chèn dòng vi phạm `CHECK` bị từ chối, gồm đơn `pending` không có `expires_at` và đơn `completed` không có `completed_at` |
| T23 | `check-availability` | Số dòng `bookings` không đổi; 2 yêu cầu song song không chờ khóa của nhau; có `party_size` > sức chứa thì trả 400 |
| T24 | **Cron hết hạn nhiều loại:** đơn A chưa thanh toán quá `HOLD_MINUTES`; đơn B đã `deposit`, Host không phản hồi; đơn C đã thanh toán `full`, Host không phản hồi. Chạy `bin/expire-bookings.php` | Cả 3 đơn thành `expired`, mỗi đơn đúng 1 dòng audit `booking_expired`. A: `reason = unpaid_hold_timeout`, `refund_due = 0`. B: `reason = host_no_response`, `refund_due = deposit_amount`. C: `refund_due = total_amount`, `payments` liệt kê đúng giao dịch `full`. Chạy lần 2 không tạo thêm log; một đơn lỗi không chặn các đơn còn lại |
| T25 | **`pending` luôn có hạn:** chèn trực tiếp đơn `pending` với `expires_at = NULL`; đơn `pending` đã quá hạn nhưng cron chưa chạy | Chèn bị `CHECK` từ chối; đơn quá hạn không chặn đặt mới (cả trigger lẫn `evaluate` đều dùng `expires_at > NOW()`) |
| T26 | **Kỳ thống kê** `[2026-10-01, 2026-11-01)`: đơn A `confirmed` 31/10 20:00 đến 01/11 02:00; đơn B `completed` có `completed_at = 2026-10-31 23:59:59`; đơn C `completed` có `completed_at = 2026-11-01 00:00:00` | `occupancy_rate` chỉ tính 4 giờ của A; B vào doanh thu tháng 10, C không (thuộc tháng 11); `from >= to` trả 400 |
| T27 | **Hiệu lực bảng giá với đơn dài hạn:** bảng giá `month` có `effective_to = 2026-10-31`; đặt 30 ngày bắt đầu 30/10; sau đó đặt thử bắt đầu 01/11; cuối cùng Host sửa giá hoặc ngừng bảng giá | Bắt đầu 30/10: 201 với giá chốt theo ngày bắt đầu. Bắt đầu 01/11: 400 (hết hiệu lực tại ngày bắt đầu). Sau khi Host đổi/ngừng bảng giá, `room_unit_price` và `total_amount` của đơn cũ không đổi |

T1, T2, T15, T16 phải chạy bằng script đa luồng (Postman Runner chạy tuần tự nên không chứng minh được đồng thời).

---

## 9. Nếu kẹt deadline (thứ tự cắt giảm)

Giữ chắc: Phase 0 đến 3, Phase 4 (không cần `calendar`), Phase 6, Phase 7 (`status` + `cancel` + `GET /bookings` + payments), kịch bản T1 đến T6, T14, T16.

Có thể cắt hoặc làm sau: upload ảnh, `GET/POST /api/studios` bổ sung (seed sẵn studio cho host), `PATCH /api/admin/users/{id}/role` (gán host bằng SQL), `GET /api/host/statistics`, đổi mật khẩu, kiểm tra giảm `total_quantity`, deploy VPS. Mỗi thứ cắt thì ghi rõ vào 3.3.3 là "Đã thiết kế, chưa triển khai".

---

## 10. Rủi ro hay gặp khi vibe code

- AI bỏ qua `OwnershipGuard` ở một endpoint: chạy T5 sau mỗi phase có endpoint ghi.
- AI "tối ưu" bằng cách bỏ khóa hoặc đổi thứ tự khóa: giữ đúng mục 5.3; chỉ chấp nhận thay đổi khi T1/T2 vẫn pass nhiều lần liên tiếp.
- AI cộng dồn số lượng thiết bị thay vì dùng `peakUsage`: chạy T14.
- AI nhân giá thiết bị theo `rental_units` của phòng: chạy T18.
- AI copy nguyên `DELIMITER $$` vào file trigger: `migrate.php` sẽ lỗi; chạy T22.
- AI cho Host `completed` hoặc `confirmed` mà không kiểm tra thanh toán: chạy T8, T20.
- AI viết cron thành một câu `UPDATE` hàng loạt (không có audit log, không khóa từng đơn) hoặc chỉ ghi hoàn cọc cho `deposit`: chạy T24.
- AI cho phép `pending` không có `expires_at`, hoặc coi `expires_at IS NULL` là đang chiếm lịch: chạy T25.
- AI tính thống kê theo kỳ đóng `[from, to]`, phân kỳ doanh thu theo `start_time`, hoặc tính nguyên đơn vắt qua ranh giới kỳ: chạy T26.
- AI kiểm tra `effective_to` theo ngày kết thúc thuê thay vì ngày bắt đầu: chạy T27.
- AI đặt `booking_code` tạm cố định: chạy T15.
- Múi giờ lệch giữa PHP, MySQL và Docker: `SELECT NOW()` trong PHP và trong MySQL phải cùng giờ VN.
- Kiểm trùng bằng SELECT thường rồi INSERT mà không khóa: sẽ đặt trùng khi đồng thời. Trigger chỉ là lớp dự phòng.
- Tên bảng hoa/thường sai (`BOOKINGS` so với `bookings`): chạy trên Linux sẽ lỗi.
- AI tự bịa endpoint hoặc trường: nhắc lại "không thêm ngoài tài liệu"; diff `openapi.yaml` với 3.3.2.
- Tự báo "đã pass" mà chưa chạy: luôn yêu cầu dán kết quả lệnh thật.

---

## 11. Đồng bộ ngược vào báo cáo (khi chốt plan)

Plan này thay đổi vài quy tắc so với văn bản hiện tại của 3.2 và 3.3, cần sửa lại để báo cáo không mâu thuẫn với code:

- **3.2:** áp D1 đến D15 (trạng thái mới, `expires_at` kèm `CHECK` đơn `pending` phải có hạn, `completed_at`, `unit_minutes`, `pricing_unit`, chỉ mục, trigger viết lại, yêu cầu MySQL ≥ 8.0.16, `booking_type` do server suy ra, chính sách giá chốt theo ngày bắt đầu).
- **3.3.1:** nếu chọn PHP thuần + FastRoute thì ghi vào phần công nghệ; sửa dòng "Máy chủ không lưu phiên đăng nhập": middleware nạp lại user từ DB ở mỗi request nên khóa tài khoản và đổi vai trò có hiệu lực ngay; đăng xuất vẫn chỉ do client xóa token.
- **3.3.2 mục 4 (iii):** `confirmed` cần có cọc (hoặc trả đủ); `completed` cần thanh toán đủ.
- **3.3.2 mục 4 (iv):** hạn giữ chỗ: chưa cọc 15 phút; đã cọc thì Host có `HOST_RESPONSE_HOURS` (mặc định 24 giờ) để phản hồi, quá hạn thì `expired`; đơn `pending` luôn có `expires_at`. Khi hết hạn, hủy hoặc từ chối mà đã thanh toán thì ghi nhận khoản cần hoàn trong nhật ký (chưa hoàn tiền thật).
- **3.3.2 mục 4 (v):** thêm bảng `unit_minutes`; tiền thiết bị theo giờ tính theo thời lượng thật; `booking_type`; giá chốt theo ngày bắt đầu thuê và lưu snapshot (D15).
- **3.3.2 mục 4a:** `check-availability` nhận `party_size` tùy chọn.
- **3.3.2 mục 5c:** kỳ nửa mở `[from, to)` (ví dụ tháng 10/2026: `from = 2026-10-01`, `to = 2026-11-01`); `total_revenue` phân kỳ theo `completed_at` và là tổng đơn `completed` (đã thu đủ); `occupancy_rate` chỉ tính phần giờ nằm trong kỳ.
- **3.3.2 mục 6:** thêm các endpoint bổ sung và mô tả thanh toán `deposit` / `full` / `remaining`.
- **3.3.3:** cập nhật hạn chế token: đăng xuất không thu hồi token; khóa/đổi vai trò thì áp dụng ngay.
