import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

const base = process.env.HELPDESK_QA_URL ?? "http://127.0.0.1:3001";
const output = ".impeccable/review/helpdesk";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], checks = [];
try {
  for (const reducedMotion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const external = [];
    page.on("request", request => { if (!request.url().startsWith(base) && /^https?:/.test(request.url())) external.push(request.url()); });
    const settle = async () => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.allSettled(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished));
      });
    };
    const go = async route => {
      await page.goto(base + route);
      await page.waitForFunction(() => !document.querySelector(".loading"));
      await settle();
    };
    const launcher = page.getByRole("button", { name: "Trò chuyện với StudioHub AI", exact: true });
    const panel = page.locator("#studiohub-helpdesk");
    const log = panel.getByRole("log");
    const input = panel.getByLabel("Tin nhắn của bạn", { exact: true });
    const send = async text => {
      await input.fill(text); await input.press("Enter");
      await expect(log.locator("article").last()).toContainText("StudioHub AI");
    };
    await go("/");
    const initialStorage = await page.evaluate(() => JSON.stringify(localStorage));
    await expect(launcher).toBeVisible(); await launcher.click();
    await expect(panel).toBeVisible(); await expect(input).toBeFocused();
    await expect(panel.getByText("Chế độ demo", { exact: true })).toBeVisible();
    await expect(log).toContainText("Xin chào!");
    await expect(panel.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled();
    await input.fill("   "); await input.press("Enter"); await expect(log.locator("article")).toHaveCount(1);
    await panel.getByRole("button", { name: "Làm sao để đặt Studio?", exact: true }).click();
    await expect(log.locator("article").last()).toContainText("chờ Chủ Studio duyệt");
    await send("Đơn của tôi đã được xác nhận chưa?");
    await expect(log.locator("article").last()).toContainText("chưa kết nối API");
    await send("Ngày mai còn phòng trống không?");
    await expect(log.locator("article").last()).toContainText("không thể xác nhận");
    await send("Tạo ticket giúp tôi");
    await expect(log.locator("article").last()).toContainText("Chưa có yêu cầu hỗ trợ nào được gửi hoặc lưu");
    await send("Hoàn tiền cho tôi ngay");
    await expect(log.locator("article").last()).toContainText("Chưa có thay đổi nào");
    await send("Bạn dự đoán thời tiết?");
    await expect(log.locator("article").last()).toContainText("chưa có câu trả lời đã được kiểm chứng");
    await input.fill("Dòng một"); await input.press("Shift+Enter"); await input.press("a");
    await expect(input).toHaveValue("Dòng một\na"); await input.fill("");
    await send("a".repeat(1000));
    await expect.poll(() => log.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    await expect.poll(() => log.evaluate(node => Math.abs(node.scrollHeight - node.scrollTop - node.clientHeight))).toBeLessThan(3);
    await expect(panel.locator("article").last()).toBeVisible();
    await page.keyboard.press("Escape"); await expect(panel).not.toBeVisible(); await expect(launcher).toBeFocused();
    await launcher.click(); await expect(log).toContainText("Tạo ticket giúp tôi");
    for (const width of [360, 390, 768, 1024, 1440]) {
      await settle(); await page.setViewportSize({ width, height: 844 }); await settle();
      await expect(panel).toBeVisible();
      const bounds = await panel.boundingBox();
      if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > width + 1 || bounds.y + bounds.height > 845) throw new Error(`Panel outside viewport at ${width}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await panel.evaluate(node => node.matches(":modal"))).toBe(width < 640);
      const composer = await input.boundingBox();
      expect(composer.y + composer.height).toBeLessThanOrEqual(bounds.y + bounds.height);
      if (width < 640) for (let i = 0; i < 18; i++) {
        await page.keyboard.press("Tab");
        const focus = await panel.evaluate(node => ({ inside: node.contains(document.activeElement), element: document.activeElement?.outerHTML.slice(0, 180) }));
        expect(focus.inside, `Focus at ${width}, tab ${i}: ${focus.element}`).toBe(true);
      }
      await log.evaluate(node => { node.scrollTop = 0; });
      await page.screenshot({ path: `${output}/chat-${reducedMotion}-${width}.png` });
    }
    for (const viewport of [{ width: 390, height: 480 }, { width: 390, height: 320 }, { width: 1024, height: 400 }]) {
      await settle(); await page.setViewportSize(viewport); await settle();
      const shortBounds = await input.boundingBox(), panelBounds = await panel.boundingBox();
      expect(shortBounds.y + shortBounds.height).toBeLessThanOrEqual(panelBounds.y + panelBounds.height);
      expect(shortBounds.y + shortBounds.height).toBeLessThanOrEqual(viewport.height);
    }
    await panel.getByRole("button", { name: "Đóng trò chuyện", exact: true }).click(); await expect(panel).not.toBeVisible();
    // Existing public booking dialog must retain top-layer priority.
    await settle(); await page.setViewportSize({ width: 390, height: 844 });
    await go("/rooms/a102");
    const bar = page.locator(".mobile-booking-bar");
    const launcherBounds = await launcher.boundingBox(), barBounds = await bar.boundingBox();
    expect(launcherBounds.y + launcherBounds.height).toBeLessThanOrEqual(barBounds.y);
    await page.getByRole("button", { name: "Chọn lịch thuê", exact: true }).first().click();
    await expect(page.locator("dialog:modal:not(#studiohub-helpdesk)")).toHaveCount(1);
    expect(await launcher.evaluate(node => {
      const box = node.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === node;
    })).toBe(false);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog:modal:not(#studiohub-helpdesk)")).toHaveCount(0);
    await page.getByRole("button", { name: "Mở ảnh 1", exact: true }).click();
    await expect(page.locator("dialog:modal:not(#studiohub-helpdesk)")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog:modal:not(#studiohub-helpdesk)")).toHaveCount(0);
    await launcher.click();
    await panel.getByRole("button", { name: "Tôi muốn tìm phòng phù hợp", exact: true }).click();
    await log.getByRole("link", { name: "Khám phá và lọc phòng" }).click();
    await page.waitForURL("**/rooms"); await expect(panel).toBeVisible();
    await expect(log).toContainText("Tôi muốn tìm phòng phù hợp");
    await expect(log.locator("article")).toHaveCount(3);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(initialStorage);
    expect(external).toEqual([]);
    for (let i = 0; i < 28; i++) await send(`Câu hỏi ngoài phạm vi ${i}`);
    await expect(log.locator("article")).toHaveCount(59);
    await input.fill("Thêm một câu hỏi"); await input.press("Enter");
    await expect(panel.getByRole("alert")).toContainText("Đã đạt giới hạn");
    await expect(log.locator("article")).toHaveCount(59);
    await panel.getByRole("button", { name: "Xóa cuộc trò chuyện" }).click();
    await expect(log.locator("article")).toHaveCount(1);
    await expect(panel.getByRole("alert")).toHaveCount(0);
    await panel.getByRole("button", { name: "Đóng trò chuyện", exact: true }).click();
    await expect(panel).not.toBeVisible(); await page.reload(); await launcher.click();
    await expect(log.locator("article")).toHaveCount(1);
    checks.push(`${reducedMotion}: interaction, safe FAQ, keyboard, 5 widths, short viewport, modal priority, route persistence, no network/storage mutation`);
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, errors }, null, 2));
  fs.writeFileSync(`${output}/results.json`, JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ errors, checks }, null, 2));
  throw error;
} finally { await browser.close(); }
