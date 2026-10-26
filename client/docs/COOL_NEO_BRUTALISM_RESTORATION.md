# Cool Neo-Brutalism restoration

The latest user correction restores **Cool Neo-Brutalism × Editorial Marketplace × Layered Motion** while preserving the bright cyan palette, natural Studio photography, editorial typography, approved layouts and functioning workflows.

## Cause and correction

The preceding refinement applied the same soft material too broadly: public frames became1px cool-gray rules, hero/cards inherited12px corners, and every elevation alias resolved to a soft shadow. This weakened the geometric identity even though photography and readability improved.

The correction separates brand identity from functional layering. The homepage was implemented and inspected at390/768/1440px before extending the system to Customer and operational screens.

| Surface | Corrected treatment |
| --- | --- |
| Canonical palette | Canvas #F5FAFC, ink #20323E, primary cyan #0D7490, supporting blue #4F7CCB, white #FFFFFF and muted #E8F1F5; independent semantic statuses retained |
| Hero headline | Solid white, square corners,2px ink frame and7px hard offset;5px on narrow mobile; unchanged natural photograph and Vietnamese type |
| Floating search | Square2px ink frame,5px hard offset desktop/3px mobile, readable dividers, selective frost with solid fallback |
| Public primary buttons | Cyan/white,2px ink border,3px offset; hover lifts1px up/left and expands to5px, press moves2px toward a1px offset |
| Categories | Original custom pictograms, IDs and links; distinct white/cyan/pale-blue/slate grounds, square2px frames and tactile hard-shadow hover |
| Featured/default listings | Featured2.5px geometric frames and selective hard offsets; default search rows2px frames with no resting shadow and restrained soft hover |
| Booking and payment | Moderate2px main frames, solid readable summaries, prominent pale-cyan balance and quiet destructive action; supporting layers retain soft depth |
| My Bookings |1.5px ink card frames,4px corners and boxed cyan/white tabs with an ink active border; real data-derived counts and status mapping preserved |
| Host/Admin | Thin operational frames, selected cyan navigation, restrained KPI emphasis/soft elevation and unshadowed dense tables/calendar/Kanban |

The hard family is3/5/7px with zero blur; functional soft shadows are0 4px 12px at.07 alpha and0 12px 28px at.10. Public editorial corners are0px, moderate Customer/button corners4px and ordinary input/utility-dialog corners8px. The headline plate is opaque and unblurred. Frost is confined to navigation and search, capped at12px desktop/8px mobile; financial and dense operational data remain opaque.

## Scope and files

Only three application files changed: `src/app/globals.css`, `src/app/editorial.css` and `src/app/motion.css`. Source hashes confirm every TypeScript component, domain function, fixture, repository, store and handler is unchanged. No dependency or asset was added. No layout, route, booking rule, payment/refund behavior, pricing or role permission changed.

`DESIGN.md` was updated before implementation. `PRODUCT.md`, `docs/SURFACE_BRIEF.md` and `docs/ANIMATION_SYSTEM.md` describe the corrected active direction; the prior all-soft refinement is marked historical. The sidecar `.impeccable/design.json` is synchronized in the documentation finish pass.

## Verification

Verified against the local production build on26October2026, with isolated browser demo state. Evidence: `.impeccable/review/cool-neo/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Homepage milestone before cross-product refinement |7 checks PASS | `public-results.json`;390/768/1440px renders, real hover/press measurements |
| TypeScript, ESLint and production build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` |
| Existing domain regression suite |34/34 PASS | `npm run test`, outside the known Windows sandbox user-info restriction |
| Motion, keyboard focus, form persistence and reduced motion |50 checks PASS | `motion-results.json` |
| Navigation, pending feedback, shared photograph and no-API fallback |6 checks PASS | `navigation-results.json` |
| Palette, contrast, selective blur/solid fallback and opaque finances |26 checks PASS | `material-results.json` |
| Responsive workflow | PASS;60 settled captures, no browser errors/overflow | `screens/results.json`;360/390/768/1024/1440px |
| Populated My Bookings | PASS;4 real fixture bookings at each width, no overflow | `my-bookings-390.png`, `my-bookings-768.png`, `my-bookings-1440.png` |
| Protected implementation | Unchanged | `scope-check.json`; only CSS file hashes differ |
| Changed-target detector | No findings; no suppressions | globals, editorial and motion CSS |
| Existing photography provenance |8 rasters,0missing | Impeccable asset scan |
| Independent finish review | SHIP |60 final captures valid; no material scope findings |
| Canonical metadata/snippets | PASS |25 source-matched color roles,6 hard/soft shadow tokens and11 parsed CSS snippets; HTML, category SVG and filter semantics preserved |
| Design-document lint |0 errors;13 reference warnings retained | Roles used in CSS are outside the frontmatter component-reference subset; no suppression or token deletion |

The actual workflow selects A102, retains equipment across wizard steps/authentication, validates capacity, simulates failed and successful payment, persists the paid deposit on refresh, obtains Host approval, cancels with an independent refund and performs Admin partner approval. Mobile filters/empty/reset and lightbox Escape also work. Separate interaction checks cover all nine booking filters, exact totals, native modality/focus trap/restoration, exiting-panel inertness, sidebar controls, browser history and stable calendar geometry.

Public and full-workflow screenshots were opened for visual inspection. The independent review judged the pinned user brief, canonical design and actual captures, with no missing or contradicted visual requirement found. No separate image comp or quality-bar card was supplied; the complete pinned brief provided the direction authority. Sidecar documentation is synchronized. Its11 snippets were source/schema checked and CSS parsed; a separate sidecar preview was not rendered in this pass.

## Accessibility and limits

Measured primary-action contrast is5.36:1, body12.58:1, muted-on-neutral5.27:1, control-boundary3.24:1, semantic pairs6.17–6.50:1 and balance text10.91:1. Written status labels remain independent of color. Existing reduced-motion behavior removes spatial effects and keeps immediate financial values/results. Animation timings, once-only observers, native focus management and router behavior are unchanged.

Testing uses Chromium viewport emulation. Physical mobile hardware, Safari/Firefox and Core Web Vitals measurements were not performed. Existing business audit issues remain outside this visual correction.
