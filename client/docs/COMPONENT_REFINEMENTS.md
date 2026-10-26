# Category pictograms and boxed booking filters

Historical verification of the preceding visual system. Current palette, materials and component appearance follow root DESIGN.md and COOL_EDITORIAL_REFINEMENT.md; behavior evidence below remains a record of that earlier pass.

Verified 25 October 2026. Two scoped refinements within the existing Warm Editorial system. The palette, typography, page layouts and domain contracts remain unchanged.

## Homepage category illustrations

`StudioCategoryIllustration` replaces the homepage category cards' abstract shapes with custom inline SVG: camera, clapperboard, presentation board and studio microphone/waveform. A 160×100 canvas, four-unit stroke, paper/spot-ink fills and consistent placement create a matched editorial set. Halftone and a small print accent remain secondary. Artwork is hidden from assistive technology because the linked category title already conveys its meaning.

The centralized typed lookup consumes the actual category value. Supported future pictograms for Podcast, Livestream and Multipurpose do not create categories or change any ID. Unknown custom labels receive the modular-space fallback. The Host promotional section retains its separate abstract artwork.

The existing four-column desktop grid, responsive two-column layout, card titles/descriptions/links, borders and 90px desktop/64px mobile illustration stage are preserved. Hover, pressed and keyboard-focus states are consistent.

Verification: rendered homepage/card crops at 360/390/768/1024/1440px; eight actual category-link clicks at desktop/mobile returned the correct A101/A102, B101/B102, C101/C102 and D101/D102 room pairs. Keyboard Enter worked; no document overflow. Focus measured 3px with 5px offset, pressed shadow 2px with reduced motion respected. An independent reviewer identified all four objects from unlabeled artwork-only crops before inspecting their titles, then reviewed desktop/mobile cards: **SHIP**, no material corrections.

## My Bookings status filters

The status navigation uses compact square boxes, 1px neutral inactive borders and a terracotta/white active button with a 2px ink border. All targets are at least 44px high. Hover and visible keyboard focus are explicit; no shadow, gradient or rounded pill is introduced. The row uses local horizontal scrolling with nonwrapping labels. A resize observer keeps the active filter horizontally visible without scrolling the page vertically.

All nine Vietnamese labels remain unchanged. Controls use a labeled filter-button group with `aria-pressed`, rather than unsupported booking enums or tab-panel semantics. Counts derive from the same customer-owned, history-scoped and query-matched booking array used for results. A search therefore updates both counts and visible rows. No number is hardcoded in the application.

`all` combines the eligible records and is not a booking status. “Sắp tới” is a presentation predicate: booking status `confirmed` and scheduled start at or after the shared clock. A confirmed booking whose start has passed remains under “Tất cả”; no booking is transitioned, cancelled or hidden from the combined view. Other filters match the existing awaiting_payment/pending/checked_in/completed/cancelled/expired/no_show statuses directly.

Verification: 45 filter selections across 360/390/768/1024/1440px passed. Separate isolated fixtures exercised all eight statuses, a past-start confirmed record and a foreign customer's record. Checks confirmed ownership, future-start eligibility, query-aware badges, changed-data counts, history scoping, keyboard Space and active visibility after resizing. Actual base-data previews are saved separately from stress-test fixtures. No global overflow; active styling measured 2px border, 0px radius, no shadow and 44px height.

Independent boxed-filter review: **SHIP**, no material fixes. The reviewer inspected actual base-data desktop/mobile views, the rightmost selected state, keyboard focus and the scoped source/data boundary. This verdict covers the navigation refinement, not the rest of My Bookings or the domain engine.

## Files

- `src/components/studio-category-illustration.tsx`: SVGs and centralized typed presentation mapping.
- `src/components/marketplace.tsx`: category illustration integration; original filter URLs retained.
- `src/components/booking-status-filters.tsx`: typed filter definitions, counts, time-aware presentation predicate and horizontal selection visibility.
- `src/components/bookings.tsx`: only the CustomerBookings status navigation/filter plumbing; other booking/payment detail handlers untouched.
- `src/app/risograph.css`: scoped category illustration/interaction and booking-filter styling; no global tab redesign.
- `DESIGN.md`: component guidance without palette or typography changes.
- `.impeccable/design.json`: current pictogram and filter examples; prior nine examples and token metadata preserved.
- `docs/COMPONENT_REFINEMENTS.md`: this record.

## Checks and evidence

TypeScript, ESLint and the production Next.js build passed. The existing domain suite passed 34/34. Domain and fixture/repository files remain hash-identical; these changes add no API contracts or booking state transitions. One explicit detector scan for each new component returned no findings; no suppressions were added.

Evidence and independent reviews are in `.impeccable/review/category-pictograms/` and `.impeccable/review/booking-status-tabs/`. Browser contexts use isolated local demo storage. This is scoped UI verification, not a claim that earlier business-audit defects have been resolved.
