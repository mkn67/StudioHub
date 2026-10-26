# GSAP motion upgrade

StudioHub now uses GSAP for choreographed and imperative motion while preserving Cool Neo-Brutalist tokens, photography, page layouts, native scrolling, navigation and domain workflows. The five official installed skills were read and followed: gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-react and gsap-performance.

## Incremental implementation

The existing Motion-driven implementation was inspected first. Homepage Timeline/ScrollTrigger work was implemented and rendered at390/768/1440px before gallery and transactional migration. A production baseline was recorded before installation. Because that initial build did not include all existing source content, a second controlled baseline restored only the original motion engine with the same current page content; the final GSAP source was then restored byte-for-byte before further refinement.

| Area | Implementation |
| --- | --- |
| Runtime | GSAP3.15.0, @gsap/react2.1.2, scoped useGSAP, browser-only registration, canonical CustomEase |
| Hero | Labeled plate/search timeline with overlapping subtitle and CTA feedback;540ms total; photograph stays stationary |
| Reveals | Native-scroll ScrollTrigger once:true; visible defaults, bounded category stagger, visible-row batches on compact grids |
| Tactile states | Existing CSS hard-shadow hover/press and image zoom retained; completed GSAP transforms clear so CSS regains ownership |
| Gallery | Existing shared route-photo transitions retained; CSS mosaic hover; lightbox changes animate after actual image load/decode with stale-callback cancellation |
| Overlays/wizard | GSAP owns native dialog/drawer and step opacity/transform; Presence only retains DOM and step positioning; focus/inert/scroll-lock lifecycle preserved |
| Customer/Host/Admin | GSAP opacity feedback on committed results and exact amounts, tiny operational headings, unchanged calendar coordinates and quiet tables |

Motion no longer controls DOM opacity or transforms: there are no m components, useAnimate calls or Motion DOM feature provider. AnimatePresence/usePresence remain for safe unmount coordination. GSAP and CSS/native transitions have distinct property ownership. See `ANIMATION_SYSTEM.md` for the full ownership matrix, timing, cleanup and failure behavior.

## Cleanup, accessibility and performance decisions

useGSAP owns every animation context and scoped ref. Dependency-driven filters/gallery revert on updates; overlay contexts retain the current pose for interruptions, kill superseded target tweens and revert on unmount. gsap.matchMedia handles preference/breakpoint changes. Delayed font/image work has explicit cancellation guards. Ordinary triggers use once:true without pinning, scrub, scroll proxies or custom scroll listeners. Finished inline properties are cleared; no permanent will-change is introduced.

Essential content has no CSS animation-hidden default, and entrance opacity never reaches zero. Hover/focus finishes a pending decorative entrance. Reduced-motion changes during active animations leave content visible and complete native exit cleanup. Outgoing wizard panels remain inert; selections and validation stay in their existing parent. Financial values are never interpolated through incorrect amounts.

Performance probing identified unnecessary work moving entire photographic cards and multiple below-fold groups. Listings/photographs now stay still; ordinary section/category reveals use opacity only, compact category grids animate one visible row at a time, and the hero retains spatial choreography. The existing mock-state preparation surface now reserves the available viewport height, preventing its footer from shifting out of view on initialization. This changes neither loaded layouts nor preparation timing.

## Source scope

New: `src/components/motion/gsap-runtime.ts`, `gallery-image.tsx` and `reduced-motion.ts`.

Updated: `src/components/motion/system.tsx`, native animation bindings in `src/components/ui.tsx`, the presentation-only GalleryImage binding in `marketplace.tsx`, the initial-step presentation prop in `wizard.tsx`, provider removal in `src/app/layout.tsx`, motion-only CSS in `src/app/motion.css`, and the preparation placeholder height in `src/app/globals.css`. `package.json`/lockfile add the requested GSAP packages. No domain/state/service contract or business handler is rewritten.

`DESIGN.md`, `ANIMATION_SYSTEM.md`, `SURFACE_BRIEF.md` and `.impeccable/design.json` describe the current animation system. Previous visual reports remain historical. No photograph, icon geometry, color, font or current design token was changed.

## Verification and limits

Production evidence is stored under `.impeccable/review/gsap/`. Browser sessions use isolated demo data. Final QA, controlled performance samples and independent review are recorded below after the finish pass. Performance probes are local Chromium observations, not a physical-device FPS guarantee or a Core Web Vitals certification. Physical mobile hardware, Safari and Firefox were not tested.

| Verification | Result | Evidence |
| --- | --- | --- |
| Homepage milestone before broader migration |7 checks PASS | `public-results.json`;390/768/1440px |
| Existing domain tests |34/34 PASS | `npm run test` |
| TypeScript, ESLint and production build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` |
| Existing interaction and keyboard regression suite |50 checks PASS | `motion-results.json` |
| GSAP timing, visibility, preferences, rapid gallery and interrupted overlay/step interactions |14 checks PASS | `gsap-results.json` |
| Navigation and shared-photo/no-API fallback |6 checks PASS | `navigation-results.json` |
| Preserved visual tokens, contrast, blur and opaque finances |26 checks PASS | `material-results.json` |
| Complete responsive product workflows | PASS;60 final settled captures | `screens/results.json`;360/390/768/1024/1440px |
| Detached DOM cleanup |15 detached nodes,0 subsequent style mutations,0 pin spacers | `cleanup-results.json` |
| Protected source and handlers | PASS | `scope-results.json`;10 protected files unchanged, native/wizard event callbacks unchanged |
| Design detector/provenance | No findings or suppressions;8 rasters,0missing | Changed-source scan and existing asset scan |

## Performance observations

The controlled comparison uses the same page content, fonts and decoded images, then applies4× CPU throttling during a90-frame native scroll sweep. Results below are one final local sample per width; earlier stress runs varied substantially and are retained in the evidence. There is no statistically established FPS guarantee.

| Metric | Original engine1440px | Final GSAP1440px | Original engine390px | Final GSAP390px |
| --- | ---: | ---: | ---: | ---: |
| Scroll frame interval p95 |38.9ms |21.7ms |38.3ms |34.1ms |
| Scroll task time |1373.5ms |881.7ms |1411.6ms |1392.2ms |
| Scroll layout time |42.9ms |15.0ms |51.0ms |17.6ms |
| CLS during scroll |0 |0 |0 |0 |
| Initial observed CLS |.28865 |.000117 |.31520 |.0000093 |
| Loaded encoded JavaScript |229805bytes |234112bytes |229805bytes |234112bytes |

Sources: `performance-baseline-warm.json` and `performance-final-fades.json`. The sampled net JavaScript increase is4307bytes (about1.9%); subsequent lifecycle fixes measured234175bytes loaded in the interaction suite. The initial CLS improvement comes from reserving the preparation viewport, rather than hiding content or adding a delay. LCP/cold-start readings varied with loading and host conditions, so they are not used to claim a Core Web Vitals improvement. Long-tail intervals under throttling still exceed a16.7ms frame budget; physical-device profiling remains necessary before making a60fps claim.

## Final review

Independent Impeccable finish review: **ship**, with no material fixes in this motion scope (`finish-review.md`). The final production run passed all14 GSAP checks, all50 interaction/keyboard checks and34 domain tests, with no browser errors. Responsive workflow captures cover360/390/768/1024/1440px. The live reduced-motion test caught and resolved an immediate-exit ordering issue: removal now occurs after Presence registers its layout commit.

Design documentation lint reports0 errors and13 existing orphan-token warnings; no suppressions were added. Those warnings concern tokens used in CSS but not referenced by frontmatter components and remain outside this motion update.

The required documenter synchronized DESIGN.md and .impeccable/design.json against the finished implementation:25 colors, six shadow tokens and all11 static component snippets were preserved.
