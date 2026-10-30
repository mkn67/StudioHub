import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import { applyHostPricing, type HostPricingCommand } from "./host-pricing";
import { effectiveRentalPlans } from "./rental";
import { effectiveFeaturedPricing } from "./featured-pricing";
import type { RentalPlanConfig } from "./models";

function hostState() { const state = initialState(); state.sessionId = "host"; return state; }
test("pricing batch isolates physical override and keeps snapshots/equipment/default inheritance", () => {
  const state = hostState(), before = structuredClone(state);
  const plans = effectiveRentalPlans(state, "a102").map<RentalPlanConfig>(plan => ({ ...plan, price: plan.plan === "combo3" ? 750000 : plan.price, includedEquipment: plan.plan === "combo3" ? { light: 1 } : plan.includedEquipment }));
  const saved = applyHostPricing(state, [{ type: "rental_plans", target: "room", id: "a102", plans }, { type: "featured_pricing", roomId: "a102", selection: { plan: "combo3", badge: "featured" } }]);
  assert.deepEqual(state, before);
  assert.equal(effectiveRentalPlans(saved, "a102").find(p => p.plan === "combo3")!.price, 750000);
  assert.equal(saved.rooms.find(r => r.id === "a101")!.rentalPlans, undefined);
  assert.deepEqual(saved.types, state.types); assert.deepEqual(saved.equipment, state.equipment);
  assert.deepEqual(saved.bookings, state.bookings);
  assert.equal(effectiveFeaturedPricing(saved, "a102")!.plan, "combo3");
});
test("invalid final command rolls back the entire pricing batch", () => {
  const state = hostState(), before = structuredClone(state);
  assert.throws(() => applyHostPricing(state, [
    { type: "rate", id: "daylight", hourlyRate: 360000, plans: state.types[0].plans },
    { type: "rate", id: "daylight", hourlyRate: -1, plans: state.types[0].plans },
  ]));
  assert.deepEqual(state, before);
});
test("pricing validates durations and included inventory using existing domain rules", () => {
  const state = hostState(), plans = effectiveRentalPlans(state, "a102");
  for (const change of [{ durationMinutes: 31 }, { price: 1.5 }, { includedEquipment: { light: 999 } }]) {
    assert.throws(() => applyHostPricing(state, [{ type: "rental_plans", target: "room", id: "a102", plans: plans.map((p, i) => i ? p : { ...p, ...change }) }]));
  }
});
test("resetting room packages restores inheritance without changing siblings", () => {
  const state = hostState();
  const withOverride = applyHostPricing(state, [{ type: "rental_plans", target: "room", id: "a102", plans: effectiveRentalPlans(state, "a102").map(p => ({ ...p, price: 700000 })) }]);
  const reset = applyHostPricing(withOverride, [{ type: "rental_plans", target: "room", id: "a102", plans: null }]);
  assert.equal(reset.rooms.find(r => r.id === "a102")!.rentalPlans, undefined);
  assert.deepEqual(effectiveRentalPlans(reset, "a102"), effectiveRentalPlans(state, "a102"));
  assert.deepEqual(reset.rooms.find(r => r.id === "a101"), state.rooms.find(r => r.id === "a101"));
});
test("customer/Admin cannot save Host pricing and batch cannot execute unrelated commands", () => {
  for (const sessionId of ["customer", "admin", null]) {
    const state = hostState(); state.sessionId = sessionId;
    assert.throws(() => applyHostPricing(state, [{ type: "rate", id: "daylight", hourlyRate: 360000, plans: state.types[0].plans }]));
  }
  assert.throws(() => applyHostPricing(hostState(), [{ type: "login", userId: "admin" } as unknown as HostPricingCommand]));
});
