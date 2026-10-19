import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync(".studiohub-runtime/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000/?fixture=visual-review", {
  waitUntil: "networkidle",
});
await page
  .getByRole("heading", { name: "Tìm studio, đặt theo giờ." })
  .waitFor();
await page.screenshot({
  path: ".studiohub-runtime/screenshots/home-desktop.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    title: await page.title(),
    headings: await page.locator("h1").allTextContents(),
    errors,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  }),
);
await page.setViewportSize({ width: 360, height: 780 });
await page.screenshot({
  path: ".studiohub-runtime/screenshots/home-mobile.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    mobileOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  }),
);
await browser.close();
