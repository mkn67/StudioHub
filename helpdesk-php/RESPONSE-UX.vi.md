# UX câu trả lời và liên hệ Studio

## Kết quả khảo sát

- `client/src/features/helpdesk/components/ChatMessage.tsx` trước đây bọc mọi câu trả lời trong một `<p>`. Markdown trong câu trả lời/lịch sử vì vậy chỉ hiện như văn bản.
- `get_room_facts` trả nội dung do API dựng sẵn. Agent chỉ chọn `kind: room_facts`; mô hình không tự viết lại nội dung. Dữ liệu này có các dòng thông tin, nhưng chưa có tiêu đề/danh sách Markdown. Chỉ sửa system prompt không đủ.
- `NineRouterClient` dùng JSON và tool calling; `CitationBuilder` kiểm tra nguyên văn các đoạn đã duyệt. Hai cơ chế này được giữ nguyên.
- Widget gửi `scope: catalog`, kèm `roomId` từ đường dẫn. Agent xác minh phòng bằng API công khai, lưu lựa chọn và danh sách ứng viên qua các lượt.
- API `GET /rooms/{id}` kiểm tra phòng/Studio đang hoạt động. `studio.phone` lấy từ trường kinh doanh `studios.phone`. Payload cũng có `host_email` và `host_phone`; Helpdesk tuyệt đối không đưa hai trường này vào tool liên hệ.
- Chưa có trường email kinh doanh công khai đã được xác nhận trong API này. Không được suy luận rằng email Host là email công khai.
- Luồng catalog trước đây trả lời chung chung khi không đủ dữ liệu và không hỗ trợ liên hệ Studio. Module còn có ticket/handoff cũ ngoài catalog; tính năng mới không xây inbox, tạo ticket hoặc chuyển trạng thái hội thoại.

## Markdown và launcher

`AssistantMarkdown.tsx` dùng `react-markdown` 10.1.0. Đã kiểm tra metadata dependency trước khi cài: bộ phân tích unified/remark, chuyển AST sang React, các thư viện tiện ích và kiểu dữ liệu; không thêm plugin HTML, GFM, ảnh hay syntax highlighting. Lockfile ghi lại dependency và dependency gián tiếp (79 package được thêm khi cài).

Tham khảo thiết kế và bảo mật: https://github.com/remarkjs/react-markdown

Renderer dùng `skipHtml`, danh sách tag cho phép, không dùng `dangerouslySetInnerHTML`. Chỉ cho link HTTPS không có thông tin đăng nhập hoặc đường dẫn nội bộ an toàn qua `safeHelpdeskHref`. Chặn `javascript:`, `data:`, link protocol-relative, ảnh, iframe và HTML thô. `tel:`/`mailto:` chỉ xuất hiện ở khối liên hệ có hợp đồng dữ liệu riêng, không chấp nhận từ Markdown của mô hình.

Typography nằm trong `.markdown` của `client/src/features/helpdesk/styles/helpdesk.module.css`: chữ 14px, line-height 1.55, heading 16px, đoạn cách 8px, list thụt 19px, link cyan gạch chân. `overflow-wrap:anywhere` và nội dung không có vùng cuộn riêng giúp tên/URL dài không tràn. Bubble người dùng giữ nguyên.

`RoomSummary.php` nhóm các dòng của projection API đã có thành **Thông tin cơ bản**, **Giá thuê tham khảo**, **Tiện ích nổi bật**, **Lưu ý**, giữ nguyên điều kiện chính sách và escape cú pháp trong dữ liệu. Chỉ xử lý định dạng projection phòng đã biết; văn bản khác giữ nguyên. Liên kết `/rooms/{id}` lấy từ ID đã có bằng chứng. Nếu thêm định dạng vượt 4.000 ký tự, giữ nguyên nội dung nguồn để không cắt điều kiện. Prompt tiếp tục yêu cầu tool `rates` cho câu hỏi chỉ về giá.

Badge **Hỗ trợ** và accessible name **Mở hỗ trợ StudioHub** nằm trong `HelpdeskWidget.tsx`. CSS tăng padding và nâng badge lên để không đè icon, giữ màu và viền hiện tại, tính safe-area ở cạnh phải/dưới. Không thêm launcher thứ hai. Hai sửa đổi nội dung có sẵn trong working tree của widget được giữ lại.

### Câu trả lời riêng về giá

`AgentOrchestrator::formatRates` tách từng gói thành giá in đậm và danh sách điều kiện. Tên phòng chỉ hiện một lần cho mỗi kết quả phòng; tiền dùng dấu phân cách hàng nghìn (`850.000 ₫ / buổi`), 180/240 phút hiển thị thành 3/4 giờ. Giữ giới hạn số đơn vị thuê và ngày hiệu lực theo dạng ngày/tháng/năm. Không hiển thị mã giá nội bộ hoặc timestamp kiểm tra ISO; chúng vẫn có trong dữ liệu tool cho xử lý nghiệp vụ. Ghi chú giá tham khảo/chưa kiểm tra lịch trống xuất hiện một lần cuối câu trả lời.

Kiểm thử bổ sung tái hiện hai gói Zenith Live Commerce trong ảnh phản hồi của người dùng: PHP đạt 89/89. Các kiểm thử giá cũ được cập nhật theo định dạng mới trong `tests/harness.php` và `tests/readonly-tools.php`. Thay đổi áp dụng cho câu trả lời mới; không viết lại tin nhắn đã lưu trong lịch sử.

## Hợp đồng fallback

Phản hồi giữ nguyên `text`, `state`, `sources`, cards và cơ chế lưu lịch sử; chỉ bổ sung `contactFallback`:

```json
{
  "reason": "explicit_contact_request",
  "status": "missing",
  "studioId": 3,
  "studioName": "Tên Studio từ API",
  "roomId": 12,
  "publicPhone": null,
  "publicEmail": null
}
```

Đây là mô tả trường, không phải dữ liệu liên hệ thật. `available` yêu cầu ít nhất một phương thức hợp lệ; nếu cả hai null thì trạng thái phải là `missing`. `ambiguous` yêu cầu tất cả trường nhận diện/liên hệ null. Adapter frontend kiểm tra các ràng buộc này, ID nguyên dương, phone chuẩn hóa 8–15 chữ số và email không chứa query/header/control character. Khi tool liên hệ thành công, orchestrator trả ngay dữ liệu do server dựng, không gọi mô hình thêm hoặc cho tool sau đó đổi lựa chọn phòng.

`get_studio_public_contact` chỉ nhận tùy chọn `conflictingChunkIds` tham chiếu bằng chứng RAG; không nhận Room/Studio/Host ID, phone/email hoặc endpoint. Mô hình nhận lại trạng thái, không nhận bản ghi Host. Server tự dựng câu trả lời và dữ liệu liên hệ.

Điều kiện cho phép tool:

1. Có yêu cầu liên hệ/gặp người hỗ trợ trong tin nhắn. Bộ nhận diện hỗ trợ tiếng Việt có/không dấu và kiểm tra một số cách phủ định.
2. Hoặc có bằng chứng từ tool: đã tìm knowledge nhưng không có đoạn được duyệt, facts báo thiếu trường, hoặc bảng giá rỗng.
3. Với nguồn mâu thuẫn: mô hình chỉ ra 2–3 chunk ID thực sự đã truy xuất. Server kiểm tra ID tồn tại trong bằng chứng đã duyệt của lượt hiện tại, không trùng nhau và nội dung khác nhau. Sau đó chỉ từ chối trả lời và cung cấp liên hệ, không tự kết luận chính sách nào đúng.

Server không dùng keyword để quyết định câu trả lời có căn cứ. Một câu `unsupported` của mô hình, nếu chưa có kết quả truy xuất xác nhận thiếu dữ liệu, không tự đủ điều kiện cho fallback. Trong catalog, câu trả lời unavailable có bằng chứng thiếu dữ liệu được chuyển sang fallback; yêu cầu liên hệ rõ ràng cũng được xử lý nếu mô hình bỏ qua tool. Câu trả lời bình thường vẫn giữ luồng hiện tại. Với summary có các trường tùy chọn bị thiếu, agent chỉ nên gọi fallback khi phần thiếu liên quan câu hỏi, không vì mọi trường tùy chọn đều phải có.

Xác định Studio:

- Lựa chọn unique từ `resolve_room` cho tên được hỏi ưu tiên hơn trang đang xem.
- Các facts/rates của đúng một phòng trong lượt hiện tại, phòng đang xem đã xác minh, rồi phòng được chọn trước đó cung cấp ngữ cảnh.
- Nhiều ứng viên/phòng, lựa chọn chưa rõ, hoặc tìm tên khác thất bại: hỏi chọn phòng; không quay về Studio của trang cũ.
- Nếu API xác minh phòng hiện tại thất bại, không dùng phòng cũ trong lịch sử để lấy liên hệ.
- Cuối cùng đọc lại `/rooms/{id}` và đối chiếu `room_id`, `studio_id`, `studio.studio_id`; không tin ID do mô hình ghi trong câu trả lời cuối.

Phone được chuẩn hóa từ **duy nhất** `studio.phone`. Email production hiện luôn null. Không phân tích contact từ văn bản RAG, mô tả phòng hoặc nội dung do mô hình viết. Dữ liệu thiếu/không hợp lệ bị bỏ qua. Không có liên hệ thì thông báo rõ và cung cấp trang phòng đã xác minh. Chưa xác định Studio thì hỏi người dùng, không dùng liên hệ toàn cục.

Frontend hiển thị khối gọn trong message, có icon điện thoại/email, link `tel:`/`mailto:` và trang phòng. Citation vẫn nằm ở khu vực nguồn hiện tại. Không thêm analytics hoặc log chứa contact. Lịch sử lưu cùng response theo cơ chế cũ và chịu kiểm tra quyền hội thoại hiện có.

Lỗi provider/API không được chuyển thành câu trả lời thành công. Fallback không đặt `human_handoff`, không khóa composer, không tạo ticket, queue, assignment hoặc hứa gọi lại. `/handoff` trong catalog trả contact fallback. Các endpoint quản trị/ticket/handoff cũ ngoài widget catalog được giữ để không phá kiến trúc hiện có.

## Giới hạn và cách mở rộng

- **API blocker:** chưa có nguồn email Studio được công bố là liên hệ kinh doanh. Muốn bật email cần chủ sở hữu backend cung cấp hợp đồng công khai rõ ràng; sau đó mở rộng whitelist ở `PublicCatalog::publicContact`, thêm kiểm thử server. Không dùng `host_email` thay thế. Frontend đã kiểm thử phone-only, email-only, cả hai và cả hai thiếu bằng fixture.
- Kiểm tra conflict xác minh nguồn thực tế và nội dung khác nhau, không chứng minh hai đoạn mâu thuẫn về ngữ nghĩa. Mô hình nhận diện khả năng mâu thuẫn; server yêu cầu bằng chứng trước khi cho phép từ chối thận trọng. Không khẳng định tự động phát hiện mọi mâu thuẫn hoặc chọn được nguồn có thẩm quyền. Có thể mở rộng bằng metadata hiệu lực/ưu tiên nguồn do chủ sở hữu tri thức xác định.
- Nhận diện cách nói yêu cầu liên hệ không bao phủ mọi biến thể ngôn ngữ. Chọn Studio vẫn dựa trên công cụ phân giải hiện có và kiểm tra phía server; không thêm hệ thống NLU hay cơ sở dữ liệu liên hệ thứ hai.
- Không sửa `server/`, schema, migration, booking/payment, authentication hoặc adapter 9Router. Không commit, push hoặc deploy.

## Kiểm thử

Các tệp thay đổi/thêm cho tính năng (đường dẫn tương đối từ repository):

- `client/package.json`, `client/package-lock.json`
- `client/src/features/helpdesk/components/AssistantMarkdown.tsx`
- `client/src/features/helpdesk/components/ChatMessage.tsx`
- `client/src/features/helpdesk/components/HelpdeskWidget.tsx`
- `client/src/features/helpdesk/styles/helpdesk.module.css`
- `client/src/features/helpdesk/types/helpdesk.types.ts`
- `client/src/features/helpdesk/services/phpHelpdeskAdapter.ts`
- `client/src/features/helpdesk/tests/responseUx.test.ts`
- `client/src/features/helpdesk/tests/response-ux-browser-qa.mjs`
- `helpdesk-php/config/system-prompt.txt`
- `helpdesk-php/src/Agents/AgentService.php`
- `helpdesk-php/src/Agents/AgentOrchestrator.php`
- `helpdesk-php/src/Agents/RoomSummary.php`
- `helpdesk-php/src/Agents/StudioContactFallback.php`
- `helpdesk-php/src/Tools/PublicCatalog.php`
- `helpdesk-php/tests/run.php`, `helpdesk-php/tests/contact-ux.php`
- `helpdesk-php/RESPONSE-UX.vi.md`

`.gitignore` đã có chỉnh sửa trước khi thực hiện và không bị sửa trong tác vụ này.

- `npm test` trong `client`: 222/222 đạt, gồm 5 test UX mới; kiểm thử Markdown, link, HTML injection, nội dung dài và hợp đồng liên hệ.
- `npm run typecheck` và ESLint phạm vi `src/features/helpdesk`: đạt.
- `helpdesk-php/bin/php.cmd helpdesk-php/tests/run.php`: 88/88 đạt; gồm 7 test mới về dữ liệu công khai, quan hệ Room–Studio, ngữ cảnh mơ hồ, thiếu phone/email, bằng chứng, history, lỗi provider và định dạng summary. Bộ cũ tiếp tục kiểm tra RAG/citations, quyền, tool, booking và history. PHP 8.5 báo hai deprecation PDO SSL có sẵn; không sửa persistence ngoài phạm vi.
- `HELPDESK_QA_URL=http://127.0.0.1:3001 node src/features/helpdesk/tests/response-ux-browser-qa.mjs`: 2/2 kịch bản, chiều rộng 390 và 1440px. Có kiểm tra badge không đè icon/không ra ngoài màn hình, Markdown, XSS, URL dài, cuối tin nhắn nằm trên composer, contact links, khôi phục history/citation và lỗi provider. Không có page error. Đã xem ảnh mobile contact và desktop Markdown.
- Ảnh nằm trong `client/.impeccable/review/helpdesk-response/`. Browser dùng fixture HTTP cho session/catalog/agent, không phải kiểm thử nhà cung cấp AI thật hay gửi liên hệ thật.
- `npm audit --omit=dev`: 0 lỗ hổng production tại thời điểm chạy. Không chạy cập nhật dependency ngoài yêu cầu.

Node test và Chromium cần chạy ngoài sandbox do môi trường Windows hạn chế user-info/process. Cổng 3000 có ứng dụng cũ; phiên dev riêng dùng 3001. Các lỗi fixture/thử nghiệm ban đầu đã được sửa trước lượt kiểm tra đạt.
