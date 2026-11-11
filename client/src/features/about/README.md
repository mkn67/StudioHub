# Cập nhật trang Về chúng tôi

Trang công khai: `/about`. Toàn bộ hồ sơ nằm trong `client/src/features/about/team.ts`; không dùng database, PHP hay API thành viên.

## Thay thông tin năm thành viên

Giữ năm object trong `teamMembers`, thay `name` bằng tên thật đã được cung cấp. Các trường không bắt buộc:

- `studentId`: mã số sinh viên.
- `role`: vai trò thực tế trong dự án.
- `description`: giới thiệu ngắn đã được thành viên xác nhận.
- `image`: đường dẫn ảnh đại diện.
- `github`: URL HTTPS trên `github.com`.
- `email`: email liên hệ. Chỉ hiện khi đồng thời có `emailPublic: true`, sau khi thành viên đồng ý công khai.

Không điền trường chưa có thông tin; giao diện tự ẩn. Hiện tại cả năm hồ sơ là “Thành viên 1” đến “Thành viên 5”, chưa có MSSV, vai trò, ảnh hoặc liên hệ thật.

## Thay avatar

1. Đặt ảnh được phép sử dụng vào `client/public/images/team/`.
2. Trong object tương ứng, thêm `image: "/images/team/member-1.jpg"`, thay tên file theo ảnh thực tế.
3. Không thêm `public` vào URL. Khi chưa có ảnh hoặc tải ảnh thất bại, giao diện dùng icon avatar, không hiển thị ảnh stock hay ảnh hỏng.

GitHub mở thẻ mới với `noopener noreferrer`. Email chưa được đồng ý không xuất hiện trong DOM. Không đưa thông tin cá nhân chưa được phép vào file cấu hình vì dữ liệu frontend có thể được xem trong bundle.

## File giao diện

- `AboutPage.tsx`: nội dung giới thiệu, component hồ sơ và motion GSAP.
- `about.module.css`: màu sắc, bố cục ba cột (hàng cuối căn giữa), tablet hai cột và mobile một cột.
- `client/src/app/about/page.tsx`: route và metadata; dùng lại `Application` để giữ public header/footer.
- `client/src/components/application.tsx`: đăng ký nội dung `/about`, link desktop/mobile và trạng thái active.
- `client/src/components/PublicFooter.tsx`: link footer.

Không cần thêm endpoint, migration hay màn hình quản trị.

## Nội dung và bố cục

Trang gồm hero giới thiệu nhóm, phần giải thích dự án, đúng năm hồ sơ và các badge công nghệ đã có trong repo: Next.js, React, TypeScript, PHP, MySQL, GSAP. Không ghi phiên bản công nghệ từ README cũ, không tự đặt vai trò hoặc thành tích.

Desktop hiển thị ba hồ sơ ở hàng đầu, hai hồ sơ hàng sau căn giữa; tablet hai cột, mobile một cột. GSAP dùng tiện ích hiện có cho entrance, CSS cho hover. Reduced motion hiện nội dung ngay và tắt chuyển động mới. Không có hiệu ứng lặp liên tục.

Header desktop và menu di động cùng có link `/about`, dùng trạng thái `aria-current` và indicator có sẵn. Footer có thêm một link gọn; giữ đủ năm trang chính sách. Menu chính sách phụ căn phải trên mobile để không tràn ra ngoài sau khi thêm link mới. Authentication, nút tài khoản và liên kết theo vai trò giữ nguyên.

## Danh sách file của thay đổi này

Tạo mới:

- `client/src/app/about/page.tsx`
- `client/src/features/about/AboutPage.tsx`
- `client/src/features/about/team.ts`
- `client/src/features/about/about.module.css`
- `client/src/features/about/README.md`
- `client/scripts/about-qa.mjs`

Chỉnh sửa:

- `client/src/components/application.tsx`
- `client/src/components/PublicFooter.tsx`
- `client/src/components/public-footer.module.css`
- `client/scripts/footer-qa.mjs`

Không sửa PHP, MySQL, booking/payment, authentication, Host/Admin Workspace hoặc Helpdesk/9Router. Các thay đổi working tree cũ được giữ nguyên; không commit, push hay deploy.

## Kiểm tra

```powershell
# Trong thư mục client
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd next start -H 127.0.0.1 -p 3003
# Terminal khác
node scripts/about-qa.mjs
node scripts/footer-qa.mjs
```

Ảnh và kết quả browser lưu ở `client/.impeccable/about/` và `client/.impeccable/footer/`. Browser kiểm tra 360/390/768/1024/1440px, cả hai chế độ motion, trạng thái Guest/Customer/Host/Admin, năm hồ sơ mặc định, không có API thành viên, điều hướng và bố cục card; footer kiểm tra thêm 1280px và các trang pháp lý. Session của bài kiểm thử dùng fixture, không đăng nhập thật hoặc tạo giao dịch.

Kết quả thực thi ngày 11/11/2026: lint, TypeScript và production build đạt; **217/217 tests**, **13/13 ca About**, **12/12 ca footer**, không page error hoặc tràn ngang. Đã mở ảnh render desktop/mobile; footer desktop đo khoảng 216px. Build nhận `/about` là route tĩnh. Máy chủ kiểm tra chỉ chạy trên loopback cổng 3003, không deploy.

Giới hạn còn lại: tên thật, MSSV, vai trò, phần giới thiệu, ảnh và liên hệ của cả năm người chưa được cung cấp. Giao diện đã hỗ trợ các trường này nhưng không hiển thị nội dung giả. Chưa có link GitHub/email thật để kiểm tra đích tài khoản; code chỉ chấp nhận GitHub HTTPS, mở thẻ mới với bảo vệ phù hợp và chỉ hiện email khi được phép.
