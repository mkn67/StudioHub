import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
const output = ".impeccable/review/helpdesk-response";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
let scenarios = 0;
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    const id = randomUUID(), history = [];
    const markdown = "## Thông tin phòng\n\n**Studio Ánh Sáng**\n\n- Sức chứa: 4 người\n- Tiện ích: ánh sáng tự nhiên\n\n**Giá thuê tham khảo**\n\n1. Xem bảng giá\n2. Chọn lịch thuê\n\n" + "Nội dung tiếng Việt dài cần xuống dòng tự nhiên. ".repeat(25) + "\n\n" + "a".repeat(250) + "\n\n[Nguồn](https://example.com) [không an toàn](javascript:alert%281%29)\n\n<script>window.__injected=true</script>\n\n**Kết thúc nội dung**";
    await page.route("**/api/rest/**", route => {
      const profile = route.request().url().includes("/auth/profile");
      return route.fulfill({ json: { status: "success", data: profile
        ? { user_id: 1, role: "customer", full_name: "QA", email: "qa@example.test", phone: null }
        : route.request().url().includes("/rooms") ? { items: [], total_items: 0, page: 1, total_pages: 1 } : [] } });
    });
    await page.route("**/api/helpdesk/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/current")) return route.fulfill({ json: { status: "success", data: { conversation: history.length ? { id, state: "bot_active" } : null, messages: history } } });
      if (path.endsWith("/conversations")) return route.fulfill({ json: { status: "success", data: { conversation: { id } } } });
      const { text } = route.request().postDataJSON();
      if (text === "Lỗi") return route.fulfill({ status: 503, json: { status: "error", errors: [{ code: "provider_unavailable" }] } });
      const response = { text: text === "Liên hệ" ? "**Liên hệ Studio để được hỗ trợ**\n\nBạn có thể liên hệ trực tiếp." : markdown,
        mode: "connected", state: "answered", sources: [{ title: "Nguồn đã duyệt", reference: "QA policy" }],
        ...(text === "Liên hệ" ? { contactFallback: { reason: "explicit_contact_request", status: "available", studioId: 3, studioName: "Studio Ánh Sáng", roomId: 12, publicPhone: "+84901234567", publicEmail: "public@example.test" } } : {}) };
      history.push({ id: randomUUID(), role: "user", text, createdAt: new Date().toISOString() },
        { id: randomUUID(), role: "assistant", text: response.text, response, createdAt: new Date().toISOString() });
      return route.fulfill({ json: { status: "success", data: { response } } });
    });
    await page.goto(process.env.HELPDESK_QA_URL ?? "http://localhost:3000");
    const launcher = page.getByRole("button", { name: "Mở hỗ trợ StudioHub", exact: true });
    await expect(launcher).toContainText("Hỗ trợ");
    const icon = launcher.locator("svg");
    await expect(icon).toBeVisible();
    const { b, i } = await launcher.evaluate(n => ({ b: n.querySelector("span").getBoundingClientRect().toJSON(), i: n.querySelector("svg").getBoundingClientRect().toJSON() }));
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    expect(b.y + b.height).toBeLessThanOrEqual(i.y);
    await page.screenshot({ path: `${output}/launcher-${width}.png` });
    await launcher.click();
    const panel = page.locator("#studiohub-helpdesk"), input = panel.locator("textarea"), log = panel.getByRole("log");
    await expect(input).toBeEnabled();
    await input.fill("Tóm tắt phòng"); await input.press("Enter");
    await expect(log.locator("h2")).toHaveText("Thông tin phòng");
    await expect(log.locator("ul").first().locator("li")).toHaveCount(2);
    await expect(log.locator("ol li")).toHaveCount(2);
    await expect(log.locator("script, iframe, img, a[href^='javascript:']")).toHaveCount(0);
    expect(await page.evaluate(() => window.__injected)).toBeUndefined();
    expect(await log.evaluate(n => n.scrollWidth <= n.clientWidth + 1)).toBeTruthy();
    const end = log.getByText("Kết thúc nội dung", { exact: true });
    await end.scrollIntoViewIfNeeded();
    const endBox = await end.boundingBox(), inputBox = await input.boundingBox();
    expect(endBox.y + endBox.height).toBeLessThan(inputBox.y);
    await page.screenshot({ path: `${output}/markdown-${width}.png` });
    await input.fill("Liên hệ"); await input.press("Enter");
    await expect(log.locator('a[href="tel:+84901234567"]')).toBeVisible();
    await expect(log.locator('a[href="mailto:public%40example.test"]')).toBeVisible();
    await expect(log.locator('a[href="/rooms/12"]')).toBeVisible();
    await page.screenshot({ path: `${output}/contact-${width}.png` });
    await page.reload(); await launcher.click();
    await expect(log.locator('a[href="tel:+84901234567"]')).toBeVisible();
    await expect(log.getByText("Nguồn đã duyệt")).toHaveCount(2);
    await input.fill("Lỗi"); await input.press("Enter");
    await expect(panel.getByRole("alert")).toContainText("Nhà cung cấp AI chưa sẵn sàng");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    scenarios++; await context.close();
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ scenarios, widths: [390, 1440], markdown: true, safeLinks: true, overflow: false, launcher: true, contacts: true, history: true, providerError: true, pageErrors: errors, backend: "fixtures" }));
} catch (error) { console.error(JSON.stringify({ pageErrors: errors })); throw error; } finally { await browser.close(); }
