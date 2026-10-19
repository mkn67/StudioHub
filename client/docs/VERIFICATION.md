# Verification record

Verified on 2026-10-09 in the supplied Windows workspace, with Node 24.21, Next.js 16.4.0 and Chromium. This records commands actually run, rather than planned checks.

| Check                                                                                   | Result                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run typecheck`                                                                 | Passed, exit 0                                                                                                                                                                               |
| `npm.cmd run lint`                                                                      | Passed, exit 0, no ESLint warnings                                                                                                                                                           |
| `npm.cmd run test -- --reporter=json --outputFile=.studiohub-runtime/vitest-final.json` | Passed: 87 tests across five files                                                                                                                                                           |
| Unit tests                                                                              | 73 passed: pricing/format/time 20, availability 18, access/statistics/storage 20, shared services 15                                                                                         |
| Component tests                                                                         | 14 passed: actual filters, room metadata/fallbacks, availability, rate compatibility and mobile units, selectors, draft navigation, errors, confirmation/focus, approval and role navigation |
| `npm.cmd run build`                                                                     | Passed, including production TypeScript and prerendering; all 35 required route patterns appear in the build output                                                                          |
| Production browser suite                                                                | Passed: 27 tests against the optimized production server at `http://127.0.0.1:3001`                                                                                                          |
| Production dependency audit                                                             | `npm.cmd audit --omit=dev --json`: passed, zero reported vulnerabilities                                                                                                                     |
| Full dependency audit                                                                   | Five high-severity reports in one development-only ESLint glob chain; described below                                                                                                        |

## Behavior verified

Pricing includes thirteen deterministic, manually checkable input/output scenarios. Tests cover fractional hours, whole sessions and days, independently rounded equipment units, integer VND deposits, immutable snapshots, bounds and invalid selections.

Availability tests cover identical intervals, partial overlap, containment, adjacency, both bookings' cleaning buffers, expired holds, cancelled orders, multi-day reservations, operating hours and peak concurrent studio-wide equipment use. Shared-service tests exercise permission checks, locked accounts, approval without automatic studio creation, inventory protections, overlapping rates, catalog invariants, retry idempotency, snapshots, deliberate expiry and reset isolation.

The browser suite groups the brief's 24 requested events into complete flows: search and detail, time/equipment selection, login draft preservation, booking, simulated deposit, cross-tab host confirmation, customer status/refresh/cancellation, released capacity, failed/cancelled payment retries, conflict detection, expiry, approval, visibility, retained snapshots, reasoned exceptional cancellation, audit events, locked sessions and confirmed reset.

Additional browser tests create a studio, room, equipment and rate through the actual UI and publish the resulting room; inspect calendar popovers and snapshot-derived analytics; mutate catalogs and select global-search results by keyboard; register a customer, upload/compress an avatar and verify profile persistence; resubmit a rejected host; exercise mobile sheets/drawers/search; verify the skip link; and visit every specified route with runtime error listeners. The final expanded suite also exercises corrupt-storage recovery, wrong-role return navigation and invalid-image recovery.

All browser fixtures use a fixed Vietnam-local clock and a separate browser storage namespace. Ordinary developer demo data is not reset or mutated by these tests.

## Accessibility and rendered review

The full run applies axe WCAG 2 A/AA and 2.1 AA tags to ten representative marketplace, booking, authentication, host and admin routes, plus analytics, the open mobile filter sheet, the mobile admin workspace, corrupt-data recovery and wrong-role access. Keyboard tests cover gallery arrows and repeated focus cycling, Escape, confirmation restoration, filter sheets, dashboard drawers, account-menu selection/restoration, global search selection and the skip link. Unique per-instance filter IDs prevent mobile labels from targeting the hidden desktop controls.

Responsive checks passed at 360, 390, 768, 1024 and 1440 pixels across homepage, search, detail, booking, host and admin. They verify document overflow and capture screenshots. Actual screenshots were opened for manual visual inspection, including desktop/mobile marketplace, room detail, operational overviews, weekly calendar, analytics and room editing. Findings and corrections are recorded in [DESIGN-REVIEW.md](DESIGN-REVIEW.md).

Source checks confirm browser storage access is confined to `src/services/storage/adapter.ts`, pricing belongs to the shared domain calculator and all roles subscribe to one service/database. No unfinished TODO screens, placeholder destinations or fabricated ratings were introduced.

## Evidence files

- `.studiohub-runtime/vitest-final.json`: actual Vitest assertion results.
- `playwright-report/index.html`: actual latest browser report.
- `.studiohub-runtime/screenshots/`: responsive and route screenshots.
- `.studiohub-runtime/production-audit.json`: production audit output.
- `.studiohub-runtime/dependency-audit.json`: full audit output.

These generated reports are ignored by source control. The report and screenshots remain available locally in this delivered workspace.

## Dependency finding

The full npm audit reports five high-severity entries along `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. The underlying advisory is [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The inspected installed `braces` version was 3.0.3 and no patched release was available from the registry at verification time. npm's forced suggested fix would downgrade `eslint-config-next` to 14.2.35, which is inconsistent with the installed Next.js 16 tooling, so that breaking downgrade was not applied. The production-only audit is clean; this remains a documented development-tool dependency limitation.

## Limits of verification

Browser checks ran in Chromium on this environment; Safari, Firefox and real mobile devices were not available for this run. Automated axe results do not constitute a formal accessibility certification. Browser-local service validation does not establish production authentication, authorization, payment settlement or transactional locking. The unavailable Impeccable package is documented explicitly; the manual review is not presented as an Impeccable invocation.
