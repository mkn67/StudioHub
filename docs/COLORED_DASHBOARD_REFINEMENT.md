# Colored operations dashboard refinement

## Audit and resulting design

The original Pricing overview used white groups with neutral borders, 12–13px inheritance text and a faint inline base-price sentence. Secondary buttons explicitly removed the hard shadow. The editor had white heading/tabs/content, small labels and whole-dialog scrolling. Reports used a white four-cell financial strip rather than the Overview KPI component, pale booking bars and 5px status tracks.

The new `colored-refinement.css` layer follows `workspace-refinement.css`. Every rule starts with `.ops-shell`; Customer and Helpdesk do not inherit it. Existing components, fonts and token names are reused.

| Role | Treatment |
| --- | --- |
| Canvas / input / dense data | Existing cool canvas and neutral white surfaces |
| Ink / body / muted | `#20323E` / `#172B3A` / `#526675` |
| Cyan / blue | Existing `#CFEFF5` / refined `#DFEAFD` |
| Soft mint / yellow / lilac / coral | `#DDF2E5` / `#FFF0D4` / `#EEE7FF` / `#FDE6E3` |
| Featured KPIs | 2px ink border, 16px radius, 5px hard shadow |
| Pricing/chart groups | Tinted header, 2px ink border, 3px hard shadow |
| Room rows, equipment details, tables | Neutral dividers, no individual card shadows |

Space Grotesk Variable remains the Vietnamese-capable operational font. Body is 15px, form labels 15px, supporting descriptions 14–15px, pricing names 25px, section headings 22–23px, financial totals 30–32px with tabular numerals. Room IDs retain selective monospace. Larger values can wrap rather than overflow. Inputs use 16px, including on mobile.

## Buttons and motion

Primary actions retain cyan; secondary actions use soft blue, 2px ink outlines and hard shadows. Enabled buttons move -1px on hover with a 5px shadow and 3px on press with a 1px shadow. Existing 140ms transitions are reused. Cancel is neutral with no resting hard shadow. Disabled controls have a visible slate fill/border and no movement. Focus outlines remain visible. Existing warning/destructive text actions remain semantic.

Only interactive KPI links lift on hover. Static financial cards stay still. Existing GSAP modal entrance/backdrop lifecycle and chart reveals remain in use; no new animation library, count-up, repeated report effect or operational delay was introduced. Reduced motion disables transforms/transitions through the existing workspace policy and the new button rule.

## Pricing

Room Type headers use cyan, blue and lilac as scanning accents, independent of booking status. The base-price label and large exact hourly amount are separate. Package chips use 14px text; physical room rows remain compact, with larger inheritance labels and a clear room edit action.

The modal keeps the existing accessible native dialog, title, scope, tabs, draft provider, validation, save/cancel and focus restoration. Its header is cyan, scope area blue-neutral, active tabs outlined/tactile and crew settings grouped on a soft neutral surface. Labels and inputs are larger. One flexible content region scrolls; header/scope/tabs/footer stay in the dialog layout. The footer occupies its own space, so it cannot cover inputs. Mobile uses a near-full-screen dialog with two-column wrapping tabs.

## Reports and Overview

Reports now reuse `DashboardKpis`/`DashboardKpi`, including relevant icons and explanatory captions. **The four existing aggregation expressions and metric names are unchanged.** Deposits are cyan, additional collections blue, completed refunds neutral lilac and used-session debt yellow. There are no invented percentages or trend values. Overview shares the same colored KPI surfaces.

Booking activity/status panels use tinted headers, strong outlines and selective hard shadows. Booking bars use a higher-contrast cyan; zero remains zero height. Dates/counts/caption use larger sans-serif text. Status tracks are 10px and still use the existing eight-status palette. Exact counts remain visible, with the existing aggregate accessible chart description.

Room popularity remains the existing weekly/monthly ranked table, with a subtle first-row highlight, 12px relative bars, tabular financial text and existing Vietnamese date-range description. The native date picker continues to follow browser locale. Reconciliation stays a table with blue header, readable booking references and right-aligned exact financial values.

## Exact files for this refinement

1. `client/src/components/operations.tsx` — import visual layer; reuse KPI components in Reports, preserving aggregation expressions.
2. `client/src/features/dashboard/components/HostPricing.tsx` — presentation-only group tones and base-price markup.
3. `client/src/features/dashboard/styles/colored-refinement.css` — scoped tokens, hierarchy, typography, buttons, pricing/editor and analytics styling.
4. `client/scripts/colored-dashboard-qa.mjs` — isolated browser visual, geometry, state, keyboard and motion checks.
5. `docs/COLORED_DASHBOARD_REFINEMENT.md` — this implementation/verification report.
6. `docs/DASHBOARD_DESIGN_SYSTEM.md` — current refinement precedence.
7. `client/DESIGN.md` — link to current scoped visual specification.

Earlier uncommitted work remains in place. Its files are documented separately; this list describes only the colored refinement.

## Verification

- `npm run typecheck` and `npm run lint`: passed.
- `npm test`: 131 domain tests passed.
- `npx tsx --test src/features/dashboard/booking-status.test.ts`: 3 tests passed.
- `node scripts/host-operations-qa.mjs`: 78 checks passed, no page errors; includes real draft/save/cancel, scope/override, reporting-period and room controls.
- `node scripts/dashboard-qa.mjs`: 119 route/viewport/motion combinations plus interaction checks passed, no page errors.
- `node scripts/host-timetable-qa.mjs`: 29 checks passed, no page errors.
- `node scripts/rental-pricing-qa.mjs`: 84 checks passed, no page errors, external requests or provider calls.
- `npm run build`: passed compilation, TypeScript, page generation and optimization. Existing multiple-lockfile workspace-root warning remains.

Focused before/after screenshots are under `client/.impeccable/review/colored-dashboard/`. The focused browser script covers Overview, Pricing, Reports and all four editor tabs at 360, 390, 768, 1024 and 1440px under both motion preferences. It checks no page/dialog overflow, visible Save, 15px minimum visible labels and unchanged browser store. Additional checks cover 360×700 content/footer separation, keyboard tabs/focus restoration and hover/press behavior. `node scripts/colored-dashboard-qa.mjs`: 142 checks passed with no page errors. `node scripts/workspace-refinement-qa.mjs`: 90 checks passed with no page errors, including Customer font isolation, role shell, Vietnamese fonts, all eight booking colors, sidebar/account/drawer and state preservation. The tactile-state check caught an older, more specific secondary-hover rule; the final selector overrides that rule while retaining reduced-motion suppression.

## Limits and protected scope

Native date presentation is locale-dependent; the visible report range is explicitly Vietnamese. Dense tables intentionally scroll horizontally. No live-PHP financial reconciliation or cross-browser manual testing is claimed; browser checks use Chromium and isolated demo storage. Existing browser mock data remains labeled as demo.

No pricing, rental availability, crew surcharge, included equipment, inventory, booking transitions, deposit/refund or report aggregation formulas were changed in this refinement. No PHP/backend, database schema, `helpdesk-php/`, AI Agent, 9Router or Customer booking UI files were edited. No commit, push or deployment was performed.
