import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import { quoteRental, rentalSelectionError } from "./rental";
import { HOUR } from "./engine";
import { atDate, localDate } from "./models";
test("redacted API availability blocks physical room without customer records", () => {
  const s = initialState(); s.bookings = [];
  const room = s.rooms.find(room => room.active)!;
  const start = atDate(localDate(s.now + 4 * 24 * HOUR), 9);
  const x = { roomId: room.id, start, end: start + 2 * HOUR, participants: 1, plan: "hourly" as const, equipment: {} };
  assert.equal(rentalSelectionError(s, x), null);
  s.availability = [{ roomId: room.id, start: x.end + 30 * 60000 - 1, end: x.end + HOUR, equipment: {} }];
  assert.match(rentalSelectionError(s, x)!, /giữ|chuẩn bị/);
  s.availability[0].start++;
  assert.equal(rentalSelectionError(s, x), null);
});
test("session equipment API contract charges once across multiple hours", () => {
  const s = initialState(); s.bookings = [];
  const room = s.rooms.find(room => room.active)!;
  const studioId = s.types.find(type => type.id === room.typeId)!.studioId;
  const item = s.equipment.find(item => item.studioId === studioId && item.active)!;
  item.pricingUnit = "session"; item.hourlyRate = 100001;
  const start = atDate(localDate(s.now + 4 * 24 * HOUR), 9);
  const quote = quoteRental(s, { roomId: room.id, start, end: start + 3 * HOUR, participants: 1, plan: "hourly", equipment: { [item.id]: 1 } });
  assert.equal(quote.breakdown.equipment, 100001);
});
