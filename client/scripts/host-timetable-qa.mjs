import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.TIMETABLE_QA_URL ?? "http://localhost:3000";
const output = ".impeccable/review/host-timetable";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = []; let checks = 0;
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem("studiohub.demo.v1")));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/rooms"); await page.locator(".demo-toggle").click(); await page.locator(".demo-panel select").first().selectOption("host"); await page.locator(".demo-toggle").click();
  const original = await stateOf(page), date = "2026-10-28", day = Date.parse(date + "T00:00:00+07:00");
  const definitions = [["two", "a101", 600, 720], ["half", "a102", 630, 690], ["quarter", "b101", 555, 645], ["short", "b102", 600, 630], ["span", "c101", 660, 840], ["overnight", "a101", 1410, 1470]];
  const bookings = definitions.map(([id, roomId, start, end]) => ({ ...original.bookings[0], id: `tt-${id}`, roomId, status: "confirmed", start: day + start * 60000, end: day + end * 60000 }));
  await page.evaluate(bookings => { const state = JSON.parse(localStorage.getItem("studiohub.demo.v1")); state.bookings = bookings; localStorage.setItem("studiohub.demo.v1", JSON.stringify(state)); }, bookings);
  await page.goto(base + "/host/calendar"); await page.getByLabel("Chế độ lịch").selectOption("day"); await page.getByLabel("Ngày xem lịch", { exact: true }).fill(date);
  await page.evaluate(async () => { await document.fonts.ready; });
  if (process.env.BEFORE_ONLY === "1") {
    for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 1050 }); await page.screenshot({ path: `${output}/before-${width}.png`, fullPage: true }); }
    console.log("Captured existing calendar before refinement.");
  } else {
    const viewport = page.locator(".host-calendar-scroll");
    const expected = { two: [480, 96], half: [504, 48], quarter: [444, 72], short: [480, 24], span: [528, 144], overnight: [1128, 24] };
    for (const [id, [top, height]] of Object.entries(expected)) {
      const event = page.locator(`[data-booking-id="tt-${id}"]`);
      await expect(event).toHaveCSS("top", `${top}px`); await expect(event).toHaveCSS("height", `${height}px`);
      const size = await event.evaluate(node => ({ width: node.getBoundingClientRect().width, column: node.closest(".host-time-track").getBoundingClientRect().width }));
      expect(size.column - size.width).toBeGreaterThanOrEqual(2); expect(size.column - size.width).toBeLessThanOrEqual(4); checks++;
    }
    await expect(page.locator('[data-buffer-for="tt-two"]')).toHaveCSS("top", "576px"); await expect(page.locator('[data-buffer-for="tt-two"]')).toHaveCSS("height", "24px"); checks++;
    expect(await viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(300); checks++;
    const short = page.locator('[data-booking-id="tt-short"]'); await expect(short.locator(".host-event-status")).toHaveCount(0);
    await expect(short).toHaveAttribute("aria-label", /Đã xác nhận/);
    await expect(page.locator('[data-booking-id="tt-two"] .host-event-status')).toBeVisible(); checks++;
    const link = page.locator('[data-booking-id="tt-two"]');
    for (const activate of ["click", "Enter", "Space"]) {
      if (activate === "click") await link.click(); else { await link.focus(); await link.press(activate); }
      await expect(page).toHaveURL(base + "/host/bookings/tt-two");
      await page.goBack(); await page.getByLabel("Chế độ lịch").selectOption("day"); await page.getByLabel("Ngày xem lịch", { exact: true }).fill(date); checks++;
    }
    await link.focus(); await expect(link).toHaveCSS("outline-style", "solid"); await expect(link).toHaveCSS("outline-offset", "-3px");
    await link.hover(); await expect(link).toHaveCSS("transform", "none"); checks++;
    for (const reducedMotion of ["reduce", "no-preference"]) {
      await page.emulateMedia({ reducedMotion });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1050 });
        await page.evaluate(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished));
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const axis = page.locator('.host-time-axis [data-minute="600"]');
        const line = page.locator('[data-calendar-room="a101"] [data-minute="600"]');
        expect(Math.abs((await axis.boundingBox()).y - (await line.boundingBox()).y)).toBeLessThan(1);
        await viewport.evaluate(node => { node.scrollTop = 400; node.scrollLeft = 160; });
        expect(Math.abs((await axis.boundingBox()).y - (await line.boundingBox()).y)).toBeLessThan(1);
        expect(Math.abs((await page.locator(".host-time-axis").boundingBox()).x - (await viewport.boundingBox()).x - 1)).toBeLessThan(1);
        expect(Math.abs((await page.locator(".host-axis-head").boundingBox()).y - (await viewport.boundingBox()).y - 1)).toBeLessThan(1);
        await expect(page.locator(".host-time-tick > span").first()).toHaveCSS("font-size", "13px");
        await expect(page.locator(".host-time-tick > span").first()).toHaveCSS("font-weight", "600");
        await expect(link).toHaveCSS("transform", "none"); checks++;
        if ([390, 1440].includes(width)) { await viewport.evaluate(node => { node.scrollLeft = 0; }); await page.screenshot({ path: `${output}/after-${reducedMotion}-${width}.png`, fullPage: true }); }
      }
    }
    await page.getByRole("button", { name: "Buổi sáng", exact: true }).click(); await expect(page.locator('[data-booking-id="tt-span"]')).toHaveCSS("height", "48px");
    await page.getByRole("button", { name: "Buổi chiều", exact: true }).click(); await expect(page.locator('[data-booking-id="tt-span"]')).toHaveCSS("top", "0px"); await expect(page.locator('[data-booking-id="tt-span"]')).toHaveCSS("height", "96px");
    await page.getByRole("button", { name: "Buổi tối", exact: true }).click(); await expect(page.locator('[data-booking-id="tt-overnight"]')).toHaveCSS("top", "264px");
    await page.getByRole("button", { name: "Cả ngày", exact: true }).click(); await page.getByRole("button", { name: "Về 00:00", exact: true }).click();
    expect(await viewport.evaluate(node => node.scrollTop)).toBe(0); checks += 4;
    await page.getByRole("button", { name: "Kỳ tiếp", exact: true }).click();
    await expect(page.locator('[data-booking-id="tt-overnight"]')).toHaveCSS("top", "0px"); await expect(page.locator('[data-booking-id="tt-overnight"]')).toHaveCSS("height", "24px");
    await expect(page.locator('[data-buffer-for="tt-overnight"]')).toHaveCSS("top", "24px"); checks++;
    await page.getByLabel("Chế độ lịch").selectOption("week"); await page.getByLabel("Phòng", { exact: true }).selectOption("a101");
    await expect(page.locator('[data-booking-id="tt-overnight"]')).toHaveCount(2);
    expect((await stateOf(page)).bookings).toEqual(bookings); expect((await stateOf(page)).studios).toEqual(original.studios); checks++;
    expect(errors).toEqual([]); console.log(JSON.stringify({ checks, errors, output }));
  }
} finally { await browser.close(); }
