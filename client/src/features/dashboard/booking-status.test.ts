import test from "node:test";
import assert from "node:assert/strict";
import { statusLabel } from "@/domain/models";
import { bookingRentalTime, bookingStatusVisual } from "./booking-status";

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
test("every real booking status has its written label, distinct background and accessible contrast", () => {
  assert.deepEqual(Object.keys(bookingStatusVisual).sort(), Object.keys(statusLabel).sort());
  assert.equal(new Set(Object.values(bookingStatusVisual).map(value => value.background)).size, 8);
  for (const [status, value] of Object.entries(bookingStatusVisual)) {
    assert.equal(value.label, statusLabel[status as keyof typeof statusLabel]);
    const text = luminance(value.text), background = luminance(value.background);
    assert.ok((Math.max(text, background) + .05) / (Math.min(text, background) + .05) >= 4.5, status);
  }
});
test("same-day rental uses local Vietnamese date and a compact time interval", () => {
  assert.equal(bookingRentalTime(Date.parse("2026-10-28T09:00:00+07:00"), Date.parse("2026-10-28T12:00:00+07:00")), "28/10 · 09:00–12:00");
});
test("overnight rental keeps both local dates rather than hiding midnight", () => {
  assert.equal(bookingRentalTime(Date.parse("2026-10-28T22:00:00+07:00"), Date.parse("2026-10-29T02:00:00+07:00")), "28/10 22:00 → 29/10 02:00");
  assert.equal(bookingRentalTime(Date.parse("2026-12-31T23:30:00+07:00"), Date.parse("2027-01-01T00:00:00+07:00")), "31/12 23:30 → 01/01 00:00");
});
