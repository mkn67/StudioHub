import test from "node:test";
import assert from "node:assert/strict";
import { calendarSegments, reportingPreset, shiftDate } from "@/features/host/host-presentation";

test("Host report presets preserve exclusive end dates and Vietnam calendar boundaries", () => {
  assert.deepEqual(reportingPreset("7", "2026-11-04"), { from: "2026-10-29", to: "2026-11-05" });
  assert.deepEqual(reportingPreset("30", "2026-11-04"), { from: "2026-10-06", to: "2026-11-05" });
  assert.deepEqual(reportingPreset("month", "2026-12-04"), { from: "2026-12-01", to: "2027-01-01" });
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
});

test("timetable keeps exact minute positions and timestamps, without inventing buffers", () => {
  const slot = { busy_start: "2026-11-04 09:15:00", busy_end: "2026-11-04 11:45:00" };
  const segments = calendarSegments([slot], "2026-11-04", 1);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0], { ...slot, day: 0, start: 555, end: 705, lane: 0, lanes: 1 });
  assert.equal(segments[0].end - segments[0].start, 150);
});

test("cross-midnight intervals are clipped for display without changing source timestamps", () => {
  const slot = { busy_start: "2026-11-04 23:30:00", busy_end: "2026-11-05 01:15:00" };
  const segments = calendarSegments([slot], "2026-11-04", 2);
  assert.deepEqual(segments.map(s => [s.day, s.start, s.end]), [[0, 1410, 1440], [1, 0, 75]]);
  for (const segment of segments) { assert.equal(segment.busy_start, slot.busy_start); assert.equal(segment.busy_end, slot.busy_end); }
  assert.equal(calendarSegments([slot], "2026-11-06", 1).length, 0);
});

test("overlaps get separate visual lanes and timezone offsets remain exact", () => {
  const segments = calendarSegments([
    { busy_start: "2026-11-04T02:00:00Z", busy_end: "2026-11-04T04:00:00Z" },
    { busy_start: "2026-11-04 10:00:00", busy_end: "2026-11-04 12:00:00" },
    { busy_start: "2026-11-04 12:00:00", busy_end: "2026-11-04 12:30:00" },
  ], "2026-11-04", 1);
  assert.equal(segments[0].start, 540);
  assert.equal(segments[0].lane, 0); assert.equal(segments[1].lane, 1); assert.equal(segments[2].lane, 0);
  assert.ok(segments.every(s => s.lanes === 2));
});
