# STUDIOHUB — DESIGN & BUSINESS SPECIFICATION

**Phiên bản:** 1.0 — Bản tổng hợp để rà soát  
**Ngày tổng hợp:** 25/10/2026  
**Trạng thái:** Tổng hợp các quyết định đã xác nhận; **chưa phải prompt Codex**.  
**Cơ sở:** `Đồ án Web (2).md` (Site Map/User Flow), `studioblank-DESIGN.md`, các lựa chọn UI/UX và nghiệp vụ đã thống nhất trong trao đổi.

> **Nguyên tắc ưu tiên:** Tài liệu đồ án xác định nhóm người dùng và luồng nghiệp vụ nền tảng. Những quyết định được chốt sau đó được ưu tiên nếu làm thay đổi cách trình bày hoặc bổ sung quy tắc so với tài liệu gốc. Không ngầm coi ví dụ giá tiền, mã phòng hoặc dữ liệu minh họa là dữ liệu thật.

## 1. Tầm nhìn, đối tượng và phạm vi

**StudioHub** là marketplace để khách tìm, so sánh và đặt thuê **phòng Studio thực tế** theo thời gian, có thể thuê thêm thiết bị/nội thất. Chủ Studio quản lý cơ sở, loại phòng, từng phòng thực tế, thiết bị, gói giá, lịch, đơn và doanh thu. Admin xét duyệt chủ Studio và giám sát toàn hệ thống.

- **Bốn khu vực:** Công khai/khách vãng lai, Khách hàng (Customer), Chủ Studio (Host), Quản trị viên (Admin).
- **Kiến trúc cuối cùng:** Fullstack, có Backend, Database, xác thực, API và các nghiệp vụ xử lý phía máy chủ.
- **Giai đoạn 1 (đã chốt):** Xây dựng toàn bộ Frontend có tương tác bằng mock data, luồng giả lập và thanh toán bằng nút mô phỏng; **chưa kết nối Backend/Database**. Thiết kế lớp truy xuất dữ liệu tách biệt để có thể tích hợp API sau này. Không chỉ dựng UI tĩnh.
- **Giai đoạn 2:** Thiết kế/xây dựng Backend, Database, API, kiểm soát truy cập và các ràng buộc giao dịch/đồng thời.
- **Giai đoạn 3:** Thay mock bằng API, kết nối dữ liệu, kiểm thử nghiệp vụ từ đầu đến cuối; tích hợp sandbox/thanh toán thật khi được quyết định riêng.
- **Không mặc định chốt công nghệ Backend, Database hoặc nhà cung cấp thanh toán** trong bản này.

## 2. Mô hình miền nghiệp vụ và quyền sở hữu

**Host → Studio (cơ sở/thương hiệu) → Room Type (loại phòng) → Room Unit (phòng thực tế).** Một Host thường quản lý một Studio; có thể thiết kế mô hình dữ liệu mở rộng để quản lý nhiều Studio mà không làm phức tạp giao diện một cơ sở.

Ví dụ minh họa: Host A quản lý **UIT Studio Rooms**; cơ sở có **4 loại phòng**, mỗi loại có **2 phòng thực tế**, tổng **8 phòng**.

- **Studio:** Tên cơ sở, thương hiệu, mô tả, liên hệ, hình ảnh, chính sách kinh doanh, thời hạn thanh toán và các cấu hình chung.
- **Room Type:** Tên/loại hình, mô tả, tiện ích, sức chứa, diện tích tiêu chuẩn, thư viện ảnh/bảng giá dùng chung và các hình thức thuê hỗ trợ.
- **Room Unit:** Mã phòng duy nhất trong cơ sở (A101, A102…), vị trí/tầng/đặc điểm riêng, ảnh bổ sung, tình trạng hoạt động, lịch đặt và giá riêng nếu ghi đè.
- **Thiết bị/nội thất thuê thêm:** Danh mục kho của Studio với tổng số lượng, giá thuê, trạng thái; được cấp cho nhiều đơn nếu lượng tồn khả dụng theo thời gian cho phép. Phân biệt thiết bị có sẵn trong phòng với thiết bị tính phí thuê thêm.
- **Khách chọn chính xác Room Unit**, không phân tự động. Hai phòng cùng loại có thể khác vị trí, ánh sáng, hướng, cách âm hoặc trải nghiệm.
- **Kết quả tìm kiếm:** **Mỗi Room Unit là một item riêng**; màn hình Host vẫn nhóm Room Units theo Room Type.
- **Room Unit được chọn và số lượng thiết bị** đều phải được kiểm tra khả dụng trong khoảng sử dụng và khoảng đệm.

## 3. Design System — StudioBlank cho StudioHub

### 3.1 Ngôn ngữ thị giác

- **Ultra-minimal, editorial, photography-first**, nhiều khoảng trắng hợp lý và bố cục lưới chặt chẽ, không mang cảm giác dashboard SaaS đại trà.
- Màu chính: **`#0A0A0A`** (chữ/nút), **`#FAFAFA`** (nền), **`#FFFFFF`** (bề mặt), **`#D4D4D8`** (viền), **`#71717A`** (chú thích); màu cảnh báo/thành công/lỗi chỉ dùng theo ngữ nghĩa.
- Kiểu chữ: **Inter** cho tiêu đề/nội dung, **IBM Plex Mono** cho mã đơn, mốc thời gian và metadata khi thích hợp. Phân cấp tham chiếu: hero ~64px desktop, H1 ~40px, H2 ~28px, H3 ~20px, body 16px, chú thích 12–14px; co giãn theo thiết bị.
- **Bo góc 0px, không bóng đổ, không gradient trang trí**; thẻ ảnh vuông, viền mảnh, điều khiển phẳng, chuyển động ngắn ≤200ms và tôn trọng reduced motion.
- Nút chính hình chữ nhật đen/chữ sáng; nút phụ viền đen; focus rõ; contrast và diện tích thao tác đủ tốt cho mobile.
- Tránh đánh giá, lượt đặt, xếp hạng, số lượng người dùng và số liệu không có nguồn dữ liệu thật; mock phải ghi rõ là dữ liệu minh họa.

**Ngoại lệ được chấp thuận:** Trang chủ dùng ảnh Studio phủ toàn màn hình với chữ/tìm kiếm đè lên ảnh; đăng nhập/đăng ký dùng biểu mẫu trắng nổi trên ảnh Studio toàn màn hình. Đây là lựa chọn chủ động của dự án dù StudioBlank gốc hạn chế chữ phủ lên ảnh; phải có lớp phủ/phương án tương phản để vẫn dễ đọc.

### 3.2 Responsive

- **Desktop:** Giữ các bố cục đã chốt: tìm kiếm có sidebar lọc trái; kết quả một cột hàng ngang; Host/Admin có sidebar quản lý.
- **Tablet:** Sidebar thu gọn hoặc dạng drawer; bộ lọc có thể thu gọn; lịch/bảng cuộn ngang khi cần.
- **Mobile (thiết kế tối ưu riêng):** Result item đổi thành ảnh trên/thông tin dưới; bộ lọc dạng bottom sheet; gallery và nút đặt thuê cố định cuối trang; quy trình modal nhiều bước trở thành full-screen dialog; đơn của khách xếp dọc; Host/Admin dùng drawer/sidebar thu gọn; lịch, Kanban và bảng cuộn ngang có chủ đích, không thu nhỏ chữ cực đoan.
- Kiểm thử tối thiểu các cỡ **360, 390, 768, 1024 và 1440px**; đảm bảo bàn phím, focus, nhãn input, xác nhận và trạng thái lỗi có thể sử dụng.

## 4. Bố cục và màn hình đã chốt

### 4.1 Khu vực công khai/Customer

| Màn hình | Bố cục và hành vi |
|---|---|
| **Trang chủ `/`** | Hero ảnh Studio lớn gần/toàn màn hình, tiêu đề và bộ tìm kiếm chồng trên ảnh (phương án C). Thanh điều hướng ngắn gọn, danh mục và phòng nổi bật có ảnh thật; không tạo chỉ số giả. |
| **Tìm kiếm `/rooms`** | Sidebar bộ lọc trái ~280–300px trên desktop; **một Room Unit mỗi hàng ngang dài** bên phải, ảnh khoảng 40% và thông tin/phí/vị trí phía bên kia; sắp xếp và phân trang; mobile thành thẻ dọc, lọc bottom sheet. |
| **Chi tiết `/rooms/[id]`** | Mosaic gallery một ảnh lớn và các ảnh nhỏ + lightbox; thông tin, tiện ích, mô tả, vị trí, nội quy bên trái; giá/kiểm tra lịch và booking card sticky bên phải; hiển thị rõ **Room Unit thực tế**. Mobile có thanh đặt thuê cố định. |
| **Đặt thuê** | **Modal lớn 3 bước** mở từ chi tiết phòng: (1) chọn thời gian/gói; (2) thuê thêm thiết bị tùy chọn; (3) xác nhận thông tin và chi phí. Trên mobile modal chiếm toàn màn hình. Đăng nhập bắt buộc trước khi chốt tạo đơn, giữ lựa chọn qua bước xác thực. |
| **Thanh toán `/payment/[bookingId]`** | Trang riêng, tóm tắt đơn, số cọc, thời hạn và nút mô phỏng thanh toán thành công/thất bại, có retry hợp lệ. Kết quả `/payment/[bookingId]/result`. Không dựng QR/ngân hàng giả tạo cảm giác đang chuyển tiền thật. |
| **Đơn của tôi `/my-bookings`** | Tabs trạng thái, tìm kiếm/lọc, **mỗi đơn một hàng ngang** với ảnh phòng, mã, thời gian, trạng thái và hành động; chi tiết `/my-bookings/[id]` cho timeline, cọc, công nợ, hoàn cọc, đổi lịch/hủy nếu được phép; lịch sử `/my-bookings/history` khi cần. |
| **Đăng nhập/đăng ký** | Ảnh Studio phủ nền, form trắng ở giữa, góc vuông, nút đen; đáp ứng màn hình nhỏ. Các role đi về đúng trang sau đăng nhập. |
| **Hồ sơ `/profile`** | Menu chức năng bên trái + biểu mẫu thông tin cá nhân/bảo mật/thông báo bên phải. Hồ sơ kinh doanh Host được quản lý riêng tại `/host`. |

**Lưu ý về Site Map gốc:** `Đồ án Web (2).md` đề xuất `/rooms/[id]/book` và `/checkout` như các bước/trang riêng. **Quyết định UI mới thay thế chúng bằng modal 3 bước trong trang chi tiết**; các URL này có thể chuyển hướng hoặc được giữ như deep-link nếu dự án cần, nhưng **không phải hai giao diện wizard độc lập**. Danh mục `/rooms`, `/my-bookings`, `/host`, `/admin` của tài liệu được giữ làm điểm tham chiếu.

### 4.2 Host

| Màn hình | Bố cục và hành vi |
|---|---|
| **Dashboard `/host`** | Sidebar thu gọn được; 4 KPI theo tình hình thực, đơn cần xử lý và xem nhanh lịch tuần; không ưu tiên biểu đồ trang trí. |
| **Studio `/host/studios`** | Quản lý cơ sở; Host thường chỉ có một Studio nên không hiện switcher không cần thiết. |
| **Phòng `/host/rooms`** | **Nhóm theo Room Type**; mở từng nhóm để quản lý các Room Unit; thông tin chung đặt ở cấp loại phòng và các thuộc tính riêng ở cấp phòng vật lý. |
| **Thiết bị `/host/equipments`** | Bảng có ảnh nhỏ, tên, danh mục, tồn kho, giá, trạng thái, lọc/tìm kiếm; thêm/sửa qua dialog phù hợp. |
| **Giá `/host/rates`** | Gói giá theo Room Type, có thể bật/tắt thuê theo giờ, buổi hoặc combo 3h/5h/10h; Room Unit có thể ghi đè giá riêng. |
| **Lịch `/host/calendar`** | **Timetable Ngày/Tuần**, mặc định Tuần theo phòng được chọn: thứ nằm ngang, giờ nằm dọc; Ngày: các phòng vật lý thành cột, giờ nằm dọc. Có lọc loại phòng/phòng/trạng thái; block theo giờ thực, kể cả buổi/combo; có 30 phút đệm. |
| **Đơn `/host/bookings`** | **Kanban** theo trạng thái, mỗi thẻ hiển thị mã đơn, khách, Room Unit, ca/gói thuê, giờ, cọc; mở chi tiết để xác nhận/từ chối, check-in, check-out, ghi thu tiền và xử lý hoàn cọc. Không tùy ý kéo đơn sang trạng thái không hợp lệ. |
| **Báo cáo `/host/reports`** | Hoạt động, doanh thu, khoản phải thu; chỉ hiển thị số liệu được tính từ mock hoặc dữ liệu thực, ghi rõ bản mô phỏng. |
| **Cài đặt chính sách** | Thời hạn thanh toán, hủy, hoàn cọc, đổi lịch, phụ thu quá giờ và thông tin cơ sở. Các thay đổi chính sách không hồi tố với đơn đã được tạo. |

### 4.3 Admin

| Màn hình | Bố cục và hành vi |
|---|---|
| **Dashboard `/admin`** | Tổng quan hệ thống + công việc cần xử lý (người dùng, Studio, hồ sơ chờ duyệt, sự cố), KPI từ dữ liệu. |
| **Tài khoản `/admin/users`** | Bảng dữ liệu riêng, lọc vai trò/trạng thái, kiểm soát quyền và khóa/mở khóa theo thẩm quyền. |
| **Xét duyệt `/admin/host-requests`** | **Danh sách hồ sơ bên trái, nội dung hồ sơ bên phải**; duyệt/từ chối (từ chối có lý do); lưu lịch sử. |
| **Studio `/admin/studios`** | **Quản lý phân cấp theo Studio**: chọn cơ sở rồi xem Room Types, Room Units, thiết bị và thông tin Host. Admin giám sát/ẩn đối tượng vi phạm, không quản lý giá/lịch hằng ngày thay Host. |
| **Thiết bị `/admin/equipments`** | Giám sát/tra cứu theo Studio trong thẩm quyền quản trị. |
| **Vai trò `/admin/roles`** | Quản lý quyền truy cập theo quy định; không cấp quyền tùy tiện bỏ qua nghiệp vụ. |
| **Audit `/admin/audit-logs`** | Bảng lọc theo thời gian, người thực hiện, hành động, đối tượng; xem trước/sau/lý do; không sửa/xóa nhật ký từ giao diện. |
| **Ngoại lệ hoàn tiền** | Theo dõi hoàn cọc tự động bị lỗi, các lượt thử và xử lý tranh chấp/chuyển xử lý thủ công khi cần. |

**Quyền Admin chốt:** Duyệt Host, khóa tài khoản, ẩn Studio/phòng vi phạm, giám sát và **hủy đơn ngoại lệ chỉ trước thời gian bắt đầu**, bắt buộc nhập lý do và ghi audit. Không mặc định cho Admin sửa bảng giá, tự ý đổi Room Unit, thiết bị hay các đơn đang hoạt động.

## 5. Đăng ký và phân quyền

- Khách vãng lai tìm kiếm, xem Room Unit, chọn ca/thiết bị; chỉ cần đăng nhập khi đi đến bước xác nhận tạo đơn.
- **Đăng ký Host 3 bước:** (1) tài khoản/liên hệ; (2) tên, địa chỉ, mô tả Studio; (3) kiểm tra/gửi hồ sơ. Trạng thái: chờ duyệt, được duyệt hoặc từ chối có lý do.
- Khi Admin duyệt, Host tiếp tục **onboarding Studio → Room Type → Room Unit → thiết bị → bảng giá/chính sách** trước khi mở nhận đặt thuê.
- Auth đầy đủ phía Backend trong giai đoạn sau, có JWT/phiên và kiểm soát vai trò. Frontend mock phải giả lập vai trò và bảo vệ tuyến đường hợp lý, nhưng **không được coi kiểm tra client là bảo mật thật**.
- Cần phân biệt **khóa đăng nhập vì an ninh/quản trị** với **tạm ngưng quyền tạo đơn do 3 vi phạm**; trường hợp thứ hai vẫn cho xem/giải quyết đơn cũ.

## 6. Khả dụng, hình thức thuê và đặt cọc

### 6.1 Hình thức thuê

- Từng Room Type/Room Unit có thể hỗ trợ: **theo giờ, theo buổi**, **combo giờ** (ví dụ 3h, 5h, 10h). Chủ Studio bật/tắt các gói cho từng loại, cấu hình giờ mở cửa và các ca được phép.
- Lịch hiển thị **thời gian thực tế từ `start_at` đến `end_at`**, không căn theo tên gói. Ví dụ combo 3h có thể là 09:00–12:00 nếu chính sách cho phép.
- Phòng có **30 phút đệm sau ca** để chuẩn bị. Khoảng xung đột kiểm tra tối thiểu `[start_at, end_at + 30 phút)` đối với những đơn đang giữ/đã xác nhận/đang sử dụng; cũng cần xét các khoảng đệm liên quan khi so hai đơn.
- Thiết bị thuê thêm kiểm tra tổng nhu cầu của các đơn giao thời gian không vượt số lượng khả dụng trong kho Studio; không bán/đặt vượt tồn.
- Kiểm tra sức chứa theo Room Unit/Room Type, số khách bắt buộc và thông tin liên hệ hợp lệ.

### 6.2 Đặt trước 24 giờ và giữ chỗ chờ cọc

**Quy tắc đã chốt:** `Thời điểm tạo đơn ≤ Thời điểm bắt đầu thuê − (24 giờ + thời hạn thanh toán do Host cấu hình)`.

- Host cấu hình thời hạn thanh toán cọc trong khoảng **15 phút đến 3 giờ** tại cơ sở. Ví dụ cài 3 giờ → phải tạo đơn trước giờ bắt đầu ít nhất 27 giờ.
- Khi tạo đơn hợp lệ, giữ **Room Unit khách chọn** và thiết bị theo khoảng thời gian thuê, ghi mốc hết hạn cụ thể.
- Khách có thể thanh toán cọc trước hạn; nếu thành công, đơn chuyển sang chờ Host xác nhận.
- Thanh toán lỗi có thể thử lại **nếu thời hạn còn hiệu lực**; hết hạn mà không có giao dịch hợp lệ đang xử lý thì hết hiệu lực giữ chỗ và giải phóng tồn.
- **Grace 5 phút:** Nếu giao dịch đã **bắt đầu trước hạn** mà còn xử lý, tiếp tục giữ phòng/thiết bị tối đa 5 phút; không cho mở giao dịch mới sau hạn. Nếu vẫn chưa rõ kết quả, cần **đối soát**, không tự tính vi phạm; tiền đến muộn sau khi đơn mất hiệu lực phải được xử lý an toàn, không chiếm phòng đã cấp cho người khác.
- Nguyên tắc đồng thời ở Backend: dùng thời gian server, thao tác giữ chỗ/expire nguyên tử, idempotency cho thanh toán/hoàn cọc, không phụ thuộc đồng hồ trình duyệt.

### 6.3 Tiền cọc và thanh toán

- **Khách trả cọc trước → Host duyệt/từ chối sau**. Tỷ lệ tiền cọc theo chính sách Studio; các ví dụ 30% chỉ là minh họa.
- **Giai đoạn 1:** Nút **“Mô phỏng thanh toán thành công”**, **“Mô phỏng thanh toán thất bại”**; phản ánh vào mock state, có trạng thái chờ/hết hạn/try-again. Không tạo giao dịch ngân hàng thật.
- **Host có đúng 2 giờ** từ thời điểm cọc được ghi nhận thành công để xác nhận/từ chối đơn. Nếu Host không phản hồi: **tự hủy**, giải phóng phòng/thiết bị, **tự động tạo và xử lý hoàn 100% cọc**, không tính vi phạm khách; Admin chỉ giám sát/xử lý nếu hoàn tiền thất bại hoặc bị tranh chấp.
- Host từ chối sau khi khách đã trả cọc: hủy và **hoàn 100%**, không tính vi phạm khách; quy trình hoàn thông thường vẫn theo thao tác xác nhận của Host.
- Khoản tiền còn lại và các khoản phát sinh được theo dõi như **công nợ độc lập**, không đồng nhất `deposit paid` với `fully settled`.

## 7. Trạng thái và chuyển trạng thái

### 7.1 Booking status — vòng đời thuê

| Status | Ngữ nghĩa |
|---|---|
| `awaiting_payment` | Đã tạo đơn và giữ chỗ, chờ cọc |
| `pending` | Đã trả cọc, chờ Host xét duyệt |
| `confirmed` | Host xác nhận cho thuê |
| `checked_in` | Host xác nhận khách thực tế nhận phòng |
| `completed` | Host xác nhận khách thực tế **trả phòng**, dù còn công nợ |
| `cancelled` | Đơn bị hủy do khách, Host, Admin hoặc timeout xác nhận; lưu nguyên nhân riêng |
| `expired` | Hết hạn thanh toán, không còn giữ chỗ |
| `no_show` | Hết giờ thuê mà khách không được ghi nhận Check-in; không coi là completed |

**Các đường đi chính:**

- `awaiting_payment → pending → confirmed → checked_in → completed`.
- `awaiting_payment → expired` (bỏ thanh toán) hoặc `cancelled` (khách chủ động hủy).
- `pending → cancelled` (Host từ chối, Host quá 2 giờ không phản hồi, ngoại lệ Admin).
- `confirmed → cancelled` nếu hủy hợp lệ trước khi bắt đầu, hoặc `no_show` nếu đến hết giờ mà chưa check-in.
- Không cho kéo Kanban tùy tiện qua các trạng thái trái phép.

### 7.2 Payment và Refund tách riêng

- **Payment:** `unpaid`, `processing`, `paid`, `failed`; lưu lịch sử **từng lần thử giao dịch**. Có phân loại thu cọc, thu số dư, phụ thu, thanh toán một phần và phương thức ghi nhận.
- **Refund:** `not_required`, `pending`, `processing`, `refunded`, `failed`; lưu **số tiền phải hoàn, tỷ lệ, nguyên nhân, người chịu trách nhiệm, thời gian, lịch sử các lần thử**.
- Có thể tồn tại tổ hợp **Booking = `cancelled`, Payment(deposit) = `paid`, Refund = `pending`** mà không mâu thuẫn.
- Chỉ đánh dấu `refunded` sau khi quy trình mock báo thành công hoặc về sau **xác minh được hoàn tiền thật**. `completed` của Booking không có nghĩa đã thanh toán đủ.

### 7.3 Xử lý hoàn cọc thất bại

- Với hoàn cọc thông thường, hệ thống tự tính theo **chính sách đã lưu cho đơn**, Host xác nhận xử lý. Với Host không phản hồi duyệt đơn trong 2 giờ, hoàn **tự động 100%**.
- Nếu một lần hoàn tiền **đã xác minh thất bại và đủ điều kiện retry**, hệ thống thử lại tối đa **2 lần**; nếu vẫn lỗi, chuyển sang Admin xử lý ngoại lệ.
- Không được retry chỉ vì không thấy phản hồi: cần đối soát trạng thái với cổng thanh toán trước để tránh trả trùng. Không xóa dấu vết retry hoặc tạo hai yêu cầu hoàn cho cùng một nghĩa vụ.

## 8. Hủy đơn, hoàn cọc và chống giữ chỗ ảo

### 8.1 Chính sách Host được cấu hình

- **Hạn khách tự hủy:** Chọn trước **24 / 48 / 72 giờ** so với giờ thuê bắt đầu. Qua mốc này, khách không tự hủy; có thể gửi yêu cầu hỗ trợ ngoại lệ.
- **Tỷ lệ hoàn cọc:** Host tự thiết lập các mốc và tỷ lệ **0–100%** theo thời điểm hủy, không được tạo khoảng/mốc mâu thuẫn với thời hạn tự hủy. Hiển thị chính sách trước khi khách xác nhận đặt; lưu **snapshot** tại lúc tạo đơn, không hồi tố khi Host sửa chính sách.
- **Hủy đã cọc trong hạn tự hủy:** Áp dụng tỷ lệ hoàn trong snapshot, **không tính vi phạm** dù chỉ được hoàn một phần hoặc 0%.
- **Host từ chối** hoặc **hệ thống tự hủy vì Host không duyệt đúng hạn**: khách được hoàn 100%, không tính vi phạm.
- **Hủy do Admin vì sự cố không thuộc khách:** Hoàn 100%; Admin chỉ được hủy ngoại lệ **trước giờ bắt đầu**, phải ghi lý do/audit.

### 8.2 Ba vi phạm và khóa quyền đặt thuê

**Đếm cộng dồn theo tài khoản khách:**

1. **Khách tự hủy một đơn đã tạo nhưng chưa thanh toán cọc:** +1.
2. **Hết hạn thanh toán cọc vì khách bỏ đơn:** +1.

Không đếm: hủy đơn đã trả cọc trong hạn hợp lệ, Host từ chối, Admin/hệ thống hủy do lỗi không thuộc khách, lỗi thanh toán được xác minh, No-show theo quy tắc đã chốt. Một đơn không được tạo **hai strike** vì hai sự kiện cùng nguồn gốc.

- Khi có **3 vi phạm hiệu lực**, tự động **tạm ngưng quyền đặt thuê trên toàn StudioHub**, không phải khóa đăng nhập hoàn toàn.
- Khách vẫn đăng nhập, xem/giải quyết đơn đã có, thanh toán công nợ, theo dõi hoàn cọc, sử dụng các đơn hợp lệ đã xác nhận và gửi yêu cầu mở khóa; **không tạo đơn mới hoặc đổi lịch khi đang bị tạm ngưng quyền đặt**.
- Tài khoản chỉ được mở lại khi **Admin xét duyệt thủ công**. Khi được mở, **bộ đếm vi phạm hiệu lực trở về 0**, nhưng **lịch sử vi phạm vẫn được lưu** để audit.

### 8.3 No-show

- Khi **đã qua hết thời gian thuê dự kiến** mà không có Check-in thực tế được Host xác nhận, đơn chuyển `no_show`; giải phóng quyền giữ của ca đã kết thúc theo quy tắc lịch và khoảng đệm.
- **Không hoàn tiền cọc** đối với No-show (cọc bị giữ), **không cộng thêm một strike** vào cơ chế ba vi phạm.
- Không tự biến No-show thành `completed`, cũng không tự mặc định thu thêm toàn bộ phần tiền thuê còn lại nếu quy tắc này chưa được quy định.

## 9. Đổi lịch/đổi phòng

- Chỉ hỗ trợ **đơn `confirmed`**, chưa Check-in và còn trong hạn cho phép; khách gửi yêu cầu, **Host phải duyệt**.
- Host cấu hình **hạn gửi yêu cầu đổi lịch riêng**: trước giờ bắt đầu ít nhất **24 / 48 / 72 giờ**, độc lập hạn hủy.
- Khách được **tối đa 1 lần đổi thành công trên mỗi đơn**. Yêu cầu bị từ chối, rút lại hoặc chưa hoàn tất **không tiêu hao lượt**. Mỗi đơn chỉ có một yêu cầu thay đổi đang xử lý.
- Có thể đổi **ngày/giờ, Room Unit, gói thuê** và những thành phần ảnh hưởng giá nếu hợp lệ. Kiểm tra 30 phút đệm, công suất thiết bị, sức chứa và chính sách thời gian trước khi duyệt.
- Trong lúc chờ duyệt, **đơn và lịch cũ vẫn có hiệu lực**. Từ chối/hủy yêu cầu không làm mất chỗ cũ; khi thay đổi thành công thì mới giữ lịch mới và giải phóng lịch cũ một cách nhất quán.
- **Giữ nguyên khoản cọc đã trả.** Tính lại tổng giá và **số dư phải thanh toán khi sử dụng phòng** (bao gồm thiết bị/phụ thu phù hợp). Không yêu cầu thanh toán cọc bổ sung ngay chỉ vì giá mới cao hơn. Nếu **tổng giá mới thấp hơn tiền cọc đã nhận**, phát sinh khoản **cọc dư cần hoàn** theo quy trình điều chỉnh, không đánh dấu là khách hủy đơn.
- Các thay đổi hợp lệ và hoàn tất không tính vi phạm; ghi lịch sử giá/phòng/thời gian trước và sau.

## 10. Check-in, Check-out, quá giờ và quyết toán

- **Host thao tác Check-in và Check-out thủ công**, không QR bắt buộc và không tự chuyển `checked_in`/`completed` chỉ do đồng hồ.
- Ghi nhận **giờ Check-in thực tế** và **giờ Check-out thực tế**. Khách đến muộn **không được tự bù giờ, kéo dài giờ trả hoặc giảm giá**; thời gian kết thúc lịch gốc giữ nguyên.
- **Đơn `completed` ngay khi Host xác nhận đã Check-out thực tế**, dù tiền còn phải thu hoặc phụ phí đang tồn tại. Công nợ và thu tiền được hiển thị riêng cho Host.
- **Quá giờ:** Host cấu hình **đơn giá phụ thu theo mỗi 30 phút**; phần thời gian quá giờ được **làm tròn lên mỗi 30 phút** theo số phút vượt giờ kết thúc dự kiến. Thời gian đệm 30 phút để chuẩn bị phòng **không phải thời gian sử dụng miễn phí**.
- **Nếu quá giờ gây xung đột ca kế tiếp:** Cảnh báo khẩn cho Host, không tự ý dời/hủy đơn của khách tiếp theo. Ghi sự cố và phụ thu/công nợ theo thực tế, xử lý vận hành thủ công.
- **Số tiền còn lại:** Host ghi nhận các khoản khách trả **một phần hoặc toàn bộ**, bằng **tiền mặt hoặc chuyển khoản mô phỏng** trong giai đoạn đầu. Lưu lịch sử lần thu, người ghi nhận, phương thức, số tiền; công nợ không âm và không thể thanh toán trùng một khoản. Trong tương lai, phân biệt ghi nhận Host xác nhận và giao dịch trực tuyến đã xác thực.
- Không tự giảm giá khi Check-out sớm; No-show có trạng thái và chính sách riêng.

## 11. Quy tắc ưu tiên hiển thị của UI

- **Mỗi Room Unit là một listing công khai**, với thông tin đủ phân biệt hai phòng cùng loại: ảnh, mã, vị trí/tầng, điểm khác biệt, tiện ích, giờ trống và giá áp dụng.
- Ở chi tiết phòng và bước đặt: giải thích rõ **giờ kết thúc thuê, 30 phút đệm, hạn đặt trước, hạn thanh toán, hạn hủy/đổi lịch, tỷ lệ cọc và hoàn cọc**, không đặt các quy tắc quan trọng sau nút xác nhận.
- Mọi thao tác có thể mất tiền/khóa tài khoản/hủy đơn/đổi phòng phải có xác nhận, nguyên nhân và trạng thái phản hồi rõ.
- Mọi status hiển thị tên thân thiện bằng tiếng Việt, giữ enum kỹ thuật riêng.
- Kanban Host ưu tiên `pending`, `confirmed`, `checked_in`, `completed`; các đơn `cancelled`, `expired`, `no_show` vẫn xem được ở bộ lọc/lịch sử, và đơn `completed` còn nợ vẫn nằm trong công việc cần thu tiền.
- Bảng/lịch/biểu đồ không dùng dữ liệu tô điểm giả; mock fixtures nhất quán xuyên suốt 3 vai trò.

## 12. Những tình huống cần demo/kiểm thử giai đoạn 1

1. Tìm và đặt đúng **Room Unit A102**, không nhầm với A101 cùng Room Type.
2. Một Room Unit bị giữ bởi đơn đang chờ cọc/đã xác nhận thì không được nhận đơn trùng, xét cả **30 phút đệm**.
3. Room Type khác nhau có thể có theo giờ, theo buổi hoặc combo 3h/5h/10h; block lịch hiển thị thời gian thực.
4. Host cấu hình thanh toán 3h ⇒ khách tạo đơn phải trước giờ thuê **≥27h**; trường hợp chỉ còn 26h không cho đặt.
5. Tạo đơn rồi hủy chưa cọc hoặc bỏ thanh toán quá hạn ⇒ +1 vi phạm/đơn; đủ 3 ⇒ chặn tạo đơn mới toàn hệ thống.
6. Giao dịch bắt đầu trước hạn và xác nhận trong **5 phút gia hạn** ⇒ vẫn hợp lệ; giao dịch chưa rõ kết quả không tự cộng strike.
7. Thanh toán cọc mock thành công ⇒ `pending`; Host xác nhận trong 2h ⇒ `confirmed`.
8. Host không phản hồi 2h ⇒ `cancelled`, hoàn cọc mock **100% tự động**, giải phóng phòng, khách không vi phạm.
9. Hoàn tiền thử thất bại đã xác minh ⇒ tự thử lại tối đa 2 lượt ⇒ nếu tiếp tục lỗi, chuyển Admin; không tạo hai khoản hoàn.
10. Khách hủy đơn đã cọc đúng thời hạn ⇒ hoàn theo snapshot chính sách Host, không tăng strike.
11. Khách đổi lịch/Room Unit được Host duyệt một lần ⇒ giữ nguyên cọc, thay đổi tổng tiền/công nợ, không cho đổi thành công lần thứ hai.
12. Khách đến muộn ⇒ Host nhập giờ thực, giờ trả vẫn cố định; Check-out làm `completed` dù còn công nợ.
13. Quá giờ 31 phút ⇒ phụ thu **2 block 30 phút** theo đơn giá Host cấu hình; nếu chạm ca tiếp theo thì báo xung đột, không tự dời lịch.
14. Hết ca mà khách không Check-in ⇒ `no_show`, mất cọc, không cộng strike.
15. Khách bị tạm ngưng quyền đặt vẫn xem và thực hiện đơn xác nhận từ trước; Admin mở khóa ⇒ strike hiệu lực về 0, lịch sử còn nguyên.
16. Host chưa có cơ sở/phòng được dẫn onboarding; Admin phê duyệt/từ chối hồ sơ; vai trò và dữ liệu các Host tách biệt.
17. Thao tác hủy ngoại lệ của Admin chỉ trước giờ thuê, có lý do và audit.
18. Desktop/tablet/mobile đều hoạt động: tìm kiếm, booking modal/full-screen, lịch Ngày/Tuần, Kanban, bảng và menu responsive.

## 13. Các điểm triển khai cần lưu ý (không phải yêu cầu hỏi lại)

- **Tài liệu gốc khác quyết định mới:** URL `/rooms/[id]/book`, `/checkout` mô tả các trang riêng; bản UI mới là modal đặt 3 bước. Booking source gốc tạo trực tiếp `pending`; bản thống nhất cần trạng thái `awaiting_payment` trước khi trả cọc và `pending` sau trả cọc. Auth gốc coi `locked` là chặn đăng nhập, nhưng khóa do 3 strike **chỉ chặn tạo booking**.
- **Mô phỏng không thay Backend:** Mock có thể dùng state/persistence cục bộ để demo, nhưng không thể đảm bảo khóa đặt phòng đồng thời, kiểm soát role hoặc xác nhận tiền thực trên nhiều máy. Đây là những phần bắt buộc triển khai lại bằng dịch vụ Backend và Database trong các giai đoạn sau.
- **Chưa chọn** ngôn ngữ/framework Backend, loại Database, nhà cung cấp thanh toán và quy trình thanh toán thật. Không tự biến các lựa chọn kỹ thuật đó thành quyết định đã duyệt.
- **Điểm chưa quy định chi tiết:** phí/damage khi thiết bị hỏng, hợp đồng/pháp lý/thuế, tiền phạt No-show ngoài khoản cọc, chính sách chủ Studio khi mất điện/sự cố, thời hạn đối soát thủ công theo nhà cung cấp. Chúng **không nằm trong phạm vi bắt buộc của bản UI đầu tiên** nếu chưa có quy tắc được chốt; giao diện nên có trạng thái lỗi và giải pháp hỗ trợ phù hợp thay vì tự bịa luật.

---

**Kết luận:** Bản này ghi lại các phương án đã chốt nhằm dùng làm chuẩn đối chiếu cho bước thiết kế/triển khai tiếp theo. **Không phải Mega Prompt Codex và chưa yêu cầu thực thi mã nguồn.**
