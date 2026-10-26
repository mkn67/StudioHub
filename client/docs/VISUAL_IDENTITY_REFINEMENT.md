# Visual identity refinement

Historical terracotta refinement, superseded by the later user-approved Risograph redesign. Current visual authority: [DESIGN.md](../DESIGN.md). Current delivery: [RISOGRAPH_REDESIGN_REPORT.md](RISOGRAPH_REDESIGN_REPORT.md). Measurements below describe the earlier implementation.

## Changes and boundaries

DESIGN.md was updated before application styling. Shared CSS tokens define warm canvas, white task surfaces, limestone secondary surfaces, charcoal text, terracotta actions/selection and botanical/ochre/brick semantic states. The exact brand accent is retained; small white action labels use darker terracotta for contrast. All color literals in globals.css are centralized in its root token block.

Navigation, copy, filters, commands and permissions are preserved. Booking status precedes room/date, and the photo becomes a short strip. On narrow screens the financial panel precedes the detailed record and timeline. Cancellation/rejection/exceptional cancellation use outlined destructive controls, including confirmation. Terminal bookings retain their historical-quote qualification rather than gaining misleading debt emphasis.

Two natural-color daylight photographs replace existing asset contents, keeping model image paths unchanged. Loft, sound and cyclorama photos retain natural color; there is no grayscale filter. Origins appear in public/images/PROVENANCE.md and embedded JPEG metadata. Photos remain illustrative fictional inventory.

## Modified screens

| Area | Rendered coverage | Visual changes |
|---|---|---|
| Homepage | 360/390/768/1024/1440px | Warm photographic hero, terracotta actions, canvas/muted section contrast |
| Search and room details | Same five widths; filters, empty results, lightbox | White results on warm canvas, stronger controls, terracotta prices/selection, natural-color mosaic |
| Booking modal | Three steps, validation, inline sign-in, mobile review bottom; 390/1440px | Warm header/summary, branded progress/actions, total emphasis |
| Payment | Initial, failed and successful result; 390/1440px | Semantic state icons, distinct summary, accessible actions |
| Customer | My Bookings/history, detail, profile, support; 390/1440px | Semantic labels, stronger balance/status hierarchy, quieter cancellation |
| Authentication | Login, registration, Host application; 390/1440px | Natural-color photographic ground, white form surface, warm controls |
| Host | Overview, studios, rooms, equipment, rates, calendar, bookings, reports, settings; 390/1440px and key screens at 360/768/1024px | Warm selected navigation, muted table/calendar headings, semantic reservations, restrained surfaces |
| Admin | Overview, accounts, partner approval, studios, equipment, roles, refunds, audit logs; 390/1440px | Shared tokens, warm split-approval selection, operational hierarchy |

## Verification

| Check | Result | Evidence and limits |
|---|---|---|
| TypeScript | PASS | npm.cmd run typecheck |
| ESLint | PASS | npm.cmd run lint |
| Production build | PASS | npm.cmd run build; Next.js 16.4.3 |
| Domain tests | PASS — 34/34 | npm.cmd run test; domain/tests unchanged |
| Browser workflows | PASS | Wizard/validation, inline sign-in, failed/retried payment, refresh persistence, Host approval, cancellation/refund display, Admin partner approval, mobile filter/empty/reset, lightbox Escape |
| Supplemental route sweep | PASS | 48 desktop/mobile captures; no page errors or document overflow |
| Impeccable source detector | PASS | One explicit scan returned []; edit hooks also clean |
| Raster provenance | PASS | 8 rasters, 0 missing provenance |
| Functional source preservation | PASS | SHA256 baseline: domain engine/models/tests, fixtures/repository, store/router/wizard/operations/accounts unchanged |
| Sidecar rendering | PASS | 10 live-bound snippets; new photo bytes; square geometry/no shadows; terracotta focus; reduced motion; mobile adaptation |
| Google DESIGN.md lint | PASS with warnings | Official cached 0.4.0 CLI: exit 0, 0 errors, 10 orphaned-token warnings, 1 info |
| Independent Impeccable finish review | SHIP | Corrected packet: all 111 captures checked via labeled contact sheets; key public, modal, finance, operational and Admin screens also opened individually; no material visual fixes requested |

Evidence is in `.impeccable/review/identity-refinement/`: 111 screenshots, browser results/routes JSON, contrast measurements, unchanged-file hashes and independent finish review. One search screenshot initially preceded image decoding; it was replaced after all four images decoded. This is visual validation, not a replacement for [POST_IMPLEMENTATION_AUDIT.md](POST_IMPLEMENTATION_AUDIT.md). Existing business defects remain outside this change.

## Contrast

WCAG relative-luminance checks of opaque token pairs:

| Pair | Ratio |
|---|---:|
| White on primary action / hover | 5.59 / 7.17 |
| Main text on canvas | 14.27 |
| Muted text on canvas / table heading | 5.77 / 5.09 |
| Action text on selected/balance wash | 4.51 |
| Success / warning / error badge text | 6.22 / 5.23 / 5.80 |
| Input outline on white / canvas | 3.39 / 3.06 |

These pairs pass 4.5:1 for normal text and 3:1 for control outlines. This is not an exhaustive accessibility-conformance claim.

## Tool findings and documentation

The existing narrow `overused-font=inter` exception remains because the approved source specification requires Inter. No new suppressions, file ignores or rule ignores were added.

Google's orphaned-token warnings concern canvas, focus, border and inverse roles used by real CSS but unreferenced by frontmatter's restricted component-property schema. They remain useful tokens; no artificial component variants were added to silence warnings.

The refreshed `.impeccable/design.json` has schemaVersion 2, 25 color metadata entries, four breakpoints, ten live-bound snippets and the new photograph. Narrative follows DESIGN.md. Snippets document appearance rather than routing or calculations. The independent finish-review disposition is **ship**, scoped to the visual identity brief and supplied screenshots; it is not a certification of business behavior or exhaustive accessibility.
