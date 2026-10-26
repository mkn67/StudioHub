# STUDIOHUB — BUSINESS POLICY (QUY TẮC NGHIỆP VỤ CHÍNH THỨC)

**Phiên bản:** 1.1 · **Ngày tổng hợp:** 25/10/2026 · **Ngôn ngữ áp dụng:** Tiếng Việt  
**Trạng thái:** Tài liệu chính sách đã đối chiếu; **không phải chứng nhận database hoặc code đã triển khai đúng**.  
**Mục đích:** Nguồn quy tắc nghiệp vụ chuẩn để xây dựng frontend mock, thiết kế API/database về sau và kiểm thử. Không phải chính sách pháp lý đã thẩm định.

## 0. Nguồn, thứ tự ưu tiên và phạm vi

**Nguồn đã đối chiếu:** (S1) `StudioHub_Design_Business_Specification_v1.0.md` — quyết định UI/UX/nghiệp vụ sau các lượt xác nhận; (S2) `web.md` — Chương 3 bao gồm use case, thiết kế database, API và site map; (S3) `Đồ án Web (3).md` — phần 3.2 và 3.3 về database và API. S2 và S3 nhiều đoạn cùng một bản thiết kế cũ, **không được xem là hai bằng chứng độc lập cho tính đúng đắn**.

**Thứ tự ưu tiên:** Các chính sách S1 đã được người dùng xác nhận > quy tắc kỹ thuật trong S2/S3 nếu không mâu thuẫn > đề xuất triển khai tại phụ lục. Các đề xuất kỹ thuật chưa được duyệt được gắn nhãn **[KIẾN NGHỊ]**, không phải luật kinh doanh mới. Quy trình quan trọng chưa được quyết định gắn **[CHƯA CHỐT]**, không tự suy diễn.

**Ranh giới triển khai:** StudioHub là sản phẩm Fullstack về lâu dài, nhưng **giai đoạn 1 là frontend tương tác với dữ liệu mock**, không có backend/database/tiền thật. Giai đoạn sau mới áp dụng transaction, xác thực máy chủ và ràng buộc SQL. Tài liệu `web.md` mô tả Next.js/PHP/MySQL là một **phương án thiết kế trong đồ án**, không thay thế quyết định chưa chốt công nghệ backend/database ở S1.

## 1. Thuật ngữ và mô hình sở hữu

| Thuật ngữ | Nghĩa nghiệp vụ | Lưu ý |
|---|---|---|
| Customer | Người thuê phòng | Có thể xem/phát sinh/giải quyết đơn của mình |
| Host | Chủ Studio | Quản lý cơ sở, loại phòng, phòng thực tế, thiết bị và đơn của cơ sở mình |
| Admin | Quản trị nền tảng | Xét duyệt, kiểm duyệt và xử lý ngoại lệ trong giới hạn được giao |
| Studio | Cơ sở/thương hiệu cho thuê | Một Host thường có 1 Studio; tương lai có thể nhiều |
| Room Type | Nhóm phòng có đặc điểm/bảng giá mặc định | VD: Daylight Studio; không đồng nhất với danh mục công dụng |
| Room Unit | **Một phòng vật lý riêng biệt** | VD: A101, A102 — là đơn vị khách tìm, chọn và giữ lịch |
| Space Type | Nhãn loại hình hoạt động | VD: Podcast, Photo, Workshop; một Room Unit có thể hỗ trợ nhiều nhãn |
| Included Equipment | Tiện nghi/thiết bị đã nằm trong phòng | Không tính là thiết bị add-on cho thuê thêm |
| Rental Equipment | Thiết bị/nội thất thuê thêm trong kho Studio | Có lượng tồn dùng chung theo thời gian |
| Booking Hold | Quyền giữ phòng/thiết bị khi đang chờ cọc | Có hạn; phải thả đúng quy tắc |
| Refund | Nghĩa vụ/tiến trình hoàn tiền | **Độc lập** với trạng thái booking và thanh toán |
| Strike | Một sự kiện vi phạm theo danh mục chính sách | Tối đa 1 strike cho cùng một hành vi đặt/hết hạn đơn |

**Quan hệ chuẩn:** `Host → Studio → Room Type → Room Unit`. `Space Type` là phân loại tìm kiếm có thể liên kết nhiều–nhiều với Room Unit/Room Type, **không thay thế `Room Type`**. Mỗi Room Unit thuộc một Studio và một Room Type của cùng Studio. Thiết bị add-on phải thuộc **cùng Studio** với Room Unit được đặt.

## 2. Vai trò, tài khoản và quyền sở hữu

**BP-01.** Hệ thống có 3 vai trò chính: `customer`, `host`, `admin`. Khách chưa đăng nhập có thể xem/tìm phòng. Việc tạo đơn cuối cùng bắt buộc đăng nhập. Frontend mock có thể cho đổi persona để demo, nhưng không coi client-side role guard là bảo mật thực.

**BP-02.** Đăng ký Host theo ba bước: thông tin tài khoản/liên hệ → thông tin Studio → xác nhận gửi yêu cầu. Admin phê duyệt hoặc từ chối kèm lý do; Host được duyệt tiếp tục onboarding Studio, Room Type, Room Unit, thiết bị và chính sách/bảng giá.

**BP-03.** Host chỉ được xem/sửa nguồn lực và đơn thuộc Studio mình quản lý. Customer chỉ được xem/thao tác các đơn sở hữu. Admin không mặc nhiên được thay giá, chuyển phòng hay sửa tuỳ tiện dữ liệu Host.

**BP-04.** **Phân biệt khóa bảo mật/đăng nhập** với **tạm ngưng quyền đặt thuê vì 3 strike**. Tạm ngưng quyền đặt thuê **không cấm đăng nhập** và không ngăn giải quyết đơn đã hợp lệ, theo dõi tiền cọc/hoàn tiền, thanh toán công nợ hoặc gửi yêu cầu hỗ trợ.

## 3. Không gian, khả dụng và lịch

**BP-05.** Khách đặt **đúng một Room Unit vật lý**. Hai phòng cùng Room Type có mã, ảnh, vị trí/tầng, ánh sáng, đặc điểm riêng và lịch riêng. Mỗi Room Unit là một kết quả tìm kiếm; Host quản lý phòng theo Room Type rồi đến Room Unit.

**BP-06.** Room Type hỗ trợ cấu hình hình thức thuê: theo giờ, theo buổi, combo thời lượng ví dụ 3/5/10 giờ; từng Room Unit có thể ghi đè giá. Ca thuê luôn có `start_at`/`end_at` thực tế. Các đơn vị ngày/tuần/tháng trong S2/S3 là khả năng mở rộng **chưa được mặc định triển khai giai đoạn 1**.

**BP-07.** Phòng và thiết bị chỉ khả dụng nếu không vướng đơn/hold đang hiệu lực, đáp ứng sức chứa, trạng thái hoạt động và tồn kho. Số người bắt buộc >0 và không vượt sức chứa. Thiết bị add-on số lượng chọn >0, không vượt tổng lượng khả dụng trong khoảng tương ứng.

**BP-08.** Sau mỗi ca có **30 phút đệm** để dọn và chuẩn bị phòng; đây không phải giờ sử dụng miễn phí. Tính khoảng chiếm dụng phòng là `[start_at, end_at + 30 phút)`. Hai khoảng A/B xung đột khi `A.start < B.busy_end AND B.start < A.busy_end`. 12:00 kết thúc ca ⇒ 12:00–12:30 là đệm, đặt mới bắt đầu 12:30 có thể hợp lệ nếu không bị ca khác chặn.

**BP-09.** Giữ phòng/thiết bị của các đơn hợp lệ đang chờ thanh toán, chờ Host xác nhận, đã xác nhận và đang sử dụng. Đơn `cancelled`, `expired` không giữ tài nguyên; `completed`/`no_show` không giữ ca tương lai nhưng vẫn phải tuân thủ mốc đệm liên quan và lịch sử đã chiếm dụng. Khi thực tế vượt giờ, cảnh báo xung đột vận hành; **không tự dời/hủy khách kế tiếp**.

## 4. Tạo đơn, thời hạn cọc và thanh toán mô phỏng

**BP-10.** Điều kiện đặt trước: `booking.created_at <= booking.start_at − (24 giờ + payment_window)`. `payment_window` do Host cấu hình **15 phút đến 3 giờ**; danh sách lựa chọn phù hợp là 15/30/60/120/180 phút. Ví dụ Host cho 3 giờ để trả cọc thì phải đặt trước giờ thuê ít nhất 27 giờ.

**BP-11.** Khi khách xác nhận hợp lệ: tạo đơn `awaiting_payment`, snapshot thông tin giá/chính sách, giữ đúng Room Unit và thiết bị đến `payment_deadline = created_at + payment_window`. Giai đoạn 1 chỉ dùng nút mô phỏng thanh toán thành công/thất bại, không QR ngân hàng giả hoặc giao dịch thực.

**BP-12.** Nếu khách hủy đơn trước khi trả cọc hoặc để hết hạn trả cọc do bỏ đơn: giải phóng hold, ghi **một strike** theo BP-27. Với lỗi thanh toán đã xác minh là do hệ thống/nhà cung cấp, **không tính strike**.

**BP-13.** Thanh toán cọc phải bắt đầu **trước** deadline. Nếu giao dịch đã bắt đầu đúng hạn nhưng còn `processing`, cho xử lý thêm **tối đa 5 phút** sau deadline; giữ tài nguyên trong khoảng này. Không cho khởi tạo một lần thanh toán mới sau deadline. Trạng thái kết quả chưa xác định phải được đưa vào đối soát, **không tự tính strike hoặc chấp nhận thanh toán chưa xác minh**.

**BP-14.** Trả cọc thành công ⇒ đơn `pending` **chờ Host duyệt**, chưa phải `confirmed`. Khoản cọc đã nhận là một phần của tổng tiền, không mặc nhiên đã thanh toán toàn bộ.

**BP-15.** Host có **đúng 2 giờ từ thời điểm cọc được xác nhận thành công** để duyệt/từ chối. Duyệt ⇒ `confirmed`; từ chối ⇒ `cancelled` và **hoàn 100% tiền cọc**, không strike (quy trình hoàn thông thường cần Host xác nhận). Hết 2 giờ không phản hồi ⇒ hệ thống tự `cancelled`, giải phóng tài nguyên, tự động **khởi tạo/xử lý hoàn 100%**, không strike; nếu hoàn thất bại thì theo luồng lỗi/đối soát chứ không giả định tiền đã về tài khoản.

**BP-16.** Trạng thái **Booking / Payment / Refund độc lập**:

| Nhóm | Enum đã chốt | Ý nghĩa |
|---|---|---|
| Booking | `awaiting_payment`, `pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `expired`, `no_show` | Vòng đời quyền sử dụng phòng |
| Payment attempt | `unpaid`, `processing`, `paid`, `failed` | Giao dịch/đợt thanh toán; lưu lần thử |
| Refund | `not_required`, `pending`, `processing`, `refunded`, `failed` | Trạng thái nghĩa vụ hoàn tiền, lưu số tiền/thử lại |

**BP-17.** Một booking có thể đã `cancelled`, cọc `paid`, refund `pending`; hoặc đã `completed` nhưng còn phải thu. **Không dùng một trường `booking.status` để suy ra tiền đã thu hay đã hoàn.**

## 5. Giá, cọc, số dư và lịch sử tài chính

**BP-18.** Giá phòng, add-on và tổng tiền phải xác định rõ đơn vị thuê, số lượng và bảng giá tại thời điểm tạo/duyệt thay đổi; snapshot giá cũ không bị sửa hồi tố bởi Host đổi bảng giá. Không tự định mức cọc cố định 30% — 30% trong tài liệu kỹ thuật chỉ là ví dụ/tham số đề xuất; dùng tỷ lệ thực tế của Studio.

**BP-19.** Tổng tiền thuê ban đầu: `room_amount + equipment_amount` (và các khoản hợp lệ được công bố nếu có). Khoản cọc được tính vào số tiền đã thu. Công nợ hiện hành tính từ **tổng nghĩa vụ hợp lệ – tổng tiền đã thực thu + điều chỉnh hợp lệ – hoàn/khấu trừ được ghi nhận theo cách không đếm hai lần**; thiết kế sổ dòng tiền/ledger cần tránh thu/hoàn trùng, số dư âm sai.

**BP-20.** Host ghi nhận tiền còn lại theo **nhiều đợt**, có thể một phần/toàn bộ, bằng tiền mặt hoặc chuyển khoản **mô phỏng**. Phải lưu số tiền, thời điểm, người ghi nhận, phương thức và tham chiếu; thu một phần không thay đổi trạng thái Booking.

**BP-21.** Sau khi đổi lịch/phòng được duyệt: **giữ nguyên khoản cọc đã trả**, tính lại tổng giá và công nợ, không thu ngay phần tăng cọc. Nếu tổng giá mới thấp hơn số cọc đã thực thu, ghi **nghĩa vụ hoàn cọc dư**; không coi đây là hủy đơn.

## 6. Hủy đơn, hoàn cọc, xử lý hoàn thất bại

**BP-22.** Host cấu hình hạn khách tự hủy **24 / 48 / 72 giờ trước giờ thuê**. Qua hạn, Customer không tự hủy; có thể yêu cầu hỗ trợ ngoại lệ. Hạn hủy là một cấu hình **khác** hạn đổi lịch.

**BP-23.** Host cấu hình các mốc/tỷ lệ hoàn cọc **0–100%** trong giới hạn chính sách. Chính sách hoàn/cắt hạn được **snapshot khi tạo đơn**, thay đổi sau đó không hồi tố. Khách hủy đơn **đã cọc trong hạn được phép** ⇒ hoàn theo snapshot (có thể là một phần hoặc 0%), **không strike**.

**BP-24.** Host từ chối sau cọc hoặc Host quá hạn duyệt ⇒ hoàn 100%, không strike. Admin hủy ngoại lệ do sự cố không thuộc khách **trước giờ bắt đầu** ⇒ hoàn 100%, ghi lý do và audit. Các nhánh hoàn đặc biệt không áp dụng nhầm tỷ lệ hủy tự nguyện của Customer.

**BP-25.** Hoàn thông thường: hệ thống tính số tiền đủ điều kiện, Host xác nhận/tiến hành xử lý; ghi rõ `pending → processing → refunded/failed`. **Riêng Host không phản hồi trong 2 giờ:** khởi tạo/xử lý hoàn tự động. Chỉ coi hoàn thành công khi mô phỏng báo thành công (giai đoạn 1) hoặc giao dịch thực được đối soát (giai đoạn sau).

**BP-26.** Nếu một lần hoàn **đã được xác minh thất bại** và có thể thử lại, tự retry **tối đa 2 lần bổ sung**. Vẫn thất bại ⇒ chuyển Admin xử lý, giữ lịch sử/idempotency. **Không retry giao dịch chưa rõ kết quả** để tránh hoàn trùng.

## 7. Vi phạm, tạm ngưng quyền đặt và khôi phục

**BP-27.** Tăng 1 strike cho: (a) Customer tự hủy một booking đã tạo nhưng **chưa trả cọc**, hoặc (b) booking hết hạn chưa thanh toán vì Customer bỏ đơn. **Không tính trùng hai trường hợp cho cùng một booking/sự cố**. Không tính strike cho hủy đúng hạn sau cọc, Host từ chối, Host trễ duyệt, Admin/hệ thống hủy không do Customer, lỗi cổng đã xác minh, **No-show**.

**BP-28.** Tích lũy **3 strike hiệu lực** ⇒ tự tạm ngưng **quyền tạo booking trên toàn hệ thống** đến khi Admin mở khóa thủ công. Customer vẫn đăng nhập, xem lịch sử, tiếp tục thực hiện/check-in các đơn hợp lệ có trước, thanh toán công nợ, nhận hoàn và yêu cầu hỗ trợ. Khi bị tạm ngưng, **không được tạo đơn mới hoặc đổi lịch**.

**BP-29.** Admin khôi phục ⇒ bộ đếm strike **hiệu lực về 0**, **không xóa lịch sử** vi phạm/audit.

## 8. Yêu cầu đổi lịch / đổi Room Unit

**BP-30.** Chỉ booking `confirmed`, chưa Check-in, còn đủ hạn mới được gửi yêu cầu đổi giờ/ngày/gói/Room Unit. Host cấu hình hạn đổi riêng **24/48/72 giờ trước giờ bắt đầu gốc**. Mỗi booking **tối đa 1 lần thay đổi thành công**; đơn bị từ chối/rút lại/chưa hoàn tất **không mất lượt**. Mỗi đơn chỉ có một change request đang xử lý.

**BP-31.** Host phải duyệt. Trong thời gian xét yêu cầu, booking và **lịch cũ vẫn được giữ**. Khi chấp thuận, kiểm tra khả dụng mới gồm 30 phút buffer, tồn thiết bị, sức chứa, giá, hạn đặt và quyền tài khoản. Chỉ khi việc thay đổi hoàn tất an toàn mới thay thế lịch/phòng và giải phóng lịch cũ; từ chối/không hợp lệ không làm mất đơn gốc. Ghi lịch sử trước/sau.

**BP-32.** Giá mới có thể tăng/giảm, áp dụng BP-21; một thay đổi hợp lệ không phải strike. Tài khoản bị ngưng quyền đặt không được đổi lịch kể cả khi còn booking hợp lệ.

## 9. Check-in, Check-out, hoàn tất, No-show và quá giờ

**BP-33.** Host **xác nhận Check-in thủ công**, lưu giờ khách nhận phòng thực tế. Không QR bắt buộc và không tự `checked_in` theo đồng hồ.

**BP-34.** Khách tới trễ vẫn kết thúc đúng giờ đặt ban đầu; **không** tự kéo dài thời lượng, giảm giá hay đền bù thời gian đến muộn. Host lưu giờ đến thực tế.

**BP-35.** Host **xác nhận Check-out thủ công**, lưu giờ trả phòng thực tế. Ngay khi check-out được xác nhận ⇒ booking `completed` **dù còn công nợ hoặc phụ thu**. Tiền còn phải thu được theo dõi riêng, không giữ booking ở `checked_in` chỉ vì chưa thanh toán.

**BP-36.** Hết ca thuê dự kiến mà **chưa có Check-in được xác nhận** ⇒ `no_show`, cọc **không được hoàn**, **không cộng strike**. Không tự chuyển `completed` hoặc tự thu toàn bộ phần giá còn lại ngoài quy tắc đã chốt. Giữ/bỏ khoảng chiếm dụng cuối ca đúng quy tắc buffer và không làm mất lịch kế tiếp.

**BP-37.** Quá giờ: Host cấu hình đơn giá cho **mỗi block 30 phút**, tính `ceil(max(0, checkout_actual − checkout_scheduled) / 30 phút) × rate_per_block`. Ví dụ 31 phút ⇒ 2 block. Đệm 30 phút không phải dùng miễn phí. Nếu quá giờ trùng lịch khách sau, cảnh báo khẩn, ghi sự cố, **không tự đổi/hủy đơn người sau**.

## 10. Quyền của Admin và nhật ký hệ thống

**BP-38.** Admin duyệt/từ chối Host, khóa/mở quyền tài khoản, ẩn/hiện Studio/phòng, theo dõi audit và xử lý hoàn tiền lỗi. Admin **chỉ được hủy booking ngoại lệ nếu CHƯA đến thời điểm bắt đầu dự kiến**, yêu cầu lý do bắt buộc, xác nhận hành động và audit. Không cho Host/Admin kéo Kanban tùy ý để vượt quy tắc.

**BP-39.** Mọi hành động thay trạng thái tài chính/đơn/vi phạm/quyền truy cập cần lưu actor (hoặc system), timestamp, lý do khi cần, từ-trước/sau, tham chiếu giao dịch, và lịch sử xử lý. `AUDIT_LOGS` hiện tại trong S2/S3 là nền tảng nhưng chưa đủ nếu không thêm định danh/version cho những thao tác quan trọng.

## 11. Ma trận vòng đời và ràng buộc tham chiếu

| Từ trạng thái | Điều kiện/hành động | Sang trạng thái | Chiếm lịch |
|---|---|---|---|
| Chưa có đơn | Tạo đơn hợp lệ + giữ chỗ | `awaiting_payment` | Có, tới hạn cọc/grace hợp lệ |
| `awaiting_payment` | Cọc thành công và xác minh | `pending` | Có |
| `awaiting_payment` | Bỏ thanh toán quá hạn (không pending đối soát) | `expired` | Không, sau khi xử lý hết hold |
| `awaiting_payment` | Customer tự hủy trước cọc | `cancelled` | Không |
| `pending` | Host duyệt trong 2 giờ | `confirmed` | Có |
| `pending` | Host từ chối hoặc hệ thống timeout 2h | `cancelled` | Không; có nghĩa vụ hoàn 100% |
| `confirmed` | Host xác nhận nhận phòng | `checked_in` | Có |
| `confirmed` | Hủy hợp lệ trước start | `cancelled` | Không |
| `confirmed` | Hết ca không Check-in | `no_show` | Không sau kết thúc/đệm áp dụng |
| `checked_in` | Host xác nhận trả phòng thực tế | `completed` | Không còn quyền dùng; có thể còn công nợ |

Trạng thái thanh toán/hoàn **không** suy ra từ bảng trên. Các trường hợp chưa mô tả rõ phải trả lỗi hợp lệ hoặc đưa vào review, không tạo đường chuyển trạng thái tùy ý.

## 12. Kiểm soát nhất quán dữ liệu và ràng buộc database (định hướng)

Phần này là **tiêu chí để đánh giá schema/API hiện tại và xây backend tương lai**, không khẳng định database chạy hiện nay đã có các bảng sau.

**BP-40. Ràng buộc trực tiếp:** PK/FK/UNIQUE/CHECK cho mã booking, email, mã Room Unit trong cùng Studio, role, status, tiền không âm, capacity/area >0, thời gian `start < end`, quantity >0, thiết bị và rate đúng Studio/phòng, `min_units <= max_units` khi max có giá trị, ngày hiệu lực rate hợp lệ; tránh xóa cứng dữ liệu có lịch sử nghiệp vụ.

**BP-41. Ràng buộc phối hợp:** Tránh trùng lịch và vượt tồn kho là vấn đề đa dòng, cần transaction, thứ tự khóa nhất quán, kiểm tra lại **sau khi khóa**, thời gian máy chủ, xử lý đồng thời và idempotency ở backend. `CHECK` đơn giản hoặc trigger `COUNT(*)` riêng lẻ **không bảo đảm chống race condition**. Mock frontend chỉ mô phỏng logic trên một phiên/browser.

**BP-42. Thời gian:** Dùng múi giờ nghiệp vụ Asia/Ho_Chi_Minh; trong backend thực cần biểu diễn mốc thời gian một cách nhất quán (khuyến nghị ISO 8601 có offset hoặc UTC nội bộ với chuyển đổi ở giao diện), không dựa vào đồng hồ trình duyệt để xác nhận timeout hoặc tạo booking.

**BP-43. Giá và ledger:** Chụp snapshot giá/chính sách khi booking được tạo; chỉnh sửa được ghi bằng revision/sự kiện. Phân biệt **cọc yêu cầu**, **cọc thực nhận**, **tổng giá hiện hành**, **đã thu**, **hoàn phải trả**, **hoàn thành công**, **số dư phải thu**. Không nhân đôi khoản thu khi đồng thời có bảng `PAYMENTS` và `PAYMENT_COLLECTIONS`.

**BP-44. Công khai/chưa công khai:** Studio/Room Unit ngưng hoạt động không xuất hiện trong tìm kiếm hoặc cho tạo booking mới, nhưng giữ được các đơn lịch sử. Chuyển trạng thái inactive/maintenance phải xét các đơn tương lai thay vì tự ý xóa/hủy đơn.

## 13. Kịch bản nghiệm thu tối thiểu

1. Hai Room Unit cùng Room Type là hai listing và lịch độc lập; Host quản lý theo nhóm.
2. Hai lần đặt cùng Room Unit, cùng khung giờ → chỉ một booking hợp lệ; buffer 30 phút được tính.
3. Thiết bị chung không bị vượt số lượng khi nhiều phòng cùng đặt.
4. Hạn đặt trước: Host 3 giờ cọc → phải đặt trước ca ít nhất 27 giờ.
5. Booking mới là `awaiting_payment`, cọc thành công mới là `pending`; Host duyệt mới là `confirmed`.
6. Payment bắt đầu trước deadline, thành công trong grace 5 phút ⇒ xử lý đúng; chưa rõ kết quả không strike.
7. Host không duyệt trong 2 giờ ⇒ hủy + hoàn 100% tự động + không strike.
8. Hoàn thất bại có kiểm chứng ⇒ retry tối đa 2 lần rồi Admin; không hoàn trùng.
9. Hủy trước cọc/hết hạn do khách ⇒ mỗi booking 1 strike; đủ 3 ngăn booking mới nhưng không chặn đăng nhập.
10. Hủy đã cọc trong hạn ⇒ hoàn theo snapshot, không strike.
11. Host duyệt đổi Room Unit/lịch 1 lần, lịch gốc vẫn được giữ trước khi thay xong; cọc không tăng ngay.
12. Host Check-in muộn ⇒ không đổi giờ trả; Checkout ⇒ `completed` dù còn khoản phải thu.
13. Hết ca không Check-in ⇒ `no_show`, mất cọc, không thêm strike.
14. Quá giờ 31 phút ⇒ 2 block; xung đột ca sau chỉ cảnh báo khẩn.
15. Thanh toán một phần/trả đủ được ghi sổ chính xác và lịch sử đồng bộ Customer–Host–Admin.
16. Admin không thể hủy ngoại lệ sau khi ca bắt đầu; mọi hành động phải có lý do/audit.
17. Các trạng thái refund, payment, booking hiển thị độc lập; hoàn dư sau đổi lịch không bị coi là hủy.
18. Mock demo hoạt động mà không cần PHP/MySQL, không tuyên bố đây là bảo đảm đồng thời production.

## 14. Đối chiếu S2/S3: sai khác bắt buộc sửa (không phải thay đổi chính sách mới)

| Mã | Hiện trạng trong `web.md` / `Đồ án Web (3).md` | Chính sách chuẩn trong tài liệu này | Mức độ |
|---|---|---|---|
| D-01 | 16 bảng: `STUDIOS → ROOMS`, không có `ROOM_TYPES` | Có cấp Room Type phân biệt với nhãn `SPACE_TYPES` | **Critical** |
| D-02 | Booking enum chỉ `pending/confirmed/checked_in/completed/cancelled` | Thêm `awaiting_payment/expired/no_show`, định nghĩa lại `pending` | **Critical** |
| D-03 | `pending` được gộp chờ cọc và chờ Host; payment success bị hiểu là confirmed | Cọc `paid` ⇒ `pending`; chỉ Host duyệt ⇒ `confirmed` | **Critical** |
| D-04 | Deadline cọc mặc định/cố định 15 phút | Host chọn 15 phút–3 giờ, quy tắc đặt trước 24h + window | **Critical** |
| D-05 | `expires_at` được dùng trong API/logic nhưng thiếu ở từ điển `BOOKINGS` | Có dữ liệu deadline, processing grace và reconciliation | **High** |
| D-06 | Chỉ 16 bảng, không có refund attempts, strike, change request, policy snapshot, collection ledger | Bổ sung mô hình hoặc cấu trúc tương đương có thể truy vết | **Critical** |
| D-07 | Payment enum `pending/success/failed`, default `sandbox_qr` | Phân biệt payment statuses/attempts và không giả QR trong phase 1 | **High** |
| D-08 | `USERS.status = active/locked`; đăng nhập bị chặn khi locked | Booking suspension là cờ/nguồn trạng thái riêng; login vẫn dùng được | **High** |
| D-09 | Rates theo `room_id` riêng từng phòng; không có kế thừa theo loại phòng | Rate mặc định theo Room Type, Room Unit có override | **High** |
| D-10 | `ROOM_RATES.unit_minutes` dùng trong công thức API nhưng thiếu trong bảng dữ liệu | Có định nghĩa duration của session/combo; hợp nhất mô hình gói thuê | **High** |
| D-11 | `ROOMS.status` schema `available/maintenance` nhưng API tìm `active/inactive` | Chọn một enum nhất quán cho mã/domain/schema/API | **High** |
| D-12 | MySQL trigger đếm BOOKING conflict chỉ 3 trạng thái, bỏ qua đơn chờ cọc | Hold `awaiting_payment` hợp lệ phải chiếm lịch, xử lý concurrency theo transaction | **Critical** |
| D-13 | Thiếu các mốc Host 2h, reschedule 1 lần, check-in/out thực, no-show, overtime 30p | Các chính sách BP-15, BP-30–37 | **High** |
| D-14 | API mẫu `confirmed/rejected/expired` khác enum schema, thiếu cách ánh xạ từ `rejected` | Dùng `cancelled` + `cancellation_reason=host_rejected`, hoặc có state machine nhất quán | **High** |
| D-15 | `ROOM_RATES` nêu đơn vị tuần/tháng, trong khi v1 được chốt theo giờ/buổi/combo | Không tự mở rộng scope giai đoạn 1 nếu chưa duyệt | **Medium** |
| D-16 | Activity/Use Case có thể hiểu `paid deposit` là đã xác nhận chỗ | Chỉ xác nhận đã thanh toán/giữ tạm; Host chưa duyệt | **High** |
| D-17 | PHP/MySQL/Docker/VPS được trình bày như định hướng hạ tầng | Là bản thiết kế cũ, **chưa phải quyết định triển khai hiện tại** | **Medium** |
| D-18 | Tài liệu có UC đánh giá/phản hồi nhưng chính sách mới chưa duyệt chi tiết | Không tự triển khai review/rating giả; để backlog/phạm vi chờ duyệt | **Medium** |

**Kết luận chính sách:** Các quyết định BP-01 đến BP-39 là quy tắc nghiệp vụ ưu tiên áp dụng. BP-40 đến BP-44 là ràng buộc triển khai/thiết kế nhằm đảm bảo những chính sách ấy không bị vi phạm. Danh sách D-01 đến D-18 mô tả **độ lệch giữa tài liệu**, chưa phải bằng chứng code hoặc database hiện hành bị sai.

## 15. Không tự chốt thêm

**[CHƯA CHỐT]** Tiền phạt hư hỏng, thuế/hóa đơn, bồi thường thiết bị, quy tắc No-show ngoài mất cọc, quy trình hợp đồng/pháp lý, giá thuê vượt khung hoặc cơ chế xử lý sự cố bất khả kháng. Không tự phát minh thành nghĩa vụ thanh toán.

**[KIẾN NGHỊ]** Schema tương lai có thể bổ sung `ROOM_TYPES`, `STUDIO_POLICY_VERSIONS`, `BOOKING_POLICY_SNAPSHOTS`, `BOOKING_CHANGE_REQUESTS`, `PAYMENT_ATTEMPTS`, `REFUNDS`, `REFUND_ATTEMPTS`, `STRIKE_EVENTS`, `BOOKING_RESTRICTIONS`, `COLLECTIONS/LEDGER_ENTRIES`, `BOOKING_STATUS_HISTORY`, `HOST_APPLICATIONS` cùng các index/khóa ngoại phù hợp. Danh sách bảng chỉ là đề xuất thiết kế kỹ thuật; có thể dùng cấu trúc tương đương miễn bảo toàn nghiệp vụ, lịch sử và tính nhất quán.

---

*Hết Business Policy v1.1.*
