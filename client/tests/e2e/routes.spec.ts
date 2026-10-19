import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
const now = new Date("2026-10-09T01:00:00Z");
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
test.beforeEach(async ({ page }, info) => {
  await page.clock.install({ time: now });
  await page.goto(
    `/?fixture=route-${info.testId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 65)}`,
  );
  await expect(page.locator("h1")).toBeVisible();
});
async function visit(page: Page, routes: string[], screenshots: string[] = []) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  fs.mkdirSync(".studiohub-runtime/screenshots", { recursive: true });
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy trang" }),
    ).toHaveCount(0);
    if (screenshots.includes(route))
      await page.screenshot({
        path: `.studiohub-runtime/screenshots/${route.replace(/[^a-zA-Z0-9-]/g, "-")}.png`,
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
}
test("public and customer route families render real records without runtime errors", async ({
  page,
}) => {
  await visit(page, [
    "/",
    "/studios",
    "/studios/phong-nang",
    "/become-a-host",
    "/login",
    "/register",
    "/register/host",
    "/booking/phong-nang",
  ]);
  await login(page, "khach@studiohub.demo");
  await visit(
    page,
    [
      "/account",
      "/account/status",
      "/my-bookings",
      "/my-bookings/SH-DEMO-003",
      "/payment/SH-DEMO-001",
      "/payment/SH-DEMO-003/result",
    ],
    ["/my-bookings/SH-DEMO-003"],
  );
});
test("every host route renders in the selected studio context without runtime errors", async ({
  page,
}) => {
  await login(page, "chu@studiohub.demo");
  await page.getByLabel("Studio đang xem").selectOption("studio-1");
  await visit(
    page,
    [
      "/host",
      "/host/bookings",
      "/host/bookings/SH-DEMO-003",
      "/host/calendar",
      "/host/rooms",
      "/host/rooms/new",
      "/host/rooms/room-1/edit",
      "/host/equipment",
      "/host/pricing",
      "/host/analytics",
      "/host/studio/settings",
    ],
    ["/host/calendar", "/host/rooms/room-1/edit", "/host/analytics"],
  );
});
test("every admin route renders shared records without runtime errors", async ({
  page,
}) => {
  await login(page, "admin@studiohub.demo");
  await visit(
    page,
    [
      "/admin",
      "/admin/approvals",
      "/admin/users",
      "/admin/users/host-pending",
      "/admin/studios",
      "/admin/studios/studio-1",
      "/admin/categories",
      "/admin/bookings",
      "/admin/bookings/SH-DEMO-003",
      "/admin/audit",
    ],
    [
      "/admin/users/host-pending",
      "/admin/studios/studio-1",
      "/admin/categories",
    ],
  );
});
