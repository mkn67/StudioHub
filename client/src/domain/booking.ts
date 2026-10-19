import type { Booking, DisplayStatus, User } from "./schema";
export function displayStatus(
  booking: Booking,
  now = Date.now(),
): DisplayStatus {
  if (booking.orderStatus !== "pending") return booking.orderStatus;
  if (booking.paymentStatus === "success") return "pending-confirmation";
  return now >= booking.holdUntil ? "expired" : "awaiting-deposit";
}
export function occupies(booking: Booking, now = Date.now()) {
  return ["awaiting-deposit", "pending-confirmation", "confirmed"].includes(
    displayStatus(booking, now),
  );
}
export type BookingAction = "confirm" | "reject" | "cancel" | "complete";
export function canTransition(
  booking: Booking,
  actor: User,
  action: BookingAction,
  now = Date.now(),
) {
  if (actor.locked || actor.approval !== "approved") return false;
  const status = displayStatus(booking, now);
  if (actor.role === "customer")
    return (
      actor.id === booking.customerId &&
      action === "cancel" &&
      (status === "awaiting-deposit" ||
        status === "pending-confirmation" ||
        (status === "confirmed" &&
          now <=
            booking.start - booking.snapshot.cancellationHours * 3_600_000))
    );
  if (actor.role === "admin")
    return (
      action === "cancel" &&
      (status === "pending-confirmation" ||
        (status === "confirmed" && now < booking.start))
    );
  if (actor.id !== booking.ownerId) return false;
  if (action === "confirm" || action === "reject")
    return (
      status === "pending-confirmation" && booking.paymentStatus === "success"
    );
  if (action === "complete")
    return status === "confirmed" && now >= booking.end;
  return status === "confirmed" && now < booking.start;
}
export const statusLabels: Record<DisplayStatus, string> = {
  "awaiting-deposit": "Chờ đặt cọc",
  "pending-confirmation": "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
};
export const paymentLabels = {
  pending: "Chưa đặt cọc",
  success: "Đã đặt cọc",
  failed: "Đặt cọc thất bại",
  cancelled: "Đã dừng thanh toán",
};
