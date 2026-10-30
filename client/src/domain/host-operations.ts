import { atDate, localDate, type Booking, type Room, type State } from "./models";
import { activeStatuses, balance, BUFFER, HOUR, MIN } from "./engine";
import { clockMinutes, effectiveOperatingHours } from "./rental";

export const calendarPeriods = {
  full: { label: "Cả ngày", start: 0, end: 24 * 60 },
  morning: { label: "Buổi sáng", start: 5 * 60, end: 12 * 60 },
  afternoon: { label: "Buổi chiều", start: 12 * 60, end: 18 * 60 },
  evening: { label: "Buổi tối", start: 18 * 60, end: 24 * 60 },
} as const;
export type CalendarPeriod = keyof typeof calendarPeriods;
export const CALENDAR_PIXELS_PER_MINUTE = .8;
export const calendarY = (timestamp: number, visibleStart: number) => (timestamp - visibleStart) / MIN * CALENDAR_PIXELS_PER_MINUTE;
export function clipCalendarInterval(start: number, end: number, visibleStart: number, visibleEnd: number) {
  const from = Math.max(start, visibleStart), to = Math.min(end, visibleEnd);
  return to > from ? { top: calendarY(from, visibleStart), height: calendarY(to, from), clippedStart: start < visibleStart, clippedEnd: end > visibleEnd } : null;
}
export function periodBounds(date: string, period: CalendarPeriod) {
  const day = atDate(date, 0), range = calendarPeriods[period];
  return { start: day + range.start * MIN, end: day + range.end * MIN };
}
// Initial viewport only: never rounds or changes rental/buffer timestamps.
export function calendarInitialMinute(state: State, columns: { roomId: string; date: string }[], period: CalendarPeriod, status = "all") {
  const range = calendarPeriods[period];
  if (period !== "full") return range.start;
  const activity: number[] = [];
  for (const column of columns) {
    const bounds = periodBounds(column.date, period);
    for (const booking of state.bookings) {
      if (booking.roomId !== column.roomId || !activeStatuses.includes(booking.status) || (status !== "all" && booking.status !== status)) continue;
      if (booking.start < bounds.end && booking.end + BUFFER > bounds.start)
        activity.push((Math.max(booking.start, bounds.start) - bounds.start) / MIN);
    }
  }
  const opening = columns.flatMap(column => {
    const room = state.rooms.find(item => item.id === column.roomId), type = state.types.find(item => item.id === room?.typeId), studio = state.studios.find(item => item.id === type?.studioId);
    const hours = studio ? effectiveOperatingHours(studio) : undefined;
    return hours ? [hours.mode === "all_day" ? 0 : clockMinutes(hours.opens)] : [];
  }).filter(Number.isFinite);
  const first = activity.length ? Math.min(...activity) : opening.length ? Math.min(...opening) : 0;
  return Math.max(0, Math.floor(first / 60) * 60 - 60);
}
export function weekStart(timestamp: number) {
  const day = atDate(localDate(timestamp), 0);
  return day - ((new Date(day + 7 * HOUR).getUTCDay() + 6) % 7) * 24 * HOUR;
}
export function confirmationDeadline(booking: Booking, now: number) {
  if (booking.status !== "pending") return null;
  if (booking.paidAt === undefined) return { at: null, state: "unknown" as const, label: "Thiếu mốc nhận cọc · cần kiểm tra" };
  const at = booking.paidAt + 2 * HOUR;
  return { at, state: at <= now ? "overdue" as const : at - now <= 30 * MIN ? "soon" as const : "upcoming" as const,
    label: at <= now ? "Quá hạn · trạng thái chưa cập nhật" : at - now <= 30 * MIN ? "Sắp đến hạn xác nhận" : "Hạn xác nhận" };
}

export type AgendaItem = { key: string; at: number; until?: number; label: string; booking: Booking; urgent: boolean };
export function operationalAgenda(bookings: Booking[], now: number, limit = 5): AgendaItem[] {
  const items: AgendaItem[] = [], end = now + 24 * HOUR;
  for (const booking of bookings) {
    const add = (kind: string, at: number, label: string, until?: number, urgent = false) => items.push({ key: `${booking.id}:${kind}`, at, until, label, booking, urgent });
    if (booking.status === "confirmed" && booking.start <= end && booking.end > now)
      add("checkin", booking.start, booking.start < now ? "Đến giờ nhận phòng · chưa check-in" : "Khách nhận phòng", undefined, booking.start <= now);
    if (["confirmed", "checked_in"].includes(booking.status) && booking.end >= now && booking.end <= end)
      add("checkout", booking.end, "Dự kiến trả phòng");
    if (booking.status === "checked_in" && booking.end < now)
      add("checkout", booking.end, "Quá giờ trả phòng · cần kiểm tra", undefined, true);
    if (["confirmed", "checked_in", "completed"].includes(booking.status) && booking.end + BUFFER > now && booking.end <= end)
      add("cleaning", booking.end, "Chuẩn bị phòng", booking.end + BUFFER);
    if (["checked_in", "completed"].includes(booking.status) && balance(booking) > 0 && booking.end >= now - 24 * HOUR && booking.end <= end)
      add("collection", booking.end, "Còn phải thu", undefined, booking.end <= now);
  }
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.at - b.at || a.key.localeCompare(b.key)).slice(0, limit);
}

export type ReportPeriod = "week" | "month";
export function reportBounds(date: string, period: ReportPeriod) {
  const day = atDate(date, 0);
  if (period === "week") { const start = weekStart(day); return { start, end: start + 7 * 24 * HOUR }; }
  const [year, month] = date.split("-").map(Number);
  const start = atDate(`${year}-${String(month).padStart(2, "0")}-01`, 0);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end: atDate(next, 0) };
}
export function roomPopularity(state: State, rooms: Room[], date: string, period: ReportPeriod) {
  const { start, end } = reportBounds(date, period), seen = new Set<string>();
  const valid = state.bookings.filter(booking => {
    if (seen.has(booking.id) || !["confirmed", "checked_in", "completed"].includes(booking.status) || booking.start < start || booking.start >= end) return false;
    seen.add(booking.id); return true;
  });
  const rows = rooms.map(room => {
    const bookings = valid.filter(booking => booking.roomId === room.id);
    return { room, type: state.types.find(type => type.id === room.typeId), count: bookings.length,
      hours: bookings.reduce((sum, booking) => sum + Math.max(0, booking.end - booking.start) / HOUR, 0),
      bookingValue: bookings.reduce((sum, booking) => sum + booking.total, 0) };
  }).sort((a, b) => b.count - a.count || b.hours - a.hours || a.room.id.localeCompare(b.room.id));
  const maximum = rows[0]?.count ?? 0;
  return rows.map(row => ({ ...row, relative: maximum ? row.count / maximum : 0 }));
}
