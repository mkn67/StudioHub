# StudioHub PHP Helpdesk

Independent PHP >=8.2 application. No existing business PHP, router, schema or Composer file is changed. The browser uses the fixed Next.js bridge; PHP alone calls 9Router and reviewed business HTTP endpoints.

Implemented: bounded model-directed function calling, publication-gated lexical RAG and extractive citations, conversations/idempotency, real tickets with confirmation, handoff state machine, scoped operator API, retention, rate limits and tests. See [implementation](../docs/helpdesk/AGENT_IMPLEMENTATION.md) for exact limits and [API](../docs/helpdesk/HELPDESK_API_IMPLEMENTATION.md).

Harness mới: **bắt buộc đăng nhập** để chat; giữ hội thoại khi chuyển trang và khôi phục khi reload; xác minh phòng đang mở; resolve tên phòng/Studio; trả giá thật trong card hoặc bảng giá thay vì lời đáp chung. Xem [harness và các giới hạn](../docs/helpdesk/HELPDESK_HARNESS.md). Hành vi guest chat/reset theo URL trong tài liệu milestone cũ không còn áp dụng.

Milestone 10/11/2026: [audit nghiệp vụ](../docs/helpdesk/HELPDESK_BUSINESS_RULE_AUDIT.md), [tool catalog](../docs/helpdesk/HELPDESK_TOOL_CATALOG.md), [kiến trúc](../docs/helpdesk/HELPDESK_AGENTIC_ARCHITECTURE.md), [test report](../docs/helpdesk/HELPDESK_TOOL_TEST_REPORT.md), [giới hạn](../docs/helpdesk/HELPDESK_REMAINING_GAPS.md). Public tools thêm authoritative availability; customer booking list dùng `STUDIOHUB_CUSTOMER_READ_TOOLS=true` (mặc định false). Booking detail không đăng ký vì GET hiện tại có expire/refund khi đọc. Không có business mutation tool. `NINEROUTER_TOOL_CALLING_ENABLED=false` dùng approved-only lexical RAG, không gọi provider.

Test bổ sung: `node tests/readonly-http.mjs` (cURL + backend/provider HTTP giả lập, không gọi dịch vụ thật). Kiểm tra public API thật tùy chọn: `bin/php.cmd bin/readonly-smoke.php` (không model/ghi nghiệp vụ). Kết quả môi trường phiên này: API upstream 503, chưa xác minh dữ liệu thật; không tuyên bố 9Router thật đã hỗ trợ protocol.

## Run locally

### MySQL riêng cho Helpdesk trong Docker local

Khi stack local đang chạy, tạo credentials/TLS riêng (script giữ nguyên khóa/model 9Router):

```powershell
node helpdesk-php/bin/setup-local-mysql.mjs
docker compose --env-file .env.compose up -d --no-deps helpdesk-db
docker compose --env-file .env.compose up -d --build --no-deps helpdesk-php
docker compose --env-file .env.compose exec -T --user www-data helpdesk-php php bin/check-storage.php
```

Chạy từ gốc repo. Overlay tạo MySQL riêng `helpdesk-db`, database `studiohub_helpdesk_dev`, user chỉ có quyền database này, volume `studiohub_helpdesk_mysql_data`. TLS xác minh CA và hostname; không tắt TLS verification. Cổng host `127.0.0.1:3308`; credentials và chứng chỉ local ở `helpdesk-php/var/` đã được Git ignore. `.env` Helpdesk được cập nhật DSN/credentials/CA cho PHP chạy trực tiếp trên host; Compose override dùng DNS/cổng/CA mount tương ứng trong container. Không đổi DB nghiệp vụ.

Setup lưu `COMPOSE_FILE`, dấu phân cách và credentials MySQL local vào `.env.compose` đã ignored. Vì vậy lệnh thông thường `docker compose --env-file .env.compose up -d --build` tự nạp overlay MySQL, kể cả sau khi down/up toàn stack. Không cần nhớ thêm file `-f`; chỉ định riêng `-f docker-compose.yml` sẽ bỏ qua lựa chọn overlay này và trở về SQLite trong Compose gốc. Không chạy `down -v` nếu cần giữ dữ liệu. Migration lúc startup chỉ tạo ba bảng Helpdesk bằng script sẵn có. Để chuyển lịch sử SQLite hiện có, sao lưu file trước rồi chạy `php bin/import-local-sqlite.php --apply` trong container Helpdesk: script chỉ đọc SQLite, transaction vào DB Helpdesk dev, không ghi đè ID đã có. File SQLite gốc vẫn được giữ.

MySQL dùng để lưu dữ liệu Helpdesk; LLM không có quyền SQL tùy ý. Tra cứu nghiệp vụ vẫn qua tool/API đã kiểm quyền.

Kiểm tra sau khi chuyển: `php bin/check-storage.php` trả driver và trạng thái TLS (không in credentials); `node helpdesk-php/bin/check-local-http.mjs` từ gốc repo kiểm tạo hội thoại qua localhost:3000 và đọc lại đúng owner, không gọi model. Setup tự bật OpenSSL trong portable PHP local nếu có DLL để PDO MySQL xác minh TLS.

Docker gọi 9Router trên máy host qua `host.docker.internal`. Overlay MySQL đặt `NINEROUTER_HTTP_HOSTS=host.docker.internal` để cho phép đúng HTTP host nội bộ này; HTTPS hoặc loopback không cần cấu hình đó. Không dùng wildcard và không nhận hostname từ tin nhắn người dùng. Kiểm cả bước gửi tin nhắn thật bằng `node helpdesk-php/bin/check-local-chat.mjs --live` từ gốc repo; lệnh này có gọi model đang cấu hình, không nằm trong suite test tự động.

Overlay local bật `STUDIOHUB_PUBLIC_TOOLS=true` để model có search/detail/pricing/availability; bật giao thức gọi tool thôi chưa cấp các tool danh mục. Kiểm luồng tìm phòng thật với câu “thu âm”: `node helpdesk-php/bin/check-local-chat.mjs --live --discovery`. Lệnh yêu cầu có room cards từ evidence API, in số phòng/ID của hội thoại kiểm thử; xem audit metadata bằng `php bin/check-tool-trace.php --conversation=UUID` trong Helpdesk container. Tracer chỉ xuất tên tool/outcome, không chat, arguments hoặc credentials. Bộ lọc người dùng chưa cung cấp để null hoặc bỏ qua, không tự đặt ngân sách 0 hay khu vực giả. Customer reader vẫn cần opt-in riêng; không có business mutation tool.

The current workspace has a checksum-verified portable PHP under ignored .runtime; no system installation is needed. From helpdesk-php/ on Windows:

~~~powershell
# Existing ignored .env is prepared. Fill these values there:
# NINEROUTER_BASE_URL (already includes /v1), NINEROUTER_API_KEY, NINEROUTER_MODEL
# No model ID or API key has been invented.
.\bin\php.cmd bin/migrate.php --apply
.\bin\php.cmd -S 127.0.0.1:8010 -t public public/index.php
~~~

The .env already has a generated server-to-server bridge secret. Keep it private and copy that SAME value into the Next.js server environment, not NEXT_PUBLIC variables. In a separate terminal from client/, merge [the example](../client/.env.helpdesk.example) into an existing .env.local (do not overwrite other settings), then:

~~~powershell
npm.cmd run dev
~~~

Open http://localhost:3000 and the existing Chat Widget. Default mode is connected; NEXT_PUBLIC_HELPDESK_MODE=demo explicitly restores offline FAQ. API/model not configured gives a clear error; it never silently returns demo answers. `HELPDESK_FRONTEND_ORIGIN` accepts one or more comma-separated origins (no trailing slash). Set the same list in the PHP Helpdesk service and the Next.js/Vercel environment, then redeploy/restart both.

The Windows php.cmd helper invokes its PowerShell helper with a process-only execution-policy override; it does not change machine/user policy. It selects PHP on PATH or the local portable runtime. Direct php.ps1 execution may be blocked by the machine's existing script policy.

On a new checkout use PHP >=8.2 with curl, mbstring, iconv, JSON, PDO and pdo_sqlite (or pdo_mysql). Composer is optional: the module includes its own PSR-4 bootstrap and dependency-free test runner. composer.json declares requirements for platform tooling; no shared Composer package is changed. Never point this module at business tables.

SQLite is the local default (`var/helpdesk.sqlite`, outside public/). For Render/Aiven, MySQL is supported so Helpdesk conversation data survives container replacement. Configure either `HELPDESK_DATABASE_URL=mysql:host=...;port=...;dbname=defaultdb;charset=utf8mb4` or the separate `HELPDESK_DB_HOST`, `HELPDESK_DB_PORT`, and `HELPDESK_DB_NAME` values; both require `HELPDESK_DB_USER`, `HELPDESK_DB_PASSWORD`, and `HELPDESK_DB_SSL_CA=/etc/secrets/aiven-ca.pem`. Upload the Aiven CA certificate as a Render secret file named `aiven-ca.pem`; the Docker image adds `www-data` to Render's secret-file access group. If the CA path is set but the Render secret file is missing or mounted elsewhere, startup intentionally fails with `invalid_storage_configuration`; make the configured path exactly match the secret-file mount. Set `HELPDESK_ALLOW_PRODUCTION_MIGRATIONS=true` only for the intended Aiven `defaultdb` (or a dedicated Helpdesk `*_prod` database); migrations create only the three namespaced Helpdesk tables and never alter StudioHub business tables. MySQL migration runs at container startup. Local MySQL migrations remain restricted to database names containing `helpdesk` and ending in `_dev` or `_test`.

## Knowledge approval

Normal HTTP retrieval currently has zero eligible entries: the source corpus is unpublished. Run:

~~~powershell
.\bin\php.cmd bin/approval-manifest.php
~~~

This prints an UNAPPROVED worksheet with exact entry/source hashes. Owner reviews specific conflict-free entries, fills approved_by/approved_at/valid_from plus valid_until or non_expiring=true, sets decision=approved, and copies only approved records into config/approval-manifest.json. Manifest approval is a separate runtime release overlay; source documents/fixtures remain untouched. The nine held entries cannot be approved by this overlay until their source conflict/status is separately resolved.

Only approved applicable versions reach HTTP/model context. Draft access is CLI-only and cannot be enabled through .env, query strings, request bodies or development HTTP mode.

## 9Router configuration

Fill .env yourself; no connectivity check or live request is required during setup. NINEROUTER_TOOL_CALLING_ENABLED is an explicit capability switch, not a claim of verification. The application validates every provider tool call and refuses invalid/unsupported responses.

Optional commands, ONLY when you choose to test a configured gateway:

~~~powershell
.\bin\php.cmd bin/gateway-smoke.php --models
.\bin\php.cmd bin/gateway-smoke.php
~~~

The second command performs an actual chat and tool-result roundtrip. Its report is diagnostic, not a prerequisite for startup; no invented model IDs are used. See [9Router setup](../docs/helpdesk/NINEROUTER_SETUP.md). Public catalog tools require explicit `STUDIOHUB_PUBLIC_TOOLS=true`; every response is validated at request time, without a transient CLI marker. See [MySQL-backed answers](../docs/helpdesk/MYSQL_CATALOG.md).

## Tests and demos

~~~powershell
.\bin\php.cmd tests/run.php
node tests/http-qa.mjs
.\bin\php.cmd bin/evaluate.php --draft
.\bin\php.cmd bin/demo.php --draft --mock --scenario=rag
.\bin\php.cmd bin/demo.php --draft --mock --scenario=ticket --confirm-ticket
.\bin\php.cmd bin/demo.php --draft --mock --scenario=privacy
.\bin\php.cmd bin/demo.php --draft --mock --scenario=handoff
.\bin\php.cmd bin/demo.php --draft --mock --scenario=unsupported
~~~

Mock demos are explicitly labeled and use a separate var/demo.sqlite. --confirm-ticket is an explicit CLI confirmation; the demo guest contact is marked synthetic. No real contact is contacted. Removing --mock selects the actual configured provider, which is not verified in this task. Do not use a draft demo as publication approval.

Ticket creation requires authenticated PHP identity or a guest contact independently verified by an operator. There is no email/SMS delivery implementation. A local operator may record external verification with bin/verify-contact.php --conversation=UUID --contact=CONTACT --attest-externally-verified only AFTER performing that verification. The endpoint never trusts a user-supplied verified flag.

Support API access is disabled with the empty HELPDESK_SUPPORT_USER_IDS allowlist. To enable for actual staff, independently verify PHP identity integration and allowlist exact live user IDs. Admin/Host labels alone grant nothing. A relevant Host is never assigned automatically because no trusted Host-ownership lookup API exists.

The widget polls history while handoff is pending/active and shows real operator messages/state; automatic generation stops. A full human inbox UI and guest contact delivery are not implemented. Operator control/API tests use synthetic identities; live staff authentication remains unverified.

Run bin/retention.php --apply explicitly to remove expired Helpdesk records. Application reads deny expired records even before cleanup. Raw conversation data is stored for configurable retention (24h default); traces contain IDs/hashes/outcomes rather than raw tool payloads or credentials.

No live 9Router verification, policy publication, business mutation, commit, push or deployment is claimed. Detailed actual results: [evaluation report](../docs/helpdesk/AGENT_EVALUATION_REPORT.md).
