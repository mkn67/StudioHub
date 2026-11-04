import test from "node:test";
import assert from "node:assert/strict";
import { rentalRange, sqlVietnamTime, vnTimestamp, type Rate } from "./contracts";
const rate: Rate = { rate_id: 1, rate_unit: "hour", unit_minutes: 60, unit_price: 300000, minimum_units: 1, maximum_units: 4 };
test("rental timestamps remain Vietnam-local across midnight and browser timezones", () => {
  for (const tz of ["UTC", "America/Los_Angeles", "Asia/Ho_Chi_Minh"]) {
    const previous = process.env.TZ;
    process.env.TZ = tz;
    try {
      assert.deepEqual(rentalRange("2026-11-02", "23:30", 2, rate), { start_time: "2026-11-02 23:30:00", end_time: "2026-11-03 01:30:00" });
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  }
});
test("configured package duration is used without invented discounts or durations", () => {
  assert.equal(rentalRange("2026-11-02", "08:00", 1, { ...rate, rate_unit: "session", unit_minutes: 150 }).end_time, "2026-11-02 10:30:00");
  assert.throws(() => rentalRange("2026-11-02", "08:00", 5, rate));
  assert.throws(() => rentalRange("2026-11-02", "08:00", 1.5, rate));
  assert.throws(() => rentalRange("invalid", "08:00", 1, rate));
  assert.throws(() => rentalRange("2026-02-30", "08:00", 1, rate));
});
test("API timestamps accept SQL dates and existing timezone suffixes", () => {
  assert.equal(vnTimestamp("2026-11-02 09:00:00").toISOString(), "2026-11-02T02:00:00.000Z");
  assert.equal(vnTimestamp("2026-11-02T02:00:00Z").toISOString(), "2026-11-02T02:00:00.000Z");
  assert.equal(sqlVietnamTime(new Date("2026-11-02T20:00:00Z")), "2026-11-03 03:00:00");
});
