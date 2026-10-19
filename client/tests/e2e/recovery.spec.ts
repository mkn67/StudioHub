import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("khach@studiohub.demo");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
test.beforeEach(async ({ page }, info) => {
  await page.clock.install({ time: new Date("2026-10-09T01:00:00Z") });
  await page.goto(
    `/?fixture=recovery-${info.testId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 65)}`,
  );
  await expect(page.locator("h1")).toBeVisible();
});
test("corrupt data remains untouched until a confirmed reset and recovery is accessible", async ({
  page,
}) => {
  const key = await page.evaluate(
    () =>
      `studiohub.test.${sessionStorage.getItem("studiohub.fixture")}.database`,
  );
  await page.evaluate(
    (dataKey) => localStorage.setItem(dataKey, "{broken"),
    key,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Không thể mở dữ liệu demo",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  expect(
    await page.evaluate((dataKey) => localStorage.getItem(dataKey), key),
  ).toBe("{broken");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Đặt lại dữ liệu demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Quay lại", exact: true })
    .click();
  expect(
    await page.evaluate((dataKey) => localStorage.getItem(dataKey), key),
  ).toBe("{broken");
  await page
    .getByRole("button", { name: "Đặt lại dữ liệu demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Tìm studio, đặt theo giờ.",
      exact: true,
    }),
  ).toBeVisible();
});
test("wrong-role access gives a real return destination and accessible main content", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      name: "Tài khoản không có quyền truy cập",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("link", { name: "Về khu vực của tôi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
});
test("a corrupt image gives Vietnamese feedback and a subsequent valid upload recovers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.goto("/account");
  await page
    .getByLabel("Ảnh đại diện", { exact: true })
    .setInputFiles({
      name: "broken.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("invalid-image"),
    });
  await expect(
    page.getByRole("alert").filter({ hasText: "Không thể đọc ảnh" }),
  ).toBeVisible();
  await page
    .getByLabel("Ảnh đại diện", { exact: true })
    .setInputFiles("public/images/daylight.jpg");
  await expect(
    page.getByRole("img", { name: "Ảnh đại diện", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Không thể đọc ảnh" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
