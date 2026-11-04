# Chạy StudioHub bằng Docker Compose

Yêu cầu Docker Desktop đang chạy Linux containers, Docker Compose hiện đại (hỗ trợ `env_file.required`, Compose ≥2.24) và Node.js để tạo cấu hình lần đầu. Chạy tại thư mục gốc repo:

```powershell
node scripts/setup-docker.mjs
docker compose config --quiet
docker compose up -d --build
docker compose ps -a
```

Script tạo `.env` gốc với JWT secret và bridge secret ngẫu nhiên, không ghi đè file đã tồn tại và không in secret. Không dùng `docker compose config` không có `--quiet` khi chia sẻ log vì output có thể chứa secret đã nội suy.

| Dịch vụ | Địa chỉ mặc định |
|---|---|
| Frontend | http://localhost:3000 |
| PHP API health | http://localhost:8000/api/health |
| Helpdesk health | http://localhost:8010/health |
| MySQL cho công cụ trên máy host | 127.0.0.1:3307 |

Các cổng chỉ bind vào loopback cho môi trường local. Đổi cổng trong `.env`; khi `NEXT_PUBLIC_API_URL` và `FRONTEND_ORIGIN` để trống hoặc không khai báo, chúng tự dùng `http://localhost:${API_PORT}` và `http://localhost:${CLIENT_PORT}` (mặc định 8000 và 3000). Nếu `.env` cũ đã gán URL cụ thể, xóa giá trị để dùng mặc định theo cổng, hoặc cập nhật URL đó khi đổi cổng. URL API công khai được nhúng khi build client nên cần chạy lại `docker compose up -d --build client` sau khi đổi cổng API hoặc URL đó.

## Thứ tự khởi động và dữ liệu

- `api-deps` cài dependency bằng Composer từ lockfile vào volume Linux `api_vendor`. Source `server/` được mount chỉ đọc; uploads dùng volume riêng.
- `db` phải thực hiện được `SELECT 1` bằng tài khoản ứng dụng trước khi tiếp tục.
- `db-init` chạy `server/bin/init-db.php`, chỉ gọi migrator/seed hiện có nếu database **chưa có bảng nào**. Nếu đã có bảng, giữ nguyên dữ liệu và bỏ qua tự migrate/seed, kể cả khi schema chưa đầy đủ. Không có `--fresh`, drop hoặc truncate trong Compose.
- `api` đợi khởi tạo xong; healthcheck xác minh PHP HTTP và MySQL qua `/api/health`. `cron` đợi API khỏe rồi xử lý đơn hết hạn mỗi 60 giây.
- `helpdesk-init` tạo bảng SQLite bằng migrator hiện có dưới user `www-data`, dùng volume `helpdesk_data`; sau đó `helpdesk-php` mới chạy HTTP.
- `client` dùng production Dockerfile, không bind mount `node_modules`/`.next` Windows; đợi API và Helpdesk healthy.
- Healthcheck của `helpdesk-php` được kế thừa từ `helpdesk-php/Dockerfile` và kiểm tra `/health`; không cần khai báo lặp lại trong Compose.
- Các service khởi tạo kết thúc ở trạng thái `Exited (0)` là bình thường; chúng không phải web server.

Tên project mặc định `studiohub` giữ lại volume MySQL hiện có `studiohub_mysqldata`. Credential MySQL mặc định giữ tương thích cấu hình cũ, chỉ dành cho local. Volume đã có dữ liệu vẫn dùng mật khẩu cũ; đổi mật khẩu trong `.env` không tự đổi mật khẩu bên trong MySQL.

Uploads có sẵn trong `server/public/uploads` không được tự sao chép sang volume mới. Nếu cần chúng trong container, sao chép có chọn lọc sau khi kiểm tra dữ liệu; Compose không di chuyển/xóa file gốc. Những sửa đổi source PHP trên host vẫn được container nhìn thấy qua mount chỉ đọc.

## Helpdesk và gateway AI

`helpdesk-php/.env` được nạp nếu tồn tại để giữ API key/model và các tùy chọn Helpdesk hiện có. Compose ghi đè các địa chỉ container, database Helpdesk, origin và bridge secret chung. Không sửa hoặc in nội dung file môi trường thực.

Trong Docker network:

- Next.js → Helpdesk: `http://helpdesk-php` (cổng 80).
- Helpdesk → API: `http://api/api`.
- Gateway chạy trên host: mặc định `http://host.docker.internal:20128/v1`; chỉnh `NINEROUTER_BASE_URL` ở `.env` gốc khi cần.

Bridge Next.js chỉ cho phép HTTP ngoài loopback với hostname server cấu hình tường minh trong `HELPDESK_HTTP_HOSTS=helpdesk-php`. URL/host từ request người dùng không thể bật quyền này. PHP nghiệp vụ không thay đổi.

Web/API/Helpdesk có thể healthy khi gateway/model chưa cấu hình; đó là health của process/storage, không phải xác nhận AI trả lời được. Không có key/model giả, không tự gửi chat có tính phí và không tự phê duyệt tài liệu tri thức. Nếu chưa có `helpdesk-php/.env`, tạo từ `.env.example` của module rồi điền key/model thật khi muốn dùng AI.

## Chẩn đoán

```powershell
docker compose logs --tail=100 api-deps db-init helpdesk-init
docker compose logs --tail=100 api cron helpdesk-php client
docker compose up -d
docker compose stop
```

Nếu Composer thay đổi dependency trong lockfile, chạy lại `docker compose run --rm api-deps` trước khi restart API/cron. Nếu database hiện có thiếu bảng/cột, `db-init` không cố sửa hay reseed; kiểm tra và chạy migration phù hợp có chủ đích theo `server/README.md`.

Không dùng `docker compose down -v` để xử lý lỗi khởi động vì lệnh đó xóa volume dữ liệu. Kiểm tra kết quả thực tế của lần triển khai trong phần ghi nhận bên dưới.

## Ghi nhận xác minh

Compose đã qua `docker compose config --quiet`. Kiểm thử frontend/bridge: 136 test đạt, typecheck và lint đạt. Các image API, Helpdesk và client đã build thành công. Client dùng Node 24 Debian để khớp gói SWC Linux trong lockfile; không sửa dependency để chạy Alpine.

Đã xác minh bằng dịch vụ thật: frontend HTTP 200, API/MySQL health HTTP 200, danh mục trả 4 phòng, đăng nhập khách mẫu và GET profile bằng JWT thành công, Helpdesk health HTTP 200, bridge tạo hội thoại khách HTTP 201 và đọc lại lịch sử HTTP 200. Chromium tải trang chủ với 3 thẻ phòng từ API, mở chi tiết và form đặt thuê không có lỗi JavaScript chưa xử lý. Không tạo đơn/thanh toán trong smoke test Compose.

Trạng thái cuối: `db`, `api`, `helpdesk-php`, `client` đều `healthy`; `cron` đang chạy; ba service khởi tạo đều kết thúc thành công. Lần khởi động lại ghi `Existing database detected; automatic migration and seeding skipped.` Database ban đầu trống được khởi tạo bằng migrator hiện có với 16 bảng và 2 trigger; không reset volume. Stack được để chạy tại các địa chỉ phía trên.

Smoke test Helpdesk chỉ tạo hội thoại kiểm thử cục bộ, không gọi model hay gửi chat ra provider. Bridge có kiểm thử riêng cho hostname Docker chính xác và GET cùng origin khi Next.js tái dựng URL nội bộ. Healthcheck/khởi chạy không đồng nghĩa đã xác minh toàn bộ quy tắc đặt thuê, thanh toán hoặc chất lượng AI.
