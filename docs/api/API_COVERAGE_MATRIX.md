<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Ma trận bao phủ API theo frontend

Ngày 04/11/2026. Đường dẫn component tính từ `client/src`. **Không có xác nhận HTTP PHP/MySQL thành công trong lượt này**: API container dừng, localhost:8000 ECONNREFUSED. “Fixture” là integration test trên production frontend với HTTP interception/test-only data; không đưa mock vào production code. “Đủ frontend/chưa runtime” không phải API backend đã nghiệm thu.

| Role | Page | Feature | Read API | Mutation API | Status | Test Evidence |
|---|---|---|---|---|---|---|
| Guest | `/`, `/rooms` | Discovery, filters, pagination | REST rooms/space-types | — | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Giữ backend-pages/marketplace; unit HTTP contract, chưa PHP |
| Guest/Customer | `/rooms/{id}` | Detail, lịch, giá | REST detail/calendar/rates | — | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Source giữ nguyên; API mới không thay read công khai |
| Guest | `/register`, `/login` | Auth | GET profile sau login | REST register/login | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Session không đổi, chưa login/register thật |
| Customer | `/profile` | Name/phone/email | GET auth/profile | PATCH auth/profile | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Browser fixture profile đúng user, không thêm field mới |
| Customer | `/profile` | DOB/address/email change/avatar upload/identity | Thiếu | Thiếu | MISSING_API | Đọc AuthService/schema, giữ unavailable |
| Customer | `/register/host` | Gửi/theo dõi ứng tuyển | GET workspace applications | POST commands application | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Fixture submit/success/pending; chưa ghi MySQL |
| Customer | `/rooms/{id}/book` | Quote/create booking | REST check-availability/rates/equipment | POST bookings | CONTRACT_MISMATCH | Giữ luồng cũ; lifecycle/pricing workspace chưa thống nhất |
| Customer | `/my-bookings`, `/{id}` | History/detail/cancel | GET bookings/detail | POST cancel | CONTRACT_MISMATCH | Source đối chiếu pending/awaiting_payment; chưa runtime |
| Customer | Payment | Sandbox payment | GET booking/payments | POST payments | SIMULATED_ONLY | Không provider thật, không sửa payment logic |
| Host | `/host` | KPI cơ sở / report toàn Host | GET workspace | — | PARTIALLY_CONNECTED | Owner-filter unit, fixture scope, missing/error không thành 0 |
| Host | `/host/studios` | CRUD cơ sở | GET studios/mine | POST/PATCH studios | IMPLEMENTED_NOT_RUNTIME_VERIFIED | REST giữ nguyên, workspace refresh sau save |
| Host | `/host/rooms` | Phòng active/non-active theo owner | GET workspace rooms/types/studios | — | PARTIALLY_CONNECTED | Fixture 2 Host, hidden room, loại bỏ tài nguyên khác; pagination local |
| Host | `/host/rooms` | Tạo phòng theo room type | GET workspace types | POST commands room_save | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Validator/source; yêu cầu URL ảnh thật, chưa PHP |
| Host | `/host/rooms` | Edit phòng / ảnh | GET workspace | PATCH rooms, POST rooms/images | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Dedicated mutation giữ nguyên; dữ liệu inactive từ workspace |
| Host | `/host/rooms` | Loại phòng list/create/edit | GET workspace types | POST commands type_save | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Fixture create/edit, đúng studio/id; retry cùng key |
| Host | `/host/equipments` | Kho toàn trạng thái | GET workspace equipment | — | PARTIALLY_CONNECTED | Fixture active/hidden/other owner, không ảnh giả |
| Host | `/host/equipments` | Edit/create/categories/deactivate | Workspace + categories | REST equipments/categories | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Giữ REST, thiếu raw status không tự gửi inactive, inactive button disabled |
| Host | `/host/equipments` | Upload ảnh/xóa vĩnh viễn | Thiếu | Thiếu | MISSING_API | Có URL/inactive không tương đương upload/DELETE |
| Host | `/host/rates` | Active rates/create/edit/deactivate | GET rooms/{id}/rates | POST/PATCH rates | PARTIALLY_CONNECTED | Không thay số tiền; thiếu inactive rate và room inactive GET |
| Host | `/host/policies` | Đọc/lưu theo Studio | GET workspace studios.policy | POST commands policy | PARTIALLY_CONNECTED | Fixture save và switch Studio, API không báo configured/default |
| Host | `/host/calendar` | Timetable + booking projection | REST calendar + workspace bookings/availability | — | PARTIALLY_CONNECTED | Fixture phòng/ngày/timezone; không suy ra free slots/buffer từ projection |
| Host | `/host/bookings` | List/detail/transitions REST | GET bookings | PATCH status | CONTRACT_MISMATCH | Không tự đổi lifecycle PHP; backend cần thống nhất |
| Host | `/host/reports` | Statistics có kỳ | GET host/statistics | — | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Endpoint cũ giữ nguyên, chưa PHP |
| Host | `/host/reports` | Tổng hợp/tuần/tháng workspace | GET reports | — | PARTIALLY_CONNECTED | Fixture backend money definitions, tuần/tháng; không gửi filters giả |
| Host | `/host/settings` | Account và local prefs | GET profile | PATCH profile/local prefs | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Không sửa session/preferences, regression source |
| Host | `/host/settings` | Legal/contracts | Thiếu | Thiếu | MISSING_API | Mẫu SVG không phải hợp đồng; không CCCD/bank |
| Admin | `/admin` | KPI REST + queues workspace | GET users/statistics/workspace | — | PARTIALLY_CONNECTED | Component hàng đợi thật theo projection, error state |
| Admin | `/admin/users`, `/roles` | Account/status/role | GET admin/users | PATCH user/status, user/role | PARTIALLY_CONNECTED | Giữ REST; role catalog API còn thiếu |
| Admin | `/admin/host-requests` | List/detail/review | GET workspace applications/users | POST commands review_application | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Fixture details, approval ID/reason; chưa server auth/write |
| Admin | `/admin/studios` | Tài nguyên toàn hệ thống | GET workspace studios/rooms | POST commands studio_status/room_status | PARTIALLY_CONNECTED | Fixture status confirm/payload/refresh; metadata mutations chưa đủ |
| Admin | `/admin/equipments` | Kho toàn hệ thống readonly | GET workspace equipment | Thiếu Admin mutation | PARTIALLY_CONNECTED | Fixture all inventory; không gọi Host endpoint để sửa Admin |
| Admin | `/admin/bookings` | Giám sát REST | GET bookings/detail | — | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Chưa runtime; không thêm payment controls |
| Admin | `/admin/refunds` | Danh sách khoản hoàn readonly | GET workspace refund/refundHistory | Không nối resolve_refund | PARTIALLY_CONNECTED | Fixture reason/amount/status, không nút settlement |
| Admin | Refund execution legacy | Mô phỏng hoàn tiền | Workspace | resolve_refund development-only | SIMULATED_ONLY | Nhãn legacy sửa rõ mô phỏng; không bật luồng tiền thật |
| Admin | `/admin/audit-logs` | Audit | GET workspace audit | — | PARTIALLY_CONNECTED | Fixture records/search/empty; 1000 cap, local pagination |
| Admin | `/admin/reports` | Statistics + xu hướng | GET admin/statistics, reports | — | PARTIALLY_CONNECTED | Fixture totals/series; cần daily/filter API |
| Admin | `/admin/settings` | Account/preferences | GET profile | PATCH profile/local prefs | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Không đổi chức năng, auth giữ nguyên |
| All | Auth/session/logout boundaries | Hết phiên / wrong role / no stale workspace | GET profile/workspace | Existing logout | PARTIALLY_CONNECTED | Unit 401 event, provider user key, browser wrong-role gates; PHP access tests bị chặn |
| All | Transport/schema/idempotency | Validate + JWT + retry | Existing apiRequest | Commands Idempotency-Key | CONNECTED_VERIFIED | Unit + browser HTTP fixture; chỉ xác nhận frontend contract |
| All | Helpdesk widget/bridge | Boundary/provider | Next bridge Helpdesk hiện có | Giữ nguyên | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Helpdesk adapter unit tests; không live PHP/9Router |

## Trạng thái môi trường và business blockers

- `RUNTIME_BLOCKED`: API/PHP/MySQL live verification chưa thể thực hiện vì service api không chạy. Không suy diễn môi trường DB đã migrate từ việc có file migration.
- `BUSINESS_RULE_UNCLEAR`: CCCD, pháp nhân, chủ thể hợp đồng, ký/duyệt/activation, real refund/provider và xóa lịch sử cần quyết định trước.
- `FRONTEND_NOT_CONNECTED`: các domain mới ngoài phạm vi màn hình hiện có (service packages, projects/files, consumables) có backend source nhưng chưa có module tương ứng trong Host/Admin 2.0; không thêm màn hình mới chỉ vì có route. Một số nằm ngoài yêu cầu tích hợp workspace hiện tại, được ghi rõ để không coi là đã phủ toàn bộ sản phẩm tương lai.

Tài liệu chi tiết: [audit](FRONTEND_BACKEND_INTEGRATION_AUDIT.md), [backlog backend còn thiếu](REMAINING_MISSING_APIS.md). Test-only fixtures không phải runtime evidence PHP.
