# StudioHub

A complete Vietnamese studio rental frontend demo: a searchable marketplace, customer bookings and simulated deposits, a host workspace, and an administrator workspace. All three roles use the same normalized, versioned browser database.

This is a **frontend-only demonstration**. Authentication, authorization, payment outcomes, approval, and refunds are simulated. There is no backend, payment gateway, server-enforced authorization, or real money movement. The original requirements are preserved in [the implementation brief](docs/IMPLEMENTATION-BRIEF.md).

## Run locally

Use Node.js 22.13+ and npm. The implementation was verified with Node 24.21 on Windows.

```sh
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` and `npm.cmd` if the execution policy blocks `npm.ps1`.

Open **http://127.0.0.1:3000**. Be Vietnam Pro and the demonstration images are bundled locally; rendering does not require Google Fonts or remote image hosts.

```sh
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
npm run start
```

`npm run verify` runs typecheck, lint, unit/component tests and the production build. Browser tests are a separate command and start a local development server if one is not already available. Playwright writes its report to `playwright-report/index.html` and screenshots to `.studiohub-runtime/screenshots/`.

To test an already running production server, set `PLAYWRIGHT_BASE_URL` to its local URL before `npm run test:e2e`; Playwright then uses that server without starting another one.

## Demo mode and accounts

`.env.local` contains `NEXT_PUBLIC_DEMO_MODE=true`. Restart the server after changing it. This setting enables the labeled sample-account shortcuts and confirmed data reset. Turning it off does not convert the application into production authentication or payments.

Every seeded account uses the password **`StudioHub123`**.

| Account         | Email                     | Behavior                                                                           |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| Customer        | `khach@studiohub.demo`    | Create bookings, simulate deposits, follow and cancel eligible orders              |
| Approved host   | `chu@studiohub.demo`      | Manage owned studios, rooms, inventory, rates and bookings                         |
| Administrator   | `admin@studiohub.demo`    | Approve hosts, lock accounts, hide venues, maintain catalogs, inspect audit events |
| Pending host    | `choduyet@studiohub.demo` | Account Status until an administrator approves the application                     |
| Rejected host   | `tuchoi@studiohub.demo`   | See the reason, edit the application and resubmit                                  |
| Locked customer | `bikhoa@studiohub.demo`   | Account Status with the recorded lock reason                                       |

Use normal login to change accounts. There is no role impersonation widget. Newly registered passwords are stored as salted PBKDF2 digests. That is a demo storage choice, **not a security boundary**: browser data and client code can be changed by the browser owner. Do not enter real credentials or personal data.

## Main routes

The application contains all 35 specified route patterns:

| Area                         | Routes                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketplace                  | `/`, `/studios`, `/studios/[slug]`, `/become-a-host`                                                                                                                                         |
| Authentication and account   | `/login`, `/register`, `/register/host`, `/account`, `/account/status`                                                                                                                       |
| Customer booking and payment | `/booking/[slug]`, `/payment/[code]`, `/payment/[code]/result`, `/my-bookings`, `/my-bookings/[code]`                                                                                        |
| Host operations              | `/host`, `/host/bookings`, `/host/bookings/[code]`, `/host/calendar`, `/host/analytics`                                                                                                      |
| Host management              | `/host/rooms`, `/host/rooms/new`, `/host/rooms/[id]/edit`, `/host/equipment`, `/host/pricing`, `/host/studio/settings`                                                                       |
| Administrator                | `/admin`, `/admin/approvals`, `/admin/users`, `/admin/users/[id]`, `/admin/studios`, `/admin/studios/[id]`, `/admin/categories`, `/admin/bookings`, `/admin/bookings/[code]`, `/admin/audit` |

Try `/studios/phong-nang`. Sample order codes are `SH-DEMO-001` through `SH-DEMO-012`. Dynamic detail routes check existence and ownership and show a meaningful missing-record state. Protected routes preserve a validated internal return destination after login.

The host studio selector intentionally starts with **Tất cả Studio** for the overview and booking list. Select a specific studio for room, inventory, rate, calendar, and settings management. An approved host with no studios receives a first-studio setup state; approval never creates a studio automatically.

## Demonstrate the complete booking flow

1. Search the public marketplace by **Bình Thạnh**, open **Phòng Nắng**, and choose an available future interval, for example 09:00–11:00 at least ten days from today.
2. Check availability, continue to booking, choose equipment, and continue to confirmation. If anonymous, log in as the sample customer; the selected interval and equipment survive login.
3. Review the itemized price and contact information, accept the acknowledgment and create the order. Choose **Tôi đã thanh toán** on the payment page to record the simulated deposit immediately.
4. The order now shows **Chờ xác nhận**, not **Đã xác nhận**. A successful simulated deposit does not confirm the rental.
5. Open another tab on the same origin, log in as the approved host, and find that exact order in **Đơn thuê**. Confirm it. The customer tab updates from the shared database.
6. In the customer tab, cancel an eligible future order. Both tabs show the cancellation and availability is released. A paid deposit shows **chờ xử lý theo chính sách**; the demo never claims a real refund.
7. Create another order and exercise failed payment and retry. Retry keeps the existing order code and adds a payment attempt rather than creating another order.

Other useful demonstrations: approve the pending host as admin; hide Nắng Studio and observe its removal from public search while existing booking snapshots remain readable; lock the customer account in an admin tab and watch the customer tab move to Account Status.

## Data and reset

`src/services/storage/adapter.ts` is the only module that accesses browser storage. It validates database version 2 with Zod and migrates the known version 1 contract. Unknown or malformed stored data is retained and a recovery screen offers a **confirmed** reset. Storage access and quota failures produce actionable error states.

- `localStorage`: one database at `studiohub.demo.database`, with users, applications, studios, rooms, catalogs, equipment, rates, bookings, payment attempts and audit events.
- `sessionStorage`: the current tab's session, booking drafts and workspace preferences. Tabs can therefore sign in as different accounts while sharing the domain data.
- Every mutation reads the freshest validated database, checks permission and invariants, updates a revision, persists, then publishes. Browser `storage` events refresh other tabs.
- Price, equipment, room, rules and contact snapshots are written when the order is created. Later price or profile edits do not rewrite historical orders.
- Expiry ticks release unpaid holds and record a system timeline event. Confirmed bookings are never automatically marked completed.

To reset, log in, open the account menu and select **Đặt lại dữ liệu demo**, then confirm. Reset restores coherent sample data and logs out the current tab. Sample dates are relative to the reset date in Vietnam. Other tabs refresh the shared database. Reset affects this app's namespace, not unrelated browser storage.

E2E tests use isolated `studiohub.test.*` namespaces and a fixed Vietnam-local clock. They do not change ordinary demo data. `?fixture=NAME` selects a test namespace only in demo mode; use the ordinary URL in a fresh tab for a normal demonstration.

## Architecture

Next.js App Router, React, strict TypeScript and Tailwind CSS. Thin route files compose feature modules. Server layouts and metadata surround client-only interactive features. Local shadcn-style primitives use Radix for dialog, sheet, drawer and menu behavior; forms use React Hook Form and Zod; analytics use a chart wrapper around Recharts with readable table alternatives.

Pure domain modules own pricing, Vietnam-local interval validation, overlap and cleaning buffers, shared equipment concurrency, lifecycle transitions, access resolution, effective visibility and snapshot-derived statistics. `StudioService` is the single observable mock service; `AppProvider` subscribes with `useSyncExternalStore`. There are no separately maintained customer, host or admin booking stores. Components display the one pricing calculation rather than duplicating formulas.

Related documents: [design tokens and components](DESIGN.md), [rendered design review](docs/DESIGN-REVIEW.md), [demo business assumptions](docs/BUSINESS-ASSUMPTIONS.md), [image provenance](docs/ASSETS.md), [verification record](docs/VERIFICATION.md), and [milestone progress](PROGRESS.md).

## Limitations

Data is local to one browser origin, not shared across devices or backed up. Browser event synchronization cannot provide a server transaction or lock against simultaneous cross-process writes. Image uploads are compressed and remain subject to browser quota. Demo venue names, photographs and statistics describe sample records, not real businesses or marketplace performance.

Cancellation, hold expiry, approval and completion behavior are configurable demo assumptions; payment authorization, settlement, refund eligibility, identity checks, legal terms and server access control require a backend agreement. See the assumptions document.

The requested Impeccable package was not available in the supplied environment. No Impeccable invocation is claimed; manual rendered critique, accessibility audit and responsive polish are documented instead. Direct Google Fonts download was unavailable, so the font is bundled with `@fontsource/be-vietnam-pro`.

The production dependency audit reported no vulnerabilities. The full dependency audit identified an unresolved high-severity `braces` advisory in the development-only ESLint glob dependency chain; its suggested forced fix would downgrade the Next.js ESLint tooling. The application does not use that dependency for runtime matching. Details and the audit date are in the verification record.
