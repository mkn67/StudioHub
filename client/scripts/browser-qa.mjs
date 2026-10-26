import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync(".impeccable/review", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:3000";
const go = async (path) => {
  await page.goto(base + path);
  await page.waitForFunction(() => !document.querySelector(".loading"));
  await page.waitForTimeout(400);
};
await go("/");
for (const width of [360, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: width < 640 ? 844 : 1000 });
  for (const [route, name] of [
    ["/", "home"],
    ["/rooms", "search"],
    ["/rooms/a102", "room"],
  ]) {
    await go(route);
    await page.screenshot({
      path: `.impeccable/review/${name}-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    if (overflow.scroll > width + 1)
      errors.push(`${route} at ${width}: overflow ${JSON.stringify(overflow)}`);
  }
}
await page.setViewportSize({ width: 1440, height: 1000 });
await go("/rooms/a102");
await page
  .getByRole("button", { name: "Chọn lịch thuê", exact: true })
  .first()
  .click();
await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
await page.getByLabel("Số lượng Đèn LED Aputure 300D").fill("1");
await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
await page.getByRole("checkbox").check();
await page
  .getByRole("button", { name: "Đăng nhập để tiếp tục", exact: true })
  .click();
await page
  .getByRole("button", { name: "Tiếp tục với Minh Anh", exact: true })
  .click();
await page
  .getByRole("button", { name: "Xác nhận & đến thanh toán", exact: true })
  .click();
await page.waitForURL("**/payment/*");
const id = new URL(page.url()).pathname.split("/")[2];
await page
  .getByRole("button", { name: "Mô phỏng thanh toán thành công", exact: true })
  .click();
await page.waitForURL("**/result");
await page.getByRole("link", { name: "Theo dõi đơn" }).click();
await page.waitForURL("**/my-bookings/*");
if (
  !(await page.getByText("Chờ chủ Studio duyệt", { exact: true }).isVisible())
)
  errors.push("paid booking did not become pending");
await page.reload();
await page.waitForFunction(() => !document.querySelector(".loading"));
if (!(await page.getByText(id, { exact: true }).first().isVisible()))
  errors.push("booking persistence failed");
await page.getByRole("button", { name: /Môi trường demo/ }).click();
await page.getByLabel("Nhân vật").selectOption("host");
await page.waitForURL("**/host");
await go("/host/bookings/" + id);
await page
  .getByRole("button", { name: "Xác nhận cho thuê", exact: true })
  .click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Xác nhận", exact: true })
  .click();
if (!(await page.getByText("Đã xác nhận", { exact: true }).isVisible()))
  errors.push("Host approval did not update shared booking");
await page.getByRole("button", { name: /Môi trường demo/ }).click();
for (const width of [360, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: width < 640 ? 844 : 1000 });
  for (const [route, name] of [
    ["/host", "host"],
    ["/host/calendar", "calendar"],
    ["/host/bookings", "kanban"],
    ["/host/rooms", "inventory"],
  ]) {
    await go(route);
    await page.screenshot({
      path: `.impeccable/review/${name}-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) errors.push(`${route} overflow at ${width}`);
  }
}
await page.getByRole("button", { name: /Môi trường demo/ }).click();
await page.getByLabel("Nhân vật").selectOption("admin");
await page.waitForURL("**/admin");
await page.getByRole("button", { name: /Môi trường demo/ }).click();
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: width < 640 ? 844 : 1000 });
  await go("/admin/host-requests");
  await page.screenshot({
    path: `.impeccable/review/admin-${width}.png`,
    fullPage: true,
  });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    )
  )
    errors.push(`admin overflow at ${width}`);
}
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Duyệt đối tác", exact: true }).click();
await page
  .getByText("Đã cấp quyền Host. Đối tác tiếp tục thiết lập Studio.")
  .waitFor();
await browser.close();
fs.writeFileSync(
  ".impeccable/review/browser-results.json",
  JSON.stringify(
    {
      journey:
        "Guest → exact A102 → equipment → sign in → deposit → persisted customer detail → Host approval",
      errors,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ id, errors }));
if (errors.length) process.exitCode = 1;
