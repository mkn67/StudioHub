import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.UI_QA_URL || "http://127.0.0.1:3003";
const out = new URL("../.impeccable/footer/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [];
try {
 for (const reducedMotion of ["reduce", "no-preference"]) for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/");
  const footer = page.locator(".public-footer");
  await expect(footer).toBeVisible(); await page.evaluate(() => document.fonts.ready);
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toContainText("Tìm kiếm Studio phù hợp với nhu cầu.");
  await expect(footer).not.toContainText("123 Đường Lê Văn Việt");
  await expect(footer).toHaveCSS("background-color", "rgb(220, 238, 242)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const height = await footer.evaluate(e => e.getBoundingClientRect().height);
  if (width >= 1280) { expect(height).toBeGreaterThanOrEqual(150); expect(height).toBeLessThanOrEqual(220); }
  const launcher = page.getByRole("button", { name: "Trò chuyện với StudioHub AI", exact: true });
  await expect(launcher).toBeVisible();
  const collisions = await footer.evaluate(node => {
    const launcher = document.querySelector('button[aria-controls="studiohub-helpdesk"]');
    if (!launcher) throw Error("Helpdesk launcher missing");
    const button = launcher.getBoundingClientRect();
    const tag = launcher.querySelector("span")?.getBoundingClientRect();
    const floating = { left: Math.min(button.left, tag?.left ?? button.left), right: Math.max(button.right, tag?.right ?? button.right), top: Math.min(button.top, tag?.top ?? button.top), bottom: button.bottom };
    return [...node.querySelectorAll("a, summary, span")].filter(e => e.getClientRects().length).filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left < floating.right && r.right > floating.left && r.top < floating.bottom && r.bottom > floating.top;
    }).map(e => e.textContent);
  });
  expect(collisions).toEqual([]);
  await footer.getByText("Chính sách khác", { exact: true }).click();
  await expect(footer.getByRole("link", { name: "Dữ liệu cá nhân", exact: true })).toBeVisible();
  const links = await footer.locator("a").evaluateAll(nodes => nodes.map(n => n.getAttribute("href")).sort());
  expect(links).toEqual(["/", "/rooms", "/about", "/register/host", "/policies/privacy", "/policies/terms", "/policies/cookies", "/policies/personal-data", "/policies/disclaimer"].sort());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await footer.getByText("Chính sách khác", { exact: true }).click();
  const focused = footer.getByRole("link", { name: "Điều khoản sử dụng", exact: true });
  await focused.focus(); await expect(focused).toBeFocused();
  expect(await focused.evaluate(n => parseFloat(getComputedStyle(n).outlineWidth))).toBeGreaterThanOrEqual(3);
  await footer.screenshot({ path: new URL(`footer-${width}-${reducedMotion}.png`, out).pathname.replace(/^\/(\w:)/, "$1") });
  results.push({ width, reducedMotion, height, collisions }); await context.close();
 }
 const page = await browser.newPage();
 for (const [slug, title] of [["privacy", "Chính sách bảo mật"], ["terms", "Điều khoản sử dụng"], ["cookies", "Chính sách cookie"], ["personal-data", "Chính sách xử lý dữ liệu cá nhân"], ["disclaimer", "Chính sách miễn trừ trách nhiệm"]]) {
  await page.goto(base + "/policies/" + slug); await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
 }
 await page.goto(base + "/policies/privacy");
 const footer = page.locator(".public-footer");
 await footer.getByRole("link", { name: "Khám phá Studio", exact: true }).click(); await page.waitForURL("**/rooms");
 await footer.getByRole("link", { name: "Trở thành đối tác", exact: true }).click(); await page.waitForURL("**/register/host");
 await expect(page.locator(".public-footer")).toHaveCount(0);
 await page.goto(base + "/register");
 await expect(page.locator('a[href="/policies/privacy"]')).toHaveCount(1);
 await expect(page.locator('a[href="/policies/terms"]')).toHaveCount(1);
 expect(errors).toEqual([]);
 const before = JSON.parse(await readFile(new URL("before.json", out), "utf8").catch(() => "[]"));
 await writeFile(new URL("results.json", out), JSON.stringify({ results, errors, before, verifiedPolicyRoutes: 5, api: "read-only local HTTP; no authentication or booking mutations" }, null, 2));
 console.log(JSON.stringify({ passed: results.length, errors, heights: results.filter(r => r.reducedMotion === "reduce").map(({ width, height }) => ({ width, height })), before }, null, 2));
} catch (e) { console.error(JSON.stringify({ results, errors }, null, 2)); throw e; }
finally { await browser.close(); }
