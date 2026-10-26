# Cool Editorial refinement

Historical verification of the all-soft refinement. The latest user correction restores Cool Neo-Brutalist geometry and hybrid depth; see root DESIGN.md and COOL_NEO_BRUTALISM_RESTORATION.md for the active direction.

The latest user brief replaces Warm Editorial material with **Cool Editorial × Soft Neo-Brutalism × Layered Modern UI**, preserving the application structure and all domain behavior. Root `DESIGN.md` was updated before interface changes; `PRODUCT.md`, the surface brief and animation conventions now follow that direction. Previous visual verification reports are historical.

## Implementation

| Area | Result |
| --- | --- |
| Shared palette | Canvas #F6FAFC, surface #FFFFFF, ink #21313F, Ocean Cyan #0D7490, soft cyan #CFEFF5 and neutral #E8F1F5; independent semantic colors retained |
| Depth and shape | Three shared soft-shadow levels, 1px rules, 8px controls and 12px panels replace hard offsets; editorial type, brand geometry and category pictograms remain recognizable |
| Homepage | Natural photography, lighter headline plate, floating search, cool varied category grounds, white featured cards and pale-cyan Host invitation; original content/layout/navigation retained |
| Frosted layers | Sticky navigation, hero headline and search only; 12px desktop/8px mobile blur, opaque unsupported-filter fallback and reduced-transparency preference; no photo/text filters or full-screen backdrop blur |
| Marketplace | Soft room-card elevation, clipped 1.02 photo hover, readable filter rail and existing mosaic/sidebar/full-screen mobile wizard |
| Customer | Elevated booking rows, clear cyan boxed status filters and counts, solid white summaries and strongly emphasized pale-cyan outstanding balance |
| Host/Admin | White working surfaces, restrained KPI-group depth, cyan selected navigation, precise opaque tables/calendar/Kanban; mobile calendar controls wrap without compressing away their values |
| Motion | Existing reusable Motion system retained; 18px once-only reveals, short soft-elevation feedback, native modal focus lifecycle, real pending feedback and reduced-motion behavior; no additional libraries |

Sticky panels account for the existing 88px desktop/72px mobile header. Native dialog focus trapping, restoration, scroll locking and exit guards are retained. Exact monetary amounts render immediately. No domain model, workflow, price, status mapping, policy, permissions or mock-service behavior changed.

## Source changes

`src/app/globals.css` owns shared roles, radii, blur and elevations. `src/app/risograph.css` was renamed to `editorial.css` and refined in place, retaining its responsive layout rules. `src/app/layout.tsx` imports the new name. `src/app/motion.css` uses soft elevation and short vertical press feedback. `src/components/motion/system.tsx` changes the public reveal distance to18px; business handlers and page components are unchanged.

Design documentation includes `DESIGN.md`, `.impeccable/design.json`, `PRODUCT.md`, `docs/SURFACE_BRIEF.md` and updated material descriptions in `docs/ANIMATION_SYSTEM.md`. Earlier Warm Editorial/component refinement reports are marked historical. Existing photography and its provenance are preserved; no assets or dependencies were added.

## Verification

Production verification on 26 October 2026 is kept locally in `.impeccable/review/cool-editorial/`. Browser sessions use isolated demo data, without modifying the user's saved browser state.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript, ESLint and production build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` |
| Existing domain tests | 34/34 PASS | `npm run test`; run outside the known Windows sandbox user-info restriction |
| Motion and keyboard/reduced-motion behavior | 50 checks PASS | `motion-results.json` |
| Actual pending navigation, shared room photo, page crossfade and no-API fallback | 6 checks PASS | `navigation-results.json` |
| Palette, contrast, blur limits, solid fallback and opaque financial hierarchy | 26 checks PASS | `material-results.json` |
| Rendered responsive/workflow verification | PASS; 60 settled captures | `screens/results.json`, `screens/*.png`; no page-level overflow or browser errors in the final run |
| Protected source | Unchanged | `scope-check.json`; domain/data/repository/store and page handlers retain their original hashes |
| Design detector | Three radius-scale advisories fixed | Undocumented2px/4px values replaced with existing0px/8px tokens; no suppressions |
| Shipping photography provenance | 8 rasters, 0 missing | Impeccable asset scan; no new raster assets |
| Independent finish review | SHIP | All 60 final captures valid; no material finding within the refinement scope |
| Canonical documentation and sidecar | PASS | 24 source-matched color roles, 11 updated component snippets, current radii/shadows/frost and motion metadata |
| Design-document lint | 0 errors; 13 reference warnings retained | Color roles used through CSS are not referenced by the frontmatter component subset; no token deletion or suppression |

Actual rendered coverage includes home/search/room detail at 360/390/768/1024/1440px; desktop/mobile wizard steps, invalid capacity, inline authentication, payment failure/retry/success, My Bookings and booking details; Host dashboard/calendar/Kanban/inventory; Admin partner approval and management routes; mobile filters/empty/reset and lightbox Escape. The workflow creates the exact A102 unit, adds equipment, pays its deposit, persists across refresh, obtains Host confirmation, cancels with an independent refund and performs Admin approval. Motion checks additionally verify all nine status filters, retained form values, exact totals, inert outgoing steps, focus trap/restoration, scroll-lock cleanup, sidebar controls, stable calendar coordinates and reduced motion.

Early screenshots were rejected as evidence because they caught overlapping wizard/dialog/page transitions. The final capture helper waits for native transition completion and Motion settling, and returns non-dialog pages to the top before full-page capture so sticky navigation is represented correctly. These are test-capture waits, not application delays. A real CSS optimization issue was fixed by placing the standard backdrop-filter declaration after its vendor-prefixed fallback; computed blur and the opaque fallback are both verified.

## Accessibility and performance

Measured contrast: primary action 5.36:1, action hover 7.31:1, body 12.69:1, muted text on cool neutral 5.27:1, input border 3.24:1, semantic pairs 6.17–6.50:1 and dark text on the balance surface 10.99:1. A worst-case .90-white frosted surface over black still provides 4.79:1 for muted text. Labels remain independent of color.

Backdrop blur is confined to three floating regions and reduced on mobile. Financial/operational surfaces are opaque and unblurred. The unsupported-filter fallback is checked by removing the optional support block in an isolated test page. No permanent scroll listeners, continuous image movement, new animation library or fake processing delay was introduced. Existing reduced-motion behavior is retained.

Verification uses desktop Chromium and viewport emulation; physical mobile hardware, Safari/Firefox and measured Core Web Vitals are outside the evidence. Existing business-audit issues remain outside this visual refinement.
