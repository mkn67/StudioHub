<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](../api/FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Host: ngừng cung cấp, bảng giá và hồ sơ hợp đồng

Ngày kiểm tra: 04/11/2026. PHP, schema và dữ liệu chỉ được đọc. Các route/DTO đề xuất trong báo cáo **chưa triển khai, chưa được xem là quyết định nghiệp vụ đã duyệt**.

## Kết quả audit và lựa chọn giao diện

Không tìm thấy route DELETE cho thiết bị/bảng giá. Có PATCH hỗ trợ `status: inactive` cho cả hai. Vì thế giao diện dùng **Ngừng cung cấp** và **Ngừng áp dụng**, không gọi đây là xóa vĩnh viễn. Cả hai mở cùng component xác nhận; chỉ gửi ID tài nguyên đúng và một trường `status`. Không tự lọc bỏ hàng sau click, không sửa giá hoặc tồn kho.

Host vẫn có thể tiếp tục công việc hiện tại; không thêm gate hợp đồng, phê duyệt hoặc điều kiện đăng tin mới. Trạng thái tài khoản và trạng thái hợp đồng hoàn toàn riêng biệt.

## Bằng chứng nguồn

- `server/public/index.php`: GET `/api/equipments`, GET `/api/rooms/{id}/rates`, PATCH `/api/equipments/{id}`, PATCH `/api/rooms/{id}/rates/{rate_id}`; PATCH được bảo vệ bằng middleware Host.
- `server/src/Modules/Equipment/EquipmentController.php`: update kiểm tra `assertOwnsEquipment`, cấm đổi `studio_id`. Service gọi repository update.
- `server/src/Modules/Equipment/EquipmentRepository.php`: chấp nhận `active`, `maintenance`, `inactive`; cập nhật các cột whitelist; kiểm tra giảm stock chỉ khi có `total_quantity`. Thao tác mới không gửi khóa này. GET công khai chỉ trả thiết bị active.
- `server/src/Modules/Rooms/RoomController.php`: updateRate gọi `assertOwnsRate(hostId, roomId, rateId)`.
- `server/src/Modules/Shared/OwnershipGuard.php`: kiểm tra thiết bị thuộc Studio của Host; rate phải thuộc phòng trên URL và phòng phải thuộc Host.
- `server/src/Modules/Rooms/RoomService.php`, `RoomRepository.php`: updateRate cập nhật `room_rates`, có whitelist `status`; GET chỉ trả rate active. Schema chỉ cho status `active`/`inactive`.
- `server/database/schema.sql`: `bookings.rate_id` và `booking_details.equipment_id` có FK `ON DELETE RESTRICT`; `bookings` lưu giá phòng/đơn vị/tổng tiền/deposit, `booking_details` lưu đơn giá/số lượng/subtotal thiết bị. Đó là dữ liệu snapshot, không cập nhật trong PATCH status.
- `server/src/Modules/Auth/{AuthController,AuthService,UserRepository}.php`: GET/PATCH profile hiện hỗ trợ tên, điện thoại, URL avatar; đổi mật khẩu có xác thực hiện tại. Email chỉ đọc ở UI này. Không có ngày sinh, pháp nhân, hợp đồng, CCCD, thuế hoặc tài khoản nhận tiền.
- Tìm các từ khóa `contract`, `legal`, `birth`, `tax`, `identity`, `bank`, `cccd` trong `server/src` và schema không thấy capability tương ứng. Không dùng địa chỉ Studio làm địa chỉ pháp lý Host.

## Ý nghĩa trạng thái

- `CONNECTED_VERIFIED`: đã kết nối và chạy kiểm tra thực tế cho phần được ghi rõ.
- `IMPLEMENTED_NOT_RUNTIME_VERIFIED`: có source/luồng frontend nhưng chưa thực hiện mutation thật.
- `FRONTEND_NOT_CONNECTED`: API có sẵn nhưng UI chưa kết nối phần khả năng đó.
- `PARTIAL_API`: API chỉ đáp ứng một phần nhu cầu.
- `MISSING_API`: chưa tìm thấy API.
- `BUSINESS_RULE_UNCLEAR`: cần quyết định nghiệp vụ trước.
- `RUNTIME_BLOCKED`: có chướng ngại thực tế khi chạy kiểm chứng; không dùng chỉ vì chủ động không ghi DB.

Không có mục RUNTIME_BLOCKED trong lượt này. Mutation không chạy vì scope cấm thay đổi records; không coi đó là API đã được kiểm chứng thành công.

## Ma trận khả năng

| Module | Feature | Existing API | Current Status | Missing Requirement | Priority |
|---|---|---|---|---|---|
| Thiết bị | Danh sách đang công khai | GET `/api/equipments?studio_id=...` | CONNECTED_VERIFIED | GET không phải inventory đầy đủ, không trả inactive | P1 |
| Thiết bị | Xóa vĩnh viễn | Không có DELETE | MISSING_API | Chính sách tham chiếu booking, quyền, kiểm tra xung đột | P2 |
| Thiết bị | Ngừng cung cấp | PATCH `/api/equipments/{id}` `{status:inactive}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Luồng đã nối; QA chặn PATCH trước server, chưa kiểm chứng success DB | P1 |
| Thiết bị | Archive/lịch sử/khôi phục | Có status, chưa có owner list inactive | PARTIAL_API | Danh sách quản lý đầy đủ và cách khôi phục; không gọi status là archive có audit | P1 |
| Thiết bị | Đơn đang tham chiếu | FK RESTRICT, stock guard khi đổi quantity | BUSINESS_RULE_UNCLEAR | Cần xác nhận quy trình ngừng cung cấp khi có đơn tương lai, không tự thêm luật ở UI | P1 |
| Bảng giá | Danh sách giá active | GET `/api/rooms/{id}/rates` | CONNECTED_VERIFIED | Không trả inactive, không quản lý toàn bộ lịch sử | P1 |
| Bảng giá | Xóa vĩnh viễn | Không có DELETE | MISSING_API | Chính sách lịch sử, FK RESTRICT và xử lý tham chiếu | P2 |
| Bảng giá | Ngừng áp dụng | PATCH `/api/rooms/{id}/rates/{rate_id}` `{status:inactive}` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Luồng đã nối, chưa chạy mutation thật | P1 |
| Bảng giá | Giá lịch sử booking | Snapshot trong bookings/booking_details | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Source cho thấy PATCH không chạm snapshot; không tạo đơn/ghi giá để thử | P1 |
| Tài khoản | Xem tên, điện thoại, email, status | GET `/api/auth/profile` | CONNECTED_VERIFIED | Status tài khoản không phải status hợp đồng | P1 |
| Studio | Địa chỉ vận hành cơ sở | GET `/api/studios/mine` | CONNECTED_VERIFIED | Có địa chỉ/district/city riêng của Studio, không phải địa chỉ pháp lý Host | P1 |
| Tài khoản | Sửa tên/điện thoại | PATCH `/api/auth/profile` | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Giữ nguyên luồng; QA lỗi/draft và payload được chặn, không ghi thật | P1 |
| Tài khoản | Avatar URL/đổi mật khẩu | PATCH profile có trường tương ứng | FRONTEND_NOT_CONNECTED | Ngoài scope lần này; không tự thêm luồng khác | P2 |
| Hồ sơ Host | Ngày sinh | Không có | MISSING_API | Cột DATE nullable, DTO và validation | P1 |
| Hồ sơ pháp lý | Loại bên ký kết | Không có | BUSINESS_RULE_UNCLEAR | Cá nhân/doanh nghiệp; Host/pháp nhân/Studio là chủ thể nào | P0 |
| Hồ sơ pháp lý | Tên pháp lý, ngày sinh, địa chỉ | Không có | MISSING_API | Phân biệt với tên hiển thị và địa chỉ vận hành Studio | P1 |
| Hồ sơ doanh nghiệp | Đăng ký, mã số thuế, đại diện/chức vụ | Không có | MISSING_API | DTO, quyền đại diện, quyết định trường bắt buộc/verification | P1 |
| Định danh | CCCD, ngày/nơi cấp, trạng thái xác minh | Không có | BUSINESS_RULE_UNCLEAR | Mục đích, thu thập tối thiểu, bảo mật, retention và API riêng | P0 |
| Nhận tiền | Người nhận/tài khoản ngân hàng | Không có | BUSINESS_RULE_UNCLEAR | Cần quyết định payout, nhà cung cấp và cơ chế dữ liệu nhạy cảm | P2 |
| Hợp đồng | Record/status/document/effective/expiry/approval | Không có | MISSING_API | Model, nguồn tài liệu, phân quyền, ai ký/ai duyệt | P1 |
| Hợp đồng | Lấy ảnh/tài liệu có quyền | Không có | MISSING_API | Private storage và truy cập ngắn hạn; mẫu SVG không phải API hợp đồng | P1 |
| Điều kiện Host | Cho thuê/đăng tin sau ký duyệt | Không có quy tắc mới | BUSINESS_RULE_UNCLEAR | Không triển khai gate trước khi duyệt toàn bộ lifecycle | P0 |

## Hợp đồng đang tồn tại — giữ nguyên

Hai request ngừng hoạt động hiện đã có backend:

```text
PATCH /api/equipments/{equipment_id}
PATCH /api/rooms/{room_id}/rates/{rate_id}
Authorization: Bearer <phiên Host>
Content-Type: application/json

{"status":"inactive"}
```

API envelope thành công có `data.equipment_id` hoặc `data.rate_id` và message. Frontend chỉ thông báo thành công sau `apiRequest` resolve, sau đó reload danh sách hiện tại; giữ bộ lọc/search, Studio, phòng và trang danh mục. Không sửa mảng cục bộ để giả xóa.

Source ownership bảo vệ Host khác; chưa gửi PATCH vào tài nguyên người khác để kiểm chứng runtime. Các lỗi có nguồn: `forbidden`, `equipment_not_found`, `room_not_found`, `rate_not_found`, `invalid_rate`, `empty_payload`; thiết bị còn có `invalid_status`. Rate chưa có validation status riêng ở service/controller, dựa ràng buộc DB; không suy diễn HTTP 422 hiện đã được chuẩn hóa. Frontend luôn chỉ gửi giá trị `inactive` đã xác minh trong schema.

Dialog ngăn submit trùng, giữ mở khi pending, không cho Escape/backdrop kết thúc một request đang xử lý, hiện lỗi và cho thử lại. Nếu kết nối mất sau khi server có thể đã xử lý, thông báo là “Chưa xác nhận được thay đổi”, không khẳng định DB chưa đổi. Hủy chỉ đóng dialog; không hoàn tác một mutation đã được xác nhận.

Giới hạn: danh sách công khai không trả inactive nên tài nguyên biến mất sau GET xác nhận lại; không có trang khôi phục trong scope. Ngừng rate cuối cùng có thể khiến phòng không có giá khả dụng; UI không tự tạo giá thay thế hoặc đặt chính sách tối thiểu một rate. Cần quyết định nghiệp vụ, không thay tính giá trong nhiệm vụ frontend này.

## Đề xuất API — CHƯA TRIỂN KHAI

### D1. Danh sách quản lý và khôi phục

Đồng bộ với đề xuất inventory trong `docs/api/PROPOSED_API_CONTRACTS.md`, không tạo endpoint thứ hai cho cùng chức năng:

- GET `/api/host/equipments?studio_id=&status=&page=&limit=`: Host, chỉ cơ sở thuộc mình; `status=active|inactive|maintenance`, có pagination/filters.
- GET `/api/host/rooms/{room_id}/rates?status=&page=&limit=`: Host sở hữu phòng; trả active/inactive, lịch hiệu lực và ID ổn định.
- Response: envelope `{items,pagination}`, item dùng trường hiện có; không trả thông tin khách hàng hay đơn thuê đầy đủ.
- Validation: ID dương, enum status, limit có trần; 400 filter không hợp lệ, 401 thiếu phiên, 403 sai chủ, 404 không tồn tại.
- Khôi phục có thể dùng PATCH status=active đã tồn tại nhưng phải duyệt quy tắc tài nguyên, hiệu lực giá, tương thích với danh mục; chưa nối thêm thao tác khôi phục ở frontend này.
- Phụ thuộc: phân quyền owner, quyết định archive thực sự khác inactive hay không; lưu audit tối thiểu theo retention đã duyệt.

### D2. Xóa vĩnh viễn — tùy chọn, chỉ sau quyết định nghiệp vụ

Đề xuất DELETE `/api/equipments/{id}` và DELETE `/api/rooms/{room_id}/rates/{rate_id}` **chỉ khi sản phẩm thật sự cần xóa**, không thay thế PATCH hiện có tự động.

- Role Host, chủ cơ sở/phòng; rate ID phải thuộc room ID. Body không nhận `host_id`, giá hoặc số lượng.
- Response 200 envelope với ID và operation hoặc 204; chọn một dạng thống nhất trước khi triển khai.
- Kiểm tra tham chiếu atomically trong transaction, không cascade xóa booking/payment/invoice. Khi có tham chiếu: 409 `resource_in_use`, hướng dẫn dùng ngừng hoạt động. Không để lộ đơn thuộc người khác.
- 401 thiếu phiên, 403 sai quyền, 404 không có tài nguyên; xác định idempotency cho request lặp và audit có quyền.
- Phụ thuộc DB FK, retention lịch sử/hợp đồng, rollback và quyết định xóa tài nguyên chưa từng được dùng. Không triển khai hoặc thử DELETE trong lượt này.

### L1. Ngày sinh tài khoản

Đề xuất thêm `date_of_birth: YYYY-MM-DD | null` vào GET/PATCH `/api/auth/profile` cùng cột DATE nullable, sau khi duyệt. Chủ phiên, không nhận ID người khác. Backend kiểm tra ngày lịch/năm nhuận, không ở tương lai theo múi giờ thống nhất; không tự đặt chính sách tuổi tối thiểu. UI có thể hiển thị DD/MM/YYYY độc lập serialization.

Lỗi đề xuất 422 `invalid_date_of_birth`, 401/403 theo phiên. Trường tùy chọn, mục đích và retention cần quyết định. Hiện input bị disabled, không có name/payload và không được lưu trong browser.

### L2. Hồ sơ pháp lý Host

Đề xuất GET và PATCH `/api/host/legal-profile`:

- Role Host, chủ phiên; nếu pháp nhân dùng chung nhiều Host thì phải thiết kế quyền ủy quyền trước, không đoán từ Studio ID.
- DTO đề xuất: `party_type: individual|organization`, `legal_name`, `contact_phone`, `contact_email`, `legal_address`; organization có `registration_number`, `tax_id`, `representative_name`, `representative_position`. Chỉ nhận/trả trường áp dụng với loại bên ký kết đã duyệt.
- Không đưa CCCD, tài khoản ngân hàng, verification status hoặc contract approval vào PATCH này. Không tự lấy `full_name` làm tên pháp lý đã xác minh. Không chuẩn hóa tỉnh/huyện bằng mã tự đặt.
- Response dữ liệu đã lưu, `updated_at`, version để kiểm soát cập nhật đồng thời; trạng thái xác minh chỉ do backend có quyền cung cấp sau khi workflow tồn tại.
- Validation Unicode, giới hạn độ dài được thống nhất, email đa nhà cung cấp, phone dạng chuỗi; quy tắc mã đăng ký/thuế theo loại chủ thể và thị trường phải được chủ sản phẩm duyệt.
- Lỗi đề xuất: 401, 403, 404 `legal_profile_not_found`, 409 `profile_version_conflict`, 422 `invalid_legal_profile`, 503 capability chưa được bật.
- Phụ thuộc: model riêng Host/pháp nhân, notice/cơ sở xử lý, quyền đại diện, ai xem/duyệt, retention và lịch sử thay đổi. Log không ghi nguyên dữ liệu nhạy cảm; không public hóa legal profile theo Studio.

### L3. Định danh và nhận tiền

Chưa chốt endpoint/DTO thu thập CCCD hoặc ngân hàng vì chưa có mục đích, phương thức kiểm chứng và nhà cung cấp được duyệt. Khi cần định danh, tham khảo đề xuất riêng `/api/account/identity-verification` trong `docs/customer/CUSTOMER_PROFILE_API_GAPS.md`, nhưng không mặc định cùng quy trình Customer/Host.

Tối thiểu phải xác định trường nào thật sự cần (ngày/nơi cấp không tự trở thành bắt buộc), xác thực lại, TLS, mã hóa, quản lý khóa, masking, giới hạn quyền/rate limit, audit đã lược bỏ dữ liệu, retention/xóa và xử lý yêu cầu người dùng. Không lưu CCCD/bank trong localStorage/sessionStorage/URL/analytics/log. Không thêm upload ảnh/OCR. Dữ liệu payout có thể cần token hóa qua nhà cung cấp, không tự triển khai biểu mẫu ngân hàng.

### C1. Danh sách và thông tin hợp đồng

Đề xuất GET `/api/host/contracts` và GET `/api/host/contracts/{contract_id}`:

- Host chỉ được đọc hợp đồng mình được phép truy cập. Không chỉ kiểm tra ID đoán được; phải xác minh quan hệ chủ thể pháp lý/Host/Studio sau khi mô hình được duyệt.
- Query danh sách: `page`, `limit`, `status` theo enum sẽ được phê duyệt. Không lấy enum trạng thái tài khoản làm trạng thái hợp đồng.
- Response đề xuất: `contract_id`, `title`, `status`, `effective_at`, `expires_at`, `document_available`, `version`; các ngày nullable, không tự điền bằng thời điểm tạo tài khoản. Không trả CCCD đầy đủ, bank, chữ ký hoặc URL public vĩnh viễn trong list.
- Lỗi: 401, 403 hoặc 404 che giấu tài nguyên không thuộc quyền, 422 filter không hợp lệ. Enum signed/approved chỉ dùng sau khi định nghĩa bằng chứng và người có thẩm quyền.
- Phụ thuộc: model hợp đồng, versioning, lưu tài liệu, quyền ký/duyệt/upload và retention theo tài liệu thật; chưa có bảng hoặc route này trong code hiện tại.

### C2. Quyền truy cập tài liệu

Đề xuất POST `/api/host/contracts/{contract_id}/document-access`:

- Role Host có quyền với hợp đồng; xác minh lại quyền ở mỗi request. Body `{version}` hoặc rỗng theo hợp đồng cuối, không nhận URL nguồn do client tự chỉ định.
- Response đề xuất `{url,expires_at,mime_type,version}` với URL được ký ngắn hạn, hoặc stream ảnh/PDF qua endpoint có xác thực. Không public permanent URL, không upload mẫu SVG thành tài liệu thật.
- 401/403/404, 410 `document_access_expired`, 409 `contract_version_changed`, 429 `rate_limited`; xác định cách làm mới URL đã hết hạn.
- Phụ thuộc private object storage, allowlist loại nội dung, chống lộ URL qua referrer/log, cache riêng tư, chính sách hết hạn và audit không chứa dữ liệu tài liệu. Component ảnh hiện chỉ dùng nguồn mẫu local.
- Upload, ký và approve là capability khác; chưa đề xuất route thao tác trước khi chốt ai được phép và bằng chứng nào được chấp nhận.

## Các quyết định phải được chốt trước giai đoạn nghiệp vụ

1. Trường bắt buộc của Host cá nhân là gì?
2. Trường bắt buộc của doanh nghiệp/tổ chức là gì?
3. Hợp đồng theo Host, pháp nhân hay từng Studio?
4. Ai có quyền xác minh thông tin pháp lý?
5. Ai tải lên tài liệu, ai được thay phiên bản?
6. Bằng chứng nào được coi là đã ký hợp lệ?
7. Ai phê duyệt thỏa thuận?
8. Khi nào Host được đăng tin/cho thuê?
9. Khi hết hạn hợp đồng, tác động tới listing và booking hiện hữu thế nào?
10. Khi hồ sơ pháp lý thay đổi, có cần ký lại/duyệt lại không?
11. Có hạn chế ngừng thiết bị/bảng giá khi có đơn tương lai không, khôi phục ra sao?
12. Có cần xóa vĩnh viễn hay chỉ ngừng hoạt động và giữ audit?

Không câu trả lời nào trong danh sách này được tự chuyển thành gate frontend hoặc thay đổi trạng thái Host trong nhiệm vụ này.

## Mẫu tài liệu và cách thay sau này

- Asset local `client/public/images/contract-preview-placeholder.svg`, có nhãn “MẪU HỢP ĐỒNG — MINH HỌA”, không chữ ký/con dấu/CCCD hoặc điều khoản giả.
- Nguồn duy nhất `illustrativeContract` trong `client/src/features/host/contract-preview.tsx`; thumbnail và modal dùng cùng config.
- `ContractPreview` nhận typed props `{src,title,description,illustrative}`. Khi có backend thật, adapter có quyền phải cung cấp nguồn và metadata đã kiểm chứng. Không chỉ đổi `illustrative=false` để tự tạo trạng thái đã ký; component không suy diễn status.
- Với nguồn đòi Bearer header, không gắn URL thô vào Image rồi cho rằng đã xác thực: cần adapter fetch có quyền lấy Blob và revoke object URL khi đóng, hoặc URL được ký ngắn hạn từ API. Chưa triển khai adapter này.

## Kiểm chứng

GET thật danh sách thiết bị, phòng, giá và profile được dùng trong browser QA; xem report triển khai đi kèm để biết kết quả lệnh và kích thước màn hình. PATCH thiết bị/giá/profile trong QA bị chặn trước server, kiểm tra ID/payload, pending, lỗi và không có thành công giả. Không ghi DB, không xóa, không đổi giá, không tạo booking để kiểm chứng lịch sử. Phân quyền write và path success mới được kiểm tra source, không được gán CONNECTED_VERIFIED cho mutation.
