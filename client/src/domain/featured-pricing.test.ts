import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import { browserRepository } from "../data/repository";
import { execute, price, roomRate, HOUR } from "./engine";
import { effectiveFeaturedPricing, effectivePricingPlans } from "./featured-pricing";
import type { FeaturedPricingBadge, Plan, State } from "./models";

const setup = () => { const state = initialState(); state.sessionId = "host"; return state; };
function feature(state: State, plan: Plan = "combo3", roomId = "a101", badge: FeaturedPricingBadge = "featured") {
  return execute(state, { type: "featured_pricing", roomId, selection: { plan, badge } });
}
test("legacy state has no implicit featured selection", () => {
  const state = setup();
  assert.equal(effectiveFeaturedPricing(state, "a101"), undefined);
  assert.ok(effectivePricingPlans(state, "a101").length > 0);
  assert.equal(state.rooms[0].featuredPricing, undefined);
});
test("Host selects, replaces and removes exactly one featured plan per Room Unit", () => {
  const selected = feature(setup());
  assert.equal(effectiveFeaturedPricing(selected, "a101")?.plan, "combo3");
  const changed = feature(selected, "hourly", "a101", "recommended");
  assert.deepEqual(effectiveFeaturedPricing(changed, "a101"), { typeId: "daylight", plan: "hourly", badge: "recommended" });
  assert.equal(effectivePricingPlans(changed, "a101").filter(r => r.plan === effectiveFeaturedPricing(changed, "a101")?.plan).length, 1);
  const removed = execute(changed, { type: "featured_pricing", roomId: "a101", selection: null });
  assert.equal(effectiveFeaturedPricing(removed, "a101"), undefined);
  assert.equal(removed.rooms.find(r => r.id === "a101")?.featuredPricing, undefined);
});
test("same-type Room Units have independent selections and override prices", () => {
  const state = setup(); state.rooms.find(r => r.id === "a102")!.rateOverride = 410000;
  const result = feature(feature(state), "combo5", "a102", "recommended");
  assert.equal(effectiveFeaturedPricing(result, "a101")?.plan, "combo3");
  assert.equal(effectiveFeaturedPricing(result, "a102")?.plan, "combo5");
  assert.equal(effectivePricingPlans(result, "a102").find(r => r.plan === "combo5")?.amount, 2050000);
  assert.equal(effectivePricingPlans(result, "a101").find(r => r.plan === "combo3")?.amount, 1050000);
});
test("disabling a supported plan suppresses its public featured badge", () => {
  const state = feature(setup());
  const updated = execute(state, { type: "rate", id: "daylight", hourlyRate: 350000, plans: ["hourly", "combo5"] });
  assert.equal(effectiveFeaturedPricing(updated, "a101"), undefined);
  assert.ok(!effectivePricingPlans(updated, "a101").some(p => p.plan === "combo3"));
  const restored = execute(updated, { type: "rate", id: "daylight", hourlyRate: 350000, plans: ["hourly", "combo3", "combo5"] });
  assert.equal(effectiveFeaturedPricing(restored, "a101"), undefined, "Re-enabling a plan must not silently restore a removed highlight.");
});
test("inactive, deleted, moved and inactive-Studio rooms cannot expose a featured badge", () => {
  for (const invalidate of [
    (s: State) => { s.rooms.find(r => r.id === "a101")!.active = false; },
    (s: State) => { s.rooms = s.rooms.filter(r => r.id !== "a101"); },
    (s: State) => { s.rooms.find(r => r.id === "a101")!.typeId = "cyclorama"; },
    (s: State) => { s.studios[0].active = false; },
  ]) {
    const state = feature(setup()); invalidate(state);
    assert.equal(effectiveFeaturedPricing(state, "a101"), undefined);
  }
});
test("invalid plans, inactive plans and unverified discount styles are rejected", () => {
  const state = setup();
  assert.throws(() => feature(state, "session"));
  assert.throws(() => feature(state, "combo24" as Plan));
  assert.throws(() => feature(state, "combo3", "a101", "offer" as FeaturedPricingBadge));
  state.rooms[0].active = false;
  assert.throws(() => feature(state));
});
test("only the owning Host may update featured metadata", () => {
  for (const user of ["customer", "admin", null]) {
    const state = setup(); state.sessionId = user; assert.throws(() => feature(state));
  }
  const state = setup(); state.studios[0].hostId = "another-host";
  assert.throws(() => feature(state));
});
test("featuring cannot change prices, deposits, bookings or other business state", () => {
  const state = setup(), changed = feature(state);
  assert.deepEqual(changed.bookings, state.bookings);
  assert.deepEqual(changed.users, state.users);
  assert.deepEqual(changed.types, state.types);
  assert.deepEqual(changed.studios, state.studios);
  assert.deepEqual(changed.equipment, state.equipment);
  assert.equal(roomRate(changed, "a101"), roomRate(state, "a101"));
  for (const rate of effectivePricingPlans(changed, "a101")) {
    const selection = { roomId: "a101", start: state.now + 5 * 24 * HOUR, end: state.now + 5 * 24 * HOUR + rate.hours * HOUR, plan: rate.plan, participants: 1, equipment: {} };
    assert.equal(price(changed, selection), price(state, selection));
    assert.equal(rate.amount, price(state, selection));
    assert.equal(Math.round(price(changed, selection) * state.studios[0].policy.depositPercent / 100), Math.round(price(state, selection) * state.studios[0].policy.depositPercent / 100));
  }
  assert.equal(state.rooms[0].featuredPricing, undefined);
});
test("featuring and room overrides survive the existing browser repository round trip", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) } });
  try {
    const state = setup(); state.rooms[0].rateOverride = 420000;
    browserRepository.save(feature(state));
    const restored = browserRepository.load();
    assert.equal(effectiveFeaturedPricing(restored, "a101")?.plan, "combo3");
    assert.equal(effectivePricingPlans(restored, "a101").find(p => p.plan === "combo3")?.amount, 1260000);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
