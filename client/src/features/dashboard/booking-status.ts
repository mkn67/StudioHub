import { localDate, statusLabel, type Status } from "@/domain/models";

export type BookingStatusVisual = { label: string; background: string; accent: string; text: string; surface: string };
export const bookingStatusVisual: Record<Status, BookingStatusVisual> = {
  awaiting_payment: { label: statusLabel.awaiting_payment, background: "#F2EDE2", accent: "#9A8562", text: "#66533B", surface: "#FBF9F5" },
  pending: { label: statusLabel.pending, background: "#FFF0D4", accent: "#C78A24", text: "#885610", surface: "#FFFBF3" },
  confirmed: { label: statusLabel.confirmed, background: "#DEEAFD", accent: "#4F7CCB", text: "#28599C", surface: "#F4F7FE" },
  checked_in: { label: statusLabel.checked_in, background: "#D8F3F2", accent: "#0D91A0", text: "#086675", surface: "#F2FBFA" },
  completed: { label: statusLabel.completed, background: "#DDF2E5", accent: "#28825A", text: "#206745", surface: "#F4FAF6" },
  cancelled: { label: statusLabel.cancelled, background: "#FDE6E3", accent: "#BB6860", text: "#923E38", surface: "#FFF7F6" },
  expired: { label: statusLabel.expired, background: "#E9EEF3", accent: "#7A8A9B", text: "#4D5C6D", surface: "#F7F9FB" },
  no_show: { label: statusLabel.no_show, background: "#F8E6D9", accent: "#B67848", text: "#87481F", surface: "#FDF7F1" },
};

// One visual map drives scoped columns, badges, details and calendar events.
// Payment/refund badges and Customer status styles are deliberately separate.
export const bookingStatusTokenCSS = Object.entries(bookingStatusVisual).map(([status, visual]) => `
.ops-shell [data-booking-status="${status}"], .ops-shell .booking-header .status.${status}, .ops-shell .host-calendar-event.${status}, .ops-shell .kanban-column[data-status="${status}"], .ops-shell .dashboard-distribution-track > .${status} {
  --booking-bg:${visual.background}; --booking-accent:${visual.accent}; --booking-text:${visual.text}; --booking-surface:${visual.surface};
}`).join("\n");

const day = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function rentalDate(value: number) {
  const parts = day.formatToParts(value);
  return `${parts.find(part => part.type === "day")!.value}/${parts.find(part => part.type === "month")!.value}`;
}
export function bookingRentalTime(start: number, end: number) {
  return localDate(start) === localDate(end)
    ? `${rentalDate(start)} · ${time.format(start)}–${time.format(end)}`
    : `${rentalDate(start)} ${time.format(start)} → ${rentalDate(end)} ${time.format(end)}`;
}
