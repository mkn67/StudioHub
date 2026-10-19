# StudioHub

<<<<<<< HEAD
Frontend marketplace cho thuê phòng Studio, giao diện tiếng Việt, Next.js App Router + TypeScript + React + Tailwind CSS. Không có backend, database hoặc giao dịch tiền thật.

## Chạy ứng dụng
=======
A Vietnamese studio rental frontend with a PHP API connection for room discovery and customer authentication/profile updates. Booking, payment, host workspace, and administrator workspace still use the normalized, versioned browser demo database until their API contracts are connected.

The API stores authentication and profile changes in MySQL and enforces JWT authentication for supported routes. Payment outcomes and the remaining booking, host, and admin workflows are demonstrations and do not update the server database. There is no real payment gateway or money movement. See [backend integration status](docs/BACKEND-INTEGRATION.md) and the [implementation brief](docs/IMPLEMENTATION-BRIEF.md).
>>>>>>> 9dd1977 (feat: connect frontend with backend for host management and booking engine (phases 5 & 6))

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

<<<<<<< HEAD
## Khám phá bản demo

- `/`: hero ảnh Studio, tìm kiếm, danh mục, phòng nổi bật.
- `/rooms`: bộ lọc có tác dụng, sắp xếp và phân trang; mỗi dòng là một phòng vật lý.
- `/rooms/a102`: gallery/lightbox, thông tin phòng, chính sách và modal đặt thuê 3 bước.
- `/payment/[id]`: thanh toán cọc mô phỏng; thành công, thất bại, đang xử lý, retry hợp lệ.
- `/my-bookings`, `/my-bookings/[id]`: danh sách, timeline, hủy/đổi lịch, trạng thái thanh toán/hoàn cọc độc lập.
- `/host`: tổng quan, Studio, loại phòng/phòng, kho thiết bị, giá, lịch Ngày/Tuần, Kanban, báo cáo, chính sách.
- `/admin`: xét duyệt đối tác, tài khoản, yêu cầu khôi phục, giám sát phòng/Studio, quyền, ngoại lệ và audit.

**Môi trường demo** ở góc dưới trong chế độ development cho phép đổi nhân vật, tăng thời gian, đặt lại dữ liệu và tải sáu tình huống mẫu. Điều khiển này bị loại khỏi production. Đồng hồ demo bắt đầu lúc 09:00 ngày 25/10/2026, múi giờ Việt Nam, và chỉ thay đổi khi tăng thời gian mô phỏng. Dùng `npm.cmd run dev` để kiểm tra timeout, no-show và quá giờ mà không phải chờ thật.
=======
`.env.local` contains `NEXT_PUBLIC_DEMO_MODE=true` and `NEXT_PUBLIC_API_URL=http://localhost:8000`. Start the PHP API and MySQL services before using backend authentication and live room browsing. Restart Next.js after changing either value. Backend mode connects room discovery, login, customer registration, profile refresh/edit, and logout. Demo accounts remain available for the local booking/host/admin preview; those changes are not server writes.

Browser demo accounts use **`StudioHub123`**. Backend development seed accounts use **`password123`**.

| Account         | Email                     | Behavior                                                                           |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| Backend customer | `customer@studio.local`  | Sign in and update profile through the PHP API                                     |
| Customer        | `khach@studiohub.demo`    | Create bookings, simulate deposits, follow and cancel eligible orders              |
| Approved host   | `chu@studiohub.demo`      | Manage owned studios, rooms, inventory, rates and bookings                         |
| Administrator   | `admin@studiohub.demo`    | Approve hosts, lock accounts, hide venues, maintain catalogs, inspect audit events |
| Pending host    | `choduyet@studiohub.demo` | Account Status until an administrator approves the application                     |
| Rejected host   | `tuchoi@studiohub.demo`   | See the reason, edit the application and resubmit                                  |
| Locked customer | `bikhoa@studiohub.demo`   | Account Status with the recorded lock reason                                       |
>>>>>>> 9dd1977 (feat: connect frontend with backend for host management and booking engine (phases 5 & 6))

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

<<<<<<< HEAD
Đây là bản demo frontend, chưa phải ứng dụng production bảo mật.
=======
The host studio selector intentionally starts with **Tất cả Studio** for the overview and booking list. Select a specific studio for room, inventory, rate, calendar, and settings management. An approved host with no studios receives a first-studio setup state; approval never creates a studio automatically.

## Demonstrate the complete booking flow

1. Search the public marketplace by **Bình Thạnh**, open **Phòng Nắng**, and choose an available future interval, for example 09:00–11:00 at least ten days from today.
2. Check availability, continue to booking, choose equipment, and continue to confirmation. If anonymous, log in as the sample customer; the selected interval and equipment survive login.
3. Review the itemized price and contact information, accept the acknowledgment and create the order. Choose **Tôi đã thanh toán** on the payment page to record the simulated deposit immediately.
4. The order now shows **Chờ xác nhận**, not **Đã xác nhận**. A successful simulated deposit does not confirm the rental.
5. Open another tab on the same origin, log in as the approved host, and find that exact order in **Đơn thuê**. Confirm it. The customer tab updates from the shared database.
6. In the customer tab, cancel an eligible future order. Both tabs show the cancellation and availability is released. A paid deposit shows **chờ xử lý theo chính sách**; the demo never claims a real refund.
7. Create another order and exercise failed payment and retry. Retry keeps the existing order code and adds a payment attempt rather than creating another order.

Other useful demonstrations: approve the pending host as admin; hide Nắng Studio and observe its removal from public search while existing booking snapshots remain readable; lock the customer account in an admin tab and watch the customer tab move to Account Status.

## Data and reset

`src/services/storage/adapter.ts` is the only module that accesses browser storage. It validates database version 2 with Zod and migrates the known version 1 contract. The API JWT is stored in the current tab session through this adapter. Unknown or malformed demo data is retained and a recovery screen offers a **confirmed** reset. Storage access and quota failures produce actionable error states.

- `localStorage`: one database at `studiohub.demo.database`, with users, applications, studios, rooms, catalogs, equipment, rates, bookings, payment attempts and audit events.
- `sessionStorage`: the current tab's session, booking drafts and workspace preferences. Tabs can therefore sign in as different accounts while sharing the domain data.
- Every mutation reads the freshest validated database, checks permission and invariants, updates a revision, persists, then publishes. Browser `storage` events refresh other tabs.
- Price, equipment, room, rules and contact snapshots are written when the order is created. Later price or profile edits do not rewrite historical orders.
- Expiry ticks release unpaid holds and record a system timeline event. Confirmed bookings are never automatically marked completed.

To reset, log in, open the account menu and select **Đặt lại dữ liệu demo**, then confirm. Reset restores coherent sample data and logs out the current tab. Sample dates are relative to the reset date in Vietnam. Other tabs refresh the shared database. Reset affects this app's namespace, not unrelated browser storage.

E2E tests use isolated `studiohub.test.*` namespaces and a fixed Vietnam-local clock. They do not change ordinary demo data. `?fixture=NAME` selects a test namespace only in demo mode; use the ordinary URL in a fresh tab for a normal demonstration.

## Architecture

Next.js App Router, React, strict TypeScript and Tailwind CSS. Thin route files compose feature modules. Server layouts and metadata surround client-only interactive features. Local shadcn-style primitives use Radix for dialog, sheet, drawer and menu behavior; forms use React Hook Form and Zod; analytics use a chart wrapper around Recharts with readable table alternatives.

Pure domain modules own pricing, Vietnam-local interval validation, overlap and cleaning buffers, shared equipment concurrency, lifecycle transitions, access resolution, effective visibility and snapshot-derived statistics. `StudioService` is the single observable mock service; `AppProvider` subscribes with `useSyncExternalStore`. There are no separately maintained customer, host or admin booking stores. Components display the one pricing calculation rather than duplicating formulas.

Related documents: [design tokens and components](DESIGN.md), [rendered design review](docs/DESIGN-REVIEW.md), [demo business assumptions](docs/BUSINESS-ASSUMPTIONS.md), [image provenance](docs/ASSETS.md), [verification record](docs/VERIFICATION.md), and [milestone progress](PROGRESS.md).

## Limitations

Most application data is local to one browser origin, not shared across devices or backed up. Browser event synchronization cannot provide a server transaction or lock against simultaneous cross-process writes. The frontend demo catalog differs from the backend seed catalog; backend mode therefore disables booking submission instead of sending demo room/rate identifiers to MySQL. Image uploads are compressed and remain subject to browser quota. Demo venue names, photographs and statistics describe sample records, not real businesses or marketplace performance.

Cancellation, hold expiry, approval and completion behavior are configurable demo assumptions; payment authorization, settlement, refund eligibility, identity checks, legal terms and server access control require a backend agreement. See the assumptions document.

The requested Impeccable package was not available in the supplied environment. No Impeccable invocation is claimed; manual rendered critique, accessibility audit and responsive polish are documented instead. Direct Google Fonts download was unavailable, so the font is bundled with `@fontsource/be-vietnam-pro`.

The production dependency audit reported no vulnerabilities. The full dependency audit identified an unresolved high-severity `braces` advisory in the development-only ESLint glob dependency chain; its suggested forced fix would downgrade the Next.js ESLint tooling. The application does not use that dependency for runtime matching. Details and the audit date are in the verification record.
>>>>>>> 9dd1977 (feat: connect frontend with backend for host management and booking engine (phases 5 & 6))
