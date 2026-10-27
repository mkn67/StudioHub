import type { FeaturedPricing, State } from "./models";
import { effectiveRentalPlans, planAmount, promotionAt } from "./rental";
import { localDate } from "./models";

// Durations of the plans already supported by the booking model, not new prices.
export const featuredPricingLabels = { featured: "Gói nổi bật", recommended: "Host đề xuất" } as const;

export function effectivePricingPlans(state: State, roomId: string) {
  return effectiveRentalPlans(state, roomId).map(config => ({
    ...config, hours: config.durationMinutes / 60,
    amount: planAmount(config, localDate(state.now)),
    promotionDisplay: promotionAt(config, localDate(state.now)),
    unit: config.kind === "hourly" ? "/ giờ" : config.kind === "session" ? "/ buổi" : "/ gói",
    duration: config.kind === "hourly" ? "Đơn giá mỗi giờ thuê" : config.kind === "session" ? `${config.sessionStart}–${config.sessionEnd}${(config.sessionEnd ?? "") < (config.sessionStart ?? "") ? " · qua đêm" : ""}` : `${config.durationMinutes / 60} giờ sử dụng`,
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
