# StudioHub PHP Helpdesk

Independent PHP >=8.2 application. No existing business PHP, router, schema or Composer file is changed. The browser uses the fixed Next.js bridge; PHP alone calls 9Router and reviewed business HTTP endpoints.

Implemented: bounded model-directed function calling, publication-gated lexical RAG and extractive citations, conversations/idempotency, real tickets with confirmation, handoff state machine, scoped operator API, retention, rate limits and tests. See [implementation](../docs/helpdesk/AGENT_IMPLEMENTATION.md) for exact limits and [API](../docs/helpdesk/HELPDESK_API_IMPLEMENTATION.md).

## Run locally

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

The second command performs an actual chat and tool-result roundtrip. Its report is diagnostic, not a prerequisite for startup; no invented model IDs are used. See [9Router setup](../docs/helpdesk/NINEROUTER_SETUP.md). Public business catalog tools have a separate verified-endpoint gate; see that guide.

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
