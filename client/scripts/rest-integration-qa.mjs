import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

// Browser contract tests only. All API/remote requests are intercepted. No PHP,
// MySQL, mail, paid AI, real uploads or financial operations are contacted.
const base = "http://127.0.0.1:3102", output = new URL("../test-results/rest-integration/", import.meta.url);
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3102"], { cwd: new URL("../", import.meta.url), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let log = "", browser;
server.stdout.on("data", chunk => log += chunk); server.stderr.on("data", chunk => log += chunk);
const contexts = [], calls = [], errors = [], failures = [], checks = [];
const stats = { total_bookings: 3, total_revenue: 600000, occupancy_rate: 25, total_studios: 1, total_rooms: 2, total_customers: 1, period: { from: "2026-11-01", to: "2026-12-01" } };
const photo = { name: "image.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1kAAAAASUVORK5CYII=", "base64") };
async function makeContext(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "vi-VN" }); contexts.push(context);
  if (role) await context.addInitScript(() => sessionStorage.setItem("studiohub.api-token", "qa-token"));
  const user = { user_id: role === "host" ? 2 : role === "admin" ? 1 : 3, full_name: `QA ${role || "Guest"}`, email: `${role}@qa.test`, phone: "0901234567", role, status: "active", date_of_birth: "2000-02-29", address: "Địa chỉ QA", avatar_url: null };
  const state = {
    fail: "", malformed: "", denyDelete: true, unauthorized: false, user,
    studios: [{ studio_id: 10, name: "QA Studio", address: "QA Address", district: "Q1", city: "HCM", phone: "0901234567", status: "active" }],
    rooms: [{ room_id: 20, studio_id: 10, room_type_id: 30, name: "QA Room", area: "24.50", capacity: "4", status: "inactive", description: "QA", images: [] }],
    types: [{ room_type_id: 30, studio_id: 10, name: "QA Type", area: 25, capacity: 4, status: "active", amenities: [] }],
    equipment: [{ equipment_id: 40, studio_id: 10, category_id: 50, name: "QA Light", total_quantity: "3", unit_price: "100000", pricing_unit: "hour", status: "inactive", category_name: "QA Category", images: [] }],
    rates: [{ rate_id: 60, rate_unit: "session", unit_minutes: "180", unit_price: "300000", minimum_units: "1", maximum_units: null, status: "inactive", effective_from: "2026-01-01", effective_to: null }],
    categories: [{ category_id: 50, name: "QA Category" }], application: null,
    applications: [{ application_id: 70, studio_name: "QA Application", user_id: 3, applicant_name: "QA Customer", applicant_email: "customer@qa.test", address: "QA Address", description: "QA Description", status: "pending" }],
    legal: null, contracts: [{ contract_id: 80, studio_id: 10, contract_code: "QA-80", title: "QA Contract", status: "active", effective_from: "2026-01-01", effective_to: "2027-01-01", document_available: 1, document_name: "contract.pdf" }],
    prefs: { email_booking_updates: true, email_product_updates: false, sms_booking_updates: false, in_app_updates: true },
    identity: null, policy: { studio_id: 10, payment_minutes: 30, deposit_percent: 30, cancel_hours: 24, change_hours: 48, overtime_per_30m: 50000, open_hour: 8, close_hour: 22, refund_tiers: [{ hours: 48, percent: 100 }, { hours: 24, percent: 50 }] },
    refund: { case_id: 90, refund_id: 90, refund_kind: "booking", reference_code: "QA-BOOKING", amount: "100000", status: "pending", reason: "QA refund", actions: [] },
    bookings: [{ booking_id: 100, booking_code: "QA-100", room_name: "QA Public Room", studio_name: "QA Studio", status: "confirmed", start_time: "2030-01-02 09:00:00", end_time: "2030-01-02 12:00:00", expires_at: null, total_amount: 300000, deposit_amount: 90000, room_amount: 300000, equipment_amount: 0, payments: [{ payment_id: 1, payment_type: "full", amount: 300000, status: "success" }] }],
  };
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    if (path.startsWith("/uploads/")) return route.fulfill({ status: 200, contentType: "image/png", body: photo.buffer });
    if (!path.startsWith("/api/")) return url.origin === base ? route.continue() : route.abort("blockedbyclient");
    if (path.startsWith("/api/helpdesk")) return route.abort("blockedbyclient");
    const entry = { role: role || "guest", method, path, query: url.search, body: null }; calls.push(entry);
    const ok = data => { entry.httpStatus = 200; return route.fulfill({ status: 200, json: { status: "success", code: 200, message: "QA fixture", data } }); };
    const error = (status, message) => { entry.httpStatus = status; return route.fulfill({ status, json: { status: "error", code: status, message, errors: [] } }); };
    if (state.unauthorized) return error(401, "Phiên QA đã hết hạn");
    if (state.fail === path) return error(500, "QA backend error");
    if (state.malformed === path) return ok({ broken: true });
    let body = {}; if (request.headers()["content-type"]?.includes("application/json")) body = request.postDataJSON(); entry.body = body;
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      if (path.endsWith("register")) Object.assign(user, { full_name: body.full_name, phone: body.phone });
      return ok({ token: "qa-token", user: { user_id: user.user_id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role } });
    }
    if (path === "/api/auth/profile") { if (method === "PATCH") Object.assign(user, body); return ok(user); }
    if (path === "/api/auth/logout") return ok(null);
    if (path === "/api/rooms/200") return ok({ room_id: 200, studio_id: 10, name: "QA Public Room", area: 25, capacity: 4, status: "active", description: "QA room", thumbnail_url: null, studio: { name: "QA Studio", address: "QA Address", district: "Q1", city: "HCM" }, amenities: [{ amenity_id: 1, name: "QA Wi-Fi" }], images: [], rates: [{ rate_id: 66, rate_unit: "session", unit_minutes: 180, unit_price: 300000, minimum_units: 1, maximum_units: null }] });
    if (path === "/api/rooms/200/calendar") return ok({ busy_slots: [], from: "2026-11-05", to: "2026-12-05" });
    if (path === "/api/equipments" && method === "GET") return ok([]);
    if (path === "/api/bookings/check-availability") return ok({ available: true, start_time: body.start_time, end_time: body.end_time, busy_end: new Date(Date.parse(body.end_time.replace(" ", "T") + "+07:00") + (30 + 7 * 60) * 60000).toISOString().slice(0, 19).replace("T", " "), pricing: { total_amount: 300000, deposit_amount: 90000, room_amount: 300000, equipment_amount: 0 } });
    if (path === "/api/bookings" && method === "POST") { const item = { ...state.bookings[0], ...body, booking_id: 101, booking_code: "QA-101", status: "pending", expires_at: "2030-01-02 08:00:00", payments: [] }; state.bookings.push(item); return ok(item); }
    if (/^\/api\/bookings\/\d+$/.test(path)) return ok(state.bookings.find(b => b.booking_id === Number(path.split("/").at(-1))));
    if (/^\/api\/bookings\/\d+\/(payments|cancel|status)$/.test(path)) {
      const item = state.bookings.find(b => b.booking_id === Number(path.split("/")[3]));
      if (path.endsWith("/status")) item.status = body.status;
      if (path.endsWith("/cancel")) item.status = "cancelled";
      if (path.endsWith("/payments")) { assert.equal(body.payment_method, "sandbox_qr"); item.payments.push({ payment_id: 2, payment_type: body.payment_type, amount: 90000, status: "success" }); }
      return ok(item);
    }
    if (path === "/api/auth/email-change-requests") return ok({ email: body.new_email, request_id: 1, expires_in_seconds: 900, development_code: "123456" });
    if (path === "/api/auth/email-change-confirmations") { user.email = body.new_email; return ok({ user_id: user.user_id, email: user.email }); }
    if (path === "/api/account/avatar") { assert.match(request.headers()["content-type"], /multipart\/form-data; boundary=/); user.avatar_url = "/uploads/avatars/qa.png"; return ok({ avatar_url: user.avatar_url }); }
    if (path === "/api/account/notification-preferences") { if (method === "PATCH") Object.assign(state.prefs, body); return ok(state.prefs); }
    if (path === "/api/account/identity-verification") { if (method === "POST") state.identity = { verification_id: 1, status: "pending", document_hint: "••••1234" }; return ok(state.identity); }
    if (path === "/api/studios/mine") return ok(state.studios);
    if (path === "/api/studios" && method === "POST") { state.studios.push({ ...body, studio_id: 11, status: "active" }); return ok(state.studios.at(-1)); }
    if (/^\/api\/studios\/\d+\/cover$/.test(path)) { state.studios[0].cover_url = "/uploads/studios/qa.png"; return ok({ studio_id: 10, cover_url: "/uploads/studios/qa.png" }); }
    if (/^\/api\/studios\/\d+$/.test(path) && method === "PATCH") { Object.assign(state.studios.find(s => s.studio_id === Number(path.split("/").at(-1))), body); return ok(state.studios[0]); }
    if (path === "/api/host/rooms") return ok(state.rooms);
    if (/^\/api\/host\/rooms\/\d+$/.test(path)) return ok(state.rooms.find(r => r.room_id === Number(path.split("/").at(-1))));
    if (path === "/api/host/room-types" && method === "GET") return ok(state.types);
    if (path === "/api/host/room-types" && method === "POST") { state.types.push({ ...body, room_type_id: 31 }); return ok(state.types.at(-1)); }
    if (/^\/api\/host\/room-types\/\d+$/.test(path)) { Object.assign(state.types.find(t => t.room_type_id === Number(path.split("/").at(-1))), body); return ok(state.types[0]); }
    if (path === "/api/rooms" && method === "POST") { state.rooms.push({ ...body, room_id: 21, status: "active", images: [] }); return ok(state.rooms.at(-1)); }
    if (/^\/api\/rooms\/\d+$/.test(path) && method === "PATCH") { Object.assign(state.rooms.find(r => r.room_id === Number(path.split("/").at(-1))), body); return ok(state.rooms[0]); }
    if (/^\/api\/rooms\/\d+\/images$/.test(path)) return ok({ image_id: 1, image_url: "/uploads/rooms/qa.png" });
    if (path === "/api/host/equipments") return ok(state.equipment);
    if (path === "/api/equipment-categories") { if (method === "POST") state.categories.push({ category_id: 51, name: body.name }); return ok(method === "GET" ? state.categories : state.categories.at(-1)); }
    if (path === "/api/equipments" && method === "POST") { state.equipment.push({ ...body, equipment_id: 41, category_name: "QA Category", status: "active", images: [] }); return ok(state.equipment.at(-1)); }
    if (/^\/api\/equipments\/\d+\/images$/.test(path)) return ok({ image_id: 1 });
    if (/^\/api\/equipments\/\d+$/.test(path)) {
      const id = Number(path.split("/").at(-1));
      if (method === "DELETE") { if (state.denyDelete) return error(409, "QA equipment_in_use"); state.equipment = state.equipment.filter(r => r.equipment_id !== id); return ok({ deleted: true }); }
      Object.assign(state.equipment.find(r => r.equipment_id === id), body); return ok({ equipment_id: id });
    }
    if (/^\/api\/host\/rooms\/\d+\/rates$/.test(path)) return ok(state.rates);
    if (/^\/api\/rooms\/\d+\/rates(?:\/\d+)?$/.test(path)) {
      if (method === "DELETE") { if (state.denyDelete) return error(409, "QA rate_in_use"); state.rates = state.rates.filter(r => r.rate_id !== Number(path.split("/").at(-1))); return ok({ deleted: true }); }
      if (method === "POST") { state.rates.push({ ...body, rate_id: 61, unit_minutes: body.unit_minutes || 60, maximum_units: body.maximum_units ?? null, status: "active", effective_to: body.effective_to ?? null }); return ok({ rate_id: 61 }); }
      Object.assign(state.rates.find(r => r.rate_id === Number(path.split("/").at(-1))), body); return ok({ rate_id: 60 });
    }
    if (path === "/api/host/calendar") return ok({ studio_id: 10, from: url.searchParams.get("from"), to: url.searchParams.get("to"), bookings: [{ booking_id: 100, booking_code: "QA-100", room_id: 20, room_name: "QA Room", status: "confirmed", start_time: "2026-11-05 09:00:00", end_time: "2026-11-05 11:00:00", busy_start: "2026-11-05 09:00:00", busy_end: "2026-11-05 11:30:00" }] });
    if (path === "/api/host/policies") { if (method === "PATCH") Object.assign(state.policy, body); return ok(state.policy); }
    if (path === "/api/host/legal-profile") { if (method === "PATCH") state.legal = { ...body, status: "submitted" }; return ok(state.legal); }
    if (path === "/api/host/contracts") return ok(state.contracts);
    if (/^\/api\/host\/contracts\/\d+$/.test(path)) return ok(state.contracts[0]);
    if (path.endsWith("/document-access")) return ok({ contract_id: 80, access_url: `/api/host/contracts/80/documents/${"a".repeat(64)}`, expires_in_seconds: 300 });
    if (path.includes("/documents/")) { assert.equal(request.headers().authorization, "Bearer qa-token"); return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\nQA fixture" }); }
    if (path === "/api/host-applications/current") return ok(state.application);
    if (path === "/api/host-applications") { state.application = { ...body, application_id: 70, status: "pending" }; return ok(state.application); }
    if (path === "/api/admin/host-applications") return ok({ items: state.applications.filter(a => !url.searchParams.get("status") || a.status === url.searchParams.get("status")), pagination: { page: 1, limit: 12, total_items: 1, total_pages: 1 } });
    if (/^\/api\/admin\/host-applications\/\d+$/.test(path)) return ok(state.applications[0]);
    if (path.endsWith("/decision")) { state.applications[0].status = body.approved ? "approved" : "rejected"; return ok(state.applications[0]); }
    if (path === "/api/admin/roles") return ok([{ role_id: 2, role_name: "host", description: "Chủ Studio" }, { role_id: 3, role_name: "customer", description: "Khách hàng" }]);
    if (path === "/api/admin/users") return ok({ items: [{ user_id: 3, full_name: "QA Customer", email: "customer@qa.test", phone: "0901234567", role: "customer", status: "active" }], page: 1, total_items: 1, total_pages: 1 });
    if (/^\/api\/admin\/users\/\d+\/(role|status)$/.test(path)) return ok({ user_id: 3, ...body });
    if (/^\/api\/admin\/(studios|rooms|equipments)$/.test(path)) return ok({ items: state[path.split("/").at(-1) === "equipments" ? "equipment" : path.split("/").at(-1)], page: Number(url.searchParams.get("page") || 1), limit: 12 });
    if (/^\/api\/admin\/(studios|rooms|equipments)\/\d+$/.test(path)) { const kind = path.split("/")[3], id = Number(path.split("/").at(-1)), key = kind === "studios" ? "studio_id" : kind === "rooms" ? "room_id" : "equipment_id"; Object.assign(state[kind === "equipments" ? "equipment" : kind].find(r => r[key] === id), body); return ok({ [key]: id, updated: true }); }
    if (path === "/api/admin/audit-logs") return ok({ items: [{ log_id: 1, user_id: 1, actor_name: "QA Admin", action: "QA audit action", entity_type: "rooms", entity_id: 20, created_at: "2026-11-05 10:00:00" }], page: 1, limit: 25 });
    if (path === "/api/admin/refund-exceptions") return ok({ items: [state.refund], page: 1, limit: 25 });
    if (path === "/api/admin/refund-exceptions/90") return ok(state.refund);
    if (path === "/api/admin/refund-exceptions/90/actions") { assert.ok(["confirm_succeeded", "mark_failed"].includes(body.action)); state.refund.status = body.action === "confirm_succeeded" ? "success" : "failed"; return ok(state.refund); }
    if (/^\/api\/(host|admin)\/statistics$/.test(path)) return ok(stats);
    if (path === "/api/host/overview") return ok({ statistics: stats, upcoming_bookings: [] });
    if (/^\/api\/(host|admin)\/reports\/series$/.test(path)) return ok({ period: { from: url.searchParams.get("from") || "2026-11-01", to: url.searchParams.get("to") || "2026-12-01" }, series: [{ date: "2026-11-05", bookings: 3, revenue: 600000 }] });
    if (path === "/api/bookings") return ok({ items: state.bookings, page: 1, total_pages: 1, total_items: state.bookings.length });
    if (path === "/api/space-types") return ok([{ space_type_id: 1, name: "Photography" }]);
    if (path === "/api/amenities") return ok([]);
    if (path === "/api/rooms") return ok({ items: [], pagination: { page: 1, total_pages: 0, total_items: 0, limit: 12 } });
    failures.push(`${method} ${path}`); return error(501, `Unmocked ${method} ${path}`);
  });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", dialog => dialog.accept());
  return { page, state };
}
async function go(page, path) { await page.goto(base + path, { waitUntil: "networkidle" }); }
async function saveDialog(page) { await page.getByRole("dialog").getByRole("button", { name: "Lưu thay đổi", exact: true }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); }
async function extendedManagementChecks() {
  const extra = await makeContext("host"), p = extra.page;
  await go(p, "/host"); await expect(p.getByRole("heading", { name: "Tổng quan Studio", exact: true })).toBeVisible();
  await go(p, "/host/studios"); await p.getByRole("button", { name: "Chỉnh sửa", exact: true }).click(); await p.getByRole("dialog").getByLabel("Tên Studio", { exact: true }).fill("QA Studio Edited"); await saveDialog(p);
  await p.getByRole("button", { name: "Ảnh Studio", exact: true }).click(); await p.getByRole("dialog").getByLabel("Chọn ảnh", { exact: true }).setInputFiles(photo); await p.getByRole("dialog").getByRole("button", { name: "Tải ảnh lên", exact: true }).click(); await expect(p.getByRole("dialog")).toHaveCount(0); await expect(p.locator('img[alt="QA Studio Edited"]')).toHaveAttribute("src", /\/uploads\/studios\/qa\.png$/);
  await go(p, "/host/rooms"); await p.getByRole("button", { name: "Sửa loại phòng QA Type", exact: true }).click(); await p.getByRole("dialog").getByLabel("Tên loại phòng", { exact: true }).fill("QA Type Edited"); await saveDialog(p);
  await p.getByRole("button", { name: "Ảnh phòng", exact: true }).click(); await p.getByRole("dialog").getByLabel("Ảnh phòng", { exact: true }).setInputFiles(photo); await p.getByRole("dialog").getByRole("button", { name: "Tải ảnh lên", exact: true }).click(); await expect(p.getByRole("dialog")).toHaveCount(0);
  await go(p, "/host/equipments"); await p.getByRole("button", { name: "Thêm nhóm", exact: true }).click(); await p.getByRole("dialog").getByLabel("Tên nhóm", { exact: true }).fill("QA New Category"); await saveDialog(p);
  await p.getByRole("button", { name: "Thêm thiết bị", exact: true }).first().click(); let dialog = p.getByRole("dialog"); await dialog.getByLabel("Nhóm", { exact: true }).selectOption("50"); await dialog.getByLabel("Tên thiết bị", { exact: true }).fill("QA New Equipment"); await dialog.getByLabel("Giá (VND)", { exact: true }).fill("250000"); await dialog.getByLabel("Đơn vị", { exact: true }).selectOption("hour"); await dialog.getByLabel("Tổng số lượng", { exact: true }).fill("2"); await saveDialog(p);
  await p.getByRole("row").filter({ has: p.getByText("QA New Equipment", { exact: true }) }).getByRole("button", { name: "Ảnh thiết bị", exact: true }).click(); await p.getByRole("dialog").getByLabel("Chọn ảnh", { exact: true }).setInputFiles(photo); await p.getByRole("dialog").getByRole("button", { name: "Tải ảnh lên", exact: true }).click(); await expect(p.getByRole("dialog")).toHaveCount(0);
  await go(p, "/host/rates"); await p.getByRole("button", { name: "Sửa giá buổi", exact: true }).click(); await p.getByRole("dialog").getByLabel("Giá (VND)", { exact: true }).fill("350000"); await saveDialog(p);
  await p.getByRole("button", { name: "Thêm bảng giá", exact: true }).click(); dialog = p.getByRole("dialog"); await dialog.getByLabel("Đơn vị", { exact: true }).selectOption("hour"); await dialog.getByLabel("Giá (VND)", { exact: true }).fill("200000"); await saveDialog(p);
  assert.equal(extra.state.rates[0].unit_price, 350000);
  checks.push("additional host overview/studio edit+cover/type edit/room+equipment uploads/category+equipment create/rate create+edit");
}
async function authAndAdminChecks() {
  for (const role of ["customer", "host", "admin"]) {
    const fixture = await makeContext(role), p = fixture.page;
    await go(p, "/login"); await p.getByLabel("Email", { exact: true }).fill(`${role}@qa.test`); await p.getByLabel("Mật khẩu", { exact: true }).fill("qa-password"); await p.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(p).toHaveURL(new RegExp(role === "customer" ? "/my-bookings$" : `/${role}$`));
    if (role === "customer") { await go(p, "/profile"); await expect(p.getByLabel("Ngày sinh", { exact: true })).toHaveValue("2000-02-29"); }
    assert.ok(calls.some(c => c.role === role && c.path === "/api/auth/login" && c.method === "POST"));
  }
  const registered = await makeContext("customer"), r = registered.page;
  await go(r, "/register"); await r.getByLabel("Họ tên", { exact: true }).fill("QA Registered"); await r.getByLabel("Email", { exact: true }).fill("registered@qa.test"); await r.getByLabel("Mật khẩu", { exact: true }).fill("qa-password"); await r.getByRole("button", { name: "Tạo tài khoản", exact: true }).click(); await expect(r).toHaveURL(/\/my-bookings$/);
  const extra = await makeContext("admin"), a = extra.page;
  await go(a, "/admin/studios"); await a.getByRole("button", { name: "Chỉnh sửa QA Studio", exact: true }).click(); await a.getByRole("dialog").getByLabel("Tên Studio", { exact: true }).fill("QA Admin Studio"); await saveDialog(a); assert.equal(extra.state.studios[0].name, "QA Admin Studio");
  await a.getByRole("button", { name: "Phòng", exact: true }).click(); await a.getByRole("button", { name: "Chỉnh sửa QA Room", exact: true }).click(); await a.getByRole("dialog").getByLabel("Tên phòng", { exact: true }).fill("QA Admin Room"); await saveDialog(a); assert.equal(extra.state.rooms[0].name, "QA Admin Room");
  await go(a, "/admin/users"); await a.getByRole("button", { name: "Khóa", exact: true }).click(); await expect(a.getByText("Thay đổi tài khoản đã được máy chủ xác nhận.", { exact: true })).toBeVisible();
  await go(a, "/admin/roles"); await a.getByRole("button", { name: "Cấp vai trò Host", exact: true }).click(); await expect(a.getByText("Thay đổi tài khoản đã được máy chủ xác nhận.", { exact: true })).toBeVisible();
  await a.getByRole("button", { name: "Đăng xuất", exact: true }).first().click(); await expect.poll(() => a.evaluate(() => sessionStorage.getItem("studiohub.api-token"))).toBe(null);
  checks.push("login role redirects/full-profile hydration/register/logout/admin studio+room edits/user lock+role request");
}
async function publicAndBookingChecks() {
  const guest = await makeContext(null), g = guest.page;
  await go(g, "/rooms/200"); await expect(g.getByRole("heading", { name: "QA Public Room", exact: true })).toBeVisible(); await expect(g.getByText("QA Wi-Fi", { exact: true })).toBeVisible();
  const customer = await makeContext("customer"), c = customer.page;
  await go(c, "/rooms/200/book"); await c.getByLabel("Ngày thuê (giờ Việt Nam)", { exact: true }).fill("2030-01-02"); await c.getByRole("button", { name: "Kiểm tra lịch trống & giá", exact: true }).click(); await expect(c.getByRole("heading", { name: "Chi phí từ máy chủ", exact: true })).toBeVisible();
  customer.state.fail = "/api/bookings/check-availability"; await c.getByRole("button", { name: "Kiểm tra lịch trống & giá", exact: true }).click(); await expect(c.getByRole("button", { name: "Tạo đơn thuê", exact: true })).toBeDisabled(); customer.state.fail = ""; await c.getByRole("button", { name: "Kiểm tra lịch trống & giá", exact: true }).click(); await expect(c.getByRole("heading", { name: "Chi phí từ máy chủ", exact: true })).toBeVisible();
  await c.getByLabel("Tôi đã kiểm tra thời gian, giá và nội quy Studio.", { exact: true }).check(); await c.getByRole("button", { name: "Tạo đơn thuê", exact: true }).click(); await expect(c).toHaveURL(/\/payment\/101$/);
  await c.getByLabel("Tôi hiểu đây là thanh toán sandbox.", { exact: true }).check(); await c.getByRole("button", { name: "Mô phỏng trả cọc", exact: true }).click(); await expect.poll(() => customer.state.bookings.at(-1).payments.length).toBe(1);
  await c.getByRole("button", { name: "Hủy đơn", exact: true }).click(); await expect(c.getByText("Đã hủy", { exact: true })).toBeVisible();
  const host = await makeContext("host"), h = host.page;
  await go(h, "/host/bookings/100"); await h.getByRole("button", { name: "Đã nhận phòng", exact: true }).click(); await h.getByRole("button", { name: "Hoàn thành", exact: true }).click(); await expect(h.getByText("Hoàn thành", { exact: true })).toBeVisible();
  checks.push("public room/amenities/calendar; quote/create/detail/sandbox deposit/cancel; host check-in/completion; fixture-only financial responses");
}
try {
  for (let i = 0; i < 120 && !log.includes("Ready in"); i++) { if (server.exitCode !== null) throw new Error(log); await delay(250); }
  assert.match(log, /Ready in/); browser = await chromium.launch();
  const customer = await makeContext("customer"), host = await makeContext("host"), admin = await makeContext("admin"), guest = await makeContext(null);
  const c = customer.page, h = host.page, a = admin.page;
  await extendedManagementChecks();
  await authAndAdminChecks();
  await publicAndBookingChecks();
  await go(c, "/profile"); await c.getByLabel("Ngày sinh", { exact: true }).fill("1999-01-02"); await c.getByLabel("Địa chỉ", { exact: true }).fill("QA saved address"); await c.getByRole("button", { name: "Lưu thay đổi", exact: true }).click(); await expect(c.getByText("Đã lưu thông tin cá nhân trên máy chủ.", { exact: true })).toBeVisible(); await c.reload({ waitUntil: "networkidle" }); await expect(c.getByLabel("Ngày sinh", { exact: true })).toHaveValue("1999-01-02"); await expect(c.getByLabel("Địa chỉ", { exact: true })).toHaveValue("QA saved address");
  await c.getByLabel("Email mới", { exact: true }).fill("new@qa.test"); 
  const emailForm = c.locator("form").filter({ has: c.getByLabel("Email mới", { exact: true }) }); await emailForm.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("qa-password"); await c.getByRole("button", { name: "Yêu cầu đổi email", exact: true }).click(); await c.getByLabel("Mã xác nhận", { exact: true }).fill("123456"); await c.getByRole("button", { name: "Xác nhận email mới", exact: true }).click(); await expect(c.locator("#customer-email")).toHaveValue("new@qa.test");
  await c.getByLabel("Ảnh JPG/PNG/WebP tối đa 5 MiB", { exact: true }).setInputFiles(photo); await c.getByRole("button", { name: "Cập nhật ảnh", exact: true }).click(); await expect.poll(() => calls.filter(r => r.path === "/api/account/avatar").length).toBe(1);
  await c.getByLabel("Email tin sản phẩm", { exact: true }).check(); await c.getByRole("button", { name: "Lưu tùy chọn thông báo", exact: true }).click(); await expect.poll(() => customer.state.prefs.email_product_updates).toBe(true);
  await c.getByLabel("Họ tên pháp lý", { exact: true }).fill("QA Identity"); await c.getByLabel("4 ký tự cuối của giấy tờ", { exact: true }).fill("1234"); await c.getByLabel("Tài liệu PDF/JPG/PNG tối đa 5 MiB", { exact: true }).setInputFiles(photo); await c.getByRole("button", { name: "Gửi hồ sơ xác minh", exact: true }).click(); await expect(c.getByText("Đã gửi hồ sơ; đang chờ xét duyệt.", { exact: true })).toBeVisible();
  assert.equal(await c.evaluate(() => Object.values(localStorage).some(v => v.includes("QA Identity"))), false);
  await go(c, "/register/host"); await c.getByLabel("Tên Studio", { exact: true }).fill("QA New Application"); await c.getByLabel("Địa chỉ Studio", { exact: true }).fill("QA Address"); await c.getByLabel("Mô tả Studio", { exact: true }).fill("QA Description"); await c.getByRole("button", { name: "Gửi hồ sơ đăng ký", exact: true }).click(); await expect(c.getByRole("heading", { name: "QA New Application", exact: true })).toBeVisible(); checks.push("customer profile/email/avatar/preferences/identity/application, fixture re-fetch after reload");
  await go(h, "/host/studios"); await h.getByRole("button", { name: "Thêm Studio", exact: true }).first().click(); for (const [label, value] of [["Tên Studio", "QA New Studio"], ["Địa chỉ", "QA Address"], ["Quận / huyện", "Q1"], ["Tỉnh / thành phố", "HCM"], ["Điện thoại", "0901234567"]]) await h.getByRole("dialog").getByLabel(label, { exact: true }).fill(value); await saveDialog(h); await expect(h.getByRole("heading", { name: "QA New Studio", exact: true })).toBeVisible();
  await go(h, "/host/rooms"); await expect(h.getByRole("heading", { name: "QA Room", exact: true })).toBeVisible(); await h.getByRole("button", { name: "Thêm loại phòng", exact: true }).click(); await h.getByRole("dialog").getByLabel("Tên loại phòng", { exact: true }).fill("QA New Type"); await saveDialog(h); await expect(h.getByRole("heading", { name: "QA New Type", exact: true })).toBeVisible();
  await h.getByRole("button", { name: "Thêm phòng vật lý", exact: true }).click(); const rd = h.getByRole("dialog"); await rd.getByLabel("Tên phòng", { exact: true }).fill("QA New Room"); await rd.getByLabel("Loại phòng của Studio", { exact: true }).selectOption("30"); await rd.getByLabel("Loại không gian công khai", { exact: true }).selectOption("1"); await rd.getByLabel("Diện tích", { exact: true }).fill("30"); await rd.getByLabel("Sức chứa", { exact: true }).fill("5"); await saveDialog(h); await expect(h.getByRole("heading", { name: "QA New Room", exact: true })).toBeVisible();
  await h.getByRole("button", { name: "Sửa QA Room", exact: true }).click(); await h.getByRole("dialog").getByLabel("Tên phòng", { exact: true }).fill("QA Room Edited"); await saveDialog(h);
  host.state.equipment[0].status = "maintenance";
  await go(h, "/host/equipments"); await h.getByRole("button", { name: "Sửa QA Light", exact: true }).click(); await h.getByRole("dialog").getByLabel("Tổng số lượng", { exact: true }).fill("7"); await saveDialog(h); assert.equal(host.state.equipment[0].total_quantity, 7); assert.equal(host.state.equipment[0].status, "maintenance");
  await h.getByRole("button", { name: "Xóa QA Light", exact: true }).click(); await h.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click(); await expect(h.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("QA equipment_in_use"); assert.equal(host.state.equipment.length, 1); host.state.denyDelete = false; await h.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click(); await expect(h.getByRole("dialog")).toHaveCount(0); await expect(h.getByText("QA Light", { exact: true })).toHaveCount(0);
  await go(h, "/host/rates"); await expect(h.getByText("180 phút", { exact: true })).toBeVisible(); await h.getByRole("button", { name: /Xóa giá.*#60/ }).click(); host.state.denyDelete = true; await h.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click(); await expect(h.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("QA rate_in_use"); host.state.denyDelete = false; await h.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click(); await expect(h.getByRole("dialog")).toHaveCount(0);
  await go(h, "/host/calendar"); await expect(h.getByText("QA-100", { exact: false })).toHaveCount(1); assert.ok(calls.some(r => r.path === "/api/host/calendar" && r.query.includes("studio_id=10")));
  await go(h, "/host/policies"); await h.getByLabel("Tỷ lệ cọc (%)", { exact: true }).fill("40"); await h.getByRole("button", { name: "Lưu chính sách", exact: true }).click(); await expect.poll(() => host.state.policy.deposit_percent).toBe(40);
  await go(h, "/host/settings"); for (const [name, value] of [["Tên pháp lý", "QA Legal"], ["Địa chỉ pháp lý", "QA Legal Address"], ["Email liên hệ", "legal@qa.test"], ["Điện thoại liên hệ", "0901234567"]]) await h.getByLabel(name, { exact: true }).fill(value); await h.getByRole("button", { name: "Lưu hồ sơ pháp lý", exact: true }).click(); await expect(h.getByText("Đã lưu hồ sơ pháp lý; đang chờ xét duyệt.", { exact: true })).toBeVisible(); await h.reload({ waitUntil: "networkidle" }); await expect(h.getByLabel("Tên pháp lý", { exact: true })).toHaveValue("QA Legal");
  await h.getByRole("button", { name: "Xem hợp đồng", exact: true }).click(); const download = h.waitForEvent("download"); await h.getByRole("button", { name: "Tải tài liệu hợp đồng", exact: true }).click(); assert.equal((await download).suggestedFilename(), "contract.pdf"); await h.getByRole("dialog").getByRole("button", { name: /Đóng/ }).first().click(); checks.push("host REST inventory/hidden rooms/types/rooms/equipment edit+restricted delete/rate restricted delete/calendar/policies/legal/PDF");
  await go(a, "/admin/host-requests"); await a.getByRole("button", { name: "Chi tiết", exact: true }).click(); await expect(a.getByRole("dialog")).toContainText("QA Customer"); await a.getByRole("dialog").getByRole("button", { name: /Đóng/ }).first().click(); await a.getByRole("button", { name: "Duyệt QA Application", exact: true }).click(); await a.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click(); await expect(a.getByRole("dialog")).toHaveCount(0); assert.equal(admin.state.applications[0].status, "approved");
  await go(a, "/admin/equipments"); await a.getByRole("button", { name: "Chỉnh sửa QA Light", exact: true }).click(); await a.getByRole("dialog").getByLabel("Giá (VND)", { exact: true }).fill("120000"); await saveDialog(a); assert.equal(admin.state.equipment[0].unit_price, 120000);
  await go(a, "/admin/roles"); await expect(a.getByText("Chủ Studio", { exact: true }).first()).toBeVisible();
  await go(a, "/admin/refunds"); await a.getByRole("button", { name: "Chi tiết / đối soát", exact: true }).click(); await a.getByRole("button", { name: "Ghi nhận đối soát thành công", exact: true }).click(); await a.getByLabel("Mã tham chiếu giao dịch đối soát", { exact: true }).fill("QA-EVIDENCE-90"); await a.getByRole("button", { name: "Ghi nhận đối soát", exact: true }).click(); await expect(a.getByRole("dialog")).toHaveCount(0); await expect(a.getByText("Đã ghi nhận kết quả đối soát trên máy chủ. Thao tác không chuyển tiền.", { exact: true })).toBeVisible();
  await go(a, "/admin/audit-logs"); await expect(a.getByText("QA audit action", { exact: true })).toBeVisible();
  for (const [page, role] of [[h, "host"], [a, "admin"]]) { await go(page, `/${role}/reports`); await page.getByRole("button", { name: "7 ngày", exact: true }).click(); await expect(page.getByText("2026-11-05", { exact: true })).toBeVisible(); const query = calls.filter(r => r.path === `/api/${role}/reports/series`).at(-1).query; assert.match(query, /from=/); assert.match(query, /to=/); }
  checks.push("admin application detail+decision/resource edit/role catalog/manual refund evidence/audit/date-scoped reports");
  host.state.fail = "/api/host/equipments"; await go(h, "/host/equipments"); await expect(h.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("QA backend error"); await expect(h.getByRole("heading", { name: /Chưa có thiết bị/ })).toHaveCount(0); host.state.fail = ""; host.state.malformed = "/api/host/equipments"; await h.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(h.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("cấu trúc danh sách"); host.state.malformed = "";
  for (const width of [360, 390, 768, 1024, 1440]) { await a.setViewportSize({ width, height: 1000 }); await go(a, "/admin/equipments"); await a.screenshot({ path: new URL(`admin-${width}.png`, output).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"), fullPage: true }); }
  await go(c, "/host/rooms"); await expect(c.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible(); await go(guest.page, "/admin/equipments"); await expect(guest.page.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible();
  host.state.unauthorized = true; await go(h, "/host/equipments"); await expect(h.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible(); assert.equal(await h.evaluate(() => sessionStorage.getItem("studiohub.api-token")), null);
  assert.equal(calls.some(r => ["/api/workspace", "/api/commands"].includes(r.path)), false); assert.deepEqual(failures, []); assert.deepEqual(errors, []); checks.push("500/contract errors stay errors; forbidden roles and session expiration; 5 viewport widths; no shared workspace overfetch");
  const summary = { classification: "VERIFIED_MOCK_ONLY", checks, observed: [...new Set(calls.map(c => `${c.method} ${c.path}`))].sort(), requests: calls.length, httpFixtures: calls.map(({ role, method, path, query, httpStatus }) => ({ role, method, path, query, httpStatus })), errors, failures };
  await writeFile(new URL("summary.json", output), JSON.stringify(summary, null, 2)); console.log(JSON.stringify({ classification: summary.classification, checks, uniqueObserved: summary.observed.length, requests: summary.requests, errors, failures }, null, 2));
} finally { for (const context of contexts) await context.close(); await browser?.close(); server.kill(); }
