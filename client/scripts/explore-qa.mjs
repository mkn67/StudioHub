import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.QA_BASE_URL || "http://localhost:3000";
const output = new URL("../../.tmp/explore-qa/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
// External image availability must not determine whether layout checks finish.
await page.route("https://images.unsplash.com/**", route => route.abort());
const requests = [];
page.on("request", request => {
  if (new URL(request.url()).pathname === "/api/rooms") requests.push(request.url());
});
const slider = page.locator('input[type="range"]');
const results = page.locator(".explore-results");
const cards = page.locator(".explore-room-card");
async function settled() {
  await page.locator('.explore-results[aria-busy="false"]').waitFor();
  assert.equal(await results.getByRole("alert").count(), 0);
}
async function openFilters() {
  const toggle = page.locator("#explore-filter-toggle");
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
}
async function setPrice(value) { await slider.fill(String(value)); }
async function submit(value) {
  const keyword = (await page.locator('[name="keyword"]').inputValue()).trim();
  const spaceType = await page.locator('[name="space_type_id"]').inputValue();
  const response = page.waitForResponse(r => {
    const url = new URL(r.url());
    return url.pathname === "/api/rooms" && url.searchParams.get("max_price") === String(value)
      && (url.searchParams.get("keyword") || "") === keyword
      && (url.searchParams.get("space_type_id") || "") === spaceType;
  });
  await page.getByRole("button", { name: "Tìm phòng", exact: true }).click();
  const data = await (await response).json();
  await settled();
  return data;
}
try {
  await page.goto(`${base}/rooms?min_area=99999&minArea=99999&utm_source=qa`, { waitUntil: "domcontentloaded" });
  await settled();
  await page.waitForURL(url => !url.searchParams.has("min_area") && !url.searchParams.has("minArea"));
  assert.equal(new URL(page.url()).searchParams.get("utm_source"), "qa");
  assert.equal(await slider.inputValue(), "2000000");
  for (const [attr, value] of [["min", "0"], ["max", "2000000"], ["step", "100000"]]) assert.equal(await slider.getAttribute(attr), value);
  assert.equal(await page.locator('[name="min_area"]').count(), 0);
  const originalCount = await cards.count();
  assert.ok(originalCount > 0, "real database should return rooms");
  const nav = page.locator('.public-nav a[href="/rooms"]');
  assert.equal(await nav.getAttribute("aria-current"), "page");
  for (const hover of [false, true]) {
    if (hover) await nav.hover();
    const style = await nav.evaluate(el => { const s = getComputedStyle(el); return { line: s.textDecorationLine, border: s.borderBottomWidth, after: getComputedStyle(el, "::after").content }; });
    assert.equal(style.line, "underline"); assert.equal(style.border, "0px"); assert.equal(style.after, "none");
  }
  const inactive = page.locator('.public-nav a[href="/my-bookings"]');
  assert.equal(await inactive.evaluate(el => getComputedStyle(el).textDecorationLine), "none");
  await nav.focus();
  assert.notEqual(await nav.evaluate(el => getComputedStyle(el).outlineStyle), "none");
  const initialRequests = requests.length;
  for (const price of [100_000, 1_000_000, 0, 2_000_000]) await setPrice(price);
  await page.waitForTimeout(200);
  assert.equal(requests.length, initialRequests, "dragging must not issue search requests");
  await slider.focus(); await page.keyboard.press("ArrowLeft");
  assert.equal(await slider.inputValue(), "1900000");
  assert.match(await page.locator(".explore-price output").innerText(), /1\.900\.000đ/);
  assert.notEqual(await slider.evaluate(el => getComputedStyle(el).outlineStyle), "none");
  for (const price of [0, 100_000, 1_000_000, 2_000_000]) {
    await setPrice(price);
    const data = await submit(price);
    assert.equal(data.status, "success");
    for (const room of data.data.items) {
      assert.equal(room.display_rate.rate_unit, "hour");
      assert.ok(room.display_rate.unit_price <= price);
    }
    assert.match(await results.locator("h2").first().innerText(), new RegExp(`^${data.data.pagination.total_items} `));
    if (price === 0) assert.ok(await results.locator(".explore-empty").isVisible());
  }
  console.log("PASS: live hourly-price boundaries, request mapping, empty state, no drag requests, keyboard slider, nav decoration/focus");

  await page.locator('[name="keyword"]').fill("Artemis");
  const typeOptions = await page.locator('[name="space_type_id"] option').evaluateAll(es => es.filter(e => e.value).map(e => ({ value: e.value, text: e.textContent })));
  await page.locator('[name="space_type_id"]').selectOption(typeOptions[0].value);
  const combined = await submit(2_000_000);
  assert.ok(combined.data.items.length > 0);
  for (const room of combined.data.items) {
    assert.match(`${room.name} ${room.studio.name}`, /Artemis/i);
    const detail = await (await fetch(`http://localhost:8000/api/rooms/${room.room_id}`)).json();
    assert.ok(detail.data.space_types.some(t => String(t.space_type_id) === typeOptions[0].value));
  }
  await page.reload({ waitUntil: "domcontentloaded" }); await settled();
  assert.equal(await page.locator('[name="keyword"]').inputValue(), "Artemis");
  assert.equal(await page.locator('[name="space_type_id"]').inputValue(), typeOptions[0].value);
  await page.locator('.explore-filter-form button[type="button"]').last().click(); await settled();
  assert.equal(await slider.inputValue(), "2000000");
  assert.equal(await page.locator('[name="keyword"]').inputValue(), "");
  assert.equal(await page.locator('[name="space_type_id"]').inputValue(), "");
  await page.locator('[name="keyword"]').fill("Podcast");
  const byName = await submit(2_000_000);
  assert.ok(byName.data.items.length > 0);
  assert.ok(byName.data.items.every(r => /Podcast/i.test(r.name)));
  await page.goBack({ waitUntil: "domcontentloaded" }); await settled();
  assert.equal(await page.locator('[name="keyword"]').inputValue(), "");
  console.log("PASS: real studio/room name search, category + combined search, URL restoration, reset, browser Back");

  for (const width of [360, 390, 768, 1024, 1280, 1440, 1728]) {
    const currentUrl = page.url();
    // Resize between documents so an in-flight native view transition is not aborted.
    await page.goto("about:blank");
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(currentUrl, { waitUntil: "networkidle" });
    await settled();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    const sidebar = await page.locator(".explore-sidebar").boundingBox(), result = await results.boundingBox();
    if (width >= 1024) {
      assert.ok(result.x >= sidebar.x + sidebar.width);
      assert.ok(Math.abs(sidebar.y - result.y) <= 1);
      assert.ok(sidebar.width >= 280 && sidebar.width <= 320);
    } else assert.ok(result.y >= sidebar.y + sidebar.height);
    if (width < 768) {
      assert.equal(await slider.isVisible(), false);
      await openFilters(); await setPrice(1_000_000);
      await page.locator("#explore-filter-toggle").click(); await openFilters();
      assert.equal(await slider.inputValue(), "1000000");
      await submit(1_000_000);
      assert.equal(await slider.isVisible(), false);
      await openFilters();
      await page.locator('.explore-filter-form .explore-reset').click(); await settled();
    }
    await page.reload({ waitUntil: "networkidle" }); await settled();
    await page.screenshot({ path: new URL(`rooms-${width}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true, animations: "disabled" });
  }
  console.log("PASS: all seven viewports, desktop alignment, no overflow, mobile open/close/apply/reset; screenshots saved");

  for (const [path, href, text] of [["/login", "/register", "Đăng ký"], ["/register", "/login", "Đăng nhập"]]) {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    const link = page.locator(".auth-action"); await link.waitFor();
    assert.equal(await link.getAttribute("href"), href); assert.equal(await link.innerText(), text);
    const colors = await link.evaluate(el => ({ color: getComputedStyle(el).color, line: getComputedStyle(el).textDecorationLine, parent: getComputedStyle(el.parentElement).color }));
    assert.equal(colors.color, "rgb(13, 116, 144)"); assert.equal(colors.line, "underline"); assert.notEqual(colors.color, colors.parent);
    await link.focus(); assert.notEqual(await link.evaluate(el => getComputedStyle(el).outlineStyle), "none");
    await page.keyboard.press("Enter"); await page.waitForURL(`${base}${href}`);
  }
  console.log("PASS: login/register action styling, neutral supporting text and keyboard navigation");

  // Controlled API replies exercise states unavailable in the small local seed.
  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 1000 });
  let mode = "loading", release;
  const gate = new Promise(resolve => { release = resolve; });
  const actual = await (await fetch("http://localhost:8000/api/rooms?max_price=2000000&rate_unit=hour")).json();
  await page.route("**/api/rooms?**", async route => {
    if (mode === "loading") await gate;
    if (mode === "error") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ status: "error", message: "QA search unavailable" }) });
    const payload = structuredClone(actual);
    payload.data.pagination = { ...payload.data.pagination, total_pages: 2, total_items: 13 };
    await route.fulfill({ json: payload });
  });
  await page.goto(`${base}/rooms?keyword=Artemis&max_price=1000000`, { waitUntil: "domcontentloaded" });
  await page.locator('.explore-results[aria-busy="true"]').waitFor();
  assert.ok((await results.boundingBox()).height >= 360);
  mode = "error"; release();
  await results.getByRole("alert").waitFor();
  assert.equal(await page.locator('[name="keyword"]').inputValue(), "Artemis");
  assert.equal(await cards.count(), 0);
  mode = "success";
  await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await settled();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click(); await page.waitForURL(url => url.searchParams.get("page") === "2"); await settled();
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Trang trước", exact: true }).click(); await page.waitForURL(url => !url.searchParams.has("page")); await settled();
  await expect(page.getByRole("button", { name: "Trang trước", exact: true })).toBeDisabled();
  assert.deepEqual(errors, []);
  console.log("PASS: loading, API error preserves filters, retry, pagination boundaries; no uncaught browser errors");
} finally { await browser.close(); }
