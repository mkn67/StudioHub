import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

const base = process.env.DASHBOARD_QA_URL ?? "http://localhost:3000";
const output = ".impeccable/review/dashboard";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], checks = [];
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem("studiohub.demo.v1")));
const settle = async page => {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/rooms");
  await page.locator(".demo-toggle").click();
  await page.locator(".demo-panel select").first().selectOption("host");
  await page.locator(".demo-toggle").click();
  await page.goto(base + "/host");
  await expect(page.getByRole("heading", { name: "Tổng quan Studio", exact: true })).toBeVisible();
  await settle(page);
  await expect(page.locator(".dashboard-kpi")).toHaveCount(4);
  await page.screenshot({ path: `${output}/host-overview-initial.png`, fullPage: true });
  if (process.env.OVERVIEW_ONLY === "1") {
    console.log("Host overview rendered and screenshot captured.");
  } else {
    const routes = ["/host", "/host/bookings", "/host/calendar", "/host/equipments", "/host/rates", "/host/studios", "/host/rooms", "/host/reports", "/host/settings", "/admin", "/admin/users", "/admin/host-requests", "/admin/audit-logs", "/admin/studios", "/admin/equipments", "/admin/roles", "/admin/refunds"];
    for (const motion of process.env.SKIP_VISUAL === "1" ? [] : ["reduce", "no-preference"]) {
      await page.emulateMedia({ reducedMotion: motion });
      for (const route of routes) {
        const role = route.startsWith("/host") ? "host" : "admin";
        await page.evaluate(role => { const state = JSON.parse(localStorage.getItem("studiohub.demo.v1")); state.sessionId = role; localStorage.setItem("studiohub.demo.v1", JSON.stringify(state)); }, role);
        await page.goto(base + route);
        await expect(page.locator(".ops-shell")).toHaveAttribute("data-role", role);
        for (const width of motion === "reduce" ? [360, 390, 768, 1024, 1440] : [390, 1440]) {
          await page.setViewportSize({ width, height: 1050 }); await settle(page);
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${route} ${width} overflow` }).toBe(true);
          await expect(page.locator(".ops-main h1").first()).toBeVisible();
          if ([390, 1440].includes(width)) {
            await page.screenshot({ path: `${output}/${route.slice(1).replaceAll("/", "-")}-${motion}-${width}.png`, fullPage: true });
            if (route === "/host/rates") await page.screenshot({ path: `${output}/host-rates-${motion}-${width}-viewport.png` });
          }
          checks.push(`${route} ${motion} ${width}`);
        }
      }
    }
    // Interaction checks use the real demo store; domain mutations stay in this
    // isolated browser context and never reach PHP or a real user session.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.sessionId = "host"; localStorage.setItem("studiohub.demo.v1", JSON.stringify(s)); });
    await page.goto(base + "/host");
    await page.getByRole("button", { name: "Thu gọn điều hướng", exact: true }).click();
    await page.getByRole("navigation", { name: "Điều hướng Host", exact: true }).getByRole("link", { name: "Thiết bị", exact: true }).click();
    await expect(page).toHaveURL(base + "/host/equipments");
    await expect(page.locator(".ops-shell")).toHaveClass(/nav-collapsed/);
    await page.reload(); await expect(page.locator(".ops-shell")).toHaveClass(/nav-collapsed/);
    await page.screenshot({ path: `${output}/sidebar-collapsed.png` });
    await page.getByRole("button", { name: "Mở rộng điều hướng", exact: true }).click();
    await page.getByLabel("Tìm thiết bị", { exact: true }).fill("không có thiết bị này");
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await page.getByLabel("Tìm thiết bị", { exact: true }).fill("");
    const before = await stateOf(page);
    const edit = page.getByRole("button", { name: "Chỉnh sửa", exact: true }).first();
    await edit.click();
    const dialog = page.getByRole("dialog", { name: "Thông tin thiết bị", exact: true });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 16; i++) { await page.keyboard.press("Tab"); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true); }
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(edit).toBeFocused();
    expect((await stateOf(page)).equipment).toEqual(before.equipment);
    await page.goto(base + "/host/calendar");
    await expect(page.locator(".host-calendar-buffer").first()).toHaveCSS("height", "24px");
    await page.getByLabel("Chế độ lịch").selectOption("day");
    await page.getByLabel("Chế độ lịch").selectOption("week");
    const date = await page.getByLabel("Ngày xem lịch", { exact: true }).inputValue();
    await page.getByRole("button", { name: "Kỳ tiếp", exact: true }).click();
    expect(await page.getByLabel("Ngày xem lịch", { exact: true }).inputValue()).not.toBe(date);
    await page.goto(base + "/host/bookings");
    await expect(page.locator(".kanban-column")).toHaveCount(4);
    await page.getByRole("button", { name: "Chờ cọc & lịch sử", exact: true }).click();
    await expect(page.locator('.kanban-column[data-status="awaiting_payment"]')).toBeVisible();
    await page.goto(base + "/host/rates");
    await page.getByRole("button", { name: "Chỉnh sửa bảng giá Daylight Studio", exact: true }).click();
    await page.getByRole("tab", { name: "Gói thuê & ekip", exact: true }).click();
    await expect(page.locator("[data-package-manager]").first()).toBeVisible();
    await page.getByRole("tab", { name: "Gói nổi bật", exact: true }).click();
    await expect(page.locator("[data-featured-manager]").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Mobile uses the existing application drawer, including native focus/escape.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Mở điều hướng", exact: true }).click();
    const nav = page.getByRole("dialog", { name: "Điều hướng StudioHub", exact: true });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Quản lý đơn", exact: true }).click();
    await expect(page).toHaveURL(base + "/host/bookings"); await expect(nav).not.toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.sessionId = "admin"; localStorage.setItem("studiohub.demo.v1", JSON.stringify(s)); });
    await page.goto(base + "/admin/users");
    await page.getByLabel("Vai trò").selectOption("host");
    await expect(page.locator("tbody tr")).toHaveCount(before.users.filter(u => u.role === "host").length);
    await page.getByRole("button", { name: "Xử lý tài khoản", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Khóa đăng nhập", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.goto(base + "/admin/host-requests");
    await expect(page.getByRole("button", { name: "Từ chối hồ sơ", exact: true })).toBeDisabled();
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: "Duyệt đối tác", exact: true }).click();
    expect((await stateOf(page)).applications).toEqual(before.applications);
    await page.goto(base + "/admin/audit-logs");
    await expect(page.getByLabel("Người thực hiện")).toBeVisible();
    await page.getByLabel("Tìm hành động hoặc đối tượng", { exact: true }).fill("không có sự kiện này");
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await page.goto(base + "/host");
    await expect(page.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible();
    await expect(page.locator(".ops-shell")).toHaveCount(0);
    checks.push("sidebar persistence; equipment filters/dialog/focus; day/week/date/buffer; Kanban; pricing controls; mobile drawer; Admin role filter/required reason/approval cancel; audit filter; role guard");
    expect(errors).toEqual([]);
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ responsiveChecks: checks.length - 1, interactionChecks: checks.at(-1), errors, output }));
  }
} finally { await browser.close(); }
