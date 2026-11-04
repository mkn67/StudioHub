# StudioHub dashboard design system

Current visual precedence: [Colored dashboard refinement](COLORED_DASHBOARD_REFINEMENT.md) supersedes the earlier white-first KPI/panel guidance below. It specifies soft semantic KPI surfaces, tinted Pricing/Reports headers, 14–16px operational text, tactile secondary buttons and a single-scroll Pricing editor. [Calendar timetable refinement](HOST_CALENDAR_TIMETABLE_REFINEMENT.md) defines exact timetable geometry and viewport behavior. Earlier validation below is historical; the refinement reports contain the latest executed checks.

Host: **Cool Neubrutalist Operations Dashboard**. Admin: **Cool Neubrutalist Enterprise Console**. This is the scoped operational extension of [client/DESIGN.md](../client/DESIGN.md), with precedence for `.ops-shell` descendants only. Public Customer and Helpdesk designs are unchanged.

## Palette and hierarchy

| Role | Color |
| --- | --- |
| Canvas / working surface | `#F8FAFC` / `#FFFFFF` |
| Ink / primary text / muted text | `#20323E` / `#172B3A` / `#64748B` |
| Neutral dividers / control borders | `#E2E8F0` / `#A7B7C2` |
| Primary / hover / soft cyan | `#0D7490` / `#09637C` / `#CFEFF5` |
| Secondary / soft blue | `#4F7CCB` / `#DCE8FA` |
| Supporting mint / yellow / lilac / coral | `#BFE8DA` / `#F4D47A` / `#D5D0F0` / `#F4B3A9` |

Cyan owns primary actions, focus, selected navigation and the current-day chart bar. Supporting colors appear mainly on small KPI icon tiles; most surfaces remain white. Existing semantic success/warning/error foregrounds and backgrounds remain independent of decorative accents, always with written status labels. No pink, lime, cream or invented growth indicators.

Overview and reports use a faint 24px grid behind opaque working panels. Dense management screens have a solid canvas. No filters or translucent financial surfaces.

## Typography

Host/Admin use self-hosted Space Grotesk Variable (including Vietnamese) for UI and headings, and Space Mono 400 selectively for references and numerical metadata. Page titles use 28px/700 desktop and 26px mobile; panels 20–24px/600–650; body and tables 14px; secondary labels 12–13px. KPI totals are exact, tabular, 28–32px/700; there is no animated counting of money. Customer fonts remain unchanged. [Typography/shell refinement](DASHBOARD_TYPOGRAPHY_SHELL_REFINEMENT.md) defines the current scoped typography and booking-status palette.

## Components

`DashboardKpis`, `DashboardKpi`, `DashboardPanel` and `BookingAnalytics` provide the common overview/report layer. Existing PageHeading, Modal, native table, Kanban, calendar and pricing forms remain in use.

Strong emphasis: first KPI, active navigation and primary actions, using 1.5–2px ink borders and selective hard shadows (`3px 3px`, `5px 5px`; `7px 7px` reserved). Normal cards use a 1px neutral border, 12–14px corners and no heavy shadow. KPI cards use 16px corners; Admin KPIs use a quieter 12px variant with 2px offsets. Controls use 8px; active navigation 10px; status labels pills. Dialogs use restrained soft elevation (`0 18px 60px #20323e33`) and opaque surfaces.

Buttons provide 44px targets and a short hover/press movement only where appropriate. Secondary/destructive management controls stay restrained. Disabled controls do not move. Noninteractive KPI cards do not get pointer or pressed feedback.

## Layout and navigation

Desktop sidebar: 240px, sticky at viewport top. Collapsed: 76px, icon links retain accessible names and tooltips. The public site header is not rendered on Host/Admin routes. `studiohub.ops.sidebar.collapsed` stores only this UI preference; React state remains usable if storage is unavailable. Links preserve current routes, role guards and selected state. No fabricated account plans or sync actions. Footer uses the signed-in user's actual name and role.

The 56px workspace bar shows breadcrumbs, the truthful demo-data label, store date and a native account menu with profile/marketplace/logout access. Dates derive from `state.now` (the existing demo operating clock), never a newly hardcoded date. Logout uses the existing command and route. No redundant header offset or new business endpoint is introduced.

At 768–1100px the sidebar becomes an icon rail. Tablet/mobile have a dedicated workspace navigation drawer using the existing native Modal/motion infrastructure, with all approved routes, account/logout controls, Escape handling, focus trap/restoration and scroll lock. Below 768px it replaces the sidebar. Main gutters are 28px desktop, 24px medium and 16px mobile. Four KPI columns become two below 1200px; the analytics 2:1 grid stacks below 1024px.

## Operational surfaces

- **Host overview:** four derived KPIs, pending rental/room/customer information, accurately labeled two-hour deadline, dynamic upcoming agenda and analytics. The embedded calendar and duplicate daily-session list are removed; the dedicated calendar action remains. Collection totals retain the existing rental-month basis and are labeled accordingly. See [Host operations refinement](HOST_OPERATIONS_UX_REFINEMENT.md).
- **Analytics:** seven rental dates around `state.now`, counts computed directly from in-scope bookings, and full status distribution. All booking states are included and labeled. The bar chart has a descriptive accessible text equivalent. No fictional revenue or trends; no new chart dependency.
- **Kanban:** existing transition workflow, four columns with written status headers, neutral cards, visible pending deadline and honest filtered empty states. Horizontal scrolling stays inside the board. No drag-to-transition interaction.
- **Calendar:** week/day/date/room/type/status controls remain. A shared 0.8px/minute coordinate mapping drives labels, lines, rentals and separate 30-minute buffers. Full-day/morning/afternoon/evening presets clip display only, including overnight continuations; sticky headers share the same grid. No positional event animation, hard event shadows or heavy cell borders.
- **Rooms:** preserve Studio → Room Type → physical Room Unit groups and drill-down. Keep native disclosure/form behavior.
- **Equipment:** compact tables, consistent 52px visual thumbnails, existing name/category filters and edit actions. No invented sorting control.
- **Pricing/policies:** pricing has a compact Room Type overview and a large scoped draft editor, with one persistence action and discard warnings. It reuses the existing package/equipment/featured/crew controls and draft pricing preview. Policy panels and all formulas remain unchanged. Reports additionally rank physical rooms by week/month with transparent scheduled-booking metrics.
- **Admin:** quieter KPI styling, normal table headers, explicit state labels, split application list/details (stacked on mobile), native confirmation for application approval/rejection, reason validation and existing permission checks. Audit rows remain shadow-free, read-only, filterable and monospaced where useful.

## Motion and accessibility

Reuse the installed GSAP runtime/useGSAP lifecycle for a brief KPI entrance: opacity .8→1, Y 10px→0, 260ms with 45ms stagger. Content is visible before JS and inline properties are cleared. Scoped matchMedia contexts revert on unmount and respond to reduced motion. Existing operational heading, committed result and native-dialog motion remain in use.

CSS owns button/row/navigation hover and sidebar width transitions (140–220ms), plus a once-per-mount 280ms bar entrance. No row-by-row refresh choreography, continuous charts, animated financial values or delayed actions. `prefers-reduced-motion` disables decorative CSS movement and the GSAP entrance.

Use semantic H1/H2 headings, native labels/tables/dialogs, written status names, 3px cyan focus rings and 44px primary touch controls. Dense tables and calendars scroll locally without causing document overflow. Never shrink all operational metadata to tiny monospace text. Preserve all domain validations, audit requirements and booking/payment/refund authority.

## Verification

`client/scripts/dashboard-qa.mjs` checks every existing Host/Admin navigation screen at 360, 390, 768, 1024 and 1440px with reduced motion, plus desktop/mobile with normal motion. It captures rendered screenshots under `client/.impeccable/review/dashboard/` and exercises sidebar persistence, real store filters, equipment dialog/focus, calendar controls/buffer, Kanban, pricing control availability, mobile drawer, Admin reason validation, approval cancellation, audit filtering and role denial. Its isolated browser context uses existing demo fixtures, never a live business database.

Run TypeScript, lint, existing domain/Helpdesk tests and a production build separately. Browser assertions do not substitute for inspecting the captured rendered screens. No commit, push or deployment is part of the redesign.

### Executed verification for this implementation

- TypeScript, ESLint and production build completed successfully.
- 106 domain tests and 20 Helpdesk adapter/bridge tests passed.
- Dashboard browser QA passed 119 route/viewport/motion combinations plus the interaction checks listed above, with zero page errors.
- Existing rental-pricing browser QA passed 84 checks, including persistence and pricing form workflows, with zero page errors or provider calls.
- Rendered screenshots were inspected for Host overview, Kanban, calendar, equipment, pricing and Admin overview, users, approvals and audit; desktop/mobile samples are in the review artifact directory.
- Build retains the existing multiple-lockfile workspace-root warning. The implementation uses the existing browser demo repository; live PHP integration and real business data are outside this presentation change.
