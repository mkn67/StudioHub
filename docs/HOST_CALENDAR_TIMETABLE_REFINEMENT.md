# Host calendar timetable refinement

## Findings and implementation

The timetable already used an accurate 48px/hour scale, but full-day view opened at midnight, leaving daytime bookings far below the initial viewport. Hour labels were small/muted; booking blocks had larger horizontal gutters and displayed verbose dates even in short blocks. Native booking links supported Enter, while Space scrolled the viewport.

The existing 0.8px/minute mapping is retained for hour/half-hour lines, event positions, clipped events and 30-minute buffers. Blocks now use 2px horizontal gutters and nearly fill the room column. They never receive a fake minimum duration/height. A stronger blue-neutral sticky axis uses 13px/600 labels, with dashed half-hour subdivisions. Typography follows available event height, showing code/time/status progressively; full real dates and state remain available through title and accessible name.

Full-day view still spans 00:00–24:00. A pure helper chooses an initial viewport one contextual hour before the earliest scoped active booking, including overnight/buffer carryover, and falls back to existing studio opening hours. Other period views retain their exact boundaries. “Về 00:00” reveals the beginning of full-day view. Filters/date/view changes update the initial viewport; unrelated renders do not overwrite manual scrolling.

Click and Enter keep the original booking-details link. Space activates the same link without scrolling. Focus outlines stay inside clipped columns; hover/pressed states never translate events away from their mapped time. Day/week, room/type/status filters, midnight segments and independent buffer links remain available. No booking/state engine is changed.

## Exact files

1. `client/src/domain/host-operations.ts` — pure initial-viewport helper using existing time/operating-hour utilities.
2. `client/src/domain/host-operations.test.ts` — activity scope, midnight/buffer carryover, fallback and immutability tests.
3. `client/src/features/dashboard/components/HostCalendar.tsx` — viewport, half-hour lines, progressive labels and keyboard activation.
4. `client/src/features/dashboard/styles/host-operations.css` — timetable-only compact layout/axis/event refinements.
5. `client/scripts/host-timetable-qa.mjs` — before/after screenshots and precise geometry/interaction checks.
6. `docs/HOST_CALENDAR_TIMETABLE_REFINEMENT.md` — this report.
7. `client/DESIGN.md` — current scoped specification reference.

## Validation

`npm run typecheck`, `npm run lint` and production build passed. Domain suite: 131 passed, including the three new initial-viewport tests. Focused timetable browser QA: 29 passed with no page errors. It verifies exact mapping for 2-hour, half-hour-offset, quarter-hour-offset, short, spanning and overnight test bookings, full-width blocks, independent 30-minute buffers, click/Enter/Space navigation, clipping, sticky axis/header, midnight access, all five requested widths and both motion preferences. Existing Host operations QA passed 78 checks; dashboard QA passed 119 responsive combinations; rental pricing QA passed 84 checks.

Screenshots: `client/.impeccable/review/host-timetable/before-1440.png`, `before-390.png`, `after-reduce-1440.png`, `after-reduce-390.png` and normal-motion variants. Synthetic bookings are confined to isolated browser storage. Business fixture data is unchanged. Dense day/week columns intentionally scroll horizontally. Very short clipped segments progressively omit visible detail, retaining their accessible full booking description. No live-backend or other-browser validation is claimed.
