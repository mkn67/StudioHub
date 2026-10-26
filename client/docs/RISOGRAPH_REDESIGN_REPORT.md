# StudioHub — Risograph redesign delivery

Historical delivery of the initial Risograph redesign. Its former accent-color descriptions are superseded by [MUSTARD_REFINEMENT.md](MUSTARD_REFINEMENT.md); [DESIGN.md](../DESIGN.md) is the sole active visual authority. Measurements below describe the earlier implementation.

## What changed

The public marketplace now reads as a photographic printed catalog: cream paper, deep ink, federal blue, pink spot ink and small yellow details; Bricolage Grotesque and DM Mono; stronger borders and carefully selected hard offset shadows. The photograph remains the hero material. A paper headline plate carries one pink registration ghost, while category artwork uses halftone and overprinted geometry away from useful photographic detail. Featured room emphasis and the blue Host band carry the strongest print treatment.

Search remains a left filter rail and one horizontal 40%-image row per physical unit. Room detail retains its mosaic, lightbox, right booking panel and mobile sticky action. Booking/payment surfaces become calmer: strong typography/dividers, separate state labels, a restrained frame and an ink-inverted outstanding balance. The supporting booking photograph remains small. Historical quotation differences remain explicitly distinct from current debt.

Host/Admin use the same type, paper and blue selection without heavy shadows or decorative textures over tables, calendars, Kanban or audit data. Navigation now supports desktop collapse/expand and a native-dialog mobile/tablet drawer, with keyboard focus containment and Escape. This is presentation state, not a change to permissions or business transitions.

## Shared system and implementation

| File | Role |
|---|---|
| DESIGN.md | Canonical Google-compatible palette, typography, component variants, layout, borders/shadows, permitted print effects and accessibility rules; updated before UI edits |
| src/app/globals.css | Shared primitive/semantic tokens, existing layout and responsive foundation; new font and palette aliases |
| src/app/risograph.css | Context-specific public, transactional and operational component treatments using shared tokens; no scattered color literals |
| src/app/layout.tsx | Local Bricolage Grotesque Variable and DM Mono assets; local Vietnamese mono fallback; imports both shared stylesheets |
| src/components/ui.tsx | Reusable decorative PrintArtwork, existing room/booking rows, explicit deposit label and optional modal presentation class |
| src/components/marketplace.tsx | Photographic editorial hero, one registration word, real category artwork and branded Host band; handlers preserved |
| src/components/application.tsx | Existing real navigation/footer with mobile dialog and role-appropriate portal entry |
| src/components/operations.tsx | Labeled Lucide navigation and local collapse state; all existing business callbacks retained |
| public/images/paper-grain.svg | Small reusable authored grain tile, limited to editorial paper, noninteractive; no grain over working data/photos |
| .impeccable/design.json | Refreshed schemaVersion 2 sidecar: ten live-bound standalone components, current narrative, color metadata and hard-shadow vocabulary |

Only two requested font asset packages were added; unused Inter assets were removed. Bricolage includes Vietnamese. DM Mono provides Latin/Latin Extended; unsupported Vietnamese glyphs use the local IBM Plex Mono Vietnamese subset at the same size/line-height. No external hosted font CSS, new UI framework, animation library, backend or provider integration was introduced.

Eight existing natural-color photographs are retained with distinct primary unit imagery and source metadata. No global grayscale or print pattern obscures them. Existing two-image room galleries can repeat a supporting image; that fixture/media limitation remains documented in the earlier audit.

## Route-by-route changes

These rows describe visual work, not certification that every product feature is complete.

| Route | Redesign |
|---|---|
| / | Paper navigation, photographic cover, registration headline, utility search panel, printed categories, physical-unit feature, real booking steps, blue/pink Host CTA and deliberate footer |
| /rooms | Printed-listing borders, real room code, bold VND amounts, readable filter controls/selection, original left rail/horizontal results and mobile sheet |
| /rooms/[id] | Editorial room identity, framed mosaic, strong booking surface, natural-color lightbox, mobile action |
| Room booking/reschedule dialog | Shared three-step frame, legible progress/fields, warm summary, blue progression, validation/disabled states; original auth and selection behavior |
| /payment/[id] | Calm white payment surface, deadline/status hierarchy, clean deposit summary, blue simulated payment actions |
| /payment/[id]/result | Written outcome plus semantic icon, clear summary and existing next action |
| /my-bookings | Strong room/date/status rows, visible paid/required deposit, large balance and restrained repeated borders |
| /my-bookings/history | Same row language, terminal labels and historical financial wording preserved |
| /my-bookings/[id] | Exact room/date/status hierarchy, larger financial panel and ink balance, small photo, quiet destructive action and readable timeline |
| /login | Natural-color backdrop, cream/ink form, pink hard shadow, clear blue submit |
| /register | Same auth system with unchanged customer form/validation |
| /register/host | Same auth frame, preserved three-step application and review |
| /profile | Shared editorial type, controls, section rules and existing application/notification information |
| /support | Shared heading, note, form and action language; no invented support workflow |
| /host | Compact editorial title, selective first-KPI emphasis, quiet supporting metrics, action lists and existing calendar preview |
| /host/studios | Shared labeled forms, structural borders and existing onboarding information |
| /host/rooms | Strong Room Type grouping, physical-unit codes, clear table/form actions |
| /host/equipments | Compact readable inventory table and controls, no row shadows |
| /host/rates | Shared plan controls, unit/default distinction and strong table labels; no SaaS pricing tiers |
| /host/calendar | Preserved Day/Week geometry, real durations, semantic labels and dashed preparation buffers |
| /host/bookings | Restrained status-specific column heads, thin card borders, real booking data and local horizontal scroll |
| /host/bookings/[id] | Shared transactional detail styling; existing action visibility/conditions preserved |
| /host/settings | Calm labeled policy forms and existing validation/snapshot explanations |
| /host/reports | Bold derived amounts and precise reporting table; no fabricated metrics |
| /admin | Quiet shared brand, compact derived summaries and existing exception surfaces |
| /admin/users | Legible account table, search/filter/action hierarchy and existing confirmation forms |
| /admin/host-requests | Approved split view with clear selected application, strong identity and permission-aware actions; mobile stacking |
| /admin/studios | Existing Studio→type→unit oversight with shared selectors/table styling |
| /admin/equipments | Quiet global inventory table and existing read-only scope |
| /admin/roles | Clear existing permission matrix; no unrestricted role editor |
| /admin/refunds | Separate exception labels, restrained alerts and existing reconciliation actions |
| /admin/audit-logs | Readable immutable activity table and filters; no decorative data overlays |

## Verification evidence

| Check | Executed result |
|---|---|
| npm.cmd run typecheck | PASS |
| npm.cmd run lint | PASS |
| npm.cmd run build | PASS, optimized Next.js 16.4.3 production build |
| npm.cmd run test | PASS — 34/34 existing domain tests, run after shared-system milestone and final source/dependency state |
| Production browser workflow | PASS: wizard/capacity validation/equipment/review/auth, failed payment then retry, refresh persistence, Host approval, customer cancellation/separate pending refund, Admin partner approval, mobile filters/empty/reset, lightbox Escape |
| Route sweep | PASS: 48 additional Customer/Host/Admin/auth route captures at 1440/390; no page errors or document overflow |
| Responsive | Homepage/search/detail plus key Host views checked at 360/390/768/1024/1440; wide homepage at 1920 |
| Navigation | PASS: desktop collapse 230→76px, expand, route navigation with accessible labels/active state; 390/768 drawer focus trap, Escape and body scroll restoration |
| Mobile booking action | PASS: actual 390px viewport capture and bounding-box check; CTA remains in viewport |
| Source non-regression | PASS: nine protected files hash-identical; all 170 pre-existing JSX callbacks preserved; two new callbacks only close/toggle navigation |
| Impeccable detector | PASS: one explicit source scan returned []; no new suppressions; obsolete Inter exception removed |
| Raster provenance | PASS: 8 shipped rasters, 0 missing origin metadata |
| Sidecar | PASS: shadow-DOM fonts, spot inks, public/danger/feature shadows, focus, reduced motion and mobile stacking; embedded photos match source bytes |
| Official Google DESIGN.md lint | Exit 0: 0 errors, 10 orphaned-token warnings, 1 informational summary |
| Independent Impeccable finish review | Full review of 116 captures: one KPI contrast finding. Verdict pass: that finding resolved, disposition ship; 15 affected route/width computed-style checks passed |

Evidence is under `.impeccable/review/risograph/`: baseline/source snapshots, first milestone screenshots, 125 final screenshot files including affected-screen recaptures, results/routes/navigation JSON, contrast measurements, non-regression comparison and independent finish review. Browser contexts used isolated demo storage, not the user's browser records. All captures wait for image decode. The checks are local Chromium emulation, not certification across physical devices or every browser.

The existing domain engine/models/tests, fixtures/repository, store, wizard, accounts and bookings modules are byte-for-byte unchanged. Existing callbacks in modified presentation modules also compare unchanged through TypeScript AST printing. No booking calculation, inventory rule, deadline, payment/refund transition, strike, cancellation/reschedule, check-in/out, no-show, overtime or Admin authorization logic was rewritten.

## Contrast and quality

Opaque token-pair measurements: blue action/white 8.62:1; ink/paper 14.63:1; supporting text/paper 6.27:1; pink CTA/ink 5.49:1; blue pale selection 7.29:1; success/warning/danger badges 6.50/6.32/6.17:1; light-blue supporting text/blue 6.86:1. Input outlines exceed 3:1. These scoped checks do not constitute exhaustive WCAG certification; actual cascades and states also received screenshot review.

Brand recognition comes from the spot-ink/type combination and selective tactile effects, not a palette swap alone. Content composition keeps physical room photography dominant on discovery surfaces and money/status dominant on transactional surfaces. Operational density remains useful; tables/calendar/Kanban have intentional local scrolling and no repeated heavy shadows.

## Remaining limits

- Existing business defects and incomplete features remain tracked in [POST_IMPLEMENTATION_AUDIT.md](POST_IMPLEMENTATION_AUDIT.md). Passing existing tests and preserving callbacks does not establish that those older defects are fixed.
- The database audit is static document analysis. No real database, multi-user concurrency, authentication security or money verification is claimed by this frontend redesign.
- Ten Google lint warnings describe real palette roles (decoration, borders, hover and inverse text) that the restricted frontmatter component schema does not reference. They remain meaningful tokens rather than artificial variants added to silence warnings.
- Photography remains illustrative; repeated supporting gallery assets/media editing remain existing limitations. No ratings, testimonials, bookings statistics or commercial claims were fabricated.
- Desktop collapse state resets when the existing App Router page remounts. Expand/collapse and navigation are functional; no persistence preference was added to the domain store.

The independent finish review and any required corrections are recorded in `.impeccable/review/risograph/finish-review.md`.

The full independent review identified one material correction: the first inverted KPI label inherited dark muted text. The shared selector now explicitly uses the light inverse text token on blue, addressing Host overview/reports and Admin overview together. The reviewer scored this finding **resolved**, disposition **ship**, from affected-screen recaptures and measured computed colors (6.86:1 at all 15 observations). The verdict pass is in `.impeccable/review/risograph/verdict-pass.md` and covers that scored fix; it is not a new exhaustive functional or accessibility certification.
