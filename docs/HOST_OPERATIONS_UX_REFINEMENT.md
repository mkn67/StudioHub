# Host operations UX refinement

This extends the [Cool Neubrutalist dashboard system](DASHBOARD_DESIGN_SYSTEM.md). It refines existing Host routes, components and the shared browser demo repository. It introduces no PHP endpoint, booking transition or pricing formula. Previous dashboard work is preserved.

## Calendar coordinates and visibility

The previous calendar separately positioned time labels from an outer-column header offset (`42 + hour * 48`), positioned bookings inside the column body, and generated a fixed 08:00–22:00 grid. Those independent origins were brittle under header/style changes; boundary labels could be clipped. It also filtered by booking start date, omitting next-day continuations.

`HostCalendar` now uses a shared CSS grid for all headers and all timeline bodies. Headers occupy the same grid row and stick to the scroll region. Every timeline has the same 10px boundary-label inset. Axis labels, grid boundaries, rental blocks and cleaning blocks call the same functions in `domain/host-operations.ts`:

```
Y(timestamp) = (timestamp - visibleStart) / 60,000 * 0.8
height = Y(min(end, visibleEnd)) - Y(max(start, visibleStart))
```

One hour is 48px, 30 minutes 24px, 15 minutes 12px. No minimum event height distorts short rentals. Short blocks expose complete real timestamps/status through their accessible name and tooltip. Cleaning is a separate clipped `[booking.end, booking.end + BUFFER)` interval, including buffer-only continuations. It is never added to rented hours. Calendar reads the same active statuses as before.

Presets are visualization only:

| View | Local interval |
| --- | --- |
| Cả ngày | 00:00–24:00, including 00:00–05:00 |
| Buổi sáng | 05:00–12:00 |
| Buổi chiều | 12:00–18:00 |
| Buổi tối | 18:00–24:00 |

Intervals overlap the visible window using timestamps, not string hours or matching only the start date. An 11:00–14:00 rental shows 11:00–12:00 in Morning and 12:00–14:00 in Afternoon. A cross-midnight booking can appear on two dates with the same booking ID and unchanged real start/end. Arrows indicate clipping. `24:00` on the axis is the following midnight. All date/week calculations use Asia/Ho_Chi_Minh through the existing local-date helpers. Week starts on Monday.

The selected date, physical room, type and status survive preset changes. Day view retains its existing per-room columns; week view retains the physical-room selector. The grid scrolls locally, the hour column sticks horizontally, and date headers stick vertically. No event transform animation or operating-hours mutation occurs.

## Overview and agenda

The embedded calendar and duplicate “Ca thuê hôm nay” list were removed. The KPI count remains; “Xem lịch đặt phòng” opens `/host/calendar`. Pending confirmations stay separate from the new “Việc sắp diễn ra” agenda.

Agenda derives at most five items from the Host's real in-scope demo bookings, prioritizing overdue actions then scheduled time:

- Confirmed sessions starting within the next 24 hours; late check-in is labeled accurately while the session is still relevant.
- Expected checkouts within 24 hours, or checked-in sessions already past scheduled checkout.
- Scheduled post-rental 30-minute preparation intervals still relevant now or within 24 hours.
- Uncollected balances on checked-in/completed sessions ending within the prior/next 24 hours, using the existing `balance()` calculation.

Pending approval records are deliberately excluded from the agenda. Cancelled, expired and no-show records do not generate operational tasks. Each item links to its real booking and uses the physical room's code, actual timestamp and written status. Missing work produces the requested empty state instead of synthetic events. Preparation is a scheduled interval, not a claim that cleaning staff have accepted a task.

Confirmation remains `paidAt + 2 hours`. The component differentiates upcoming, approaching (within 30 minutes), overdue and missing payment timestamps. If a seeded pending record is overdue, it explicitly says “Quá hạn · trạng thái chưa cập nhật”. Reading the page does not silently change that booking. Existing engine transitions remain responsible for state changes. All comparisons use `state.now`, the deterministic demo clock, rather than system time.

## Pricing editor and persistence

`/host/rates` is now a compact Room Type list with Studio context, room count, base hourly price, enabled default plans, configuration status and each physical room's inheritance/override indicator. Complete forms mount only inside the selected editor.

The existing native `Modal` provides focus trap, Escape, focus restoration and GSAP/reduced-motion behavior. Desktop width is up to 1080px, with viewport-constrained internal scrolling and sticky header/footer. Mobile uses a full-screen editor. Tabs support arrow/Home/End keys and meaningful labels. Sections cover base pricing, packages/equipment/crew, featured selection and a real draft preview.

Room Type defaults and Room Unit overrides remain distinct. Opening A102 selects the A102 scope; its featured selector cannot accidentally target A101. Type scope can configure a featured plan for any actual child room. At most one effective featured selection per physical room is still enforced by the existing engine. Base pricing retains the previous behavior: once custom packages exist, effective prices are edited in those packages, rather than changing an unused legacy base field.

The editor reuses `RentalPackageManager`, `FeaturedPricingManager`, `PricingList` and their existing validation commands. Optional scope props preserve default behavior for any other caller. Existing included equipment, services, promotions, fixed sessions, package activation, crew and featured labels remain available.

`HostPricingDraftProvider` supplies the **same store context** with an in-memory draft and a scoped dispatch while the modal is open. It is not a second persistent repository. Typing stays in the existing form-local draft; switching tabs/scopes validates and captures that form into the temporary transaction. Featured actions also affect only this temporary state. Merely visiting an inherited package form does not materialize an override when its configuration is unchanged.

Only “Lưu thay đổi” replays the allowed pricing commands against the latest shared state using the existing `execute()` validations. The batch is persisted once through `browserRepository.save()` before the shared provider publishes success. Any invalid command or storage failure leaves shared state unchanged and the modal draft available to retry. Individual form save controls are hidden in this mode; they remain unchanged outside the modal. Closing/Escape, leaving through a preview link, or unloading with changes warns before discarding. Cancel never writes pricing changes.

Financial formulas and booking snapshots remain unchanged. Customer pricing observes saved changes through the same repository; no Customer Room Detail/Booking component was edited. There is no claim of server-side transaction isolation, concurrent booking safety or cross-browser synchronization.

## Physical-room popularity

“Phòng được đặt nhiều nhất” lives on the existing `/host/reports` route after the financial summary/activity charts, before reconciliation. Existing deposits, collections, refunds, balances and reconciliation remain intact.

- Weeks: Monday 00:00 through the following Monday 00:00, exclusive end.
- Months: local calendar month, inclusive first midnight and exclusive next month's first midnight.
- Attribution: scheduled rental **start**, with the full scheduled rental duration assigned to that period, including overnight continuations. Payment time is not used.
- Count: unique booking IDs with `confirmed`, `checked_in` or `completed` status. Pending, unpaid, cancelled, expired and no-show bookings are explicitly excluded.
- Hours: `(end - start) / HOUR`, never including preparation. This is scheduled booked time, not measured attendance.
- Value: sum of `booking.total`, labeled **Giá trị đơn**. It is not realized revenue, net collections, deposits, refunds or outstanding balances.
- Ranking: booking count descending, scheduled hours descending, stable physical room ID ascending. Room Type is supporting metadata only.
- Bars: booking count / highest displayed count, labeled relative booking count. No occupancy rate is claimed without a trustworthy operating-hours denominator.

Tied leaders are identified factually; periods without qualifying bookings have an empty state. No demo business figures were added to application fixtures. Tests use synthetic records only in isolated test/browser contexts.

## Room hierarchy

Host-only selectors strengthen Room Type headers (26px desktop/23px mobile, 750 weight, cyan edge), preserve Studio/category/price metadata and distinguish physical-room titles (19px desktop/18px mobile). Existing thumbnails remain consistently cropped at 108×82px. Edit, availability toggle and add-room/type actions retain their original handlers and native confirmations. No maintenance status was invented. Unrelated Admin styling and permissions remain unchanged.

## Changed files for this refinement

- `client/src/components/operations.tsx`
- `client/src/components/store.tsx` — additive scoped draft provider and atomic pricing-save path; existing authentication/dispatch paths unchanged.
- `client/src/domain/host-operations.ts`
- `client/src/domain/host-operations.test.ts`
- `client/src/domain/host-pricing.ts`
- `client/src/domain/host-pricing.test.ts`
- `client/src/features/dashboard/components/HostCalendar.tsx`
- `client/src/features/dashboard/components/HostInsights.tsx`
- `client/src/features/dashboard/components/HostPricing.tsx`
- `client/src/features/dashboard/styles/host-operations.css`
- `client/src/features/pricing/components/RentalPackageManager.tsx`
- `client/src/features/pricing/components/FeaturedPricingManager.tsx`
- `client/scripts/host-operations-qa.mjs`
- `client/scripts/rental-pricing-qa.mjs`
- `client/scripts/dashboard-qa.mjs`
- `docs/HOST_OPERATIONS_UX_REFINEMENT.md`
- `docs/DASHBOARD_DESIGN_SYSTEM.md` — update the earlier overview/pricing descriptions to reflect this refinement.

## Regression scenarios

Domain tests cover exact calendar boundaries (including 08:00, 08:30, 09:00, 09:15, 10:00, 11:30, 23:30 and next midnight), clipped periods/buffers, deadline states, agenda exclusion/urgency, Monday/Sunday and leap-year/month/year boundaries, cross-midnight popularity attribution, status exclusion, duplicate IDs, tie-breaking, pricing rollback, scope/permissions, included inventory and snapshot preservation.

`node scripts/host-operations-qa.mjs` measures rendered axis/line/event geometry, native scroll/sticky behavior, CSS zoom, day/week/period changes and five viewport widths. It also checks draft cancel/confirmation, keyboard tabs, scoped A102 save, featured/equipment persistence, Customer price propagation, simulated storage failure/retry, period reporting, room edit and pause/reactivate behavior. Screenshots are stored in `client/.impeccable/review/host-operations/`.

The existing `rental-pricing-qa.mjs` and `dashboard-qa.mjs` were adapted to open/save the new modal while preserving their existing business assertions. Run TypeScript, lint, all domain tests and production build as separate checks; inspect the rendered screenshots rather than treating geometry assertions as a visual review.

Executed results: `npm run typecheck`, `npm run lint` and `npm run build` passed. `npm test` passed 128 domain tests; `node --import tsx --test src/features/helpdesk/tests/*.test.ts` passed 20 adapter/bridge tests. `node scripts/host-operations-qa.mjs` passed 78 checks; `node scripts/rental-pricing-qa.mjs` passed 84 checks; `node scripts/dashboard-qa.mjs` passed 119 route/viewport/motion combinations plus its interaction assertions. The browser runs reported no page errors. Desktop/mobile screenshots of all five affected Host surfaces and the pricing editor were inspected. The build retains the pre-existing multiple-lockfile workspace-root warning.

## Limits and protected modules

All Host data and analytics remain based on the existing browser demo store. The demo clock may differ from today's actual date and seeded pending records may be inconsistent; the UI labels those inconsistencies instead of inventing status repairs. No live API-backed analytics or production booking concurrency is claimed. PHP, business schema, Helpdesk, 9Router, Customer Room Detail/Booking/Payment and booking/payment/refund state machines are untouched. No commit, push or deployment is part of this refinement.
