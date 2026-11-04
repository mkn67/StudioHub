# Integration verification — 2026-11-02

> Cập nhật ở tác vụ Docker Compose sau báo cáo này: PHP/MySQL/Helpdesk đã được khởi chạy trong Docker và smoke test HTTP thật đã thành công. Xem [xác minh Compose](docker-compose.md). Các mô tả môi trường chưa chạy bên dưới là baseline của tác vụ tích hợp frontend trước đó, không phải trạng thái runtime mới nhất.

## Outcome and scope

Frontend integration has been implemented against the existing PHP contracts. The application is **not verified as a complete PHP/MySQL deployment**. The user's restriction was followed: zero changes in `server/`, `helpdesk-php/` or `database/`; no endpoints/migrations added, no backend tests edited, no real `.env` overwritten, no commit created.

Initial Git status was clean. Initial npm checks could not start because committed merge-conflict markers made `client/package.json` invalid. Additional markers existed in tsconfig, CSS and README; incompatible route/feature imports referenced files not in this repository.

## Checks actually executed

| Check | Result | Evidence / boundary |
|---|---|---|
| `npm.cmd run typecheck` in client | PASS | No ignored source errors; current routes and source check successfully |
| `npm.cmd run lint` in client | PASS | ESLint current source; no errors/warnings |
| `npm.cmd run test` in client | PASS: 134 tests, 0 failures | Existing demo-domain, existing Helpdesk adapter/bridge and new HTTP/timezone suites |
| Production build in existing environment | PASS with Webpack | All 14 static pages generated, dynamic routes compiled |
| Production build with `NEXT_PUBLIC_DEMO_MODE=false`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` | PASS with Webpack | Same checks; connected bundle used for browser QA |
| `node scripts/integration-qa.mjs` | PASS: 16 scenarios, 55 intercepted HTTP requests, no uncaught page errors | Chromium production frontend; fixture responses emulate PHP envelopes; no actual PHP/database is used |
| Mobile visual check | PASS in scoped catalog smoke | 390×844 screenshot inspected; no horizontal page overflow; current fonts/palette/shell preserved; not a complete visual/accessibility audit |
| `git diff --check` | PASS | No whitespace errors |
| Backend/database diff | Empty | `git diff --name-only -- server helpdesk-php database` has no output |
| Local PHP CLI | BLOCKED | `php` is not recognized on PATH |
| Docker backend runtime | BLOCKED | Docker daemon pipe `//./pipe/docker_engine` absent; local config read also denied in sandbox |
| API availability | BLOCKED | Read-only requests to `127.0.0.1:8000/api/health` and `127.0.0.1:8010/` failed to connect |
| PHP/MySQL persistence, authorization, payment concurrency, reservation races | NOT RUN | Need a running, configured development/test API/database; tests that create records were not run against an unknown database |

The initial default Turbopack build failed to resolve `@vercel/turbopack/postcss`. Scripts now explicitly use Webpack; final build succeeds without additional packages. The Windows sandbox initially blocked tsx's `os.userInfo` with `uv_os_get_passwd ENOMEM`; the same normal test command passed under the tool's approved execution context. This was a runner restriction, not a failing application assertion.

## Browser scenarios

1. Existing homepage hero renders with API-sourced featured rooms.
2. Login sends credentials to the API and opens authenticated booking list.
3. A changed rental interval invalidates the prior quote and disables create until rechecked.
4. Booking creation sends actual room/rate IDs; sandbox payment requires explicit consent and leaves the booking pending.
5. Host confirmation sends PATCH and Customer refetch shows the returned updated booking.
6. Guest access to Admin routes displays the role gate without mounting Admin data UI.
7. Admin account list uses API records; unsupported Host-application page shows a limitation.
8. Host creates a Studio and the list refreshes from the transport fixture.
9. Host creates a configured room rate and the rate list refreshes.
10. Host creates equipment for the selected Studio/category and the inventory list refreshes.
11. Mobile catalog renders at 390×844 without horizontal document overflow.
12. Failed room request shows an error and no demo-room fallback.
13. Profile PATCH persists in the HTTP fixture and refresh reloads the edited name.
14. Customer cancellation invokes the endpoint and refetches the cancelled state.
15. Logout clears only the API token and returns to the homepage.
16. Customer registration uses the PHP body/envelope and opens the booking list.

These verify frontend behavior only. The script stores its test state in process memory, not MySQL. It does not establish cross-user ownership enforcement, booking conflicts, refund eligibility, cancellation policy correctness or actual financial settlement.

New unit tests verify exact session namespace, Bearer headers, envelope/error parsing, JSON/multipart behavior, session-expiry events, no fake fallback, configured rate duration, invalid/overflow date rejection and date serialization under UTC/Los Angeles/Vietnam timezones. Existing domain tests include rescheduling/refunds/strikes, but those exercise the isolated demo engine and **do not** prove the PHP backend implements those policies.

## Remaining limitations / dependencies

- Start PHP/MySQL and apply the existing versioned backend setup in a dedicated development/test database before claiming persistence/E2E verification. See `server/README.md`; no backend startup/migration was performed here.
- Existing backend policies differ from the attachment: 15-minute holds and configurable Host response hours; no fully exposed two-hour approval/processing-grace/strike restriction contract; completion requires full payment. The browser does not override these server rules.
- Room Types are not separately modeled in the API. Public-only listing cannot restore a hidden room/equipment item through a complete private Host browse flow. Advanced attributes/amenities/bundles and maximum/effective-to rate editing are incomplete in the new API UI.
- No actual payment/refund provider is integrated. Payment endpoint is sandbox. Refund amounts are recorded in audit logs, with no money transfer/reconciliation/retry UI contract.
- Reschedule, no-show, overtime, additional collections, restoration requests, Host applications, Admin moderation and audit browsing require backend contracts. Unsupported pages are explicit. No invented endpoint or successful local mutation substitutes for them.
- Report API currently provides booking/revenue/occupancy/resource counts. Deposits/refunds/debt and weekly/monthly popularity require more server reporting.
- Booking creation lacks an exposed idempotency contract. UI blocks simultaneous submissions, but transport uncertainty and cross-process duplicate creation remain backend concerns. Concurrency correctness was not tested.
- Helpdesk PHP/provider/bridge credentials are still required for live responses. Marketplace session is not attached to widget requests, so private booking/account tools are not claimed as integrated.
- Full browser workflow coverage for room updates/uploads, rate/equipment edits, all lifecycle transitions, report reconciliation, account mutations and expired/locked users remains to be run against the actual backend.

## Significant files and purpose

| Files | Purpose |
|---|---|
| `client/package.json`, `tsconfig.json`, `next.config.mjs`, removed duplicate `next.config.ts` | Resolve conflicts, restore runnable scripts, Webpack build and one canonical config |
| `client/src/app/**/page.tsx`, `layout.tsx` | Restore existing Application shell; provide API session without absent architecture imports |
| `client/src/components/application.tsx`, `marketplace.tsx`, `store.tsx` | Route API/demo explicitly, preserve homepage, isolate browser mutations |
| `client/src/components/api-session.tsx`, `api-accounts.tsx`, `api-ui.tsx` | JWT session, real account forms, mutation/error helpers |
| `client/src/services/api/client.ts`, `contracts.ts`, `use-resource.ts` | Shared transport/types/timezone/refresh lifecycle |
| `client/src/features/{marketplace,booking,host,admin}/...` | Replace incompatible modules with current-design API integrations |
| `client/src/app/globals.css` | Keep current conflict branch; add scoped integration layout/table/gallery styles |
| `client/src/services/api/*.test.ts`, `client/scripts/integration-qa.mjs` | Runnable HTTP/timezone and production-browser checks |
| `client/tests/components/*.legacy.txt` | Preserve original tests referencing the absent frontend architecture |
| `client/.env.local.example`, `client/README.md`, root `README.md` | Safe example and actual run/mode/check instructions |
| `docs/integration-*.md` | Initial audit/plan, final matrix, endpoint reference and truthful verification record |

## Run commands

From `client/`, run `npm.cmd ci`, configure `.env.local` from the example without overwriting an existing file, then `npm.cmd run dev`. For production, run `npm.cmd run build` and `npm.cmd run start`. Validation: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`. Browser QA: build API mode with the public URL exactly `http://127.0.0.1:8000`, start frontend on `http://127.0.0.1:3000`, then `node scripts/integration-qa.mjs`. The existing backend setup, migrate/seed and test commands remain in `server/README.md` and were not changed.
