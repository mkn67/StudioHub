# StudioHub

Frontend marketplace cho thuê phòng Studio, giao diện tiếng Việt, Next.js App Router + TypeScript + React + Tailwind CSS. Không có backend, database hoặc giao dịch tiền thật.

## Chạy ứng dụng

Yêu cầu Node.js 24 và npm. Trên PowerShell có chặn script, dùng `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở http://127.0.0.1:3000. Tại **Đăng nhập**, chọn tài khoản mẫu Khách hàng, Chủ Studio hoặc Admin. Đăng ký khách mới cũng hoạt động và được lưu trong trình duyệt.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run start -- --port 3001
```

Kiểm tra trình duyệt với Chromium do Playwright quản lý đã cài sẵn:

```powershell
node scripts/production-qa.mjs
```

Script dùng bản production tại cổng 3001. `scripts/browser-qa.mjs` dùng bản development cổng 3000. Nếu chưa có Chromium, cài qua `npx.cmd playwright install chromium`. Trong môi trường sandbox hạn chế Windows, runner `tsx` có thể cần quyền gọi thông tin tài khoản hệ điều hành; đây là giới hạn môi trường chạy test, không phải lỗi nghiệp vụ.

## Khám phá bản demo

- `/`: hero ảnh Studio, tìm kiếm, danh mục, phòng nổi bật.
- `/rooms`: bộ lọc có tác dụng, sắp xếp và phân trang; mỗi dòng là một phòng vật lý.
- `/rooms/a102`: gallery/lightbox, thông tin phòng, chính sách và modal đặt thuê 3 bước.
- `/payment/[id]`: thanh toán cọc mô phỏng; thành công, thất bại, đang xử lý, retry hợp lệ.
- `/my-bookings`, `/my-bookings/[id]`: danh sách, timeline, hủy/đổi lịch, trạng thái thanh toán/hoàn cọc độc lập.
- `/host`: tổng quan, Studio, loại phòng/phòng, kho thiết bị, giá, lịch Ngày/Tuần, Kanban, báo cáo, chính sách.
- `/admin`: xét duyệt đối tác, tài khoản, yêu cầu khôi phục, giám sát phòng/Studio, quyền, ngoại lệ và audit.

**Môi trường demo** ở góc dưới trong chế độ development cho phép đổi nhân vật, tăng thời gian, đặt lại dữ liệu và tải sáu tình huống mẫu. Điều khiển này bị loại khỏi production. Đồng hồ demo bắt đầu lúc 09:00 ngày 25/10/2026, múi giờ Việt Nam, và chỉ thay đổi khi tăng thời gian mô phỏng. Dùng `npm.cmd run dev` để kiểm tra timeout, no-show và quá giờ mà không phải chờ thật.

## Dữ liệu và kiến trúc

`src/domain/models.ts`: kiểu dữ liệu. `src/domain/engine.ts`: xác thực nghiệp vụ, tính giá, chuyển trạng thái và audit. `src/data/fixtures.ts`: dữ liệu minh họa nhất quán. `src/data/repository.ts`: giao diện repository và adapter localStorage. `src/components/store.tsx`: điều phối state và thông báo. Các component theo khu vực nằm trong `src/components/`.

Dữ liệu tồn tại trên cùng trình duyệt và được chia sẻ giữa các vai trò. Xóa localStorage hoặc chọn Đặt lại dữ liệu để bắt đầu lại. Không có bảo đảm khóa lịch nguyên tử, đồng bộ nhiều tab/thiết bị, phân quyền an toàn hoặc xác minh tiền thật. Tích hợp backend tương lai cần thay repository/workflow adapter và thực thi lại các ràng buộc phía máy chủ.

## Tài liệu và giới hạn

- [DESIGN.md](DESIGN.md): hệ Risograph Editorial đang áp dụng; Bricolage Grotesque/DM Mono, cream paper, terracotta, warm mustard và dark ink.
- [Audit redesign ban đầu](docs/RISOGRAPH_REDESIGN_AUDIT.md), [Warm Editorial hiện tại và kiểm chứng](docs/WARM_EDITORIAL_REFINEMENT.md).
- [Business Policy v1.1](docs/references/StudioHub_Business_Policy_VI_v1.1.md): nguồn quy tắc nghiệp vụ ưu tiên; báo cáo database trong references là đối chiếu tài liệu, không phải xác nhận database đang chạy.
- [PRODUCT.md](PRODUCT.md): bối cảnh và phạm vi sản phẩm.
- [Blueprint](docs/STUDIOHUB_MASTER_SPEC.md), [kế hoạch](docs/IMPLEMENTATION_PLAN.md), [truy vết yêu cầu](docs/REQUIREMENTS_TRACEABILITY.md), [kịch bản demo](docs/TEST_SCENARIOS.md).
- Hai bản gốc được giữ nguyên trong `docs/references/`; SHA-256 đã đối chiếu với nguồn Downloads.
- Tất cả giá, người dùng, phòng và số liệu vận hành đều là minh họa. Gói combo tính theo giá giờ, chưa giả định chiết khấu; gói buổi mẫu cố định 08:00–12:00. Khoản thu bổ sung được Host ghi nhận, không phải thanh toán online.
- Ảnh chụp là ảnh tham khảo có nguồn ghi tại `public/images/PROVENANCE.md` và trong metadata JPEG. Cần thay bằng ảnh Studio sở hữu hoặc xác nhận quyền sử dụng trước khi phát hành thương mại. Chưa có tải ảnh/file lên máy chủ.
- Không mô phỏng thuế, hợp đồng, thiệt hại thiết bị hoặc phạt no-show ngoài cọc vì nguồn chưa quy định.
- Bảng quyền Admin là bản mô tả phạm vi quyền đã duyệt, không cho tự cấp quyền tùy ý.

Đây là bản demo frontend, chưa phải ứng dụng production bảo mật.
> **Cập nhật tích hợp 02/11/2026:** Mặc định dùng PHP API qua `/api/business`; demo offline cần `NEXT_PUBLIC_APP_MODE=demo`. Xem [hướng dẫn chạy hiện tại](../docs/development.md) và [kiểm chứng/giới hạn](../docs/integration-verification.md). MySQL chưa chạy trong lần kiểm chứng này; các hướng dẫn demo bên dưới chỉ áp dụng cho chế độ demo rõ ràng.

