import { z } from "zod";
import {
  bookingSchema,
  catalogSchema,
  equipmentSchema,
  rateSchema,
  roomSchema,
  studioSchema,
  type Booking,
  type BookingDraft,
  type BookingRequest,
  type Catalog,
  type Database,
  type DomainEvent,
  type Equipment,
  type Rate,
  type Room,
  type Studio,
  type User,
} from "@/domain/schema";
import {
  canTransition,
  displayStatus,
  occupies,
  type BookingAction,
} from "@/domain/booking";
import {
  checkAvailability,
  equipmentAvailable,
  overlaps,
} from "@/domain/availability";
import { getEffectiveRoomStatus } from "@/domain/access";
import { normalize, slugify } from "@/lib/format";
import { BrowserAdapter, createBrowserAdapter } from "./storage/adapter";
import { createSeed, demoPassword } from "./seed/data";
import { hashPassword } from "./auth/password";

export class DomainFailure extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type StoreSnapshot = {
  db: Database | null;
  userId: string | null;
  ready: boolean;
  error: string | null;
  notice: string;
  now: number;
};
const sessionSchema = z.object({ userId: z.string(), loginAt: z.number() });
export const draftSchema = z.object({
  roomId: z.string(),
  rateId: z.string(),
  start: z.number(),
  end: z.number(),
  participants: z.number(),
  equipment: z.array(
    z.object({ id: z.string(), quantity: z.number().int().min(0) }),
  ),
  step: z.number().int().min(1).max(3),
  notes: z.string(),
  contact: z.object({ name: z.string(), email: z.string(), phone: z.string() }),
  acknowledged: z.boolean(),
});
export class StudioService {
  private state: StoreSnapshot = {
    db: null,
    userId: null,
    ready: false,
    error: null,
    notice: "",
    now: 0,
  };
  private listeners = new Set<() => void>();
  private adapter: BrowserAdapter | null = null;
  constructor(private clock: () => number = () => Date.now()) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => serverSnapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<StoreSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  initialize(adapter?: BrowserAdapter) {
    if (this.state.ready) return;
    try {
      this.adapter = adapter ?? createBrowserAdapter();
      const stored = this.adapter.read(),
        db = stored ?? createSeed(this.clock());
      if (!stored) this.adapter.write(db);
      const session = this.adapter.readSession("session", sessionSchema);
      this.publish({
        db,
        userId: session?.userId ?? null,
        ready: true,
        now: this.clock(),
        error: null,
      });
    } catch (error) {
      this.publish({ ready: true, error: message(error), now: this.clock() });
    }
  }
  refresh = (key?: string | null) => {
    if (!this.adapter || (key && key !== this.adapter.dataKey)) return;
    try {
      const db = this.adapter.read();
      if (db && db.revision !== this.state.db?.revision)
        this.publish({
          db,
          error: null,
          now: this.clock(),
          notice: "Dữ liệu đã được cập nhật từ tab khác.",
        });
    } catch (error) {
      this.publish({ error: message(error) });
    }
  };
  tick = () => {
    if (!this.state.ready) return;
    const now = this.clock();
    if (
      this.state.db?.bookings.some(
        (b) =>
          b.orderStatus === "pending" &&
          b.paymentStatus !== "success" &&
          b.holdUntil <= now,
      )
    ) {
      try {
        this.transact((db) => {
          for (const b of db.bookings) {
            if (
              b.orderStatus !== "pending" ||
              b.paymentStatus === "success" ||
              b.holdUntil > now
            )
              continue;
            b.orderStatus = "expired";
            b.timeline.push({
              id: crypto.randomUUID(),
              at: b.holdUntil,
              actorId: "system",
              actorName: "Hệ thống demo",
              role: "system",
              action: "Hết hạn giữ chỗ",
              entityType: "booking",
              entityId: b.code,
              summary: "Hết hạn giữ chỗ sau 15 phút",
              reason: "",
              previous: "awaiting-deposit",
              next: "expired",
            });
          }
        });
      } catch (error) {
        this.publish({ error: message(error) });
      }
    }
    this.publish({ now });
  };
  retry = () => {
    this.publish({ ready: false, error: null });
    this.initialize(this.adapter ?? undefined);
  };
  private latest() {
    if (!this.adapter)
      throw new DomainFailure("unavailable", "Dữ liệu chưa sẵn sàng.");
    const db = this.adapter.read();
    if (!db) throw new DomainFailure("missing", "Không tìm thấy dữ liệu demo.");
    return db;
  }
  private actor(db: Database, role?: User["role"]) {
    const actor = db.users.find((u) => u.id === this.state.userId);
    if (!actor)
      throw new DomainFailure("unauthenticated", "Vui lòng đăng nhập.");
    if (actor.locked || actor.approval !== "approved")
      throw new DomainFailure(
        "restricted",
        "Tài khoản hiện không được phép thực hiện thao tác này.",
      );
    if (role && actor.role !== role)
      throw new DomainFailure(
        "role",
        "Tài khoản không có quyền thực hiện thao tác này.",
      );
    return actor;
  }
  private transact<T>(operation: (db: Database) => T): T {
    const db = this.latest();
    const value = operation(db);
    db.revision = crypto.randomUUID();
    this.adapter!.write(db);
    this.publish({ db, now: this.clock(), error: null });
    return value;
  }
  private event(
    actor: User,
    action: string,
    entityType: string,
    entityId: string,
    summary = action,
    reason = "",
    previous = "",
    next = "",
  ): DomainEvent {
    return {
      id: crypto.randomUUID(),
      at: this.clock(),
      actorId: actor.id,
      actorName: actor.name,
      role: actor.role,
      action,
      entityType,
      entityId,
      summary,
      reason,
      previous,
      next,
    };
  }
  private hostStudio(db: Database, id: string) {
    const actor = this.actor(db, "host"),
      studio = db.studios.find((s) => s.id === id && s.ownerId === actor.id);
    if (!studio) throw new DomainFailure("not-found", "Không tìm thấy studio.");
    return { actor, studio };
  }
  async login(email: string, password: string) {
    const db = this.latest(),
      user = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
    if (!user)
      throw new DomainFailure("credentials", "Email hoặc mật khẩu không đúng.");
    const valid = user.demo
      ? process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
        password === demoPassword
      : (await hashPassword(password, user.salt)).passwordHash ===
        user.passwordHash;
    if (!valid)
      throw new DomainFailure("credentials", "Email hoặc mật khẩu không đúng.");
    this.adapter!.writeSession("session", {
      userId: user.id,
      loginAt: this.clock(),
    });
    this.publish({ db, userId: user.id });
    return user;
  }
  logout() {
    this.adapter?.removeSession("session");
    this.publish({ userId: null });
  }
  async register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "customer" | "host";
    studioName?: string;
    description?: string;
  }) {
    const valid = z
      .object({
        name: z.string().trim().min(2),
        email: z.email(),
        phone: z.string().regex(/^(\+84|0)\d{9,10}$/),
        password: z.string().min(8),
        role: z.enum(["customer", "host"]),
        studioName: z.string().optional(),
        description: z.string().max(500).optional(),
      })
      .parse(input);
    if (
      input.role === "host" &&
      (!input.studioName?.trim() || !input.description?.trim())
    )
      throw new DomainFailure(
        "validation",
        "Vui lòng nhập tên và mô tả studio đề xuất.",
      );
    const password = await hashPassword(valid.password);
    const user = this.transact((db) => {
      if (
        db.users.some(
          (u) => u.email.toLowerCase() === valid.email.toLowerCase(),
        )
      )
        throw new DomainFailure(
          "duplicate",
          "Email đã được sử dụng bởi một tài khoản.",
        );
      const user: User = {
        id: crypto.randomUUID(),
        name: valid.name,
        email: valid.email.toLowerCase(),
        phone: valid.phone,
        role: valid.role,
        approval: valid.role === "host" ? "pending" : "approved",
        locked: false,
        lockReason: "",
        avatar: "",
        createdAt: this.clock(),
        approvedAt: valid.role === "host" ? null : this.clock(),
        demo: false,
        ...password,
      };
      db.users.push(user);
      if (user.role === "host")
        db.applications.push({
          id: crypto.randomUUID(),
          userId: user.id,
          studioName: valid.studioName!,
          description: valid.description!,
          submittedAt: this.clock(),
          reason: "",
          history: [{ at: this.clock(), action: "Đã gửi hồ sơ", reason: "" }],
        });
      return user;
    });
    this.adapter!.writeSession("session", {
      userId: user.id,
      loginAt: this.clock(),
    });
    this.publish({ userId: user.id });
    return user;
  }
  updateProfile(input: { name: string; phone: string; avatar: string }) {
    return this.transact((db) => {
      const actor = this.actor(db);
      const valid = z
        .object({
          name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự."),
          phone: z
            .string()
            .regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ."),
          avatar: z.string(),
        })
        .parse(input);
      Object.assign(actor, valid);
      return actor;
    });
  }
  resubmitApplication(input: {
    studioName: string;
    description: string;
    name: string;
    phone: string;
  }) {
    return this.transact((db) => {
      const actor = db.users.find((u) => u.id === this.state.userId);
      if (
        !actor ||
        actor.locked ||
        actor.role !== "host" ||
        actor.approval !== "rejected"
      )
        throw new DomainFailure("state", "Hồ sơ hiện không thể gửi lại.");
      const valid = z
        .object({
          studioName: z.string().trim().min(2),
          description: z.string().trim().min(10).max(500),
          name: z.string().trim().min(2),
          phone: z.string().regex(/^(\+84|0)\d{9,10}$/),
        })
        .parse(input);
      const app = db.applications.find((a) => a.userId === actor.id)!;
      Object.assign(app, {
        studioName: valid.studioName,
        description: valid.description,
        submittedAt: this.clock(),
        reason: "",
      });
      actor.name = valid.name;
      actor.phone = valid.phone;
      actor.approval = "pending";
      app.history.push({
        at: this.clock(),
        action: "Đã gửi lại hồ sơ",
        reason: "",
      });
      db.audit.push(
        this.event(actor, "Chủ studio gửi lại hồ sơ", "user", actor.id),
      );
    });
  }
  approveHost(id: string, approve: boolean, reason = "") {
    return this.transact((db) => {
      const actor = this.actor(db, "admin"),
        user = db.users.find((u) => u.id === id && u.role === "host");
      if (!user || user.locked || user.approval !== "pending")
        throw new DomainFailure("state", "Hồ sơ không còn chờ duyệt.");
      if (!approve && !reason.trim())
        throw new DomainFailure("reason", "Cần nhập lý do từ chối.");
      user.approval = approve ? "approved" : "rejected";
      user.approvedAt = approve ? this.clock() : null;
      const app = db.applications.find((a) => a.userId === id)!;
      app.reason = reason;
      app.history.push({
        at: this.clock(),
        action: approve ? "Đã duyệt hồ sơ" : "Từ chối hồ sơ",
        reason,
      });
      db.audit.push(
        this.event(
          actor,
          approve ? "Duyệt chủ studio" : "Từ chối chủ studio",
          "user",
          id,
          `${user.name}: ${approve ? "đã duyệt" : "từ chối"}`,
          reason,
          "pending",
          user.approval,
        ),
      );
    });
  }
  setLocked(id: string, locked: boolean, reason = "") {
    return this.transact((db) => {
      const actor = this.actor(db, "admin"),
        user = db.users.find((u) => u.id === id);
      if (!user || user.role === "admin" || user.locked === locked)
        throw new DomainFailure(
          "state",
          "Không thể thay đổi trạng thái tài khoản này.",
        );
      if (locked && !reason.trim())
        throw new DomainFailure("reason", "Cần nhập lý do khóa.");
      user.locked = locked;
      user.lockReason = locked ? reason : "";
      db.audit.push(
        this.event(
          actor,
          locked ? "Khóa tài khoản" : "Mở khóa tài khoản",
          "user",
          id,
          user.name,
          reason,
          locked ? "active" : "locked",
          locked ? "locked" : "active",
        ),
      );
    });
  }
  saveStudio(input: Studio) {
    return this.transact((db) => {
      const actor = this.actor(db, "host"),
        existing = db.studios.find((s) => s.id === input.id);
      if (existing && existing.ownerId !== actor.id)
        throw new DomainFailure("not-found", "Không tìm thấy studio.");
      const valid = studioSchema.parse({
        ...input,
        ownerId: actor.id,
        adminHidden: existing?.adminHidden ?? false,
        adminReason: existing?.adminReason ?? "",
      });
      if (
        !valid.address.trim() ||
        !valid.city.trim() ||
        !valid.rules.trim() ||
        !valid.phone.trim()
      )
        throw new DomainFailure(
          "validation",
          "Điền đầy đủ địa chỉ, số điện thoại và quy định thuê.",
        );
      if (existing) Object.assign(existing, valid);
      else db.studios.push(valid);
      db.audit.push(
        this.event(
          actor,
          existing ? "Cập nhật studio" : "Tạo studio",
          "studio",
          valid.id,
          valid.name,
        ),
      );
      return valid;
    });
  }
  saveRoom(input: Room) {
    return this.transact((db) => {
      const { actor, studio } = this.hostStudio(db, input.studioId);
      const existing = db.rooms.find((r) => r.id === input.id);
      if (existing && existing.studioId !== studio.id)
        throw new DomainFailure("not-found", "Không tìm thấy phòng.");
      const valid = roomSchema.parse({
        ...input,
        slug:
          existing?.slug ?? `${slugify(input.name)}-${input.id.slice(0, 6)}`,
        adminHidden: existing?.adminHidden ?? false,
        adminReason: existing?.adminReason ?? "",
        status: existing ? input.status : "hidden",
      });
      if (valid.closeMinute <= valid.openMinute || !valid.operatingDays.length)
        throw new DomainFailure("schedule", "Giờ hoạt động không hợp lệ.");
      if (
        valid.overnight &&
        (valid.openMinute !== 0 || valid.closeMinute !== 1440)
      )
        throw new DomainFailure(
          "schedule",
          "Thuê qua đêm cần lịch hoạt động 00:00–24:00.",
        );
      for (const id of valid.typeIds)
        if (
          !db.types.some(
            (t) => t.id === id && (!t.hidden || existing?.typeIds.includes(id)),
          )
        )
          throw new DomainFailure(
            "catalog",
            "Loại studio không còn được chọn.",
          );
      for (const id of valid.amenityIds)
        if (
          !db.amenities.some(
            (t) =>
              t.id === id && (!t.hidden || existing?.amenityIds.includes(id)),
          )
        )
          throw new DomainFailure("catalog", "Tiện ích không còn được chọn.");
      if (
        valid.status === "active" &&
        getEffectiveRoomStatus(
          {
            ...db,
            rooms: db.rooms.map((r) => (r.id === valid.id ? valid : r)),
          },
          valid,
          this.clock(),
        ) !== "bookable"
      )
        throw new DomainFailure(
          "publishing",
          "Chưa thể mở phòng: cần ảnh, loại studio, bảng giá đang áp dụng và không bị Admin ẩn.",
        );
      const previous = existing?.status ?? "new";
      if (existing) Object.assign(existing, valid);
      else db.rooms.push(valid);
      db.audit.push(
        this.event(
          actor,
          previous !== valid.status
            ? "Thay đổi trạng thái phòng"
            : "Cập nhật phòng",
          "room",
          valid.id,
          valid.name,
          "",
          previous,
          valid.status,
        ),
      );
      return valid;
    });
  }
  saveEquipment(input: Equipment) {
    return this.transact((db) => {
      const { actor } = this.hostStudio(db, input.studioId),
        existing = db.equipment.find((e) => e.id === input.id);
      if (existing && existing.studioId !== input.studioId)
        throw new DomainFailure("not-found", "Không tìm thấy thiết bị.");
      const valid = equipmentSchema.parse(input);
      const active = db.bookings.filter(
        (b) =>
          b.studioId === input.studioId &&
          occupies(b, this.clock()) &&
          b.snapshot.price.equipment.some((e) => e.id === valid.id),
      );
      const points = active.map((b) => b.start);
      const max = Math.max(
        0,
        ...points.map((point) =>
          active
            .filter((b) => b.start <= point && point < b.end)
            .reduce(
              (s, b) =>
                s +
                (b.snapshot.price.equipment.find((e) => e.id === valid.id)
                  ?.quantity ?? 0),
              0,
            ),
        ),
      );
      if (
        valid.quantity < max ||
        (active.length > 0 && valid.status !== "available")
      )
        throw new DomainFailure(
          "reserved",
          `Thiết bị đang được giữ bởi ${active.map((b) => b.code).join(", ")}. Không thể giảm tồn kho hoặc ngừng phục vụ.`,
        );
      if (existing) Object.assign(existing, valid);
      else db.equipment.push(valid);
      db.audit.push(
        this.event(
          actor,
          "Cập nhật thiết bị",
          "equipment",
          valid.id,
          valid.name,
        ),
      );
      return valid;
    });
  }
  saveRate(input: Rate) {
    return this.transact((db) => {
      const room = db.rooms.find((r) => r.id === input.roomId);
      if (!room) throw new DomainFailure("not-found", "Không tìm thấy phòng.");
      const { actor } = this.hostStudio(db, room.studioId);
      const existing = db.rates.find((r) => r.id === input.id);
      if (existing && existing.roomId !== room.id)
        throw new DomainFailure("not-found", "Không tìm thấy bảng giá.");
      const valid = rateSchema.parse(input);
      if (
        valid.minUnits > valid.maxUnits ||
        (valid.effectiveTo !== null &&
          valid.effectiveTo <= valid.effectiveFrom) ||
        (!["hour"].includes(valid.unit) &&
          (!Number.isInteger(valid.minUnits) ||
            !Number.isInteger(valid.maxUnits)))
      )
        throw new DomainFailure(
          "rate",
          "Kiểm tra ngày hiệu lực và số đơn vị thuê.",
        );
      if (
        valid.active &&
        db.rates.some(
          (r) =>
            r.id !== valid.id &&
            r.roomId === valid.roomId &&
            r.unit === valid.unit &&
            r.active &&
            overlaps(
              valid.effectiveFrom,
              valid.effectiveTo ?? Infinity,
              r.effectiveFrom,
              r.effectiveTo ?? Infinity,
            ),
        )
      )
        throw new DomainFailure(
          "overlap",
          "Bảng giá cùng đơn vị bị trùng khoảng hiệu lực. Ngừng bảng giá cũ hoặc đổi ngày.",
        );
      if (existing) Object.assign(existing, valid);
      else db.rates.push(valid);
      db.audit.push(
        this.event(
          actor,
          "Cập nhật bảng giá",
          "rate",
          valid.id,
          `${valid.name}: ${valid.price} VND/${valid.unit}`,
        ),
      );
      return valid;
    });
  }
  setVisibility(
    entity: "studio" | "room",
    id: string,
    hidden: boolean,
    reason = "",
  ) {
    return this.transact((db) => {
      const actor = this.actor(db, "admin"),
        resource = (entity === "studio" ? db.studios : db.rooms).find(
          (x) => x.id === id,
        );
      if (!resource || resource.adminHidden === hidden)
        throw new DomainFailure("state", "Trạng thái đã thay đổi.");
      if (hidden && !reason.trim())
        throw new DomainFailure("reason", "Cần nhập lý do ẩn.");
      resource.adminHidden = hidden;
      resource.adminReason = hidden ? reason : "";
      db.audit.push(
        this.event(
          actor,
          `Admin ${hidden ? "ẩn" : "hiện"} ${entity === "studio" ? "studio" : "phòng"}`,
          entity,
          id,
          resource.name,
          reason,
          hidden ? "visible" : "hidden",
          hidden ? "hidden" : "visible",
        ),
      );
    });
  }
  saveCatalog(kind: "types" | "amenities", input: Catalog) {
    return this.transact((db) => {
      const actor = this.actor(db, "admin"),
        existing = db[kind].find((c) => c.id === input.id);
      const valid = catalogSchema.parse({
        ...input,
        slug: existing?.slug ?? slugify(input.name),
      });
      if (
        db[kind].some(
          (c) =>
            c.id !== input.id && normalize(c.name) === normalize(valid.name),
        )
      )
        throw new DomainFailure(
          "duplicate",
          "Tên danh mục đã tồn tại (kể cả khác dấu hoặc chữ hoa). ",
        );
      if (existing) Object.assign(existing, valid);
      else db[kind].push(valid);
      db.audit.push(
        this.event(actor, "Cập nhật danh mục", kind, valid.id, valid.name),
      );
    });
  }
  moveCatalog(kind: "types" | "amenities", id: string, direction: -1 | 1) {
    return this.transact((db) => {
      const actor = this.actor(db, "admin"),
        sorted = [...db[kind]].sort((a, b) => a.order - b.order),
        index = sorted.findIndex((c) => c.id === id),
        target = sorted[index + direction];
      if (!target)
        throw new DomainFailure(
          "boundary",
          "Danh mục đã ở đầu hoặc cuối danh sách.",
        );
      [sorted[index].order, target.order] = [target.order, sorted[index].order];
      db.audit.push(this.event(actor, "Sắp xếp danh mục", kind, id));
    });
  }
  createBooking(
    request: BookingRequest,
    contact: { name: string; email: string; phone: string },
    notes: string,
    acknowledged: boolean,
  ) {
    return this.transact((db) => {
      const actor = this.actor(db, "customer");
      if (!acknowledged)
        throw new DomainFailure("rules", "Vui lòng xác nhận quy định thuê.");
      const validContact = z
        .object({
          name: z.string().trim().min(2, "Điền tên liên hệ."),
          email: z.email("Email không hợp lệ."),
          phone: z
            .string()
            .regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ."),
        })
        .parse(contact);
      const availability = checkAvailability(db, request, this.clock());
      if (!availability.ok)
        throw new DomainFailure(availability.code, availability.message);
      const room = db.rooms.find((r) => r.id === request.roomId)!,
        studio = db.studios.find((s) => s.id === room.studioId)!,
        id = crypto.randomUUID(),
        code = `SH-${id.slice(0, 8).toUpperCase()}`;
      const booking: Booking = {
        id,
        code,
        customerId: actor.id,
        ownerId: studio.ownerId,
        studioId: studio.id,
        roomId: room.id,
        start: request.start,
        end: request.end,
        createdAt: this.clock(),
        holdUntil: this.clock() + 900_000,
        participants: request.participants,
        orderStatus: "pending",
        paymentStatus: "pending",
        depositPaid: 0,
        refundStatus: "none",
        notes,
        contact: validContact,
        snapshot: {
          roomName: room.name,
          studioName: studio.name,
          slug: room.slug,
          image: room.images[0],
          address: studio.address,
          rules: studio.rules,
          cleaningMinutes: room.cleaningMinutes,
          cancellationHours: studio.cancellationHours,
          price: availability.value,
        },
        timeline: [this.event(actor, "Đã tạo đơn thuê", "booking", code)],
      };
      db.bookings.push(bookingSchema.parse(booking));
      return booking;
    });
  }
  pay(code: string, outcome: "success" | "failed" | "cancelled") {
    return this.transact((db) => {
      const actor = this.actor(db, "customer"),
        booking = db.bookings.find(
          (b) => b.code === code && b.customerId === actor.id,
        );
      if (
        !booking ||
        displayStatus(booking, this.clock()) !== "awaiting-deposit"
      )
        throw new DomainFailure(
          "state",
          "Đơn không còn đủ điều kiện thanh toán.",
        );
      const room = db.rooms.find((r) => r.id === booking.roomId);
      if (
        outcome === "success" &&
        (!room || getEffectiveRoomStatus(db, room, this.clock()) !== "bookable")
      )
        throw new DomainFailure(
          "visibility",
          "Phòng đã ngừng nhận đặt chỗ. Đơn vẫn được giữ; bạn có thể hủy trong chi tiết đơn.",
        );
      const conflicts = db.bookings.some(
        (b) =>
          b.id !== booking.id &&
          b.roomId === booking.roomId &&
          occupies(b, this.clock()) &&
          overlaps(
            booking.start,
            booking.end + booking.snapshot.cleaningMinutes * 60000,
            b.start,
            b.end + b.snapshot.cleaningMinutes * 60000,
          ),
      );
      if (conflicts)
        throw new DomainFailure(
          "conflict",
          "Dữ liệu giữ chỗ đã thay đổi. Vui lòng kiểm tra lại đơn.",
        );
      if (outcome === "success") {
        const otherReservations = {
          ...db,
          bookings: db.bookings.filter((b) => b.id !== booking.id),
        };
        for (const item of booking.snapshot.price.equipment) {
          if (
            item.quantity >
            equipmentAvailable(
              otherReservations,
              item.id,
              booking.start,
              booking.end,
              this.clock(),
            )
          )
            throw new DomainFailure(
              "equipment",
              `${item.name} không còn đủ số lượng. Vui lòng liên hệ chủ Studio hoặc hủy đơn.`,
            );
        }
      }
      booking.paymentStatus = outcome;
      if (outcome === "success")
        booking.depositPaid = booking.snapshot.price.deposit;
      db.payments.push({
        id: crypto.randomUUID(),
        bookingId: booking.id,
        at: this.clock(),
        amount: booking.snapshot.price.deposit,
        status: outcome,
      });
      booking.timeline.push(
        this.event(
          actor,
          outcome === "success"
            ? "Đã đặt cọc mô phỏng"
            : outcome === "failed"
              ? "Thanh toán mô phỏng thất bại"
              : "Khách dừng thanh toán mô phỏng",
          "booking",
          booking.code,
        ),
      );
      return booking;
    });
  }
  transitionBooking(code: string, action: BookingAction, reason = "") {
    return this.transact((db) => {
      const actor = this.actor(db),
        booking = db.bookings.find((b) => b.code === code);
      if (!booking || !canTransition(booking, actor, action, this.clock()))
        throw new DomainFailure(
          "state",
          "Thao tác không còn hợp lệ hoặc bạn không có quyền với đơn này.",
        );
      if (
        (action === "reject" ||
          (action === "cancel" && actor.role !== "customer")) &&
        !reason.trim()
      )
        throw new DomainFailure("reason", "Vui lòng nhập lý do.");
      const previous = displayStatus(booking, this.clock());
      booking.orderStatus =
        action === "confirm"
          ? "confirmed"
          : action === "complete"
            ? "completed"
            : action === "reject"
              ? "rejected"
              : "cancelled";
      if (
        ["cancelled", "rejected"].includes(booking.orderStatus) &&
        booking.depositPaid > 0
      )
        booking.refundStatus = "pending-policy";
      const label =
        action === "confirm"
          ? "Chủ studio xác nhận"
          : action === "complete"
            ? "Chủ studio hoàn thành"
            : action === "reject"
              ? "Chủ studio từ chối"
              : actor.role === "admin"
                ? "Admin hủy đơn"
                : actor.role === "host"
                  ? "Chủ studio hủy đơn"
                  : "Khách hủy đơn";
      const event = this.event(
        actor,
        label,
        "booking",
        code,
        label,
        reason,
        previous,
        booking.orderStatus,
      );
      booking.timeline.push(event);
      db.audit.push(event);
      return booking;
    });
  }
  readDraft(slug: string) {
    return this.adapter?.readSession(`draft.${slug}`, draftSchema) ?? null;
  }
  saveDraft(slug: string, draft: BookingDraft) {
    this.adapter?.writeSession(`draft.${slug}`, draftSchema.parse(draft));
  }
  clearDraft(slug: string) {
    this.adapter?.removeSession(`draft.${slug}`);
  }
  preference<T>(key: string, schema: z.ZodType<T>) {
    return this.adapter?.readSession(`pref.${key}`, schema) ?? null;
  }
  setPreference(key: string, value: unknown) {
    this.adapter?.writeSession(`pref.${key}`, value);
  }
  reset() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true")
      throw new DomainFailure("disabled", "Chế độ demo chưa được bật.");
    if (!this.adapter) this.adapter = createBrowserAdapter();
    const db = createSeed(this.clock());
    this.adapter.write(db);
    this.adapter.removeSession("session");
    this.adapter.clearSessionPrefix("draft.");
    this.publish({
      db,
      userId: null,
      ready: true,
      error: null,
      notice: "Đã đặt lại dữ liệu demo.",
      now: this.clock(),
    });
  }
}
const serverSnapshot: StoreSnapshot = {
  db: null,
  userId: null,
  ready: false,
  error: null,
  notice: "",
  now: 0,
};
export const service = new StudioService();
export const message = (error: unknown) =>
  error instanceof z.ZodError
    ? error.issues
        .map((issue) => {
          if (/[\u00c0-\u1eff]/.test(issue.message)) return issue.message;
          const labels: Record<string, string> = {
            name: "Tên",
            phone: "Số điện thoại",
            email: "Email",
            description: "Mô tả",
            quantity: "Số lượng",
            price: "Giá thuê",
            minUnits: "Số đơn vị tối thiểu",
            maxUnits: "Số đơn vị tối đa",
            area: "Diện tích",
            capacity: "Sức chứa",
            depositPercent: "Tỷ lệ đặt cọc",
            cleaningMinutes: "Thời gian dọn phòng",
            sessionMinutes: "Thời lượng một buổi",
            studioName: "Tên Studio",
          };
          const field = labels[String(issue.path.at(-1))] ?? "Thông tin";
          if (issue.code === "too_small")
            return `${field} chưa đạt giá trị tối thiểu ${issue.minimum}.`;
          if (issue.code === "too_big")
            return `${field} vượt quá giới hạn ${issue.maximum}.`;
          return `${field} không hợp lệ. Vui lòng kiểm tra lại.`;
        })
        .join(" ")
    : error instanceof Error
      ? error.message
      : "Không thể thực hiện thao tác. Vui lòng thử lại.";
