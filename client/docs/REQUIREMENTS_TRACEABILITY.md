# Requirements traceability

Authority: `references/StudioHub_Design_Business_Specification_v1.0.md`. All entries below refer to executable mock behavior, not production backend guarantees.

| Source requirement | Route / implementation | Evidence |
| --- | --- | --- |
| §2 exact physical room hierarchy | `/rooms`, `/rooms/[id]`; models, fixtures, RoomManagement | Exact A102 test; browser journey selects A102 |
| §3 StudioBlank identity | Root DESIGN.md, globals.css, self-hosted font packages | Google DESIGN.md lint: 0 errors/0 warnings; Impeccable detector: [] |
| §4 homepage/search/detail | marketplace.tsx; desktop 288px left filters, horizontal rows, gallery | Browser captures at 360, 390, 768, 1024, 1440px |
| §4 modal booking flow | wizard.tsx; native dialog, three steps, inline login | Production browser journey, validation and dialog-focus assertions |
| §5 auth and profile | `/login`, `/register`, `/register/host`, `/profile`; accounts.tsx | Registration/unique-email domain test; mock role login browser tests |
| §5 Host approval/onboarding | `/admin/host-requests`, `/host/studios`, rooms/equipment/rates/settings | Domain test and browser approval; Studio/type/unit create/edit forms |
| §6 availability, capacity, equipment | validateSelection, overlaps, buffered peak inventory sweep | Overlap, 30min boundary, sequential/shared equipment and capacity tests |
| §6 lead time / payment window | engine create/payment/advance | 27h lead vs 26h; deadline, failure retry, processing grace tests |
| §6 two-hour Host timeout | centralized tick | Exact timeout test, automatic full refund and system audit |
| §7 independent lifecycles | Booking/Payment/Refund model; finance panels | Rejection produces cancelled+paid+pending refund; browser state captures |
| §7 refund retry limits | refund command, verified mock outcomes; resolve_refund | Automatic maximum 2 retries, recovery and escalation tests |
| §8 snapshot cancellation | policy copied at creation; cancellation calculation | Snapshot survives Studio policy change; paid cancellation no strike |
| §8 strikes and restoration | strike, restore, request_restore; `/support`, `/admin/users` | Three-strike limit, active reset/history retention, request tests |
| §8 no-show | centralized tick at planned end | No-show test: no completed, no refund, no new strike |
| §9 reschedule | customer request modal; Host approve/reject/withdraw | Old slot retained, one success, deposit retained, excess refund tests |
| §10 check-in/out and overtime | Host BookingDetail; checkin/checkout/collect | Late arrival, unpaid completed, 31min→2 blocks, next-slot conflict, partial/double collection tests |
| §4 Host timetable/Kanban | `/host/calendar`, `/host/bookings` | Day/week, physical-room/type/status filters, time-scaled events; responsive captures |
| §4 inventory and reports | Host rooms/equipments/rates/reports/settings | Stateful forms/tables; report values derive from shared bookings |
| §4 Admin permissions | role checks in execute; `/admin/*` | Admin cannot edit Host rates or cancel at/after start; reasons required |
| §4 audits | audit event history, `/admin/audit-logs` | Mutation audit test, system actor test; filterable immutable UI |
| §12 deterministic demo | scenarioState, DemoTools, centralized State.now | Development-only time advancement/reset/role/scenario controls |

## Verification scope

34 automated domain tests pass. Typecheck, ESLint and optimized Next.js build pass. Production-browser QA covers the main booking/deposit/approval/cancellation/refund-state journey, persistence, native-modal keyboard containment, mobile filtering and empty results, lightbox Escape, Host approval and route smoke tests. Responsive overflow checks cover public and Host surfaces at all five requested widths; Admin split view is captured at 390/1440px.

Visual review evidence lives under `.impeccable/review/production/` (ignored local artifacts). Initial independent review requested clean production captures and booking state evidence, rather than a redesign. Final disposition: Ship at targeted verdict-pass scope; the named corrections were scored resolved. See `VISUAL_REVIEW.md` for findings, resolutions and review limits.

## Explicit implementation limits

- Fixed, controllable demo clock; no background server scheduler, gateway or real concurrency.
- One default Studio fixture; additional approved Hosts can create their own local Studio/types/rooms. No server image uploads.
- Session fixture uses 08:00–12:00; custom session boundary editing remains a future extension. Combo fixtures use hourly multiples without invented discounts.
- No real password, online balance checkout, legal/tax/damage policy or provider-specific dispute workflow.
- Browser QA samples representative workflows; it does not exhaust every form/state combination. Automated domain tests cover the financial and scheduling exceptions independently.
