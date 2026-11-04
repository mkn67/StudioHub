# Implementation and verification — 2026-11-02

## Outcome

The existing UI now has an explicit connected mode, a same-origin credential bridge to the existing PHP backend, server-side catalog/workspace projection, pricing and transactional business-command implementation, versioned MySQL upgrades, real persisted management/application/incident models, a deadline worker and server reports. Demo mode remains explicitly isolated. This is **not yet a verified deployable full-stack system**: MySQL was unavailable, so the SQL upgrade and successful database workflows could not be executed. No real database was migrated or reset. No real payment/provider call, commit, push or deployment occurred.

## Architecture and significant changes

| Files | Purpose |
|---|---|
| server/database/migrations/001_integration.php; server/bin/init.php, migrate.php; server/database/migrate.php | Restartable non-destructive schema upgrades, migration ledger/lock, empty dev/test seed opt-in, removed legacy reset path. New room_types, incidents, applications, support requests, auth revocations/rate limits, idempotency and write-mutex tables; additive config/snapshot/status columns and lifecycle checks |
| server/src/Services/RentalRules.php | Integer VND pricing, duration/session/operating hours/overnight rules, inherited rates, bundles/extras, shared peak equipment checks, physical room/30m buffer conflicts, policy validation |
| server/src/Services/WorkspaceService.php | Authorized catalog/workspace projection; atomic business commands, snapshot/normalized ledger updates, idempotency, lifecycle, expiry/reconciliation, Host resources, Admin operations, audit and reports |
| server/src/Controllers/WorkspaceController.php; server/public/index.php | Registered catalog/workspace/quote/command/report endpoints; consistent read transactions; CORS preflight |
| server/src/Services/AuthService.php, JwtService.php; Middleware/AuthMiddleware.php, CorsMiddleware.php; Controllers/AuthController.php; Core/Request.php, ApiResponse.php; Config/Database.php | Reject predictable signing key, validate credential types/length, logout revocation, reload account state, authentication throttle, tighter CORS, bounded/validated JSON, preserved numeric error code plus machine error_code, shared PDO |
| server/bin/expire-bookings.php; docker-compose.yml; server/docker/api.Dockerfile | Actual independent deadline worker, explicit secret/adapter settings, internal frontend-to-PHP origin and required mbstring extension |
| client/src/app/api/business/[...path]/route.ts; client/src/data/api.ts | Fixed-route server-only origin, HttpOnly cookie, Origin checks, no-cache requests, token stripping, timeout/error translation |
| client/src/components/store.tsx | Connected default, awaited remote mutations, in-flight duplicate prevention, retained idempotency on ambiguous retry, stale-poll guard, no fixture fallback/local business persistence, explicit demo marker |
| client/src/components/accounts.tsx, application.tsx, wizard.tsx, bookings.tsx, operations.tsx; pricing/dashboard editor components | Await real results before success/navigation, real credential form, preserved draft edits/design, connected URL media field, supported payment windows and explicit refund tiers |
| client/src/domain/models.ts, engine.ts, rental.ts; components/marketplace.tsx | API compatibility types, stale total/deposit/policy confirmation, redacted interval availability, per-session equipment charges |
| client/src/features/dashboard/components/ConnectedReports.tsx | Server-calculated financial summaries and weekly/monthly physical-room popularity |
| client/src/app/api/helpdesk/[...path]/route.ts | Forward the business HttpOnly session through the existing Helpdesk bridge, never browser persona claims |
| server/tests/integration_rules.php, integration_mysql.php; client/src/domain/integration.test.ts; client/scripts/integration-connected-qa.mjs | Pure rule coverage, guarded isolated-MySQL workflow/concurrency harness, API projection regressions and actual unavailable-backend browser checks |
| docs/integration-audit.md, integration-matrix.md, implementation-plan.md, api-reference.md, development.md; root/client README; example env files | Initial evidence, dependency map, final statuses, endpoint contracts, setup/run/test instructions and remaining blockers |

## Business and security behavior implemented

New bookings are physical-room holds in awaiting_payment; server validates 24h + configured payment window, capacity, operating hours and all bundled/extra stock, snapshots prices/policies and rejects stale customer totals/deposits/policies. A development deposit is explicitly simulated and becomes pending Host review. Host approval alone confirms; rejection/2h timeout cancels and creates a full refund obligation. No customer strike for Host action or verified/uncertain provider error. Three effective unpaid abandonment incidents restrict new booking/change requests without preventing login or use of existing confirmed bookings. Admin restoration retains history.

Rescheduling preserves original allocation until Host approval, rechecks stock/pricing under the write lock, permits one approved change, preserves deposit and tracks excess refund. Check-in/out uses server timestamps; completion remains separate from settlement, overtime rounds up per 30m, collections cannot overpay and updates record the ledger atomically. Refund processing has an explicit development-only boundary, three total confirmed-failure attempts and escalation, with no blind uncertain retry. Prior settled excess refunds are preserved in refundHistory and report totals; unresolved prior processing/failed refunds conservatively require reconciliation before another obligation.

All new commands serialize on a singleton InnoDB mutex, re-read live actor/resource state, enforce role and ownership, write audit and request hash in the same transaction and rollback on errors. That is an implementation strategy, **not empirical concurrency verification**. Public availability has no identities/private booking IDs. Authentication cannot use local demo personas or a known default signing key. Browser code never receives the business JWT or provider secrets. Existing styles/fonts/images remain intact apart from targeted forms, states and connected reporting.

## Executed checks

| Check | Result / evidence |
|---|---|
| Initial TypeScript / lint / production build | Passed before application edits |
| PHP rule suite | **25/25 passed**, integer prices/deposits, packages/bundles, per-session equipment, lead boundary, rooms/buffers, inventory peak/snapshots, overnight hours, surcharge, crew, policy, invalid inputs and predictable JWT rejection |
| Frontend domain/regression suite | **133/133 passed**, includes two new API-contract regressions; no failed/skipped tests. Required sandbox escalation for existing tsx Windows userInfo restriction |
| Existing PHP Helpdesk suite | **32/32 passed, 130 assertions**, scripted/mocked provider; no live gateway claim |
| Connected browser/HTTP failure suite | **26 checks passed** using actual local PHP and a production Next frontend, unavailable MySQL. Includes five routes, retry, no demo fallback/localStorage write, CSRF Origin denial, unknown route denial, unauthorized workspace, generic backend error and 360/768/1280 widths; zero page errors |
| Existing rental-pricing browser suite | **84 checks passed**, zero page errors, zero external requests/provider calls; explicit demo dev process, existing Host/customer pricing/booking UX and responsive checks. First run caught demo badge pointer interception; fixed and rerun |
| PHP syntax | **49 PHP files passed** (all maintained server PHP, excluding vendor); final changed files rechecked after review |
| Final TypeScript / lint / production build | Passed during implementation; final rerun recorded below after last review |
| MySQL integration/concurrency harness | **BLOCKED**, APP_ENV=test / dedicated *_test DB; 127.0.0.1:3307 actively refused connection. No workflow assertions ran |
| Existing PHPUnit suite | **BLOCKED**, server/vendor/bin/phpunit absent; Composer dev dependencies not installed in this environment |
| Docker | **BLOCKED**, Docker engine pipe does not exist; no containers/services verified |

Browser artifacts: client/.impeccable/review/integration/connected-results.json and connected-unavailable.png; existing client/.impeccable/review/rental-pricing/results.json/screenshots. These are ignored local artifacts, not published proof of a successful MySQL booking.

## Remaining limitations and required external inputs

1. Running MySQL 8 service and a dedicated migrated test database are required to execute persistence, transaction rollback, real auth/login/logout and multi-process reservation tests. The new DDL and SQL queries remain IMPLEMENTED_NOT_VERIFIED. Docker is unavailable. No claim that merely adding a transaction proves concurrency safety.
2. Configure private JWT_SECRET and database credentials; install Composer dev dependencies to run existing PHPUnit. Real env files were neither read nor replaced. Existing dev fixtures remain optional, never production credentials.
3. Live bank/payment/refund provider adapters/webhooks/reconciliation are NOT_IMPLEMENTED. Disabled mode fails closed; development outcomes are labeled simulation. Real provider credentials alone do not make the absent adapter work.
4. Existing Helpdesk needs its separately configured provider, approved knowledge and verified live actor/staff integration. No keys were invented, no draft knowledge published, and live business authentication forwarding has not been verified against MySQL.
5. File upload/storage is NOT_IMPLEMENTED. Connected equipment accepts a validated HTTPS/image URL; browser data URLs are demo-only. No contact email/SMS delivery exists.
6. Legacy bookings without verifiable policy/payment snapshots are read-only and conservatively retain applicable reservations. An operator must reconstruct historical evidence record-by-record; no fabricated policy or destructive bulk reset was used. Unsupported legacy day/week/month rates remain stored/available through legacy APIs, outside approved v1 UI packages.
7. The write mutex is deliberately global; the workspace projection loads a full scoped catalog and uses some per-room reads. Production-sized datasets need bounded/paginated projections, finer resource lock ordering and load tests. Legacy independently maintained writers must adopt the same locking protocol. No load/throughput certification.
8. Further acceptance coverage is needed for every lifecycle transition and failure/reconciliation combination against MySQL, including real multi-process shared-equipment contention, duplicate collections and rollback fault injection. The provided harness covers many but does not exhaust workflows A–K. Native mobile devices and assistive technologies were not tested.
9. A failed/processing prior refund conservatively blocks creation of a second obligation until reconciliation. This is a safe boundary, not a complete multi-obligation financial workflow. No unsupported damages/tax/contract policy was invented.

Exact install, migration, seed, startup, worker, build and test commands: [development guide](development.md). Endpoint permissions/payloads and ledger rules: [API reference](api-reference.md). Feature statuses: [integration matrix](integration-matrix.md).
