import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.UI_QA_URL || "http://127.0.0.1:3003";
const out = new URL("../.impeccable/room-detail/", import.meta.url);
await mkdir(out, { recursive: true });
const imagePath = name => new URL(name, out).pathname.replace(/^\/(\w:)/, "$1");
const live = await fetch("http://127.0.0.1:8000/api/rooms/6");
if (!live.ok) throw new Error("Local public room API is unavailable");
const room = (await live.json()).data;
if (!room.images?.length || !room.rates?.length) throw new Error("Room 6 requires media and real rates for this verification");
const missing = { ...room, room_id: 7, images: [], thumbnail_url: null, description: null, amenities: [], rates: [], ceiling_height: null, video_reference: null, media_notice: null };
const single = { ...room, room_id: 8, images: room.images.slice(0, 1), video_reference: { kind: "reference-not-room-tour", label: "Invalid fixture", url: "javascript:alert(1)" } };
const browser = await chromium.launch();
const checks = [], errors = [], mutations = [];
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.route("**/api/rest/**", route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const ok = data => route.fulfill({ json: { status: "success", data } });
    if (path.endsWith("/auth/profile")) return route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } });
    if (req.method() !== "GET") {
      if (!path.endsWith("/bookings/check-availability")) mutations.push(path);
      return route.fulfill({ status: 422, json: { status: "error", message: "Không thực hiện giao dịch trong kiểm thử giao diện." } });
    }
    if (/\/rooms\/\d+\/calendar$/.test(path)) return ok({ busy_slots: [] });
    if (/\/rooms\/\d+\/reviews$/.test(path)) return ok({ summary: { review_count: 0, average_rating: 0 }, items: [] });
    if (/\/rooms\/\d+$/.test(path)) return ok(path.endsWith("/7") ? missing : path.endsWith("/8") ? single : room);
    if (path.endsWith("/rooms")) return ok({ items: [], pagination: { total_items: 0, total_pages: 1 } });
    if (path.endsWith("/space-types")) return ok(room.space_types);
    return ok([]);
  });
  await context.route("**/api/helpdesk/**", route => route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } }));
  for (const width of [360, 390, 768, 1024, 1280, 1440]) {
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/rooms/6");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(room.name);
    await page.evaluate(() => document.fonts.ready);
    const metadata = page.locator(".room-detail-metadata");
    await expect(page.locator(".room-detail-heading .room-type-tags")).toHaveCount(0);
    await expect(metadata.locator("strong")).toHaveText(room.studio.name);
    await expect(metadata.locator(".room-detail-location")).toHaveText([room.studio.address, room.studio.district, room.studio.city].filter(Boolean).join(", "));
    await expect(metadata.locator(".room-detail-category")).toHaveText((room.space_types?.length ? room.space_types : room.primary_space_type ? [room.primary_space_type] : []).map(type => type.name));
    const header = await page.locator(".room-detail-heading").evaluate(node => {
      const title = node.querySelector("h1"), metadata = node.querySelector(".room-detail-metadata");
      return { titleBottom: title.getBoundingClientRect().bottom, metadataTop: metadata.getBoundingClientRect().top, fontSize: parseFloat(getComputedStyle(title).fontSize), width: node.getBoundingClientRect().width, identityWidth: node.querySelector(".room-detail-identity").getBoundingClientRect().width, marginTop: getComputedStyle(node).marginTop };
    });
    expect(header.metadataTop).toBeGreaterThanOrEqual(header.titleBottom);
    expect(header.fontSize).toBeGreaterThanOrEqual(width <= 900 ? 30 : 34);
    expect(Math.abs(header.width - header.identityWidth)).toBeLessThan(1);
    expect(header.marginTop).toBe("16px");
    await page.locator(".api-gallery img").evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
    await expect(page.locator(".room-package-list li")).toHaveCount(room.rates.length);
    await expect(page.locator(".room-amenity-grid li")).toHaveCount(room.amenities.length);
    await expect(page.locator(".room-key-specs")).toContainText(String(room.capacity));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const panelStyle = await page.locator(".room-booking-card").evaluate(node => ({ border: getComputedStyle(node).borderTopWidth, position: getComputedStyle(node).position }));
    expect(panelStyle).toEqual({ border: "2px", position: width > 900 ? "sticky" : "static" });
    await expect(page.locator(".room-booking-card .btn")).toHaveCSS("border-top-width", "2px");
    if (width <= 640) await expect(page.locator(".api-gallery")).toHaveCSS("height", "290px");
    await expect(page.locator(".api-mobile-booking-bar")).toBeHidden();
    const geometry = await page.evaluate(() => {
      const card = document.querySelector(".room-booking-card").getBoundingClientRect();
      const media = document.querySelector(".room-detail-media").getBoundingClientRect();
      const details = document.querySelector(".room-editorial-content").getBoundingClientRect();
      return { card: { x: card.x, y: card.y, bottom: card.bottom }, media: { right: media.right, y: media.y, bottom: media.bottom }, detailsY: details.y };
    });
    if (width > 900) { expect(geometry.card.x).toBeGreaterThan(geometry.media.right); expect(geometry.card.y).toBeLessThan(500); }
    else { expect(geometry.card.y).toBeGreaterThanOrEqual(geometry.media.bottom); expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.detailsY); }
    await page.screenshot({ path: imagePath(`room-${width}.png`), fullPage: true });
    await page.screenshot({ path: imagePath(`room-first-${width}.png`) });
    checks.push(`Room ${width}px: real identity, media, packages, amenity and correct column order; no overflow`);
    await page.close();
  }
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/rooms/6");
  const first = page.getByRole("button", { name: `Mở ảnh 1 của ${room.name}`, exact: true });
  await first.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Ảnh tiếp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Ảnh 2/");
  await page.getByRole("button", { name: "Ảnh trước", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(first).toBeFocused();
  await page.locator('a[href="#room-rates"]').click();
  await page.getByRole("button", { name: "Kiểm tra giá & lịch trống", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Đặt lịch Studio", exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/rooms/6");
  await expect(page.getByRole("link", { name: "Đăng nhập để tiếp tục", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  checks.push("Gallery next/previous, Escape, focus restoration, pricing anchor, real booking form in centered modal and login requirement");
  await page.goto(base + "/rooms/7");
  await expect(page.locator(".room-media-empty")).toContainText("Phòng chưa có ảnh");
  await expect(page.locator(".room-detail-media button")).toHaveCount(0);
  await expect(page.locator(".room-key-specs > div")).toHaveCount(2);
  await expect(page.locator(".room-unlisted-price")).toBeVisible();
  await expect(page.locator(".room-video-reference")).toHaveCount(0);
  await page.screenshot({ path: imagePath("room-missing.png"), fullPage: true });
  checks.push("Missing photos, description, rates, amenities, ceiling and video show honest fallbacks without invented content");
  await page.goto(base + "/rooms/8");
  await expect(page.locator(".api-gallery-item")).toHaveCount(1);
  await expect(page.locator(".room-video-reference")).toHaveCount(0);
  checks.push("Single image gallery and untrusted reference video URL");
  await context.close();
  const normal = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const livePage = await normal.newPage();
  livePage.on("pageerror", e => errors.push(e.message));
  await livePage.goto(base + "/rooms/6");
  await expect(livePage.getByRole("heading", { level: 1 })).toHaveText(room.name);
  await expect(livePage.locator(".room-package-list li")).toHaveCount(room.rates.length);
  await livePage.evaluate(() => document.fonts.ready);
  await livePage.waitForTimeout(900);
  await livePage.screenshot({ path: imagePath("room-live-http.png"), fullPage: true });
  checks.push("Real local HTTP detail/rates/calendar rendering with ordinary motion; no authenticated mutations");
  expect(errors).toEqual([]); expect(mutations).toEqual([]);
  await writeFile(new URL("results.json", out), JSON.stringify({ checks, errors, mutations, source: "Public room 6 real HTTP, edge cases are explicit fixtures" }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors, mutations }, null, 2));
} catch (e) { console.error(JSON.stringify({ checks, errors, mutations }, null, 2)); throw e; }
finally { await browser.close(); }
