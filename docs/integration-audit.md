# Integration audit — 2026-11-02

## Initial discovery (before application changes)

Clean Git worktree. Frontend is Next 16.4.3 / React 19 / TypeScript / Tailwind 4, not the Next 14 architecture described in the root README. `app/[[...path]]/page.tsx` renders `Application`; customer, Host and Admin components share `components/store.tsx`. All business mutations run synchronous `domain/engine.ts` against `data/repository.ts` localStorage; fixtures include identities, bookings, inventory and reports. Pricing editors use a temporary draft provider. Preserve the existing editorial styles, fonts, images and navigation.

PHP 8.2+ API in `server/` uses FastRoute, PDO, Firebase JWT, controllers/services/repositories. Only auth, rooms, equipment, lookups, health and verification routes are registered. Authentication reloads current database roles; registration forces customer. Logout is a no-op and JWT has a known fallback signing key. `Core/Db` and `Config/Database` duplicate connections. CORS is overly permissive in its headers. Booking expiry CLI is a placeholder.

MySQL schema has 16 InnoDB tables, money DECIMAL, FKs and overlap triggers. No room-type relationship, policy snapshots, independent payment/refund state, payment attempts, strikes, rescheduling or collections. `pending` means unpaid in old schema, contradicting approved rules. Trigger overlap checks alone cannot serialize concurrent reservations. Old migration automatically seeds and cannot safely upgrade existing schema. No database reset is authorized or needed.

Helpdesk is an existing independent PHP module using its own persistence, Next HTTP bridge, provider boundary, knowledge publication gates and tests. It already fails closed when configuration/provider is unavailable. Do not replace it or publish its draft knowledge. Business authentication must be forwarded by the bridge; demo browser personas are not authentication.

## Baseline evidence

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd run test`: blocked inside sandbox by `uv_os_get_passwd ENOMEM` in tsx.
- `npm.cmd run build`: started independently; results recorded in final verification.
- `helpdesk-php/bin/php.cmd helpdesk-php/tests/run.php`: 32 pass / 130 assertions, mocked provider.
- PHP runtime exists at ignored Helpdesk portable runtime, PHP 8.5.12, PDO MySQL available.
- `server/vendor/autoload.php` exists, PHPUnit does not; `server/vendor/bin/phpunit` unavailable.
- `docker info`: engine pipe does not exist; no running Docker database verified. No real env file was read or changed.

## Dependency and risk map

P0: demo identities must never authorize real records; known JWT fallback; no server booking lifecycle; no transaction-safe room/equipment reservations; no payment/refund idempotency; incompatible status semantics.

P1: all customer/Host/Admin mutations, catalog discovery, reports and persistence disconnected. Rich pricing config must survive refresh and be validated by PHP. Independent payment, refund, booking and collection states required. Scheduler must run without page visits.

P2: asynchronous forms need awaited results, duplicate-submission protection, useful errors and retry; connected failures must not load fixtures. Image upload absent; keep URL validation and reject data URLs. Public calendars must contain only resource intervals, never customer details.

Implementation order and final evidence: [plan](implementation-plan.md), [matrix](integration-matrix.md). Statuses indicate tested scope, not production certification.

## Final review

Implementation proceeded through the initial dependency order into frontend/PHP integration, versioned SQL, workflow tests and browser verification. Detailed file-by-file changes, actual checks and unresolved boundaries are in [integration-verification.md](integration-verification.md). The matrix now records final status for every major feature. In particular: rules/regressions and unavailable-backend behavior are tested; MySQL persistence, DDL and actual concurrency remain blocked. Live financial adapters, uploads, historical evidence reconstruction and Helpdesk external configuration are explicitly incomplete. The implementation does not claim a fully verified deployment.
