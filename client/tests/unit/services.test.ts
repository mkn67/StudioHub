import { beforeEach, describe, it, expect, vi } from "vitest";
import { StudioService, message } from "@/services/service";
import { z } from "zod";
import { BrowserAdapter, MemoryStorage } from "@/services/storage/adapter";
import { checkAvailability } from "@/domain/availability";
import { NOW, request, serviceFixture } from "../fixtures/domain";
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true"));
const contact = {
  name: "Nguyễn Minh Anh",
  email: "khach@studiohub.demo",
  phone: "0901234567",
};
describe("one shared service across all roles", () => {
  it("revalidates inventory before success without charging an unavailable reservation", async () => {
    const { service, adapter } = serviceFixture();
    await service.login("khach@studiohub.demo", "StudioHub123");
    const booking = service.createBooking(
      request(service.getSnapshot().db!, {
        equipment: [{ id: "equipment-1", quantity: 1 }],
      }),
      contact,
      "",
      true,
    );
    const changed = adapter.read()!;
    changed.equipment[0].status = "maintenance";
    adapter.write(changed);
    expect(() => service.pay(booking.code, "success")).toThrow("không còn đủ");
    expect(
      adapter.read()!.bookings.find((b) => b.id === booking.id)?.paymentStatus,
    ).toBe("pending");
    expect(
      adapter.read()!.payments.filter((p) => p.bookingId === booking.id),
    ).toHaveLength(0);
  });
  it("translates schema errors for Vietnamese forms", () => {
    const result = z
      .object({ name: z.string().min(2) })
      .safeParse({ name: "" });
    if (!result.success)
      expect(message(result.error)).toBe("Tên chưa đạt giá trị tối thiểu 2.");
  });
  it("reset clears booking drafts without touching unrelated session data", () => {
    const { service, session } = serviceFixture();
    service.saveDraft("phong-nang", {
      ...request(service.getSnapshot().db!),
      step: 2,
      notes: "",
      contact,
      acknowledged: false,
    });
    session.setItem("unrelated.draft", "keep");
    expect(service.readDraft("phong-nang")).not.toBeNull();
    service.reset();
    expect(service.readDraft("phong-nang")).toBeNull();
    expect(session.getItem("unrelated.draft")).toBe("keep");
  });
  it("creates, pays, confirms, synchronizes and cancels the same booking", async () => {
    const { service, adapter } = serviceFixture();
    await service.login("khach@studiohub.demo", "StudioHub123");
    const booking = service.createBooking(
      request(service.getSnapshot().db!),
      contact,
      "",
      true,
    );
    const code = booking.code;
    service.pay(code, "success");
    expect(
      service.getSnapshot().db!.bookings.find((b) => b.code === code)
        ?.orderStatus,
    ).toBe("pending");
    const host = new StudioService(() => NOW);
    host.initialize(
      new BrowserAdapter(
        adapter.persistent,
        new MemoryStorage(),
        adapter.namespace,
      ),
    );
    await host.login("chu@studiohub.demo", "StudioHub123");
    host.transitionBooking(code, "confirm");
    service.refresh();
    expect(
      service.getSnapshot().db!.bookings.find((b) => b.code === code)
        ?.orderStatus,
    ).toBe("confirmed");
    service.transitionBooking(code, "cancel");
    expect(
      checkAvailability(
        service.getSnapshot().db!,
        request(service.getSnapshot().db!),
        NOW,
      ).ok,
    ).toBe(true);
    expect(
      service.getSnapshot().db!.bookings.find((b) => b.code === code)
        ?.refundStatus,
    ).toBe("pending-policy");
  });
  it("retries failed payments without creating new orders and rejects duplicate success", async () => {
    const { service } = serviceFixture();
    await service.login("khach@studiohub.demo", "StudioHub123");
    const b = service.createBooking(
        request(service.getSnapshot().db!),
        contact,
        "",
        true,
      ),
      count = service.getSnapshot().db!.bookings.length;
    service.pay(b.code, "failed");
    service.pay(b.code, "cancelled");
    service.pay(b.code, "success");
    expect(service.getSnapshot().db!.bookings.length).toBe(count);
    expect(
      service.getSnapshot().db!.payments.filter((p) => p.bookingId === b.id),
    ).toHaveLength(3);
    expect(() => service.pay(b.code, "success")).toThrow("không còn");
  });
  it("rejects conflicting creation and preserves price/contact snapshots after edits", async () => {
    const { service } = serviceFixture();
    await service.login("khach@studiohub.demo", "StudioHub123");
    const r = request(service.getSnapshot().db!),
      b = service.createBooking(r, contact, "", true);
    expect(() => service.createBooking(r, contact, "", true)).toThrow("giữ");
    service.updateProfile({ ...contact, name: "Tên mới", avatar: "" });
    await service.login("chu@studiohub.demo", "StudioHub123");
    const rate = service
      .getSnapshot()
      .db!.rates.find((r) => r.id === b.snapshot.price.rateId)!;
    service.saveRate({ ...rate, price: 900000 });
    const saved = service
      .getSnapshot()
      .db!.bookings.find((x) => x.id === b.id)!;
    expect(saved.snapshot.price.total).toBe(500000);
    expect(saved.contact.name).toBe(contact.name);
  });
  it("expires unpaid holds deliberately without completing confirmed bookings", async () => {
    let now = NOW;
    const adapter = new BrowserAdapter(
        new MemoryStorage(),
        new MemoryStorage(),
      ),
      service = new StudioService(() => now);
    service.initialize(adapter);
    await service.login("khach@studiohub.demo", "StudioHub123");
    const b = service.createBooking(
      request(service.getSnapshot().db!),
      contact,
      "",
      true,
    );
    now += 900001;
    service.tick();
    const saved = service
      .getSnapshot()
      .db!.bookings.find((x) => x.id === b.id)!;
    expect(saved.orderStatus).toBe("expired");
    expect(saved.timeline.at(-1)?.action).toBe("Hết hạn giữ chỗ");
    expect(() => service.pay(b.code, "success")).toThrow();
    expect(service.getSnapshot().db!.bookings[4].orderStatus).toBe("confirmed");
  });
  it("approves a host without automatically creating a studio", async () => {
    const { service } = serviceFixture();
    await service.login("admin@studiohub.demo", "StudioHub123");
    const studios = service.getSnapshot().db!.studios.length;
    service.approveHost("host-pending", true);
    expect(
      service.getSnapshot().db!.users.find((u) => u.id === "host-pending")
        ?.approval,
    ).toBe("approved");
    expect(service.getSnapshot().db!.studios).toHaveLength(studios);
    expect(service.getSnapshot().db!.audit.at(-1)?.action).toBe(
      "Duyệt chủ studio",
    );
  });
  it("requires rejection/lock reasons and preserves approval when unlocking", async () => {
    const { service } = serviceFixture();
    await service.login("admin@studiohub.demo", "StudioHub123");
    expect(() => service.approveHost("host-pending", false)).toThrow("lý do");
    expect(() => service.setLocked("host-pending", true)).toThrow("lý do");
    service.setLocked("host-pending", true, "Kiểm tra demo");
    service.setLocked("host-pending", false);
    expect(
      service.getSnapshot().db!.users.find((u) => u.id === "host-pending")
        ?.approval,
    ).toBe("pending");
    expect(() => service.setLocked("admin-1", true, "Lý do")).toThrow();
  });
  it("hides public resources while retaining existing booking details", async () => {
    const { service } = serviceFixture();
    await service.login("admin@studiohub.demo", "StudioHub123");
    const count = service.getSnapshot().db!.bookings.length;
    service.setVisibility("studio", "studio-1", true, "Kiểm tra");
    expect(
      checkAvailability(
        service.getSnapshot().db!,
        request(service.getSnapshot().db!),
        NOW,
      ),
    ).toMatchObject({ ok: false, code: "visibility" });
    expect(service.getSnapshot().db!.bookings).toHaveLength(count);
  });
  it("checks inventory commitments and overlapping rates", async () => {
    const { service } = serviceFixture();
    await service.login("chu@studiohub.demo", "StudioHub123");
    const db = service.getSnapshot().db!;
    expect(() =>
      service.saveEquipment({ ...db.equipment[0], quantity: 0 }),
    ).toThrow("giữ");
    expect(() =>
      service.saveEquipment({ ...db.equipment[0], status: "maintenance" }),
    ).toThrow("giữ");
    expect(() => service.saveRate({ ...db.rates[0], id: "new-rate" })).toThrow(
      "trùng",
    );
  });
  it("normalizes catalog duplicates and retains stable slugs", async () => {
    const { service } = serviceFixture();
    await service.login("admin@studiohub.demo", "StudioHub123");
    const db = service.getSnapshot().db!,
      original = db.types[0];
    expect(() =>
      service.saveCatalog("types", {
        ...original,
        id: "new-type",
        name: "CHUP ANH",
      }),
    ).toThrow("tồn tại");
    service.saveCatalog("types", { ...original, name: "Chân dung" });
    expect(service.getSnapshot().db!.types[0].slug).toBe(original.slug);
  });
  it("hashes new passwords with salt, authenticates them, and enforces unique emails", async () => {
    const { service } = serviceFixture();
    const user = await service.register({
      name: "Tài khoản mới",
      email: "new@example.test",
      phone: "0909876543",
      password: "sample123",
      role: "customer",
    });
    expect(user.passwordHash).not.toContain("sample123");
    expect(user.salt).toHaveLength(32);
    service.logout();
    expect((await service.login(user.email, "sample123")).id).toBe(user.id);
    await expect(service.login(user.email, "wrongpass")).rejects.toThrow(
      "không đúng",
    );
    await expect(
      service.register({
        name: "Trùng",
        email: user.email,
        phone: "0909876543",
        password: "sample123",
        role: "host",
        studioName: "Thử nghiệm",
        description: "Mô tả thử nghiệm",
      }),
    ).rejects.toThrow("đã được");
  });
  it("supports rejected-host resubmission and a coherent confirmed reset", async () => {
    const { service } = serviceFixture();
    await service.login("tuchoi@studiohub.demo", "StudioHub123");
    service.resubmitApplication({
      name: "Đỗ Gia Huy",
      phone: "0901234567",
      studioName: "Huy Creative",
      description: "Thông tin đầy đủ mới cho Studio demo.",
    });
    expect(
      service.getSnapshot().db!.users.find((u) => u.id === "host-rejected")
        ?.approval,
    ).toBe("pending");
    service.reset();
    expect(service.getSnapshot().userId).toBeNull();
    expect(
      service.getSnapshot().db!.users.find((u) => u.id === "host-rejected")
        ?.approval,
    ).toBe("rejected");
  });
  it("rechecks locked accounts and authorization at mutation time", async () => {
    const { service } = serviceFixture();
    await service.login("bikhoa@studiohub.demo", "StudioHub123");
    expect(() =>
      service.createBooking(
        request(service.getSnapshot().db!),
        contact,
        "",
        true,
      ),
    ).toThrow("không được");
    await service.login("admin@studiohub.demo", "StudioHub123");
    expect(() => service.transitionBooking("SH-DEMO-003", "confirm")).toThrow(
      "không còn",
    );
    expect(() =>
      service.saveStudio(service.getSnapshot().db!.studios[0]),
    ).toThrow("quyền");
  });
});
