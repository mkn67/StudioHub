# StudioHub Client

Frontend marketplace cho thuê phòng studio, xây dựng bằng Next.js App Router, React, TypeScript và Tailwind CSS. Ứng dụng có chế độ kết nối PHP API cho các luồng đã tích hợp và chế độ demo dùng dữ liệu trình duyệt cho các luồng còn lại.

## Chạy bằng Docker Compose

Tạo `JWT_SECRET` riêng trong file `.env` ở thư mục gốc dự án, sau đó chạy:

```sh
docker compose up --build
```

Mở [http://localhost:3000](http://localhost:3000). API chạy tại cổng 8000. Compose cài dependency của client khi khởi động container.

## Chạy client riêng

Cần Node.js 24 và npm. Khi chạy ngoài Docker, đặt các biến phù hợp trong `client/.env.local`; xem [hướng dẫn tích hợp backend](docs/BACKEND-INTEGRATION.md).

```sh
npm ci
npm run dev
```

## Trạng thái tích hợp

Client kết nối PHP API cho những luồng đã được nối trong mã nguồn. Một số màn hình quản trị, thanh toán và thao tác nghiệp vụ vẫn dùng dữ liệu demo phía trình duyệt; trạng thái tích hợp chi tiết và các giới hạn hiện tại nằm trong [tài liệu tích hợp](docs/BACKEND-INTEGRATION.md).

Tài khoản demo dùng mật khẩu `StudioHub123`; tài khoản seed của backend dùng mật khẩu `password123`. Không dùng tài khoản hoặc dữ liệu mẫu cho môi trường thật.

## Tài liệu liên quan

- [Thiết kế giao diện](DESIGN.md)
- [Tài liệu tích hợp backend](docs/BACKEND-INTEGRATION.md)
- [Kế hoạch triển khai](../docs/implementation-plan.md)
