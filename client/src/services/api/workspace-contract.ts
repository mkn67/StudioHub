import type { HostEquipment, HostRoom } from "@/features/host/host-types";

export type WorkspacePolicy = { paymentMinutes: number; depositPercent: number; cancelHours: number; changeHours: number; overtimePerBlock: number; openHour: number; closeHour: number; refundTiers: { hours: number; percent: number }[] };
export type WorkspaceStudio = { id: string; hostId: string; name: string; address: string; district: string; active: boolean; policy: WorkspacePolicy };
export type WorkspaceType = { id: string; studioId: string; name: string; category: string; hourlyRate: number; plans: string[] };
export type WorkspaceRoom = { id: string; typeId: string; name: string; area: number; capacity: number; active: boolean; images: string[]; feature?: string };
export type WorkspaceEquipment = { id: string; studioId: string; name: string; category: string; quantity: number; hourlyRate: number; pricingUnit: string; active: boolean; image?: string; description?: string };
export type WorkspaceBooking = { id: string; customerId: string; roomId: string; start: number; end: number; status: string; total: number; deposit: number; busyStart?: number; busyEnd?: number; refund: { status: string; amount: number; reason: string; escalated?: boolean }; refundHistory?: { status: string; amount: number; reason: string }[] };
export type WorkspaceApplication = { id: string; userId: string; studioName: string; address: string; description: string; status: string; reason: string | null };
export type WorkspaceAudit = { id: string; at: number; actorId: string; action: string; target: string; reason: string };
export type WorkspaceReport = { bookingCount: number; deposits: number; collections: number; refunded: number; refundDue: number; outstanding: number; netCollected: number; weeklyRooms: Record<string, Record<string, number>>; monthlyRooms: Record<string, Record<string, number>>; timezone: string };
export type Workspace = {
  now: number; sessionId: string; studios: WorkspaceStudio[]; types: WorkspaceType[]; rooms: WorkspaceRoom[]; equipment: WorkspaceEquipment[]; bookings: WorkspaceBooking[];
  users: { id: string; name: string; role: string }[]; applications: WorkspaceApplication[]; audit: WorkspaceAudit[]; availability: { roomId: string; start: number; end: number }[]; report?: WorkspaceReport;
};
type RecordValue = Record<string, unknown>;
function invalid(field: string): never { throw new Error(`Dữ liệu workspace không hợp lệ (${field}). Vui lòng thử tải lại hoặc liên hệ nhóm hỗ trợ.`); }
function record(value: unknown, field: string): RecordValue { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field); return value as RecordValue; }
function text(value: unknown, field: string) { if (typeof value !== "string") invalid(field); }
function number(value: unknown, field: string) { if (typeof value !== "number" || !Number.isFinite(value)) invalid(field); }
function boolean(value: unknown, field: string) { if (typeof value !== "boolean") invalid(field); }
function list(value: unknown, field: string): unknown[] { if (!Array.isArray(value)) invalid(field); return value; }
function fields(row: RecordValue, names: string[], kind: "text" | "number" | "boolean") { for (const name of names) (kind === "text" ? text : kind === "number" ? number : boolean)(row[name], name); }
export function parsePolicy(value: unknown): WorkspacePolicy {
  const p = record(value, "policy"); fields(p, ["paymentMinutes", "depositPercent", "cancelHours", "changeHours", "overtimePerBlock", "openHour", "closeHour"], "number");
  for (const tier of list(p.refundTiers, "refundTiers")) fields(record(tier, "refundTier"), ["hours", "percent"], "number");
  return p as WorkspacePolicy;
}
export function parseReport(value: unknown): WorkspaceReport {
  const r = record(value, "report"); fields(r, ["bookingCount", "deposits", "collections", "refunded", "refundDue", "outstanding", "netCollected"], "number"); text(r.timezone, "timezone");
  for (const key of ["weeklyRooms", "monthlyRooms"]) {
    const raw = r[key]; const series = Array.isArray(raw) && raw.length === 0 ? {} : record(raw, key);
    for (const counts of Object.values(series)) for (const count of Object.values(record(counts, key))) number(count, key);
    r[key] = series;
  }
  return r as WorkspaceReport;
}
export function parseWorkspace(value: unknown, expectedUserId: string): Workspace {
  const w = record(value, "workspace"); number(w.now, "now");
  if (w.sessionId !== expectedUserId) invalid("sessionId");
  for (const key of ["studios", "types", "rooms", "equipment", "bookings", "users", "applications", "audit", "availability"]) {
    for (const raw of list(w[key], key)) {
      const row = record(raw, key);
      if (key === "studios") { fields(row, ["id", "hostId", "name", "address", "district"], "text"); boolean(row.active, key); parsePolicy(row.policy); }
      if (key === "types") { fields(row, ["id", "studioId", "name", "category"], "text"); number(row.hourlyRate, key); for (const plan of list(row.plans, "plans")) text(plan, "plan"); }
      if (key === "rooms") { fields(row, ["id", "typeId", "name"], "text"); fields(row, ["area", "capacity"], "number"); boolean(row.active, key); for (const src of list(row.images, "images")) text(src, "image"); }
      if (key === "equipment") { fields(row, ["id", "studioId", "name", "category", "pricingUnit"], "text"); fields(row, ["quantity", "hourlyRate"], "number"); boolean(row.active, key); }
      if (key === "bookings") {
        fields(row, ["id", "customerId", "roomId", "status"], "text"); fields(row, ["start", "end", "total", "deposit"], "number");
        const refund = record(row.refund, "refund"); fields(refund, ["status", "reason"], "text"); number(refund.amount, "refund.amount");
        if (row.busyStart !== undefined) number(row.busyStart, "busyStart"); if (row.busyEnd !== undefined) number(row.busyEnd, "busyEnd");
        if (row.refundHistory !== undefined) for (const r of list(row.refundHistory, "refundHistory")) { const h = record(r, "refundHistory"); fields(h, ["status", "reason"], "text"); number(h.amount, "refundHistory.amount"); }
      }
      if (key === "users") fields(row, ["id", "name", "role"], "text");
      if (key === "applications") { fields(row, ["id", "userId", "studioName", "address", "description", "status"], "text"); if (row.reason !== null) text(row.reason, "reason"); }
      if (key === "audit") { fields(row, ["id", "actorId", "action", "target", "reason"], "text"); number(row.at, "audit.at"); }
      if (key === "availability") { text(row.roomId, "availability.roomId"); fields(row, ["start", "end"], "number"); }
    }
  }
  if (w.report !== undefined) w.report = parseReport(w.report);
  return w as Workspace;
}
export function ownedInventory(workspace: Workspace, userId: string) {
  const studios = workspace.studios.filter(studio => studio.hostId === userId), ids = new Set(studios.map(studio => studio.id));
  const types = workspace.types.filter(type => ids.has(type.studioId)), typeIds = new Set(types.map(type => type.id));
  return { studios, types, rooms: workspace.rooms.filter(room => typeIds.has(room.typeId)), equipment: workspace.equipment.filter(item => ids.has(item.studioId)) };
}
export function workspaceRooms(workspace: Workspace, rooms: WorkspaceRoom[]): HostRoom[] {
  return rooms.map(room => {
    const type = workspace.types.find(type => type.id === room.typeId), studio = workspace.studios.find(studio => studio.id === type?.studioId);
    if (!studio || !type) invalid("room.studio/type");
    return { room_id: Number(room.id), studio_id: Number(studio.id), name: room.name, area: room.area, capacity: room.capacity, status: room.active ? "active" : "not_active", description: room.feature ?? null, thumbnail_url: room.images.find(src => src !== "/images/daylight.jpg") ?? null, studio: { name: studio.name, address: studio.address, district: studio.district, city: "" }, primary_space_type: { space_type_id: Number(type.id), name: type.name } };
  });
}
export function workspaceEquipment(items: WorkspaceEquipment[]): HostEquipment[] {
  return items.map(item => ({ equipment_id: Number(item.id), studio_id: Number(item.studioId), name: item.name, total_quantity: item.quantity, unit_price: item.hourlyRate, pricing_unit: item.pricingUnit, status: item.active ? "active" : "not_active", category_name: item.category, description: item.description, image_url: item.image === "/images/daylight.jpg" ? null : item.image }));
}
