import { test, expect, type Page } from "@playwright/test";
const NOW = new Date("2026-10-09T01:00:00Z");
let namespace = "";
async function initialize(page: Page) {
  await page.clock.install({ time: NOW });
  await page.goto(`/?fixture=${namespace}`);
  await expect(
    page.getByRole("heading", { name: "Tìm studio, đặt theo giờ." }),
  ).toBeVisible();
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function rental(page: Page) {
  await page.getByLabel("Ngày bắt đầu", { exact: true }).fill("2026-10-19");
  await page.getByLabel("Giờ bắt đầu", { exact: true }).fill("09:00");
  await page.getByLabel("Giờ kết thúc", { exact: true }).fill("11:00");
}
async function makeBooking(page: Page, equipment = false) {
  await page.goto("/booking/phong-nang");
  await rental(page);
  await page
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Thêm thiết bị & nội thất" }),
  ).toBeVisible();
  if (equipment)
    await page
      .getByRole("button", { name: "Tăng Đèn LED Aputure 300d" })
      .click();
  await page
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .first()
    .click();
  if (page.url().includes("/login")) {
    await page
      .getByLabel("Email", { exact: true })
      .fill("khach@studiohub.demo");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Kiểm tra và xác nhận" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Tôi đã đọc và đồng ý" }).check();
  await page
    .getByRole("button", { name: "Tạo đơn & đặt cọc", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/payment\/SH-/);
  return page.url().split("/").at(-1)!;
}
test.beforeEach(async ({ page }, info) => {
  namespace = `flow-${info.testId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 65)}`;
  await initialize(page);
});
test("search, room detail, preserved equipment draft, deposit, host confirmation and customer cancellation", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByLabel("Khu vực", { exact: true }).fill("Bình Thạnh");
  await page.getByRole("button", { name: "Tìm Studio", exact: true }).click();
  await expect(page).toHaveURL(/location=/);
  await expect(page.locator(".room-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Phòng Nắng · Ánh sáng tự nhiên", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Phòng Nắng · Ánh sáng tự nhiên",
      exact: true,
    }),
  ).toBeVisible();
  await rental(page);
  await page.getByRole("button", { name: "Kiểm tra lịch trống" }).click();
  await expect(page.getByText("Thời gian này có thể đặt")).toBeVisible();
  await page
    .getByRole("button", { name: "Đặt thuê Studio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Tăng Đèn LED Aputure 300d" }).click();
  await page
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email", { exact: true }).fill("khach@studiohub.demo");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StudioHub123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kiểm tra và xác nhận" }),
  ).toBeVisible();
  await expect(page.getByText("660.000đ", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Tôi đã đọc và đồng ý" }).check();
  await page
    .getByRole("button", { name: "Tạo đơn & đặt cọc", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/payment\/SH-/);
  const code = page.url().split("/").at(-1)!;
  await page
    .getByRole("button", { name: "Tôi đã thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã đặt cọc mô phỏng" }),
  ).toBeVisible();
  await expect(
    page.getByText("Chờ chủ Studio xác nhận đơn thuê.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đã đặt cọc mô phỏng" }),
  ).toBeVisible();
  await expect(page.locator(".payment-history>div")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Tôi đã thanh toán", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Xem chi tiết đơn", exact: true })
    .click();
  const host = await context.newPage();
  await initialize(host);
  await login(host, "chu@studiohub.demo");
  await host.goto(`/host/bookings/${code}`);
  await expect(
    host.getByRole("heading", { name: code, exact: true }),
  ).toBeVisible();
  await expect(
    host.getByRole("listitem").filter({ hasText: "Đèn LED Aputure 300d × 1" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận đơn thuê", exact: true })
    .click();
  await expect(page.getByText("Đã xác nhận", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Đã xác nhận", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hủy đơn thuê", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy đơn thuê", exact: true })
    .click();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(host.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Khoản cọc chờ xử lý theo chính sách.", { exact: false }),
  ).toBeVisible();
  await page.goto("/booking/phong-nang");
  await rental(page);
  await expect(
    page.getByText("Thời gian đã chọn có thể đặt.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("failed and user-cancelled payments retry the existing order", async ({
  page,
}) => {
  await login(page, "khach@studiohub.demo");
  const code = await makeBooking(page);
  await page.getByRole("button", { name: "Mô phỏng thất bại" }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa hoàn tất đặt cọc" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Thử thanh toán lại", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/payment/${code}$`));
  await page
    .getByRole("button", { name: "Dừng thanh toán", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Thử thanh toán lại", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tôi đã thanh toán", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/payment/${code}/result$`));
  await expect(page.locator(".payment-history>div")).toHaveCount(3);
});
test("a concurrent booking conflicts, and expired holds cannot be paid", async ({
  page,
  context,
}) => {
  await login(page, "khach@studiohub.demo");
  await makeBooking(page, true);
  const other = await context.newPage();
  await initialize(other);
  await other.goto("/booking/phong-nang");
  await rental(other);
  await other
    .getByRole("button", { name: "Tiếp tục", exact: true })
    .first()
    .click();
  await expect(
    other.getByRole("alert").filter({ hasText: "Phòng đã được giữ" }),
  ).toBeVisible();
  await page.clock.fastForward(16 * 60000);
  await expect(
    page.getByText("Thời gian giữ chỗ đã hết.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tôi đã thanh toán", exact: true }),
  ).toHaveCount(0);
});
test("admin approves a pending host, whose tab gains management access without an automatic studio", async ({
  page,
  context,
}) => {
  const pending = await context.newPage();
  await initialize(pending);
  await login(pending, "choduyet@studiohub.demo");
  await expect(
    pending.getByRole("heading", { name: "Hồ sơ đang chờ duyệt" }),
  ).toBeVisible();
  await login(page, "admin@studiohub.demo");
  await page.goto("/admin/users/host-pending");
  await page
    .getByRole("button", { name: "Duyệt Chủ Studio", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    pending.getByRole("heading", { name: "Tài khoản đang hoạt động" }),
  ).toBeVisible();
  await pending.getByRole("link", { name: "Vào khu vực của tôi" }).click();
  await expect(
    pending.getByRole("heading", { name: "Studio đầu tiên của bạn" }),
  ).toBeVisible();
  await expect(
    pending.getByRole("link", { name: "Tạo Studio đầu tiên" }),
  ).toBeVisible();
});
test("admin hiding removes public rooms, keeps existing snapshots readable, and exceptional cancellation records its reason", async ({
  page,
  context,
}) => {
  const customer = await context.newPage();
  await initialize(customer);
  await login(customer, "khach@studiohub.demo");
  await customer.goto("/my-bookings/SH-DEMO-003");
  const publicPage = await context.newPage();
  await initialize(publicPage);
  await publicPage.goto("/studios?location=Bình Thạnh");
  await expect(publicPage.locator(".room-card")).toHaveCount(2);
  await login(page, "admin@studiohub.demo");
  await page.goto("/admin/studios/studio-1");
  await page.getByRole("button", { name: "Ẩn Studio", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Lý do", { exact: true })
    .fill("Kiểm tra địa chỉ demo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(publicPage.locator(".room-card")).toHaveCount(0);
  await expect(
    customer.getByRole("heading", { name: "SH-DEMO-003", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/bookings/SH-DEMO-003");
  await page.getByRole("button", { name: "Hủy đơn đặc biệt" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Lý do", { exact: true })
    .fill("Studio đang được kiểm tra trong demo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Admin hủy đơn", exact: true })
    .click();
  await expect(
    customer.getByText("Admin hủy đơn", { exact: true }),
  ).toBeVisible();
  await expect(
    customer.getByText("Studio đang được kiểm tra trong demo", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/audit?q=SH-DEMO-003");
  await expect(
    page.getByRole("cell", { name: "Admin hủy đơn", exact: true }),
  ).toBeVisible();
});
test("locked sessions are retained and limited to account status", async ({
  page,
  context,
}) => {
  const customer = await context.newPage();
  await initialize(customer);
  await login(customer, "khach@studiohub.demo");
  await customer.goto("/my-bookings");
  await login(page, "admin@studiohub.demo");
  await page.goto("/admin/users/customer-1");
  await page
    .getByRole("button", { name: "Khóa tài khoản", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Lý do", { exact: true })
    .fill("Lý do kiểm tra mẫu");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(customer).toHaveURL(/\/account\/status/);
  await expect(
    customer.getByRole("heading", { name: "Tài khoản bị khóa" }),
  ).toBeVisible();
  await expect(
    customer.getByText("Lý do kiểm tra mẫu", { exact: true }),
  ).toBeVisible();
  await customer.goto("/booking/phong-nang");
  await expect(customer).toHaveURL(/\/account\/status/);
});
test("demo reset restores seed data after a confirmed destructive action", async ({
  page,
}) => {
  await login(page, "khach@studiohub.demo");
  const code = await makeBooking(page);
  await page.getByRole("button", { name: "Tài khoản Nguyễn Minh Anh" }).click();
  await page.getByRole("menuitem", { name: "Đặt lại dữ liệu demo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đặt lại dữ liệu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await login(page, "khach@studiohub.demo");
  await page.goto(`/my-bookings/${code}`);
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy đơn thuê" }),
  ).toBeVisible();
  await page.goto("/my-bookings/SH-DEMO-003");
  await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
});
test("gallery keyboard navigation, focus trap, Escape and focus restoration", async ({
  page,
}) => {
  await page.goto("/studios/phong-nang");
  const trigger = page.getByRole("button", {
    name: "Xem tất cả ảnh",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("dialog").getByText("2 / 5", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog")).toContainText("Phòng Nắng");
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  }
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
