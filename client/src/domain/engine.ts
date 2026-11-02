import type { State, Selection, Booking, Role, Status, Policy } from "./models";
import { bookingEquipment, effectiveCrew, effectiveRentalPlans, quoteRental, rentalSelectionError, validateCrewPolicy, validateOperatingHours, validateRentalPlans, validateTimeSurcharge } from "./rental";
import { clearIneligibleFeaturedPricing, setFeaturedPricing } from "./featured-pricing";
export const MIN = 60000,
  HOUR = 60 * MIN,
  BUFFER = 30 * MIN;
export const activeStatuses: Status[] = [
  "awaiting_payment",
  "pending",
  "confirmed",
  "checked_in",
];
export const overlaps = (
  a: Pick<Selection, "start" | "end">,
  b: Pick<Selection, "start" | "end">,
) => a.start < b.end + BUFFER && b.start < a.end + BUFFER;
export const balance = (b: Booking) =>
  Math.max(
    0,
    b.total +
      b.overtime -
      (b.payment === "paid" ? b.deposit : 0) -
      b.collections.reduce((s, x) => s + x.amount, 0),
  );
export function roomRate(s: State, roomId: string) {
  const r = s.rooms.find((r) => r.id === roomId);
  const t = s.types.find((t) => t.id === r?.typeId);
  const plans = effectiveRentalPlans(s, roomId), hourly = plans.find(p => p.kind === "hourly");
  return hourly?.price ?? (plans[0] ? Math.round(plans[0].price * 60 / plans[0].durationMinutes) : r?.rateOverride ?? t?.hourlyRate ?? 0);
}
export function studioFor(s: State, roomId: string) {
  const r = s.rooms.find((r) => r.id === roomId);
  const t = s.types.find((t) => t.id === r?.typeId);
  return s.studios.find((x) => x.id === t?.studioId);
}
export function price(s: State, x: Selection) {
  return quoteRental(s, x).breakdown.total;
}
export function validatePolicy(p: Policy) {
  if (
    !Number.isInteger(p.paymentMinutes) ||
    p.paymentMinutes < 15 ||
    p.paymentMinutes > 180 ||
    p.depositPercent <= 0 ||
    p.depositPercent > 100 ||
    ![24, 48, 72].includes(p.cancelHours) ||
    ![24, 48, 72].includes(p.changeHours) ||
    p.overtimePerBlock < 0 ||
    p.openHour < 0 ||
    p.closeHour > 24 ||
    p.openHour >= p.closeHour
  )
    throw Error("Chính sách không hợp lệ.");
  const sorted = [...p.refundTiers].sort((a, b) => b.hours - a.hours);
  if (
    !sorted.length ||
    sorted.some(
      (t, i) =>
        t.hours < p.cancelHours ||
        t.percent < 0 ||
        t.percent > 100 ||
        (i > 0 &&
          (t.hours === sorted[i - 1].hours ||
            t.percent > sorted[i - 1].percent)),
    )
  )
    throw Error("Mốc hoàn cọc phải nằm trong hạn tự hủy và không mâu thuẫn.");
}
export function validateSelection(
  s: State,
  x: Selection,
  ignoreId?: string,
): string | null {
  return rentalSelectionError(s, x, ignoreId);
}
export type Command =
  | { type: "rental_settings"; studioId: string; operatingHours: NonNullable<State["studios"][number]["operatingHours"]>; timeSurcharge?: State["studios"][number]["timeSurcharge"] }
  | { type: "rental_plans"; target: "type" | "room"; id: string; plans: NonNullable<State["rooms"][number]["rentalPlans"]> | null }
  | { type: "crew_policy"; roomId: string; policy: State["rooms"][number]["crewPolicy"] }
  | { type: "featured_pricing"; roomId: string; selection: Pick<NonNullable<State["rooms"][number]["featuredPricing"]>, "plan" | "badge"> | null }
  | { type: "request_restore"; reason: string }
  | { type: "login"; userId: string | null }
  | { type: "register"; name: string; email: string; phone: string }
  | { type: "reconcile"; id: string; paid: boolean; reason: string }
  | { type: "resolve_refund"; id: string; reason: string }
  | { type: "advance"; minutes: number }
  | { type: "create"; selection: Selection; expectedTotal?: number; expectedDeposit?: number; expectedPolicy?: Policy }
  | { type: "payment"; id: string; outcome: "paid" | "failed" | "processing" }
  | {
      type:
        | "approve"
        | "reject"
        | "checkin"
        | "checkout"
        | "cancel"
        | "admin_cancel";
      id: string;
      reason?: string;
    }
  | {
      type: "collect";
      id: string;
      amount: number;
      method: "cash" | "transfer";
      collectionId: string;
    }
  | {
      type: "refund";
      id: string;
      outcome: "refunded" | "failed";
      retryOutcomes?: ("refunded" | "failed")[];
    }
  | { type: "change"; id: string; selection: Selection }
  | { type: "approve_change" | "reject_change" | "withdraw_change"; id: string }
  | { type: "restore" | "restrict" | "lock"; userId: string; reason: string }
  | {
      type: "application";
      studioName: string;
      address: string;
      description: string;
    }
  | {
      type: "review_application";
      id: string;
      approved: boolean;
      reason: string;
    }
  | { type: "profile"; name: string; phone: string }
  | { type: "policy"; studioId: string; policy: Policy }
  | { type: "room_status"; id: string; active: boolean }
  | { type: "studio_status"; id: string; active: boolean; reason: string }
  | { type: "equipment_save"; equipment: State["equipment"][number] }
  | { type: "studio_save"; studio: State["studios"][number] }
  | { type: "type_save"; roomType: State["types"][number] }
  | { type: "room_save"; room: State["rooms"][number] }
  | {
      type: "rate";
      id: string;
      hourlyRate: number;
      plans: State["types"][number]["plans"];
    };
function uid(s: State, prefix: string) {
  return `${prefix}-${s.now}-${s.audit.length + 1}`;
}
function event(
  s: State,
  action: string,
  target: string,
  reason = "",
  before?: string,
  after?: string,
) {
  s.audit.push({
    id: uid(s, "EV"),
    at: s.now,
    actorId: s.sessionId ?? "system",
    action,
    target,
    reason,
    before,
    after,
  });
}
function transition(s: State, b: Booking, to: Status, text: string) {
  const before = b.status;
  b.status = to;
  b.history.push({ at: s.now, text });
  s.notifications.push({
    userId: b.customerId,
    text: `${b.id}: ${text}`,
    at: s.now,
  });
  event(s, "booking." + to, b.id, text, before, to);
}
function strike(s: State, b: Booking) {
  const u = s.users.find((u) => u.id === b.customerId)!;
  if (!u.strikes.some((x) => x.bookingId === b.id)) {
    u.strikes.push({ bookingId: b.id, at: s.now, active: true });
    u.restricted = u.strikes.filter((x) => x.active).length >= 3;
    event(s, "strike.add", u.id, b.id);
  }
}
function refund(b: Booking, amount: number, reason: string) {
  if (amount <= 0) return;
  if (b.refund.status !== "not_required" && b.refund.status !== "refunded")
    throw Error("Một nghĩa vụ hoàn cọc đang được xử lý.");
  b.refund = {
    status: "pending",
    amount,
    reason,
    attempts: [],
    escalated: false,
  };
}
function tick(s: State) {
  const originalSession = s.sessionId;
  s.sessionId = null;
  for (const b of s.bookings) {
    if (b.status === "awaiting_payment" && s.now >= b.deadline) {
      const processing = b.paymentAttempts.findLast(
        (a) => a.status === "processing" && a.at < b.deadline,
      );
      if (processing && s.now < b.deadline + 5 * MIN) continue;
      if (processing) {
        b.reconciliation = true;
        transition(
          s,
          b,
          "expired",
          "Hết thời gian gia hạn · cần đối soát giao dịch",
        );
      } else {
        transition(s, b, "expired", "Hết hạn thanh toán cọc");
        if (!b.paymentAttempts.some((a) => a.status === "failed")) strike(s, b);
      }
    }
    if (b.status === "pending" && s.now >= (b.paidAt ?? 0) + 2 * HOUR) {
      transition(s, b, "cancelled", "Chủ Studio quá hạn xác nhận 2 giờ");
      refund(b, b.deposit, "host_timeout");
      b.refund.status = "refunded";
      b.refund.attempts.push({ at: s.now, status: "refunded" });
      event(s, "refund.automatic", b.id, "Hoàn 100% cọc do Host quá hạn");
    }
    if (b.status === "confirmed" && s.now >= b.end)
      transition(
        s,
        b,
        "no_show",
        "Hết giờ thuê, chưa nhận phòng · giữ cọc, không thêm vi phạm",
      );
  }
  s.sessionId = originalSession;
}
export function execute(input: State, command: Command): State {
  const s: State = structuredClone(input);
  const actor = () => s.users.find((u) => u.id === s.sessionId);
  const requireRole = (...roles: Role[]) => {
    const u = actor();
    if (!u || u.locked || !roles.includes(u.role))
      throw Error("Bạn không có quyền thực hiện thao tác này.");
    return u;
  };
  const owned = (id: string) => {
    const b = s.bookings.find((b) => b.id === id);
    if (!b) throw Error("Không tìm thấy đơn.");
    const u = actor();
    const st = studioFor(s, b.roomId);
    if (
      !u ||
      u.locked ||
      (u.role === "customer" && b.customerId !== u.id) ||
      (u.role === "host" && st?.hostId !== u.id)
    )
      throw Error("Không thể truy cập đơn này.");
    return b;
  };
  const hostBooking = (id: string) => {
    requireRole("host");
    return owned(id);
  };
  if (command.type === "featured_pricing") {
    const u = requireRole("host");
    const before = s.rooms.find(room => room.id === command.roomId)?.featuredPricing;
    setFeaturedPricing(s, command.roomId, command.selection, u.id);
    event(s, "pricing.featured", command.roomId, "Nổi bật bảng giá; không thay đổi giá.", JSON.stringify(before), JSON.stringify(s.rooms.find(room => room.id === command.roomId)?.featuredPricing));
    return s;
  }
  if (command.type === "rental_settings") {
    const u = requireRole("host"), studio = s.studios.find(st => st.id === command.studioId && st.hostId === u.id);
    if (!studio) throw Error("Bạn không quản lý Studio này.");
    validateOperatingHours(command.operatingHours); validateTimeSurcharge(command.timeSurcharge);
    studio.operatingHours = structuredClone(command.operatingHours);
    studio.timeSurcharge = structuredClone(command.timeSurcharge);
    event(s, "rental.settings", studio.id, "Giờ hoạt động và phụ thu chỉ áp dụng cho đơn mới");
    return s;
  }
  if (command.type === "rental_plans") {
    const u = requireRole("host");
    const room = command.target === "room" ? s.rooms.find(r => r.id === command.id) : undefined;
    const type = s.types.find(t => t.id === (room?.typeId ?? command.id));
    if (!type || !s.studios.some(st => st.id === type.studioId && st.hostId === u.id) || (command.target === "room" && !room)) throw Error("Bạn không quản lý bảng giá này.");
    if (command.plans !== null) {
      const rooms = room ? [room] : s.rooms.filter(r => r.typeId === type.id && !r.rentalPlans);
      for (const r of rooms) validateRentalPlans(s, type.studioId, command.plans, r.capacity, effectiveCrew(s, r.id));
      if (!rooms.length) validateRentalPlans(s, type.studioId, command.plans, 1000, type.crewPolicy);
    }
    const target = room ?? type;
    if (command.plans === null) delete target.rentalPlans; else target.rentalPlans = structuredClone(command.plans);
    clearIneligibleFeaturedPricing(s);
    event(s, "rental.plans", command.id, "Cấu hình gói; giữ nguyên snapshot các đơn đã tạo");
    return s;
  }
  if (command.type === "crew_policy") {
    const u = requireRole("host"), room = s.rooms.find(r => r.id === command.roomId);
    if (!room || studioFor(s, room.id)?.hostId !== u.id) throw Error("Bạn không quản lý phòng này.");
    validateCrewPolicy(command.policy, room.capacity);
    room.crewPolicy = structuredClone(command.policy);
    const type = s.types.find(t => t.id === room.typeId)!;
    const plans = room.rentalPlans ?? type.rentalPlans;
    if (plans) validateRentalPlans(s, type.studioId, plans, room.capacity, command.policy ?? type.crewPolicy);
    event(s, "rental.crew", room.id, "Chỉ áp dụng cho đơn mới");
    return s;
  }
  if (command.type === "login") {
    if (
      command.userId &&
      (!s.users.some((u) => u.id === command.userId) ||
        s.users.find((u) => u.id === command.userId)?.locked)
    )
      throw Error("Tài khoản không thể đăng nhập.");
    s.sessionId = command.userId;
    return s;
  }
  if (command.type === "advance") {
    if (process.env.NODE_ENV === "production")
      throw Error("Công cụ thời gian chỉ dùng khi phát triển.");
    if (!Number.isFinite(command.minutes) || command.minutes < 0)
      throw Error("Thời gian không hợp lệ.");
    s.now += command.minutes * MIN;
    tick(s);
    return s;
  }
  tick(s);
  if (command.type === "request_restore") {
    const u = requireRole("customer");
    if (!u.restricted || !command.reason.trim())
      throw Error("Cần tài khoản đang tạm ngưng đặt thuê và lý do yêu cầu.");
    s.supportRequests ??= [];
    if (
      s.supportRequests.some((r) => r.userId === u.id && r.status === "pending")
    )
      throw Error("Yêu cầu trước đang chờ xét duyệt.");
    s.supportRequests.push({
      id: uid(s, "SUP"),
      userId: u.id,
      at: s.now,
      reason: command.reason,
      status: "pending",
    });
    event(s, "account.restore_requested", u.id, command.reason);
    return s;
  }
  if (command.type === "register") {
    if (
      !command.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.email) ||
      !/^0\d{9}$/.test(command.phone) ||
      s.users.some((u) => u.email.toLowerCase() === command.email.toLowerCase())
    )
      throw Error("Thông tin không hợp lệ hoặc email đã tồn tại.");
    const id = uid(s, "USER");
    s.users.push({
      id,
      name: command.name.trim(),
      email: command.email.toLowerCase(),
      phone: command.phone,
      role: "customer",
      locked: false,
      restricted: false,
      strikes: [],
    });
    s.sessionId = id;
    event(s, "account.registered", id);
    return s;
  }
  if (command.type === "reconcile") {
    requireRole("admin");
    const b = owned(command.id);
    if (!b.reconciliation || !command.reason.trim())
      throw Error("Cần giao dịch đang đối soát và lý do xác minh.");
    b.reconciliation = false;
    b.payment = command.paid ? "paid" : "failed";
    const attempt = b.paymentAttempts.findLast(
      (a) => a.status === "processing",
    );
    if (attempt) attempt.status = b.payment;
    if (command.paid) {
      b.paidAt = s.now;
      refund(b, b.deposit, "late_payment");
    }
    event(s, "payment.reconciled", b.id, command.reason);
    return s;
  }
  if (command.type === "resolve_refund") {
    requireRole("admin");
    const b = owned(command.id);
    if (!b.refund.escalated || !command.reason.trim())
      throw Error("Cần khoản hoàn đã chuyển Admin và bằng chứng xác nhận.");
    b.refund.status = "refunded";
    b.refund.escalated = false;
    event(s, "refund.manual_verified", b.id, command.reason);
    return s;
  }
  if (command.type === "create") {
    const u = requireRole("customer");
    if (u.restricted)
      throw Error(
        "Quyền đặt thuê đang tạm ngưng. Các đơn hiện có vẫn được sử dụng.",
      );
    if (!u.name.trim() || !/^0\d{9}$/.test(u.phone))
      throw Error("Cập nhật tên và số điện thoại hợp lệ trong hồ sơ.");
    const error = validateSelection(s, command.selection);
    if (error) throw Error(error);
    const policy = structuredClone(
      studioFor(s, command.selection.roomId)!.policy,
    );
    const rentalSnapshot = quoteRental(s, command.selection);
    const total = rentalSnapshot.breakdown.total;
    const id = uid(s, "SH");
    s.bookings.push({
      ...command.selection,
      rentalSnapshot,
      id,
      customerId: u.id,
      status: "awaiting_payment",
      createdAt: s.now,
      deadline: s.now + policy.paymentMinutes * MIN,
      policy,
      total,
      deposit: Math.round((total * policy.depositPercent) / 100),
      payment: "unpaid",
      paymentAttempts: [],
      paidAt: undefined,
      reconciliation: false,
      refund: {
        status: "not_required",
        amount: 0,
        reason: "",
        attempts: [],
        escalated: false,
      },
      collections: [],
      overtime: 0,
      changes: [],
      history: [{ at: s.now, text: "Đã giữ phòng và thiết bị · chờ đặt cọc" }],
    });
    event(s, "booking.created", id);
    return s;
  }
  if (command.type === "payment") {
    requireRole("customer");
    const b = owned(command.id);
    const processing = b.paymentAttempts.findLast(
      (a) => a.status === "processing",
    );
    if (b.payment === "paid") throw Error("Cọc đã được ghi nhận.");
    if (
      b.status !== "awaiting_payment" ||
      (s.now >= b.deadline && (!processing || s.now >= b.deadline + 5 * MIN))
    )
      throw Error(
        "Không thể mở giao dịch mới sau hạn. Giao dịch chưa rõ cần đối soát.",
      );
    if (b.payment === "processing" && command.outcome === "processing")
      throw Error("Giao dịch đang xử lý.");
    const a =
      processing && b.payment === "processing"
        ? processing
        : { id: uid(s, "PAY"), at: s.now, status: command.outcome };
    if (!b.paymentAttempts.includes(a)) b.paymentAttempts.push(a);
    a.status = command.outcome;
    b.payment = command.outcome;
    if (command.outcome === "paid") {
      b.paidAt = s.now;
      transition(
        s,
        b,
        "pending",
        "Đã nhận cọc · chờ chủ Studio duyệt trong 2 giờ",
      );
    }
    event(s, "payment." + command.outcome, b.id);
    return s;
  }
  if (["approve", "reject", "checkin", "checkout"].includes(command.type)) {
    const c = command as Extract<
      Command,
      {
        type:
          | "approve"
          | "reject"
          | "checkin"
          | "checkout"
          | "cancel"
          | "admin_cancel";
      }
    >;
    const b = hostBooking(c.id);
    if (c.type === "approve") {
      if (b.status !== "pending")
        throw Error("Chỉ duyệt đơn đang chờ xác nhận.");
      transition(s, b, "confirmed", "Chủ Studio đã xác nhận");
    }
    if (c.type === "reject") {
      if (b.status !== "pending" || !c.reason?.trim())
        throw Error("Cần đơn chờ duyệt và lý do từ chối.");
      transition(s, b, "cancelled", c.reason);
      b.cancelReason = c.reason;
      refund(b, b.deposit, "host_rejection");
    }
    if (c.type === "checkin") {
      if (b.status !== "confirmed" || s.now < b.start || s.now >= b.end)
        throw Error("Chỉ nhận phòng trong thời gian thuê đã xác nhận.");
      b.actualIn = s.now;
      transition(
        s,
        b,
        "checked_in",
        "Đã nhận phòng thực tế · giờ kết thúc giữ nguyên",
      );
    }
    if (c.type === "checkout") {
      if (b.status !== "checked_in") throw Error("Phòng chưa được nhận.");
      b.actualOut = s.now;
      b.overtime =
        Math.ceil(Math.max(0, s.now - b.end) / BUFFER) *
        b.policy.overtimePerBlock;
      transition(
        s,
        b,
        "completed",
        "Đã trả phòng thực tế · công nợ theo dõi riêng",
      );
      if (
        s.bookings.some(
          (x) =>
            x.id !== b.id &&
            x.roomId === b.roomId &&
            activeStatuses.includes(x.status) &&
            x.start < s.now + BUFFER &&
            x.end > b.end,
        )
      )
        event(
          s,
          "overtime.conflict",
          b.id,
          "Cần xử lý vận hành ca tiếp theo; không tự dời lịch.",
        );
    }
    return s;
  }
  if (command.type === "cancel" || command.type === "admin_cancel") {
    const b = owned(command.id);
    if (!command.reason?.trim()) throw Error("Vui lòng nhập lý do hủy.");
    if (!["awaiting_payment", "pending", "confirmed"].includes(b.status))
      throw Error("Đơn không thể hủy ở trạng thái này.");
    if (command.type === "admin_cancel") {
      requireRole("admin");
      if (s.now >= b.start) throw Error("Admin chỉ hủy trước giờ bắt đầu.");
      if (b.payment === "processing" || b.reconciliation)
        throw Error("Cần đối soát giao dịch trước khi hủy.");
      if (b.payment === "paid") refund(b, b.deposit, "admin_exception");
    } else {
      requireRole("customer");
      if (b.payment === "processing" || b.reconciliation)
        throw Error("Giao dịch đang xử lý, cần đối soát trước khi hủy.");
      if (b.payment === "paid") {
        if (s.now > b.start - b.policy.cancelHours * HOUR)
          throw Error("Đã qua hạn tự hủy; hãy liên hệ hỗ trợ.");
        const tier = [...b.policy.refundTiers]
          .sort((a, b) => b.hours - a.hours)
          .find((t) => (b.start - s.now) / HOUR >= t.hours);
        refund(
          b,
          Math.round((b.deposit * (tier?.percent ?? 0)) / 100),
          "customer_cancel",
        );
      } else strike(s, b);
    }
    b.cancelReason = command.reason;
    transition(s, b, "cancelled", command.reason);
    return s;
  }
  if (command.type === "collect") {
    const b = hostBooking(command.id);
    if (
      !["checked_in", "completed"].includes(b.status) ||
      !Number.isInteger(command.amount) ||
      command.amount <= 0 ||
      command.amount > balance(b) ||
      b.collections.some((x) => x.id === command.collectionId)
    )
      throw Error("Khoản thu không hợp lệ, vượt công nợ hoặc đã ghi nhận.");
    b.collections.push({
      id: command.collectionId,
      amount: command.amount,
      at: s.now,
      method: command.method,
      actorId: actor()!.id,
    });
    event(s, "collection.recorded", b.id, String(command.amount));
    return s;
  }
  if (command.type === "refund") {
    requireRole("host", "admin");
    const b = owned(command.id);
    if (
      !["pending", "failed"].includes(b.refund.status) ||
      b.refund.attempts.length >= 3 ||
      (b.refund.escalated && actor()!.role !== "admin")
    )
      throw Error(
        "Khoản hoàn cần Admin xử lý hoặc không đủ điều kiện thử lại.",
      );
    const outcomes = [command.outcome, ...(command.retryOutcomes ?? [])];
    let next = 0;
    do {
      const outcome = outcomes[next++] ?? command.outcome;
      b.refund.attempts.push({ at: s.now, status: outcome });
      b.refund.status = outcome;
      event(
        s,
        "refund." + outcome,
        b.id,
        `Lần ${b.refund.attempts.length} · kết quả mô phỏng đã xác minh`,
      );
    } while (b.refund.status === "failed" && b.refund.attempts.length < 3);
    b.refund.escalated =
      b.refund.status === "failed" && b.refund.attempts.length >= 3;
    return s;
  }
  if (command.type === "change") {
    const u = requireRole("customer"),
      b = owned(command.id);
    if (
      u.restricted ||
      b.status !== "confirmed" ||
      b.actualIn ||
      s.now > b.start - b.policy.changeHours * HOUR ||
      b.changes.some((x) => x.status === "approved" || x.status === "pending")
    )
      throw Error("Đơn không đủ điều kiện đổi lịch.");
    if (
      studioFor(s, command.selection.roomId)?.id !== studioFor(s, b.roomId)?.id
    )
      throw Error("Chỉ đổi phòng trong cùng Studio.");
    const error = validateSelection(s, command.selection, b.id);
    if (error) throw Error(error);
    b.changes.push({
      selection: command.selection,
      status: "pending",
      at: s.now,
    });
    event(s, "change.requested", b.id, "Lịch cũ vẫn giữ hiệu lực");
    return s;
  }
  if (
    command.type === "approve_change" ||
    command.type === "reject_change" ||
    command.type === "withdraw_change"
  ) {
    const b =
      command.type === "withdraw_change"
        ? (requireRole("customer"), owned(command.id))
        : hostBooking(command.id);
    const change = b.changes.find((x) => x.status === "pending");
    if (!change || b.status !== "confirmed")
      throw Error("Không có yêu cầu đổi lịch hợp lệ.");
    if (command.type === "approve_change") {
      if (
        s.users.find((u) => u.id === b.customerId)?.restricted ||
        s.now > b.start - b.policy.changeHours * HOUR
      )
        throw Error("Đã qua hạn hoặc tài khoản tạm ngưng đặt thuê.");
      const error = validateSelection(s, change.selection, b.id);
      if (error) throw Error(error);
      const total = price(s, change.selection);
      if (total < b.deposit && b.refund.status !== "not_required")
        throw Error("Cần xử lý khoản hoàn hiện có trước.");
      const before = JSON.stringify({
        roomId: b.roomId,
        start: b.start,
        end: b.end,
        total: b.total,
      });
      Object.assign(b, change.selection, { total, rentalSnapshot: quoteRental(s, change.selection) });
      change.status = "approved";
      if (total < b.deposit) refund(b, b.deposit - total, "excess_deposit");
      b.history.push({
        at: s.now,
        text: "Đổi lịch được duyệt · giữ nguyên cọc đã trả",
      });
      event(
        s,
        "change.approved",
        b.id,
        "",
        before,
        JSON.stringify(change.selection),
      );
    } else {
      change.status =
        command.type === "withdraw_change" ? "withdrawn" : "rejected";
      event(s, "change." + change.status, b.id);
    }
    return s;
  }
  if (
    command.type === "restore" ||
    command.type === "restrict" ||
    command.type === "lock"
  ) {
    requireRole("admin");
    const u = s.users.find((u) => u.id === command.userId);
    if (!u || !command.reason.trim() || u.role === "admin")
      throw Error("Cần tài khoản hợp lệ và lý do.");
    if (command.type === "restore") {
      s.supportRequests
        ?.filter((r) => r.userId === u.id && r.status === "pending")
        .forEach((r) => (r.status = "resolved"));
      u.restricted = false;
      u.locked = false;
      u.strikes.forEach((x) => (x.active = false));
    } else if (command.type === "restrict") u.restricted = true;
    else u.locked = true;
    event(s, "account." + command.type, u.id, command.reason);
    return s;
  }
  if (command.type === "application") {
    const u = requireRole("customer");
    if (
      !command.studioName.trim() ||
      !command.address.trim() ||
      s.applications.some((a) => a.userId === u.id && a.status !== "rejected")
    )
      throw Error("Thông tin thiếu hoặc hồ sơ đang được xử lý.");
    s.applications.push({
      id: uid(s, "APP"),
      userId: u.id,
      studioName: command.studioName,
      address: command.address,
      description: command.description,
      status: "pending",
    });
    event(s, "host.application", u.id);
    return s;
  }
  if (command.type === "review_application") {
    requireRole("admin");
    const a = s.applications.find((a) => a.id === command.id);
    if (
      !a ||
      a.status !== "pending" ||
      (!command.approved && !command.reason.trim())
    )
      throw Error("Hồ sơ không hợp lệ hoặc thiếu lý do.");
    a.status = command.approved ? "approved" : "rejected";
    a.reason = command.reason;
    if (command.approved) s.users.find((u) => u.id === a.userId)!.role = "host";
    event(s, "host." + a.status, a.id, command.reason);
    s.notifications.push({
      userId: a.userId,
      text: `Hồ sơ ${a.studioName}: ${a.status === "approved" ? "đã duyệt" : "từ chối — " + a.reason}`,
      at: s.now,
    });
    return s;
  }
  if (command.type === "profile") {
    const u = requireRole("customer", "host", "admin");
    if (!command.name.trim() || !/^0\d{9}$/.test(command.phone))
      throw Error("Nhập tên và số điện thoại Việt Nam 10 chữ số.");
    u.name = command.name.trim();
    u.phone = command.phone;
    event(s, "profile.updated", u.id);
    return s;
  }
  if (command.type === "policy") {
    const u = requireRole("host");
    const st = s.studios.find(
      (x) => x.id === command.studioId && x.hostId === u.id,
    );
    if (!st) throw Error("Không có quyền sửa Studio.");
    validatePolicy(command.policy);
    st.policy = command.policy;
    event(s, "policy.updated", st.id, "Chỉ áp dụng cho đơn mới");
    return s;
  }
  if (command.type === "room_status") {
    const u = requireRole("host", "admin");
    const st = studioFor(s, command.id),
      r = s.rooms.find((x) => x.id === command.id);
    if (!r || (u.role === "host" && st?.hostId !== u.id))
      throw Error("Không có quyền sửa phòng.");
    r.active = command.active;
    clearIneligibleFeaturedPricing(s);
    event(
      s,
      "room.status",
      r.id,
      command.active ? "Mở nhận đặt" : "Tạm ngưng nhận đặt",
    );
    return s;
  }
  if (command.type === "equipment_save") {
    const u = requireRole("host");
    if (
      !s.studios.some(
        (st) => st.id === command.equipment.studioId && st.hostId === u.id,
      ) ||
      !command.equipment.name.trim() ||
      !Number.isInteger(command.equipment.quantity) ||
      command.equipment.quantity < 0 ||
      !Number.isSafeInteger(command.equipment.hourlyRate) || command.equipment.hourlyRate < 0 ||
      (command.equipment.description?.length ?? 0) > 300 ||
      typeof command.equipment.image !== "string" || command.equipment.image.length > 150000
    )
      throw Error("Thiết bị không hợp lệ.");
    const reservations = s.bookings.filter(
      (b) =>
        activeStatuses.includes(b.status) &&
        (bookingEquipment(b)[command.equipment.id] ?? 0) > 0,
    );
    if (
      reservations.some(
        (b) =>
          reservations
            .filter((x) => x.start <= b.start && b.start < x.end + BUFFER)
            .reduce(
              (sum, x) => sum + (bookingEquipment(x)[command.equipment.id] ?? 0),
              0,
            ) > command.equipment.quantity,
      )
    )
      throw Error(
        "Tồn kho mới thấp hơn số lượng đã giữ. Hãy xử lý các đơn liên quan trước.",
      );
    const e = s.equipment.find((x) => x.id === command.equipment.id);
    if (e && e.studioId !== command.equipment.studioId)
      throw Error("Không thể chuyển thiết bị sang Studio khác.");
    if (e) Object.assign(e, command.equipment);
    else s.equipment.push(command.equipment);
    event(s, "equipment.updated", command.equipment.id);
    return s;
  }
  if (command.type === "studio_status") {
    requireRole("admin");
    const studio = s.studios.find((st) => st.id === command.id);
    if (!studio || !command.reason.trim())
      throw Error("Cần Studio hợp lệ và lý do giám sát.");
    studio.active = command.active;
    clearIneligibleFeaturedPricing(s);
    event(s, "studio.moderated", studio.id, command.reason);
    return s;
  }
  if (command.type === "studio_save") {
    const u = requireRole("host");
    if (
      command.studio.hostId !== u.id ||
      s.studios.some(
        (st) => st.id === command.studio.id && st.hostId !== u.id,
      ) ||
      !command.studio.name.trim() ||
      !command.studio.address.trim()
    )
      throw Error("Thông tin Studio không hợp lệ.");
    validatePolicy(command.studio.policy);
    if (command.studio.operatingHours) validateOperatingHours(command.studio.operatingHours);
    validateTimeSurcharge(command.studio.timeSurcharge);
    const st = s.studios.find((st) => st.id === command.studio.id);
    if (st) Object.assign(st, command.studio);
    else s.studios.push(command.studio);
    event(s, "studio.saved", command.studio.id);
    return s;
  }
  if (command.type === "type_save") {
    const u = requireRole("host"),
      t = command.roomType;
    if (
      !s.studios.some((st) => st.id === t.studioId && st.hostId === u.id) ||
      s.types.some((x) => x.id === t.id && x.studioId !== t.studioId) ||
      !t.name.trim() ||
      t.hourlyRate <= 0 ||
      !t.plans.length
    )
      throw Error("Loại phòng không hợp lệ.");
    const old = s.types.find((x) => x.id === t.id);
    if (old) Object.assign(old, t);
    else s.types.push(t);
    clearIneligibleFeaturedPricing(s);
    event(s, "room_type.saved", t.id);
    return s;
  }
  if (command.type === "room_save") {
    const u = requireRole("host"),
      r = command.room;
    const t = s.types.find((x) => x.id === r.typeId);
    if (
      !t ||
      !s.studios.some((st) => st.id === t.studioId && st.hostId === u.id) ||
      (s.rooms.some((x) => x.id === r.id) &&
        studioFor(s, r.id)?.hostId !== u.id) ||
      !r.code.trim() ||
      !r.name.trim() ||
      r.capacity < 1 ||
      r.area <= 0 ||
      s.rooms.some(
        (x) =>
          x.id !== r.id &&
          x.code === r.code &&
          studioFor(s, x.id)?.id === t.studioId,
      )
    )
      throw Error("Phòng không hợp lệ hoặc mã phòng bị trùng.");
    const old = s.rooms.find((x) => x.id === r.id);
    const crewPolicy = r.crewPolicy ?? old?.crewPolicy ?? t.crewPolicy;
    validateCrewPolicy(crewPolicy, r.capacity);
    const rentalPlans = r.rentalPlans ?? old?.rentalPlans ?? t.rentalPlans;
    if (rentalPlans) validateRentalPlans(s, t.studioId, rentalPlans, r.capacity, crewPolicy);
    if (old) Object.assign(old, r);
    else s.rooms.push(r);
    clearIneligibleFeaturedPricing(s);
    event(s, "room.saved", r.id);
    return s;
  }
  if (command.type === "rate") {
    const u = requireRole("host");
    const t = s.types.find((t) => t.id === command.id);
    if (
      !t ||
      !s.studios.some((st) => st.id === t.studioId && st.hostId === u.id) ||
      !Number.isInteger(command.hourlyRate) ||
      command.hourlyRate <= 0 ||
      !command.plans.length
    )
      throw Error("Bảng giá không hợp lệ.");
    t.hourlyRate = command.hourlyRate;
    t.plans = command.plans;
    clearIneligibleFeaturedPricing(s);
    event(s, "rate.updated", t.id);
    return s;
  }
  return s;
}
