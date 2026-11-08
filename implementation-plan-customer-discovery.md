# Kế hoạch triển khai: Khám phá phòng cho khách thuê

## Mục tiêu

Giúp khách nhanh chóng nhận ra phòng nào phù hợp với dự án của họ, so sánh được các lựa chọn và đi đến trang đặt lịch dễ dàng hơn. Giữ nguyên nhận diện StudioHub hiện tại, ảnh studio thật, các pictogram danh mục và luồng đặt thuê. Chỉ thay đổi khu khách; không đổi khu host/admin.

## Hiện trạng đã rà soát

- Trang danh sách đã có tên phòng, ảnh, studio/khu vực, loại không gian, diện tích, sức chứa, tiện ích, giá và đánh giá khi có dữ liệu.
- Chip hiện tại chủ yếu cho biết bộ lọc đã áp dụng và cho phép xóa chip đó. Chưa có dải chip lọc nhanh để áp dụng loại phòng phổ biến bằng một lần bấm.
- Trang chủ có danh mục theo loại không gian, nhưng thẻ phòng nổi bật chưa đưa sao/đánh giá lên thẻ.
- API hiện trả `review_summary`, `amenities`, `display_rate` và `space_types`; bộ tìm kiếm đã nhận `space_type_id`, `amenity_id` và các bộ lọc khác. Không cần migration hoặc thay đổi API cho kế hoạch này.
- API tìm kiếm hiện được mô tả theo một `space_type_id`; chưa giả định nó hỗ trợ lọc OR nhiều loại không gian.
- Nếu trang chạy bằng dữ liệu demo, nội dung phải tiếp tục được đánh dấu rõ là minh họa; không trình bày phòng demo như phòng có thể thuê thật.

## Phạm vi

1. Chuẩn hóa thẻ phòng dùng trên trang chủ và trang danh sách.
2. Thêm lối tắt lọc theo mục đích/loại không gian.
3. Bổ sung khối gợi ý phòng theo mục đích trên trang chủ.

Không làm bản đồ, yêu thích đồng bộ tài khoản, so sánh nhiều phòng, điểm xếp hạng giả, hay thay đổi chính sách đặt/hủy. Không thêm analytics trong đợt này.

## Giai đoạn 1 — Thẻ phòng thống nhất

**Kết quả:** Thẻ trang chủ và danh sách cùng cách trình bày, giúp khách quét nhanh ảnh, tên riêng, đánh giá, giá và tiện ích.

**Thực hiện**

- Tạo adapter/view model để chuẩn hóa `ApiRoom` và dữ liệu demo thành một kiểu dữ liệu trình bày thống nhất.
- Tạo component thẻ chỉ nhận view model và callback/link props; component không fetch dữ liệu, xử lý nghiệp vụ hay tự suy luận chính sách.
- Tái sử dụng cho kết quả API ở `BackendSearchResults` và khu phòng nổi bật ở `Home`.
- Hiển thị tên phòng, khu vực, loại không gian, sao và số lượt đánh giá (chỉ khi có đánh giá đã công bố), giá/đơn vị, tối đa ba tiện ích.
- Giá luôn kèm đơn vị và thời lượng nếu có. Với nhiều mức giá, chỉ dùng giá được backend xác định là giá hiển thị/giá khởi điểm và ghi rõ điều kiện; không tự tính từ dữ liệu không đủ. Nếu API chưa có tên gói, không tự đặt tên gói.
- Giữ nhãn demo trên dữ liệu minh họa; không cho dữ liệu demo xuất hiện như inventory thật trong chế độ API/production.
- Bọc thẻ bằng Next.js `Link` hoặc thẻ liên kết phù hợp để hỗ trợ bàn phím, trình đọc màn hình và mở liên kết.
- Giữ chiều cao ảnh cố định và fallback ảnh khi lỗi. Có skeleton khi tải, thông báo lỗi cùng nút thử lại, và trạng thái rỗng để tránh layout nhảy hoặc thẻ vỡ.

**Tệp dự kiến**

- `client/src/features/marketplace/components/RoomListingCard.tsx` (mới)
- `client/src/components/marketplace.tsx`
- `client/src/features/marketplace/backend-pages.tsx`
- `client/src/app/globals.css` hoặc stylesheet marketplace chuyên biệt

**Điều kiện hoàn tất**

- Trang chủ và danh sách dùng cùng thứ bậc thông tin và trạng thái hover/focus.
- Không hiện sao hoặc số đánh giá tự đặt khi `review_count = 0` hoặc thiếu dữ liệu.
- Giá theo giờ/buổi/ngày hiển thị đúng đơn vị và thời lượng; không ngụ ý mọi giá đều theo giờ hoặc đặt tên gói không có trong dữ liệu.
- Khi ảnh lỗi, fallback giữ nguyên kích thước khung. Khi API lỗi có thể thử tải lại; khi đang tải thẻ giữ không gian ổn định.
- View model bao phủ cả dữ liệu API và demo; chế độ demo vẫn có nhãn minh họa.

## Giai đoạn 2 — Chip lọc nhanh

**Kết quả:** Khách có thể áp dụng một số nhu cầu phổ biến ngay trên trang danh sách mà không mở toàn bộ bộ lọc.

**Thực hiện**

- Thêm dải chip “Tìm không gian phù hợp” gần số lượng kết quả; chip có thể là lối tắt theo mục đích nhưng cần ghi rõ mục đích khác loại phòng.
- Lấy loại không gian từ `space_types` tại runtime; không hard-code numeric ID. Nếu cần mapping sản phẩm, dùng mã định danh ổn định nếu API có. Nếu hiện chưa có mã ổn định, nhóm sản phẩm duy trì mapping tên/mã chuẩn và resolve về danh mục runtime; không suy luận mapping tự động.
- Một mục đích có thể ứng với nhiều loại phòng. Khi API chỉ hỗ trợ một `space_type_id`, lối tắt nhiều loại sẽ mở lựa chọn loại phòng để khách chọn tiếp; chỉ gửi OR nhiều ID sau khi hợp đồng API xác nhận hỗ trợ.
- Bấm chip sẽ cập nhật `space_type_id`, đặt `page=1`, giữ nguyên các điều kiện đang lọc khác và đồng bộ URL.
- Chip đang chọn thể hiện trạng thái rõ, dùng `aria-pressed`; chip “Tất cả” xóa riêng điều kiện loại không gian.
- Trên mobile, cho phép cuộn ngang bằng thao tác chạm; không làm tràn trang. Trên desktop, cho chip tự xuống dòng.
- Giữ chip bộ lọc đang áp dụng hiện có để người dùng xem/xóa từng điều kiện.

**Tệp dự kiến**

- `client/src/features/marketplace/backend-pages.tsx`
- `client/src/services/api/room-search.ts` (chỉ sửa nếu cần bổ sung serialize/parse; ưu tiên dùng hợp đồng sẵn có)
- `client/src/app/explore.css`

**Điều kiện hoàn tất**

- Lọc nhanh và bộ lọc đầy đủ luôn cho cùng kết quả với cùng query string.
- Chuyển chip không làm mất quận, ngày/giờ, giá, tiện ích hoặc sắp xếp đang chọn.
- Nút Back/Forward của trình duyệt khôi phục được lựa chọn chip và kết quả tương ứng.
- Mapping mục đích → loại phòng được nhóm xác nhận, có nhãn giải thích khi khách cần chọn giữa nhiều loại; không dựa vào phỏng đoán của AI/giao diện.

## Giai đoạn 3 — Gợi ý theo mục đích trên trang chủ

**Kết quả:** Trang chủ giúp khách bắt đầu từ việc họ định làm thay vì phải biết trước tên loại phòng.

**Thực hiện**

- Dùng tiêu đề “Bạn đang tìm không gian cho mục đích gì?” với ba đến bốn mục đích đã được nhóm sản phẩm xác nhận, ví dụ chụp ảnh sản phẩm, podcast/livestream, thu âm nhạc, workshop/sự kiện.
- Mỗi mục đích có mô tả lợi ích cần thiết (ánh sáng/phông nền; micro/camera; cách âm/thiết bị; sức chứa/bố trí) và dùng pictogram StudioHub cùng ảnh phòng thật khi có.
- Duy trì mapping mục đích → một hoặc nhiều loại không gian trong cấu hình sản phẩm có kiểm soát. Không xem tên mục đích là đồng nghĩa tên loại phòng.
- Mục đích chỉ ánh xạ một loại thì mở `/rooms` với query đó. Nếu ánh xạ nhiều loại, mở lựa chọn loại phòng hoặc trang kết quả có bước chọn tiếp; không giả định API hỗ trợ OR nhiều ID.
- Dùng pictogram hiện tại và ảnh phòng thật ở phần gợi ý nổi bật; không dùng ảnh minh họa để giả làm phòng còn trống.
- Khối phòng nổi bật tiếp tục lấy từ API hiện tại và dùng thẻ thống nhất ở Giai đoạn 1.

**Tệp dự kiến**

- `client/src/components/marketplace.tsx`
- `client/src/components/studio-category-illustration.tsx` (chỉ khi cần tái sử dụng pictogram)
- `client/src/app/editorial.css` hoặc stylesheet marketplace chuyên biệt

**Điều kiện hoàn tất**

- Mỗi lối tắt đi đến trang kết quả có thể chia sẻ bằng URL.
- Nếu danh mục hoặc phòng chưa tải, trang vẫn dùng được và không tạo liên kết sai.
- Không lặp lại toàn bộ danh mục dài; khối mới ưu tiên nhu cầu phổ biến và dẫn đến toàn bộ danh mục.
- Các mô tả mục đích phản ánh loại phòng/thiết bị có thật trong danh mục; nhóm sản phẩm duyệt mapping trước khi triển khai.

## Thứ tự và phụ thuộc

1. **Giai đoạn 1:** tạo nền cho thẻ dùng chung và hiển thị đánh giá nhất quán.
2. **Giai đoạn 2:** dùng lại dữ liệu loại không gian và quy tắc URL hiện có để làm chip.
3. **Giai đoạn 3:** nối các mục đích phổ biến vào chip/query đã ổn định.

Mỗi giai đoạn giữ ứng dụng chạy được và không thay đổi schema database hay API. Nếu giai đoạn 1 phát hiện thiếu dữ liệu thực tế, ghi rõ trạng thái trống thay vì tạo dữ liệu mẫu gây hiểu nhầm.

## Kiểm tra khi triển khai

- Chạy typecheck và build frontend trong container Compose đang dùng.
- Kiểm tra thủ công ở 360, 390, 768, 1024 và 1440px; thẻ không méo hoặc quá chật ở 360–390px.
- Kiểm tra đánh giá có/không có dữ liệu; giờ/buổi/ngày; nhiều mức giá; demo có nhãn; kết quả rỗng; skeleton; API lỗi/thử lại; ảnh lỗi/fallback.
- Kiểm tra query string khi thêm chip, giữ điều kiện cũ, refresh, Back và Forward.
- Kiểm tra bàn phím, focus nhìn thấy được, `aria-pressed`, nhãn ảnh, liên kết thật và cỡ vùng bấm tối thiểu 44px.
- Xác nhận host/admin, checkout, giá và hành vi tạo đơn không bị ảnh hưởng.

## Đo lường

Không thêm analytics trong đợt này. Nếu hiện hệ thống chưa ghi lượt nhấp thẻ, lựa chọn chip và bước chuyển sang đặt lịch thì sau phát hành chưa thể tính chính xác conversion hoặc mức sử dụng chip. Chỉ báo cáo các chỉ số đã có sẵn; việc bổ sung tracking cần thành phạm vi được duyệt riêng, không mặc định gắn vào kế hoạch này.
