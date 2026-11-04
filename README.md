# 🎬 Studio & Equipment Rental Web Platform

> **Tích hợp frontend:** `client/` sử dụng Next.js, React 19 và TypeScript, có chế độ API PHP/MySQL và demo tách biệt. Xem [hướng dẫn frontend](client/README.md), [audit](docs/integration-audit.md) và [kết quả xác minh](docs/integration-verification.md). Backend/database không được chỉnh sửa trong đợt tích hợp này. Các mô tả Next.js 14/React 18 bên dưới là tài liệu của phiên bản trước.
> Hệ thống Web cho thuê Studio và Nội thất / Thiết bị quay chụp nghệ thuật.
> Kiến trúc Monorepo tiêu chuẩn, hỗ trợ cả **Podman Compose** và **Docker Compose**.

Chạy stack Docker hiện tại: `node scripts/setup-docker.mjs`, sau đó `docker compose up -d --build`. Xem [hướng dẫn Compose](docs/docker-compose.md) để biết service, volume, cấu hình và cách kiểm tra. Các hướng dẫn cũ bên dưới có thể khác cấu hình hiện tại.

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
  podman-compose up -d
  ```

* **Trên máy dùng Docker (Ubuntu / macOS / Windows):**
  ```bash
  docker compose up -d
  ```

*(Lần đầu chạy, hệ thống sẽ tự động build images và khởi động cả 3 container trong nền).*

### Bước 2: Kiểm tra trạng thái hoạt động

```bash
# Podman:
podman-compose ps

# Docker:
docker compose ps
```
Cả 3 container `studio_db` (healthy), `studio_api` (Up), `studio_web` (Up) đều đang chạy là thành công.

### Bước 3: Truy cập ứng dụng

* 🌐 **Giao diện Web Frontend:** Truy cập [`http://localhost:3000`](http://localhost:3000)  
  *(Trang Technical Health Dashboard sẽ tự động kiểm tra kết nối từ Next.js ➔ PHP API ➔ MySQL 8.0).*
* 🔌 **API Backend Endpoint:** Truy cập [`http://localhost:8000/api/health`](http://localhost:8000/api/health)  
  *(Trả về JSON trạng thái `server: ok` và `database: ok`).*

---

## 🛠️ 4. Bảng tra cứu các lệnh thường dùng (Cheat Sheet)

| Thao tác | Lệnh Podman Compose | Lệnh Docker Compose |
| :--- | :--- | :--- |
| **Bật toàn bộ hệ thống** | `podman-compose up -d` | `docker compose up -d` |
| **Xem trạng thái container** | `podman-compose ps` | `docker compose ps` |
| **Xem log realtime (cả 3 service)** | `podman-compose logs -f` | `docker compose logs -f` |
| **Xem log riêng Next.js** | `podman logs -f studio_web` | `docker logs -f studio_web` |
| **Xem log riêng PHP API** | `podman logs -f studio_api` | `docker logs -f studio_api` |
| **Khởi động lại 1 service** | `podman-compose restart api` | `docker compose restart api` |
| **Tắt toàn bộ hệ thống** | `podman-compose down` | `docker compose down` |
| **Build lại khi sửa Dockerfile** | `podman-compose build` | `docker compose build` |

---

## 📦 5. Quản lý Thư viện & Fix lỗi gạch đỏ VS Code

### 5.1. Cài đặt thêm thư viện Frontend (`npm`)
Bạn không cần cài Node.js trên máy thật. Chạy lệnh cài xuyên vào container:
```bash
# Cài đặt 1 thư viện mới (ví dụ date-fns):
podman-compose exec web npm install date-fns

# Chạy npm install thông thường:
podman-compose exec web npm install
```

### 5.2. Cách sửa lỗi VS Code gạch đỏ (Cannot find module 'react'...)
Do `node_modules` nằm trong container, để VS Code trên máy thật hiểu được types và hỗ trợ autocomplete (IntelliSense), bạn chỉ cần copy `node_modules` ra máy thật **1 lần duy nhất**:

```bash
# Chạy tại thư mục gốc của project:
podman cp studio_web:/app/node_modules ./client/node_modules
```
👉 *Lập tức toàn bộ lỗi đỏ gạch chân trong VS Code sẽ biến mất hoàn toàn!*

---

## 🗄️ 6. Thao tác trực tiếp với Database (MySQL 8.0)

Truy cập dòng lệnh `mysql` client bên trong container:

```bash
# Podman:
podman-compose exec db mysql -u studio_user -pstudio_password studio_db

# Docker:
docker compose exec db mysql -u studio_user -pstudio_password studio_db
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

Dự án đã cấu hình Volume Bind Mount:
* **Frontend (`client/`):** Chỉnh sửa file `.tsx`, `.ts`, `.css` ➔ Trình duyệt tự động cập nhật ngay tức thì mà không cần F5.
* **Backend (`server/`):** Thêm Controller, Model, Route mới ➔ Gọi lại API là có tác dụng ngay lập tức, không cần restart container.

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
