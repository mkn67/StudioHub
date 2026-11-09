# 🎬 Studio & Equipment Rental Web Platform

> StudioHub là nền tảng đặt thuê studio sáng tạo, gồm frontend Next.js, PHP REST API, MySQL và Helpdesk. Xem [hướng dẫn frontend](client/README.md), [audit tích hợp](docs/integration-audit.md), [kết quả xác minh](docs/integration-verification.md) và [hướng dẫn Compose](docs/docker-compose.md).

Chạy stack local: `node scripts/setup-docker.mjs`, sau đó `podman-compose --env-file .env.compose up -d --build` (hoặc `docker compose --env-file .env.compose up -d --build`). Cấu hình local nằm riêng trong `.env.compose`, không dùng nhầm thông tin Aiven trong `.env`.

---

## 📌 1. Tổng quan Kiến trúc

Dự án được xây dựng theo mô hình Monorepo gồm 3 thành phần chính:

| Tầng | Công nghệ sử dụng | Cổng truy cập | Mô tả vai trò |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Next.js 14**, React 18, TypeScript, Tailwind CSS | [`http://localhost:3000`](http://localhost:3000) | App Router, Server/Client Components, Hot Module Replacement (HMR). |
| **Backend API** | **PHP 8.2 thuần**, Apache `mod_rewrite`, PDO | [`http://localhost:8000`](http://localhost:8000) | RESTful API, PSR-4 Autoloader, CORS Middleware, không framework nặng. |
| **Database** | **MySQL 8.0 Community Server** | `localhost:3306` | Quản trị dữ liệu quan hệ, bảng mã `utf8mb4_unicode_ci`. |

---

## 🎨 1.1. Hệ thống Mockup Giao diện theo Báo cáo Đồ án (Chương 3.4)

Frontend đã triển khai đầy đủ **5 màn hình then chốt** và **2 Master Layout** theo đúng cấu trúc báo cáo Hệ thống Thông tin:

1. **[Màn hình 1] Trang chủ & Bộ lọc đa tiêu chí (FR-11, FR-12, FR-13):**
   * URL: [`http://localhost:3000`](http://localhost:3000)
   * Chức năng: Bộ lọc đa trường `[1]` (khu vực, loại hình, ngân sách, ngày), Thẻ phòng `[2]` (diện tích, trần cao, cách âm), Nút đặt lịch `[3]`.
2. **[Màn hình 2] Chi tiết phòng & Lịch Time-slot thời gian thực:**
   * URL: [`http://localhost:3000/rooms/room-artemis-01`](http://localhost:3000/rooms/room-artemis-01)
   * Chức năng: Slide ảnh, thông số tiêu âm STC, nội quy phòng, lịch chọn block ca 2h có khoảng đệm 30 phút dọn phòng (`buffer time`).
3. **[Màn hình 3] Kho thiết bị & Nội thất bổ trợ (Add-ons & Equipment Drawer):**
   * URL: [`http://localhost:3000/rooms/room-artemis-01#equipment-section`](http://localhost:3000/rooms/room-artemis-01#equipment-section)
   * Chức năng: Tùy chọn thuê thêm đèn Godox, softbox, phông nền cuộn, ghế sofa concept và cơ chế **nhảy tổng tiền thời gian thực (Real-time summary)**.
4. **[Màn hình 4] Xác nhận đơn thuê & Giả lập Thanh toán (Checkout & Sandbox QR):**
   * URL: [`http://localhost:3000/checkout`](http://localhost:3000/checkout)
   * Chức năng: Bảng kê chi phí minh bạch, tính cọc 30%, quét mã VietQR Sandbox và mô phỏng giao dịch thành công.
5. **[Màn hình 5] Bảng điều khiển Chủ Studio (Host Portal Dashboard):**
   * URL: [`http://localhost:3000/host`](http://localhost:3000/host)
   * Master Layout: Fixed Left Sidebar + Top Header + Main Body.
   * Chức năng: Lịch biểu Timeline toàn cơ sở theo ngày, bảng quản lý đơn thuê với **quy trình chuyển trạng thái 4 bước**: `Tiếp nhận` ➔ `Đã check-in` ➔ `Hoàn thành` ➔ `Đã kiểm tra hoàn cọc`.
6. **[Bổ trợ DevOps] Trang kiểm tra sức khỏe hệ thống (System Health):**
   * URL: [`http://localhost:3000/health`](http://localhost:3000/health) (kiểm tra Next.js ➔ PHP API ➔ MySQL 8.0).

---

## 📂 2. Cấu trúc thư mục

```text
studio-rental-web/
├── docker-compose.yml          # Quản lý 3 services: db, api, web
├── .gitignore                  # Bỏ qua node_modules, build cache, .env
├── README.md                   # Tài liệu hướng dẫn vận hành dự án
│
├── database/                   # Khởi tạo và lưu trữ schema database
│   └── init/
│       └── 01-init.sql         # Script tạo bảng test system_health (MySQL 8.0)
│
├── server/                     # Backend API (PHP 8.2 Native + Apache)
│   ├── Dockerfile              # Cài pdo_mysql, kích hoạt rewrite, DocumentRoot /public
│   ├── .env.example            # Mẫu cấu hình môi trường kết nối database
│   ├── public/
│   │   ├── .htaccess           # Điều hướng tất cả request về index.php
│   │   └── index.php           # Front Controller, CORS handling, Simple Router
│   └── src/
│       ├── Config/             # Kết nối Database PDO (Singleton an toàn)
│       ├── Controllers/        # Xử lý logic nghiệp vụ & Health Check
│       └── Middlewares/        # Kiểm soát CORS, xác thực
│
└── client/                     # Frontend Web (Next.js 14 App Router)
    ├── Dockerfile.dev          # Node.js 20 Alpine, npm run dev trên 0.0.0.0:3000
    ├── package.json            # Khai báo React 18, Next 14, Tailwind, Lucide React
    ├── tsconfig.json           # Cấu hình TypeScript & path alias (@/*)
    ├── tailwind.config.ts      # Cấu hình Tailwind CSS
    ├── postcss.config.js       # PostCSS plugins
    ├── next.config.mjs         # Cấu hình Next.js
    ├── .env.local.example      # Mẫu NEXT_PUBLIC_API_URL
    └── src/
        ├── app/                # Next.js App Router (layout.tsx, page.tsx, globals.css)
        └── lib/                # api.ts (Client gọi REST API tập trung)
```

---

## 🚀 3. Hướng dẫn Khởi chạy Nhanh (Quick Start)

> ⚠️ **LƯU Ý QUAN TRỌNG:** Luôn mở terminal và đứng tại **thư mục gốc của project** (`~/web/Project`) khi chạy các lệnh Compose!

### Bước 1: Khởi động hệ thống

Tuỳ thuộc vào môi trường máy tính của bạn:

* **Trên máy dùng Podman (Fedora / RHEL / Linux):**
  ```bash
  podman-compose --env-file .env.compose up -d --build
  ```

* **Trên máy dùng Docker (Ubuntu / macOS / Windows):**
  ```bash
  docker compose --env-file .env.compose up -d --build
  ```

*(Lần đầu chạy, hệ thống sẽ build images và khởi động MySQL, API, Helpdesk, frontend và job xử lý đơn hết hạn.)*

### Bước 2: Kiểm tra trạng thái hoạt động

```bash
# Podman:
podman-compose --env-file .env.compose ps

# Docker:
docker compose --env-file .env.compose ps
```
Xác nhận `db`, `api`, `helpdesk-php`, `client` ở trạng thái healthy/running và `cron` đang chạy.

### Bước 3: Truy cập ứng dụng

* 🌐 **Giao diện Web Frontend:** Truy cập [`http://localhost:3000`](http://localhost:3000)  
  *(Trang Technical Health Dashboard sẽ tự động kiểm tra kết nối từ Next.js ➔ PHP API ➔ MySQL 8.0).*
* 🔌 **API Backend Endpoint:** Truy cập [`http://localhost:8000/api/health`](http://localhost:8000/api/health)  
  *(Trả về JSON trạng thái `server: ok` và `database: ok`).*

---

## 🛠️ 4. Bảng tra cứu các lệnh thường dùng (Cheat Sheet)

| Thao tác | Lệnh Podman Compose | Lệnh Docker Compose |
| :--- | :--- | :--- |
| **Bật toàn bộ hệ thống** | `podman-compose --env-file .env.compose up -d --build` | `docker compose --env-file .env.compose up -d --build` |
| **Xem trạng thái container** | `podman-compose --env-file .env.compose ps` | `docker compose --env-file .env.compose ps` |
| **Xem log realtime** | `podman-compose --env-file .env.compose logs -f` | `docker compose --env-file .env.compose logs -f` |
| **Xem log riêng Next.js** | `podman-compose --env-file .env.compose logs -f client` | `docker compose --env-file .env.compose logs -f client` |
| **Xem log riêng PHP API** | `podman-compose --env-file .env.compose logs -f api` | `docker compose --env-file .env.compose logs -f api` |
| **Khởi động lại 1 service** | `podman-compose --env-file .env.compose restart api` | `docker compose --env-file .env.compose restart api` |
| **Tắt toàn bộ hệ thống** | `podman-compose --env-file .env.compose down` | `docker compose --env-file .env.compose down` |
| **Build lại frontend** | `podman-compose --env-file .env.compose up -d --build --force-recreate client` | `docker compose --env-file .env.compose up -d --build client` |

---

## 📦 5. Frontend dependencies

Frontend production container không chứa mã nguồn phát triển hoặc npm dependencies đầy đủ. Thêm thư viện trong thư mục `client/` bằng môi trường Node.js phát triển, cập nhật lockfile, rồi build lại service:

```bash
cd client
npm install <package>
cd ..
podman-compose --env-file .env.compose up -d --build --force-recreate client
```

Không chép `node_modules` từ container production vào source. Với VS Code, cài Node.js và chạy `npm ci` trong `client/` để TypeScript/IntelliSense dùng đúng dependency của frontend.

---

## 🗄️ 6. Thao tác trực tiếp với Database (MySQL 8.0)

Truy cập dòng lệnh `mysql` client bên trong container:

```bash
# Podman:
podman-compose --env-file .env.compose exec db mysql -u studio_user -pstudio_password studio_dev

# Docker:
docker compose --env-file .env.compose exec db mysql -u studio_user -pstudio_password studio_dev
```

Các truy vấn kiểm tra nhanh:
```sql
-- Kiểm tra bảng mẫu:
SELECT * FROM system_health;

-- Thoát mysql CLI:
exit;
```

---

## 🔄 7. Cơ chế Hot Reload khi viết code

Compose dùng frontend production image, không bật hot reload. Sau khi sửa frontend, chạy lại lệnh build service `client` trong bảng phía trên. Source PHP được bind mount chỉ đọc; các file code backend mới được cập nhật ngay, nhưng cần khởi động lại `api` nếu thay đổi dependencies hoặc cấu hình tiến trình.

---

## ❓ 8. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `no docker-compose.yml file found`:**
   * **Nguyên nhân:** Đang đứng ở thư mục con (ví dụ `client/` hoặc `server/`).
   * **Khắc phục:** Gõ `cd ..` để trở về thư mục gốc `~/web/Project` rồi chạy lại lệnh.

2. **Lỗi trùng Port (`address already in use` 3000, 8000 hoặc 3306):**
   * **Khắc phục:** Kiểm tra tiến trình đang chiếm cổng:
     ```bash
     sudo lsof -i :3000
     sudo lsof -i :8000
     sudo lsof -i :3306
     ```
     Tắt tiến trình cũ trước khi chạy compose.

3. **Tắt compose có mất dữ liệu hay mất image không?**
   * **Không.** Lệnh `podman-compose down` chỉ tắt container. Toàn bộ image và dữ liệu database MySQL (`mysqldata` volume) vẫn được bảo toàn nguyên vẹn.
> **Integration update (2026-11-02):** Connected frontend/PHP implementation and non-destructive MySQL upgrades are now present. MySQL execution is still unverified because the local service was unavailable. Start with [current setup](docs/development.md), [API reference](docs/api-reference.md), and [actual verification / blockers](docs/integration-verification.md). Historical architecture/demo notes below are retained for context.
