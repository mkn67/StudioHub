import { test, expect, type Page } from "@playwright/test";

// Browser fixtures only: production still requests the existing REST endpoints.
const groups = ["Visual & Photo Studio", "Video & Film Production", "Livestream & Broadcast", "Audio & Event"];
const names = ["Cyclorama Studio", "Lookbook & Fashion", "Concept & Set Design", "Green Screen & VFX", "Acoustic Soundstage", "Podcast & Livestream Hub", "Livestream & E-commerce", "Workshop & Event Studio", "Music Recording Studio", "Không gian thử nghiệm"];
const categories = names.map((name, index) => ({ space_type_id: 101 + index, name, category: index < 3 ? groups[0] : index < 5 ? groups[1] : index < 7 ? groups[2] : index < 9 ? groups[3] : "Nhóm mới từ API" }));
const origin = process.env.HOMEPAGE_QA_URL || "http://localhost:3100";

async function openHome(page: Page) {
  await page.route("**/api/space-types", route => route.fulfill({ json: { status: "success", code: 200, data: categories } }));
  await page.route("**/api/rooms?**", route => route.fulfill({ json: { status: "success", code: 200, data: { items: [], pagination: { page: 1, limit: 12, total: 0, total_pages: 0 } } } }));
  await page.goto(origin);
  await expect(page.locator(".home-category-grid > a")).toHaveCount(10);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero-photo")).toHaveJSProperty("complete", true);
}

for (const width of [360, 390, 768, 1024, 1280, 1440, 1600]) {
  test(`homepage fits ${width}px and keeps all API categories`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await openHome(page);
    await expect(page.locator("h1")).toHaveText("Không gian đúng.Ý tưởng bứt phá.");
    await expect(page.locator(".home-category-grid").first()).toHaveCSS("grid-template-columns", new RegExp(width <= 640 ? "^[\\d.]+px$" : width <= 1150 ? "^[\\d.]+px [\\d.]+px$" : "^[\\d.]+px [\\d.]+px [\\d.]+px$"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".home-category-grid > a").last()).toHaveAttribute("href", "/rooms?space_type_id=110");
    const pictures = await page.locator(".category-illustration svg").evaluateAll(nodes => nodes.map(node => node.innerHTML));
    expect(new Set(pictures.slice(0, 9)).size).toBe(9);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });
    await page.locator(".home-categories").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600); // Finish the real scroll reveal before visual capture.
    await page.screenshot({ path: testInfo.outputPath(`categories-${width}.png`) });
  });
}

test("search preserves keyword and numeric category identifier", async ({ page }) => {
  await openHome(page);
  await page.getByRole("textbox", { name: "Tên Studio hoặc phòng" }).fill("Ánh sáng tự nhiên");
  await page.locator(".hero-search select").selectOption("104");
  await page.getByRole("button", { name: "Tìm Studio", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\?/);
  const query = new URL(page.url()).searchParams;
  expect(query.get("keyword")).toBe("Ánh sáng tự nhiên");
  expect(query.get("space_type_id")).toBe("104");
  expect(query.has("date")).toBe(false);
});

test("category click navigates with the original API identifier", async ({ page }) => {
  await openHome(page);
  await page.locator(".home-category-grid > a").filter({ hasText: "Green Screen & VFX" }).click();
  await expect(page).toHaveURL(url => url.pathname === "/rooms" && url.searchParams.get("space_type_id") === "104");
});

test("public logo, exploration and login keep their routes", async ({ page }) => {
  await openHome(page);
  await expect(page.locator(".public-header .brand")).toHaveAttribute("href", "/");
  await expect(page.locator(".public-nav a").first()).toHaveAttribute("href", "/rooms");
  await page.locator(".nav-login").click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile navigation and reduced motion remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await expect(page.locator(".hero-photo")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Mở điều hướng" }).click();
  await expect(page.getByRole("navigation", { name: "Điều hướng di động" })).toBeVisible();
  await page.getByRole("navigation", { name: "Điều hướng di động" }).getByRole("link", { name: "Đơn của tôi" }).click();
  await expect(page).toHaveURL(/\/my-bookings$/);
});

test("customer dropdown supports keyboard dismissal without altering session behavior", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("studiohub.api-token", "browser-test-token"));
  await page.route("**/api/auth/profile", route => route.fulfill({ json: { status: "success", code: 200, data: { user_id: 999, full_name: "Khách Kiểm Thử", role: "customer", email: "qa@example.test" } } }));
  await openHome(page);
  const trigger = page.locator(".customer-account-trigger");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
