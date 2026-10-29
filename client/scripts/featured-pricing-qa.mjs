import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.FEATURED_PRICING_QA_URL || "http://localhost:3000";
const output = ".impeccable/review/featured-pricing";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = []; let checks = 0;
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem("studiohub.demo.v1")));
const settle = page => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.allSettled(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished));
});
try {
  for (const reducedMotion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({ viewport: { width:1440, height:1000 }, reducedMotion });
    const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/rooms/a101"); await page.waitForFunction(() => !document.querySelector(".loading"));
    await page.locator(".demo-toggle").click();
    await page.locator(".demo-panel select").first().selectOption("host");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("studiohub.demo.v1") || "{}").sessionId === "host");
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.rooms.find(r => r.id === "a102").rateOverride = 420000; s.bookings = []; localStorage.setItem("studiohub.demo.v1",JSON.stringify(s)); });
    await page.goto(base + "/host/rates");
    const manager = page.locator('[data-featured-manager="daylight"]');
    await expect(manager).toBeVisible();
    const chooseRoom = manager.getByRole("combobox", { name:"Phòng nổi bật · daylight" });
    const chooseBadge = manager.getByRole("combobox", { name:"Nhãn nổi bật · daylight" });
    const rate = plan => manager.locator('[data-plan="' + plan + '"]').filter({ has:page.getByRole("button") });
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(0); checks++;
    await expect(chooseBadge.locator("option")).toHaveCount(2); checks++;
    await rate("combo3").getByRole("button").click();
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(1);
    await expect(manager.getByLabel("Xem trước gói nổi bật phòng A101")).toContainText("Gói nổi bật"); checks += 2;
    await rate("combo5").getByRole("button").click(); await chooseBadge.selectOption("recommended");
    await expect(rate("combo5").getByRole("button")).toHaveAttribute("aria-pressed","true");
    await expect(manager.getByLabel("Xem trước gói nổi bật phòng A101")).toContainText("Host đề xuất"); checks += 2;
    await chooseRoom.selectOption("a102");
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(0); checks++;
    await rate("combo3").getByRole("button").click();
    await expect(manager.getByLabel("Xem trước gói nổi bật phòng A102")).toContainText("1.260.000"); checks++;
    await chooseRoom.selectOption("a101");
    await expect(rate("combo5").getByRole("button")).toHaveAttribute("aria-pressed","true"); checks++;
    await manager.getByRole("button",{name:"Bỏ nổi bật",exact:true}).click();
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(0); checks++;
    await rate("combo3").getByRole("button").click();
    await page.reload();
    await expect(rate("combo3").getByRole("button")).toHaveAttribute("aria-pressed","true"); checks++;
    const selected = await stateOf(page);
    expect(selected.types.find(t => t.id === "daylight").hourlyRate).toBe(350000); expect(selected.bookings).toEqual([]); checks += 2;
    for (const width of [360,390,768,1024,1440]) {
      await page.setViewportSize({width,height:1000}); await settle(page);
      await manager.scrollIntoViewIfNeeded(); await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); checks++;
      await manager.screenshot({path:output + "/host-" + reducedMotion + "-" + width + ".png"});
    }
    await page.goto(base + "/rooms/a101");
    const prices = page.locator('[data-room-pricing="a101"]');
    await expect(prices.locator('[data-featured="true"]')).toHaveCount(1);
    await expect(prices.locator('[data-featured="true"]')).toContainText("Host đề xuất");
    await expect(prices.locator('[data-featured="true"]')).toContainText("1.050.000");
    await expect(page.locator(".booking-card .price-large")).toContainText("350.000"); checks += 4;
    for (const width of [360,390,768,1024,1440]) {
      await page.setViewportSize({width,height:1000}); await settle(page);
      await prices.scrollIntoViewIfNeeded(); await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); checks++;
      const bounds = await prices.boundingBox();
      for (const amount of await prices.locator("strong").all()) {
        const box = await amount.boundingBox(); expect(box.x).toBeGreaterThanOrEqual(bounds.x-1); expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1); checks += 2;
      }
      await prices.screenshot({path:output + "/prices-" + reducedMotion + "-" + width + ".png"});
      if(width===390||width===1440)await page.screenshot({path:output + "/room-" + reducedMotion + "-" + width + ".png",fullPage:true});
      if(width<640){await expect(page.locator(".mobile-booking-bar")).toBeVisible();checks++;}
      if(width>=1024){expect(await page.locator(".booking-card").evaluate(el => getComputedStyle(el).position)).toBe("sticky");checks++;}
    }
    await page.goto(base + "/rooms/a102");
    await expect(page.locator('[data-room-pricing="a102"] [data-featured="true"]')).toContainText("1.260.000"); checks++;
    await page.goto(base + "/host/rates");
    const form = page.locator(".rate-form").first();
    await form.getByRole("checkbox",{name:"Combo 3 giờ",exact:true}).uncheck();
    await form.getByRole("button",{name:"Lưu bảng giá",exact:true}).click();
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(0); checks++;
    await page.goto(base + "/rooms/a101");
    await expect(page.locator('[data-room-pricing="a101"] [data-featured="true"]')).toHaveCount(0);
    await expect(page.locator('[data-room-pricing="a101"] [data-plan="combo3"]')).toHaveCount(0); checks += 2;
    await page.goto(base + "/host/rates");
    await form.getByRole("checkbox",{name:"Combo 3 giờ",exact:true}).check();
    await form.getByRole("button",{name:"Lưu bảng giá",exact:true}).click();
    await expect(manager.locator('[data-selected="true"]')).toHaveCount(0); checks++;
    await rate("combo3").getByRole("button").click();
    await page.evaluate(() => { const s=JSON.parse(localStorage.getItem("studiohub.demo.v1")); s.sessionId="customer"; localStorage.setItem("studiohub.demo.v1",JSON.stringify(s)); });
    await page.goto(base + "/rooms/a101"); await page.setViewportSize({width:1440,height:1000});
    await page.getByRole("button",{name:"Mở ảnh 1",exact:true}).click();
    await expect(page.locator(".lightbox")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.locator(".lightbox")).not.toBeVisible(); checks += 2;
    await page.locator(".booking-card").getByRole("button",{name:/Chọn lịch thuê/}).click();
    const dialog = page.getByRole("dialog",{name:"Đặt thuê không gian"});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox",{name:"Hình thức thuê",exact:true})).toHaveValue("hourly");
    await expect(dialog.locator(".wizard-summary .total")).toContainText("700.000"); checks += 3;
    await dialog.getByRole("button",{name:"Tiếp tục",exact:true}).click();
    await dialog.getByRole("heading",{name:"Thêm thiết bị bạn cần.",exact:true}).waitFor();
    await dialog.getByRole("button",{name:"Tiếp tục",exact:true}).click();
    await dialog.getByRole("checkbox").check();
    await dialog.locator(".wizard-footer .btn").last().click();
    await expect(page).toHaveURL(/\/payment\//);
    const booked = (await stateOf(page)).bookings.at(-1);
    expect(booked.roomId).toBe("a101"); expect(booked.plan).toBe("hourly"); expect(booked.total).toBe(700000); expect(booked.deposit).toBe(210000); expect(booked.status).toBe("awaiting_payment"); checks += 6;
    await context.close();
  }
  expect(errors).toEqual([]);
  const result = { checks, pageErrors:errors, widths:[360,390,768,1024,1440], motion:["reduce","no-preference"], persisted:true, bookingFlow:"passed", output };
  fs.writeFileSync(output+"/results.json",JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
} finally { await browser.close(); }
