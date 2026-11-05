<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Kiểm toán tích hợp frontend/backend StudioHub

Ngày 04/11/2026, nền mã sau merge `618fa2e`. Chỉ thay frontend, kiểm thử và tài liệu; không sửa PHP/SQL, không commit/push/deploy. Giữ các thay đổi working tree có sẵn, gồm báo cáo API và `client/next-env.d.ts`.

## Kết luận và bằng chứng môi trường

Đã nối workspace/commands/reports vào **Host Workspace 2.0 và Admin Workspace hiện có**, dùng lại Bearer JWT trong sessionStorage; không bật store cookie hoặc đổi `.env.local`. Dedicated REST đang dùng cho profile, tài khoản, thiết bị, bảng giá, ảnh phòng, booking và statistics được giữ lại.

Không tìm thấy file `StudioHub_API_INVENTORY_UPDATED.md` trong repo. Thay thế bằng router/source và các tài liệu `API_REQUIREMENTS_RECHECK.md`, `PROPOSED_API_CONTRACTS.md`, các báo cáo Host/Customer. Tài liệu cũ chỉ là đầu vào, không chứng minh API hoạt động.

**Runtime PHP bị chặn:** `docker compose exec -T api php` trả `service "api" is not running`; HTTP `http://localhost:8000/api/health` và `/api/workspace` đều `ECONNREFUSED`. Không khởi động stack, không chạy migrations hoặc tạo database thử vì yêu cầu giữ nguyên MySQL. Browser QA dùng HTTP fixtures riêng trong `client/tests/fixtures/workspace.json`, không kết nối PHP/DB. Không gắn nhãn mutation là đã lưu thật trên MySQL.

## Kiến trúc đã triển khai

- Transport giữ `client/src/services/api/client.ts`; bổ sung tùy chọn header `Idempotency-Key`, không đổi token namespace, xử lý hết phiên, cache hoặc auth rules.
- `workspace-contract.ts`: validate object/array, identity, giá trị số hữu hạn, policy/report; phân biệt missing với empty. Không chuyển response lỗi/sai schema thành mảng rỗng hay số 0.
- `workspace-client.ts`: GET workspace/report và whitelist command có type cụ thể; không có `resolve_refund` trong union command của module mới.
- `features/workspace/workspace-data.tsx`: một provider trong role gate, dữ liệu gắn user ID, cleanup request bất đồng bộ khi unmount; reload sau mutation. Command giữ cùng idempotency key cho cùng payload khi retry thất bại, tạo key mới sau thành công. Chặn submit lặp bằng pending guard hiện có.
- Chỉ dùng session hiện tại. Không sao chép JWT sang cookie, không thêm credential, không persist bản sao workspace hoặc CCCD.
- `ownedInventory` xác định cơ sở bằng `studio.hostId === session.user_id`, rồi nối type→room và studio→equipment. Không coi toàn bộ mảng workspace là tài sản của Host vì backend còn trả tài nguyên công khai của Host khác.
- Workspace chỉ có boolean `active`: UI dùng **Không hoạt động** khi false, không giả định là inactive hay maintenance. Khi chỉnh REST, trạng thái không xác định để trống/tùy chọn và không gửi nếu người dùng không chọn.

## Ma trận màn hình và khả năng

Trạng thái đánh giá cả phần còn thiếu. `IMPLEMENTED_NOT_RUNTIME_VERIFIED` = frontend đã nối, có source backend nhưng chưa xác minh PHP/DB. `PARTIALLY_CONNECTED` = đã nối một phần, vẫn thiếu dữ liệu hoặc hợp đồng. Runtime môi trường chung là `RUNTIME_BLOCKED`. Các kiểm thử frontend/fixture được ghi riêng, không thay thế runtime backend.

| Module | Frontend Page | Function | Existing API | Integration Status | Missing Requirement | Priority |
|---|---|---|---|---|---|---|
| Host | `/host/rooms` | List phòng, cả không hoạt động | GET `/api/workspace` | PARTIALLY_CONNECTED | Không có pagination/filter server; projection thiếu status chi tiết và một số metadata | P1 |
| Host | `/host/rooms` | Sửa phòng đang/không hoạt động | Workspace read + PATCH `/api/rooms/{id}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Chưa ghi thật, không thêm trường backend không có | P1 |
| Host | `/host/rooms` | Tạo phòng gắn loại phòng | POST `/api/commands` type `room_save` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Yêu cầu URL ảnh thật; chưa thử ghi thật | P1 |
| Host | `/host/rooms` | List/create/edit loại phòng | Workspace `types` + `type_save` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | DTO khác space-types; chưa có archive type riêng | P1 |
| Host | `/host/equipments` | Kho thiết bị, cả không hoạt động | Workspace `equipment` | PARTIALLY_CONNECTED | Thiếu raw status, brand/category_id trong projection | P1 |
| Host | `/host/equipments` | Create/edit/deactivate | REST POST/PATCH equipments/categories | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Không có DELETE; hình chỉ URL, metadata thiếu không tự ghi đè | P1 |
| Host | `/host/rates` | List/create/edit/deactivate rate | GET/POST/PATCH `/api/rooms/{id}/rates...` | PARTIALLY_CONNECTED | GET chỉ active/effective, không đọc rate inactive; phòng inactive có thể 404 | P1 |
| Host | `/host/policies` | Xem/lưu theo Studio | Workspace `studios[].policy` + type `policy` | PARTIALLY_CONNECTED | Response không phân biệt policy đã lưu với defaults editor | P1 |
| Host | `/host/calendar` | Lịch bận | REST calendar + workspace bookings/availability | PARTIALLY_CONNECTED | Workspace không có busy interval gồm buffer; không kết luận còn chỗ từ projection | P1 |
| Host | `/host/studios` | Thông tin cơ sở | GET mine, POST/PATCH studios | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Giữ REST, thêm refresh workspace sau sửa | P1 |
| Host | `/host` | KPI vận hành theo cơ sở | Workspace, owner filtering | PARTIALLY_CONNECTED | Phạm vi snapshot, report tiền toàn Host không lọc cơ sở | P2 |
| Host/Admin | `/host/reports`, `/admin/reports` | Xu hướng tuần/tháng, số tiền ghi nhận | GET `/api/reports` | PARTIALLY_CONNECTED | Không query ngày/Studio/phòng; không phải doanh thu quyết toán | P2 |
| Host/Admin | Reports | Statistics theo kỳ | GET `/api/{role}/statistics` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Không thay bằng report khác định nghĩa; chưa runtime PHP | P2 |
| Customer | `/register/host` | Gửi/theo dõi hồ sơ Host | Workspace `applications` + type `application` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Chỉ hồ sơ cơ bản; không tự nâng role | P1 |
| Admin | `/admin/host-requests` | List/detail/review | Workspace + type `review_application` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Thiếu giấy tờ pháp lý, timestamps; chưa server filters | P1 |
| Admin | `/admin/studios` | Toàn bộ Studio/phòng, đổi trạng thái | Workspace + studio_status/room_status | PARTIALLY_CONNECTED | Không sửa mọi metadata, server xử lý future reservations | P1 |
| Admin | `/admin/equipments` | Toàn bộ kho chỉ xem | Workspace `equipment` | PARTIALLY_CONNECTED | Chưa có mutation Admin hợp lệ | P1 |
| Admin | `/admin/audit-logs` | Nhật ký thật theo projection | Workspace `audit` | PARTIALLY_CONNECTED | Tối đa 1000, local filter/page, không result/full metadata/detail | P2 |
| Admin | `/admin/refunds` | Khoản hoàn cần xem xét | Workspace booking refund/refundHistory | PARTIALLY_CONNECTED | Không có exception ID/provider reference riêng; chỉ xem | P1 |
| Admin | Refund execution | resolve_refund | POST commands (không nối UI mới) | SIMULATED_ONLY | Chỉ development adapter; không chuyển tiền thật | P0 |
| Admin | `/admin`, users/roles | KPI/users/status/role | REST admin users/statistics; workspace queues | PARTIALLY_CONNECTED | Role catalog chưa có, giữ role assignment hiện có | P2 |
| Account | `/profile`, Host/Admin settings | Name/phone/email | REST auth profile | IMPLEMENTED_NOT_RUNTIME_VERIFIED | DOB/address/email-change/avatar-upload chưa có | P2 |
| Customer | `/login`, `/register`, logout | Authentication | REST auth | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Source giữ nguyên; chưa thử login/register ghi thật | P1 |
| Customer | `/`, `/rooms`, `/rooms/{id}` | Discovery/detail/calendar/rate | REST rooms/lookups | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Giữ hiện trạng, không tự chuyển data model | P1 |
| Customer | Booking/history/cancel/payment | Luồng REST cũ | REST bookings/check-availability/payments | CONTRACT_MISMATCH | Có hai lifecycle REST và workspace khác ngữ nghĩa; xem P0 bên dưới | P0 |
| Host | `/host/settings` | Legal/CCCD/contracts | Không có | MISSING_API | Giữ unavailable và tài liệu SVG minh họa rõ ràng | P1 |
| Helpdesk | Widget + Next bridge | Ranh giới tích hợp | Bridge Helpdesk hiện hữu | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Không đổi backend/provider; unit adapter test, chưa live provider | P2 |

## Đường dẫn mã và hợp đồng chi tiết

| Consumer frontend | Client/hook | Backend handler | Auth / request / response |
|---|---|---|---|
| `features/host/host-resources.tsx`, `host-workspace-forms.tsx` | useHostInventory/useWorkspaceCommand | `Controllers/WorkspaceController.php` → `Services/WorkspaceService.php::state/manage` | Bearer Host; type_save: roomType `{id? ,studioId,name,category,hourlyRate,plans}`; room_save: room `{typeId,name,code,area,capacity,images,floor,feature,included}`; trả full workspace |
| `features/host/host-workspace-forms.tsx::HostPolicies` | useWorkspaceData/useWorkspaceCommand | manage type policy | Host owner; `{type:policy,studioId,policy:{paymentMinutes,depositPercent,cancelHours,changeHours,overtimePerBlock,openHour,closeHour,refundTiers:[{hours,percent}]}}` |
| `features/workspace/host-application.tsx` | WorkspaceDataProvider/useWorkspaceCommand | manage type application | Customer; `{type:application,studioName,address,description}`; không nhận role từ client |
| `features/admin/workspace-modules.tsx::AdminApplications` | useWorkspaceData/useWorkspaceCommand | manage review_application | Admin; `{type:review_application,id,approved,reason}`; pending-only, khi duyệt backend tạo Studio và đổi role |
| `workspace-modules.tsx::AdminWorkspaceResources` | useWorkspaceData/useWorkspaceCommand | manage studio_status/room_status | Admin; `{type,id,active,reason}`; không tự xác nhận chuyển trạng thái trước response |
| `workspace-modules.tsx::AdminAuditLogs/AdminRefundExceptions` | useWorkspaceData | state, dữ liệu audit/refund đã lược trường | Admin read-only; không gửi resolve_refund, không thêm financial transaction reference giả |
| `features/workspace/workspace-reports.tsx` + host-activity | loadWorkspaceReport, useWorkspaceData, useResource statistics | WorkspaceService::report/summarize và Modules/Admin/StatsService | Host/Admin; GET reports không filter; `bookingCount,deposits,collections,refunded,refundDue,outstanding,netCollected,weeklyRooms,monthlyRooms,timezone` |
| `components/api-accounts.tsx`, `features/customer/customer-profile.tsx` | apiRequest/useApiSession | Modules/Auth/AuthController/AuthService | Giữ POST auth, GET/PATCH profile hiện có. Không gửi trường unsupported |
| `features/booking/backend-booking.tsx` | REST client/useResource | Modules/Booking/* | Giữ các request/transition cũ; chưa chứng nhận tương thích sau migrations integration |

Đường dẫn frontend trong bảng tính từ `client/src/`; handler backend tính từ `server/src/`. Tất cả command mới dùng `POST /api/commands`, header Bearer và `Idempotency-Key` dài 16–100 ký tự theo source. Body do typed adapter tạo, không raw fetch trong component.

## Rủi ro và sai khác contract cần xử lý

**P0 — Hai mô hình nghiệp vụ chưa thống nhất.** `Modules/Booking/BookingService.php` REST tạo/expire `pending` chưa thanh toán và cho Host chuyển `rejected`; `migrations/001_integration.php` chuyển đơn chưa thanh toán sang `awaiting_payment`, chuyển `rejected` thành `cancelled`, thêm lifecycle mới. `WorkspaceService` có policy snapshot, pricing config và command riêng. Giá room_type/config không đồng nghĩa room_rates của REST. Cần backend thống nhất hợp đồng/lifecycle/migration; frontend không tự thay PHP hoặc suy đoán trạng thái để che khác biệt. Chưa chạy mutation để thử trên DB thật.

**P1 — Ownership projection và status.** Workspace không phải owner-only collection cho mọi mảng; frontend bổ sung lọc quan hệ Host. Backend vẫn phải là lớp authorization thực. False của `active` không chứng minh maintenance/inactive; UI không tự ghi lại một status cụ thể khi chưa chọn.

**P1 — Policy mặc định chưa có bằng chứng đã lưu.** Response có editor defaults ngay cả khi config chưa được lưu; UI giải thích và không tự thêm refund tiers mặc định. Tier mới để trống để người dùng nhập; giá trị đã lưu phải có xác nhận command từ server.

**P1 — Hoàn tiền chỉ mô phỏng.** Module Admin mới không có mutation hoàn tiền. Nhãn resolve_refund trong giao diện legacy cũng được sửa rõ “Mô phỏng”, không ghi xác nhận quyết toán thật. Định nghĩa report money giữ nguyên từ server, không đổi thành doanh thu/rate utilization bằng công thức tự đặt.

**P1 — Read price/calendar inactive.** Dedicated public GET chặn inactive room, không thể dùng lỗi 404 như danh sách rỗng hợp lệ. Hiển thị lỗi/gap; không dựng free slots hay rate lịch sử từ config khác model.

## Phạm vi kiểm chứng

- Unit/adapters kiểm tra malformed/missing/nullable, đúng user/session, owner filtering (kể cả tài nguyên Host khác trong snapshot), inactive resource, số tiền nguyên bản, PHP empty map, quan hệ room/type lỗi, Bearer + idempotency header.
- Browser HTTP fixtures chạy trên production frontend riêng cổng 3101, chặn mọi request API trước PHP. Kiểm tra create/edit type, duplicate/pending, failure/draft/retry cùng key, policy theo Studio, application/review, Admin status, audit/filter, refund read-only, report definitions, role gates, responsive và error/empty states.
- Đây là **kiểm thử tích hợp frontend với contract fixture**, không phải HTTP PHP/MySQL thành công. Guest/Customer/Host/Admin server permissions chỉ được đọc source, chưa kiểm chứng end-to-end. Backend availability failure được ghi ở đầu báo cáo.
- Chưa chứng nhận đăng ký, booking, payment, CORS backend đang chạy, migrations, isolation/concurrency, external Helpdesk/provider hoặc full screen-reader audit.

## File thay đổi và bảo toàn phạm vi

Frontend mới: `services/api/workspace-contract.ts`, `workspace-client.ts`, `workspace-contract.test.ts`; `features/workspace/workspace-data.tsx`, `command-dialog.tsx`, `host-application.tsx`, `workspace-reports.tsx`; `features/host/host-workspace-forms.tsx`; `features/admin/workspace-modules.tsx`.

Frontend chỉnh: `services/api/client.ts`, `client.test.ts`; `components/api-accounts.tsx`, `bookings.tsx` (nhãn mô phỏng); `features/host/backend-host.tsx`, `host-workspace.tsx`, `host-resources.tsx`, `host-types.ts`, `host-ui.tsx`, `host-calendar.tsx`, `host-activity.tsx`, `host-retirement-dialog.tsx`; `features/admin/admin-workspace.tsx`; `features/workspace/workspace.css`.

Test riêng: `client/tests/fixtures/workspace.json`, `client/scripts/workspace-integration-qa.mjs`. Các fixture không được import vào production component hoặc đặt trong public assets. Tài liệu mới: báo cáo này, `REMAINING_MISSING_APIS.md`, `API_COVERAGE_MATRIX.md`.

254 file PHP/Helpdesk được snapshot trước thay đổi để đối chiếu sau. Không đổi auth rules, booking/payment/refund calculations/transitions, database schema/records, Helpdesk hoặc 9Router. Không commit/push/deploy.

## Kết quả lệnh và ảnh thực tế

- `npm.cmd test`: **189/189 đạt**, gồm 4 test mới adapter workspace/report và test header Bearer/idempotency.
- `npm.cmd run lint`: đạt, không còn warning.
- `npm.cmd run typecheck`: đạt.
- `npm.cmd run build`: production Webpack build đạt.
- `node scripts/workspace-integration-qa.mjs`: đạt trên **360, 390, 768, 1024, 1440px** với HTTP fixtures cô lập; kiểm tra loading, malformed, empty, error, expiry, loại phòng create/edit, idempotent retry/duplicate, policy Studio isolation, application/review, Admin status/audit/refund readonly, reports và role gates. **Không có request PHP/DB nào được forward**.
- Đã mở ảnh render thật của Host rooms/equipment/policies/reports, Admin applications/resources/refunds/audit; layout không tràn ngang toàn trang, bảng dùng vùng cuộn riêng. Ảnh fixture tại `client/test-results/workspace-integration/`, không phải dữ liệu sản xuất và không publish.
- Đối chiếu 254 file backend/Helpdesk sau triển khai: **0 file thay đổi**. Không có SQL, migration, seed, PHP write test hoặc Docker restart được chạy.
- Runtime live PHP/MySQL: **RUNTIME_BLOCKED** do API container không chạy và localhost:8000 từ chối kết nối. Cần nhóm backend kiểm chứng migrations và lifecycle trên DB phát triển riêng; không khẳng định persistence thật đã pass.
