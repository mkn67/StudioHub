import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

// Exercise the real widget with HTTP responses held until each assertion finishes.
// No PHP, model calls, business writes, or test-only application routes are needed.
const base = process.env.HELPDESK_QA_URL ?? "http://localhost:3000";
const output = ".impeccable/review/helpdesk-ux";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const pageErrors = [];
let scenarios = 0;
try {
  for (const width of [1440, 390]) for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(error.message));
    let release, requests = 0;
    const submitted = [];
    await page.route("**/api/helpdesk/**", async route => {
      if (route.request().url().endsWith("/conversations")) {
        await route.fulfill({ json: { status: "success", data: { conversation: { id: "11111111-1111-4111-8111-111111111111" } } } });
        return;
      }
      requests++;
      submitted.push(route.request().postDataJSON());
      const fail = await new Promise(resolve => { release = resolve; });
      await route.fulfill({ status: fail ? 503 : 200, json: fail
        ? { status: "error", errors: [{ code: "provider_unavailable" }] }
        : { status: "success", data: { response: { text: "Phản hồi kiểm thử", mode: "connected", state: "answered", sources: [] } } } });
    });
    await page.goto(base);
    const launcher = page.getByRole("button", { name: "Trò chuyện với StudioHub AI", exact: true });
    const panel = page.locator("#studiohub-helpdesk");
    await launcher.click();
    const input = panel.getByLabel("Tin nhắn của bạn", { exact: true });
    const log = panel.getByRole("log");
    const send = panel.getByRole("button", { name: "Gửi tin nhắn", exact: true });
    const typing = log.locator('[class*="typingBubble"]');
    await expect(input).toBeFocused();
    await input.fill("   "); await input.press("Enter");
    expect(requests).toBe(0); await expect(send).toBeDisabled();
    await input.fill("Dòng một"); await input.press("Shift+Enter"); await input.press("a");
    await expect(input).toHaveValue("Dòng một\na");
    const samples = ["a", "Xin chào", "Đây là đoạn tiếng Việt dài để kiểm tra xuống dòng tự nhiên. ".repeat(10), "https://example.com/" + "a".repeat(800), "Dòng một\nDòng hai\nDòng ba\nDòng bốn"];
    let smallWidth;
    for (const [index, text] of samples.entries()) {
      await input.fill(text);
      const expandedHeight = await input.evaluate(node => node.getBoundingClientRect().height);
      const before = requests;
      if (index === 0) await send.click(); else await input.press("Enter");
      await expect(input).toHaveValue("");
      expect(await input.getAttribute("placeholder")).toBe("Bạn muốn tìm hiểu điều gì?");
      await expect(typing).toHaveCount(1);
      await expect(typing.locator("span")).toHaveCount(3);
      await expect(page.getByRole("status")).toHaveText("StudioHub AI đang nhập phản hồi");
      await expect.poll(() => requests).toBe(before + 1);
      await input.press("Enter"); await input.press("Enter");
      expect(requests).toBe(before + 1);
      const bubble = log.locator("article").last();
      await expect(bubble.locator("p").first()).toHaveText(text);
      const bounds = await bubble.boundingBox();
      const logSize = await log.evaluate(node => ({ width: node.clientWidth - 24, right: node.getBoundingClientRect().right - 12 }));
      expect(bounds.width).toBeLessThanOrEqual(logSize.width * .85 + 1);
      expect(Math.abs(bounds.x + bounds.width - logSize.right)).toBeLessThan(3);
      expect(await log.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      expect(await bubble.locator("p").first().evaluate(node => getComputedStyle(node).whiteSpace)).toBe("pre-wrap");
      if (index === 0) { smallWidth = bounds.width; expect(smallWidth).toBeLessThan(85); }
      if (index === 1) expect(bounds.width).toBeGreaterThan(smallWidth);
      if (index === 4) expect(await input.evaluate(node => node.getBoundingClientRect().height)).toBeLessThan(expandedHeight);
      expect(await typing.locator("span").first().evaluate(node => getComputedStyle(node).animationName) === "none").toBe(reducedMotion === "reduce");
      expect(await typing.evaluate(node => node.getBoundingClientRect().width)).toBeLessThan(80);
      await expect.poll(() => log.evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(3);
      if (index === 3) {
        await log.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
        await expect.poll(() => log.evaluate(node => node.scrollTop)).toBe(0);
      }
      if (index === 0) await page.screenshot({ path: `${output}/pending-${width}-${reducedMotion}.png` });
      release(false);
      await expect(typing).toHaveCount(0);
      await expect(log.locator("article").last()).toContainText("Phản hồi kiểm thử");
      await expect(log.locator("article")).toHaveCount(1 + (index + 1) * 2);
      if (index === 3) {
        expect(await log.evaluate(node => node.scrollTop)).toBe(0);
        await log.evaluate(node => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event("scroll")); });
      }
    }
    // Failure keeps the outgoing message and lets the user retry with the same
    // adapter idempotency key, without replacing a newly typed draft.
    await input.fill("Tin nhắn cần thử lại"); await input.press("Enter");
    await expect(typing).toHaveCount(1);
    await expect.poll(() => submitted.at(-1)?.text).toBe("Tin nhắn cần thử lại");
    const failedKey = submitted.at(-1).clientMessageId;
    await input.fill("Bản nháp mới"); release(true);
    await expect(typing).toHaveCount(0); await expect(panel.getByRole("alert")).toBeVisible();
    await expect(input).toHaveValue("Bản nháp mới");
    const count = await log.locator("article").count();
    await panel.getByRole("button", { name: "Thử lại tin nhắn", exact: true }).click();
    await expect(typing).toHaveCount(1);
    await expect.poll(() => requests).toBe(7);
    expect(submitted.at(-1).clientMessageId).toBe(failedKey);
    await expect(log.locator("article")).toHaveCount(count);
    await expect(input).toHaveValue("Bản nháp mới"); release(false);
    await expect(typing).toHaveCount(0);
    await expect(log.locator("article")).toHaveCount(count + 1);
    await expect(input).toHaveValue("Bản nháp mới");
    // Suggested questions use the same acceptance/reset path.
    await panel.getByRole("button", { name: "Làm sao để đặt Studio?", exact: true }).click();
    await expect(input).toHaveValue("");
    await expect.poll(() => requests).toBe(8); release(false);
    await expect(typing).toHaveCount(0);
    await input.focus();
    await page.keyboard.press("Escape"); await expect(panel).not.toBeVisible();
    await expect(launcher).toBeFocused(); await launcher.click();
    await expect(input).toBeFocused(); await expect(log.locator("article")).toHaveCount(count + 3);
    if (width < 640) for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await panel.evaluate(node => node.contains(document.activeElement))).toBe(true);
    }
    const panelBounds = await panel.boundingBox();
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(width);
    expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({ path: `${output}/complete-${width}-${reducedMotion}.png` });
    if (width === 1440 && reducedMotion === "no-preference") {
      // A rejected submission must preserve the draft and make no HTTP request.
      for (let i = 0; i < 22; i++) {
        await input.fill(`Tin kiểm tra giới hạn ${i}`); await input.press("Enter");
        await expect.poll(() => requests).toBe(9 + i); release(false);
        await expect(typing).toHaveCount(0);
      }
      await expect(log.locator("article")).toHaveCount(59);
      await input.fill("Giữ nguyên bản nháp này"); await input.press("Enter");
      await expect(panel.getByRole("alert")).toContainText("Đã đạt giới hạn");
      await expect(input).toHaveValue("Giữ nguyên bản nháp này");
      expect(requests).toBe(30);
      await panel.getByRole("button", { name: "Xóa cuộc trò chuyện", exact: true }).click();
      await expect(log.locator("article")).toHaveCount(1);
      // Exercise the existing abort timeout without a real 70-second wait.
      await page.clock.install();
      await input.fill("Tin bị quá hạn"); await input.press("Enter");
      await expect.poll(() => requests).toBe(31);
      await expect(typing).toHaveCount(1);
      await page.clock.runFor(70001);
      await expect(typing).toHaveCount(0);
      await expect(panel.getByRole("button", { name: "Thử lại tin nhắn", exact: true })).toBeVisible();
      await expect(log.locator("article")).toHaveCount(2);
      await expect(log.locator("article").last()).toContainText("Tin bị quá hạn");
      release(true);
    }
    scenarios++;
    await context.close();
  }
  expect(pageErrors).toEqual([]);
  console.log(JSON.stringify({ scenarios, pageErrors, screenshots: output, checks: "content sizing/wrapping/alignment, click/Enter/Shift+Enter, immediate reset/height, duplicate guard, failure/retry/idempotency/draft, suggestions, typing lifecycle, scroll intent, reduced motion, focus/modal, desktop/mobile" }));
} finally { await browser.close(); }
