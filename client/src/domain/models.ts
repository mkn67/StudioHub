export type Role = "customer" | "host" | "admin";
export type Status =
  | "awaiting_payment"
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed";
export type RefundStatus =
  "not_required" | "pending" | "processing" | "refunded" | "failed";
export type Plan = "hourly" | "session" | "combo3" | "combo5" | "combo10";
export type FeaturedPricingBadge = "featured" | "recommended";
export interface FeaturedPricing {
  typeId: string;
  plan: Plan;
  badge: FeaturedPricingBadge;
}
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  locked: boolean;
  restricted: boolean;
  strikes: { bookingId: string; at: number; active: boolean }[];
}
export interface Policy {
  paymentMinutes: number;
  depositPercent: number;
  cancelHours: 24 | 48 | 72;
  changeHours: 24 | 48 | 72;
  refundTiers: { hours: number; percent: number }[];
  overtimePerBlock: number;
  openHour: number;
  closeHour: number;
}
export interface Studio {
  id: string;
  hostId: string;
  name: string;
  address: string;
  district: string;
  description: string;
  active: boolean;
  policy: Policy;
}
export interface RoomType {
  id: string;
  studioId: string;
  name: string;
  category: string;
  hourlyRate: number;
  plans: Plan[];
}
export interface Room {
  id: string;
  typeId: string;
  code: string;
  name: string;
  floor: string;
  area: number;
  capacity: number;
  feature: string;
  amenities: string[];
  included: string[];
  images: string[];
  active: boolean;
  rateOverride?: number;
  featuredPricing?: FeaturedPricing;
}
export interface Equipment {
  id: string;
  studioId: string;
  name: string;
  category: string;
  quantity: number;
  hourlyRate: number;
  active: boolean;
  image: string;
}
export interface Selection {
  roomId: string;
  start: number;
  end: number;
  participants: number;
  plan: Plan;
  equipment: Record<string, number>;
}
export interface PaymentAttempt {
  id: string;
  at: number;
  status: PaymentStatus;
}
export interface Refund {
  status: RefundStatus;
  amount: number;
  reason: string;
  attempts: { at: number; status: "refunded" | "failed" }[];
  escalated: boolean;
}
export interface Collection {
  id: string;
  at: number;
  amount: number;
  method: "cash" | "transfer";
  actorId: string;
}
export interface ChangeRequest {
  selection: Selection;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  at: number;
}
export interface Booking extends Selection {
  id: string;
  customerId: string;
  status: Status;
  createdAt: number;
  deadline: number;
  policy: Policy;
  total: number;
  deposit: number;
  payment: PaymentStatus;
  paymentAttempts: PaymentAttempt[];
  paidAt?: number;
  reconciliation: boolean;
  refund: Refund;
  collections: Collection[];
  overtime: number;
  actualIn?: number;
  actualOut?: number;
  changes: ChangeRequest[];
  history: { at: number; text: string }[];
  cancelReason?: string;
}
export interface HostApplication {
  id: string;
  userId: string;
  studioName: string;
  address: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
}
export interface AuditEvent {
  id: string;
  at: number;
  actorId: string;
  action: string;
  target: string;
  reason: string;
  before?: string;
  after?: string;
}
export interface State {
  supportRequests?: {
    id: string;
    userId: string;
    at: number;
    reason: string;
    status: "pending" | "resolved";
  }[];
  version: 1;
  now: number;
  sessionId: string | null;
  users: User[];
  studios: Studio[];
  types: RoomType[];
  rooms: Room[];
  equipment: Equipment[];
  bookings: Booking[];
  applications: HostApplication[];
  audit: AuditEvent[];
  notifications: { userId: string; text: string; at: number }[];
}
export const statusLabel: Record<Status, string> = {
  awaiting_payment: "Chờ đặt cọc",
  pending: "Chờ chủ Studio duyệt",
  confirmed: "Đã xác nhận",
  checked_in: "Đang sử dụng",
  completed: "Đã trả phòng",
  cancelled: "Đã hủy",
  expired: "Hết hạn đặt cọc",
  no_show: "Không đến nhận phòng",
};
export const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán cọc",
  processing: "Đang xử lý",
  paid: "Đã thanh toán cọc",
  failed: "Thanh toán thất bại",
};
export const refundLabel: Record<RefundStatus, string> = {
  not_required: "Không có khoản hoàn",
  pending: "Chờ xác nhận hoàn",
  processing: "Đang đối soát hoàn",
  refunded: "Đã hoàn",
  failed: "Hoàn thất bại",
};
export const planLabel: Record<Plan, string> = {
  hourly: "Theo giờ",
  session: "Buổi sáng · 08–12h",
  combo3: "Combo 3 giờ",
  combo5: "Combo 5 giờ",
  combo10: "Combo 10 giờ",
};
export const money = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v);
export const dateTime = (v: number) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(v);
export const localDate = (v: number) =>
  new Date(v + 7 * 3600000).toISOString().slice(0, 10);
export const localHour = (v: number) => new Date(v + 7 * 3600000).getUTCHours();
export const atDate = (date: string, hour: number) =>
  new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+07:00`).getTime();
