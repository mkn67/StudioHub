import { chromium } from "@playwright/test";
import fs from "node:fs";
const out = ".impeccable/review/production";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const resize = async (viewport) => {
  // Let React commit and finish finite transitions before changing the viewport.
  // Chromium aborts an active ViewTransition when its snapshot size changes.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.allSettled(
      document.getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    );
  });
  await page.setViewportSize(viewport);
};
const errors = [];
const observations = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const go = async (path) => {
  await page.goto("http://127.0.0.1:3001" + path);
  await page.waitForFunction(() => !document.querySelector(".loading"));
  await page.waitForTimeout(150);
};
const shot = async (name, width) => {
  await resize({ width, height: width < 640 ? 844 : 1000 });
  await page.screenshot({
    path: `${out}/${name}-${width}.png`,
    fullPage: (await page.getByRole('dialog').count())===0,
  });
  const w = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  if (w.page > w.viewport + 1)
    errors.push(`${name} overflow at${width}: ${w.page}`);
};
const pair = async (name) => {
  for (const width of [1440, 390]) await shot(name, width);
  await resize({ width: 1440, height: 1000 });
};
const login = async (persona) => {
  await go("/login");
  await page.getByLabel("Tài khoản minh họa").selectOption(persona);
  await page
    .getByRole("button", { name: "Đăng nhập bản demo", exact: true })
    .click();
  await page.waitForURL(
    persona === "host"
      ? "**/host"
      : persona === "admin"
        ? "**/admin"
        : "**/my-bookings",
  );
};
for (const width of [360, 390, 768, 1024, 1440])
  for (const [route, name] of [
    ["/", "home"],
    ["/rooms", "search"],
    ["/rooms/a102", "room"],
  ]) {
    await go(route);
    await shot(name, width);
  }
await resize({ width: 1440, height: 1000 });
await go("/rooms/a102");
await page
  .getByRole("button", { name: "Chọn lịch thuê", exact: true })
  .first()
  .click();
await pair("wizard-step1");
await page.getByLabel("Số người tham gia").fill("99");
await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
await page.getByRole('dialog').getByRole("alert").waitFor();
await pair("wizard-validation");
await page.getByLabel("Số người tham gia").fill("3");
await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
await pair("wizard-step2");
await page.getByLabel("Số lượng Đèn LED Aputure 300D").fill("1");
await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
await pair("wizard-step3");
await page.getByRole("checkbox").check();
await page
  .getByRole("button", { name: "Đăng nhập để tiếp tục", exact: true })
  .click();
await pair("wizard-inline-login");
await resize({width:390,height:844});await page.getByRole('dialog').evaluate(d=>d.scrollTop=d.scrollHeight);await shot('wizard-review-bottom',390);await resize({width:1440,height:1000});
// Native dialog keeps keyboard focus inside the booking flow.
for (let i = 0; i < 12; i++) {
  await page.keyboard.press("Tab");
  if (!(await page.evaluate(() => !!document.activeElement?.closest("dialog"))))
    errors.push("keyboard focus escaped modal");
}
await page
  .getByRole("button", { name: "Tiếp tục với Minh Anh", exact: true })
  .click();
await page
  .getByRole("button", { name: "Xác nhận & đến thanh toán", exact: true })
  .click();
await page.waitForURL("**/payment/*");
const id = new URL(page.url()).pathname.split("/")[2];
await pair("payment");
await page
  .getByRole("button", { name: "Mô phỏng thanh toán thất bại", exact: true })
  .click();
await page.waitForURL("**/result");
await pair("payment-failed");
await page
  .getByRole("button", { name: "Mô phỏng thanh toán thành công", exact: true })
  .click();
await page.waitForURL("**/result");
await pair("payment-success");
await go("/my-bookings/" + id);
await page.getByText("Chờ chủ Studio duyệt", { exact: true }).waitFor();
await page.reload();
await page.getByText("Chờ chủ Studio duyệt", { exact: true }).waitFor();
await pair("booking-pending");
observations.push(
  "Booking survived refresh; independent paid deposit/pending reservation visible.",
);
await login("host");
await go("/host/bookings/" + id);
await page
  .getByRole("button", { name: "Xác nhận cho thuê", exact: true })
  .click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Xác nhận", exact: true })
  .click();
await page.getByText("Đã xác nhận", { exact: true }).waitFor();
for (const width of [360, 390, 768, 1024, 1440])
  for (const [route, name] of [
    ["/host", "host"],
    ["/host/calendar", "calendar"],
    ["/host/bookings", "kanban"],
    ["/host/rooms", "inventory"],
  ]) {
    await go(route);
    await shot(name, width);
  }
await resize({ width: 1440, height: 1000 });
await login("customer");
await go("/my-bookings/" + id);
await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
await page
  .getByRole("dialog")
  .getByLabel("Lý do", { exact: true })
  .fill("Thay đổi kế hoạch · kiểm thử");
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Xác nhận", exact: true })
  .click();
await page.getByText("Đã hủy", { exact: true }).waitFor();
await pair("booking-refund-pending");
observations.push(
  "Cancelled booking retains paid deposit and separate pending refund.",
);
await login("admin");
for (const width of [390, 1440]) {
  await go("/admin/host-requests");
  await shot("admin", width);
}
await page.getByRole("button", { name: "Duyệt đối tác", exact: true }).click();
await page
  .getByText("Đã cấp quyền Host. Đối tác tiếp tục thiết lập Studio.")
  .waitFor();
observations.push("Admin approval updated Host application.");
for (const route of [
  "/admin",
  "/admin/users",
  "/admin/studios",
  "/admin/equipments",
  "/admin/roles",
  "/admin/audit-logs",
  "/admin/refunds",
]) {
  await go(route);
  if (await page.getByText("Không tìm thấy trang", { exact: true }).count())
    errors.push("broken " + route);
}
await login("host");
for (const route of [
  "/host/studios",
  "/host/equipments",
  "/host/rates",
  "/host/reports",
  "/host/settings",
]) {
  await go(route);
  if (await page.getByText("Không tìm thấy trang", { exact: true }).count())
    errors.push("broken " + route);
}
await login("customer");
await resize({ width: 390, height: 844 });
await go("/rooms");
await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
await shot("filter-open", 390);
await page.getByRole('dialog').getByLabel("Sức chứa từ").fill("99");
await page.getByRole("button", { name: "Xem 0 phòng", exact: true }).click();
await page.getByText("Chưa tìm thấy phòng phù hợp", { exact: true }).waitFor();
await shot("search-empty", 390);
await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
await page
  .getByRole("button", { name: "Xóa tất cả", exact: true })
  .last()
  .click();
await page.getByRole("button", { name: "Xem 8 phòng", exact: true }).click();
observations.push(
  "Mobile filters update results, show empty state, and clear correctly.",
);
await go("/rooms/a102");
await page.getByRole("button", { name: "Mở ảnh 1", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");
if (await page.getByRole("dialog").count())
  errors.push("lightbox Escape did not close");
await browser.close();
fs.writeFileSync(
  `${out}/results.json`,
  JSON.stringify({ id, errors, observations }, null, 2),
);
console.log(JSON.stringify({ id, errors, observations }));
if (errors.length) process.exitCode = 1;
