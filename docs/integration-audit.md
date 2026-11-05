<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](api/FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# StudioHub integration audit — 2026-11-02

Scope: frontend and documentation only. The user explicitly prohibits backend edits. `server/`, `helpdesk-php/`, database scripts and backend tests remain unchanged.

## Initial architecture and baseline

- Actual frontend: Next.js App Router, React 19, TypeScript, Tailwind; current design uses Bricolage Grotesque / DM Mono. `components/application.tsx` routes the current UI; `components/store.tsx`, `domain/engine.ts` and `data/repository.ts` implement a browser-only demo.
- A second set of feature modules and explicit routes was merged from a different frontend. They import absent providers, schemas, form and table primitives. They cannot run against the current app.
- `package.json`, `tsconfig.json`, `globals.css` and README contain committed merge markers despite a clean initial Git status. Baseline `npm.cmd --prefix client run typecheck` fails with EJSONPARSE before TypeScript starts.
- PHP API uses FastRoute, PDO/MySQL, JWT and role/ownership middleware. `server/public/index.php` is the actual route inventory; `server/openapi.yaml` documents the existing contract. Modules: Auth, Catalog, Studios, Rooms, Equipment, Booking, Admin, Shared.
- MySQL schema/seed/triggers are in `server/database/`. Booking creation uses AvailabilityService, PricingService, BookingService and transactions. Payments call `processSandboxPayment`; refunds are audit amounts with `recorded_only` status, not money transfers. Cron expires bookings.
- Helpdesk uses the existing Next route bridge to the separate PHP helpdesk. No provider credential is added to client code.
- PHP CLI is absent from PATH. Docker CLI exists; daemon/API availability must be checked. No database migration, seed, payment or destructive test is authorized implicitly by verification.

## Findings and dependency map

1. P0: invalid frontend configuration prevents all checks. Resolve conflicts preserving current UI rules and useful integration styles.
2. P0: current authentication and business operations are entirely local; old integration modules are incompatible. Establish explicit API/demo mode, one token namespace and an API session provider before wiring pages.
3. P1: restore explicit routes to the current Application shell. Wire catalog → room → availability/price → create → booking detail/list → sandbox deposit → host transitions to existing APIs. Never submit demo IDs or fall back to fake success.
4. P1: host/admin management needs API-backed role gates, forms, lists and server statistics. Preserve navigation; unsupported capabilities must display their limitation instead of using local data.
5. P1: business policy requested in the attachment exceeds the existing contract: separate Room Types, rescheduling, real refunds/reconciliation, no-show/overtime/collections, two-hour host approval, strike restrictions, host applications and audit browsing are not fully exposed. Frontend cannot enforce these server guarantees. Do not fabricate endpoints or claim compliance.
6. P2: stale availability, timezone conversion, duplicate submits, storage access, validation and expired sessions require targeted handling and tests.

## Verification boundary

Build/type/lint success is not proof of persistence, ownership, concurrency or actual financial processing. Final results and remaining environment blockers are recorded in `integration-verification.md`; feature status is in `integration-matrix.md`.

## Final implementation decisions

- Repair the current frontend shell instead of restoring the unrelated missing provider/UI architecture. Explicit App Router pages now mount the same Application shell as the catch-all route. Incompatible feature implementations were replaced with adapters using current design classes and existing API contracts.
- Preserve the homepage hero, illustrations, fonts and palette. Its catalog/featured records use API data in connected mode; keep the complete existing demo behind an explicit flag.
- Add a separate API session provider, exact per-tab token key, refresh-on-focus, conditional expiry and protections against an old refresh overwriting a new login/logout. Do not modify authentication middleware or claim JWT revocation.
- Render field validation for account and generic management forms, guard duplicate submissions, refetch mutations and fail visibly on network errors. Hold/payment/approval deadlines and final prices remain server values.
- Use configured rate durations and Vietnam-local serialization; reject invalid calendar dates. Booking drafts may use sessionStorage; persisted bookings/payments/inventory never use the demo store in API mode.
- Keep API Helpdesk bridge source unchanged. The existing widget/adapter is still a separate guest-oriented integration; authenticated marketplace context is a remaining dependency.
- Use Webpack for dev/build because the installed Turbopack cannot resolve its PostCSS helper. Merge the duplicate Next config's useful setting into the canonical `.mjs` file. No new package dependency is required.
- Preserve obsolete component test source as `*.legacy.txt` because its imported architecture and fixtures do not exist. Add runnable HTTP/timezone tests and browser contract scenarios instead of excluding failures from TypeScript configuration.

## Security / data integrity review limits

Static reading confirms parameter binding, role/ownership middleware, booking/equipment transaction locks, database foreign keys/checks and decimal money in the existing PHP/schema. This is not a concurrency/security certification. The actual database state and installed migrations could not be inspected because PHP/API/MySQL are unavailable. Host listing is public-only, historical policy coverage is incomplete, booking creation has no exposed idempotency-key contract, and requested refund/retry/reschedule/strike/report behavior is not fully represented. Do not infer server business rules from the passing browser-demo engine tests.

No endpoint, backend test, SQL file, migration, real `.env` or financial service was changed. No migrations, seeds, destructive database commands or real payments were run. See the final matrix for explicit PARTIAL/BLOCKED items.
