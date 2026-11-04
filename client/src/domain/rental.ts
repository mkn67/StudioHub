import type { Booking, CrewPolicy, OperatingHours, Plan, RentalPlanConfig, RentalSnapshot, Selection, State, Studio, TimeSurcharge } from "./models";
import { atDate, localDate, planLabel } from "./models";

const MINUTE = 60000, HOUR = 60 * MINUTE, DAY = 24 * HOUR, BUFFER = 30 * MINUTE;
const durations: Record<Plan, number> = { hourly: 60, session: 240, combo3: 180, combo5: 300, combo10: 600 };
export const timeText = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export function rentalDateTime(value: number) {
  const date = new Date(value + 7 * HOUR);
  return `${localDate(value).split("-").reverse().join("/")}, ${timeText(date.getUTCHours() * 60 + date.getUTCMinutes())}`;
}
export function clockMinutes(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00") return NaN;
  const [h, m] = value.split(":").map(Number); return h * 60 + m;
}
const moneyValue = (v: number) => Number.isSafeInteger(v) && v >= 0;
export function effectiveOperatingHours(studio: Studio): OperatingHours | undefined {
  if (studio.operatingHours) return studio.operatingHours;
  const { openHour, closeHour } = studio.policy;
  if (!Number.isFinite(openHour) || !Number.isFinite(closeHour) || openHour === closeHour) return;
  return { mode: "fixed", opens: timeText(openHour * 60), closes: timeText(closeHour * 60) };
}
export function operatingLabel(studio: Studio) {
  const hours = effectiveOperatingHours(studio);
  return !hours ? "Cần cấu hình giờ hoạt động" : hours.mode === "all_day" ? "Hoạt động 24/24" : `${hours.opens}–${hours.closes}${clockMinutes(hours.closes) < clockMinutes(hours.opens) ? " (qua ngày hôm sau)" : ""}`;
}
export function validateOperatingHours(hours: OperatingHours) {
  if (hours.mode === "all_day") return;
  if (hours.mode !== "fixed" || !Number.isFinite(clockMinutes(hours.opens)) || clockMinutes(hours.opens) >= 1440 || !Number.isFinite(clockMinutes(hours.closes)) || hours.opens === hours.closes)
    throw Error("Giờ hoạt động cố định không hợp lệ. Chọn 24/24 nếu mở cả ngày.");
}
export function validateTimeSurcharge(rule?: TimeSurcharge) {
  if (!rule) return;
  if (!Number.isFinite(clockMinutes(rule.start)) || clockMinutes(rule.start) >= 1440 || !Number.isFinite(clockMinutes(rule.end)) || rule.start === rule.end ||
    !["fixed", "percentage"].includes(rule.method) || !moneyValue(rule.value) || (rule.method === "percentage" && rule.value > 100))
    throw Error("Khung phụ thu phải có đầu/cuối khác nhau; phần trăm từ 0 đến 100, số tiền nguyên không âm.");
}
export function validateCrewPolicy(policy: CrewPolicy | undefined, capacity: number) {
  if (!policy) return;
  if (!Number.isInteger(policy.included) || policy.included < 1 || !Number.isInteger(policy.maximum) || policy.maximum < policy.included || policy.maximum > capacity ||
    !["booking", "hour"].includes(policy.unit) || !moneyValue(policy.amount)) throw Error("Ekip: 1 ≤ số người gồm trong giá ≤ tối đa cho phép ≤ sức chứa phòng.");
}
export function effectiveRentalPlans(state: State, roomId: string) {
  const room = state.rooms.find(r => r.id === roomId), type = state.types.find(t => t.id === room?.typeId);
  const studio = state.studios.find(s => s.id === type?.studioId);
  if (!room?.active || !type || !studio?.active) return [];
  const hourly = room.rateOverride ?? type.hourlyRate;
  const source = room.rentalPlans !== undefined || room.rateOverride !== undefined ? "room" as const : "type" as const;
  const configs = room.rentalPlans ?? type.rentalPlans;
  const plans: RentalPlanConfig[] = configs ?? type.plans.filter((p, i, a) => Object.hasOwn(durations, p) && a.indexOf(p) === i).map(plan => ({
    plan, title: planLabel[plan], kind: plan === "hourly" ? "hourly" : plan === "session" ? "session" : "duration",
    price: Math.round(hourly * durations[plan] / 60), durationMinutes: durations[plan], sessionStart: plan === "session" ? "08:00" : undefined,
    sessionEnd: plan === "session" ? "12:00" : undefined, includedEquipment: {}, includedServices: [], active: true,
  }));
  return plans.filter(p => p.active && moneyValue(p.price) && p.price > 0 && Object.hasOwn(durations, p.plan)).map(p => ({
    ...p, price: configs && !room.rentalPlans && room.rateOverride !== undefined && p.kind === "hourly" ? room.rateOverride : p.price, source,
  }));
}
export function effectiveCrew(state: State, roomId: string, plan?: RentalPlanConfig): CrewPolicy | undefined {
  const room = state.rooms.find(r => r.id === roomId), type = state.types.find(t => t.id === room?.typeId);
  const policy = room?.crewPolicy ?? type?.crewPolicy;
  return policy ? { ...policy, included: plan?.includedCrew ?? policy.included } : undefined;
}
export function validateRentalPlans(state: State, studioId: string, plans: RentalPlanConfig[], capacity: number, crew?: CrewPolicy) {
  if (!plans.length || new Set(plans.map(p => p.plan)).size !== plans.length) throw Error("Cần gói thuê, không trùng mã gói.");
  for (const p of plans) {
    if (!Object.hasOwn(durations, p.plan) || !p.title.trim() || p.title.length > 100 || !["hourly", "duration", "session"].includes(p.kind) || !moneyValue(p.price) || p.price <= 0 ||
      !Number.isInteger(p.durationMinutes) || p.durationMinutes < 30 || p.durationMinutes > 1440 || p.durationMinutes % 30 ||
      !Array.isArray(p.includedServices) || p.includedServices.some(s => typeof s !== "string" || s.length > 300)) throw Error("Tên, giá hoặc thời lượng gói không hợp lệ (bước 30 phút, tối đa 24 giờ).");
    if (p.kind === "session") {
      const begin = clockMinutes(p.sessionStart ?? ""), end = clockMinutes(p.sessionEnd ?? "");
      if (!Number.isFinite(begin) || begin >= 1440 || !Number.isFinite(end) || begin % 30 || end % 30 || begin === end || (end - begin + 1440) % 1440 !== p.durationMinutes)
        throw Error("Khung buổi cố định phải khớp thời lượng, có thể kết thúc ngày hôm sau.");
    }
    if (p.includedCrew !== undefined && (!crew || !Number.isInteger(p.includedCrew) || p.includedCrew < 1 || p.includedCrew > crew.maximum || p.includedCrew > capacity)) throw Error("Số người kèm gói cần chính sách ekip hợp lệ.");
    for (const [id, q] of Object.entries(p.includedEquipment)) {
      const item = state.equipment.find(e => e.id === id && e.studioId === studioId);
      if (!Number.isInteger(q) || q < 1 || !item || (p.active && (!item.active || q > item.quantity))) throw Error("Thiết bị kèm gói phải thuộc kho Studio và đủ số lượng.");
    }
    if (p.promotion && (!moneyValue(p.promotion.originalPrice) || p.promotion.originalPrice <= p.price || !validDate(p.promotion.startsOn) || !validDate(p.promotion.endsOn) || p.promotion.endsOn < p.promotion.startsOn))
      throw Error("Ưu đãi cần giá gốc lớn hơn giá bán và ngày hiệu lực hợp lệ.");
  }
}
function validDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(atDate(date, 0)) && localDate(atDate(date, 0)) === date; }
export function planDuration(plan: RentalPlanConfig, hours: number) { return plan.kind === "hourly" ? hours * 60 : plan.durationMinutes; }
export function promotionAt(plan: RentalPlanConfig, date: string) {
  const p = plan.promotion;
  return p && p.originalPrice > plan.price && date >= p.startsOn && date <= p.endsOn ? { originalPrice: p.originalPrice, savings: p.originalPrice - plan.price, percent: Math.round((p.originalPrice - plan.price) * 100 / p.originalPrice) } : undefined;
}
export function planAmount(plan: RentalPlanConfig, date: string) {
  return plan.promotion && !promotionAt(plan, date) ? plan.promotion.originalPrice : plan.price;
}
function windowAt(dayStart: number, opens: number, closes: number) {
  return { start: dayStart + opens * MINUTE, end: dayStart + (closes <= opens ? closes + 1440 : closes) * MINUTE };
}
export function insideOperatingHours(studio: Studio, start: number, end: number) {
  const hours = effectiveOperatingHours(studio);
  if (!hours) return false;
  if (hours.mode === "all_day") return true;
  const day = atDate(localDate(start), 0), opens = clockMinutes(hours.opens), closes = clockMinutes(hours.closes);
  return [day - DAY, day].some(d => { const w = windowAt(d, opens, closes); return start >= w.start && end <= w.end; });
}
export function surchargeMinutes(start: number, end: number, rule?: TimeSurcharge) {
  if (!rule?.enabled) return 0;
  let overlap = 0;
  const opens = clockMinutes(rule.start), closes = clockMinutes(rule.end);
  for (let day = atDate(localDate(start), 0) - DAY; day < end; day += DAY) {
    const window = windowAt(day, opens, closes);
    overlap += Math.max(0, Math.min(end, window.end) - Math.max(start, window.start)) / MINUTE;
  }
  return overlap;
}
export function combinedEquipment(included: Record<string, number>, extras: Record<string, number>) {
  const result = { ...included };
  for (const [id, q] of Object.entries(extras)) result[id] = (result[id] ?? 0) + q;
  return result;
}
export function bookingEquipment(booking: Booking) { return booking.rentalSnapshot?.totalEquipment ?? booking.equipment; }
export function quoteRental(state: State, selection: Selection): RentalSnapshot {
  const room = state.rooms.find(r => r.id === selection.roomId), type = state.types.find(t => t.id === room?.typeId);
  const studio = state.studios.find(s => s.id === type?.studioId);
  const plan = effectiveRentalPlans(state, selection.roomId).find(p => p.plan === selection.plan);
  if (!plan || !studio) throw Error("Gói thuê hiện không khả dụng.");
  const minutes = (selection.end - selection.start) / MINUTE, hours = minutes / 60;
  if (!Number.isFinite(minutes) || minutes < 30 || minutes > 1440 || minutes % 30) throw Error("Thời lượng tính giá phải từ 30 phút đến 24 giờ, theo bước 30 phút.");
  const rental = Math.round(planAmount(plan, localDate(selection.start)) * (plan.kind === "hourly" ? hours : 1));
  const promotion = promotionAt(plan, localDate(selection.start));
  const discountSavings = promotion ? Math.round(promotion.savings * (plan.kind === "hourly" ? hours : 1)) : 0;
  const equipment = Object.entries(selection.equipment).reduce((sum, [id, q]) => { const item = state.equipment.find(e => e.id === id); return sum + Math.round((item?.hourlyRate ?? 0) * q * (item?.pricingUnit === "session" ? 1 : hours)); }, 0);
  const eligible = surchargeMinutes(selection.start, selection.end, studio.timeSurcharge);
  const timeSurcharge = !studio.timeSurcharge?.enabled ? 0 : Math.round(studio.timeSurcharge.method === "fixed" ? studio.timeSurcharge.value * eligible / 60 : rental * studio.timeSurcharge.value * eligible / (100 * minutes));
  const crew = effectiveCrew(state, selection.roomId, plan), extraPeople = crew ? Math.max(0, selection.participants - crew.included) : 0;
  const crewSurcharge = crew?.surchargeEnabled ? Math.round(extraPeople * crew.amount * (crew.unit === "hour" ? hours : 1)) : 0;
  const total = rental + equipment + timeSurcharge + crewSurcharge;
  if (![rental, equipment, timeSurcharge, crewSurcharge, total].every(moneyValue)) throw Error("Không thể tính giá từ dữ liệu hiện tại.");
  return structuredClone({ plan, breakdown: { rental, discountSavings, equipment, timeSurcharge, timeSurchargeMinutes: eligible, crewSurcharge, extraPeople, total, deposit: Math.round(total * studio.policy.depositPercent / 100) },
    totalEquipment: combinedEquipment(plan.includedEquipment, selection.equipment), crewPolicy: crew, operatingHours: effectiveOperatingHours(studio), timeSurcharge: studio.timeSurcharge });
}
export function blocksAt(booking: Booking, now: number) {
  if (booking.status === "awaiting_payment" && booking.reconciliation) return true;
  if (booking.status === "awaiting_payment") return now < booking.deadline || (now < booking.deadline + 5 * MINUTE && booking.paymentAttempts.some(a => a.status === "processing" && a.at < booking.deadline));
  if (booking.status === "pending") return now < (booking.paidAt ?? 0) + 2 * HOUR;
  return booking.status === "checked_in" || (booking.status === "confirmed" && now < booking.end);
}
export function rentalSelectionError(state: State, x: Selection, ignoreId?: string): string | null {
  const room = state.rooms.find(r => r.id === x.roomId), type = state.types.find(t => t.id === room?.typeId), studio = state.studios.find(st => st.id === type?.studioId);
  if (!room?.active || !studio?.active || !type) return "Phòng hiện không nhận đặt thuê.";
  if (!Number.isFinite(x.start) || !Number.isFinite(x.end) || x.end <= x.start) return "Chọn thời gian thuê hợp lệ.";
  if (x.start < state.now + 24 * HOUR + studio.policy.paymentMinutes * MINUTE) return `Cần đặt trước ít nhất 24 giờ + ${studio.policy.paymentMinutes} phút thanh toán.`;
  const plan = effectiveRentalPlans(state, x.roomId).find(p => p.plan === x.plan);
  if (!plan) return "Gói thuê không được hỗ trợ.";
  const crew = effectiveCrew(state, x.roomId, plan), maximum = Math.min(room.capacity, crew?.maximum ?? room.capacity);
  if (!Number.isInteger(x.participants) || x.participants < 1 || x.participants > maximum) return `Số người phải từ 1 đến ${maximum}${crew ? " theo giới hạn ekip" : ""}.`;
  const minutes = (x.end - x.start) / MINUTE, clock = new Date(x.start + 7 * HOUR);
  if (clock.getUTCMinutes() % 30 || clock.getUTCSeconds() || x.start % 1000 || minutes < 30 || minutes > 1440 || minutes % 30 ||
    (plan.kind !== "hourly" && minutes !== plan.durationMinutes) || (plan.kind === "session" && clock.getUTCHours() * 60 + clock.getUTCMinutes() !== clockMinutes(plan.sessionStart ?? ""))) return "Thời lượng không phù hợp với gói thuê hoặc bước 30 phút.";
  if (!insideOperatingHours(studio, x.start, x.end)) return "Thời gian thuê phải nằm trong giờ mở cửa.";
  const active = state.bookings.filter(b => b.id !== ignoreId && blocksAt(b, state.now));
  const overlap = (b: Booking) => x.start < b.end + BUFFER && b.start < x.end + BUFFER;
  if (active.some(b => b.roomId === x.roomId && overlap(b))) return "Phòng đã được giữ trong khoảng thuê hoặc 30 phút chuẩn bị.";
  const external = state.availability ?? [];
  if (external.some(b => b.roomId === x.roomId && x.start < b.end + BUFFER && b.start < x.end + BUFFER)) return "Phòng đã được giữ trong khoảng thuê hoặc 30 phút chuẩn bị.";
  for (const q of Object.values(x.equipment)) if (!Number.isInteger(q) || q < 0) return "Số lượng thiết bị không hợp lệ.";
  const demand = combinedEquipment(plan.includedEquipment, x.equipment);
  for (const [id, q] of Object.entries(demand)) {
    if (!q) continue;
    const item = state.equipment.find(e => e.id === id && e.studioId === studio.id);
    if (!Number.isInteger(q) || q < 0 || !item?.active) return "Thiết bị không khả dụng tại Studio này.";
    const relevant = active.filter(b => overlap(b) && (bookingEquipment(b)[id] ?? 0) > 0);
    const occupied = [...relevant.map(b => ({ start: b.start, end: b.end, quantity: bookingEquipment(b)[id] ?? 0 })), ...external.filter(b => x.start < b.end + BUFFER && b.start < x.end + BUFFER).map(b => ({ start: b.start, end: b.end, quantity: b.equipment[id] ?? 0 }))];
    const points = [x.start, ...occupied.flatMap(b => [b.start, b.end + BUFFER]).filter(t => t >= x.start && t < x.end + BUFFER)];
    if (points.some(t => q + occupied.filter(b => b.start <= t && t < b.end + BUFFER).reduce((sum, b) => sum + b.quantity, 0) > item.quantity))
      return `${item.name}: không đủ số lượng trong khoảng thuê và chuẩn bị${plan.includedEquipment[id] ? " (thiết bị kèm gói)" : ""}.`;
  }
  return null;
}
export function slotsForDate(state: State, selection: Selection, date: string, ignoreId?: string) {
  const duration = selection.end - selection.start;
  return Array.from({ length: 48 }, (_, index) => {
    const start = atDate(date, 0) + index * 30 * MINUTE;
    return { start, end: start + duration, label: timeText(index * 30), reason: rentalSelectionError(state, { ...selection, start, end: start + duration }, ignoreId) };
  });
}
