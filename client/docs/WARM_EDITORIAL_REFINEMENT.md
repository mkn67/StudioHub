# Warm Editorial refinement

Historical verification of the preceding visual system. Current palette, materials and component appearance follow root DESIGN.md and COOL_EDITORIAL_REFINEMENT.md; behavior evidence below remains a record of that earlier pass.

Verified 25 October 2026. The latest user brief supersedes earlier palettes with **Terracotta × Mustard × Cream**. Root [DESIGN.md](../DESIGN.md) is the only active design authority; previous Risograph and cobalt/mustard delivery reports are historical.

## Delivered appearance

Canonical paper `#F4EEDE`, ink `#222329`, terracotta `#B95438`, mustard `#DFB45C`, white `#FFFFFF`. Semantic success/warning/danger retain their independent meanings and written labels.

Terracotta drives search/progression actions, selected navigation and featured public surfaces. Mustard supports editorial artwork, selection and the Host invitation, with a deliberate larger Workshop category ground. Category backgrounds now alternate paper, terracotta/white, mustard/ink and sand. Operational KPIs use neutral grounds with a restrained terracotta amount; tables, calendar and Kanban stay quiet and unshadowed.

The existing Bricolage/DM Mono typography, geometric layouts, borders, hard-offset geometry, natural photography, native booking dialog and information hierarchy remain. Hero lettering stays clean without registration ghosts. All structural shadows use dark ink. No application rebuild, new workflow, media recoloring or dependency change was introduced.

## Changed files

| File | Change |
|---|---|
| DESIGN.md | Updated first: canonical colors, derived brand-text/hover/wash roles, category rhythm, contrast and quieter operations |
| src/app/globals.css | Semantic brand primitives and compatibility aliases, supporting neutrals, independent statuses, dark ink overlay/shadow tokens, Tailwind primary/secondary references |
| src/app/risograph.css | Warm categories/featured surfaces, readable inverse text, neutral KPI grounds, darker small brand text, legible editorial hover and header focus |
| src/components/ui.tsx | Decorative circle class renamed from a literal color name to primary; no handler/data changes |
| public/images/paper-grain.svg | Existing small grain tile uses the current ink |
| PRODUCT.md | Current Warm Editorial brand commitments |
| docs/SURFACE_BRIEF.md | Latest palette, category/operational contract and current evidence path |
| .impeccable/design.json | Current 22-color metadata, three ink shadow roles, ten framework-free live-bound snippets; latest editorial hover |
| README.md | Current palette and verification-document links |
| docs/MUSTARD_REFINEMENT.md | Previous palette refinement marked historical |
| docs/RISOGRAPH_REDESIGN_REPORT.md | Earlier redesign marked historical |
| docs/WARM_EDITORIAL_REFINEMENT.md | This verification record |

Clean hero markup from the immediately preceding refinement was retained. Relative to the start of this latest migration, only globals.css, risograph.css and the decorative class in ui.tsx changed within src. All other src files are SHA256-identical, including domain/models/tests, fixtures/repository, state store, wizard, bookings, accounts, operations, router, marketplace content and font configuration. No existing handler or permission condition changed.

## Actual verification

| Check | Result |
|---|---|
| npm.cmd run typecheck | PASS |
| npm.cmd run lint | PASS |
| npm.cmd run test | PASS — 34/34 existing tests |
| npm.cmd run build | PASS — production Next.js 16.4.3 build, including final hover/focus corrections |
| Browser workflows | PASS — three-step wizard/validation/equipment/review/auth; payment failure/retry; refresh persistence; Host approval; cancellation with separate refund; Admin approval; mobile filters/empty/reset and lightbox |
| Responsive rendering | 70 captured images; primary public and key Host screens at 360/390/768/1024/1440px, transaction/auth/Admin representatives at desktop/mobile |
| Computed palette scan | Eight home/auth/Customer/Admin observations: no former cobalt/fluorescent/old-ink CSS values, missing mustard token or document overflow |
| Button states | Six actual default/hover samples passed normal-text contrast; visible header focus confirmed at 2px/3px offset |
| Impeccable source detector | One explicit scan returned []; no manual suppression added |
| Official Google DESIGN.md lint | Exit 0: zero errors, ten orphaned-token warnings, one informational summary |
| Sidecar validation | Current recursive token aliases, ten snippets, source photo bytes, actual terracotta/white and ink shadows; final editorial hover synchronized |
| Independent finish review | **SHIP** — 22 actual captures inspected across marketplace, Customer, Host/Admin and interaction states; no material correction or recapture requested |

Rendered review includes homepage/category/featured cards, search rows, room mosaic/booking CTA, booking detail, authentication, Host overview, Admin overview, wizard, payment and operational states. Captures await image decoding; isolated browser contexts use demo state rather than the user's saved records. Local calendar/table/Kanban scrolling remains intentional.

## Contrast and interaction details

| Rendered pair/state | Ratio |
|---|---:|
| White / canonical terracotta primary action | 4.79:1 |
| White / darker terracotta primary hover | 6.33:1 |
| Dark ink / mustard editorial action | 8.07:1 |
| Dark ink / paper editorial hover | 13.53:1 |
| Dark ink / paper secondary action | 13.53:1 |
| Darker brand text / pale secondary hover | 5.08:1 |

Small inverse text on terracotta uses white: cream would provide only 4.13:1. Small brand text on light grounds uses the darker brand-text token. The Host editorial action now has an explicit paper/ink hover, preventing an inherited dark-on-dark state. The cream navigation header explicitly uses terracotta keyboard focus rather than the former photography-header white outline.

## Evidence and remaining limits

Evidence lives in `.impeccable/review/warm-editorial/`: source baseline/changed-source records, 70 PNGs, workflow results, computed accent/button-state results, detector output and finish-review.md. Typography, natural image assets and business source remain unchanged.

Ten Google warnings identify real palette roles used by CSS but not referenced by its restricted frontmatter component schema; they are not invalid tokens or failed builds. No artificial variants were created to silence them. The hook also stopped repeating hints on the frequently edited stylesheet after its session edit threshold; no ignore rule/file/value was added.

Existing functional defects remain documented in [POST_IMPLEMENTATION_AUDIT.md](POST_IMPLEMENTATION_AUDIT.md), outside this styling pass. These tests and visual checks do not certify every workflow boundary, physical device or full accessibility conformance. They establish the rendered refinement and the explicitly exercised behavior.
