# Customer Profile 2.0 — báo cáo triển khai

Ngày 04/11/2026. Triển khai frontend trực tiếp trong repository, không commit/push/deploy.

## Điều hướng

`application.tsx` trước đây chọn nhánh quảng bá đăng ký Host cho mọi người không phải Host/Admin; mobile còn render link này vô điều kiện. Đã bỏ hai nhánh đó khỏi header/drawer. Route đăng ký Host và link đối tác trong nội dung footer vẫn giữ nguyên theo phạm vi yêu cầu không thiết kế lại footer.

Guest: logo, khám phá, đơn thuê có chặn đăng nhập, đăng nhập. Customer: logo, khám phá, đơn thuê và một dropdown duy nhất dùng tên/initials thật. Dropdown có Hồ sơ, Đơn thuê, Đăng xuất; hỗ trợ mũi tên/Home/End, Escape trả focus, Tab, nhấp ngoài và vị trí thích ứng chiều rộng. Logout gọi session hiện có. Mobile drawer không lặp lại mục hồ sơ khách hàng.

Host/Admin giữ shell, menu và role gate riêng; header công khai không xuất hiện trong workspace. Vai trò lấy từ session API, không đoán theo route hoặc local preferences; trước khi xác thực hoàn tất không render menu khách hàng hoặc link dành cho người quản lý. Luồng demo giữ cơ chế phiên riêng, đồng thời không còn quảng bá đăng ký Host trong header/drawer.

## Bố cục và nguyên nhân khoảng trống

Form cũ dùng `.api-form` với `max-width:760px` trong container rộng, không có cột nhận diện tài khoản. Đây là nguyên nhân khoảng trống bên phải. `.account-page` thêm padding dưới 80px; không tìm thấy spacer riêng hoặc footer trùng trong route này. Không sửa bằng negative margin hay kéo dài form.

Account Center mới có khung tối đa 1240px, cột trái 300px (250px trên desktop nhỏ) và cột phải linh hoạt; dưới 850px chuyển thành một cột. Summary cyan, role tiếng Việt, email thật, trạng thái có điều kiện, navigation và lời nhắc riêng tư. Form trắng viền đậm, góc bo, bóng cứng; Be Vietnam Pro chỉ áp dụng cho customer profile/menu, dùng lại font local đã có.

Các phần: Thông tin cá nhân, Địa chỉ liên hệ, Xác minh danh tính và vùng lưu/hủy. Ngày sinh disabled, email readonly có giải thích; địa chỉ và CCCD là trạng thái chưa khả dụng, không thu thập. Không làm từng input thành card riêng.

Profile tự có padding 44px/48px, mobile 30px/36px; bỏ sự phụ thuộc `.account-page`/`.api-form`, reset margin label cục bộ tránh cộng dồn khoảng cách global. Footer công khai được giữ nguyên, chỉ có một footer, sát sau biên section profile. Không có fixed height, spacer hoặc absolute positioning cho bố cục trang.

## Trường và khả năng lưu

| Trường | Kết quả |
|---|---|
| Họ tên | Giữ API hiện có; trim, Unicode, 2–100 ký tự; dữ liệu thật |
| Điện thoại | Giữ API hiện có; chuỗi tối đa 20 ký tự, nullable; không thêm regex làm mất định dạng hợp lệ |
| Email | Có DB/GET; chỉ đọc vì chưa có API đổi email |
| Ngày sinh | Chuẩn bị input ngày bị vô hiệu hóa; cần DB/DTO/validation backend |
| Địa chỉ | Mục riêng, chưa bật sửa; cần quyết định dạng lưu và triển khai backend |
| CCCD | Không thu thập/lưu/gửi; cần phê duyệt mục đích, quyền, bảo mật, retention và API chuyên biệt |
| Avatar | API hỗ trợ URL nhưng chưa có upload; dùng initials, không tạo ảnh/đường dẫn giả |

Lưu chỉ gửi `full_name`/`phone`, khóa thao tác khi pending và chặn submit lặp bằng `useApiAction` hiện có. API response làm mốc sạch, sau đó refresh session; chỉ hiện thành công sau phản hồi PATCH thành công. Lỗi mạng có thông báo tiếng Việt hướng tới người dùng, giữ bản nháp; lỗi trường được gắn với input. Không đưa chi tiết cấu hình backend vào thông báo lỗi mạng của trang này.

Có thông báo thay đổi chưa lưu, hủy cần xác nhận, cảnh báo trước reload/đóng tab và liên kết rời trang. Không thay router hoặc session để cài cơ chế chặn lịch sử toàn cục; cảnh báo không cam kết ngăn mọi thao tác Back/Forward nội bộ. Draft không lưu vào storage. Khi mất phiên, form bị gỡ khỏi giao diện.

Kiểm tra chi tiết và hợp đồng **đề xuất chưa triển khai**: [CUSTOMER_PROFILE_API_GAPS.md](CUSTOMER_PROFILE_API_GAPS.md).

## Danh sách file của thay đổi này

| Đường dẫn | Mục đích |
|---|---|
| `client/src/components/application.tsx` | Sửa render nav Guest/Customer, gắn dropdown, bỏ mục hồ sơ lặp trong drawer |
| `client/src/components/api-accounts.tsx` | Chuyển ApiProfile sang component CustomerProfile; giữ ApiAuth |
| `client/src/features/customer/account-menu.tsx` | Dropdown thực, bàn phím/focus/logout |
| `client/src/features/customer/customer-profile.tsx` | Account Center, dữ liệu phiên thật, form và trạng thái |
| `client/src/features/customer/customer.css` | Style cô lập, font local, breakpoint và reduced motion |
| `client/src/features/customer/profile-data.ts` | Whitelist payload, validation và initials |
| `client/src/services/api/customer-profile.test.ts` | Kiểm tra Unicode, số điện thoại, giới hạn, initials |
| `client/scripts/customer-profile-qa.mjs` | QA browser thật, chặn toàn bộ mutation tài nguyên |
| `docs/customer/CUSTOMER_PROFILE_API_GAPS.md` | Audit trường/API/DB, đề xuất backend và yêu cầu định danh |
| `docs/customer/CUSTOMER_PROFILE_REDESIGN_REPORT.md` | Báo cáo triển khai, kiểm chứng và giới hạn |

Không sửa `layout.tsx`, auth context, API client, route PHP, schema, Host/Admin/Helpdesk hoặc các workflow booking/payment/refund.

## Kết quả kiểm chứng

- `npm.cmd test`: **150/150** đạt, gồm 3 test mới cho profile.
- `npm.cmd run lint`: đạt.
- `npm.cmd run typecheck`: đạt; chạy sau build để tránh xung đột thư mục `.next/types`.
- `npm.cmd run build`: đạt production build.
- `node scripts/customer-profile-qa.mjs`: đạt với API thật, login Customer/Host/Admin và guest.
- Sáu chiều rộng **360, 390, 768, 1024, 1280, 1440** không tràn ngang; desktop hai cột, tablet/mobile xếp gọn. Một footer, khoảng cách giữa biên section và footer dưới 2px.
- Kiểm tra tên/điện thoại/email thật, input readonly/disabled, không có input CCCD/ảnh giấy tờ, không gửi field chưa hỗ trợ.
- Dropdown keyboard/Home/End/Escape, outside click, route hồ sơ/đơn thuê, logout xóa token, reduced motion đều đạt.
- PATCH kiểm thử được giữ lại rồi abort trước server: đúng hai khóa, chỉ một request khi submit lặp, busy disabled, lỗi giữ draft, không hiện thành công giả; hủy rồi reload đọc lại dữ liệu thật. Chặn liên kết rời khi draft chưa lưu được kiểm tra.
- Không có lỗi JavaScript chưa xử lý trong lượt QA thành công.
- Đã mở ảnh render thật: desktop1440, mobile360/390, tablet768, dropdown và trạng thái lỗi. Ảnh ở `client/test-results/customer-profile/` (artifact local được ignore, có thông tin seed nên không publish).

Giới hạn: không thực hiện lưu thành công thật hoặc sửa dữ liệu rồi restore, vì vẫn là thay đổi records trái scope. Do đó không khẳng định đã kiểm chứng end-to-end sau ghi. Không giả API thành công. Chưa có kiểm tra screen reader đầy đủ hoặc thiết bị cảm ứng vật lý. Native date disabled có thể hiển thị định dạng theo môi trường trình duyệt; không có ngày sinh thực được nhập/lưu để định dạng.

## Xác nhận phạm vi

251 file được snapshot trước chỉnh sửa trong PHP/Helpdesk và các thư mục Host/Admin/Workspace/Helpdesk frontend: hash sau chỉnh sửa không đổi. Authentication context và token handling không bị sửa. QA chỉ cho GET/OPTIONS và logout stateless đi qua, không forward PATCH/POST tài nguyên. Login hiện chỉ SELECT/tạo JWT theo mã nguồn.

Checksum toàn bộ bảng MySQL trước/sau lượt QA cuối giống nhau. Mốc checksum lịch sử của nhiệm vụ workspace trước không khớp trạng thái hiện tại, nên không dùng mốc cũ để tuyên bố dữ liệu giữa hai nhiệm vụ không thay đổi. Không chạy SQL ghi hoặc migration trong nhiệm vụ này.
