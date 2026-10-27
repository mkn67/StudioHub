import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import { browserRepository } from "../data/repository";
import { execute, HOUR, MIN, price, validateSelection } from "./engine";
import { atDate, type CrewPolicy, type OperatingHours, type RentalPlanConfig, type Selection, type State, type TimeSurcharge } from "./models";
import { blocksAt, effectiveRentalPlans, insideOperatingHours, operatingLabel, quoteRental, rentalDateTime, slotsForDate, validateCrewPolicy, validateOperatingHours, validateRentalPlans, validateTimeSurcharge } from "./rental";
import { effectiveFeaturedPricing, effectivePricingPlans } from "./featured-pricing";

function setup() { const s = initialState(); s.sessionId = "customer"; s.bookings = []; return s; }
function selection(s: State, start = "2026-10-30T09:00:00+07:00", hours = 2, extra: Partial<Selection> = {}): Selection {
  const value = Date.parse(start); return { roomId: "a101", start: value, end: value + hours * HOUR, plan: "hourly", participants: 1, equipment: {}, ...extra };
}
function combo(s: State, extra: Partial<RentalPlanConfig> = {}) {
  const p: RentalPlanConfig = { plan: "combo3", title: "Gói chụp 3 giờ", kind: "duration", durationMinutes: 180, price: 600000, includedEquipment: {}, includedServices: [], active: true, ...extra };
  s.types[0].rentalPlans = [p]; return p;
}
const crew: CrewPolicy = { included: 5, maximum: 10, surchargeEnabled: true, unit: "booking", amount: 50000 };
const night: TimeSurcharge = { enabled: true, start: "22:00", end: "05:00", method: "fixed", value: 100000 };

for (const [name, operating, start, hours, valid] of [
  ["fixed first boundary", { mode: "fixed", opens: "05:00", closes: "22:00" }, "05:00", 2, true],
  ["fixed last boundary", { mode: "fixed", opens: "05:00", closes: "22:00" }, "20:00", 2, true],
  ["before opening", { mode: "fixed", opens: "05:00", closes: "22:00" }, "04:30", 2, false],
  ["after closing", { mode: "fixed", opens: "05:00", closes: "22:00" }, "21:00", 2, false],
  ["overnight fixed", { mode: "fixed", opens: "18:00", closes: "02:00" }, "21:00", 4, true],
  ["overnight previous opening day", { mode: "fixed", opens: "18:00", closes: "02:00" }, "00:00", 2, true],
  ["overnight exceeds end", { mode: "fixed", opens: "18:00", closes: "02:00" }, "23:00", 4, false],
  ["24h cross midnight", { mode: "all_day" }, "23:00", 4, true],
  ["24h late slot", { mode: "all_day" }, "03:30", 1.5, true],
] as const) test(`operating hours: ${name}`, () => {
  const s = setup(); s.studios[0].operatingHours = operating as OperatingHours;
  const x = selection(s, `2026-10-30T${start}:00+07:00`, hours);
  assert.equal(insideOperatingHours(s.studios[0], x.start, x.end), valid);
  assert.equal(validateSelection(s, x) === null, valid);
});
test("legacy hours preserved, missing hours are not assumed all-day", () => {
  const s = setup(); assert.equal(operatingLabel(s.studios[0]), "08:00–22:00");
  s.studios[0].policy.openHour = NaN; assert.equal(insideOperatingHours(s.studios[0], atDate("2026-10-30", 9), atDate("2026-10-30", 10)), false);
});
test("surcharge window never extends operating hours", () => {
  const s = setup(); s.studios[0].timeSurcharge = night;
  assert.match(validateSelection(s, selection(s, "2026-10-30T22:00:00+07:00"))!, /giờ mở cửa/);
});
for (const hours of [{ mode: "fixed", opens: "08:00", closes: "08:00" }, { mode: "fixed", opens: "25:00", closes: "22:00" }, { mode: "other" }] as OperatingHours[])
  test(`invalid operating configuration ${JSON.stringify(hours)}`, () => assert.throws(() => validateOperatingHours(hours)));

for (const [label, start, duration, rule, expected] of [
  ["disabled", "22:00", 2, { ...night, enabled: false }, 0],
  ["outside window", "12:00", 2, night, 0],
  ["fixed all inside", "22:00", 2, night, 200000],
  ["fixed partially inside", "21:00", 2, night, 100000],
  ["fixed fractional", "21:30", 1, night, 50000],
  ["fixed midnight", "23:00", 4, night, 400000],
  ["percentage partially inside", "21:00", 2, { ...night, method: "percentage", value: 20 }, 70000],
  ["percentage all inside", "23:00", 2, { ...night, method: "percentage", value: 20 }, 140000],
] as [string, string, number, TimeSurcharge, number][]) test(`time surcharge: ${label}`, () => {
  const s = setup(); s.studios[0].operatingHours = { mode: "all_day" }; s.studios[0].timeSurcharge = rule;
  const x = selection(s, `2026-10-30T${start}:00+07:00`, duration, { equipment: { mic: 1 } });
  assert.equal(quoteRental(s, x).breakdown.timeSurcharge, expected);
});
test("percentage uses package price allocated by minutes, not standard hourly or equipment", () => {
  const s = setup(); combo(s); s.studios[0].operatingHours = { mode: "all_day" }; s.studios[0].timeSurcharge = { ...night, method: "percentage", value: 20 };
  const x = selection(s, "2026-10-30T21:00:00+07:00", 3, { plan: "combo3", equipment: { mic: 1 } });
  const p = quoteRental(s, x).breakdown; assert.equal(p.rental, 600000); assert.equal(p.timeSurcharge, 80000); assert.equal(p.equipment, 150000); assert.equal(p.total, 830000);
});
for (const rule of [{ ...night, start: "22:00", end: "22:00" }, { ...night, value: -1 }, { ...night, method: "percentage", value: 101 }, { ...night, start: "bad" }] as TimeSurcharge[])
  test(`invalid surcharge ${JSON.stringify(rule)}`, () => assert.throws(() => validateTimeSurcharge(rule)));

for (const [participants, unit, hours, expected] of [[4, "booking", 3, 0], [5, "booking", 3, 0], [8, "booking", 3, 150000], [8, "hour", 3, 450000], [8, "hour", 1.5, 225000]] as const)
  test(`crew: ${participants} people ${hours}h ${unit}`, () => { const s = setup(); s.rooms[0].crewPolicy = { ...crew, unit }; assert.equal(quoteRental(s, selection(s, undefined, hours, { participants })).breakdown.crewSurcharge, expected); });
test("disabled crew surcharge still enforces allowed maximum", () => {
  const s = setup(); s.rooms[0].crewPolicy = { ...crew, surchargeEnabled: false };
  assert.equal(quoteRental(s, selection(s, undefined, 2, { participants: 8 })).breakdown.crewSurcharge, 0);
  assert.match(validateSelection(s, selection(s, undefined, 2, { participants: 11 }))!, /10/);
  assert.match(validateSelection(s, selection(s, undefined, 2, { participants: 13 }))!, /10/);
});
for (const invalid of [{ ...crew, included: 0 }, { ...crew, maximum: 4 }, { ...crew, maximum: 13 }, { ...crew, amount: NaN }])
  test(`invalid crew ${JSON.stringify(invalid)}`, () => assert.throws(() => validateCrewPolicy(invalid, 12)));
test("package crew override changes allowance without exceeding maximum", () => {
  const s = setup(); s.rooms[0].crewPolicy = crew; const p = combo(s, { includedCrew: 8 });
  assert.equal(quoteRental(s, selection(s, undefined, 3, { participants: 8, plan: "combo3" })).breakdown.crewSurcharge, 0);
  assert.throws(() => validateRentalPlans(s, "uit", [{ ...p, includedCrew: 11 }], 12, crew));
});
test("included equipment is reserved once, paid extras alone are billed", () => {
  let s = setup(); combo(s, { includedEquipment: { light: 1, softbox: 2 }, includedServices: ["Chuẩn bị phông"] });
  const x = selection(s, undefined, 3, { plan: "combo3", equipment: { light: 1 } });
  const quote = quoteRental(s, x); assert.equal(quote.breakdown.equipment, 240000); assert.deepEqual(quote.totalEquipment, { light: 2, softbox: 2 });
  s = execute(s, { type: "create", selection: x }); assert.deepEqual(s.bookings.at(-1)!.rentalSnapshot!.totalEquipment, { light: 2, softbox: 2 });
  assert.equal(s.bookings.at(-1)!.status, "awaiting_payment");
  assert.match(validateSelection(s, { ...x, roomId: "a102" })!, /không đủ/);
});
test("insufficient included inventory makes every matching package slot unavailable", () => {
  let s = setup(); s = execute(s, { type: "create", selection: selection(s, undefined, 3, { roomId: "a102", equipment: { light: 3 } }) });
  combo(s, { includedEquipment: { light: 1 } });
  const x = selection(s, undefined, 3, { plan: "combo3" });
  assert.match(validateSelection(s, x)!, /kèm gói/);
  assert.ok(slotsForDate(s, x, "2026-10-30").find(slot => slot.label === "09:00")!.reason);
});
test("snapshot inventory remains reserved after Host changes bundle", () => {
  let s = setup(); combo(s, { includedEquipment: { light: 3 } }); const x = selection(s, undefined, 3, { plan: "combo3" });
  s = execute(s, { type: "create", selection: x }); s.types[0].rentalPlans![0].includedEquipment = {};
  assert.match(validateSelection(s, selection(s, undefined, 3, { roomId: "a102", plan: "combo3", equipment: { light: 1 } }))!, /không đủ/);
  s.sessionId = "host"; assert.throws(() => execute(s, { type: "equipment_save", equipment: { ...s.equipment[0], quantity: 2 } }));
});
test("fixed room amenities do not consume Studio shared inventory", () => {
  const s = setup(); s.rooms[0].included = ["Đèn cố định"]; assert.deepEqual(quoteRental(s, selection(s)).totalEquipment, {});
});
test("session with next-day end preserves exact configured interval", () => {
  const s = setup(); s.studios[0].operatingHours = { mode: "all_day" };
  const p = combo(s, { plan: "session", kind: "session", sessionStart: "22:00", sessionEnd: "02:00", durationMinutes: 240 });
  validateRentalPlans(s, "uit", [p], 12);
  assert.equal(validateSelection(s, selection(s, "2026-10-30T22:00:00+07:00", 4, { plan: "session" })), null);
  assert.match(validateSelection(s, selection(s, "2026-10-30T22:30:00+07:00", 4, { plan: "session" }))!, /Thời lượng/);
  assert.match(validateSelection(s, selection(s, "2026-10-30T22:00:00+07:00", 3, { plan: "session" }))!, /Thời lượng/);
});
test("full interval plus both cleaning-buffer boundaries are checked", () => {
  let s = setup(); s = execute(s, { type: "create", selection: selection(s, "2026-10-30T09:00:00+07:00", 2) });
  const template = selection(s, undefined, 1);
  const slots = slotsForDate(s, template, "2026-10-30");
  assert.ok(slots.find(t => t.label === "08:00")!.reason); assert.ok(slots.find(t => t.label === "11:00")!.reason); assert.equal(slots.find(t => t.label === "11:30")!.reason, null);
});
test("duration changes invalidate otherwise valid start slots", () => {
  let s = setup(); s = execute(s, { type: "create", selection: selection(s, "2026-10-30T12:00:00+07:00") });
  assert.equal(slotsForDate(s, selection(s, undefined, 1), "2026-10-30").find(t => t.label === "10:00")!.reason, null);
  assert.ok(slotsForDate(s, selection(s, undefined, 3), "2026-10-30").find(t => t.label === "10:00")!.reason);
});
test("calendar has fully free, partial and fully occupied days without exposing bookings", () => {
  const s = setup(); s.studios[0].operatingHours = { mode: "all_day" }; const x = selection(s, undefined, 1);
  assert.equal(slotsForDate(s, x, "2026-10-30").filter(t => !t.reason).length, 48);
  const held = execute(s, { type: "create", selection: x }); assert.ok(slotsForDate(held, x, "2026-10-30").filter(t => !t.reason).length < 48);
  const full = execute(s, { type: "create", selection: selection(s, "2026-10-30T00:00:00+07:00", 24) });
  assert.equal(slotsForDate(full, x, "2026-10-30").filter(t => !t.reason).length, 0);
});
test("lead time uses 24h plus configured deposit window", () => {
  const s = setup(); const x = selection(s); x.start = s.now + 24 * HOUR; x.end = x.start + HOUR;
  assert.match(validateSelection(s, x)!, /24 giờ/); assert.ok(slotsForDate(s, x, "2026-10-25").every(t => t.reason));
});
test("effective holds honor expiry and pre-deadline payment-processing grace", () => {
  const s = execute(setup(), { type: "create", selection: selection(setup()) }), b = s.bookings.at(-1)!;
  assert.equal(blocksAt(b, b.deadline - 1), true); assert.equal(blocksAt(b, b.deadline), false);
  b.paymentAttempts.push({ id: "probe", at: b.deadline - MIN, status: "processing" });
  assert.equal(blocksAt(b, b.deadline + 4 * MIN), true); assert.equal(blocksAt(b, b.deadline + 5 * MIN), false);
  b.status = "pending"; b.paidAt = s.now; assert.equal(blocksAt(b, s.now + 119 * MIN), true); assert.equal(blocksAt(b, s.now + 120 * MIN), false);
  for (const status of ["cancelled", "expired", "no_show", "completed"] as const) { b.status = status; assert.equal(blocksAt(b, s.now), false); }
});
test("rental snapshots and deposit survive later price, crew, bundle and hours edits", () => {
  let s = setup(); combo(s, { includedEquipment: { light: 1 } }); s.rooms[0].crewPolicy = crew;
  const x = selection(s, undefined, 3, { plan: "combo3", participants: 8, equipment: { light: 1 } });
  const expected = quoteRental(s, x); s = execute(s, { type: "create", selection: x });
  assert.equal(s.bookings.at(-1)!.total, 990000); assert.equal(s.bookings.at(-1)!.deposit, 297000);
  s.types[0].rentalPlans![0].price = 2000000; s.rooms[0].crewPolicy!.amount = 100000; s.studios[0].operatingHours = { mode: "all_day" };
  assert.deepEqual(s.bookings.at(-1)!.rentalSnapshot, expected); assert.equal(s.bookings.at(-1)!.total, 990000);
});
test("Host plan, hours, included equipment and crew updates use shared browser repository", () => {
  let s = setup(); s.sessionId = "host"; const p = combo(s, { includedEquipment: { light: 1 } });
  s = execute(s, { type: "rental_plans", target: "type", id: "daylight", plans: [p] });
  s = execute(s, { type: "rental_settings", studioId: "uit", operatingHours: { mode: "all_day" }, timeSurcharge: night });
  s = execute(s, { type: "crew_policy", roomId: "a101", policy: crew });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage"); let saved = "";
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => saved, setItem: (_k: string, v: string) => { saved = v; } } });
  try { browserRepository.save(s); const restored = browserRepository.load(); assert.equal(effectiveRentalPlans(restored, "a101")[0].price, 600000); assert.deepEqual(quoteRental(restored, selection(restored, undefined, 3, { plan: "combo3" })).totalEquipment, { light: 1 }); assert.equal(validateSelection(restored, selection(restored, "2026-10-30T23:00:00+07:00", 3, { plan: "combo3" })), null); }
  finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage"); }
});
test("room-specific package override wins and removed override restores inheritance", () => {
  let s = setup(); const p = combo(s); s.sessionId = "host";
  s = execute(s, { type: "rental_plans", target: "room", id: "a101", plans: [{ ...p, price: 700000 }] });
  assert.equal(effectiveRentalPlans(s, "a101")[0].price, 700000); assert.equal(effectiveRentalPlans(s, "a102")[0].price, 600000);
  s = execute(s, { type: "rental_plans", target: "room", id: "a101", plans: null }); assert.equal(effectiveRentalPlans(s, "a101")[0].price, 600000);
});
test("inactive custom featured plan is cleared and highlighting cannot affect quotes", () => {
  let s = setup(); const p = combo(s); s.sessionId = "host";
  const x = selection(s, undefined, 3, { plan: "combo3" }), before = price(s, x);
  s = execute(s, { type: "featured_pricing", roomId: "a101", selection: { plan: "combo3", badge: "featured" } }); assert.equal(price(s, x), before);
  s = execute(s, { type: "rental_plans", target: "type", id: "daylight", plans: [{ ...p, active: false }] }); assert.equal(effectiveFeaturedPricing(s, "a101"), undefined);
});
test("discount display requires real positive configured savings and correct dates", () => {
  const s = setup(); const p = combo(s, { price: 1500000 });
  assert.equal(effectivePricingPlans(s, "a101")[0].promotionDisplay, undefined);
  p.promotion = { originalPrice: 1800000, startsOn: "2026-10-25", endsOn: "2026-10-30" }; validateRentalPlans(s, "uit", [p], 12);
  assert.equal(effectivePricingPlans(s, "a101")[0].promotionDisplay!.savings, 300000);
  assert.equal(quoteRental(s, selection(s, undefined, 3, { plan: "combo3" })).breakdown.discountSavings, 300000);
  assert.equal(quoteRental(s, selection(s, "2026-10-31T09:00:00+07:00", 3, { plan: "combo3" })).breakdown.rental, 1800000);
  assert.throws(() => validateRentalPlans(s, "uit", [{ ...p, promotion: { ...p.promotion!, originalPrice: p.price } }], 12));
});
for (const userId of ["customer", "admin", null]) test(`rental configuration requires owning Host, rejects ${userId}`, () => {
  const s = setup(); s.sessionId = userId;
  assert.throws(() => execute(s, { type: "rental_settings", studioId: "uit", operatingHours: { mode: "all_day" } }));
  assert.throws(() => execute(s, { type: "crew_policy", roomId: "a101", policy: crew }));
  assert.throws(() => execute(s, { type: "rental_plans", target: "room", id: "a101", plans: [] }));
});
test("consecutive mock holds cannot allocate the same included stock twice", () => {
  let s = setup(); combo(s, { includedEquipment: { light: 2 } });
  const x = selection(s, undefined, 3, { plan: "combo3" }); s = execute(s, { type: "create", selection: x });
  const before = structuredClone(s);
  assert.throws(() => execute(s, { type: "create", selection: { ...x, roomId: "a102" } }), /không đủ/);
  assert.deepEqual(s, before);
});
test("editing room capacity cannot bypass its saved crew policy", () => {
  const s = setup(); s.sessionId = "host"; s.rooms[0].crewPolicy = crew;
  const room = { ...s.rooms[0], capacity: 8 }; delete room.crewPolicy;
  assert.throws(() => execute(s, { type: "room_save", room }), /sức chứa/);
});
test("booked equipment surcharge is snapshotted even when the current equipment rate changes", () => {
  let s = setup(); const x = selection(s, undefined, 2, { equipment: { light: 1 } });
  s = execute(s, { type: "create", selection: x }); const snapshot = structuredClone(s.bookings.at(-1)!.rentalSnapshot);
  s.sessionId = "host"; s = execute(s, { type: "equipment_save", equipment: { ...s.equipment[0], hourlyRate: 100000 } });
  assert.deepEqual(s.bookings.at(-1)!.rentalSnapshot, snapshot); assert.equal(snapshot!.breakdown.equipment, 160000);
});
test("package configuration validates foreign inventory, unavailable quantities and fixed session duration", () => {
  const s = setup(), p = combo(s);
  assert.throws(() => validateRentalPlans(s, "another-studio", [{ ...p, includedEquipment: { light: 1 } }], 12));
  assert.throws(() => validateRentalPlans(s, "uit", [{ ...p, includedEquipment: { light: 4 } }], 12));
  assert.throws(() => validateRentalPlans(s, "uit", [{ ...p, kind: "session", sessionStart: "08:00", sessionEnd: "12:00" }], 12));
  assert.throws(() => validateRentalPlans(s, "uit", [p, p], 12));
});
test("equipment editor rejects non-integer money and oversized mock media", () => {
  const s = setup(); s.sessionId = "host";
  assert.throws(() => execute(s, { type: "equipment_save", equipment: { ...s.equipment[0], hourlyRate: NaN } }));
  assert.throws(() => execute(s, { type: "equipment_save", equipment: { ...s.equipment[0], image: "x".repeat(150001) } }));
});
test("invalid or unbounded quote duration fails before surcharge-window iteration", () => {
  const s = setup(); s.studios[0].timeSurcharge = night;
  for (const hours of [0, NaN, Infinity, 1e12]) assert.throws(() => quoteRental(s, selection(s, undefined, hours)));
});
test("customer intervals explicitly format Vietnamese dates across midnight", () => {
  assert.equal(rentalDateTime(Date.parse("2026-10-30T23:00:00+07:00")), "30/10/2026, 23:00");
  assert.equal(rentalDateTime(Date.parse("2026-10-31T02:00:00+07:00")), "31/10/2026, 02:00");
});
