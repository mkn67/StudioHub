# Host: thao tác ngừng hoạt động và hồ sơ hợp đồng

Ngày 04/11/2026. Chỉnh sửa trên workspace hiện có, không thiết kế lại shell hoặc thay đổi nghiệp vụ backend.

## Thiết bị và bảng giá

Không có DELETE trong API. Cả hai tài nguyên có PATCH status=inactive, nên dùng nhãn **Ngừng cung cấp** (thiết bị) và **Ngừng áp dụng** (giá), thay vì gọi deactivation là xóa vĩnh viễn. Mô tả bảng và hộp xác nhận ghi rõ giới hạn này.

Các hàng vẫn có nút sửa, thêm thao tác mới cùng hàng với viền Ink, nền trắng, chữ cảnh báo và coral khi hover. Tên truy cập gồm tên thiết bị hoặc đơn vị thuê/phòng thật. Bảng giữ cấu trúc, cột giá, thời lượng, giới hạn, hiệu lực và vùng cuộn ngang nội bộ.

`HostRetirementDialog` dùng lại `Modal` native dialog hiện có cho focus trap, Escape, trả focus, backdrop, scroll/body lock và animation theo reduced motion. Bản ghi thiết bị hiển thị tên thật; bảng giá hiển thị phòng, đơn vị, giá, phút và giới hạn thật. Có Hủy và nút xác nhận đúng thao tác. Khi đang gửi, khóa nút, chặn gửi trùng, không cho đóng qua Escape/backdrop; lỗi giữ modal mở và có thông báo tiếng Việt. Nếu mạng lỗi, không khẳng định chắc chắn server chưa xử lý.

Request chỉ chứa `{status:"inactive"}` tới đúng equipment ID hoặc cặp room ID/rate ID. Helper từ chối ID không hợp lệ. Không gửi giá/tồn kho, không dùng DELETE, không sửa mảng cục bộ hoặc ẩn dòng để giả thành công. Sau phản hồi thành công thật mới đóng, thông báo và reload GET danh sách. Giữ search/Studio/phòng/trang danh mục hiện tại.

Giới hạn: GET hiện chỉ trả active, chưa có danh sách khôi phục. Không tự đặt luật ngừng cung cấp khi có đơn đang dùng hoặc bắt buộc còn một bảng giá. Các FK booking dùng RESTRICT và dữ liệu giá lịch sử có snapshot; PATCH chỉ đổi status theo source. Không sửa booking, hóa đơn, payment/refund hoặc cách tính giá/tồn kho. Chưa thực hiện mutation thành công thật để chứng minh DB sau ghi vì yêu cầu cấm đổi records.

## Cài đặt Host

Thứ tự: summary tài khoản thật → thông tin tài khoản → pháp lý → hợp đồng → giao diện làm việc → thao tác tài khoản.

- Giữ nguyên tên/điện thoại và API profile hiện có, email readonly, pending/lỗi/draft và switch compact/reduce motion.
- Thêm ngày sinh disabled, nêu rõ chưa hỗ trợ lưu. Không gửi trường này trong PATCH.
- Phần **Thông tin pháp lý & hợp đồng** trình bày hai nhóm cá nhân và doanh nghiệp/tổ chức, mô tả trường dự kiến, không có lựa chọn hoặc form giả có thể submit.
- Không lấy tên hiển thị/email/địa chỉ Studio làm hồ sơ pháp lý đã xác minh. Chưa có legal entity, mã số thuế, người đại diện, CCCD, bank hoặc contract record trong backend.
- Không thu thập định danh, không lưu dữ liệu nhạy cảm vào storage, không thêm gate cho thuê hoặc thay trạng thái Host.
- Admin dùng `WorkspaceSettings` như trước, không truyền slot mở rộng và không có mục pháp lý/hợp đồng/ngày sinh mới. Shared component chỉ được thêm props tùy chọn để Host tái sử dụng form và preferences.

Desktop dùng trường tài khoản hai cột; mobile một cột. Legal profile chia hai nhóm trong một panel, stack khi hẹp. Các style mới scope theo class Host/nhóm mở rộng, không thay palette/font hoặc token global.

## Xem trước hợp đồng

Panel **Hợp đồng hợp tác StudioHub** có thumbnail, tên tài liệu, ghi chú và nút **Xem hợp đồng**. Nhãn **Chưa có dữ liệu hợp đồng** độc lập trạng thái active của tài khoản.

Asset `client/public/images/contract-preview-placeholder.svg` là SVG A4 local, ghi “MẪU HỢP ĐỒNG — MINH HỌA”, không có chữ ký, dấu, ngày hiệu lực, mã hợp đồng hoặc dữ liệu cá nhân giả. Không tải ảnh bên ngoài hoặc upload mẫu lên backend.

`ContractPreview` là component nhận typed source/metadata. Modal desktop tối đa 960px, mobile gần toàn màn hình; giữ tỷ lệ ảnh, có vùng cuộn có nhãn, mức zoom 100–200% theo bước 25%, nút đóng và Escape. 100% vừa chiều rộng; phóng to dùng cuộn ngang bên trong viewport, không kéo tràn trang. Có thông báo nếu ảnh không tải được.

Nguồn tập trung ở `illustrativeContract` trong `client/src/features/host/contract-preview.tsx`, dùng chung cho thumbnail/modal. Khi thay tài liệu thật, cần adapter API có quyền cung cấp URL ngắn hạn hoặc Blob đã xác thực và metadata; không đưa hợp đồng riêng tư vào public assets. Xem audit để biết phần adapter/backend chưa triển khai. Component không có thao tác ký, xác nhận đã ký hoặc phê duyệt.

## Danh sách file của nhiệm vụ

| File | Thay đổi |
|---|---|
| `client/src/features/host/host-resources.tsx` | Nút ngừng cung cấp/áp dụng, selection xác nhận, reload sau thành công |
| `client/src/features/host/host-retirement.ts` | Target type, kiểm tra ID, request chỉ đổi status |
| `client/src/features/host/host-retirement-dialog.tsx` | Nút thao tác và modal dùng chung cho hai tài nguyên |
| `client/src/features/host/host-workspace.tsx` | Settings dùng wrapper HostSettings |
| `client/src/features/host/host-settings.tsx` | Ngày sinh chưa hỗ trợ, nhóm pháp lý, gắn panel hợp đồng |
| `client/src/features/host/contract-preview.tsx` | Config nguồn tập trung, panel, modal ảnh và zoom |
| `client/src/features/host/host-contract.css` | Style scope cho thao tác, legal và preview responsive |
| `client/src/features/workspace/workspace-settings.tsx` | Slot tùy chọn extraAccountFields/afterAccount; Admin mặc định giữ nguyên |
| `client/public/images/contract-preview-placeholder.svg` | Tài liệu A4 minh họa local |
| `client/src/services/api/host-retirement.test.ts` | ID bất hợp lệ, whitelist request và giữ nguyên giá |
| `client/scripts/host-contract-delete-qa.mjs` | QA trình duyệt với API thật, chặn mutations trước server |
| `docs/host/HOST_CONTRACT_AND_DELETE_API_GAPS.md` | Audit, status, đề xuất API và quyết định nghiệp vụ còn thiếu |
| `docs/host/HOST_CONTRACT_AND_DELETE_IMPLEMENTATION_REPORT.md` | Báo cáo này |

## Kiểm chứng thực tế

- `npm.cmd test`: **152/152** đạt, gồm 2 test mới cho status/ID và không gửi giá hoặc quantity.
- `npm.cmd run lint`: đạt.
- `npm.cmd run typecheck`: đạt.
- `npm.cmd run build`: production build đạt.
- `node scripts/host-contract-delete-qa.mjs`: đạt, dùng login/GET API thật; không có phản hồi mutation thành công giả.
- **360, 390, 768, 1024, 1440px**: các bảng/Settings không làm tràn trang; hai loại confirmation mở/hủy được ở mọi kích thước, nút xác nhận hiển thị và modal scroll được.
- Nút sửa thiết bị/bảng giá mở đúng record, search được giữ sau hủy/lỗi. Đúng ID/cặp ID và `{status:inactive}`; pending disable, submit lặp chỉ một request, Escape khi pending không đóng; lỗi không xóa hàng hoặc báo thành công.
- Profile Host hiển thị đúng dữ liệu thật, email readonly, ngày sinh disabled; request tài khoản chỉ có fullname/phone, lỗi giữ draft. Switch hoạt động và còn sau refresh; localStorage chỉ có compact/reduceMotion trong namespace hiện có.
- Preview SVG tải được, nhận diện minh họa, zoom 100/125%, đóng bằng nút/Escape trả focus, thumbnail cũng mở được, Tab vẫn trong modal; không upload hoặc tạo record hợp đồng.
- Smoke test Host overview/studios/rooms/calendar/bookings/reports/policies; Admin Settings không có extension Host; Customer Profile vẫn render form riêng. Không có lỗi JavaScript chưa xử lý trong lượt QA đạt.
- Đã mở ảnh render thật: Equipment/Pricing desktop, hai loại confirmation, Host Settings desktop/mobile, preview desktop/mobile. Artifact local tại `client/test-results/host-contract-delete/` (ignored), không publish.

Giới hạn kiểm chứng: không gửi PATCH thật, không ghi rồi restore, không thử DELETE. Vì vậy đường success/reload sau ghi và lỗi phân quyền write mới được kiểm tra source, chưa xác nhận end-to-end. Không khẳng định kiểm tra mọi nghiệp vụ booking, full screen reader hoặc thiết bị cảm ứng vật lý. `QA_VIEWPORTS=1440` có thể dùng để chạy nhanh; mặc định script chạy đầy đủ năm kích thước.

## Xác nhận phạm vi

Snapshot 242 file PHP/Helpdesk, Customer/Admin/Helpdesk frontend và auth/API client trước khi chỉnh sửa: không thay đổi hash. Không sửa backend contract, schema, migration, pricing/inventory/payment/refund/auth business logic. Chỉ thêm slot frontend dùng chung; không thay giao diện Admin mặc định.

Checksum toàn bộ bảng MySQL được ghi nhận bằng lệnh chỉ đọc trước QA và so sánh lại sau QA: **giống nhau**. Mọi request ghi tài nguyên của script bị chặn trước khi tới server; login/logout hiện có không ghi DB theo source. Không commit, push hoặc deploy.
