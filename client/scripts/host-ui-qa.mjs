import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const base = process.env.QA_BASE_URL || "http://localhost:3000";
const api = process.env.QA_API_URL || "http://localhost:8000";
const output = new URL("../test-results/host-ui/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const contexts = [], errors = [];
async function login(email) {
  const response = await fetch(`${api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: process.env.QA_PASSWORD || "password123" }) });
  const payload = await response.json(); assert.equal(response.status, 200, `Login ${email}`); return payload.data;
}
async function context(token, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" }); contexts.push(context);
  if (token) await context.addInitScript(value => { if (location.origin !== "null") sessionStorage.setItem("studiohub.api-token", value); }, token);
  await context.route("https://images.unsplash.com/**", route => route.abort());
  return context;
}
async function pageFor(context) { const page = await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror", error => errors.push(error.message)); return page; }
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: await page.getByRole("dialog").count() === 0, animations: "disabled" });
}
async function goto(page, path) { await page.goto(`${base}${path}`, { waitUntil: "networkidle" }); }
async function noOverflow(page, label) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow: ${label}`); }
async function json(path, token) { const response = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}` } }); assert.equal(response.status, 200, path); return (await response.json()).data; }

try {
  const auth = await login(process.env.QA_HOST_EMAIL || "host1@studio.local");
  const live = await context(auth.token), page = await pageFor(live);
  let liveWrites = 0;
  live.on("request", request => { if (request.url().startsWith(api) && !["GET", "OPTIONS"].includes(request.method())) liveWrites++; });
  const routes = ["", "studios", "rooms", "equipments", "rates", "calendar", "bookings", "reports", "settings"];
  for (const width of (process.env.QA_VIEWPORTS ? process.env.QA_VIEWPORTS.split(",").map(Number) : [360, 390, 768, 1024, 1280, 1440, 1728])) {
    await page.goto("about:blank"); await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await goto(page, `/host${route ? `/${route}` : ""}`);
      await expect(page.locator(".host-content")).toBeVisible();
      assert.equal(await page.locator(".site-header").count(), 0);
      await expect(page.locator(".host-content .host-error")).toHaveCount(0);
      await noOverflow(page, `${route || "overview"} ${width}`);
      await screenshot(page, `${route || "overview"}-${width}`);
    }
    console.log(`PASS: all nine live Host screens at ${width}px, no public header, no page overflow`);
  }
  await goto(page, "/host/studios");
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).first().click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Tên Studio", { exact: true })).toHaveValue(/.+/);
  assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
  await dialog.getByLabel("Tên Studio", { exact: true }).fill("Nội dung chưa lưu QA");
  await page.keyboard.press("Escape"); await expect(dialog.getByText("Bỏ các thay đổi chưa lưu?", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa", exact: true }).click();
  const saveButton = dialog.getByRole("button", { name: "Lưu thay đổi", exact: true });
  await saveButton.focus(); await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.closest("dialog") !== null), true);
  await screenshot(page, "studio-edit-modal");
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await dialog.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Chỉnh sửa");
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
  await page.getByRole("button", { name: "Thu gọn điều hướng", exact: true }).click();
  await expect(page.locator(".host-workspace")).toHaveClass(/host-is-collapsed/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở điều hướng Host", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Thiết bị", exact: true })).toBeVisible();
  await screenshot(page, "mobile-sidebar");
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mở điều hướng Host", exact: true })).toBeFocused();
  assert.equal(liveWrites, 0, "live UI inspection must not mutate the database");
  assert.ok(await page.evaluate(() => document.fonts.check('500 14px "Be Vietnam Pro"')));
  console.log("PASS: real edit initialization, dirty cancel/Escape guard, focus trapping/restoration, body scroll lock, collapse + mobile drawer, local font; no live writes");

  // Test fixtures are browser-only copies of existing API responses. No mutation
  // in this section is sent to PHP/MySQL. Booking shape follows integration-qa.mjs.
  const studios = structuredClone(await json("/api/studios/mine", auth.token));
  const studioId = studios[0].studio_id;
  const roomResponse = structuredClone(await json("/api/rooms?limit=50", auth.token));
  const room = roomResponse.items.find(item => item.studio_id === studioId);
  const equipment = structuredClone(await json(`/api/equipments?studio_id=${studioId}`, auth.token));
  const categories = structuredClone(await json(`/api/equipment-categories?studio_id=${studioId}`, auth.token));
  const types = structuredClone(await json("/api/space-types", auth.token));
  const rates = structuredClone(await json(`/api/rooms/${room.room_id}/rates`, auth.token));
  const statistics = structuredClone(await json("/api/host/statistics", auth.token));
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  let booking = { booking_id: 41, booking_code: "BK-QA-0041", customer_name: "Khách kiểm thử", room_name: room.name, studio_name: studios[0].name, status: "pending", start_time: `${today} 09:00:00`, end_time: `${today} 11:00:00`, expires_at: `${today} 23:59:00`, total_amount: 600000, deposit_amount: 180000, room_amount: 600000, equipment_amount: 0, payments: [{ payment_id: 1, payment_type: "deposit", amount: 180000, status: "success" }] };
  let equipmentError = false, equipmentEmpty = false, saveError = false, equipmentLoading = false, releaseEquipment;
  const calls = [];
  const fixture = await context(auth.token);
  await fixture.route(`${api}/api/**`, async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
    const body = request.postData() && !request.headers()["content-type"]?.startsWith("multipart/") ? JSON.parse(request.postData()) : null;
    calls.push({ path, method, body, query: url.searchParams.toString() });
    let data;
    if (path === "/api/auth/profile") data = auth.user;
    else if (path === "/api/studios/mine") data = studios;
    else if (path === "/api/studios" && method === "POST") { data = { ...studios[0], ...body, studio_id: 800 }; studios.push(data); }
    else if (/^\/api\/studios\/\d+$/.test(path) && method === "PATCH") { Object.assign(studios.find(item => item.studio_id === Number(path.split("/").at(-1))), body); data = null; }
    else if (path === "/api/rooms" && method === "GET") data = roomResponse;
    else if (path === "/api/rooms" && method === "POST") { data = { ...room, ...body, room_id: 801 }; roomResponse.items.push(data); }
    else if (path === "/api/space-types") data = types;
    else if (/^\/api\/rooms\/\d+\/calendar$/.test(path)) data = { busy_slots: [{ busy_start: `${today} 09:15:00`, busy_end: `${today} 11:45:00` }] };
    else if (/^\/api\/rooms\/\d+\/images$/.test(path)) { assert.ok(request.headers()["content-type"].startsWith("multipart/form-data; boundary=")); data = { image_id: 803 }; }
    else if (/^\/api\/rooms\/\d+\/rates(?:\/\d+)?$/.test(path)) {
      if (method === "POST") { data = { ...body, rate_id: 802, maximum_units: null, unit_minutes: body.unit_minutes ?? 60 }; rates.push(data); }
      else if (method === "PATCH") { Object.assign(rates.find(item => item.rate_id === Number(path.split("/").at(-1))), body); data = null; }
      else data = rates;
    }
    else if (/^\/api\/rooms\/\d+$/.test(path)) {
      if (method === "PATCH") Object.assign(roomResponse.items.find(item => item.room_id === Number(path.split("/").at(-1))), body);
      data = roomResponse.items.find(item => item.room_id === Number(path.split("/").at(-1)));
    }
    else if (path === "/api/equipment-categories") { if (method === "POST") { data = { ...body, category_id: 804 }; categories.push(data); } else data = categories; }
    else if (path === "/api/equipments" || /^\/api\/equipments\/\d+$/.test(path)) {
      if (method === "GET") {
        if (equipmentLoading) await new Promise(resolve => { releaseEquipment = resolve; });
        if (equipmentError) return route.fulfill({ status: 503, json: { status: "error", message: "Không thể tải danh sách thiết bị." }, headers: { "Access-Control-Allow-Origin": base } });
        data = equipmentEmpty ? [] : equipment;
      } else {
        if (saveError) return route.fulfill({ status: 422, json: { status: "error", message: "Thông tin chưa hợp lệ.", errors: [{ field: "name", code: "invalid", message: "Kiểm tra tên thiết bị." }] }, headers: { "Access-Control-Allow-Origin": base } });
        if (method === "POST") { data = { ...body, equipment_id: 805, status: "active" }; equipment.push(data); }
        else { Object.assign(equipment.find(item => item.equipment_id === Number(path.split("/").at(-1))), body); data = null; }
      }
    }
    else if (path === "/api/bookings") { const items = !url.searchParams.get("status") || url.searchParams.get("status") === booking.status ? [booking] : []; data = { items, page: 1, total_pages: 1, total_items: items.length }; }
    else if (path === "/api/bookings/41") data = booking;
    else if (path === "/api/bookings/41/status") { assert.equal(method, "PATCH"); booking = { ...booking, status: body.status }; data = booking; }
    else if (path === "/api/host/statistics") data = { ...statistics, period: { from: url.searchParams.get("from") || statistics.period.from, to: url.searchParams.get("to") || statistics.period.to } };
    else throw new Error(`Unhandled fixture ${method} ${path}`);
    await route.fulfill({ status: 200, json: { status: "success", code: 200, data }, headers: { "Access-Control-Allow-Origin": base } });
  });
  const fp = await pageFor(fixture);
  const fd = fp.getByRole("dialog");
  async function save() { await fd.getByRole("button", { name: "Lưu thay đổi", exact: true }).click(); await expect(fd).toHaveCount(0); }
  await goto(fp, "/host/studios"); await fp.getByRole("button", { name: "Thêm Studio", exact: true }).first().click();
  for (const [label, value] of [["Tên Studio", "Studio QA"], ["Địa chỉ", "12 Nguyễn Huệ"], ["Quận / huyện", "Quận 1"], ["Tỉnh / thành phố", "TP.HCM"], ["Điện thoại", "0901234567"]]) await fd.getByLabel(label, { exact: true }).fill(value);
  await save(); await expect(fp.getByRole("heading", { name: "Studio QA", exact: true })).toBeVisible();
  assert.deepEqual(calls.find(call => call.path === "/api/studios" && call.method === "POST").body, { name: "Studio QA", address: "12 Nguyễn Huệ", district: "Quận 1", city: "TP.HCM", phone: "0901234567" });
  await fp.getByRole("button", { name: "Chỉnh sửa", exact: true }).first().click(); await save();
  assert.ok(calls.some(call => call.path === `/api/studios/${studioId}` && call.method === "PATCH"));
  console.log("PASS: Studio POST/PATCH contracts, save closes modal and refreshes fixture list");

  await goto(fp, "/host/rooms"); await fp.getByRole("button", { name: "Thêm phòng vật lý", exact: true }).first().click();
  await fd.getByLabel("Tên phòng", { exact: true }).fill("Phòng QA"); await fd.getByLabel("Diện tích", { exact: true }).fill("55"); await fd.getByLabel("Sức chứa", { exact: true }).fill("8"); await fd.getByLabel("Loại không gian", { exact: true }).selectOption(String(types[0].space_type_id)); await save();
  assert.deepEqual(calls.find(call => call.path === "/api/rooms" && call.method === "POST").body, { studio_id: studioId, name: "Phòng QA", area: 55, capacity: 8, space_type_ids: [types[0].space_type_id] });
  await fp.getByRole("button", { name: `Sửa ${room.name}`, exact: true }).click(); await expect(fd.getByLabel("Diện tích", { exact: true })).toHaveValue(String(room.area)); await save();
  assert.ok(calls.some(call => call.path === `/api/rooms/${room.room_id}` && call.method === "PATCH"));
  await fp.getByRole("button", { name: "Ảnh phòng", exact: true }).first().click();
  await fd.getByLabel("Ảnh phòng", { exact: true }).setInputFiles({ name: "qa.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNA0AAAAASUVORK5CYII=", "base64") });
  await fd.getByRole("button", { name: "Tải ảnh lên", exact: true }).click(); await expect(fd).toHaveCount(0);
  console.log("PASS: room POST/PATCH fields + numeric space_type_ids; multipart image upload preserved (browser fixture only)");

  await goto(fp, "/host/equipments");
  await fp.getByRole("button", { name: "Thêm nhóm", exact: true }).click(); await fd.getByLabel("Tên nhóm", { exact: true }).fill("Nhóm QA"); await save();
  await fp.getByRole("button", { name: "Thêm thiết bị", exact: true }).first().click();
  await fd.getByLabel("Nhóm", { exact: true }).selectOption(String(categories[0].category_id)); await fd.getByLabel("Tên thiết bị", { exact: true }).fill("Thiết bị QA"); await fd.getByLabel("Giá (VND)", { exact: true }).fill("50000"); await fd.getByLabel("Đơn vị", { exact: true }).selectOption("hour"); await fd.getByLabel("Tổng số lượng", { exact: true }).fill("2");
  saveError = true; await fd.getByRole("button", { name: "Lưu thay đổi", exact: true }).click(); await expect(fd.getByLabel("Tên thiết bị", { exact: true })).toHaveAttribute("aria-invalid", "true"); await screenshot(fp, "equipment-validation-error");
  saveError = false; await save(); await expect(fp.locator(".host-table-resource strong").filter({ hasText: /^Thiết bị QA$/ })).toBeVisible();
  const equipmentBody = calls.find(call => call.path === "/api/equipments" && call.method === "POST").body;
  // Existing select serialization sends category_id as a string; preserve it.
  assert.deepEqual(equipmentBody, { studio_id: studioId, category_id: String(categories[0].category_id), name: "Thiết bị QA", unit_price: 50000, pricing_unit: "hour", total_quantity: 2 });
  await fp.getByRole("button", { name: `Sửa ${equipment[0].name}`, exact: true }).click(); await expect(fd.getByLabel("Giá (VND)", { exact: true })).toHaveValue(String(equipment[0].unit_price)); await save();
  console.log("PASS: equipment/category POST + equipment PATCH, validation errors retain inputs and show field errors");

  await goto(fp, "/host/rates"); await fp.getByRole("button", { name: "Thêm bảng giá", exact: true }).first().click();
  await fd.getByLabel("Đơn vị", { exact: true }).selectOption("session"); await fd.getByLabel("Số phút (bắt buộc với buổi)", { exact: true }).fill("180"); await fd.getByLabel("Giá (VND)", { exact: true }).fill("950000"); await save();
  const rateBody = calls.find(call => call.path === `/api/rooms/${room.room_id}/rates` && call.method === "POST").body;
  assert.equal(rateBody.unit_minutes, 180); assert.equal(rateBody.unit_price, 950000); assert.equal(rateBody.minimum_units, 1); assert.equal(rateBody.rate_unit, "session");
  await fp.getByRole("button", { name: "Sửa giá giờ", exact: true }).click(); await save(); assert.ok(calls.some(call => call.method === "PATCH" && call.path.startsWith(`/api/rooms/${room.room_id}/rates/`)));
  await screenshot(fp, "pricing-fixture-table");
  console.log("PASS: pricing POST/PATCH keeps units, scope, price and duration");

  await goto(fp, "/host/calendar"); await fp.getByRole("button", { name: "Ngày", exact: true }).click();
  const block = fp.locator(".host-busy-block").first(); await expect(block).toBeVisible();
  assert.equal(await block.evaluate(el => parseFloat(el.style.top)), 444); assert.equal(await block.evaluate(el => parseFloat(el.style.height)), 120);
  await block.click(); await expect(fd.getByText(/09:15/)).toBeVisible(); await screenshot(fp, "calendar-interval-detail"); await fp.keyboard.press("Escape");
  await screenshot(fp, "calendar-populated-fixture");
  await goto(fp, "/host/bookings"); await expect(fp.getByRole("link", { name: "BK-QA-0041", exact: true })).toBeVisible(); await screenshot(fp, "bookings-populated-fixture");
  await fp.getByRole("button", { name: "Đã xác nhận", exact: true }).click(); await expect(fp.getByRole("heading", { name: "Chưa có đơn thuê phù hợp", exact: true })).toBeVisible();
  await fp.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click(); await fp.getByRole("link", { name: "BK-QA-0041", exact: true }).click();
  await fp.waitForURL("**/host/bookings/41");
  await expect(fp.locator(".host-booking-detail").getByRole("heading", { name: "Chi tiết đơn thuê", exact: true })).toBeVisible();
  await fp.locator(".host-booking-detail .actions").getByRole("button", { name: "Đã xác nhận", exact: true }).click();
  await expect.poll(() => calls.filter(call => call.path === "/api/bookings/41/status").length).toBe(1);
  await expect(fp.locator(".host-booking-detail > section > p").filter({ hasText: /^Đã xác nhận$/ })).toBeVisible();
  assert.deepEqual(calls.find(call => call.path === "/api/bookings/41/status").body, { status: "confirmed" });
  console.log("PASS: timetable exact minute geometry + interval detail; booking filters/detail preserve existing status PATCH");

  await goto(fp, "/host/reports"); await fp.getByRole("button", { name: "7 ngày", exact: true }).click();
  await expect(fp.locator('.host-segmented button[aria-pressed="true"]')).toHaveText("7 ngày");
  await expect.poll(() => calls.filter(call => call.path === "/api/host/statistics").at(-1).query).toContain("from=");
  await fp.getByRole("button", { name: "Tùy chỉnh", exact: true }).click();
  await fp.getByLabel("Từ ngày", { exact: true }).fill("2026-10-01"); await fp.getByLabel("Đến trước ngày", { exact: true }).fill("2026-11-01"); await fp.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(fp.locator(".host-period-label")).toContainText("01/10/2026");
  assert.equal(calls.filter(call => call.path === "/api/host/statistics").at(-1).query, "from=2026-10-01&to=2026-11-01");
  equipmentLoading = true; await fp.goto(`${base}/host/equipments`, { waitUntil: "domcontentloaded" }); await expect.poll(() => typeof releaseEquipment).toBe("function"); await expect(fp.locator(".host-panel .host-skeleton")).toBeVisible(); await screenshot(fp, "equipment-loading");
  equipmentLoading = false; equipmentError = true; releaseEquipment(); await expect(fp.locator(".host-error")).toBeVisible(); await screenshot(fp, "equipment-error");
  equipmentError = false; equipmentEmpty = true; await fp.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(fp.getByRole("heading", { name: "Chưa có thiết bị đang công khai", exact: true })).toBeVisible(); await screenshot(fp, "equipment-empty");
  console.log("PASS: report preset/custom API boundaries; skeleton, API error/retry and genuine empty state");

  const guest = await pageFor(await context()); await goto(guest, "/host"); await expect(guest.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible(); assert.equal(await guest.locator(".host-workspace").count(), 0);
  const customerAuth = await login("customer@studio.local"), customer = await pageFor(await context(customerAuth.token));
  await goto(customer, "/host"); await expect(customer.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible();
  await goto(customer, "/rooms"); await expect(customer.locator(".site-header")).toBeVisible(); await expect(customer.locator(".explore-layout")).toBeVisible();
  assert.match(await customer.evaluate(() => getComputedStyle(document.body).fontFamily), /Bricolage/);
  const adminAuth = await login("admin@studio.local"), admin = await pageFor(await context(adminAuth.token));
  await goto(admin, "/admin/users"); await expect(admin.locator(".site-header")).toBeVisible(); await expect(admin.locator(".host-workspace")).toHaveCount(0); await expect(admin.locator(".ops-nav")).toBeVisible();
  assert.match(await admin.evaluate(() => getComputedStyle(document.body).fontFamily), /Bricolage/);
  assert.deepEqual(errors, []);
  console.log("PASS: guest/customer Host gate preserved, Customer Explore and Admin shell remain separate, no uncaught browser errors");
  console.log("COMPLETE: screenshots in client/test-results/host-ui; all fixture writes intercepted before PHP/MySQL");
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
