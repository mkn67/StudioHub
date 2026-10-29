import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.HELPDESK_QA_URL || "http://127.0.0.1:3001";
const output = ".impeccable/review/helpdesk-connected"; fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true }); const errors = []; let checks = 0;
try {
  for (const motion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: motion });
    const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
    await page.goto(base); await page.waitForFunction(() => !document.querySelector(".loading"));
    const launcher = page.getByRole("button", { name: "Trò chuyện với StudioHub AI", exact: true });
    const panel = page.locator("#studiohub-helpdesk"), input = panel.getByLabel("Tin nhắn của bạn", { exact: true });
    await launcher.click(); await expect(input).toBeFocused(); checks++;
    await expect(panel.getByText("Kênh PHP Helpdesk", { exact: true })).toBeVisible(); checks++;
    await input.fill("Khoảng đệm có miễn phí không?"); await input.press("Enter");
    await expect(panel.getByRole("alert")).toContainText("Cổng AI chưa được cấu hình"); checks++;
    await expect(panel.getByText("Chưa sẵn sàng", { exact: true })).toBeVisible(); checks++;
    await input.fill("Đơn SH-123 của tôi đã xác nhận chưa?"); await input.press("Enter");
    await expect(panel.getByRole("log").locator("article").last()).toContainText("chưa có API tra cứu"); checks++;
    await panel.getByRole("button", { name: "Xóa cuộc trò chuyện", exact: true }).click();
    await expect(panel.getByRole("log").locator("article")).toHaveCount(1); checks++;
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      await page.waitForTimeout(280);
      const box = await panel.boundingBox(); if (!box || box.x < -1 || box.x + box.width > width + 1) throw new Error("panel overflow " + width);
      await page.screenshot({ path: output + "/" + motion + "-" + width + ".png" }); checks++;
    }
    await input.fill("/handoff"); await input.press("Enter");
    await expect(panel.getByRole("log").locator("article").last()).toContainText("Chưa có nhân viên tiếp nhận"); checks++;
    await expect(input).toBeDisabled(); checks++;
    await page.waitForTimeout(5300); // actual server history poll
    await expect(panel.getByRole("log").locator("article").last()).toContainText("Chưa có nhân viên tiếp nhận"); checks++;
    await input.evaluate(node => node.closest("dialog").dispatchEvent(new Event("cancel", { cancelable: true })));
    await expect(panel).not.toBeVisible(); await expect(launcher).toBeFocused(); checks++;
    await launcher.click(); await expect(panel.getByRole("log")).toContainText("Chưa có nhân viên tiếp nhận"); checks++;
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, pageErrors: errors, screenshots: output, provider: "not configured; honest error, private-data refusal and real PHP handoff verified" }));
} finally { await browser.close(); }
