# Reproducible demo and verification

Run `npm.cmd run dev`, open the app, then reset **Môi trường demo** if you have changed fixtures. The shared clock starts at 25/10/2026 09:00 Vietnam time. All actions use this clock.

## Customer → deposit → Host → Customer

1. Visit `/rooms`. Choose a category, price, capacity, amenities or date/time; verify results change. Clear filters. Sort price and navigate pages.
2. Open `/rooms/a102`. Confirm A102, floor, lighting and policy. Open gallery and close with Escape.
3. Select a date at least 27h later (default is three days later), a supported plan and participant count. Try an invalid capacity; next must be blocked with an error.
4. Add optional equipment. Review room/equipment total, deposit and cancellation policy. Accept policies and continue with the inline Minh Anh demo login.
5. On `/payment/[id]`, simulate failure; retry before deadline and simulate success. Reservation becomes **Chờ chủ Studio duyệt**, deposit becomes paid.
6. Refresh. The same booking must persist. Switch to Host via login or development persona selector. Open the same ID in `/host/bookings/[id]`, confirm rental, then return to Customer. Status must be confirmed everywhere.
7. Customer cancels within snapshot cutoff, entering a reason. Booking becomes cancelled, paid deposit remains recorded, refund is separately pending. Host confirms simulated refund; verified failure automatically retries at most twice, then escalates to Admin.

## Deterministic exception scenarios

Use **Tải tình huống mẫu** in development. This replaces existing demo data after confirmation.

| Scenario | Actions and expected result |
| --- | --- |
| Giữ chỗ chờ cọc | Advance 180min: expired, room/equipment released, one strike only |
| Giao dịch cần đối soát | Load scenario: payment processing outlived 5min grace; expired hold, no strike, Admin reconciliation required |
| Host chờ xác nhận | Advance exactly 120min: cancelled, full deposit automatically refunded, no customer strike |
| Ca đang sử dụng | Host checks out: completed regardless of balance. Advance past end by31min first: two overtime blocks; collect partially, verify balance decreases |
| Hoàn cọc cần xử lý | Host simulates verified refund failure: three recorded attempts at most, then Admin manual-verification path |
| Tài khoản tạm ngưng | New booking and reschedule blocked. Existing records remain visible. Customer `/support` sends request; Admin reviews and restores; active strikes0, history retained |

## Other business cases

- Reserve one physical room, try an overlapping booking or a start inside its 30min preparation interval. It must fail; a distinct free unit may still be booked.
- Reserve all3 LED lights, try to rent another during the buffered overlap in another room. It must fail.
- Before payment deadline, choose processing, advance to deadline+4min, finish success: accepted. At deadline+5min unresolved: release hold and reconcile without strike. No new payment attempt after deadline.
- For a confirmed future booking, submit one change. Old room/time remains effective while pending. Host approval revalidates capacity/inventory, retains paid deposit and records before/after. Second successful change is blocked. Cheaper total below deposit creates excess-refund obligation.
- Advance a confirmed booking to its scheduled end without check-in: no-show, deposit retained, no new strike.
- Admin exceptional cancellation requires a reason and must occur strictly before start. Admin cannot edit Host rates.
- Check-in30min late preserves planned end. Completed with unpaid balance remains collectible. Reusing the same collection identifier or paying above balance is rejected.

## Automated commands

`npm.cmd run test` executes34 domain tests in `src/domain/engine.test.ts`. `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` validate the application.

For browser evidence, run the production server on3001 and `node scripts/production-qa.mjs`. This drives the real UI and writes screenshots/results into `.impeccable/review/production/`. Chromium must already be installed through Playwright. Developer time controls are intentionally absent in production; domain exception tests use the controllable clock directly.

Inspect desktop/mobile screenshots together. Check gallery cropping, filter sheet, all booking steps, validation, sign-in continuity, financial states, table containment, sidebar/drawer, and keyboard focus. Widths:360,390,768,1024,1440. Intentional table/calendar/Kanban scrolling must not overflow the document.
