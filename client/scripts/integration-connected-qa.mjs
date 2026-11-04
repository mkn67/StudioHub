import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.INTEGRATION_QA_URL || "http://127.0.0.1:3127";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
let checks = 0;
try {
  // Actual PHP is running with MySQL unavailable; no mocked business success.
  for (const route of ["/", "/rooms", "/login", "/host", "/admin"]) {
    await page.goto(base + route);
    await page.getByRole("heading", { name: "Chưa tải được StudioHub" }).waitFor();
    assert.equal(await page.getByText("Môi trường demo", { exact: true }).count(), 0);
    assert.equal(await page.locator(".room-card").count(), 0);
    checks += 3;
  }
  assert.equal(await page.evaluate(() => localStorage.getItem("studiohub.demo.v1")), null); checks++;
  const denied = await context.request.post(base + "/api/business/commands", { headers: { Origin: "https://untrusted.invalid" }, data: { type: "create" } });
  assert.equal(denied.status(), 403); checks++;
  const unknown = await context.request.get(base + "/api/business/unknown"); assert.equal(unknown.status(), 404); checks++;
  const unauthorized = await context.request.get(base + "/api/business/workspace"); assert.equal(unauthorized.status(), 401); checks++;
  const catalog = await context.request.get(base + "/api/business/catalog");
  assert.equal(catalog.status(), 500);
  const body = await catalog.text(); assert.ok(!/SQLSTATE|password|stack|pdo/i.test(body)); checks += 2;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByRole("heading", { name: "Chưa tải được StudioHub" }).waitFor(); checks++;
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); checks++;
  }
  assert.deepEqual(errors, []); checks++;
  fs.mkdirSync(".impeccable/review/integration", { recursive: true });
  await page.screenshot({ path: ".impeccable/review/integration/connected-unavailable.png" });
  fs.writeFileSync(".impeccable/review/integration/connected-results.json", JSON.stringify({ checks, errors, mode: "connected", realPHP: true, mysql: "unavailable", successfulBooking: "not tested" }, null, 2));
  console.log(`${checks} connected failure/bridge checks passed; MySQL workflows not tested.`);
} finally { await browser.close(); }
