import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    `/?fixture=management-${info.testId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60)}`,
  );
  await expect(page.locator("h1")).toBeVisible();
});
test("the keyboard skip link moves focus directly to the main content", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Đi đến nội dung chính" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("main")).toContainText(
    "Tìm studio, đặt theo giờ.",
  );
});
test("host creates a studio, room, equipment and rate, publishes it and preserves edits after refresh", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "chu@studiohub.demo");
  await page.goto("/host/studio/settings?new=1");
  await page.getByLabel("Tên Studio", { exact: true }).fill("Studio Kiểm Thử");
  await page.getByLabel("Quận / khu vực").fill("Quận 7");
  await page
    .getByLabel("Địa chỉ", { exact: true })
    .fill("10 đường Demo, Quận 7");
  await page
    .getByLabel("Mô tả Studio", { exact: true })
    .fill("Không gian minh họa phục vụ luồng quản lý Studio.");
  await page.getByRole("button", { name: "Tạo Studio", exact: true }).click();
  await expect(page).toHaveURL(/\/host\/studio\/settings$/);
  await expect(
    page.getByLabel("Studio đang xem").locator("option:checked"),
  ).toHaveText("Studio Kiểm Thử");
  await page.goto("/host/rooms/new");
  await page.getByLabel("Tên phòng", { exact: true }).fill("Phòng Kiểm Thử");
  await page
    .getByLabel("Mô tả", { exact: true })
    .fill("Không gian minh họa để kiểm tra luồng tạo và xuất bản phòng.");
  await page.getByRole("checkbox", { name: "Chụp ảnh", exact: true }).check();
  await page.getByRole("button", { name: "Dùng ảnh minh họa demo" }).click();
  await page.getByRole("button", { name: "Lưu phòng", exact: true }).click();
  await expect(page).toHaveURL(/\/host\/rooms$/);
  const row = page.getByRole("row").filter({ hasText: "Phòng Kiểm Thử" });
  await expect(row).toContainText("Ẩn");
  await page.goto("/host/equipment");
  await page
    .getByRole("button", { name: "Thêm thiết bị", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên thiết bị / nội thất").fill("Đèn kiểm thử");
  await dialog.getByLabel("Tổng số lượng").fill("3");
  await dialog.getByLabel("Giá thuê (đ)").fill("70000");
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Đèn kiểm thử" }),
  ).toContainText("70.000đ");
  await page.goto("/host/pricing");
  await page
    .getByRole("button", { name: "Thêm bảng giá", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên bảng giá").fill("Giá giờ kiểm thử");
  await dialog.getByLabel("Giá thuê (đ)").fill("300000");
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Giá giờ kiểm thử" }),
  ).toContainText("300.000đ");
  await page.goto("/host/rooms");
  await page
    .getByRole("row")
    .filter({ hasText: "Phòng Kiểm Thử" })
    .getByRole("link", { name: "Chỉnh sửa" })
    .click();
  await page.getByLabel("Trạng thái của Chủ Studio").selectOption("active");
  await page.getByRole("button", { name: "Lưu phòng", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Phòng Kiểm Thử" }),
  ).toContainText("Đang nhận đơn");
  await page.goto("/studios?location=Quận+7");
  await expect(page.locator(".room-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Phòng Kiểm Thử", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Phòng Kiểm Thử");
  await expect(page.getByText("Đèn kiểm thử", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Phòng Kiểm Thử");
  expect(errors).toEqual([]);
});
test("host calendar opens actual bookings and analytics exposes readable chart data", async ({
  page,
}) => {
  await login(page, "chu@studiohub.demo");
  await page.getByLabel("Studio đang xem").selectOption("studio-1");
  await page.goto("/host/calendar?day=2026-10-10");
  await page.getByRole("button", { name: /^SH-DEMO-003,/ }).click();
  await expect(page.getByRole("dialog")).toContainText("SH-DEMO-003");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Tuần sau", exact: true }).click();
  await expect(page).toHaveURL(/week=2026-10-12/);
  await page.goto("/host/analytics");
  await expect(page.locator("table")).toHaveCount(2);
  await page
    .getByText("Xem dữ liệu dạng bảng", { exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: /Giá trị đơn hoàn thành theo ngày/ }),
  ).toContainText("500.000đ");
  await expect(
    page.getByRole("heading", { name: "Giá trị đơn hoàn thành", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("admin catalog mutations preserve identifiers and global search supports keyboard selection", async ({
  page,
}) => {
  await login(page, "admin@studiohub.demo");
  await page.goto("/admin/categories");
  await page.getByRole("tab", { name: "Tiện ích", exact: true }).click();
  await expect(page).toHaveURL(/tab=amenities/);
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên danh mục").fill("Bàn trang điểm kiểm thử");
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Bàn trang điểm kiểm thử" });
  await expect(row).toContainText("Đang hiển thị");
  await row.getByRole("button", { name: "Ẩn", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Hiện", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Hiện", exact: true }).click();
  await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Tên danh mục")
    .fill("Bàn trang điểm đổi tên");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Bàn trang điểm đổi tên" }),
  ).toBeVisible();
  const trigger = page.getByRole("button", {
    name: "Tìm kiếm toàn hệ thống",
    exact: true,
  });
  await trigger.click();
  await page.getByLabel("Từ khóa tìm kiếm toàn hệ thống").fill("SH-DEMO-003");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /SH-DEMO-003/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/bookings\/SH-DEMO-003$/);
  await page.reload();
  await expect(page.locator("h1")).toHaveText("SH-DEMO-003");
});
test("customer registration, profile validation and local persistence work", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách Kiểm Thử");
  await page.getByLabel("Email", { exact: true }).fill("kiemthu@example.test");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("DemoPass123");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).not.toHaveURL(/\/register/);
  await page.goto("/account");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByLabel("Số điện thoại", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0907654321");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Khách Đã Cập Nhật");
  await page
    .getByLabel("Ảnh đại diện", { exact: true })
    .setInputFiles("public/images/daylight.jpg");
  await expect(
    page.getByRole("img", { name: "Ảnh đại diện", exact: true }),
  ).toHaveAttribute("src", /^data:image\/webp/);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Khách Đã Cập Nhật",
  );
  await expect(page.getByLabel("Số điện thoại", { exact: true })).toHaveValue(
    "0907654321",
  );
});
test("a rejected host updates and resubmits its application without creating a studio", async ({
  page,
}) => {
  await login(page, "tuchoi@studiohub.demo");
  await expect(page.locator("h1")).toHaveText("Hồ sơ cần cập nhật");
  await page.getByLabel("Tên Studio đề xuất").fill("Studio Hồ Sơ Bổ Sung");
  await page
    .getByLabel("Mô tả Studio", { exact: true })
    .fill("Studio đã bổ sung địa chỉ và mô tả rõ ràng phục vụ kiểm tra demo.");
  await page
    .getByRole("button", { name: "Cập nhật và gửi lại", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("Hồ sơ đang chờ duyệt");
  await page.goto("/host/rooms");
  await expect(page).toHaveURL(/\/account\/status/);
});
test("mobile filters, dashboard drawer, menus and search restore keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/studios");
  const filter = page.getByRole("button", { name: /Bộ lọc/ });
  await filter.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Khu vực", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Tab");
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press("Tab");
    expect(await page.getByRole("dialog").evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(filter).toBeFocused();
  await login(page, "admin@studiohub.demo");
  const menu = page.getByRole("button", { name: "Mở điều hướng" });
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  const search = page.getByRole("button", {
    name: "Tìm kiếm toàn hệ thống",
    exact: true,
  });
  await search.click();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  const account = page.getByRole("button", { name: /^Tài khoản / });
  await account.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
