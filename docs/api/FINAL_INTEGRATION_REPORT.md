# Báo cáo hoàn tất tích hợp frontend — 05/11/2026

## 1. Tổng quan

Đã triển khai frontend sử dụng API PHP hiện có; chưa nghiệm thu hệ thống với PHP/MySQL thật. Các số đếm đo những việc khác nhau:

| Phép đo | Kết quả |
|---|---|
| Route/handler đã đối chiếu trong danh sách | 80/80 |
| Frontend consumer trực tiếp theo source | 79/80 |
| Chức năng được dùng gián tiếp | 1/80: bảng giá công khai trong GET chi tiết phòng |
| Thao tác từng bị đánh dấu thiếu, nay nối REST trực tiếp | 44 |
| Các thao tác còn lại được giữ/điều chỉnh contract | 36 |
| Thao tác xuất hiện trong browser fixture của lượt này | 79/80 |
| VERIFIED_HTTP trên PHP thật | 0/80 |
| VERIFIED_DATABASE_PERSISTENCE | 0/80 |
| Chưa thể nghiệm thu PHP/DB do môi trường | 80/80; không đồng nghĩa 80 API bị lỗi |

Không tìm thấy StudioHub_API_INVENTORY_UPDATED.md trong repository; dùng API_LIST_RECHECK_2026-11-05.md và router/controller/service hiện tại. Không tạo endpoint backend mới. Các adapter workspace/commands cũ được giữ cho connected mode riêng; luồng REST dùng endpoint cụ thể và không gọi mutation trùng.

## 2. Customer

- Giữ đăng ký/đăng nhập/đăng xuất JWT; sau login/register tải profile đầy đủ để ngày sinh/địa chỉ có sẵn ngay khi điều hướng.
- Nối ngày sinh, địa chỉ, avatar, đổi email hai bước, bốn tùy chọn thông báo, đổi mật khẩu và gửi/xem trạng thái xác minh. Không persist giấy tờ/mật khẩu ở browser storage.
- Giữ discovery/booking/sandbox; hiển thị tiện ích thật; vô hiệu quote cũ trước lần kiểm tra lại. Mutation phải được máy chủ chấp nhận rồi mới thông báo, tải lại dữ liệu.

## 3. Host

- Studio list/create/edit/status/cover dùng REST; ảnh đọc cover_url đúng contract.
- Phòng ẩn/chi tiết quản lý, loại phòng riêng, physical room gắn room_type_id cùng Studio; danh mục space-types/amenities; upload ảnh phòng.
- Thiết bị: category/create/edit/quantity/price/status/images/DELETE; giá: owner list active/inactive, create/edit/effective dates/min/max/status/DELETE. Có confirm và giữ nguyên lỗi 409 khi backend từ chối.
- Calendar owner theo Studio/phòng/kỳ, bao gồm busy_start/busy_end; chính sách theo snake_case; dashboard/series cùng thống kê thật. Không bịa free slots hoặc giá trị 0 khi API lỗi.
- Pháp lý GET/PATCH; hợp đồng list/detail; xin grant một lần, fetch PDF bằng JWT, xem/tải tài liệu bằng Blob riêng tư, thu hồi URL khi đóng modal.

## 4. Admin

- Giữ quản lý tài khoản và confirm khóa/đổi role; đọc catalog role thật.
- Hồ sơ Host list/detail/approve/reject dùng endpoint riêng; bắt lý do khi từ chối.
- Studio/phòng/thiết bị toàn hệ thống read/PATCH theo allowlist; raw status được giữ.
- Refund list/detail/actions là đối soát thủ công, cần evidence_reference khi xác nhận thành công; không chuyển tiền. Có thông báo ghi nhận sau success.
- Audit phân trang máy chủ, chỉ trường có thật; statistics/report series theo kỳ.

## 5. API Runtime

GET thật /api/health và /api/rooms tại 127.0.0.1:8000 đều ECONNREFUSED; chưa nhận HTTP status. PHP/MySQL không trên PATH, Docker daemon chưa có. Không chạy mutation thật hoặc kiểm chứng DB. Browser suite dùng interception với dữ liệu test trong bộ nhớ; reload xác nhận frontend re-fetch fixture, không xác nhận persistence MySQL.

## 6. Những vấn đề còn tồn tại

- Frontend: các lỗi đã tái hiện được trong lượt này đã sửa; luồng REST đã kiểm thử theo phạm vi ở ma trận. Không coi mock là nghiệm thu production.
- Backend/database theo source: hai runner dùng schema_migrations.version/migration khác nhau; migration PHP workspace đổi lifecycle không hoàn toàn tương thích REST. Cần backend review trên DB test.
- Database readiness: bootstrap tự bỏ qua DB có bảng; chưa biết migration 009–012 có trên DB đang chạy. Không tự apply/seed.
- Nghiệp vụ: chưa có chuyển tiền hoàn tự động, ma trận quyền chi tiết, luồng chữ ký hợp đồng đầy đủ, filter báo cáo theo Studio/phòng. Đây không phải thiếu route đã kiểm tra.
- Môi trường: cần PHP/MySQL test độc lập và tài khoản test trước khi chạy workflow/persistence thật. Chi tiết, cách tái hiện và người phụ trách trong REMAINING_INTEGRATION_ISSUES.md.

## 7. Files Changed

Danh sách file được tạo/chỉnh trong lượt này. Một số file đã có thay đổi từ trước; chỉ sửa phần cần tích hợp, không reset/stash/checkout hoặc ghi đè toàn bộ working tree. Các tài liệu lịch sử chỉ thêm thông báo thay thế, giữ nguyên nội dung cũ. Không liệt kê các file vốn dirty nhưng không được sửa trong lượt này.

- `client/src/components/api-session.tsx`
- `client/src/services/api/client.ts`
- `client/src/services/api/client.test.ts`
- `client/src/services/api/contracts.ts`
- `client/src/services/api/use-resource.ts`
- `client/src/services/api/management.ts`
- `client/src/services/api/management.test.ts`
- `client/src/services/api/host-contract.ts`
- `client/src/features/customer/customer-profile.tsx`
- `client/src/features/customer/profile-data.ts`
- `client/src/features/workspace/account-capabilities.tsx`
- `client/src/features/workspace/api-operation-dialog.tsx`
- `client/src/features/workspace/host-application.tsx`
- `client/src/features/workspace/workspace-settings.tsx`
- `client/src/features/host/backend-host.tsx`
- `client/src/features/host/host-workspace.tsx`
- `client/src/features/host/host-resources.tsx`
- `client/src/features/host/host-types.ts`
- `client/src/features/host/host-ui.tsx`
- `client/src/features/host/host-settings.tsx`
- `client/src/features/host/host-legal.tsx`
- `client/src/features/host/host-rest-forms.tsx`
- `client/src/features/host/host-calendar.tsx`
- `client/src/features/host/host-activity.tsx`
- `client/src/features/host/rest-reporting.tsx`
- `client/src/features/host/host-retirement-dialog.tsx`
- `client/src/features/admin/admin-workspace.tsx`
- `client/src/features/admin/system-pages.tsx`
- `client/src/features/admin/rest-pages.tsx`
- `client/src/features/booking/backend-booking.tsx`
- `client/src/features/marketplace/backend-pages.tsx`
- `client/scripts/rest-integration-qa.mjs`
- `client/scripts/write-rest-integration-report.mjs`
- `docs/api/FINAL_INTEGRATION_MATRIX.md`
- `docs/api/API_RUNTIME_VERIFICATION.md`
- `docs/api/REMAINING_INTEGRATION_ISSUES.md`
- `docs/api/FINAL_INTEGRATION_REPORT.md`
- `docs/api/API_COVERAGE_MATRIX.md`
- `docs/api/API_GAP_AUDIT.md`
- `docs/api/API_IMPLEMENTATION_BACKLOG.md`
- `docs/api/API_REQUIREMENTS_RECHECK.md`
- `docs/api/REMAINING_MISSING_APIS.md`
- `docs/api/PROPOSED_API_CONTRACTS.md`
- `docs/api/FRONTEND_BACKEND_INTEGRATION_AUDIT.md`
- `docs/customer/CUSTOMER_PROFILE_API_GAPS.md`
- `docs/host/LOGIC_AND_API_GAPS.md`
- `docs/host/HOST_CONTRACT_AND_DELETE_API_GAPS.md`
- `docs/integration-audit.md`
- `docs/integration-matrix.md`
- `docs/integration-verification.md`
- `docs/PROJECT-API-COVERAGE-CHECKLIST.md`

Artifact QA cục bộ: client/test-results/rest-integration/summary.json và ảnh chụp 5 viewport; bản hash đầu lượt tại .tmp/api-integration-baseline-2026-11-05.json. Không đưa dữ liệu test vào code production.

## 8. Tests

| Lệnh (từ client nếu không ghi khác) | Kết quả | Phạm vi |
|---|---|---|
| npm.cmd run lint | Đạt | ESLint frontend |
| npm.cmd run typecheck | Đạt | TypeScript |
| npm.cmd test | 193/193 đạt | Domain, transport, contract, dashboard, Helpdesk với test doubles; không gọi AI trả phí |
| npm.cmd run build | Đạt | Production Webpack Next.js |
| node scripts/rest-integration-qa.mjs | Đạt; 79/80 thao tác trong danh sách được quan sát | Browser fixture, 5 viewport; các luồng đã nêu trong runtime report |
| node scripts/merge-smoke-qa.mjs | Đạt | Guest/public/profile/Host/Admin render; chặn toàn bộ API trước backend |
| git diff --check (repo root) | Đạt | Không có lỗi whitespace; Git chỉ cảnh báo LF/CRLF |
| So SHA-256 282 file server/Helpdesk với baseline đầu lượt | Không có file đổi nội dung | Không sửa PHP/schema/migrations/Helpdesk |
| PHP syntax/unit/integration và MySQL persistence | Chưa chạy | Thiếu runtime test, không giả kết quả |

Lần npm test đầu trong sandbox gặp uv_os_get_passwd ENOMEM; chạy lại ngoài sandbox với auto-review cho phép đã đạt, không sửa dependency. Các kết quả kiểm thử dùng mock không cộng vào VERIFIED_HTTP/VERIFIED_DATABASE_PERSISTENCE.

## 9. Documentation

- [Ma trận đủ 80 API](FINAL_INTEGRATION_MATRIX.md)
- [Kiểm chứng runtime và hướng dẫn DB test](API_RUNTIME_VERIFICATION.md)
- [Vấn đề còn lại theo nhóm A/B/C/D](REMAINING_INTEGRATION_ISSUES.md)

## 10. Scope Verification

PHP controllers/services/repositories/router, database schema/migrations, booking state machine, giá/cọc/hủy/hoàn tiền phía backend và Helpdesk/9Router/RAG/persistence/tools giữ nguyên. Chỉ sửa frontend transport/mapping/forms/revalidation và kiểm thử/tài liệu. Không thay .env thật hoặc Compose; không chạy migration/seed hay khởi động lại stack. Không commit, push, deploy.
