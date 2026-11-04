# StudioHub frontend

Next.js App Router, React 19, TypeScript và Tailwind CSS. Giữ hệ thiết kế hiện tại với Bricolage Grotesque / DM Mono, hình ảnh, bảng màu và bố cục trang chủ.

## Chạy frontend

Cần Node.js 24 và PHP API/MySQL đã được cấu hình theo [hướng dẫn backend hiện có](../server/README.md).

```powershell
cd client
npm.cmd ci
# Chỉ tạo cấu hình nếu chưa có .env.local; không ghi đè cấu hình thật.
if (!(Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
npm.cmd run dev
```

Trong `.env.local`, đặt các biến công khai sau và khởi động lại Next.js:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_HELPDESK_MODE=connected
```

Truy cập `http://localhost:3000`. API dùng JWT Bearer, lưu token trong sessionStorage của từng tab. Backend phải cho phép đúng origin frontend qua `ALLOWED_ORIGINS`. Địa chỉ API phải truy cập được từ trình duyệt, không dùng hostname nội bộ Docker như `api`.

Backend seed đã có các tài khoản `customer@studio.local`, `host1@studio.local`, `admin@studio.local`, mật khẩu phát triển `password123`. Các tài khoản này chỉ tồn tại khi môi trường backend đã được seed. Không dùng trên production.

## Hai chế độ dữ liệu

- **API** là mặc định khi `NEXT_PUBLIC_DEMO_MODE` khác `true`. Tài khoản, phòng, đơn thuê, thiết bị và báo cáo được đọc/ghi qua PHP. Thiếu URL hoặc lỗi máy chủ sẽ hiển thị lỗi; không tự chuyển sang dữ liệu mẫu. Footer ghi rõ kết nối API và thanh toán sandbox.
- **Demo** cần đặt rõ `NEXT_PUBLIC_DEMO_MODE=true`. Các component, dữ liệu mẫu, quy tắc mô phỏng và công cụ phát triển cũ được giữ lại; thay đổi chỉ lưu trên trình duyệt. Demo không ghi vào backend. Công cụ đổi nhân vật không xuất hiện ở chế độ API.

Bản nháp chọn lịch được lưu trong sessionStorage để tiếp tục sau đăng nhập. Đây là bản nháp, không phải đơn thuê đã được giữ chỗ. Giá, khả dụng và việc tạo đơn đều do backend xác nhận.

## Các luồng đã nối API

- Đăng ký khách, đăng nhập, tải/sửa hồ sơ, đăng xuất và hết phiên.
- Trang chủ, danh sách phòng với bộ lọc/phân trang, chi tiết, bảng giá và lịch bận.
- Chọn phòng vật lý và thiết bị, báo giá từ máy chủ, tạo đơn và xem chi tiết.
- Danh sách đơn, hủy đơn, cọc/phần còn lại **sandbox**; trả cọc không tự xác nhận đơn.
- Host: cơ sở, phòng, ảnh, nhóm/thiết bị, bảng giá, lịch, đơn và thống kê.
- Admin: tài khoản, khóa/mở khóa, chuyển Host/Customer và thống kê.

API danh mục hiện chỉ trả phòng/thiết bị đang công khai, nên quản lý tài nguyên ẩn/bảo trì chưa đầy đủ. Các chức năng thiếu API hiển thị giới hạn thay vì ghi dữ liệu giả. Xem [ma trận](../docs/integration-matrix.md).

Helpdesk giữ nguyên kết nối PHP hiện có và bộ kiểm thử adapter. Cấu hình bridge/provider theo `.env.helpdesk.example` và [tài liệu Helpdesk](../docs/helpdesk/HELPDESK_API_IMPLEMENTATION.md). Không đưa khóa provider vào biến `NEXT_PUBLIC_*`. Phiên tài khoản marketplace hiện chưa được gắn vào widget Helpdesk; không tuyên bố đã hỗ trợ tra cứu riêng tư theo người dùng.

## Kiểm tra và build

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run start
```

Scripts dùng Webpack vì bản Turbopack đang cài gặp lỗi resolve `@vercel/turbopack/postcss`. Không thêm dependency để né lỗi. Bộ test chạy domain demo, HTTP contract/timezone và Helpdesk; test domain demo không chứng minh backend thực thi cùng quy tắc.

Kiểm thử trình duyệt cần build **chế độ API**:

```powershell
$env:NEXT_PUBLIC_DEMO_MODE='false'
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'
npm.cmd run build
npm.cmd run start
# Terminal khác, trong client/:
node scripts/integration-qa.mjs
```

Script Playwright intercept HTTP bằng dữ liệu kiểm thử, không khởi chạy PHP, không ghi database và không xác nhận thanh toán thật. Nó kiểm tra hành vi frontend với contract dự kiến. Hai bộ test component từ kiến trúc frontend cũ được lưu nguyên dưới `tests/components/*.legacy.txt`; chúng tham chiếu module/fixture đã mất và dependency không có trong manifest. Bộ kiểm tra mới nằm trong `src/services/api/` và `scripts/integration-qa.mjs`.

Để chạy backend, migrate hoặc seed, dùng đúng [server/README.md](../server/README.md) với database phát triển riêng. Đợt thay đổi này không sửa hoặc chạy migration/seed/backend test ghi dữ liệu. [Báo cáo xác minh](../docs/integration-verification.md) phân biệt kết quả kiểm thử frontend và phần còn cần PHP/MySQL.


## Chế độ API sau khi ghép hai nhánh

REST/JWT vẫn là mặc định với `.env.local` hiện có. `NEXT_PUBLIC_APP_MODE=demo` (hoặc `NEXT_PUBLIC_DEMO_MODE=true` khi chưa đặt APP_MODE rõ ràng) chọn demo trên trình duyệt. `NEXT_PUBLIC_APP_MODE=connected` chọn riêng workspace API dùng cookie từ nhánh incoming; khả năng tương thích database của chế độ này chưa được kiểm chứng trong lượt sửa conflict. Không chạy migration chỉ để giải quyết conflict frontend.

README và báo cáo tích hợp của nhánh incoming được giữ nguyên tại [merge-history](../docs/merge-history/README.md). Xem [báo cáo sửa merge](../docs/MERGE_RESOLUTION_REPORT.md) để biết quyết định ghép code và kết quả kiểm chứng.
