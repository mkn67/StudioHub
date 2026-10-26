# StudioHub animation system — GSAP

StudioHub's Cool Neo-Brutalist geometry, colors, typography and layout are unchanged. GSAP now choreographs the public experience and handles imperative UI feedback. Hard-shadow compression and simple photographic hover stay in CSS. Native scrolling and Next navigation are preserved.

## Ownership

| Surface/property | Owner |
| --- | --- |
| Hero plate, subtitle and search entrance | GSAP Timeline |
| Once-only section/category reveals | GSAP ScrollTrigger and scoped tweens |
| Filter results, exact-price summary feedback, calendar/Kanban opacity | GSAP |
| Native dialog/drawer and directional booking-panel opacity/transform | GSAP |
| Decoded lightbox image change | GSAP |
| Button/card hover, hard shadows, mosaic zoom, status colors, native backdrop and toast feedback | CSS |
| Public page/shared Room Unit and booking-photo navigation | React/browser View Transitions |
| Retaining exiting DOM and step layout positioning | AnimatePresence/usePresence only |

There are no Motion DOM components, useAnimate calls or Motion-controlled opacity/transforms. AnimatePresence remains a lifecycle utility: safeToRemove runs after GSAP exit completion. Its popLayout mode positions outgoing wizard panels; GSAP owns their transform/opacity. Different owners never tween the same properties on the same DOM node.

## Runtime and tokens

src/components/motion/gsap-runtime.ts imports GSAP, ScrollTrigger, CustomEase and the official @gsap/react hook. Registration is guarded by typeof window; all animation setup occurs in useGSAP with a scoped ref. No animation executes during SSR. The original ten durations remain in tokens.ts: press120ms, hover160ms, icon/select180ms, dialog-in240ms/out180ms, page240ms, section460ms, card380ms and stagger70ms (capped210ms per group). CustomEase preserves the existing cubic-bezier(.16,1,.3,1) curve, also published as the original CSS token.

## Homepage choreography

The studiohub-hero timeline has plate and search labels. The white headline plate settles18px over the stationary photograph, supporting copy follows at100ms, search starts at160ms and CTA opacity follows at260ms. The overlapping sequence completes at540ms. Defaults are visible, and entrance opacity starts at.72 or higher. No CSS rule pre-hides essential content. No photograph arrives from a hidden state or moves continuously.

Ordinary reveal tweens use ScrollTrigger once:true, native viewport scrolling and immediateRender:false. They are created in DOM order; only actual sibling card groups stagger, with a210ms cap. There is no pinning, scrub, scroll proxy or smooth-scrolling replacement. Photographs and listing frames stay still; their section headings carry the reveal, and promotional copy receives opacity only. Ordinary section/category reveals use opacity only; compact category grids reveal one visible row at a time. The hero retains spatial choreography. Completed styles clear so CSS hover owns the final state. Hover/focus can finish an entrance immediately.

gsap.matchMedia handles reduced motion and automatically reverts media-scoped animations/triggers. Font-ready refresh is guarded against unmount and runs only after an actual font-layout dependency; ScrollTrigger handles resize itself. No custom scroll listener or permanent will-change is added.

## Marketplace and operational feedback

Real-ID shared photographs retain existing native route transitions. Mosaic zoom is a simple1.02 CSS hover with touch/reduced-motion fallbacks. GalleryImage preserves the existing Image DOM and dimensions. After a changed source actually loads/decodes, a240ms opacity/4px entrance acknowledges the image. Rapid changes cancel stale load/decode callbacks through active flags, listener cleanup and context reversion. The actual selection updates immediately.

useContentMotion commits actual filter/state changes first, then applies180ms opacity feedback without stale rows, remounting controls or intermediate monetary values. Host/Admin headings move only3px; calendars and Kanban receive opacity only. CSS retains current success/error, focus and disabled states. There is no fake processing delay or invented loading/success.

## Native overlays and wizard lifecycle

Native dialog.showModal, focus trapping/restoration, Escape, backdrop closure and body scroll lock remain in the existing Modal. GSAP animates the plain dialog; it moves12px vertically or16px horizontally for a drawer. Exit is shorter,8px/12px. Exiting content rejects repeated actions. Presence retains native modality until safeToRemove and the existing unmount cleanup close the dialog and restore focus.

Lifecycle scopes keep their GSAP context until unmount and kill superseded target tweens before an interrupted entrance/exit, preserving the current pose rather than snapping back. Reduced motion clears styles and completes removal immediately. Other dependency-driven effects use revertOnUpdate:true. Every context is reverted on unmount; delayed image/font callbacks have explicit cancellation guards. CSS handles the separate ::backdrop pseudo-element.

Booking step state remains in its original parent. Forward/backward panels use14px entrance/8px exit and the latest Presence direction; outgoing panels become inert and aria-hidden immediately. The initial first step relies on its parent dialog entrance. Quick reversals cancel old tweens and preserve selections, validation and exact totals. Domain handlers and transitions are unchanged.

## Accessibility and failure behavior

Reduced-motion preference changes are handled during active motion, not only at mount. Utility scopes subscribe through useSyncExternalStore; immediate reduced-motion removal runs after the Presence layout commit so native exits cannot become stranded. Native keyboard behavior, visible focus, status labels and touch targets remain intact. Public content has no animation-hidden default; failed or skipped animation leaves readable content. The existing application still prepares its client-side mock state before rendering product content, which is independent of this motion change.

## Official skill sources used

- ../.agents/skills/gsap-core/SKILL.md
- ../.agents/skills/gsap-timeline/SKILL.md
- ../.agents/skills/gsap-scrolltrigger/SKILL.md
- ../.agents/skills/gsap-react/SKILL.md
- ../.agents/skills/gsap-performance/SKILL.md

## Verification

Current implementation, performance samples, limits and checked routes are recorded in GSAP_MOTION_UPGRADE.md. Prior visual reports remain historical evidence of the unchanged design direction.
