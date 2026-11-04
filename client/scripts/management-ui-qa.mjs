import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
const base = process.env.QA_BASE_URL || "http://localhost:3000", api = process.env.QA_API_URL || "http://localhost:8000";
const output = new URL("../test-results/management-ui/", import.meta.url); await mkdir(output, { recursive: true });
const browser = await chromium.launch(), contexts = [], errors = [], blockedWrites = [];
let holdProfile = false, releaseProfile;
async function auth(email) {
  const response = await fetch(`${api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: process.env.QA_PASSWORD || "password123" }) });
  assert.equal(response.status, 200); return (await response.json()).data;
}
async function context(user) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "vi-VN", reducedMotion: "no-preference" }); contexts.push(context);
  if (user) await context.addInitScript(token => { if (location.origin !== "null") sessionStorage.setItem("studiohub.api-token", token); }, user.token);
  await context.route("https://images.unsplash.com/**", route => route.abort());
  // Never forward a resource/profile/permission mutation during this task.
  await context.route(`${api}/**`, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!["GET", "OPTIONS"].includes(request.method()) && path !== "/api/auth/logout") {
      blockedWrites.push({ path, method: request.method(), body: request.postData() });
      if (path === "/api/auth/profile" && holdProfile) await new Promise(resolve => { releaseProfile = resolve; });
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  return context;
}
async function pageFor(context) { const page = await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror", error => errors.push(error.message)); return page; }
async function goto(page, path) { await page.goto(`${base}${path}`, { waitUntil: "networkidle" }); }
async function shot(page, name) { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: await page.getByRole("dialog").count() === 0, animations: "disabled" }); }
async function noOverflow(page, label) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal page overflow ${label}`); }
async function menu(page) { const trigger = page.getByRole("button", { name: "Menu tài khoản", exact: true }); await trigger.click(); await expect(page.getByRole("menu")).toBeVisible(); return trigger; }
try {
  const adminAuth = await auth("admin@studio.local"), hostAuth = await auth("host1@studio.local");
  const allUsersResponse = await fetch(`${api}/api/admin/users?page=1&limit=12`, { headers: { Authorization: `Bearer ${adminAuth.token}` } });
  const allUsersCount = (await allUsersResponse.json()).data.items.length;
  const ac = await context(adminAuth), hc = await context(hostAuth), admin = await pageFor(ac), host = await pageFor(hc);
  const routes = ["", "users", "roles", "host-requests", "studios", "equipments", "bookings", "refunds", "audit-logs", "reports", "settings"];
  const widths = process.env.QA_VIEWPORTS ? process.env.QA_VIEWPORTS.split(",").map(Number) : [360, 390, 768, 1024, 1280, 1440];
  for (const width of widths) {
    await admin.goto("about:blank"); await admin.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await goto(admin, `/admin${route ? `/${route}` : ""}`);
      await expect(admin.locator('[data-workspace-role="admin"]')).toBeVisible(); await expect(admin.locator(".site-header")).toHaveCount(0);
      await expect(admin.locator(".host-content .host-error")).toHaveCount(0); await noOverflow(admin, `Admin ${route} ${width}`);
      await shot(admin, `admin-${route || "overview"}-${width}`);
    }
    await host.goto("about:blank"); await host.setViewportSize({ width, height: 1000 });
    await goto(host, "/host/settings"); await expect(host.locator('[data-workspace-role="host"]')).toBeVisible(); await expect(host.locator(".site-header")).toHaveCount(0); await noOverflow(host, `Host settings ${width}`); await shot(host, `host-settings-${width}`);
    console.log(`PASS: 11 Admin screens + Host Settings at ${width}px, correct shell, no page overflow`);
  }
  for (const [page, role] of [[host, "host"], [admin, "admin"]]) {
    await goto(page, "/"); await expect(page.locator(".account-link")).toHaveAttribute("href", `/${role}/settings`);
    await page.goto("about:blank"); await page.setViewportSize({ width: 1440, height: 1000 }); await goto(page, `/${role}`);
    const trigger = await menu(page); await expect(page.getByRole("menu").getByRole("menuitem", { name: "Cài đặt", exact: true })).toHaveAttribute("href", `/${role}/settings`);
    await page.keyboard.press("ArrowDown"); await expect(page.getByRole("menuitem", { name: "Xem website", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); await expect(page.getByRole("menu")).toHaveCount(0);
    await menu(page); await page.locator("h1").first().click(); await expect(page.getByRole("menu")).toHaveCount(0);
    await menu(page); await shot(page, `${role}-account-menu`); await page.getByRole("menuitem", { name: "Cài đặt", exact: true }).click(); await page.waitForURL(`**/${role}/settings`); await expect(page.getByRole("heading", { name: "Cài đặt", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("readonly", ""); await expect(page.getByRole("button", { name: "Lưu thông tin", exact: true })).toBeDisabled();
    const compact = page.getByRole("switch", { name: "Chế độ hiển thị gọn", exact: true }); await compact.focus(); await page.keyboard.press("Space"); await expect(compact).toHaveAttribute("aria-checked", "true");
    const reduced = page.getByRole("switch", { name: "Giảm hiệu ứng chuyển động", exact: true }); await reduced.focus(); await page.keyboard.press("Enter"); await expect(reduced).toHaveAttribute("aria-checked", "true");
    await page.reload({ waitUntil: "networkidle" }); await expect(page.locator(".management-workspace")).toHaveAttribute("data-compact", "true"); await expect(reduced).toHaveAttribute("aria-checked", "true");
    const storage = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("studiohub.workspace.preferences.v1.")).map(key => ({ key, value: JSON.parse(localStorage.getItem(key)) })));
    assert.ok(storage.some(item => item.key.includes(`.${role}.`) && item.value.compact === true)); assert.ok(storage.every(item => Object.keys(item.value).every(key => ["compact", "reduceMotion"].includes(key))));
    assert.equal(await page.locator(".btn").first().evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    await reduced.click(); await expect(reduced).toHaveAttribute("aria-checked", "false");
    await page.emulateMedia({ reducedMotion: "reduce" }); assert.equal(await page.locator(".btn").first().evaluate(el => getComputedStyle(el).transitionDuration), "0s"); await page.emulateMedia({ reducedMotion: "no-preference" });
    await shot(page, `${role}-settings-preferences`);
    await page.goBack({ waitUntil: "networkidle" }); await expect(page.locator(`[data-workspace-role="${role}"]`)).toBeVisible(); await page.goForward({ waitUntil: "networkidle" }); await expect(page.getByRole("heading", { name: "Cài đặt", exact: true })).toBeVisible();
    console.log(`PASS: ${role} account menu keyboard/Escape/outside click, Settings route/history, readonly email, switches + refresh persistence and system reduced motion`);
  }
  await goto(admin, "/admin/users");
  assert.equal(await admin.locator(".host-table tbody td").first().evaluate(el => getComputedStyle(el).paddingTop), "8px");
  await admin.getByLabel("Vai trò", { exact: true }).selectOption("host"); await admin.getByLabel("Trạng thái", { exact: true }).selectOption("active"); await admin.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(admin.locator(".host-table tbody tr")).toHaveCount(2);
  assert.equal(await admin.getByRole("button", { name: /Cấp vai trò Host|Chuyển thành khách/ }).count(), 0);
  await admin.getByLabel("Trạng thái", { exact: true }).selectOption("locked"); await admin.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(admin.getByRole("heading", { name: "Không tìm thấy tài khoản", exact: true })).toBeVisible(); await shot(admin, "accounts-empty");
  await goto(admin, "/admin/roles"); await expect(admin.getByRole("heading", { name: "Phân công vai trò tài khoản", exact: true })).toBeVisible(); assert.equal(await admin.getByRole("button", { name: "Khóa", exact: true }).count(), 0); assert.ok(await admin.getByRole("button", { name: /Cấp vai trò Host|Chuyển thành khách/ }).count() > 0);
  await admin.route(`${api}/api/admin/users**`, route => route.abort("failed")); await admin.reload({ waitUntil: "networkidle" }); await expect(admin.locator(".host-error")).toBeVisible(); await shot(admin, "accounts-error"); await admin.unroute(`${api}/api/admin/users**`); await admin.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(admin.locator(".host-table tbody tr")).toHaveCount(allUsersCount);
  console.log("PASS: real account role/status filters, empty/error/retry; Accounts and Permissions have distinct actions");

  await goto(host, "/host/settings");
  const original = await host.getByLabel("Họ tên", { exact: true }).inputValue(); await host.getByLabel("Họ tên", { exact: true }).fill("Bản nháp kiểm tra không lưu");
  holdProfile = true; await host.getByRole("button", { name: "Lưu thông tin", exact: true }).click();
  await expect.poll(() => typeof releaseProfile).toBe("function"); await expect(host.getByRole("button", { name: "Đang lưu…", exact: true })).toBeDisabled();
  await host.locator(".workspace-account-form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  assert.equal(blockedWrites.length, 1); holdProfile = false; releaseProfile();
  await expect(host.locator(".host-form-error")).toBeVisible(); await expect(host.getByLabel("Họ tên", { exact: true })).toHaveValue("Bản nháp kiểm tra không lưu"); await expect(host.locator(".host-success")).toHaveCount(0);
  const profileWrite = blockedWrites.find(write => write.path === "/api/auth/profile"); assert.equal(profileWrite.method, "PATCH"); assert.deepEqual(Object.keys(JSON.parse(profileWrite.body)).sort(), ["full_name", "phone"]);
  host.once("dialog", dialog => dialog.accept()); await host.getByRole("button", { name: "Hủy thay đổi", exact: true }).click(); await expect(host.getByLabel("Họ tên", { exact: true })).toHaveValue(original);
  await host.setViewportSize({ width: 390, height: 844 }); await host.getByRole("button", { name: "Mở điều hướng Host", exact: true }).click(); await shot(host, "host-mobile-drawer"); await host.keyboard.press("Escape"); await expect(host.getByRole("button", { name: "Mở điều hướng Host", exact: true })).toBeFocused();
  await admin.goto("about:blank"); await admin.setViewportSize({ width: 390, height: 844 }); await goto(admin, "/admin/settings"); await admin.getByRole("button", { name: "Mở điều hướng Admin", exact: true }).click(); await shot(admin, "admin-mobile-drawer"); await admin.keyboard.press("Escape"); await expect(admin.getByRole("dialog")).toHaveCount(0);
  console.log("PASS: profile PATCH mapping verified by network abort, draft/error preserved, no success fabricated; mobile drawers/focus");

  for (const route of ["/host", "/host/rooms", "/host/equipments", "/host/rates", "/host/calendar", "/host/bookings", "/host/reports", "/host/policies"]) { await goto(host, route); await expect(host.locator('[data-workspace-role="host"]')).toBeVisible(); await noOverflow(host, route); }
  const customer = await pageFor(await context(await auth("customer@studio.local"))); await goto(customer, "/profile"); await expect(customer.locator(".site-header")).toBeVisible(); await expect(customer.getByLabel("Họ tên", { exact: true })).toBeVisible(); await expect(customer.locator(".management-workspace")).toHaveCount(0);
  await goto(customer, "/admin/settings"); await expect(customer.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible(); await goto(host, "/admin/settings"); await expect(host.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible();
  await goto(admin, "/admin/settings"); await menu(admin); await admin.getByRole("menuitem", { name: "Đăng xuất", exact: true }).click(); await admin.waitForURL(`${base}/`); assert.equal(await admin.evaluate(() => sessionStorage.getItem("studiohub.api-token")), null);
  assert.equal(blockedWrites.length, 1, "only the explicitly blocked profile failure test should attempt a write"); assert.deepEqual(errors, []);
  console.log("PASS: Host regression routes, Customer Profile, cross-role gates, actual stateless logout, no page errors; zero resource/database mutations forwarded");
  console.log("NOTE: profile/role/status save success deliberately NOT runtime-tested; no invented success responses or database writes.");
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
