<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](api/FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Checklist độ phủ API theo yêu cầu đồ án

Ngày rà soát: 04/11/2026 (đối chiếu lại sau khi bổ sung REST API)

## Phạm vi

Checklist này đối chiếu danh sách API bạn vừa dán với code hiện có trong workspace. Đây là rà soát tĩnh; các route mới chưa chạy được trên PHP/MySQL trong môi trường hiện tại.

File PDF đồ án được nhắc trước đó hiện không có ở đường dẫn đã gửi. Vì vậy kết quả xác minh theo checklist API bạn dán và code trong repo, chưa phải đối chiếu độc lập với PDF gốc.

### Ký hiệu

- **✅ Có route**: route REST được đăng ký và có controller/service xử lý.
- **🟡 Một phần / khác hợp đồng**: route REST chỉ hỗ trợ một phần yêu cầu.
- **❌ Chưa có**: không tìm thấy route REST hoặc chức năng tương ứng.
- **FE ✅/🟡/❌**: frontend đã nối trực tiếp / dùng API workspace khác / chưa thấy luồng sử dụng.

“Có route” là kết luận đọc mã, không đồng nghĩa đã chạy thành công trên database thật.

## Kết luận nhanh

- Phần auth cơ bản, catalog công khai, host tạo/sửa tài nguyên và booking REST đều có route.
- Các API quản lý Host/Admin, đăng ký Host và báo cáo đã được bổ sung vào backend hiện tại. Các mục chưa có được ghi rõ tại từng phần.
- Backend hiện tại không đăng ký `/api/workspace` hoặc `/api/commands`; các màn frontend dùng state/local mock chưa tự động kết nối với REST API mới.
- **Frontend chưa sẵn sàng nối end-to-end:** các call REST có lỗi xác thực JWT, booking REST tách khỏi lifecycle dashboard, payment UI không gọi sandbox API. Rà tĩnh còn thấy 27 tham chiếu import `@/…` không trỏ tới file hiện có trong client; các route/page liên quan không thể được xem là đã hoàn tất cho tới khi import được sửa và build/typecheck được.

## 1. Tài khoản và xác thực

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `POST /api/auth/register` | ✅ | 🟡 | Đăng ký Customer có trong REST; UI đăng ký hiện gọi proxy workspace/auth. |
| `POST /api/auth/login` | ✅ | 🟡 | Đăng nhập có trong REST; proxy có route đăng nhập và giữ JWT trong cookie HttpOnly. |
| `POST /api/auth/logout` | ✅ | 🟡 | Có REST và proxy workspace. |
| `GET /api/auth/profile` | ✅ | 🟡 | Có REST; profile UI hiện dựa vào Workspace state/command, chưa thấy gọi endpoint này. |
| `PATCH /api/auth/profile` | ✅ | 🟡 | Hỗ trợ tên, điện thoại, URL avatar, ngày sinh, địa chỉ và đổi mật khẩu; ngày sinh/địa chỉ cần chạy migration `010_user_profile_details.sql`. UI chưa dùng contract REST này. |
| `POST /api/auth/email-change-requests` | ✅ | ❌ | Xác nhận mật khẩu hiện tại, mã 6 số hết hạn sau 15 phút, giới hạn tần suất. Production gửi qua PHP `mail()`; dev/test trả mã để thử. |
| `POST /api/auth/email-change-confirmations` | ✅ | ❌ | Mã dùng một lần; đổi email và audit trong transaction. |
| `POST /api/account/avatar` | ✅ | ❌ | Upload JPG/PNG/WebP tối đa 5 MiB, thay avatar cũ. |
| `GET/PATCH /api/account/notification-preferences` | ✅ | ❌ | Lưu bốn tùy chọn email/SMS/in-app; chưa nối dịch vụ gửi thông báo. |
| `GET/POST /api/account/identity-verification` | ✅ | ❌ | Lưu 4 ký tự cuối và tệp riêng tư; admin có API đọc, tải tệp có audit, duyệt/từ chối. |
| Ngày sinh, địa chỉ trong profile | ✅ | ❌ | Đã thêm `date_of_birth` và `address` vào GET/PATCH profile; cần áp dụng migration `010_user_profile_details.sql`. |

## 2. Danh mục công khai

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `GET /api/rooms` | ✅ | 🟡 | Search, filter, pagination có. Frontend có trang gọi API nhưng các import của trang đang thiếu; chưa xác nhận runtime. |
| `GET /api/rooms/{id}` | ✅ | 🟡 | Chi tiết phòng active có. Trả 404 với phòng inactive nên không dùng làm trang quản lý phòng đã ẩn. |
| `GET /api/rooms/{id}/calendar` | ✅ | 🟡 | Lịch của một phòng; frontend wizard gọi. |
| `GET /api/rooms/{id}/rates` | ✅ | 🟡 | Trả rate active; không đáp ứng việc xem rate đã ngừng áp dụng của Host. |
| `GET /api/equipments?studio_id=` | ✅ | 🟡 | Trả thiết bị active của Studio active; dùng được cho catalog/đặt phòng, không phải danh sách quản lý gồm inactive. |
| `GET /api/space-types` | ✅ | 🟡 | Có; frontend host form có gọi. |
| `GET /api/amenities` | ✅ | 🟡 | Có; frontend host form có gọi. |

## 3. Host — Studio, phòng, thiết bị và giá

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `GET /api/studios/mine` | ✅ | 🟡 | Route và trang Host có call; hiện vướng JWT client/proxy. |
| `POST /api/studios` | ✅ | 🟡 | Tạo Studio; contract yêu cầu tên, địa chỉ, quận, thành phố, điện thoại. |
| `PATCH /api/studios/{id}` | ✅ | 🟡 | Cập nhật thông tin và active/inactive. |
| `POST /api/rooms` | ✅ | 🟡 | Tạo phòng; có yêu cầu ít nhất một `space_type_id`. |
| `PATCH /api/rooms/{id}` | ✅ | 🟡 | Sửa thông tin và trạng thái active/maintenance/inactive. |
| `POST /api/rooms/{id}/images` | ✅ | 🟡 | Upload ảnh phòng; frontend có call multipart nhưng hiện token không được chuyển tiếp. |
| `GET/POST /api/equipment-categories` | ✅ | 🟡 | Có; yêu cầu `studio_id`, ownership được kiểm tra. |
| `POST /api/equipments` | ✅ | 🟡 | Thêm thiết bị. |
| `PATCH /api/equipments/{id}` | ✅ | 🟡 | Sửa/ngừng cung cấp qua status; không có xóa vật lý. |
| `POST /api/rooms/{id}/rates` | ✅ | 🟡 | Tạo giá; frontend có call. |
| `PATCH /api/rooms/{id}/rates/{rate_id}` | ✅ | 🟡 | Sửa/ngừng áp dụng; backend route có nhưng UI hiện chưa thấy call PATCH rate. |
| `GET /api/host/rooms` | ✅ | 🟡 | Route Host riêng, scoped theo Studio sở hữu và trả cả phòng inactive; frontend chưa gọi route này. |
| `GET /api/host/rooms/{id}` | ✅ | 🟡 | Chi tiết quản lý cho phòng active/inactive; trả loại không gian, tiện ích và ảnh. |
| `GET /api/host/equipments` | ✅ | 🟡 | Route Host riêng, trả cả active/maintenance/inactive và lọc theo trạng thái. |
| `GET /api/host/rooms/{id}/rates` | ✅ | ❌ | Trả mọi bảng giá, kể cả inactive/hết hạn; kiểm tra quyền sở hữu phòng. |
| `GET /api/host/calendar` | ✅ | 🟡 | Lịch gộp theo Studio, tối đa 62 ngày; chỉ trả booking đang giữ lịch và không trả PII khách. Frontend chưa nối. |
| `GET/PATCH /api/host/policies` | ✅ | ❌ | Đọc/cập nhật chính sách theo Studio; giờ mở cửa, tiền cọc, thời gian giữ, hạn hủy và mức hoàn được áp vào availability/booking. `change_hours` và `overtime_per_30m` hiện chỉ được lưu, chưa có endpoint đổi lịch/ghi nhận quá giờ để áp dụng. |
| `POST /api/studios/{id}/cover` | ✅ | ❌ | Upload ảnh cover JPG/PNG/WebP, ownership kiểm tra theo Host. |
| `POST /api/equipments/{id}/images` | ✅ | ❌ | Upload nhiều ảnh thiết bị; có thể đặt ảnh chính. |
| `GET/POST /api/host/room-types`, `PATCH /api/host/room-types/{id}` | ✅ | ❌ | Loại phòng riêng theo Studio; phòng có thể gắn một loại. `space-types` vẫn là danh mục lookup dùng chung. |
| `DELETE /api/equipments/{id}` | ✅ | ❌ | Xóa vật lý chỉ khi không có booking history; audit và dọn ảnh liên quan. |
| `DELETE /api/rooms/{id}/rates/{rate_id}` | ✅ | ❌ | Chỉ xóa rate inactive và chưa được booking tham chiếu; audit. |

## 4. Đặt phòng và thanh toán

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `POST /api/bookings/check-availability` | ✅ | 🟡 | Frontend gửi đúng tên trường chính; auth không cần cho check. |
| `POST /api/bookings` | ✅ | 🟡 | Frontend có call nhưng cần đăng nhập; direct API client không lấy được JWT từ cookie HttpOnly. |
| `GET /api/bookings` | ✅ | ❌ | Có filter theo user/role; frontend dashboard hiện lấy danh sách từ Workspace API. |
| `GET /api/bookings/{id}` | ✅ | ❌ | Có ownership scope; chưa thấy frontend gọi REST endpoint này. |
| `PATCH /api/bookings/{id}/status` | ✅ | ❌ | Host status API có; frontend dashboard dùng Workspace command. |
| `POST /api/bookings/{id}/cancel` | ✅ | ❌ | Có route REST; frontend dashboard dùng Workspace command. |
| `POST /api/bookings/{id}/payments` | ✅ | ❌ | Backend sandbox có; booking success UI hiện chỉ hiện hướng dẫn chuyển khoản tĩnh, không gọi endpoint này. |

**Xung đột lifecycle cần xử lý:** REST booking tạo status `pending` và chờ cọc trong 15 phút. Workspace flow có `awaiting_payment` rồi mới `pending`; dashboard đọc booking REST không có snapshot sẽ coi là legacy và từ chối các command thay đổi. Cần chọn một nguồn booking duy nhất trước khi nối màn lịch sử/Host.

## 5. Đăng ký Host, hồ sơ pháp lý và hợp đồng

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `POST /api/host-applications` | ✅ | ❌ | Customer active gửi tên Studio, địa chỉ, mô tả; chặn hồ sơ pending/approved trùng và ghi audit log. |
| `GET /api/host-applications/current` | ✅ | ❌ | Customer xem hồ sơ gần nhất của mình; trả `null` khi chưa gửi. |
| `GET /api/admin/host-applications` | ✅ | ❌ | Có lọc trạng thái và phân trang; Admin-only. |
| `GET /api/admin/host-applications/{id}` | ✅ | ❌ | Có chi tiết hồ sơ, người nộp và người xét duyệt. |
| `PATCH /api/admin/host-applications/{id}/decision` | ✅ | ❌ | Chỉ xử lý hồ sơ pending; từ chối bắt buộc lý do; duyệt cấp role Host cùng transaction/audit. |
| `GET/PATCH /api/host/legal-profile` | ✅ | ❌ | Host lưu hồ sơ cá nhân/doanh nghiệp; PATCH chuyển hồ sơ sang submitted. |
| `GET /api/admin/legal-profiles`, `PATCH /api/admin/legal-profiles/{id}/decision` | ✅ | ❌ | Admin duyệt/từ chối hồ sơ đã gửi; từ chối cần lý do, quyết định có audit. |
| `GET /api/host/contracts` | ✅ | ❌ | Danh sách hợp đồng thuộc Host. |
| `GET /api/host/contracts/{id}` | ✅ | ❌ | Chi tiết có ownership scope. |
| `POST /api/host/contracts/{id}/document-access` | ✅ | ❌ | Cấp URL một lần/5 phút cho PDF hợp đồng active; tải xuống được audit. Không giả lập chữ ký điện tử. Admin đăng ký hợp đồng tại `POST /api/admin/studios/{studio_id}/contracts`. |

## 6. Admin và báo cáo

| API/yêu cầu | Backend | Frontend | Ghi chú |
| --- | --- | --- | --- |
| `GET /api/admin/users` | ✅ | 🟡 | Có filter role/status/search và pagination; Admin UI chính vẫn đọc Workspace state. |
| `PATCH /api/admin/users/{id}/status` | ✅ | 🟡 | Có; không cho Admin tự khóa mình. |
| `PATCH /api/admin/users/{id}/role` | ✅ | 🟡 | Có; không cấp role admin qua API. |
| `GET /api/admin/statistics` | ✅ | 🟡 | Có số tổng hợp; không phải route series riêng. |
| `GET /api/host/statistics` | ✅ | 🟡 | Có bookings, revenue, occupancy và số Studio/phòng; không trả chuỗi biểu đồ. |
| `GET /api/admin/studios`, `/api/admin/rooms`, `/api/admin/equipments` | ✅ | ❌ | Có lọc trạng thái/tìm kiếm và phân trang; Admin-only. |
| `PATCH /api/admin/studios/{id}`, `/rooms/{id}`, `/equipments/{id}` | ✅ | ❌ | Có allowlist field, validation, transaction và audit log; giảm tồn kho bị chặn nếu thấp hơn booking tương lai đã giữ. |
| `GET /api/admin/roles` | ✅ | ❌ | Đọc danh mục từ bảng `roles`. |
| `GET /api/admin/refund-exceptions[/{id}]` | ✅ | ❌ | Gộp refund booking và service order pending/failed; phân biệt `refund_kind`. ID service order dùng dải riêng bắt đầu từ `1,000,000,000,000`. |
| `POST /api/admin/refund-exceptions/{id}/actions` | ✅ | ❌ | Admin xác nhận đối soát thành công bằng mã bằng chứng hoặc đánh dấu failed kèm lý do; ghi lịch sử/audit, không chuyển tiền. |
| `GET /api/admin/audit-logs` | ✅ | ❌ | Có phân trang, actor và metadata; Admin-only. |
| `GET /api/admin/reports/series` | ✅ | ❌ | Số booking theo ngày bắt đầu, doanh thu theo ngày hoàn tất; kỳ `[from,to)`. |
| `GET /api/host/reports/series` | ✅ | ❌ | Có series scoped theo Host; frontend chưa nối. |
| `GET /api/host/overview` | ✅ | ❌ | Ghép thống kê với tối đa 10 booking sắp tới; frontend chưa nối. |

## Lỗi tích hợp frontend phát hiện khi scan tĩnh

1. **JWT không đi cùng đường gọi API:** auth proxy ghi cookie `studiohub_auth` HttpOnly; API client REST chỉ tìm token trong `sessionStorage`. Các call `apiRequest` cần auth vì vậy có nguy cơ 401. Proxy hiện cũng chỉ allowlist `workspace`, `commands`, `reports`, auth và quote; chưa forward các REST host/booking route.
2. **Có 27 tham chiếu import `@/…` không tìm thấy file/module đích** trong snapshot đã rà. Ví dụ `app/profile` trỏ tới `features/account/account-page`, `app/checkout` trỏ tới `features/booking/booking-wizard`, `app/rooms` trỏ tới `features/marketplace/marketplace`; các component backend còn import các thư mục `providers`, `components/ui/*`, `components/shared` và `lib/format` không tồn tại trong source tree. Cần sửa imports hoặc khôi phục đúng modules trước khi đánh giá UI là tích hợp xong.
3. **Host room list gửi `studio_id` lên public `GET /api/rooms`, nhưng backend bỏ qua filter này.** Cần route Host có Auth + Role + Ownership, bao gồm tài nguyên inactive.
4. **Danh sách equipment hiện tại chỉ trả active.** Cần API quản lý Host riêng để xem và sửa item inactive.
5. **Trang thanh toán hiển thị tài khoản mẫu nhưng không ghi payment vào DB.** Cần ghi rõ sandbox/không chuyển tiền thật và gọi sandbox API, hoặc bỏ hướng dẫn chuyển khoản khỏi demo.

## Việc cần làm theo thứ tự

- [ ] Chạy sửa các import frontend bị thiếu để app typecheck/build được; sau đó mới đánh giá trạng thái UI thật.
- [ ] Thống nhất auth proxy: chuyển mọi REST request cần JWT qua server proxy, cho phép endpoint cần thiết và hỗ trợ multipart có giới hạn cho upload.
- [ ] Chọn REST booking làm nguồn chính hoặc Workspace làm nguồn chính; đồng bộ status, list/detail/payment/cancel/host update về cùng một luồng.
- [x] Bổ sung Host list/detail cho phòng, thiết bị, rate và calendar có bao gồm tài nguyên inactive.
- [x] Thêm ngày sinh/địa chỉ vào profile, đổi email, avatar, notification preferences và identity verification.
- [x] Thêm policy REST, Studio cover, ảnh thiết bị, room-types, xóa vật lý có điều kiện, hồ sơ pháp lý/hợp đồng, refund actions cho booking/service order, và API trạng thái Host application của Customer.
- [ ] Áp dụng migrations `009`–`012`, sau đó lint/test trên PHP + MySQL.
- [ ] Nối UI tới endpoints đã có; xác nhận mỗi màn Customer/Host/Admin thao tác được đúng role và đúng dữ liệu.
- [x] Cập nhật OpenAPI/ma trận truy vết theo contract thực tế. Frontend integration vẫn còn việc riêng.
- [ ] Sau sửa mới chạy typecheck/build và test API end-to-end trên MySQL test.

## Câu cần chốt với báo cáo đồ án

- Các mục tài khoản nâng cao, hồ sơ pháp lý/hợp đồng và ảnh đại diện có bắt buộc trong phạm vi nộp không?
- Admin cần endpoint REST riêng cho tài nguyên/refund/audit hay Workspace command hiện tại được chấp nhận?
- Có cần xem và quản lý dữ liệu inactive/ẩn trong mọi màn Host/Admin không?
- Giao diện thanh toán được phép mô phỏng thao tác nào khi chưa có cổng/provider thật?
- Các module packages/projects/files/consumables là yêu cầu đồ án hay phần mở rộng backend?
