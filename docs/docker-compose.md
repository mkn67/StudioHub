# Khởi chạy StudioHub bằng Podman Compose hoặc Docker Compose

Chạy từ thư mục gốc repo. Node.js chỉ cần để tạo file cấu hình local lần đầu.

```sh
node scripts/setup-docker.mjs
podman-compose --env-file .env.compose up -d --build
podman-compose --env-file .env.compose ps
```

Với Docker, thay `podman-compose` bằng `docker compose`.

## Tách cấu hình local khỏi Aiven

Script tạo `.env.compose` với secret random cho local và không ghi đè `.env` gốc hay `server/.env`. Compose chỉ lấy các biến `LOCAL_*` từ `.env.compose`; vì vậy cấu hình Aiven trong `.env`/`server/.env` không bị dùng nhầm cho MySQL local. File `.env.compose` đã được Git ignore.

Nếu `.env.compose` đã tồn tại, script giữ nguyên. Không xóa file này nếu muốn giữ cấu hình hiện tại; chỉnh riêng các biến local bên trong khi cần.

| Dịch vụ | Địa chỉ mặc định |
|---|---|
| Frontend | http://localhost:3000 |
| API health | http://localhost:8000/api/health |
| Helpdesk health | http://localhost:8010/health |
| MySQL cho công cụ host | 127.0.0.1:3307 |

Đổi cổng qua `LOCAL_CLIENT_PORT`, `LOCAL_API_PORT`, `LOCAL_HELPDESK_PORT` và `LOCAL_DB_PORT`. Nếu đổi API port, build lại client vì URL media được nhúng vào image frontend.

## Thứ tự khởi động và bảo toàn dữ liệu

- MySQL dùng volume `studiohub_mysqldata` để giữ dữ liệu qua lần recreate.
- API chờ MySQL healthy, sau đó chạy Composer, `bin/init.php --apply --seed`, các PHP/SQL migration, seed booking mẫu có điều kiện rồi mới mở Apache.
- `init.php` chỉ tạo schema nền khi DB rỗng; DB đã có bảng người dùng thì giữ nguyên và migration bổ sung schema còn thiếu. Seed account chỉ chạy cho DB mới/rỗng; catalog seed an toàn khi chạy lại.
- Helpdesk tự chạy migration phần dữ liệu Helpdesk khi container start. Mặc định local dùng SQLite trong volume riêng `studiohub_helpdesk_data`; Render có thể chuyển sang MySQL bằng DSN hoặc `HELPDESK_DB_HOST/PORT/NAME`.
- Client gọi API nghiệp vụ qua Next.js same-origin BFF. JWT được giữ trong cookie HttpOnly, không đưa vào localStorage hay JSON gửi về trình duyệt.
- Không cần service job kết thúc thành công để khởi động các service khác; cách này tương thích với Podman Compose.

Lệnh chạy lại an toàn:

```sh
podman-compose --env-file .env.compose up -d --build
```

Migration là bổ sung và seed lặp lại không tạo bản ghi catalog trùng. Không chạy `down -v` nếu cần giữ database, uploads, tài liệu hoặc Helpdesk.

## Kiểm tra nhanh

```sh
podman-compose --env-file .env.compose ps
podman-compose --env-file .env.compose logs --tail=100 api helpdesk-php client
curl -i http://localhost:8000/api/health
curl -i http://localhost:8010/health
```

Các cổng được bind vào loopback. Các health endpoint xác nhận dịch vụ và database hoạt động; chúng không khẳng định gateway/model AI đã được cấu hình.

## Helpdesk và gateway AI

Helpdesk local dùng SQLite riêng. Nếu có `helpdesk-php/.env`, Compose vẫn dùng API key/model từ file đó nhưng ép các địa chỉ nội bộ, bridge secret và nguồn frontend theo cấu hình local. Gateway chạy trên host mặc định ở `http://host.docker.internal:20128/v1`; chỉnh `LOCAL_NINEROUTER_BASE_URL` trong `.env.compose` nếu cần. Không đặt key/model vào biến `NEXT_PUBLIC_*`.

## Volume database cũ

`.env.compose` mặc định dùng `studio_dev`, `studio_user` và `studio_password`, tương thích với volume local chuẩn đã có. Đổi biến môi trường không thay đổi tài khoản được lưu bên trong volume MySQL. Nếu DB đang unhealthy sau khi đã từng dùng thông tin Aiven cho MySQL local, kiểm tra tài khoản và database của volume trước; không xóa volume để chữa lỗi vì việc đó sẽ xóa dữ liệu.
