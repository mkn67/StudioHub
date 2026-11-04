# Docker images: Client và PHP Helpdesk

Chạy các lệnh dưới đây tại thư mục gốc repo. Các lệnh trong trang này chạy image trực tiếp; để chạy toàn bộ stack dùng [hướng dẫn Compose](docker-compose.md). Compose đã nối hai Dockerfile và có service khởi tạo riêng, không chạy migration trong bước build image.

## Client

```powershell
docker build -t studiohub-client `
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 `
  --build-arg NEXT_PUBLIC_DEMO_MODE=false `
  --build-arg NEXT_PUBLIC_HELPDESK_MODE=connected `
  ./client
docker run --rm --name studiohub-client -p 3000:3000 studiohub-client
```

Image mặc định là production, dùng Node.js 24, build nhiều stage và chạy bằng user `node`, lắng nghe `0.0.0.0:3000`. Development target: `docker build --target development -t studiohub-client-dev ./client`, sau đó `docker run --rm -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8000 -e NEXT_PUBLIC_DEMO_MODE=false studiohub-client-dev`.

`NEXT_PUBLIC_*` được nhúng lúc build production; truyền `-e` lúc chạy không thay đổi bundle đã build. URL API là địa chỉ trình duyệt truy cập được, khác với hostname nội bộ Docker. `.env.local` và `node_modules` của máy host bị loại khỏi build context.

Khi dùng widget kết nối PHP, truyền thêm các biến **server-only** lúc `docker run`: `HELPDESK_API_URL`, `HELPDESK_HTTP_HOSTS`, `HELPDESK_BRIDGE_SECRET` và `HELPDESK_FRONTEND_ORIGIN`. Dùng file môi trường riêng qua `--env-file`, không đưa secret vào build args. Trên cùng Docker network: `HELPDESK_API_URL=http://helpdesk-php` (cổng 80) và `HELPDESK_HTTP_HOSTS=helpdesk-php`. Origin frontend phải khớp với origin trình duyệt, thường `http://localhost:3000`.

## Helpdesk PHP

Build context bắt buộc là **gốc repo**, vì retrieval đọc cả kho tri thức và tài liệu nguồn ngoài `helpdesk-php/`.

```powershell
docker build -f helpdesk-php/Dockerfile -t studiohub-helpdesk .
docker volume create studiohub-helpdesk-data
docker run --rm --name helpdesk-php -p 8010:80 `
  --env-file helpdesk-php/.env `
  --mount type=volume,source=studiohub-helpdesk-data,target=/app/helpdesk-php/var `
  studiohub-helpdesk
```

PHP 8.2 Apache có curl, mbstring, PDO MySQL/SQLite và OPcache. DocumentRoot chỉ trỏ vào `public/`; Apache chuyển các đường dẫn API về `index.php`. Dữ liệu SQLite mặc định nằm trong volume `var/`, thuộc user worker `www-data`. `.env`, runtime Windows và database local không được chép vào image. Approval manifest được chép nguyên trạng, không tự phê duyệt tri thức.

Khởi tạo bảng Helpdesk là bước riêng, dùng **cùng volume và cấu hình**:

```powershell
docker exec --user www-data helpdesk-php php bin/migrate.php --apply
```

Không khởi tạo database nghiệp vụ. Với MySQL, cấu hình database Helpdesk riêng theo README hiện có. `/health` và Docker healthcheck kiểm tra HTTP process, không xác nhận database/provider đã sẵn sàng.

Trong container, `127.0.0.1` là chính container đó. Sửa cấu hình runtime để `NINEROUTER_BASE_URL` và `STUDIOHUB_API_BASE_URL` trỏ đúng dịch vụ; ví dụ trên Docker Desktop, gateway chạy trên host có thể dùng `http://host.docker.internal:20128/v1`. Secret bridge phải trùng ở Next.js và PHP. Không có API key hoặc model mặc định được tạo thêm.

Nếu đưa vào Compose: client dùng `build.context: ./client`; Helpdesk dùng `build.context: .`, `build.dockerfile: helpdesk-php/Dockerfile`. Tránh bind mount source Windows lên production image hoặc đè `node_modules` đã cài trong Linux.
