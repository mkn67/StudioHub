# StudioHub Host Workspace 2.0

## Scope and baseline

The connected Host application was redesigned in place. Authentication, authorization, ownership, PHP services, schemas, bookings, payments, refunds, pricing, availability and inventory calculations are unchanged. Customer pages and the Admin shell keep their current presentation. The explicitly separate demo workspace remains on its existing local data model; no demo data is substituted into connected screens.

The working tree already contained substantial uncommitted integration work. No reset, checkout, commit, push or deployment was performed. Baseline: 140 frontend tests passed before application edits.

The audit found a public Customer header stacked above the operational sidebar, a shared Overview/Reports implementation, long inline create/edit forms, disconnected room-selection buttons, equipment text blocks without visual identity, and a calendar represented as a date form plus interval text. The richer legacy components in `components/operations.tsx` were inspected. Their information hierarchy and icon treatment were useful, but their local demo store, business model and fake operational metrics could not be reused as connected data.

## Architecture

`Application` omits its public header only on connected `/host` routes. `BackendOperations` retains the existing session/role gate and delegates Host content to `HostWorkspace`. Its Admin rendering and report behavior remain equivalent.

```text
HostWorkspace
├── HostSidebar (248px, collapsible to 80px)
├── HostMain
│   ├── HostTopbar (64px)
│   └── HostPageContent
└── Existing Modal for mobile navigation and editing
```

`HostContext` shares the existing owned-Studio resource and selected Studio between resource pages. It is local presentation state, not a parallel domain store. It selects the first returned owned Studio by default, retains an explicit selection within the mounted workspace, and falls back safely if a selected Studio disappears. Existing route aliases (`studio`, `equipment`, `pricing`, `analytics`) remain supported.

Reused infrastructure: canonical `hostLinks`, Next `Link`, `useApiSession`, `apiRequest`, `useResource`, `useApiAction`, native tables, Lucide icons, and the existing `Modal` with its dialog/focus/motion infrastructure. The existing `BackendBookingDetail` is reused unchanged, including all action buttons, confirmation prompts and status PATCH semantics.

## Host design system

All Host rules are scoped under `.host-workspace` or `.host-dialog`. No shared Customer/Admin color, typography or spacing token was changed.

- Canvas `#F8FAFC`, white operational surfaces, cool neutral `#F1F6F9`.
- Ink `#20323E`, text `#172B3A`, muted `#526675`, border `#CBD5E1`.
- Cyan action `#0D7490`, hover `#09637C`.
- Pastel cyan, blue, mint, amber, lilac and coral for operational emphasis and status.
- Corner scale 8 / 12 / 16px; hard shadows 2px and 4px for navigation/actions/important summaries. Dense tables use dividers rather than per-record decorative cards.
- Be Vietnam Pro, self-hosted in weights 400/500/600/700, with `font-display: swap`. Font files are unmodified Google Fonts assets from `google/fonts/ofl/bevietnampro`, distributed with their SIL OFL license. No build-time font download or new dependency is required.
- Page titles 26–30px, section titles 18–24px, body/form/table text 14px, readable supporting metadata and tabular numbers. Primary actions have cyan fill, Ink borders and pressed shadow feedback. Reduced-motion preferences disable the simple interaction transforms.

Shared presentation components include `HostPageHeader`, `HostPanel`, `HostKpi`, `HostStatusBadge`, `HostEmptyState`, `HostResourceState`, `HostSkeleton`, `HostImage`, `HostAddButton`, `HostPagination` and `HostEditor`. Native tables and scoped button styles avoid unnecessary wrapper components.

## Page-by-page changes

| Page | Result |
|---|---|
| Overview | Welcome/context, four API-backed operational KPIs, pending previews, today's activity within the clearly labeled latest-50 scope, owned Studios and useful resource shortcuts. No report form or fabricated financial summary. |
| Studios | List-first horizontal summaries with icon/real-cover support, location/contact, actual status and correctly scoped “chưa ẩn” counts. Supported POST/PATCH forms open in modals. |
| Rooms | Physical rooms grouped by actual public space classification, with images/fallback icons, area, capacity, status and compact actions. Supported creation/editing and image upload remain connected. Public-catalog scope/page is explicit; no fictional Room Type CRUD is added. |
| Equipment | Compact table with 64px imagery/category icons, name/brand/category, quantity, price, real status and edit action. Search filters the displayed list. Create equipment/category and edit equipment use modals. |
| Pricing | Room-context selector and comparison table showing original units, duration, price, min/max units and effective dates. Creation/editing is modal. No calculated discount, featured badge or invented pricing hierarchy. |
| Calendar | Day/week timetable, real time axis, date navigation, exact occupied blocks and interval details. Cross-midnight clips and overlapping lanes are visual only; original timestamps stay intact. No inferred customer, status or separate cleaning buffer. |
| Bookings | Accessible status filter buttons, API totals, readable operational table, semantic status badges, proper empty/error/loading states and pagination. Existing detail/actions remain intact. |
| Reports | Compact preset/custom date toolbar, actual server KPIs, aggregate utilization visualization and summary table. The unavailable daily trend is stated honestly. Exclusive report end dates and current-resource scopes are explicit. |
| Policies | Deliberate unavailable state with navigation back to work. No unsupported live policy form or non-persisting Save button. |

## Integration preservation

All create/edit forms still submit to the existing endpoints with their original method and field mapping. Numeric inputs serialize to numbers; equipment category select IDs retain the previous string serialization; room creation retains numeric `space_type_ids`. Empty optional fields are omitted as before. Save errors preserve input, show server messages and field errors; a success banner/modal close occurs only after the API resolves successfully.

Room images retain multipart submission, supported MIME validation, the existing 5MB limit and `is_primary` checkbox behavior. Neither Studio nor equipment media upload was invented.

Public room pagination and owner filtering remain in their existing order because changing that data contract belongs to the later API task. Status transitions still use the unchanged booking detail component. All analytical values are taken directly from the statistics response. Report presets map accurately to the existing half-open interval; calendar dates retain their separate inclusive-end semantics.

No PHP, database, authentication/session, shared API transport, booking detail/wizard, payment or Helpdesk implementation was modified in this redesign. Existing unrelated working-tree edits in those areas were left in place.

## Responsive and accessibility work

- Desktop uses the sidebar plus remaining content width; collapse affects only the desktop sidebar.
- Tablet/mobile use a native modal navigation drawer, without the public Customer header.
- KPI grids reduce to two columns; operational panels stack; toolbars wrap; tables/calendar scroll inside labeled focusable containers instead of widening the page.
- Mobile editors use the full viewport, one-column fields, internal scrolling and sticky action footers.
- Dialogs reuse focus trapping, Escape handling, focus restoration, background scroll locking and existing restrained motion. Dirty editors require an explicit discard action; saves prevent dismissal while pending.
- Navigation uses `aria-current`; filters/presets expose pressed state; controls have stable accessible labels. Field errors use `aria-invalid` and `aria-describedby`. Resource images handle both absent and failed URLs with meaningful placeholders.
- A responsive audit found that a visually hidden table-heading label used the viewport as its containing block. Positioning the scroll container correctly fixed the actual overflow source without hiding page overflow.

## Verification

Commands executed from `client/`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck
node scripts/host-ui-qa.mjs
```

| Check | Result |
|---|---|
| Baseline tests | 140 passed before edits |
| Final unit tests | 144 passed, including four focused calendar/report presentation tests |
| ESLint | Passed |
| Production build | Passed, including Next's TypeScript compilation and static generation |
| Standalone TypeScript | Passed after build completed |
| Live browser/responsive QA | All nine Host screens checked at 360, 390, 768, 1024, 1280, 1440 and 1728px; no public header or page-level horizontal overflow |
| Form/component browser QA | Studio, room, equipment/category, rate and room-image payloads checked using intercepted browser fixtures; validation, save/refetch, dirty cancel, keyboard focus and mobile drawer verified |
| Operational browser QA | Exact interval geometry/detail, booking filters/existing status PATCH, report preset/custom date bounds, loading/error/retry/empty states, role gates and Customer/Admin shell separation checked |

The first standalone typecheck attempt raced a simultaneous Next build removing/recreating generated `.next/types` files. The final standalone check ran after build and passed; no TypeScript workaround or config change was made.

The browser QA script uses real PHP/MySQL reads and Host authentication for normal views. Live UI inspection does not issue resource mutations. Create/edit/upload/status tests intercept requests in an isolated browser context, using copies of existing API responses plus an explicitly labeled booking fixture compatible with the existing integration-test shape. These checks verify frontend contracts and interactions, not new backend business behavior. No fixture writes reach PHP/MySQL.

No standalone React component-test runner is configured in the current repository. Component interaction coverage is provided by Playwright against rendered pages; the existing Node/tsx test command remains unchanged.

Screenshots are stored in ignored `client/test-results/host-ui/`, including all nine pages across seven widths, a Studio edit modal, mobile sidebar, validation error, loading/error/empty states, populated pricing and booking tables, and an occupied timetable/detail. Rendered screenshots were opened and visually inspected; the initial pre-redesign overview is retained as `before-overview.png`.

## Remaining limitations and deferred work

The ten evidence-backed API/business topics are recorded separately in [LOGIC_AND_API_GAPS.md](LOGIC_AND_API_GAPS.md), with page, feature, current behavior, missing UI data, evidence, impact, required decision and next step for each finding.

Blocked API-dependent functionality includes complete non-public room/equipment management, true Room Type CRUD, future/inactive rate management, Studio/equipment media upload, detailed owner calendar metadata, daily analytics/financial series and policy editing. These are represented accurately, not simulated.

Seed data has no real bookings or occupied intervals for this Host, so populated booking/calendar UI is verified with browser-only fixtures. Actual external Unsplash image loading is excluded from deterministic QA; Host image fallbacks are verified. Physical touch hardware, full screen-reader audits and live AI-provider behavior were not tested. The global Helpdesk remains untouched and its existing tests still pass.

## Exact files changed in this task

| Path | Purpose |
|---|---|
| `client/src/components/application.tsx` | Omit public header/menu/session banner only for connected Host routes |
| `client/src/features/host/backend-host.tsx` | Keep role gate/Admin branch; delegate connected Host to new workspace; remove superseded inline Host views |
| `client/src/features/host/host-workspace.tsx` | Dedicated Host shell, grouped navigation, aliases, routing and mobile drawer |
| `client/src/features/host/host-context.tsx` | Shared owned-Studio resource and local selection |
| `client/src/features/host/host-ui.tsx` | Shared UI states, imagery, form modal and pagination |
| `client/src/features/host/host-types.ts` | Host-local types for existing returned API fields |
| `client/src/features/host/host-presentation.ts` | Presentation-only date ranges and interval segmentation |
| `client/src/features/host/host-resources.tsx` | Studios, rooms, equipment, pricing and supported editors/uploads |
| `client/src/features/host/host-calendar.tsx` | Accurate occupied timetable and interval detail |
| `client/src/features/host/host-activity.tsx` | Distinct overview, booking list and reports |
| `client/src/features/host/host.css` | Host-scoped design system, fonts and responsive layouts |
| `client/src/services/api/host-presentation.test.ts` | Four focused date/interval tests |
| `client/scripts/host-ui-qa.mjs` | Live/fixture browser and visual verification |
| `client/public/fonts/be-vietnam-pro/regular.ttf` | Local Be Vietnam Pro 400 |
| `client/public/fonts/be-vietnam-pro/medium.ttf` | Local Be Vietnam Pro 500 |
| `client/public/fonts/be-vietnam-pro/semibold.ttf` | Local Be Vietnam Pro 600 |
| `client/public/fonts/be-vietnam-pro/bold.ttf` | Local Be Vietnam Pro 700 |
| `client/public/fonts/be-vietnam-pro/OFL.txt` | Font distribution license |
| `docs/host/HOST_UI_REDESIGN_REPORT.md` | This implementation and verification report |
| `docs/host/LOGIC_AND_API_GAPS.md` | Deferred business/API review evidence |
