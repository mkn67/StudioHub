import { z } from "zod";

export const roleSchema = z.enum(["customer", "host", "admin"]);
export const approvalSchema = z.enum(["approved", "pending", "rejected"]);
export const unitSchema = z.enum([
  "hour",
  "session",
  "half-day",
  "day",
  "week",
  "month",
]);
const money = z.number().int().nonnegative();
const instant = z.number().int();
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.email(),
  phone: z.string(),
  role: roleSchema,
  approval: approvalSchema,
  locked: z.boolean(),
  lockReason: z.string(),
  avatar: z.string(),
  createdAt: instant,
  approvedAt: instant.nullable(),
  passwordHash: z.string(),
  salt: z.string(),
  demo: z.boolean(),
});
export const applicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  studioName: z.string(),
  description: z.string().max(500),
  submittedAt: instant,
  reason: z.string(),
  history: z.array(
    z.object({ at: instant, action: z.string(), reason: z.string() }),
  ),
});
export const studioSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string().min(2),
  city: z.string(),
  district: z.string(),
  address: z.string(),
  phone: z.string(),
  description: z.string(),
  adminHidden: z.boolean(),
  adminReason: z.string(),
  stepMinutes: z.number().int().min(5).max(120),
  sessionMinutes: z.number().int().min(60).max(720),
  depositPercent: z.number().int().min(1).max(100),
  cancellationHours: z.number().int().min(0),
  rules: z.string(),
});
export const roomSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  slug: z.string(),
  code: z.string(),
  name: z.string().min(2),
  description: z.string(),
  area: z.number().positive(),
  capacity: z.number().int().positive(),
  typeIds: z.array(z.string()),
  amenityIds: z.array(z.string()),
  images: z.array(z.string()),
  status: z.enum(["active", "paused", "hidden"]),
  adminHidden: z.boolean(),
  adminReason: z.string(),
  openMinute: z.number().int().min(0).max(1439),
  closeMinute: z.number().int().min(1).max(1440),
  operatingDays: z.array(z.number().int().min(0).max(6)),
  overnight: z.boolean(),
  cleaningMinutes: z.number().int().min(0).max(180),
});
export const catalogSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  slug: z.string(),
  hidden: z.boolean(),
  order: z.number().int(),
  image: z.string(),
});
export const equipmentSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  name: z.string().min(2),
  category: z.enum(["equipment", "furniture"]),
  quantity: z.number().int().min(0),
  price: money.positive(),
  unit: z.enum(["hour", "session", "day"]),
  status: z.enum(["available", "maintenance", "hidden"]),
  image: z.string(),
});
export const rateSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  name: z.string(),
  unit: unitSchema,
  price: money.positive(),
  effectiveFrom: instant,
  effectiveTo: instant.nullable(),
  minUnits: z.number().positive(),
  maxUnits: z.number().positive(),
  active: z.boolean(),
});
export const priceSchema = z.object({
  minutes: z.number().int().positive(),
  units: z.number().positive(),
  rateId: z.string(),
  rateName: z.string(),
  unit: unitSchema,
  unitPrice: money,
  roomAmount: money,
  equipment: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      unit: unitSchema,
      unitPrice: money,
      units: z.number().positive(),
      amount: money,
    }),
  ),
  equipmentTotal: money,
  total: money,
  depositPercent: z.number().int(),
  deposit: money,
  remaining: money,
});
export const eventSchema = z.object({
  id: z.string(),
  at: instant,
  actorId: z.string(),
  actorName: z.string(),
  role: z.union([roleSchema, z.literal("system")]),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  summary: z.string(),
  reason: z.string(),
  previous: z.string(),
  next: z.string(),
});
export const bookingSchema = z.object({
  id: z.string(),
  code: z.string(),
  customerId: z.string(),
  ownerId: z.string(),
  studioId: z.string(),
  roomId: z.string(),
  start: instant,
  end: instant,
  createdAt: instant,
  holdUntil: instant,
  participants: z.number().int().positive(),
  orderStatus: z.enum([
    "pending",
    "confirmed",
    "completed",
    "rejected",
    "cancelled",
    "expired",
  ]),
  paymentStatus: z.enum(["pending", "success", "failed", "cancelled"]),
  depositPaid: money,
  refundStatus: z.enum(["none", "pending-policy"]),
  notes: z.string(),
  contact: z.object({ name: z.string(), email: z.email(), phone: z.string() }),
  snapshot: z.object({
    roomName: z.string(),
    studioName: z.string(),
    slug: z.string(),
    image: z.string(),
    address: z.string(),
    rules: z.string(),
    cleaningMinutes: z.number().int(),
    cancellationHours: z.number().int(),
    price: priceSchema,
  }),
  timeline: z.array(eventSchema),
});
export const paymentSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  at: instant,
  amount: money,
  status: z.enum(["success", "failed", "cancelled"]),
});
export const databaseSchema = z
  .object({
    schemaVersion: z.literal(2),
    revision: z.string(),
    initializedAt: instant,
    users: z.array(userSchema),
    applications: z.array(applicationSchema),
    studios: z.array(studioSchema),
    rooms: z.array(roomSchema),
    types: z.array(catalogSchema),
    amenities: z.array(catalogSchema),
    equipment: z.array(equipmentSchema),
    rates: z.array(rateSchema),
    bookings: z.array(bookingSchema),
    payments: z.array(paymentSchema),
    audit: z.array(eventSchema),
  })
  .superRefine((db, ctx) => {
    const collections = [
      db.users,
      db.applications,
      db.studios,
      db.rooms,
      db.types,
      db.amenities,
      db.equipment,
      db.rates,
      db.bookings,
      db.payments,
      db.audit,
    ];
    for (const collection of collections)
      if (new Set(collection.map((x) => x.id)).size !== collection.length)
        ctx.addIssue({ code: "custom", message: "Duplicate identifiers" });
    if (
      new Set(db.users.map((u) => u.email.toLowerCase())).size !==
      db.users.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate emails" });
    const ids = (items: { id: string }[]) => new Set(items.map((x) => x.id));
    const users = ids(db.users),
      studios = ids(db.studios),
      rooms = ids(db.rooms),
      bookings = ids(db.bookings);
    if (
      db.studios.some((x) => !users.has(x.ownerId)) ||
      db.rooms.some((x) => !studios.has(x.studioId)) ||
      db.equipment.some((x) => !studios.has(x.studioId)) ||
      db.rates.some((x) => !rooms.has(x.roomId)) ||
      db.bookings.some(
        (x) =>
          !users.has(x.customerId) ||
          !users.has(x.ownerId) ||
          !rooms.has(x.roomId) ||
          !studios.has(x.studioId),
      ) ||
      db.payments.some((x) => !bookings.has(x.bookingId))
    )
      ctx.addIssue({ code: "custom", message: "Broken references" });
  });
export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type Studio = z.infer<typeof studioSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type Rate = z.infer<typeof rateSchema>;
export type RentalUnit = z.infer<typeof unitSchema>;
export type Price = z.infer<typeof priceSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type DomainEvent = z.infer<typeof eventSchema>;
export type Database = z.infer<typeof databaseSchema>;
export type Selection = { id: string; quantity: number };
export type BookingRequest = {
  roomId: string;
  rateId: string;
  start: number;
  end: number;
  participants: number;
  equipment: Selection[];
};
export type BookingDraft = BookingRequest & {
  step: number;
  notes: string;
  contact: { name: string; email: string; phone: string };
  acknowledged: boolean;
};
export type DisplayStatus =
  | "awaiting-deposit"
  | "pending-confirmation"
  | "confirmed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired";
export type Result<T> =
  { ok: true; value: T } | { ok: false; code: string; message: string };
