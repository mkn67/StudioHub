import { describe, it, expect } from "vitest";
import {
  getEffectiveRoomStatus,
  resolveAccess,
  safeReturnUrl,
} from "@/domain/access";
import { canTransition, displayStatus } from "@/domain/booking";
import {
  statistics,
  utilization,
  requiresAttention,
} from "@/domain/statistics";
import {
  BrowserAdapter,
  MemoryStorage,
  migrate,
} from "@/services/storage/adapter";
import { databaseSchema } from "@/domain/schema";
import { fixture, NOW } from "../fixtures/domain";
describe("account and effective room access", () => {
  it("resolves loading, unauthenticated, role, pending, rejected and locked states", () => {
    const db = fixture();
    expect(resolveAccess(undefined, "/host")).toBe("loading");
    expect(resolveAccess(null, "/host")).toBe("unauthenticated");
    expect(resolveAccess(db.users[0], "/admin")).toBe("wrong-role");
    expect(resolveAccess(db.users[3], "/host")).toBe("pending-approval");
    expect(resolveAccess(db.users[4], "/host")).toBe("rejected");
    expect(resolveAccess(db.users[5], "/my-bookings")).toBe("locked");
    expect(resolveAccess(db.users[5], "/account/status")).toBe("allowed");
    expect(resolveAccess(null, "/booking/phong-nang")).toBe("allowed");
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil",
    "/login?returnTo=/login",
    "/register/host",
    "/%2f%2fevil",
    "/a%5cb",
  ])("rejects unsafe returns: %s", (url) =>
    expect(safeReturnUrl(url)).toBeNull(),
  );
  it("preserves a valid internal destination", () =>
    expect(safeReturnUrl("/booking/phong-nang?step=3")).toBe(
      "/booking/phong-nang?step=3",
    ));
  it("derives statuses consistently and keeps admin/owner visibility independent", () => {
    const db = fixture(),
      r = db.rooms[0];
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("bookable");
    r.status = "paused";
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("paused");
    r.status = "active";
    r.adminHidden = true;
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("hidden");
    r.adminHidden = false;
    db.studios[0].adminHidden = true;
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("hidden");
    db.studios[0].adminHidden = false;
    db.users[1].locked = true;
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("hidden");
    db.users[1].locked = false;
    r.images = [];
    expect(getEffectiveRoomStatus(db, r, NOW)).toBe("incomplete");
  });
});
describe("explicit lifecycle transitions", () => {
  it("separates deposit state and booking confirmation", () => {
    const db = fixture();
    expect(displayStatus(db.bookings[0], NOW)).toBe("awaiting-deposit");
    expect(displayStatus(db.bookings[2], NOW)).toBe("pending-confirmation");
    expect(canTransition(db.bookings[0], db.users[1], "confirm", NOW)).toBe(
      false,
    );
    expect(canTransition(db.bookings[2], db.users[1], "confirm", NOW)).toBe(
      true,
    );
  });
  it("never auto-completes, and admin cannot confirm or complete", () => {
    const db = fixture(),
      b = db.bookings[4];
    expect(displayStatus(b, NOW)).toBe("confirmed");
    expect(canTransition(b, db.users[1], "complete", NOW)).toBe(true);
    expect(canTransition(b, db.users[2], "complete", NOW)).toBe(false);
    expect(canTransition(db.bookings[2], db.users[2], "confirm", NOW)).toBe(
      false,
    );
  });
  it("enforces cancellation cutoffs and immutable terminal states", () => {
    const db = fixture(),
      b = db.bookings[3];
    expect(
      canTransition(b, db.users[0], "cancel", b.start - 24 * 3600000),
    ).toBe(true);
    expect(
      canTransition(b, db.users[0], "cancel", b.start - 23 * 3600000),
    ).toBe(false);
    expect(canTransition(b, db.users[1], "cancel", b.start)).toBe(false);
    expect(canTransition(db.bookings[5], db.users[2], "cancel", NOW)).toBe(
      false,
    );
    expect(canTransition(db.bookings[2], db.users[2], "cancel", NOW)).toBe(
      true,
    );
  });
});
describe("record-derived reporting", () => {
  it("uses saved completed totals and rental start dates", () => {
    const db = fixture(),
      stats = statistics(db.bookings, NOW - 10 * 86400000, NOW);
    expect(stats.completed).toBe(940000);
    expect(stats.confirmed).toBe(700000);
    expect(stats.count).toBe(3);
  });
  it("clips usage to reporting/opening windows and excludes cleaning buffer", () => {
    const db = fixture(),
      r = db.rooms[0],
      b = structuredClone(db.bookings[3]);
    b.start = NOW;
    b.end = NOW + 2 * 3600000;
    b.orderStatus = "confirmed";
    expect(utilization(r, [b], NOW, NOW + 14 * 3600000)).toBe(14.3);
    expect(utilization(r, [b], NOW + 3600000, NOW + 2 * 3600000)).toBe(100);
    r.operatingDays = [];
    expect(utilization(r, [b], NOW, NOW + 86400000)).toBeNull();
  });
  it("monitors hidden studios without turning unpaid holds into an admin queue", () => {
    const db = fixture();
    expect(requiresAttention(db, db.bookings[10], NOW)).toBe(true);
    db.studios[0].adminHidden = true;
    expect(requiresAttention(db, db.bookings[0], NOW)).toBe(false);
    expect(requiresAttention(db, db.bookings[2], NOW)).toBe(true);
  });
});
describe("versioned persistence", () => {
  it("validates coherent seeds, references, and migrates known versions without losing edits", () => {
    const db = fixture();
    expect(databaseSchema.safeParse(db).success).toBe(true);
    db.users[0].name = "Tên đã chỉnh sửa";
    expect(
      migrate({ ...db, schemaVersion: 1, payments: undefined }).users[0].name,
    ).toBe("Tên đã chỉnh sửa");
    expect(
      migrate({ ...db, schemaVersion: 1, payments: undefined }).payments,
    ).toEqual([]);
  });
  it("retains corrupt data until explicit reset", () => {
    const persistent = new MemoryStorage(),
      adapter = new BrowserAdapter(persistent, new MemoryStorage());
    persistent.setItem(adapter.dataKey, "broken-json");
    expect(() => adapter.read()).toThrow("không hợp lệ");
    expect(persistent.getItem(adapter.dataKey)).toBe("broken-json");
  });
  it("rejects unknown versions and broken references", () => {
    const db = fixture();
    expect(() => migrate({ ...db, schemaVersion: 999 })).toThrow();
    db.rooms[0].studioId = "missing";
    expect(databaseSchema.safeParse(db).success).toBe(false);
  });
  it("surfaces quota failures and safely validates session data", () => {
    const persistent = {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {},
      },
      adapter = new BrowserAdapter(persistent, new MemoryStorage());
    expect(() => adapter.write(fixture())).toThrow("Bộ nhớ");
  });
});
