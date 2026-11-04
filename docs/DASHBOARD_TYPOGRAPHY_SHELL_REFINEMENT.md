# Dashboard typography, workspace shell and Kanban refinement

This is the current Host/Admin presentation extension of [Dashboard Design System](DASHBOARD_DESIGN_SYSTEM.md). It preserves prior Host operations/pricing work and every booking, payment, refund, inventory and permission rule.

## Typography

Host/Admin now use self-hosted **Space Grotesk Variable** (`@fontsource-variable/space-grotesk`) for operational UI, headings, labels, forms, navigation, tables and monetary totals. **Space Mono 400** (`@fontsource/space-mono`) is limited to booking references, selected dates/IDs and compact numerical data. Both installed packages explicitly include Vietnamese subsets in their metadata; browser QA loads/checks Vietnamese strings. No Archivo Black dependency or global Customer font replacement was added.

The scoped `.ops-shell` overrides `--font-display` and `--font-utility`; the public body retains Bricolage Grotesque and its existing numeric fonts. Page titles are 28px/700 desktop and 26px mobile, section headings 20–24px/600–650, KPI totals 28–32px/700, navigation 14px/500–600, Kanban headings 15px/600, booking titles 16px/600, customer text 14px/400 and booking times/references 12–13px. Letter spacing is restrained, body line height is 1.6, metadata is readable, and sidebar captions use normal case.

## Actual shell separation

The redundant header came from `components/application.tsx`, not RootLayout. That component now renders the existing public header and public navigation drawer **only when the first route segment is neither `host` nor `admin`**. Their public markup and Customer behavior otherwise remain unchanged. This is a render-tree branch, not CSS hiding: server HTML for workspace routes has no public header even before hydration.

`Operations` retains StudioHub branding, sidebar links/icons/active state, persisted collapse preference and user identity. Its scoped `--header-height:0px` makes the sidebar start at viewport top with `100svh` height and removes the previous header offset. The only workspace top row is a compact 56px breadcrumb/context/account toolbar.

A native details account control provides profile, marketplace and the same logout command (`login: null`, then route `/`) on every viewport, including collapsed-sidebar mode. Escape closes it and returns focus to the summary. At tablet/mobile widths the workspace owns a dedicated native navigation drawer using the existing Modal/GSAP/focus lifecycle. It includes role-specific links, account identity, profile, marketplace and logout. The public header is no longer responsible for any workspace navigation or account operation.

## Booking status visuals

`features/dashboard/booking-status.ts` is the single map of domain label, text, header/badge background, accent and lightly tinted column surface. Its generated CSS variables are scoped to Host/Admin booking surfaces only:

| Domain status | Header/badge background | Accent | Text |
| --- | --- | --- | --- |
| awaiting_payment | `#F2EDE2` | `#9A8562` | `#66533B` |
| pending | `#FFF0D4` | `#C78A24` | `#885610` |
| confirmed | `#DEEAFD` | `#4F7CCB` | `#28599C` |
| checked_in | `#D8F3F2` | `#0D91A0` | `#086675` |
| completed | `#DDF2E5` | `#28825A` | `#206745` |
| cancelled | `#FDE6E3` | `#BB6860` | `#923E38` |
| expired | `#E9EEF3` | `#7A8A9B` | `#4D5C6D` |
| no_show | `#F8E6D9` | `#B67848` | `#87481F` |

All eight written domain labels are preserved. Every text/background pair meets 4.5:1 contrast in the executed test. The same variables style Kanban columns, explicit booking badges in overview/agenda/reports/Admin overview, existing workspace BookingDetail headers, Host calendar events and status-distribution bars. Payment/refund badges, equipment states, account restrictions and Customer status styling remain independent.

## Kanban hierarchy and motion

Headers now have noticeable light semantic fills, stronger colored top edges and contrasting count badges. Column surfaces have their own pale related tint. Cards stay white with thin borders and a small hover lift/soft shadow; keyboard focus remains cyan. No drag actions, status mutations or new statuses were introduced.

Cards show reference → physical room code/name → customer → compact local rental interval → explicitly labeled deposit → relevant deadline/remaining balance. Same-day times use `28/10 · 09:00–12:00`; overnight intervals retain both dates, e.g. `28/10 22:00 → 29/10 02:00`. Intl format parts normalize the date separator across Node/browser locale implementations. Timezone remains Asia/Ho_Chi_Minh.

Deposit labels distinguish received, processing and required deposits. They do not claim full payment. Existing `HostDeadline` retains the two-hour rule and accurate overdue treatment. Search filters both the visible cards and header counts; empty columns remain explicit. No repeated status badge is needed inside a card because its column already carries the written status.

Existing GSAP heading/KPI/dialog behavior remains in place. CSS owns short hover/press/color transitions and the existing 220ms sidebar width change. Reduced motion disables decorative movement. No new animation dependency, repeated row choreography or financial counting animation was added.

## Changed files for this refinement

- `client/package.json`
- `client/package-lock.json`
- `client/src/components/application.tsx`
- `client/src/components/operations.tsx`
- `client/src/features/dashboard/booking-status.ts`
- `client/src/features/dashboard/booking-status.test.ts`
- `client/src/features/dashboard/components/HostInsights.tsx`
- `client/src/features/dashboard/styles/workspace-refinement.css`
- `client/scripts/workspace-refinement-qa.mjs`
- `client/scripts/host-operations-qa.mjs` — expected Room Type heading size updated to the current scale.
- `client/DESIGN.md`
- `docs/DASHBOARD_DESIGN_SYSTEM.md`
- `docs/DASHBOARD_TYPOGRAPHY_SHELL_REFINEMENT.md`

Other uncommitted work remains intact. No PHP, Helpdesk, database, 9Router, pricing calculation, authentication implementation or booking state-machine file changed. The shared application shell changed only to separate workspace/public rendering; unrelated Customer screen implementation and typography did not change.

## Verification

`workspace-refinement-qa.mjs` checks raw server HTML without JS, actual font loading, zero header offset, shell dimensions, collapsed-sidebar persistence, account access, all eight Kanban colors/labels/counts, search/empty states, compact overnight times, deposit labels, overdue deadlines, detail navigation/status independence, drawer focus/Escape/navigation/logout, Customer navbar preservation and unchanged booking records. It covers 360, 390, 768, 1024 and 1440px, plus normal/reduced motion screenshots.

Screenshots live in `client/.impeccable/review/workspace-refinement/`. Synthetic bookings used to visualize all states exist only inside the isolated browser test context; no application fixtures or business figures were fabricated. Font files are served locally, without Google Fonts runtime requests.

Executed results: TypeScript, ESLint and production build passed; 128 domain tests plus 23 dashboard/Helpdesk tests passed; the focused workspace browser QA passed 90 checks with no page errors. Existing Host operations QA passed 78 checks, rental-pricing QA passed 84 checks, and dashboard QA passed 119 route/viewport/motion combinations plus its interaction assertions. Rendered desktop/mobile Host overview/Kanban and Admin table screenshots were inspected. Board-wide refresh fades were removed so typing/search commits results immediately; the new card hover/press and semantic surfaces remain.

The pre-existing multiple-lockfile build warning remains. Operational data is still the existing browser demo store; this work adds no live API-backed authority or production concurrency guarantee. No commit, push or deployment is included.
