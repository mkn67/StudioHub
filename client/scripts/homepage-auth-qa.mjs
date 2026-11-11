import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.UI_QA_URL || "http://127.0.0.1:3003";
const out = new URL("../.impeccable/homepage-auth/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], checks = [];
const expect = baseExpect.configure({ timeout: 30000 });
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  let requests = [], signedIn = false, authFailure = false;
  await page.route("**/api/rest/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const success = data => route.fulfill({ json: { status: "success", data } });
    if (path.endsWith("/auth/profile")) return signedIn ? success({ user_id: 101, role: "customer", full_name: "UI Test", email: "ui@example.test", phone: null }) : route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } });
    if (/\/auth\/(login|register)$/.test(path)) {
      requests.push(req.postDataJSON());
      await new Promise(resolve => setTimeout(resolve, 500));
      if (authFailure) return route.fulfill({ status: 422, json: { status: "error", message: "Email đã được sử dụng.", errors: [{ field: "email", code: "duplicate", message: "Email đã được sử dụng." }] } });
      signedIn = true;
      return success({ user: { user_id: 101, role: "customer" } });
    }
    if (path.endsWith("/space-types")) return success([{ space_type_id: 3, name: "Podcast", description: "Thu âm", group_name: "Audio & Event" }]);
    if (path.endsWith("/rooms")) return success({ items: [], pagination: { total: 0, page: 1, limit: 12, total_pages: 0 } });
    if (/\/rooms\/\d+$/.test(path)) return route.fulfill({ status: 404, json: { status: "error", message: "Không tìm thấy phòng trong bộ dữ liệu kiểm thử." } });
    if (path.endsWith("/bookings")) return success({ items: [], total_pages: 1 });
    return success([]);
  });
  await page.route("**/api/helpdesk/**", route => route.fulfill({ status: 401, json: { status: "error", message: "Chưa đăng nhập" } }));
  for (const width of [360, 390, 768, 1024, 1280, 1440, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/register"]) {
      await page.goto(base + path);
      await expect(page.locator(path === "/" ? "#home-title" : "#auth-title")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (path === "/") await page.locator(".hero-photo").evaluate(image => image.decode());
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (path === "/") {
        const style = await page.locator(".hero-editorial").evaluate(node => { const s = getComputedStyle(node); return { background: s.backgroundColor, border: s.borderTopWidth, shadow: s.boxShadow }; });
        expect(style).toEqual({ background: "rgba(0, 0, 0, 0)", border: "0px", shadow: "none" });
        await expect(page.locator(".hero-search")).toContainText("Chọn lịch tại trang phòng");
        await expect(page.locator(".hero-search input[type=date]")).toHaveCount(0);
      }
      await page.screenshot({ path: new URL(`${path === "/" ? "home" : path.slice(1)}-${width}.png`, out).pathname.replace(/^\/(\w:)/, "$1"), fullPage: path !== "/" });
      checks.push(`${path} ${width}px: no horizontal overflow, content visible`);
    }
  }
  await page.goto(base + "/");
  await page.getByRole("combobox", { name: "Tên Studio, loại phòng hoặc nhu cầu" }).fill("podcast Quận 3");
  await page.locator(".hero-search select").selectOption("3");
  await page.getByRole("button", { name: "Tìm Studio", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/rooms" && url.searchParams.get("keyword") === "podcast Quận 3" && url.searchParams.get("space_type_id") === "3");
  const navStyle = await page.locator('.public-header .public-nav a[aria-current="page"]').evaluate(node => ({ decoration: getComputedStyle(node).textDecorationLine, after: getComputedStyle(node, "::after").content }));
  expect(navStyle).toEqual({ decoration: "none", after: "none" });
  await expect(page.locator(".public-nav .motion-active-indicator")).toHaveCSS("opacity", "1");
  checks.push("Search preserves keyword/category; one public navigation underline");

  await page.goto(base + "/login?returnTo=%2Frooms%2F6%3Fplan%3Dhour");
  await page.getByText("Quên mật khẩu?", { exact: true }).click();
  await expect(page.getByText("StudioHub hiện chưa hỗ trợ đặt lại mật khẩu qua email.", { exact: false })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect(requests.length).toBe(0);
  await page.getByLabel("Email", { exact: true }).fill("ui@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("example123");
  await page.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  authFailure = true;
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("#email-error")).toBeVisible();
  authFailure = false;
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("form fieldset")).toHaveAttribute("disabled", "");
  await expect(page.getByRole("button", { name: "Đang xử lý…", exact: true })).toBeDisabled();
  await page.locator("form").evaluate(form => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  await page.waitForURL("**/rooms/6?plan=hour");
  expect(requests.length).toBe(2);
  checks.push("Login invalid input, password visibility, loading, duplicate guard, safe returnTo, recovery disclosure");

  signedIn = false; requests = []; authFailure = true;
  await page.goto(base + "/register");
  const consent = page.locator("#terms-acceptance");
  await expect(consent).not.toBeChecked();
  await page.getByLabel("Họ và tên", { exact: true }).fill("UI Test");
  await page.getByLabel("Email", { exact: true }).fill("ui@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  expect(requests.length).toBe(0);
  await page.locator("#password").fill("example123");
  await page.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.locator("#consent-error")).toBeVisible();
  expect(requests.length).toBe(0);
  for (const [name, path] of [["Chính sách", "/policies/privacy"], ["Điều khoản", "/policies/terms"]]) {
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name, exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForURL(base + path);
    await expect(popup.locator(".legal-document")).toBeVisible();
    await popup.close();
    await expect(consent).not.toBeChecked();
    expect(requests.length).toBe(0);
  }
  await consent.check();
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.locator("#email-error")).toHaveText("Email đã được sử dụng.");
  expect(Object.keys(requests[0]).sort()).toEqual(["email", "full_name", "password", "phone"]);
  authFailure = false;
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await page.waitForURL("**/my-bookings");
  checks.push("Register required inputs, password minimum, unchecked consent blocking, legal links, API errors, allowed payload, success");
  await context.close();
  const animated = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const animatedPage = await animated.newPage();
  await animatedPage.goto(base);
  await expect(animatedPage.locator("#home-title")).toBeVisible();
  await animatedPage.waitForTimeout(1600);
  await animatedPage.screenshot({ path: new URL("home-motion-1440.png", out).pathname.replace(/^\/(\w:)/, "$1") });
  checks.push("Existing homepage animation renders with no-preference; all form/layout tests use reduced motion");
  expect(errors).toEqual([]);
  await writeFile(new URL("results.json", out), JSON.stringify({ checks, errors, api: "deterministic intercepted fixtures; no real auth mutations" }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ checks, errors }, null, 2));
  throw error;
} finally { await browser.close(); }
