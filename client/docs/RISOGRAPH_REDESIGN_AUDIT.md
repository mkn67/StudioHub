# Risograph redesign — baseline audit

25 October 2026. Scope: visual redesign of the existing frontend, not a domain rewrite. This baseline was recorded before design-system or screen edits.

## Source authority

1. Business Policy VI v1.1 defines business behavior. A preserved copy is in references/.
2. Design Business Specification v1.0 defines the approved flows and page compositions.
3. The latest Ultimate Visual Redesign brief defines the replacement identity. The supplied OFFSET pricing reference supplies visual vocabulary, not StudioHub features, pricing tiers, statistics or branding.
4. The database constraint audit is document analysis and proposed future work. Its embedded request to fix domain/database constraints does not authorize those changes in this visual pass.
5. Earlier StudioBlank and terracotta documents are historical visual evidence. Only root DESIGN.md is the active visual system after migration.

## Repository inspected

Next.js 16.4.3 / React 19 / TypeScript / Tailwind 4. An optional catch-all App Router page renders the shared client application. Marketplace, accounts, wizard, bookings and operations modules supply all public, Customer, Host and Admin routes. ui.tsx supplies shared cards, rows, modal and page heading. globals.css holds all tokens, geometry, density, responsive and state styling. Models/engine are pure domain functions; fixtures/repository/store share localStorage state. There is no database, SQL migration, backend or real payment integration in this repository.

The existing 34-test domain suite and production browser script are retained. The prior POST_IMPLEMENTATION_AUDIT.md records real functional gaps, including accounting/configuration/session issues. A visual redesign cannot be represented as resolving those defects.

## Findings by surface

| Surface | Current evidence | Redesign response |
|---|---|---|
| Global system | Warm terracotta/stone tokens, Inter/IBM Plex Mono, 1px flat borders; cohesive but understated for the new print brief | Replace active palette/fonts; add controlled ink borders, hard offset variants and expressive display typography |
| Homepage | Working photographic hero/search, four real categories, three featured units, three real journey steps and Host CTA; sections mostly differ through spacing | Preserve content/sequence and photographs; print-style header, editorial category artwork, featured treatment and blue Host band |
| Search | Approved 288px left rail and 40%-image horizontal rows; controls/filter/sort/pagination work | Preserve geometry and callbacks; printed-listing borders, stronger room code/price hierarchy and selected controls |
| Room detail | Mosaic/lightbox, useful disclosures and sticky booking panel; supporting photos repeat when only two assets exist | Preserve gallery and booking behavior; improve printed catalog hierarchy and CTA emphasis; retain distinct primary images for the physical units |
| Wizard/auth | Working native dialog, three steps, validation/auth handoff; centered photographic auth form and three-step Host application | Replace shared form/progress/frame styling, preserve all field values/validators/handlers; warm print-paper auth surface |
| Customer/payment | Separate booking/payment/refund labels; prior pass already reduced detail photo and strengthened balance | Keep those gains; introduce blue/ink financial hierarchy, stronger dates/deposit and calm transactional styling |
| Host | Scoped metrics, real operational lists, Room Type→Unit management, calendar, Kanban and tables; left navigation lacks collapse | Compact print identity, selective metric emphasis, precise table/calendar typography; presentation-only navigation collapse and accessible mobile access |
| Admin | Working split approval view, account/oversight tables, permission matrix and audit/refund screens | Quiet shared identity; no heavy row shadows, no invented management authority |
| Responsive/accessibility | Prior rendered 360/390/768/1024/1440 evidence shows no global overflow; local wide-table/calendar/Kanban scrolling is intentional. Some legacy metadata/targets are small | Verify actual new font metrics, shadows, focus, modal viewport, target sizes and local scroll at all five widths |
| Photos | Eight local natural-color photographs, recorded origins; each Room Type pair supplies distinct primary unit images | Preserve real color and optimization; no halftone/grain over useful photographic details |

## Non-regression baseline

Before edits, SHA256 hashes of every src file and copies of presentation modules were saved under `.impeccable/review/risograph/`. Existing production screenshots from the immediately preceding identity pass are available; fresh Customer/Host/Admin/authentication baseline captures are recorded under baseline/. Public homepage/search/detail evidence was visually inspected in the preceding pass and remains consistent with the saved CSS/assets.

The new reference intentionally supersedes the previous no-shadow, no-pattern, monochrome/single-terracotta and Inter-only visual restrictions. It retains photography, square geometry, editorial alignment, truthful content and approved operational layouts. New libraries are limited to the two explicitly requested font asset packages.
