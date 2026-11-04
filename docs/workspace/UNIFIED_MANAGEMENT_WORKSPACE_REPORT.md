# Báo cáo triển khai Management Workspace thống nhất

Ngày 04/11/2026. Phạm vi: frontend Host/Admin, Settings và audit API chỉ đọc. Báo cáo Host Workspace trước đây là ghi nhận giai đoạn trước; giai đoạn này thay thế shell Admin cũ và đổi `/host/settings` thành Settings tài khoản theo yêu cầu mới.

## 1. Kết quả kiến trúc và điều hướng

Nguyên nhân avatar Host đi vào Customer Profile là Link `/profile` được viết trực tiếp trong topbar Host. Admin vẫn render public header vì điều kiện trong `Application` trước đây chỉ bỏ header cho Host; `/admin/users` và `/admin/roles` cùng render một AdminUsers không có chế độ riêng.

Đã tạo `ManagementWorkspace` dùng chung sidebar/topbar/account menu/mobile drawer, tái sử dụng font, token, panel, KPI, badge, table styles và Modal của Host Workspace. Host và Admin có cấu hình navigation riêng, giữ role gate trong BackendOperations; không dùng việc ẩn nút để thay kiểm tra quyền server.

- Avatar mở một AccountMenu có identity thật, Cài đặt, Xem website và Đăng xuất. Hỗ trợ mouse, Arrow/Home/End, Escape, Tab, click bên ngoài và focus trở lại trigger.
- Host đi `/host/settings`, Admin đi `/admin/settings`. Account link trên public website cũng đi Settings theo vai trò Host/Admin; Customer vẫn đi `/profile`.
- Không render public header/menu trong cấu trúc Host/Admin connected; không dùng CSS để giấu header. Guest/sai role vẫn vào gate cũ, không ló navigation role khác.
- Policy placeholder cũ của Host được giữ tại `/host/policies`, trong khi `/host/settings` nay phục vụ tài khoản và preference. Các alias Studio/equipment/pricing/analytics hiện có vẫn được giữ.
- Không hiển thị nhãn phiên bản thiết kế “Workspace 2.0” ở topbar sản phẩm.

## 2. Settings dùng chung, tách theo vai trò

`WorkspaceSettings` đọc GET `/api/auth/profile`, hiển thị tên viết tắt, tên, email, role và status nếu API có trường. Form chỉ gửi `full_name`, `phone` qua PATCH profile hiện có; email readonly. Có native validation, field errors, loading/disabled, guard duplicate submit từ useApiAction, giữ draft khi API lỗi, xác nhận hủy và beforeunload với dữ liệu chưa lưu.

Chỉ hiển thị thành công sau khi API resolve; sau đó refresh session/profile. Luồng thành công được nối theo contract thật nhưng **không thực thi mutation vào DB trong task này**. Failure/pending/duplicate-submit được kiểm tra bằng cách giữ rồi chặn request mạng, không trả fake success response.

Hai switch thật:

| Tùy chọn | Tác dụng | Lưu trữ |
|---|---|---|
| Chế độ hiển thị gọn | Giảm padding bảng và khoảng cách danh sách; không thu nhỏ chữ hoặc nén form | `studiohub.workspace.preferences.v1.{role}.{userId}` trong localStorage |
| Giảm hiệu ứng chuyển động | Tắt transition/decorative motion trong workspace và dialog; luôn tôn trọng OS reduced motion | Cùng namespace, chỉ boolean |

Switch là button với role switch, aria-checked, accessible label/description, focus rõ và native keyboard Enter/Space. Không lưu credential hoặc identity form trong preference store. Khi storage lỗi, dùng bộ nhớ phiên và nói rõ chưa lưu bền vững. `useSyncExternalStore` có server snapshot ổn định để tránh hydration mismatch; storage/custom event đồng bộ những component đang dùng cùng preference.

Không thêm hint toggle vì chưa có optional hints nhất quán; không giấu validation, scope note hoặc cảnh báo. Không có switch email/SMS/2FA/payment/policy giả. Audit phát hiện đổi mật khẩu và avatar URL **đã có backend trong PATCH profile**, nhưng chưa đưa thêm form bảo mật/upload vào task này. Email-change và notification flow thật vẫn thiếu.

## 3. Admin theo từng màn hình

| Màn hình | Thay đổi |
|---|---|
| Tổng quan | Bốn KPI thật từ users total_items và statistics: tất cả tài khoản, Host, Studio active, room active. Không biến queue đối tác/refund/activity chưa có dữ liệu thành số 0. Tách khỏi form báo cáo. |
| Tài khoản | Toolbar search/role/status gọn; nối status filter backend đã hỗ trợ. Bảng identity/email/role/status; giữ thao tác khóa/mở khóa có xác nhận hậu quả. Không thao tác trên chính mình. |
| Phân quyền | Phân biệt với Accounts, tập trung role hiện tại và assignment Host/customer có sẵn; không lock action hoặc permission matrix giả. Không tạo role/quyền mới và không đổi role thật khi QA. |
| Đối tác | Container xét duyệt với unavailable state đúng module, không hồ sơ/count/nút duyệt giả; không hướng dẫn Admin “liên hệ quản trị viên”. |
| Studio & phòng | Nối public room catalog chỉ đọc, search và pagination thật; ảnh/placeholder và quan hệ Studio–physical room rõ. Ghi rõ không phải toàn bộ Admin inventory. Không có nút Admin edit/delete chưa có API. |
| Thiết bị | Scope toàn hệ thống chưa được hỗ trợ; nêu rõ public equipment theo Studio không thay thế global inventory. Không giả lập bảng toàn hệ thống. |
| Giám sát đơn | Tái sử dụng list có base path `/admin/bookings`, giữ GET role-scoped ở backend. View chi tiết Admin chỉ đọc, không lộ nút thanh toán Customer hoặc transition Host. |
| Ngoại lệ hoàn tiền | Unavailable state đúng phạm vi; không thêm refund state, amount, retry hoặc approve action. |
| Nhật ký | Nêu rõ backend có ghi một số log nhưng chưa có API đọc; không fake activity feed. |
| Báo cáo | Dùng cùng foundation báo cáo Host nhưng gọi Admin statistics; giữ các số liệu được trả về, gồm active customers, resources, bookings, completed revenue và occupancy. Không chart series giả. |
| Cài đặt | Shared Settings trong Admin shell với identity, API self-profile và preferences riêng theo role/account. |

Các thao tác PATCH status/role còn hiện trong sản phẩm vì endpoint thật đã có; không có thao tác nào được agent thực hiện lên dữ liệu thật. Conditions và role constraints hiện hành được giữ; chỉ tách vị trí các action theo mục đích màn hình.

## 4. Responsive và visual QA

Sidebar desktop 248px, thu gọn 80px; topbar khoảng 64px. Mobile/tablet dùng Modal navigation có focus trap/restore và body-scroll lock có sẵn. Settings hai cột khi đủ rộng, một cột trên màn hình hẹp; bảng cuộn trong container có nhãn/focus thay vì kéo rộng toàn trang. Shared CSS/token không thay font/body Customer hoặc nới role.

Đã kiểm tra 11 màn hình Admin và Host Settings tại **360, 390, 768, 1024, 1280, 1440px**. Đã mở ảnh render để xem các trang Admin, menu tài khoản, Settings, mobile và các trạng thái empty/error. Không có horizontal page overflow trong các checks. Preferences được bật/tắt bằng bàn phím và tồn tại sau reload; OS reduced motion vẫn có hiệu lực khi switch local tắt.

Ảnh trong thư mục ignored `client/test-results/management-ui/`. Ví dụ `admin-overview-1440.png`, `admin-users-1440.png`, `admin-roles-1440.png`, `admin-settings-390.png`, `host-settings-390.png`, `host-account-menu.png`, `admin-mobile-drawer.png`.

Ảnh Unsplash bên ngoài bị chặn trong QA để ổn định và kiểm tra fallback ảnh thật; không xác nhận CDN ảnh hoạt động. Không kiểm thử thiết bị cảm ứng vật lý hoặc screen reader đầy đủ. Không có standalone React component runner trong package; tương tác component được kiểm tra trên trang bằng Playwright.

## 5. Audit API và quyết định chưa giải quyết

Ba tài liệu tiếng Việt:

1. `docs/api/API_GAP_AUDIT.md` — ma trận Host/Admin/Settings, evidence, phân biệt connected/partial/missing/not-runtime-verified/business-decision; inventory từng route.
2. `docs/api/PROPOSED_API_CONTRACTS.md` — 34 cặp method–route đề xuất, request/response/error/role/dependencies; tất cả chưa triển khai.
3. `docs/api/API_IMPLEMENTATION_BACKLOG.md` — milestone G0/H1/H2/A1/A2/A3/S1, priority, dependencies, security và acceptance criteria.

`API_RUNTIME_EVIDENCE.json` là bằng chứng máy đọc được, không chứa JWT hoặc nội dung hồ sơ người dùng. Router có 41 declarations, trong đó 37 API ứng dụng, một health alias và ba dev probes. Đã chạy 32 checks HTTP đúng kỳ vọng, bao phủ 17 thao tác khác nhau trả 200. 20 thao tác còn lại chỉ review source. Trong các API đọc có 7 route vẫn partial đối với yêu cầu management đầy đủ; không coi HTTP 200 là đầy đủ nghiệp vụ.

Các phần đã có backend nhưng frontend chưa dùng đầy đủ: đổi mật khẩu, avatar_url, equipment metadata/image_url. Các phần thiếu thật: owner inventory đầy đủ, application workflow, global Admin resource management, role/permission catalog, refund exception model/actions, log read API, time series, policies và optional email/notification flows.

S01/R01 ghi nhận **nguy cơ theo mã nguồn, chưa khai thác** về category_id mới của thiết bị không thấy kiểm tra cùng Studio/owner trong update. Mục này được đưa P0 để xác minh riêng; không sửa PHP hoặc thử ghi cross-owner trong task này. Các quyết định type/policy/approval/refund/financial definitions vẫn để chủ sản phẩm duyệt.

## 6. Kiểm chứng thực thi

| Lệnh/check | Kết quả |
|---|---|
| Baseline `npm.cmd test` | 144 test đạt trước sửa code |
| `npm.cmd test` sau sửa | 147 test đạt; thêm ba test về validation/isolation của preferences |
| `npm.cmd run lint` | Đạt |
| `npm.cmd run build` | Đạt, có kiểm tra TypeScript và static generation |
| `npm.cmd run typecheck` | Đạt; chạy sau build để tránh race `.next/types` |
| `node scripts/management-api-audit.mjs` | 32/32 expected HTTP checks, 17 operation verified; không mutation nghiệp vụ |
| `node scripts/management-ui-qa.mjs` | Đạt các viewport/menu/settings/preferences/filter/error/role/Customer regression checks; không fake success hoặc forward mutation dữ liệu |
| So sánh file backend đầu/cuối | 222 file source/SQL/config liên quan được hash, 0 thay đổi |
| So sánh dữ liệu MySQL | Checksum các bảng trùng baseline đầu task |

Trong QA, một lần dev server trả lỗi Next `Unexpected end of JSON input` sau quá trình build/dev đọc manifest; mở lại runtime đã bình thường. Lượt xác minh cuối chạy sau khi build hoàn tất; không sửa backend hoặc cấu hình để bỏ qua lỗi ứng dụng.

**Không được suy rộng kết quả:** chưa runtime-test profile save success, account lock/unlock, role assignment, Host mutations, pending booking detail có expire-on-access hoặc mutation tài chính. Network-abort test chỉ chứng minh mapping, pending guard, giữ draft và xử lý lỗi. Không gọi mutation thật hoặc cung cấp payload success giả để đánh dấu những đường này verified.

## 7. Xác nhận phạm vi

- PHP/backend dependencies/env, schema/migration/seed không được sửa. `server/src/Core/Router.php` và các file Docker/khác đã có trạng thái thay đổi từ trước task; hash đối chiếu đầu/cuối không đổi.
- Không tạo/sửa/xóa bản ghi database; MySQL checksum đầu/cuối trùng. Chỉ dùng SELECT/GET và auth login/logout stateless đã review. Không chạy backend integration tests có ghi DB.
- Không thay state machine, pricing, inventory, payment/refund calculations, auth/authorization rules, Helpdesk hoặc 9Router.
- Customer Profile và Customer website tiếp tục dùng giao diện public; thay đổi liên quan duy nhất là account link của **Host/Admin** trên public header đi Settings đúng vai trò. Customer link vẫn `/profile`.
- Không commit, push hoặc deploy. Giữ các chỉnh sửa working tree có sẵn.

## 8. Danh sách chính xác file của giai đoạn này

| File | Mục đích |
|---|---|
| `client/src/components/application.tsx` | Public header chỉ thuộc public site; account navigation theo role |
| `client/src/features/host/backend-host.tsx` | Giữ role gate, chuyển Host/Admin sang shell tương ứng |
| `client/src/features/host/host-workspace.tsx` | Tái sử dụng ManagementWorkspace, Settings và route Policies |
| `client/src/features/host/host-activity.tsx` | Reuse report theo role và booking list với base path riêng |
| `client/src/features/host/host-types.ts` | Trường total_customers tùy chọn từ statistics có sẵn |
| `client/src/features/admin/system-pages.tsx` | Accounts/Permissions riêng và read-only public catalog |
| `client/src/features/admin/admin-workspace.tsx` | Admin config, overview, module containers, booking oversight |
| `client/src/features/workspace/management-workspace.tsx` | Shared sidebar/topbar/account dropdown/mobile drawer |
| `client/src/features/workspace/workspace-settings.tsx` | Shared self-profile form, summary, switches, account actions |
| `client/src/features/workspace/preferences.ts` | Preference defaults/parser/key namespace |
| `client/src/features/workspace/use-preferences.ts` | SSR-safe external store, storage event và fallback |
| `client/src/features/workspace/workspace.css` | Shared Settings/menu/admin refinements, compact/reduced motion |
| `client/src/services/api/workspace-preferences.test.ts` | Ba test preference parser và isolation |
| `client/scripts/management-api-audit.mjs` | Reproducible read-only HTTP/source audit |
| `client/scripts/management-ui-qa.mjs` | Browser QA không fake success/ghi dữ liệu |
| `docs/api/API_GAP_AUDIT.md` | Audit tiếng Việt và route inventory |
| `docs/api/PROPOSED_API_CONTRACTS.md` | Hợp đồng đề xuất tiếng Việt, chưa triển khai |
| `docs/api/API_IMPLEMENTATION_BACKLOG.md` | Backlog có acceptance/approval gates |
| `docs/api/API_RUNTIME_EVIDENCE.json` | Bằng chứng HTTP đã lọc token/PII |
| `docs/workspace/UNIFIED_MANAGEMENT_WORKSPACE_REPORT.md` | Báo cáo này |
