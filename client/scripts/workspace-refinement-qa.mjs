import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.WORKSPACE_QA_URL ?? "http://localhost:3000";
const output = ".impeccable/review/workspace-refinement";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = []; let checks = 0;
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem("studiohub.demo.v1")));
const rgb = hex => `rgb(${hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(", ")})`;
const colors = { awaiting_payment: ["#F2EDE2", "#66533B"], pending: ["#FFF0D4", "#885610"], confirmed: ["#DEEAFD", "#28599C"], checked_in: ["#D8F3F2", "#086675"], completed: ["#DDF2E5", "#206745"], cancelled: ["#FDE6E3", "#923E38"], expired: ["#E9EEF3", "#4D5C6D"], no_show: ["#F8E6D9", "#87481F"] };
try {
  // Inspect server HTML without hydration: workspace never contains public nav.
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const html = await noJS.newPage();
  for (const path of ["/host", "/host/bookings", "/admin", "/admin/users"]) { await html.goto(base + path); await expect(html.locator("header.site-header")).toHaveCount(0); checks++; }
  await html.goto(base + "/rooms"); await expect(html.locator("header.site-header")).toHaveCount(1); checks++;
  await noJS.close();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/rooms"); await expect(page.locator("header.site-header")).toHaveCount(1);
  expect(await page.locator("body").evaluate(node => getComputedStyle(node).fontFamily)).toContain("Bricolage"); checks++;
  await page.locator(".demo-toggle").click(); await page.locator(".demo-panel select").first().selectOption("host"); await page.locator(".demo-toggle").click();
  await page.goto(base + "/host"); await page.evaluate(async () => { await document.fonts.ready; });
  const original = await stateOf(page);
  await expect(page.locator("header.site-header")).toHaveCount(0);
  expect(await page.locator(".ops-shell").evaluate(node => getComputedStyle(node).fontFamily)).toContain("Space Grotesk Variable");
  expect(await page.evaluate(() => document.fonts.check('400 16px "Space Grotesk Variable"', "Đặng Nguyễn Ánh sáng ấ ế ộ ự"))).toBe(true);
  await page.evaluate(async () => { await document.fonts.load('400 13px "Space Mono"', "Đơn SH-123"); });
  expect(await page.evaluate(() => document.fonts.check('400 13px "Space Mono"', "Đơn SH-123"))).toBe(true);
  expect((await page.locator(".ops-shell").boundingBox()).y).toBe(0);
  await expect(page.locator(".ops-workspace-bar")).toHaveCSS("min-height", "56px");
  await expect(page.locator(".ops-main h1")).toHaveCSS("font-weight", "700"); checks += 5;
  await page.getByRole("button", { name: "Thu gọn điều hướng", exact: true }).click();
  await page.getByRole("navigation", { name: "Điều hướng Host", exact: true }).getByRole("link", { name: "Quản lý đơn", exact: true }).click();
  await expect(page).toHaveURL(base + "/host/bookings"); await page.reload(); await expect(page.locator(".ops-shell")).toHaveClass(/nav-collapsed/);
  await page.locator(".ops-account-menu summary").click(); await expect(page.locator(".ops-account-menu").getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.locator(".ops-account-menu")).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Mở rộng điều hướng", exact: true }).click(); checks += 2;
  const statuses = Object.keys(colors);
  const seeded = statuses.map((status, index) => ({ ...original.bookings[0], id: `QA-${status}`, roomId: "c101", status,
    payment: status === "awaiting_payment" ? "unpaid" : "paid", paidAt: original.now - 3 * 3600000,
    start: Date.parse("2026-10-28T22:00:00+07:00") + index * 7 * 86400000,
    end: Date.parse("2026-10-29T02:00:00+07:00") + index * 7 * 86400000 }));
  await page.evaluate(bookings => { const state = JSON.parse(localStorage.getItem("studiohub.demo.v1")); state.bookings = bookings; localStorage.setItem("studiohub.demo.v1", JSON.stringify(state)); }, seeded);
  await page.reload();
  const checkColors = async () => {
    for (const column of await page.locator(".kanban-column").all()) {
      const status = await column.getAttribute("data-status"), heading = column.locator(":scope > h3");
      await expect(heading).toHaveCSS("background-color", rgb(colors[status][0])); await expect(heading).toHaveCSS("color", rgb(colors[status][1]));
      await expect(heading.locator("span")).toHaveText("1");
      expect(await column.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe("rgb(241, 245, 249)"); checks++;
    }
  };
  await checkColors();
  await expect(page.locator(".kanban-card")).toHaveCount(4);
  await expect(page.locator(".kanban-rental-time").first()).toContainText(/\d{2}\/\d{2} 22:00 → \d{2}\/\d{2} 02:00/);
  await expect(page.locator('.kanban-column[data-status="pending"] [data-deadline-state="overdue"]')).toContainText("Quá hạn");
  await expect(page.locator(".kanban-card").first()).toContainText("Cọc đã nhận"); checks += 4;
  await page.getByRole("button", { name: "Chờ cọc & lịch sử", exact: true }).click(); await checkColors();
  await expect(page.locator('.kanban-column[data-status="awaiting_payment"]')).toContainText("Cọc yêu cầu");
  await page.getByLabel("Tìm đơn", { exact: true }).fill("QA-expired");
  await expect(page.locator(".kanban-card")).toHaveCount(1);
  await expect(page.locator('.kanban-column[data-status="cancelled"] > h3 span')).toHaveText("0");
  await expect(page.locator('.kanban-column[data-status="cancelled"]')).toContainText("Chưa có đơn");
  await page.getByLabel("Tìm đơn", { exact: true }).fill(""); checks += 3;
  await page.screenshot({ path: `${output}/kanban-history-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "Xem đơn đang vận hành", exact: true }).click();
  await page.locator('a.kanban-card[href="/host/bookings/QA-confirmed"]').click();
  await expect(page).toHaveURL(base + "/host/bookings/QA-confirmed");
  await expect(page.locator(".booking-header .status.confirmed")).toHaveCSS("background-color", rgb(colors.confirmed[0]));
  await expect(page.locator(".booking-header .payment-badge")).not.toHaveCSS("background-color", rgb(colors.confirmed[0])); checks++;
  for (const reducedMotion of ["reduce", "no-preference"]) {
    await page.emulateMedia({ reducedMotion });
    for (const path of ["/host", "/host/bookings", "/host/calendar", "/host/rates", "/admin", "/admin/users", "/admin/host-requests", "/admin/audit-logs"]) {
      const role = path.startsWith("/admin") ? "admin" : "host";
      await page.evaluate(role => { const state = JSON.parse(localStorage.getItem("studiohub.demo.v1")); state.sessionId = role; localStorage.setItem("studiohub.demo.v1", JSON.stringify(state)); }, role);
      await page.goto(base + path); await page.evaluate(async () => { await document.fonts.ready; });
      await expect(page.locator(".ops-shell")).toHaveAttribute("data-role", role);
      for (const width of reducedMotion === "reduce" ? [360, 390, 768, 1024, 1440] : [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator("header.site-header")).toHaveCount(0);
        expect((await page.locator(".ops-shell").boundingBox()).y).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.locator(".ops-main h1").first()).toHaveCSS("font-weight", "700");
        if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/${path.slice(1).replaceAll("/", "-")}-${reducedMotion}-${width}.png`, fullPage: true }); checks++;
      }
    }
  }
  await page.evaluate(() => { const state = JSON.parse(localStorage.getItem("studiohub.demo.v1")); state.sessionId = "host"; localStorage.setItem("studiohub.demo.v1", JSON.stringify(state)); });
  await page.goto(base + "/host/bookings"); await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole("button", { name: "Mở điều hướng", exact: true });
  await menuButton.click(); const drawer = page.getByRole("dialog", { name: "Điều hướng StudioHub", exact: true });
  await expect(drawer).toBeVisible(); await expect(drawer.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  for (let index = 0; index < 16; index++) { await page.keyboard.press("Tab"); expect(await drawer.evaluate(node => node.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press("Escape"); await expect(drawer).not.toBeVisible(); await expect(menuButton).toBeFocused();
  await menuButton.click(); await drawer.getByRole("link", { name: "Lịch đặt phòng", exact: true }).click();
  await expect(page).toHaveURL(base + "/host/calendar"); await expect(drawer).not.toBeVisible(); checks += 3;
  expect((await stateOf(page)).bookings).toEqual(seeded); checks++;
  await page.locator(".ops-account-menu summary").click(); await page.locator(".ops-account-menu").getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(base + "/"); await expect(page.locator("header.site-header")).toHaveCount(1);
  expect((await stateOf(page)).sessionId).toBeNull(); checks++;
  for (const path of ["/rooms", "/rooms/a101", "/my-bookings", "/login"]) { await page.goto(base + path); await expect(page.locator("header.site-header")).toHaveCount(1); checks++; }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, errors, output, font: "Space Grotesk Variable + Space Mono; self-hosted Vietnamese subsets" }));
} finally { await browser.close(); }
