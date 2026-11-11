import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.UI_QA_URL || "http://127.0.0.1:3003";
const out = new URL("../.impeccable/about/", import.meta.url); await mkdir(out, { recursive: true });
const browser = await chromium.launch(); const checks = [], errors = [], footerHeights = [];
async function routeAPI(context, role = null) {
  await context.route("**/api/rest/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/profile")) return route.fulfill({ status: role ? 200 : 401, json: role ? { status: "success", data: { user_id: 101, role, full_name: "Synthetic QA", email: "qa@example.test", phone: null } } : { status: "error", message: "Chưa đăng nhập" } });
    return route.fulfill({ json: { status: "success", data: path.endsWith("/rooms") ? { items: [], pagination: { total_items: 0, total_pages: 1 } } : [] } });
  });
}
async function goToAbout(page) {
  const desktop = page.locator('.public-nav a[href="/about"]');
  if (await desktop.isVisible()) await desktop.click();
  else { await page.getByRole("button", { name: "Mở điều hướng", exact: true }).click(); await page.getByRole("navigation", { name: "Điều hướng di động" }).getByRole("link", { name: "Về chúng tôi", exact: true }).click(); }
  await page.waitForURL("**/about");
}
try {
 for (const reducedMotion of ["reduce", "no-preference"]) for (const width of [360, 390, 768, 1024, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion }); await routeAPI(context);
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  const aboutRequests = []; let aboutPhase = true;
  page.on("request", request => { if (aboutPhase && /\/api\//.test(request.url()) && !request.url().endsWith("/auth/profile")) aboutRequests.push(request.url()); });
  await page.goto(base + "/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đằng sau StudioHub là ai?");
  await expect(page.locator("[data-team-member]")).toHaveCount(5);
  await expect(page.locator("[data-team-member] h3")).toHaveText([1, 2, 3, 4, 5].map(n => `Thành viên ${n}`));
  await expect(page.locator("[data-team-member] a, [data-team-member] img")).toHaveCount(0);
  await expect(page.locator("[data-team-member]").first()).not.toContainText("MSSV");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-team-grid]").scrollIntoViewIfNeeded();
  if (reducedMotion === "no-preference") await page.waitForTimeout(1000);
  await expect.poll(() => page.locator("[data-team-member]").last().evaluate(n => getComputedStyle(n).opacity)).toBe("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cards = await page.locator("[data-team-member]").evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, width: r.width }; }));
  if (width >= 1024) { expect(Math.abs(cards[0].y - cards[2].y)).toBeLessThan(2); expect(Math.abs(cards[3].y - cards[4].y)).toBeLessThan(2); expect(cards[3].y).toBeGreaterThan(cards[0].y); expect(Math.abs((cards[3].x + cards[4].right) / 2 - width / 2)).toBeLessThan(3); }
  else if (width === 768) { expect(Math.abs(cards[0].y - cards[1].y)).toBeLessThan(2); expect(cards[2].y).toBeGreaterThan(cards[0].y); }
  else for (let i = 1; i < 5; i++) expect(cards[i].y).toBeGreaterThan(cards[i - 1].y);
  const active = page.locator('.public-nav a[href="/about"]');
  await expect(active).toHaveAttribute("aria-current", "page");
  await expect(active).toHaveCSS("text-decoration-line", "none");
  if (await active.isVisible()) { await expect(page.locator(".public-nav .motion-active-indicator")).toHaveCSS("opacity", "1"); await active.focus(); expect(await active.evaluate(n => parseFloat(getComputedStyle(n).outlineWidth))).toBeGreaterThanOrEqual(2); }
  expect(aboutRequests).toEqual([]);
  const footer = page.locator(".public-footer"); await expect(footer.getByRole("link", { name: "Về chúng tôi", exact: true })).toHaveAttribute("href", "/about");
  footerHeights.push({ width, reducedMotion, height: await footer.evaluate(n => n.getBoundingClientRect().height) });
  await footer.getByText("Chính sách khác", { exact: true }).click();
  await expect(footer.getByRole("link", { name: "Dữ liệu cá nhân", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await footer.getByText("Chính sách khác", { exact: true }).click();
  if (width === 1440) expect(await footer.evaluate(n => n.getBoundingClientRect().height)).toBeLessThanOrEqual(240);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: new URL(`about-${width}-${reducedMotion}.png`, out).pathname.replace(/^\/(\w:)/, "$1"), fullPage: true });
  aboutPhase = false;
  await page.locator(".public-header .brand").click(); await page.waitForURL(base + "/");
  await goToAbout(page);
  await page.locator('.public-footer a[href="/rooms"]').click(); await page.waitForURL("**/rooms");
  await page.locator('.public-footer a[href="/about"]').click(); await page.waitForURL("**/about");
  await page.locator('.public-footer a[href="/policies/terms"]').click(); await page.waitForURL("**/policies/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Điều khoản sử dụng");
  checks.push(`${width}px ${reducedMotion}: public static page, five placeholders, avatar fallback, layout, active indicator, header/mobile/footer navigation, legal route`);
  await context.close();
 }
 for (const role of ["customer", "host", "admin"]) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 }, reducedMotion: "reduce" }); await routeAPI(context, role);
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/about"); await expect(page.locator("[data-team-member]")).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (role === "customer") await expect(page.getByRole("button", { name: "Menu tài khoản khách hàng", exact: true })).toBeVisible();
  else { const href = `/${role}`; if (await page.locator(`.public-nav a[href="${href}"]`).isVisible()) await expect(page.locator(`.public-nav a[href="${href}"]`)).toBeVisible(); else { await page.getByRole("button", { name: "Mở điều hướng", exact: true }).click(); await expect(page.locator(`.mobile-nav a[href="${href}"]`)).toBeVisible(); } }
  checks.push(`${role}: public About and existing account/role navigation preserved`); await context.close();
 }
 expect(errors).toEqual([]);
 await writeFile(new URL("results.json", out), JSON.stringify({ checks, errors, footerHeights, teamDataRequests: 0, realNamesOrContactsProvided: false, authentication: "fixtures only; no auth mutations" }, null, 2));
 console.log(JSON.stringify({ passed: checks.length, errors, footerHeights }, null, 2));
} catch (e) { console.error(JSON.stringify({ checks, errors }, null, 2)); throw e; }
finally { await browser.close(); }
