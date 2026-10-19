import { describe, it, expect } from "vitest";
import {
  checkAvailability,
  equipmentAvailable,
  overlaps,
} from "@/domain/availability";
import { fixture, NOW, request } from "../fixtures/domain";
describe("half-open room availability", () => {
  it("accepts a genuinely free interval", () => {
    const db = fixture();
    expect(checkAvailability(db, request(db), NOW).ok).toBe(true);
  });
  it.each([
    [0, 120],
    [30, 150],
    [-30, 180],
    [30, 60],
  ])(
    "rejects identical, partial, containing and contained intervals (%s,%s)",
    (a, z) => {
      const db = fixture(),
        booking = db.bookings.find((b) => b.code === "SH-DEMO-004")!;
      expect(
        checkAvailability(
          db,
          request(db, {
            start: booking.start + a * 60000,
            end: booking.start + z * 60000,
          }),
          NOW,
        ),
      ).toMatchObject({ ok: false, code: "conflict" });
    },
  );
  it("rejects adjacency within a cleaning buffer and allows the exact boundary", () => {
    const db = fixture(),
      b = db.bookings.find((b) => b.code === "SH-DEMO-004")!;
    db.bookings = db.bookings.filter((x) => x.code !== "SH-DEMO-012");
    expect(
      checkAvailability(
        db,
        request(db, { start: b.end, end: b.end + 120 * 60000 }),
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "conflict" });
    expect(
      checkAvailability(
        db,
        request(db, { start: b.end + 30 * 60000, end: b.end + 150 * 60000 }),
        NOW,
      ).ok,
    ).toBe(true);
  });
  it("also includes the requested interval's trailing buffer", () => {
    const db = fixture(),
      b = db.bookings.find((b) => b.code === "SH-DEMO-004")!;
    db.rooms[0].openMinute = 0;
    expect(
      checkAvailability(
        db,
        request(db, { start: b.start - 120 * 60000, end: b.start }),
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "conflict" });
  });
  it.each(["cancelled", "rejected", "expired"] as const)(
    "ignores %s reservations",
    (status) => {
      const db = fixture(),
        b = db.bookings[0];
      b.orderStatus = status;
      expect(
        checkAvailability(db, request(db, { start: b.start, end: b.end }), NOW)
          .ok,
      ).toBe(true);
    },
  );
  it("ignores expired unpaid holds, but not deposited requests", () => {
    const db = fixture(),
      b = db.bookings[0];
    b.holdUntil = NOW;
    expect(
      checkAvailability(db, request(db, { start: b.start, end: b.end }), NOW)
        .ok,
    ).toBe(true);
    b.paymentStatus = "success";
    expect(
      checkAvailability(db, request(db, { start: b.start, end: b.end }), NOW)
        .ok,
    ).toBe(false);
  });
  it("allows continuous multi-day rentals only in overnight rooms", () => {
    const db = fixture(),
      r = request(db);
    expect(
      checkAvailability(
        db,
        {
          ...r,
          roomId: "room-2",
          rateId: "rate-room-2-day",
          end: r.start + 2 * 86400000,
        },
        NOW,
      ).ok,
    ).toBe(true);
    expect(
      checkAvailability(db, { ...r, end: r.start + 2 * 86400000 }, NOW),
    ).toMatchObject({ ok: false, code: "hours" });
  });
  it("rejects past, capacity, increments, opening hours and invalid rates", () => {
    const db = fixture(),
      r = request(db);
    expect(checkAvailability(db, { ...r, start: NOW - 1 }, NOW)).toMatchObject({
      ok: false,
      code: "past",
    });
    expect(
      checkAvailability(db, { ...r, participants: 13 }, NOW),
    ).toMatchObject({ ok: false, code: "capacity" });
    expect(
      checkAvailability(db, { ...r, start: r.start + 15 * 60000 }, NOW),
    ).toMatchObject({ ok: false, code: "increment" });
    expect(
      checkAvailability(db, { ...r, start: r.start - 2 * 3600000 }, NOW),
    ).toMatchObject({ ok: false, code: "hours" });
    expect(
      checkAvailability(db, { ...r, rateId: "missing" }, NOW),
    ).toMatchObject({ ok: false, code: "rate" });
  });
  it("rejects closed operating days and full-day rates in day-only rooms", () => {
    const db = fixture(),
      r = request(db);
    db.rooms[0].operatingDays = [];
    expect(checkAvailability(db, r, NOW)).toMatchObject({
      ok: false,
      code: "hours",
    });
    db.rooms[0].operatingDays = [0, 1, 2, 3, 4, 5, 6];
    db.rates[0].unit = "day";
    expect(
      checkAvailability(db, { ...r, end: r.start + 86400000 }, NOW),
    ).toMatchObject({ ok: false, code: "overnight" });
  });
  it("uses half-open boundaries", () => {
    expect(overlaps(0, 10, 10, 20)).toBe(false);
    expect(overlaps(0, 11, 10, 20)).toBe(true);
  });
});
describe("equipment shared across rooms", () => {
  it("subtracts other rooms' concurrent reservations", () => {
    const db = fixture(),
      b = db.bookings[2];
    expect(equipmentAvailable(db, "equipment-1", b.start, b.end, NOW)).toBe(2);
    const r = request(db, {
      roomId: "room-2",
      rateId: "rate-room-2-hour",
      start: b.start,
      end: b.end,
      equipment: [{ id: "equipment-1", quantity: 3 }],
    });
    expect(checkAvailability(db, r, NOW)).toMatchObject({
      ok: false,
      code: "equipment",
    });
    expect(
      checkAvailability(
        db,
        { ...r, equipment: [{ id: "equipment-1", quantity: 2 }] },
        NOW,
      ).ok,
    ).toBe(true);
  });
  it("uses peak concurrency rather than summing disjoint reservations", () => {
    const db = fixture(),
      b = db.bookings[2];
    db.bookings.push({
      ...structuredClone(b),
      id: "extra",
      code: "EXTRA",
      roomId: "room-2",
      start: b.end,
      end: b.end + 120 * 60000,
    });
    expect(
      equipmentAvailable(db, "equipment-1", b.start, b.end + 120 * 60000, NOW),
    ).toBe(2);
  });
  it("rejects maintenance, unavailable stock and other studios' equipment", () => {
    const db = fixture(),
      r = request(db);
    expect(equipmentAvailable(db, "equipment-4", r.start, r.end, NOW)).toBe(0);
    expect(
      checkAvailability(
        db,
        { ...r, equipment: [{ id: "equipment-1", quantity: 4 }] },
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "equipment" });
    expect(
      checkAvailability(
        db,
        {
          ...r,
          roomId: "room-3",
          rateId: "rate-room-3-hour",
          equipment: [{ id: "equipment-1", quantity: 1 }],
        },
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "equipment" });
  });
});
