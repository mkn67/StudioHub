import type { FeaturedPricing, Plan, State } from "./models";
import { planLabel } from "./models";

// Durations of the plans already supported by the booking model, not new prices.
const hours: Record<Plan, number> = { hourly: 1, session: 4, combo3: 3, combo5: 5, combo10: 10 };
export const featuredPricingLabels = { featured: "Gói nổi bật", recommended: "Host đề xuất" } as const;

export function effectivePricingPlans(state: State, roomId: string) {
  const room = state.rooms.find(r => r.id === roomId);
  const type = state.types.find(t => t.id === room?.typeId);
  const studio = state.studios.find(s => s.id === type?.studioId);
  if (!room?.active || !type || !studio?.active) return [];
  const hourlyRate = room.rateOverride ?? type.hourlyRate;
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return [];
  return type.plans.filter((plan, index, all) => Object.hasOwn(hours, plan) && all.indexOf(plan) === index).map(plan => ({
    plan, title: planLabel[plan], hours: hours[plan],
    amount: Math.round(hourlyRate * hours[plan]),
    unit: plan === "hourly" ? "/ giờ" : plan === "session" ? "/ buổi" : "/ gói",
    duration: plan === "hourly" ? "Đơn giá mỗi giờ thuê" : `${hours[plan]} giờ sử dụng`,
    source: room.rateOverride !== undefined ? "room" as const : "type" as const,
  }));
}

export function effectiveFeaturedPricing(state: State, roomId: string): FeaturedPricing | undefined {
  const room = state.rooms.find(r => r.id === roomId), selection = room?.featuredPricing;
  if (!selection || selection.typeId !== room?.typeId ||
    !Object.hasOwn(featuredPricingLabels, selection.badge) ||
    !effectivePricingPlans(state, roomId).some(rate => rate.plan === selection.plan)) return;
  return selection;
}

export function setFeaturedPricing(state: State, roomId: string, choice: Pick<FeaturedPricing, "plan" | "badge"> | null, hostId: string) {
  const room = state.rooms.find(r => r.id === roomId), type = state.types.find(t => t.id === room?.typeId);
  if (!room || !type || !state.studios.some(s => s.id === type.studioId && s.hostId === hostId))
    throw Error("Bạn không quản lý phòng này.");
  if (choice === null) { delete room.featuredPricing; return; }
  if (!Object.hasOwn(featuredPricingLabels, choice.badge) || !effectivePricingPlans(state, roomId).some(p => p.plan === choice.plan))
    throw Error("Chỉ chọn gói đang áp dụng cho phòng. Không có ưu đãi được xác minh.");
  room.featuredPricing = { typeId: type.id, plan: choice.plan, badge: choice.badge };
}

export function clearIneligibleFeaturedPricing(state: State) {
  for (const room of state.rooms)
    if (room.featuredPricing && !effectiveFeaturedPricing(state, room.id)) delete room.featuredPricing;
}
