import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

const base = process.env.RENTAL_QA_URL || "http://127.0.0.1:3000";
const output = ".impeccable/review/rental-pricing";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], external = []; let checks = 0, activePage;
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem("studiohub.demo.v1")));
const settle = page => page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
try {
  for (const reducedMotion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion });
    const page = await context.newPage(); activePage = page; page.on("pageerror", e => errors.push(e.message));
    page.on("request", request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(base)) external.push(request.url()); });
    await page.goto(base + "/rooms/a101"); await page.waitForSelector(".detail-layout");
    await page.locator(".demo-toggle").click(); await page.locator(".demo-panel select").first().selectOption("host");
    await page.goto(base + "/host/studios");
    const operating = page.locator('[data-operating-settings="uit"]');
    await operating.getByLabel("Chế độ hoạt động").selectOption("all_day");
    await operating.getByLabel("Bật phụ thu theo khung giờ").check();
    await operating.getByLabel("Phụ thu mỗi giờ (VND)", { exact: true }).fill("100000");
    await operating.getByRole("button", { name: "Lưu giờ hoạt động & phụ thu", exact: true }).click();
    expect((await stateOf(page)).studios[0].operatingHours.mode).toBe("all_day"); checks++;
    await page.goto(base + "/host/rates");
    const openPricing = async (tab = "Gói thuê & ekip") => {
      await page.getByRole("button", { name: "Chỉnh sửa bảng giá Daylight Studio", exact: true }).click();
      await page.getByRole("tab", { name: tab, exact: true }).click();
    };
    const savePricing = async () => {
      await page.getByRole("dialog", { name: "Chỉnh sửa bảng giá · Daylight Studio", exact: true }).getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    };
    await openPricing();
    const manager = page.locator('[data-package-manager="daylight"]');
    await manager.getByLabel("Gói đang chỉnh").selectOption("combo3");
    await manager.getByLabel("Tên gói", { exact: true }).fill("Gói chụp 3 giờ");
    await manager.getByLabel("Giá trọn gói (VND)", { exact: true }).fill("600000");
    await manager.locator("summary").filter({ hasText: "Thiết bị & dịch vụ" }).click();
    await manager.getByRole("checkbox", { name: /Đèn LED Aputure/ }).check();
    await manager.getByRole("checkbox", { name: /Softbox Light Dome/ }).check();
    await manager.getByLabel("Dịch vụ gồm trong giá (mỗi dòng một mục)").fill("Chuẩn bị phông cơ bản");
    await savePricing();
    expect((await stateOf(page)).types[0].rentalPlans.find(p => p.plan === "combo3").includedEquipment).toEqual({ light: 1, softbox: 1 }); checks++;
    await openPricing();
    await manager.getByLabel("Thiết lập giới hạn ekip và số người gồm trong giá").check();
    await manager.getByLabel("Số người gồm trong giá", { exact: true }).fill("5");
    await manager.getByLabel("Ekip tối đa cho phép").fill("10");
    await manager.getByLabel("Tính phụ thu người vượt mức").check();
    await manager.getByLabel("Phụ thu (VND)", { exact: true }).fill("50000");
    await savePricing();
    expect((await stateOf(page)).rooms[0].crewPolicy.maximum).toBe(10); checks++;
    await openPricing("Gói nổi bật");
    const featured = page.locator('[data-featured-manager="daylight"]');
    await featured.locator('[data-plan="combo3"]').filter({ has: page.getByRole("button") }).getByRole("button").click();
    await savePricing();
    await page.reload(); await expect(page.locator(".host-pricing-overview")).toBeVisible();
    expect((await stateOf(page)).rooms[0].featuredPricing.plan).toBe("combo3"); checks++;
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 }); await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); checks++;
      if (width === 390 || width === 1440) await page.locator(".host-pricing-overview").screenshot({ path: `${output}/host-${reducedMotion}-${width}.png` });
    }
    await page.goto(base + "/host/equipments");
    await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).first().click();
    const editor = page.getByRole("dialog", { name: "Thông tin thiết bị" });
    await editor.getByLabel("Mô tả công dụng").fill("Ánh sáng bổ sung cho buổi chụp và quay.");
    await editor.getByLabel("Ảnh thiết bị thật · lưu trong trình duyệt").setInputFiles({ name: "equipment.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a38sAAAAASUVORK5CYII=", "base64") });
    await editor.getByRole("button", { name: "Lưu thiết bị", exact: true }).click();
    await expect(editor).not.toBeVisible(); expect((await stateOf(page)).equipment[0].image.startsWith("data:image/png")).toBe(true); checks++;
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.sessionId = "customer"; s.bookings = []; localStorage.setItem("studiohub.demo.v1", JSON.stringify(s)); });
    await page.goto(base + "/rooms/a101");
    await expect(page.locator('[data-room-pricing="a101"] [data-featured="true"]')).toContainText("600.000");
    await expect(page.locator('[data-room-pricing="a101"] [data-featured="true"]')).toContainText("1 × Đèn LED"); checks += 2;
    expect(await page.locator("#room-equipment").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(36); checks++;
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 }); await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); checks++;
      if (width === 390 || width === 1440) await page.screenshot({ path: `${output}/room-${reducedMotion}-${width}.png`, fullPage: true });
    }
    await page.locator(".booking-card").getByRole("button", { name: /Chọn lịch thuê/ }).click();
    const dialog = page.getByRole("dialog", { name: "Đặt thuê không gian" });
    await dialog.getByRole("combobox", { name: "Hình thức thuê", exact: true }).selectOption("combo3");
    await dialog.getByLabel("Số người tham gia", { exact: true }).fill("11");
    await expect(dialog.getByRole("alert")).toContainText("Vượt giới hạn 10"); checks++;
    await dialog.getByLabel("Số người tham gia", { exact: true }).fill("8");
    await dialog.locator('button[data-date="2026-10-30"]').click();
    await dialog.locator('button[data-date="2026-10-30"]').press("ArrowLeft");
    await expect(dialog.locator('button[data-date="2026-10-29"]')).toBeFocused(); checks++;
    await dialog.locator('button[data-date="2026-10-30"]').click();
    await dialog.getByRole("button", { name: "23:00 · có thể chọn", exact: true }).click();
    await expect(dialog.getByLabel("Chi tiết giá thuê")).toContainText("1.050.000"); checks++;
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 }); await settle(page);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true); checks++;
      if (width === 390 || width === 1440) await dialog.screenshot({ path: `${output}/calendar-${reducedMotion}-${width}.png` });
    }
    // Changing date clears the old choice even when the new day is available.
    await dialog.locator('button[data-date="2026-10-31"]').click();
    await dialog.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Chọn một giờ"); checks++;
    await dialog.locator('button[data-date="2026-10-30"]').click();
    await dialog.getByRole("button", { name: "23:00 · có thể chọn", exact: true }).click();
    await dialog.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Thêm thiết bị bạn cần.", exact: true })).toBeVisible();
    await expect(dialog).toContainText("Đã bao gồm trong gói"); checks++;
    await dialog.getByRole("spinbutton", { name: "Số lượng Đèn LED Aputure 300D", exact: true }).fill("1");
    await expect(dialog.getByLabel("Chi tiết giá thuê")).toContainText("1.290.000"); checks++;
    await dialog.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Kiểm tra lần cuối.", exact: true })).toBeVisible();
    await expect(dialog).toContainText("30/10/2026, 23:00");
    await expect(dialog).toContainText("31/10/2026, 02:00"); checks += 2;
    await expect(dialog.getByLabel("Chi tiết giá thuê")).toContainText("1.290.000"); checks++;
    await dialog.getByRole("checkbox", { name: /Tôi đã kiểm tra thông tin/ }).check();
    await dialog.getByRole("button", { name: "Xác nhận & đến thanh toán", exact: true }).click();
    await expect(page).toHaveURL(/\/payment\//);
    const booking = (await stateOf(page)).bookings.at(-1);
    expect(booking.status).toBe("awaiting_payment"); expect(booking.total).toBe(1290000); expect(booking.deposit).toBe(387000); expect(booking.rentalSnapshot.totalEquipment).toEqual({ light: 2, softbox: 1 }); checks += 4;
    await page.getByRole("button", { name: "Mô phỏng thanh toán thành công", exact: true }).click();
    expect((await stateOf(page)).bookings.at(-1).status).toBe("pending"); checks++;
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.sessionId = "host"; localStorage.setItem("studiohub.demo.v1", JSON.stringify(s)); });
    await page.goto(base + "/host/studios");
    await operating.getByLabel("Chế độ hoạt động").selectOption("fixed");
    await operating.getByLabel("Giờ mở cửa", { exact: true }).fill("05:00");
    await operating.getByLabel("Giờ đóng cửa", { exact: true }).fill("22:00");
    await operating.getByRole("button", { name: "Lưu giờ hoạt động & phụ thu", exact: true }).click();
    await page.goto(base + "/host/rates");
    await openPricing();
    await manager.getByLabel("Gói đang chỉnh").selectOption("combo3");
    await manager.getByLabel("Giá trọn gói (VND)", { exact: true }).fill("650000");
    await savePricing();
    const old = (await stateOf(page)).bookings.at(-1);
    expect(old.total).toBe(1290000); expect(old.rentalSnapshot.plan.price).toBe(600000); checks += 2;
    await page.goto(base + "/rooms/a101");
    await expect(page.locator('[data-room-pricing="a101"] [data-featured="true"]')).toContainText("650.000"); checks++;
    await page.locator(".booking-card").getByRole("button", { name: /Chọn lịch thuê/ }).click();
    await dialog.getByRole("combobox", { name: "Hình thức thuê", exact: true }).selectOption("combo3");
    await expect(dialog.getByRole("button", { name: /23:00 · Thời gian thuê phải nằm trong giờ mở cửa/ })).toBeDisabled(); checks++;
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); checks++;
    await context.close();
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
  const result = { checks, pageErrors: errors, externalRequests: external, screenshots: output, persistence: "shared browser mock only", providerCalls: 0 };
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ checks, pageErrors: errors, error: error.message }));
  if (activePage && !activePage.isClosed()) { await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }); console.error((await activePage.locator("dialog").allTextContents()).map(s => s.slice(0, 300))); }
  throw error;
} finally { await browser.close(); }
