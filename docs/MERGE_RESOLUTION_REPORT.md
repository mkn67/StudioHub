# Sửa conflict main — 04/11/2026

## Nguyên tắc theo phân công của nhóm

- Frontend do chủ workspace phụ trách: ưu tiên giao diện, điều hướng và luồng REST/JWT từ nhánh local khi có xung đột. Chỉ ghép phần bổ sung từ GitHub khi tương thích; không bật workspace API cookie để thay luồng hiện tại mặc định.
- Backend và database do thành viên khác phụ trách: ưu tiên code PHP/schema/migrations từ nhánh incoming; không tự viết lại nghiệp vụ backend hoặc sửa SQL để phù hợp một giao diện.
- Đối chiếu với MERGE_HEAD: schema, migrations và phần lớn backend đã khớp nhánh incoming. Các file bổ trợ Docker/init/CORS-test local vẫn được giữ. `server/src/Core/Router.php` còn bản sửa CORS local có sẵn trước lượt giải quyết conflict, giúp middleware xử lý OPTIONS trước route matching. Chưa tự xóa bản sửa tương thích này; đây là khác biệt cần bàn giao cho người phụ trách backend, không phải thay đổi mới trong lượt này.
- Không chạy migration/seed, sửa dữ liệu, đổi volume hoặc khởi động lại stack. Hợp đồng API chưa tương thích cần ghi nhận và thống nhất với người phụ trách backend trước khi triển khai.

## Trạng thái ban đầu

Merge từ `9032d14` vào `21897da` đang dang dở: 10 file unmerged, package.json sai JSON và source/Compose còn dấu conflict. Nhánh local có 1 commit riêng, remote có 5 commit riêng. Có nhiều thay đổi backend đã được merge/stage từ trước khi bắt đầu nhiệm vụ này.

Đã sao lưu 472 file làm việc, index, MERGE_HEAD/MERGE_MSG/HEAD và staged patch tại `.tmp/merge-backup-2026-11-04T09-54-11-811Z/`. Sao lưu chỉ ở máy, được gitignore vì có thể chứa cấu hình riêng. Không tự dùng bản sao index để reset repo.

## Cách xử lý

| File conflict | Quyết định |
|---|---|
| `client/package.json` | Giữ Webpack và scripts local; giữ dependencies từ merge, thêm 3 test dashboard vào lệnh test |
| `client/next.config.ts` | Giữ quyết định xóa ở local; dùng duy nhất next.config.mjs, ghép turbopack.root vào mjs |
| `client/src/app/globals.css` | Giữ CSS local và 428 dòng bổ sung từ nhánh incoming |
| `client/src/components/application.tsx` | Giữ REST/JWT, Customer Profile và Host/Admin hiện có; giữ shell riêng của dashboard incoming, bỏ menu cũ bị lặp |
| `client/src/components/store.tsx` | Giữ các method/state/dashboard mới, đồng thời ngăn workspace API/session cookie chặn luồng REST mặc định |
| `docker-compose.yml` | Giữ cấu hình local; sau giải quyết giống HEAD, không đổi volume, DB, ports hay init command |
| `client/README.md` | Giữ hướng dẫn REST hiện có; lưu bản incoming riêng và bổ sung cách chọn mode |
| `docs/integration-audit.md` | Giữ bản local, lưu nguyên văn incoming tại docs/merge-history |
| `docs/integration-matrix.md` | Giữ bản local, lưu nguyên văn incoming tại docs/merge-history |
| `docs/integration-verification.md` | Giữ bản local, lưu nguyên văn incoming tại docs/merge-history |

Không dùng Accept Current/Incoming hàng loạt cho toàn repository. Những thay đổi đã merge tự động khác được giữ nguyên, không reset nhánh hoặc hủy merge.

## Hai cách kết nối API

Hai nhánh có frontend sử dụng phiên khác nhau. Không để store cookie mới tự tải workspace và chặn ứng dụng dùng sessionStorage JWT hiện có.

- Mặc định giữ **REST/JWT** khi không đặt `NEXT_PUBLIC_APP_MODE` và `NEXT_PUBLIC_DEMO_MODE` khác `true`. Session/API client hiện có tiếp tục chịu trách nhiệm dữ liệu thực; shared store khởi tạo rỗng và không gọi `/api/business/*`.
- `NEXT_PUBLIC_APP_MODE=demo` hoặc legacy `NEXT_PUBLIC_DEMO_MODE=true` khi không có APP_MODE rõ ràng: giữ demo trên trình duyệt.
- `NEXT_PUBLIC_APP_MODE=connected`: lựa chọn rõ ràng cho workspace API cookie từ nhánh incoming. Có giữ code, chưa kiểm chứng end-to-end với DB trong nhiệm vụ này; không tự bật hoặc chạy migration cho mode đó.
- APP_MODE rõ ràng được ưu tiên hơn legacy flag. Cấu hình `.env` thật không bị thay đổi.

Các file hỗ trợ bổ sung/chỉnh ngoài conflict: `.gitignore`, `client/next.config.mjs`, `client/src/data/api-mode.ts`, `client/src/data/api.ts`, `client/src/services/api/client.ts`, `client/src/services/api/api-mode.test.ts`, `client/scripts/merge-smoke-qa.mjs`, README và các tài liệu báo cáo/archives.

## Kiểm chứng

- `npm.cmd test`: **184/184** đạt, bao gồm domain, contract, dashboard, API mode và Helpdesk adapter dùng test doubles.
- `npm.cmd run lint`: đạt.
- `npm.cmd run typecheck`: đạt.
- `npm.cmd run build`: production Webpack build đạt.
- Manifest và lockfile: JSON hợp lệ, root dependencies/devDependencies khớp nhau; không cài lại hoặc đổi phiên bản dependencies.
- `docker compose config --quiet`: cấu hình hợp lệ; không chạy `up`, restart hoặc tác vụ init.
- `node scripts/merge-smoke-qa.mjs`: production Guest/Public/Profile/Host/Admin render được, không lỗi JavaScript chưa xử lý. Tất cả request API bị chặn trước khi tới PHP; REST không gọi workspace API cookie. Server QA riêng cổng 3100 được dừng khi script kết thúc.
- Không còn dấu conflict trong source/Compose/tài liệu đã xử lý. Git ghi nhận các file được giải quyết bằng staging; không tạo merge commit hoặc push.

## Giữ nguyên backend và database

254 file backend/Helpdesk được ghi nhận hash trước và sau, không sửa thêm file nào. Đối chiếu index của server/Helpdesk với bản sao index ban đầu để bảo đảm không thay đổi phần đã stage trước đó. Những sửa đổi backend vốn có từ lần merge trước vẫn tồn tại, không bị xóa hoặc thay thế.

Không chạy PHP, login, migration, seed, SQL, Docker up/down/restart hay backend tests. Browser QA chặn toàn bộ API. Vì vậy nhiệm vụ này không tạo thao tác ghi vào DB; không tuyên bố đã kiểm chứng nghiệp vụ backend mới từ GitHub hoặc tương thích các migrations với DB đang chạy.

Kết thúc lượt sửa conflict ban đầu, merge chưa được commit/push. Trước khi triển khai hoặc chạy lại stack, nhóm vẫn cần review riêng những thay đổi backend đã có trong merge từ trước.

## Kiểm tra trước khi đồng bộ GitHub theo yêu cầu tiếp theo

Người dùng đã yêu cầu kiểm tra kỹ việc giữ backend, sau đó pull/merge/push lên GitHub.

- Đã fetch `origin`; tại thời điểm audit, `origin/main` vẫn là `9032d14`, trùng MERGE_HEAD.
- Đối chiếu từng file trong 170 file backend/Helpdesk được theo dõi ở nhánh GitHub: **không thiếu file nào**. Sau chuẩn hóa LF/CRLF, 169 file khớp nội dung; file còn lại là bản sửa CORS local có sẵn tại `server/src/Core/Router.php` đã mô tả ở trên.
- Đối chiếu staged tree với nhánh incoming: **không có file backend bị xóa**. Chỉ có bản sửa CORS và 5 file local bổ sung phục vụ Docker/init/test.
- Toàn bộ `server/database/` trong staged tree khớp nhánh incoming, bao gồm schema và migrations. Không sửa SQL hoặc thực thi migration/seed.
- Không có file `.env` thật, khóa riêng hoặc database SQLite được stage. Bản sao phục hồi vẫn được ignore.
- Việc đồng bộ chỉ cập nhật Git, không chạy Docker up/down/restart hoặc backend tests ghi DB. Kết quả commit/pull/push thực tế được báo lại sau khi lệnh hoàn tất.
