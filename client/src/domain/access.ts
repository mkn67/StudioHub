import type { Database, Room, User } from "./schema";
export const roleHome = (user: User) =>
  user.locked || (user.role === "host" && user.approval !== "approved")
    ? "/account/status"
    : user.role === "admin"
      ? "/admin"
      : user.role === "host"
        ? "/host"
        : "/";
export function safeReturnUrl(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value) ||
    /%2f|%5c|%00/i.test(value)
  )
    return null;
  try {
    const url = new URL(value, "https://studiohub.local");
    if (
      url.origin !== "https://studiohub.local" ||
      /^\/(login|register)(\/|$)/.test(url.pathname)
    )
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
export function resolveAccess(user: User | null | undefined, route: string) {
  if (user === undefined) return "loading";
  if (user?.locked && route !== "/account/status") return "locked";
  if (
    user?.role === "host" &&
    user.approval !== "approved" &&
    route !== "/account/status" &&
    route !== "/login"
  )
    return user.approval === "pending" ? "pending-approval" : "rejected";
  const role = route.startsWith("/host")
    ? "host"
    : route.startsWith("/admin")
      ? "admin"
      : route.startsWith("/my-bookings") || route.startsWith("/payment")
        ? "customer"
        : null;
  if ((role || route.startsWith("/account")) && !user) return "unauthenticated";
  if (role && user?.role !== role) return "wrong-role";
  return "allowed";
}
export function getEffectiveRoomStatus(
  db: Database,
  room: Room,
  at = Date.now(),
) {
  const studio = db.studios.find((s) => s.id === room.studioId);
  const host = db.users.find((u) => u.id === studio?.ownerId);
  if (
    !studio ||
    !host ||
    host.locked ||
    host.approval !== "approved" ||
    studio.adminHidden ||
    room.adminHidden ||
    room.status === "hidden"
  )
    return "hidden";
  if (room.status === "paused") return "paused";
  if (
    !room.images.length ||
    !room.name.trim() ||
    !room.typeIds.length ||
    room.closeMinute <= room.openMinute ||
    !db.rates.some(
      (r) =>
        r.roomId === room.id &&
        r.active &&
        ["hour", "session", "day"].includes(r.unit) &&
        r.effectiveFrom <= at &&
        (r.effectiveTo === null || at < r.effectiveTo),
    )
  )
    return "incomplete";
  return "bookable";
}
