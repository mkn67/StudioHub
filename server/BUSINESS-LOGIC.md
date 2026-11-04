# Logic nghiệp vụ backend

Tài liệu này diễn giải hành vi đang được triển khai trong `src/Modules/`. Nó giúp đối chiếu nghiệp vụ; khi có khác biệt với mong muốn sản phẩm, sửa code và tài liệu API/schema đồng bộ. API contract hiện tại được mô tả trong `openapi.yaml`.

## Cách đọc code

- `Modules/Auth`: đăng ký, đăng nhập, JWT và xác thực lại tài khoản khi gọi API được bảo vệ.
- `Modules/Catalog`: danh mục tra cứu dùng chung.
- `Modules/Studios`, `Modules/Rooms`, `Modules/Equipment`: thông tin studio, phòng, bảng giá/ảnh phòng và thiết bị.
- `Modules/Booking`: kiểm tra lịch, định giá, tạo đơn, thanh toán, đổi trạng thái và hết hạn.
- `Modules/Admin`: quản lý host và thống kê.
- `Modules/Shared`: kiểm tra role/quyền sở hữu và audit log.
- `Core`: HTTP, router, kết nối DB, validate chung, response và xử lý lỗi.

Trong từng module, Controller nhận request/validate và định dạng response; Service điều phối quy tắc nghiệp vụ/transaction; Repository chạy câu SQL có tham số. Một số controller vẫn có validate nghiệp vụ đơn giản; kiểm tra chi tiết ở controller và service khi chỉnh sửa.

## Tài khoản và quyền

1. Người dùng đăng nhập bằng thông tin tài khoản; backend kiểm tra mật khẩu đã băm rồi cấp JWT.
2. JWT xác định user, nhưng mỗi request được bảo vệ vẫn nạp trạng thái và role hiện tại từ DB. Khóa tài khoản hoặc đổi quyền vì thế có hiệu lực với request tiếp theo.
3. Middleware kiểm tra role theo endpoint. Các thao tác quản trị studio/phòng/thiết bị/đơn cần xác minh tài nguyên thuộc host đang gọi; ID do client gửi không được xem là bằng chứng sở hữu.

> Logout thu hồi JWT hiện tại ngay lập tức. Middleware kiểm tra jti đã thu hồi trên mỗi request được bảo vệ; dữ liệu thu hồi được dọn sau khi token hết hạn.

## Tạo đơn thuê phòng

1. Client gửi phòng, bảng giá, thời gian bắt đầu/kết thúc, thông tin liên hệ và thiết bị (nếu thuê). Server xác thực trường bắt buộc, định dạng email và thông tin người thuê.
2. Server kiểm tra phòng đang hoạt động, bảng giá thuộc phòng và có hiệu lực theo **ngày bắt đầu thuê**. Giá của đơn được chụp lại lúc tạo; sửa/ngừng bảng giá về sau không đổi đơn cũ.
3. Thời lượng được làm tròn theo đơn vị giá: giờ làm tròn lên mỗi 30 phút; half-day = 4 giờ; day = 24 giờ; week = 7 ngày; month = 30 ngày; session dùng số phút do host đặt. Thời lượng phải đạt min/max của bảng giá.
4. Thiết bị cần đủ tồn kho trong suốt khoảng thuê; mức sử dụng đỉnh được tính theo các khoảng thời gian chồng lấp, thay vì cộng tất cả đơn trong ngày.
5. Tổng tiền gồm tiền phòng và thiết bị. Thiết bị tính theo session hoặc giờ; số tiền lưu theo VND nguyên. Đơn dài hạn (week/month) được phân loại `long_term`, đơn còn lại `short_term`.
6. Server kiểm tra trùng lịch theo khoảng nửa mở `[start, end + buffer)`, buffer mặc định 30 phút. Đơn `confirmed`/`checked_in` giữ lịch; đơn `pending` chỉ giữ lịch đến `expires_at`.
7. Tạo đơn diễn ra trong transaction có khóa để tránh hai request đồng thời cùng nhận một phòng/tồn kho. Trạng thái ban đầu `pending`; thời hạn giữ là thời điểm sớm hơn giữa hạn giữ (mặc định 15 phút) và giờ bắt đầu.
8. Snapshot giá, thiết bị và thông tin liên hệ được ghi cùng đơn. Mã đơn tạm được thay bằng mã chính sau khi tạo.

## Thanh toán, xác nhận và hủy

- API thanh toán hiện mô phỏng luồng sandbox, chưa kết nối cổng thanh toán bên ngoài.
- Các thao tác thay đổi đơn cần khóa dòng booking, đọc lại trạng thái và lịch sử thanh toán trong transaction trước khi quyết định. Điều này bảo vệ khỏi callback/request lặp và thanh toán đồng thời.
- Đơn được thanh toán cọc hoặc đủ tiền sẽ có thời hạn chờ host phản hồi (mặc định 24 giờ, giới hạn bởi giờ bắt đầu). Host xác nhận thì đơn ngừng hết hạn và tiếp tục giữ lịch.
- Hoàn tất đơn ghi `completed_at` để làm mốc báo cáo doanh thu. Hủy/từ chối/hết hạn ghi một refund sandbox cho từng payment thành công; unique theo payment nên không hoàn trùng. Chính sách hiện chọn hoàn đủ trong sandbox để unblock demo, chưa phải quy tắc tiền thật đã được chủ dự án duyệt.
- Cron `bin/expire-bookings.php` rà đơn đến hạn và chuyển từng đơn qua cùng quy tắc nghiệp vụ hết hạn; đơn hết hạn không còn chiếm lịch.

## Thống kê và dữ liệu

- Khoảng thời gian thống kê dùng ranh giới nửa mở `[from, to)` để tránh tính lặp bản ghi tại điểm giao hai kỳ.
- Tỷ lệ sử dụng chỉ tính phòng/studio đang hoạt động; doanh thu bám mốc hoàn tất đơn theo quy tắc đã chốt trong plan.
- Schema MySQL, trigger chống trùng lịch và seed ở `database/`; các quyết định chi tiết về đơn, giá và tiền nằm trong `../implementation-plan-backend.md` (mục 2 và 5).

## Những chỗ cần chủ dự án xác nhận khi rà nghiệp vụ

1. Host phải xác nhận trong 24 giờ sau khi khách trả cọc/đủ tiền; quá hạn đơn tự hết hiệu lực.
2. Tháng thuê quy ước cố định 30 ngày, ngày thuê là 24 giờ liên tục từ giờ bắt đầu.
3. Đơn chỉ khóa lịch đến `end_time + 30 phút`; xác nhận đơn không cần thanh toán đủ ngay.
4. Thanh toán hiện chỉ là mô phỏng, nên frontend không nên hiển thị như giao dịch tiền thật.
5. Logout không vô hiệu JWT ngay lập tức.

## Bản rà soát để quyết định sửa nghiệp vụ

Các mục dưới đây mô tả chính xác hơn hệ quả hiện tại. “Cần chốt” nghĩa là code có hành vi, nhưng cần chủ dự án xác nhận đó có phải chính sách mong muốn không.

### Đặt phòng và kiểm tra khả dụng

- `POST /api/bookings/check-availability` chỉ kiểm tra tức thời và xem trước giá; endpoint này không giữ chỗ. Người dùng khác có thể đặt trước khi request tạo đơn sau đó chạy. Nguồn: `src/Modules/Booking/AvailabilityService.php`, `BookingController.php`.
- Khi tạo đơn, service khóa dòng phòng và các thiết bị được yêu cầu theo ID tăng dần, rồi chạy cùng phép kiểm tra trong transaction. Đây là điều phối chống tranh chấp; trigger ở DB là lớp bảo vệ thêm.
- Xung đột dùng `[busy_start, busy_end)`; code cộng buffer vào cuối đơn mới và so với `busy_start/busy_end` của đơn cũ. Vì thế đơn bắt đầu đúng lúc buffer kết thúc được nhận.
- `party_size` được ép sang số nguyên trước khi kiểm tra. Nếu client gửi giá trị không phải số, ví dụ `"abc"`, ép kiểu có thể thành `0` và bị báo vượt sức chứa thay vì lỗi định dạng. **Gợi ý:** validate kiểu đầu vào và trả lỗi field rõ ràng trước khi ép kiểu.
- Thời gian phải khớp đúng `YYYY-MM-DD HH:mm:ss`, bắt đầu lớn hơn thời điểm hiện tại. Chưa thấy rule giờ hoạt động theo ngày/giờ của studio trong bước khả dụng. **Cần chốt:** studio có giờ mở cửa/đóng cửa, ngày nghỉ, hoặc thời gian setup riêng không?
- Tìm rate dựa vào `DATE(start_time)` và snapshot đơn. Khi thuê vắt qua ngày hết hạn của bảng giá, rate vẫn được chấp nhận nếu hiệu lực vào ngày bắt đầu; đây là quyết định D15.
- Thiết bị phải thuộc cùng studio và đang active. Dữ liệu ID trùng trong payload được gộp số lượng trước khi kiểm kho/tính tiền. **Cần chốt:** có giới hạn số lượng mỗi dòng/giới hạn tổng để tránh số lượng cực lớn không?

### Giá và tiền

- Giờ: mỗi 30 phút làm tròn lên; các đơn vị khác làm tròn lên theo nguyên đơn vị. Ví dụ 61 phút theo giá giờ tính 1.5 giờ; 241 phút half-day tính 2 nửa ngày (8 giờ tiền thuê). Đây là quy tắc tính tiền, không thay đổi giờ kết thúc thực tế.
- `deposit_amount` do tỷ lệ cọc cấu hình quyết định; code hiện dùng số nguyên VND trong phần tính giá. **Cần chốt:** làm tròn cọc theo floor/round/ceil khi 30% tạo ra phần lẻ? Có cần mức cọc tối thiểu không?
- Giá trả đủ bằng tổng tiền; thanh toán `remaining` bằng `total_amount - deposit_amount`, không trừ một khoản cọc thực tế đã thanh toán nếu giá cọc có thể được chỉnh sửa sau khi tạo đơn (snapshot hiện giữ cùng booking). Xem `PricingService.php`, `PaymentService.php`.
- Phí nền tảng, thuế, phí hủy và mã giảm giá chưa xuất hiện trong luồng tính giá được rà soát. Nếu có yêu cầu, cần thêm vào hợp đồng API/schema và lưu snapshot vào booking để đơn cũ không đổi.

### Bảng trạng thái đơn hiện hành

| Từ trạng thái | Host có thể chuyển | Điều kiện thêm trong code |
| --- | --- | --- |
| `pending` | `confirmed`, `rejected`, `cancelled` | `confirmed` đòi có payment `deposit` hoặc `full`; đơn chưa hết hạn |
| `confirmed` | `checked_in`, `cancelled` | Không có điều kiện thời gian check-in được thấy trong state machine |
| `checked_in` | `completed` | Phải thanh toán đủ tổng tiền |
| `completed`, `cancelled`, `rejected`, `expired` | Không chuyển tiếp | Trạng thái kết thúc |

Khách có thể hủy `pending` hoặc `confirmed` qua endpoint riêng; không thể tự hủy `checked_in`. Hủy/host từ chối/hết hạn sau thanh toán tạo ledger `booking_refunds` trạng thái `success` trong sandbox, cùng transaction với đổi trạng thái booking; audit ghi tổng tiền đã hoàn sandbox. **Không có tiền thật di chuyển**. Nguồn: `BookingStateMachine.php`, `BookingService.php`, migration `007_refunds_and_inventory_reservations.sql`.

**Cần chốt quan trọng:** hiện khách có thể hủy booking đã confirmed mà audit ghi hoàn toàn bộ số đã thu, bất kể còn bao lâu đến giờ thuê. Host cũng có thể hủy confirmed. Chưa có chính sách phân biệt hoàn đủ/một phần/không hoàn theo thời điểm, hay xử lý trường hợp khách đã check-in. Hãy xác định bảng chính sách trước khi tích hợp cổng thanh toán thật.

### Thanh toán và hết hạn

- Sandbox ghi payment thành `success` ngay trong DB; `payment_method` nhận chuỗi do client gửi (mặc định `sandbox_qr`). Không có xác thực callback chữ ký hoặc kết nối ngân hàng.
- Cọc hoặc trả đủ chỉ được thực hiện khi `pending`; trả phần còn lại chỉ khi `confirmed`/`checked_in` và đã có cọc. Một payment `deposit/full` thành công chặn thanh toán lặp; `remaining/full` chặn thanh toán phần còn lại lặp.
- Trả cọc/đủ tiền kéo dài hạn pending đến min(giờ thanh toán + 24h, thời điểm bắt đầu). Host xác nhận trước hạn mới biến đơn thành `confirmed`.
- Cron và request thanh toán/cập nhật trạng thái đều có thể kích hoạt hết hạn cho một booking. Khi quá hạn, service ghi refund sandbox cho payment thành công và giải phóng vật tư đang giữ. Lỗi DB khi hết hạn trả `booking_expiration_failed`; payment/status caller dừng luồng và giữ trạng thái giao dịch nhất quán.
- Nếu đơn trả đủ rồi host không phản hồi, sandbox hiện tạo hoàn đủ. Quy trình hoàn tiền thật, người chịu phí, mốc hoàn theo chính sách và SLA vẫn chưa có.

### Studio, phòng và thiết bị

- Đăng ký công khai luôn tạo role customer; host được tạo/quản lý bởi admin hoặc luồng quản trị. Một host tạo studio của chính mình; các cập nhật cần kiểm tra ownership.
- Phòng tìm kiếm phải active; studio inactive làm phòng không khả dụng để đặt. Room có `active`, `maintenance`, `inactive`; studio có `active`/`inactive`; thiết bị có cùng nhóm trạng thái phòng.
- Phần tử đầu tiên của `space_type_ids` được lưu làm loại hình chính theo D11. **Cần chốt:** khi client gửi mảng rỗng, có cho phép phòng không có loại hình không gian không?
- Khi ngừng studio/phòng/thiết bị, cần phân biệt ảnh hưởng booking tương lai đã confirmed. Rà soát hiện thấy bước tạo đơn từ chối tài nguyên inactive, nhưng chính sách tự hủy/giữ các booking đã có chưa được nêu như một luồng riêng.
- Ảnh phòng được lưu ở `public/uploads/rooms/`; cần kiểm tra khi sửa: xóa ảnh cũ có dọn file hay giữ lại, và giới hạn số ảnh mỗi phòng.

### Vai trò, dữ liệu và endpoint

- Quyền được áp ở route middleware và ownership guard/service. Khi thêm endpoint, kiểm tra cả scope list/detail để host không xem booking của host khác và customer không xem dữ liệu riêng của người khác.
- Đăng nhập/đăng ký chuẩn hóa email chữ thường; password được bcrypt. Đăng ký không cho client tự gửi role host/admin.
- Thống kê doanh thu dựa trên đơn `completed` và `completed_at`; đây là doanh thu booking hoàn tất, không nhất thiết là tiền đã quyết toán/không hoàn. Nếu cần báo cáo kế toán, cần định nghĩa doanh thu gộp, hoàn tiền, phí và kỳ ghi nhận riêng.
- `openapi.yaml` là điểm đối chiếu payload/response cho frontend. Không thay đổi request/JSON khi sửa chính sách nếu chưa chủ động cập nhật contract và frontend cùng lúc.

## Danh sách quyết định đề xuất bạn ghi chú trực tiếp

1. Chính sách khách hủy theo mốc thời gian và số tiền được hoàn.
2. Nếu host từ chối hoặc không phản hồi, ai hoàn tiền và trong bao lâu.
3. Mốc giờ mở cửa/ngày nghỉ, thời gian setup/cleanup, buffer theo từng phòng.
4. Quy tắc làm tròn cọc, thuế/phí và khuyến mãi.
5. Khách được trả đủ trước khi host xác nhận hay chỉ được cọc.
6. Tự động xử lý booking confirmed khi host ngừng studio/phòng/thiết bị.
7. Điều kiện check-in/check-out, hoàn tất và khách vắng mặt.
8. Thời hạn JWT là 2 giờ; nếu cần đổi TTL, đồng bộ lại chính sách client và bảo mật.

## Bổ sung sau triển khai domain (2026-11-02)

Các endpoint mới được thêm theo hướng additive, không đổi payload booking phòng cũ. Migration nằm trong `database/migrations/` và chạy bằng `php database/migrate-up.php`.

- Host tạo/sửa gói tại `/api/host/studios/{studio_id}/service-packages` và `/api/host/service-packages/{package_id}`. Khách xem gói active ở `/api/studios/{studio_id}/service-packages`.
- Mua package tạo `service_order` riêng, snapshot tên/đơn vị/giá/quyền lợi và các thành phần gói; **không tạo hoặc giữ lịch phòng**. Đơn có hạn sandbox 15 phút. `Idempotency-Key` bắt buộc khi thanh toán và cùng key trên cùng đơn trả lại giao dịch cũ.
- Project được tạo bởi customer; host của studio được thêm làm member mặc định nhưng không được xem `private_name`, `description` hoặc tiêu đề track. Owner có thể cấp/thu hồi quyền theo project. Admin/host khác không có quyền đọc nếu không nằm trong membership.
- Project/track chỉ lưu metadata. File dự án dùng private storage; MIME được nhận diện từ nội dung, giới hạn 100 MiB và quyền download kiểm tra theo membership. File được trả qua API có xác thực, không có URL public.
- Gói có quyền lợi được gắn với project khi tạo order. Khi thanh toán sandbox thành công, quyền sessions/minutes/revisions được snapshot vào order. Link booking tiêu thụ session và phút trong transaction; request revision tiêu thụ lượt sửa. Không thể hủy/refund order sau khi đã dùng quyền lợi.
- Hủy service order chưa sử dụng tạo ledger refund sandbox đầy đủ cho các payment thành công. Đây là chính sách demo tạm thời, không thay thế chính sách hủy hoặc giao dịch hoàn tiền thật.
- Khách có thể liên kết booking của chính họ vào project nếu booking thuộc cùng studio; khi gắn order, booking phải còn hoạt động và order phải paid, thuộc đúng customer/project/studio. Booking vẫn là đơn đặt lịch duy nhất; project không khóa lịch.
- Vật tư tiêu hao được tạo với tồn ban đầu bằng 0. Nhập/xuất/điều chỉnh ghi movement trong transaction, khóa item và chặn tồn âm. Reservation tách số lượng giữ khỏi tồn thực tế; consume ghi movement và chỉ trừ một lần, release không đổi tồn. Booking hủy/từ chối/hết hạn tự giải phóng reservation còn giữ. Thiết bị tái sử dụng vẫn nằm ở logic `equipments` riêng.
- `payments.amount` cho phép 0 để biểu diễn giao dịch `remaining` không còn số dư (ví dụ cọc đủ 100%). Migration `001_allow_zero_balance_settlement.sql` điều chỉnh check constraint cũ.
- Lỗi DB khi kiểm tra/hết hạn booking hiện trả lỗi server `booking_expiration_failed`, không còn bị hiểu thành trạng thái “chưa hết hạn”.

### Giới hạn domain mới cần cân nhắc trước khi tích hợp frontend

1. Service order và booking vẫn dùng sandbox. Chưa có cổng/provider, callback có chữ ký, đối soát ngân hàng hay di chuyển tiền thật. Chính sách refund sandbox hiện hoàn đủ; cần thay theo chính sách hủy được duyệt trước production.
2. Gói thu toàn bộ giá một lần. Chưa có thu thêm cho quá giờ/thêm lượt sửa, báo giá phần vượt gói hoặc nhiều đợt thanh toán.
3. File riêng tư hiện lưu trên filesystem local của API; chưa mã hóa bytes, chưa có object storage, signed URL, quét malware hay retention/backup policy. Không dùng cho bản thu production nhạy cảm trước khi bổ sung các kiểm soát này.
4. Quyền thành viên giới hạn ở xem dữ liệu confidential, quản lý track/session/file và tải file; chưa có phân công staff/technician, workflow bàn giao deliverable hoặc quyền công bố/portfolio.
5. Inventory reversal hiện phải trỏ đến movement gốc cùng vật tư; một movement chỉ được hoàn tác một lần.
6. Chưa có lịch mở cửa/ngày nghỉ phòng, bảo trì theo thời gian cho thiết bị, kiểm soát giờ làm KTV, tự động tiêu hao từ booking/package hoặc deadlock retry riêng cho reservation contention.
7. File dự án hỗ trợ MP3/WAV/FLAC/M4A/MP4/PDF/JPEG/PNG. Tệp trên giới hạn multipart PHP hiện tại (2 MiB) nên dùng raw `PUT`; service giới hạn tổng dung lượng tệp ở 100 MiB.

### Xác thực và giới hạn yêu cầu

- JWT mới chứa `jti` ngẫu nhiên riêng cho từng lần đăng nhập. Logout đưa `jti` vào `revoked_jwt_tokens`; middleware từ chối token đó ngay, kể cả khi chữ ký và `exp` vẫn hợp lệ. Token phát hành trước migration không có `jti` sẽ cần đăng nhập lại.
- `POST /api/auth/login` mặc định giới hạn 10 request/15 phút/IP; `POST /api/bookings/check-availability` mặc định 60 request/phút/IP. Phản hồi vượt mức là HTTP 429 kèm `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`. Ngưỡng cấu hình trong `.env`.
- Rate limit dùng fixed window lưu trong MySQL nên có hiệu lực xuyên qua nhiều worker/container. Danh tính IP lấy từ `REMOTE_ADDR`; nếu chạy sau reverse proxy phải cấu hình để API nhận đúng IP gốc và không tin header forward do client tự gửi.
