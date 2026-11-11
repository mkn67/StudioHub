import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.UI_QA_URL || "http://127.0.0.1:3003";
const out = new URL("../.impeccable/room-booking-panel/", import.meta.url);
await mkdir(out, { recursive: true });
const pathFor = name => new URL(name, out).pathname.replace(/^\/(\w:)/, "$1");
const response = await fetch("http://127.0.0.1:8000/api/rooms/6");
if (!response.ok) throw Error("Public room HTTP unavailable");
const room = (await response.json()).data;
const publicRoom = { ...room, room_id: 7, rules: Array.from({ length: 6 }, (_, n) => `Dòng nội quy kiểm thử ${n + 1}: giữ nguyên nội dung API.`).join("\n"), studio: { ...room.studio, is_demo_profile: false, name: "Studio kiểm thử", address: "Địa chỉ kiểm thử", phone: "+84000000000", host_name: "PRIVATE_HOST_FIXTURE", host_email: "private@example.test", host_phone: "+84999999999" } };
const emptyRoom = { ...room, room_id: 8, power_specs: null, soundproof_level: "", rules: null, studio: { name: "Studio thiếu dữ liệu", address: "", district: "", city: "", phone: null } };
const pricing = { total_amount: 1265432, deposit_amount: 345678, room_amount: 1200000, equipment_amount: 65432 };
const checks = [], errors = [], quotes = [], creates = [];
const browser = await chromium.launch();
async function fixtures(context, authenticated = false) {
 await context.route("**/api/rest/**", async route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  const ok = data => route.fulfill({ json: { status: "success", data } });
  if (path.endsWith("/auth/profile")) return authenticated ? ok({ user_id: 101, role: "customer", full_name: "Synthetic QA", email: "qa@example.test", phone: "0000000000" }) : route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } });
  if (/\/rooms\/\d+\/calendar$/.test(path)) return ok({ busy_slots: [{ busy_start: "2026-11-20 09:00:00", busy_end: "2026-11-20 12:30:00" }] });
  if (/\/rooms\/\d+\/reviews$/.test(path)) return ok({ summary: { review_count: 0, average_rating: 0 }, items: [] });
  if (/\/rooms\/\d+$/.test(path)) return ok(path.endsWith("/7") ? publicRoom : path.endsWith("/8") ? emptyRoom : room);
  if (path.endsWith("/rooms")) return ok({ items: [], pagination: { total_items: 0, total_pages: 1 } });
  if (path.endsWith("/equipments")) return ok([{ equipment_id: 501, name: "Thiết bị kiểm thử", unit_price: 10000, pricing_unit: "hour", total_quantity: 2, status: "available" }]);
  if (path.endsWith("/bookings/check-availability")) {
    const body = request.postDataJSON(); quotes.push(body);
    return ok({ available: true, start_time: body.start_time, end_time: body.end_time, busy_end: body.end_time, pricing });
  }
  if (path.endsWith("/bookings") && request.method() === "POST") {
    creates.push(request.postDataJSON()); await new Promise(resolve => setTimeout(resolve, 600));
    return route.fulfill({ status: 422, json: { status: "error", message: "Không tạo đơn thật trong kiểm thử giao diện." } });
  }
  return ok([]);
 });
 await context.route("**/api/helpdesk/**", route => route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } }));
}
try {
 for (const reducedMotion of ["reduce", "no-preference"]) for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion }); await fixtures(context);
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/rooms/6");
  const panel = page.locator(".room-booking-entry"); await expect(panel).toContainText("Đặt lịch Studio");
  await expect(panel.locator(".room-package-list")).toHaveCount(0);
  expect(await panel.evaluate(n => n.scrollHeight <= n.clientHeight + 1)).toBe(true);
  expect(await panel.evaluate(n => n.getBoundingClientRect().height)).toBeLessThanOrEqual(400);
  await expect(page.locator("#room-rates .room-package-list li")).toHaveCount(room.rates.length);
  await expect(page.locator(".room-policy-panel")).toHaveCSS("background-color", "rgb(255, 247, 232)");
  await expect(page.locator(".room-rules-copy")).toHaveText(room.rules);
  if (room.studio.is_demo_profile) {
    await expect(page.locator(".room-studio-identity")).toContainText("Studio mẫu");
    await expect(page.locator(".room-studio-identity")).not.toContainText(room.studio.host_name);
    await expect(page.locator(".room-studio-identity img, .room-studio-identity a")).toHaveCount(0);
  }
  await expect(panel).toHaveCSS("position", width > 900 ? "sticky" : "static");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: pathFor(`detail-${width}-${reducedMotion}.png`), fullPage: true });
  const button = panel.getByRole("button", { name: "Kiểm tra giá & lịch trống", exact: true });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Đặt lịch Studio", exact: true });
  await expect(dialog).toBeVisible(); expect(new URL(page.url()).pathname).toBe("/rooms/6");
  await expect(dialog.locator(".booking-rate-card")).toHaveCount(room.rates.length);
  await expect(dialog.getByRole("heading", { name: "Thiết bị thuê thêm", exact: true })).toBeVisible();
  await dialog.getByText("Xem lịch đã bận", { exact: true }).click();
  await expect(dialog.locator(".room-modal-calendar li")).toHaveCount(1);
  await expect(dialog.getByRole("link", { name: "Đăng nhập để tiếp tục", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Tạo đơn giữ chỗ", exact: true })).toBeDisabled();
  const rect = await dialog.boundingBox(); expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(width);
  expect(rect.x).toBeGreaterThanOrEqual(10);
  expect(Math.abs(2 * rect.x + rect.width - width)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await dialog.screenshot({ path: pathFor(`modal-${width}-${reducedMotion}.png`) });
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(button).toBeFocused();
  checks.push(`${width}px ${reducedMotion}: compact non-scrolling panel, real main rates, policy/identity, centered real form, calendar, auth, Escape/focus`);
  await context.close();
 }
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" }); await fixtures(context, true);
 const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
 await page.goto(base + "/rooms/6");
 await page.getByRole("button", { name: "Kiểm tra giá & lịch trống", exact: true }).click();
 const dialog = page.getByRole("dialog", { name: "Đặt lịch Studio", exact: true });
 await dialog.locator(".booking-rate-card input").nth(1).check();
 await dialog.getByLabel("Số lượng Thiết bị kiểm thử", { exact: true }).fill("1");
 await expect.poll(() => quotes.at(-1)?.equipments).toEqual([{ equipment_id: 501, quantity: 1 }]);
 expect(quotes.at(-1).room_id).toBe(room.room_id); expect(quotes.at(-1).rate_id).toBe(room.rates[1].rate_id);
 await expect(dialog.locator(".booking-total")).toContainText("1.265.432");
 const submit = dialog.getByRole("button", { name: "Tạo đơn giữ chỗ", exact: true });
 await expect(submit).toBeEnabled(); await submit.click();
 expect(creates.length).toBe(0); // Native confirmation checkbox still blocks submission.
 await dialog.locator('input[type="checkbox"][required]').check();
 await submit.click();
 await expect(dialog.locator(".booking-flow form")).toBeVisible();
 await dialog.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
 await expect(dialog).toContainText("Không tạo đơn thật trong kiểm thử giao diện.");
 expect(creates.length).toBe(1); expect(creates[0].rate_id).toBe(room.rates[1].rate_id);
 await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
 checks.push("Original REST quote mapping, package/equipment selection, returned money, creation validation and duplicate guard with fixtures; zero real mutations");
 await page.goto(base + "/rooms/7");
 await expect(page.locator(".room-studio-identity")).toContainText("Địa chỉ kiểm thử");
 await expect(page.locator(".room-studio-contact")).toHaveAttribute("href", "tel:+84000000000");
 await expect(page.locator(".room-studio-identity")).not.toContainText("PRIVATE_HOST_FIXTURE");
 await expect(page.locator(".room-studio-identity")).not.toContainText("private@example.test");
 await page.locator("#room-policies summary").click(); await expect(page.locator(".room-rules-copy")).toHaveText(publicRoom.rules);
 checks.push("Long policy accordion keeps exact text; Studio contact only; personal Host identity omitted");
 await page.goto(base + "/rooms/8");
 await expect(page.locator(".room-spec-group")).toHaveCount(0);
 await expect(page.locator(".room-studio-identity")).toContainText("chưa cung cấp địa chỉ");
 await expect(page.locator(".room-studio-identity img")).toHaveCount(0);
 await page.goto(base + "/rooms/6/book"); await expect(page.locator(".booking-flow h1")).toHaveText(room.name);
 checks.push("Missing technical data hidden; no broken identity image; existing direct booking route retained");
 expect(errors).toEqual([]);
 await writeFile(new URL("results.json", out), JSON.stringify({ checks, errors, realRoomSource: "GET /api/rooms/6 local HTTP", authenticatedQuoteAndCreate: "deterministic intercepted fixtures; no real booking created" }, null, 2));
 console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} catch (e) { console.error(JSON.stringify({ checks, errors }, null, 2)); throw e; }
finally { await browser.close(); }
