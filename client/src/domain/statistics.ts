import type { Booking, Database, Room } from "./schema";
import { localDate, vietnamInstant, vietnamWeekday } from "@/lib/format";
import { displayStatus } from "./booking";
export function statistics(bookings: Booking[], start: number, end: number) {
  const selected = bookings.filter((b) => b.start >= start && b.start < end);
  return {
    count: selected.length,
    completed: selected
      .filter((b) => b.orderStatus === "completed")
      .reduce((s, b) => s + b.snapshot.price.total, 0),
    confirmed: selected
      .filter((b) => b.orderStatus === "confirmed")
      .reduce((s, b) => s + b.snapshot.price.total, 0),
    statuses: Object.fromEntries(
      [
        "awaiting-deposit",
        "pending-confirmation",
        "confirmed",
        "completed",
        "rejected",
        "cancelled",
        "expired",
      ].map((status) => [
        status,
        selected.filter((b) => displayStatus(b) === status).length,
      ]),
    ),
  };
}
export function utilization(
  room: Room,
  bookings: Booking[],
  start: number,
  end: number,
): number | null {
  let available = 0,
    booked = 0;
  for (
    let day = vietnamInstant(localDate(start));
    day < end;
    day += 86_400_000
  ) {
    if (!room.operatingDays.includes(vietnamWeekday(day))) continue;
    const open = Math.max(
      start,
      day + (room.overnight ? 0 : room.openMinute) * 60_000,
    );
    const close = Math.min(
      end,
      day + (room.overnight ? 1440 : room.closeMinute) * 60_000,
    );
    if (close <= open) continue;
    available += close - open;
    for (const b of bookings.filter(
      (b) =>
        b.roomId === room.id &&
        ["confirmed", "completed"].includes(b.orderStatus),
    ))
      booked += Math.max(0, Math.min(close, b.end) - Math.max(open, b.start));
  }
  return available > 0
    ? Math.min(100, Math.round((booked / available) * 1000) / 10)
    : null;
}
export function requiresAttention(db: Database, b: Booking, now = Date.now()) {
  return (
    ["pending-confirmation", "confirmed"].includes(displayStatus(b, now)) &&
    (db.users.find((u) => u.id === b.ownerId)?.locked ||
      db.studios.find((s) => s.id === b.studioId)?.adminHidden)
  );
}
