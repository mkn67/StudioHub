import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const now = new Date("2026-10-09T01:00:00Z");
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
test("representative marketplace, booking, host and admin pages pass axe", async ({
  page,
}) => {
  await page.clock.install({ time: now });
  await page.goto("/?fixture=axe-routes");
  await expect(page.locator("h1")).toBeVisible();
  for (const route of [
    "/",
    "/studios",
    "/studios/phong-nang",
    "/booking/phong-nang",
    "/login",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      `axe ${route}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await login(page, "chu@studiohub.demo");
  for (const route of ["/host", "/host/bookings"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await login(page, "admin@studiohub.demo");
  for (const route of [
    "/admin",
    "/admin/approvals",
    "/admin/users/host-pending",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
for (const width of [360, 390, 768, 1024, 1440])
  test(`responsive interfaces have no page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.clock.install({ time: now });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?fixture=responsive-${width}`);
    await expect(page.locator("h1")).toBeVisible();
    fs.mkdirSync(".studiohub-runtime/screenshots", { recursive: true });
    for (const [label, route] of [
      ["home", "/"],
      ["search", "/studios"],
      ["detail", "/studios/phong-nang"],
      ["booking", "/booking/phong-nang"],
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
      await page.screenshot({
        path: `.studiohub-runtime/screenshots/${label}-${width}.png`,
        fullPage: true,
      });
    }
    await login(page, "chu@studiohub.demo");
    await page.goto("/host");
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.studiohub-runtime/screenshots/host-${width}.png`,
      fullPage: true,
    });
    await login(page, "admin@studiohub.demo");
    await page.goto("/admin");
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.studiohub-runtime/screenshots/admin-${width}.png`,
      fullPage: true,
    });
  });
