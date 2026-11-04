import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
const base = process.env.QA_BASE_URL || "http://localhost:3000", api = process.env.QA_API_URL || "http://localhost:8000";
const output = new URL("../test-results/customer-profile/", import.meta.url); await mkdir(output, { recursive: true });
const browser = await chromium.launch(), contexts = [], errors = [];
let attempts = 0, release, body;
async function login(email) {
  const response = await fetch(`${api}/api/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:process.env.QA_PASSWORD || "password123" }) });
  assert.equal(response.status, 200); return (await response.json()).data;
}
async function pageFor(auth) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}, locale:"vi-VN"}); contexts.push(context);
  if (auth) await context.addInitScript(token => { if (location.origin !== "null") sessionStorage.setItem("studiohub.api-token", token); },auth.token);
  await context.route(`${api}/**`, async route => {
    const request = route.request();
    if (!["GET","OPTIONS"].includes(request.method()) && new URL(request.url()).pathname !== "/api/auth/logout") {
      attempts++; body = JSON.parse(request.postData()); await new Promise(resolve => { release = resolve; }); return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message)); return page;
}
async function goto(page,path) { await page.goto(`${base}${path}`,{waitUntil:"networkidle"}); }
async function shot(page,name) { await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"})); await page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output)),fullPage:true,animations:"disabled"}); }
try {
  const customer = await login("customer@studio.local");
  const response = await fetch(`${api}/api/auth/profile`,{headers:{Authorization:`Bearer ${customer.token}`}}); assert.equal(response.status,200); const actual = (await response.json()).data;
  const guest = await pageFor(); await goto(guest,"/profile"); await expect(guest.getByRole("link",{name:"Đăng nhập",exact:true}).first()).toBeVisible();
  assert.equal(await guest.getByText("Dành cho chủ Studio",{exact:true}).count(),0); assert.equal(await guest.locator(".customer-profile-form").count(),0);
  await guest.setViewportSize({width:390,height:844}); await guest.getByRole("button",{name:"Mở điều hướng",exact:true}).click(); await expect(guest.getByRole("dialog")).toBeVisible(); assert.equal(await guest.getByText("Dành cho chủ Studio",{exact:true}).count(),0);
  const page = await pageFor(customer); await goto(page,"/profile");
  await expect(page.getByLabel("Họ và tên",{exact:true})).toHaveValue(actual.full_name); await expect(page.getByLabel("Số điện thoại",{exact:true})).toHaveValue(actual.phone ?? "");
  await expect(page.getByLabel("Email",{exact:true})).toHaveValue(actual.email); await expect(page.getByLabel("Email",{exact:true})).toHaveAttribute("readonly","");
  await expect(page.locator("#customer-birthday")).toBeDisabled(); assert.equal(await page.locator('input[name="cccd"],input[name="address"],input[type="file"]').count(),0);
  assert.equal(await page.getByText("Dành cho chủ Studio",{exact:true}).count(),0); assert.equal(await page.locator(".customer-account-trigger").count(),1);
  for (const width of [360,390,768,1024,1280,1440]) {
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Overflow ${width}`);
    assert.equal(await page.locator("footer").count(),1);
    const gap = await page.evaluate(() => document.querySelector("footer").getBoundingClientRect().top - document.querySelector(".customer-profile").getBoundingClientRect().bottom); assert.ok(Math.abs(gap)<2,`Footer gap ${gap}`);
    if (width>=1024) assert.equal(await page.locator(".customer-profile-layout").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length),2);
    await shot(page,`profile-${width}`);
  }
  const trigger = page.getByRole("button",{name:"Menu tài khoản khách hàng",exact:true});
  await trigger.focus(); await page.keyboard.press("ArrowDown"); await expect(page.getByRole("menuitem",{name:"Hồ sơ của tôi",exact:true})).toBeFocused();
  await page.keyboard.press("End"); await expect(page.getByRole("menuitem",{name:"Đăng xuất",exact:true})).toBeFocused();
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.click(); await page.keyboard.press("Tab"); await expect(page.getByRole("menu")).toHaveCount(0); assert.equal(await page.evaluate(()=>document.activeElement===document.body),false);
  await trigger.click(); await shot(page,"account-menu"); await page.getByRole("heading",{name:"Hồ sơ của tôi",exact:true}).click(); await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.click(); await page.getByRole("menuitem",{name:"Đơn thuê của tôi",exact:true}).click(); await expect(page).toHaveURL(/\/my-bookings$/); await expect(page.locator(".customer-account-trigger")).toBeVisible();
  await page.locator(".customer-account-trigger").click(); await page.getByRole("menuitem",{name:"Hồ sơ của tôi",exact:true}).click(); await expect(page).toHaveURL(/\/profile$/);
  const name = page.getByLabel("Họ và tên",{exact:true}); await name.fill("   "); await page.getByRole("button",{name:"Lưu thay đổi",exact:true}).click(); await expect(page.locator(".customer-profile [role=alert]")).toContainText("Họ và tên cần"); assert.equal(attempts,0);
  await name.fill("Bản nháp kiểm thử chưa lưu"); await page.getByRole("button",{name:"Lưu thay đổi",exact:true}).click(); await expect.poll(()=>typeof release).toBe("function"); await expect(page.getByRole("button",{name:"Đang lưu…",exact:true})).toBeDisabled();
  await page.locator(".customer-profile-form").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))); assert.equal(attempts,1); assert.deepEqual(Object.keys(body).sort(),["full_name","phone"]); release();
  await expect(page.locator(".customer-profile [role=alert]")).toContainText("Không kết nối được máy chủ"); await expect(name).toHaveValue("Bản nháp kiểm thử chưa lưu"); assert.equal(await page.locator(".customer-success").count(),0); await shot(page,"save-error");
  page.once("dialog",dialog=>dialog.dismiss()); await page.locator('.customer-profile-links a[href="/my-bookings"]').click(); await expect(page).toHaveURL(/\/profile$/);
  page.once("dialog",dialog=>dialog.accept()); await page.getByRole("button",{name:"Hủy thay đổi",exact:true}).click(); await expect(name).toHaveValue(actual.full_name);
  await page.reload({waitUntil:"networkidle"}); await expect(name).toHaveValue(actual.full_name);
  await page.emulateMedia({reducedMotion:"reduce"}); await page.locator(".customer-account-trigger").click(); assert.equal(await page.getByRole("menu").evaluate(el=>getComputedStyle(el).animationName),"none");
  await page.getByRole("menuitem",{name:"Đăng xuất",exact:true}).click(); await expect(page.getByRole("link",{name:"Đăng nhập",exact:true}).first()).toBeVisible(); assert.equal(await page.evaluate(()=>sessionStorage.getItem("studiohub.api-token")),null);
  for (const [email,role] of [["host1@studio.local","host"],["admin@studio.local","admin"]]) {
    const rolePage = await pageFor(await login(email)); await goto(rolePage,`/${role}/settings`); await expect(rolePage.locator(`[data-workspace-role="${role}"]`)).toBeVisible(); assert.equal(await rolePage.locator(".site-header,.customer-account").count(),0);
    await goto(rolePage,"/profile"); await expect(rolePage.getByRole("link",{name:"Mở cài đặt tài khoản",exact:true})).toHaveAttribute("href",`/${role}/settings`); assert.equal(await rolePage.locator(".customer-profile-form").count(),0);
  }
  assert.deepEqual(errors,[]);
  console.log("PASS: real guest/customer/host/admin, 6 viewports + footer, identity fields, menu keyboard/routes/logout, validation, blocked PATCH/pending/duplicate/error/draft/discard, reload and reduced motion. No database mutation or fake success.");
} finally { for (const context of contexts) await context.close(); await browser.close(); }
