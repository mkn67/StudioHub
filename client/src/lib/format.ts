import type { RentalUnit } from "@/domain/schema";
export const VN_ZONE = "Asia/Ho_Chi_Minh";
export const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount) +
  "đ";
export const unitLabels: Record<RentalUnit, string> = {
  hour: "giờ",
  session: "buổi",
  "half-day": "nửa ngày",
  day: "ngày",
  week: "tuần",
  month: "tháng",
};
export const dateTime = (instant: number) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
export const shortDate = (instant: number) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(instant);
export const time = (instant: number) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
export function localDate(instant = Date.now()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}-${p.find((x) => x.type === "day")?.value}`;
}
export function vietnamInstant(date: string, hour = "00:00") {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)
  )
    return NaN;
  const ms = Date.parse(`${date}T${hour}:00+07:00`);
  return Number.isFinite(ms) && localDate(ms) === date ? ms : NaN;
}
export const addDays = (date: string, days: number) =>
  localDate(vietnamInstant(date) + days * 86_400_000);
export const minuteOfDay = (instant: number) => {
  const shifted = new Date(instant + 7 * 3_600_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
};
export const vietnamWeekday = (instant: number) =>
  new Date(instant + 7 * 3_600_000).getUTCDay();
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
export const slugify = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
