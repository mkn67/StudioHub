import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import { atDate, type Booking } from "./models";
import { BUFFER, HOUR, MIN } from "./engine";
import { calendarInitialMinute, calendarY, clipCalendarInterval, confirmationDeadline, operationalAgenda, periodBounds, reportBounds, roomPopularity } from "./host-operations";

const date = "2026-10-27", day = atDate(date, 0);
const booking = (change: Partial<Booking> = {}): Booking => ({ ...structuredClone(initialState().bookings[0]), id: "test", roomId: "a101", status: "confirmed", start: day + 8 * HOUR, end: day + 10 * HOUR, ...change });
for (const minutes of [0, 480, 510, 540, 555, 600, 690, 1410, 1440]) test(`calendar maps minute ${minutes} to one exact scale`, () => {
  assert.equal(calendarY(day + minutes * MIN, day), minutes * .8);
});
test("rental and cleaning heights share the same coordinate mapping", () => {
  assert.deepEqual(clipCalendarInterval(day + 8 * HOUR, day + 10 * HOUR, day, day + 24 * HOUR), { top: 384, height: 96, clippedStart: false, clippedEnd: false });
  const buffer = clipCalendarInterval(day + 10 * HOUR, day + 10 * HOUR + BUFFER, day, day + 24 * HOUR)!;
  assert.equal(buffer.top, 480); assert.equal(buffer.height, 24);
});
test("periods clip display only, including midnight continuation and buffer-only portions", () => {
  const morning = periodBounds(date, "morning"), afternoon = periodBounds(date, "afternoon"), evening = periodBounds(date, "evening");
  assert.equal(clipCalendarInterval(day + 11 * HOUR, day + 14 * HOUR, morning.start, morning.end)!.height, 48);
  assert.equal(clipCalendarInterval(day + 11 * HOUR, day + 14 * HOUR, afternoon.start, afternoon.end)!.height, 96);
  assert.equal(clipCalendarInterval(day + 23.5 * HOUR, day + 24.5 * HOUR, evening.start, evening.end)!.height, 24);
  const next = periodBounds("2026-10-28", "full");
  assert.equal(clipCalendarInterval(day + 23.5 * HOUR, day + 24.5 * HOUR, next.start, next.end)!.top, 0);
  assert.equal(clipCalendarInterval(day + 24.5 * HOUR, day + 25 * HOUR, next.start, next.end)!.height, 24);
  assert.equal(clipCalendarInterval(day + 8 * HOUR, day + 9 * HOUR, afternoon.start, afternoon.end), null);
});
test("deadline distinguishes overdue, approaching, future and missing data without mutations", () => {
  const b = booking({ status: "pending", paidAt: day });
  assert.equal(confirmationDeadline(b, day + 2 * HOUR)!.state, "overdue");
  assert.equal(confirmationDeadline(b, day + 100 * MIN)!.state, "soon");
  assert.equal(confirmationDeadline(b, day)!.state, "upcoming");
  assert.equal(confirmationDeadline({ ...b, paidAt: undefined }, day)!.state, "unknown");
  assert.equal(confirmationDeadline({ ...b, status: "expired" }, day), null);
  assert.equal(b.status, "pending");
});
test("agenda derives real check-in/out/preparation tasks and excludes approval duplicates", () => {
  const b = booking(), tasks = operationalAgenda([b, booking({ id: "pending", status: "pending" })], day + 7 * HOUR);
  assert.deepEqual(tasks.map(t => t.key), ["test:checkin", "test:checkout", "test:cleaning"]);
  assert.equal(tasks[2].until! - tasks[2].at, BUFFER);
  assert.equal(operationalAgenda([booking({ status: "cancelled" })], day).length, 0);
  assert.equal(operationalAgenda([], day).length, 0);
});
test("agenda prioritizes overdue actions and accurately identifies remaining collections", () => {
  const b = booking({ status: "checked_in", total: 900000, deposit: 100000, collections: [] });
  const tasks = operationalAgenda([b], day + 11 * HOUR);
  assert.equal(tasks[0].urgent, true);
  assert.ok(tasks.some(t => t.key === "test:collection"));
  assert.ok(tasks.length <= 5);
});
test("week uses Monday local midnight and month handles leap year/year rollover", () => {
  assert.deepEqual(reportBounds("2026-10-25", "week"), { start: atDate("2026-10-19", 0), end: atDate("2026-10-26", 0) });
  assert.deepEqual(reportBounds("2028-02-29", "month"), { start: atDate("2028-02-01", 0), end: atDate("2028-03-01", 0) });
  assert.equal(reportBounds("2026-12-31", "month").end, atDate("2027-01-01", 0));
});
test("popularity uses physical rooms, accepted states, start attribution, no duplicate IDs and no buffer hours", () => {
  const s = initialState();
  s.bookings = [booking({ id: "one", start: day + 23.5 * HOUR, end: day + 25.5 * HOUR, total: 700000 }), booking({ id: "one" }),
    ...(["pending", "cancelled", "expired", "awaiting_payment", "no_show"] as const).map(status => booking({ id: status, status })),
    booking({ id: "two", roomId: "a102", status: "completed", total: 500000 }),
    booking({ id: "outside", start: atDate("2026-11-01", 0), end: atDate("2026-11-01", 2) })];
  const rows = roomPopularity(s, s.rooms.filter(r => r.typeId === "daylight"), date, "month");
  assert.equal(rows.find(r => r.room.id === "a101")!.count, 1);
  assert.equal(rows.find(r => r.room.id === "a101")!.hours, 2);
  assert.equal(rows.find(r => r.room.id === "a101")!.bookingValue, 700000);
  assert.equal(rows.find(r => r.room.id === "a102")!.count, 1);
  assert.equal(rows[0].relative, 1);
  assert.equal(roomPopularity({ ...s, bookings: [] }, s.rooms, date, "week")[0].relative, 0);
});
test("popularity sorts by count, hours then stable physical ID", () => {
  const s = initialState(); s.bookings = [booking({ id: "a" }), booking({ id: "b", roomId: "a102", end: day + 11 * HOUR })];
  const rooms = s.rooms.filter(r => r.typeId === "daylight");
  assert.equal(roomPopularity(s, rooms, date, "week")[0].room.id, "a102");
  s.bookings[1].end = day + 10 * HOUR;
  assert.equal(roomPopularity(s, rooms, date, "week")[0].room.id, "a101");
});
test("calendar initial viewport targets real scoped activity with one preceding hour", () => {
  const state = initialState(), before = structuredClone(state);
  state.bookings = [booking({ start: day + 10 * HOUR, end: day + 12 * HOUR }), booking({ id: "foreign", roomId: "a102", start: day + 3 * HOUR, end: day + 4 * HOUR })];
  const bookings = structuredClone(state.bookings);
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "full"), 540);
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "morning"), 300);
  assert.deepEqual(state.bookings, bookings); assert.deepEqual(state.studios, before.studios);
});
test("midnight continuation and buffer-only activity keep early hours accessible", () => {
  const state = initialState();
  state.bookings = [booking({ start: day - HOUR, end: day + .5 * HOUR })];
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "full"), 0);
  state.bookings = [booking({ start: day - 2 * HOUR, end: day - 15 * MIN })];
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "full"), 0);
});
test("empty calendar uses existing Studio hours; filtered and unrelated bookings cannot move it", () => {
  const state = initialState(); state.bookings = [booking({ status: "cancelled", start: day + 2 * HOUR, end: day + 3 * HOUR })];
  state.studios[0].operatingHours = { mode: "fixed", opens: "08:00", closes: "22:00" };
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "full"), 420);
  state.studios[0].operatingHours = { mode: "all_day" };
  assert.equal(calendarInitialMinute(state, [{ roomId: "a101", date }], "full"), 0);
  assert.equal(calendarInitialMinute(state, [], "full"), 0);
});
