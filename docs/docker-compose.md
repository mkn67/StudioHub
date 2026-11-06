# Chạy StudioHub bằng Docker Compose

Yêu cầu Docker Desktop với Docker Compose hiện đại (hỗ trợ `env_file.required`, Compose ≥2.24), hoặc Podman cùng `podman-compose`, và Node.js để tạo cấu hình lần đầu. Chạy tại thư mục gốc repo:

```powershell
node scripts/setup-docker.mjs
docker compose config --quiet
docker compose up -d --build
docker compose ps -a
```

Nếu dùng Podman, thay `docker compose` bằng `podman-compose` trong các lệnh khởi động và kiểm tra. Ví dụ: `podman-compose up -d --build` rồi `podman-compose ps`.

Script tạo `.env` gốc với JWT secret và bridge secret ngẫu nhiên, không ghi đè file đã tồn tại và không in secret. Không dùng `docker compose config` không có `--quiet` khi chia sẻ log vì output có thể chứa secret đã nội suy.

| Dịch vụ | Địa chỉ mặc định |
|---|---|
| Frontend | http://localhost:3000 |
| PHP API health | http://localhost:8000/api/health |
| Helpdesk health | http://localhost:8010/health |
| MySQL cho công cụ trên máy host | 127.0.0.1:3307 |

Các cổng chỉ bind vào loopback cho môi trường local. Đổi cổng trong `.env`; khi `NEXT_PUBLIC_API_URL` và `FRONTEND_ORIGIN` để trống hoặc không khai báo, chúng tự dùng `http://localhost:${API_PORT}` và `http://localhost:${CLIENT_PORT}` (mặc định 8000 và 3000). Nếu `.env` cũ đã gán URL cụ thể, xóa giá trị để dùng mặc định theo cổng, hoặc cập nhật URL đó khi đổi cổng. URL API công khai được nhúng khi build client nên cần chạy lại `docker compose up -d --build client` sau khi đổi cổng API hoặc URL đó.

## Thứ tự khởi động và dữ liệu

- `api-deps` cài dependency bằng Composer từ lockfile vào volume Linux `api_vendor`. Source `server/` được mount chỉ đọc; uploads công khai và tài liệu riêng tư dùng hai volume riêng (`api_uploads`, `api_private`).
- `db` phải thực hiện được `SELECT 1` bằng tài khoản ứng dụng trước khi tiếp tục.
- `db-init` chạy `server/bin/init-db.php`, chỉ gọi migrator/seed hiện có nếu database **chưa có bảng nào**. Nếu đã có bảng, giữ nguyên dữ liệu và bỏ qua tự migrate/seed, kể cả khi schema chưa đầy đủ. Không có `--fresh`, drop hoặc truncate trong Compose.
- Với database đã có dữ liệu, sau khi kiểm tra migration và sao lưu, chạy `docker compose --profile maintenance run --rm db-upgrade` để áp dụng các SQL migration còn thiếu. Service này không tạo lại schema gốc hoặc chạy seed, và được khóa để tránh hai tiến trình migration cùng chạy. MySQL DDL có thể tự commit từng câu lệnh; nếu migration thất bại giữa chừng, kiểm tra trạng thái schema trước khi chạy lại.
- `api` đợi khởi tạo xong; healthcheck xác minh PHP HTTP và MySQL qua `/api/health`. `cron` đợi API khỏe rồi xử lý đơn hết hạn mỗi 60 giây.
- `helpdesk-init` tạo bảng SQLite bằng migrator hiện có dưới user `www-data`, dùng volume `helpdesk_data`; sau đó `helpdesk-php` mới chạy HTTP.
- `client` dùng production Dockerfile, không bind mount `node_modules`/`.next` Windows. Nó khởi động độc lập để Podman Compose không cố chạy lại các job khởi tạo đã hoàn tất; API được gọi sau khi trang tải.
- `helpdesk-php` có healthcheck khai báo trực tiếp trong Compose để cả Docker Compose và Podman Compose đều thấy trạng thái healthy trước khi khởi động client. Image vẫn có healthcheck riêng khi chạy độc lập.
- Các service khởi tạo kết thúc ở trạng thái `Exited (0)` là bình thường; chúng không phải web server.

Tên project mặc định `studiohub` giữ lại volume MySQL hiện có `studiohub_mysqldata`. Credential MySQL mặc định giữ tương thích cấu hình cũ, chỉ dành cho local. Volume đã có dữ liệu vẫn dùng mật khẩu cũ; đổi mật khẩu trong `.env` không tự đổi mật khẩu bên trong MySQL.

Uploads có sẵn trong `server/public/uploads` không được tự sao chép sang volume mới. Nếu cần chúng trong container, sao chép có chọn lọc sau khi kiểm tra dữ liệu; Compose không di chuyển/xóa file gốc. Những sửa đổi source PHP trên host vẫn được container nhìn thấy qua mount chỉ đọc.

Tệp dự án, giấy tờ xác minh và PDF hợp đồng nằm ở `/var/www/html/storage` trong volume `api_private`, ngoài Apache DocumentRoot. Khi sao lưu/khôi phục, giữ volume này cùng với MySQL vì database chỉ lưu khóa tệp. PHP nhận multipart tối đa 8 MiB mỗi file (ảnh nghiệp vụ vẫn giới hạn 5 MiB); file dự án lớn hơn có thể gửi qua `PUT`.

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

Ngày 06/11/2026, `podman-compose up -d client` đã chạy xong sau khi khai báo healthcheck Helpdesk trực tiếp trong Compose. Trước đó client kẹt ở `Created`: image Helpdesk trên máy không có healthcheck, nên Podman Compose chờ `service_healthy` mãi. Lần kiểm tra đầu còn phát hiện `$body` trong lệnh PHP bị Compose nội suy thành chuỗi rỗng; lệnh hiện tại không dùng biến shell/PHP để tránh lỗi này. Kết quả sau sửa: `client` đang chạy, Helpdesk/API/MySQL `healthy`; HTTP trang chủ, `/api/health` và Helpdesk `/health` đều trả 200. User `www-data` trong API ghi được vào volume uploads và private storage. Chưa xác minh toàn bộ luồng booking/thanh toán hoặc chạy `db-upgrade` trên database hiện có.

Phần dưới là kết quả của lần chạy Compose trước các thay đổi container ngày 06/11/2026.

Compose đã qua `docker compose config --quiet`. Kiểm thử frontend/bridge: 136 test đạt, typecheck và lint đạt. Các image API, Helpdesk và client đã build thành công. Client dùng Node 24 Debian để khớp gói SWC Linux trong lockfile; không sửa dependency để chạy Alpine.

Đã xác minh bằng dịch vụ thật: frontend HTTP 200, API/MySQL health HTTP 200, danh mục trả 4 phòng, đăng nhập khách mẫu và GET profile bằng JWT thành công, Helpdesk health HTTP 200, bridge tạo hội thoại khách HTTP 201 và đọc lại lịch sử HTTP 200. Chromium tải trang chủ với 3 thẻ phòng từ API, mở chi tiết và form đặt thuê không có lỗi JavaScript chưa xử lý. Không tạo đơn/thanh toán trong smoke test Compose.

Trạng thái cuối: `db`, `api`, `helpdesk-php`, `client` đều `healthy`; `cron` đang chạy; ba service khởi tạo đều kết thúc thành công. Lần khởi động lại ghi `Existing database detected; automatic migration and seeding skipped.` Database ban đầu trống được khởi tạo bằng migrator hiện có với 16 bảng và 2 trigger; không reset volume. Stack được để chạy tại các địa chỉ phía trên.

Smoke test Helpdesk chỉ tạo hội thoại kiểm thử cục bộ, không gọi model hay gửi chat ra provider. Bridge có kiểm thử riêng cho hostname Docker chính xác và GET cùng origin khi Next.js tái dựng URL nội bộ. Healthcheck/khởi chạy không đồng nghĩa đã xác minh toàn bộ quy tắc đặt thuê, thanh toán hoặc chất lượng AI.
