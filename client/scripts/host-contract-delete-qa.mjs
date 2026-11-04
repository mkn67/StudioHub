import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
const base = process.env.QA_BASE_URL || "http://localhost:3000", api = process.env.QA_API_URL || "http://localhost:8000";
const output = new URL("../test-results/host-contract-delete/", import.meta.url); await mkdir(output, { recursive:true });
const browser = await chromium.launch(), contexts = [], errors = [], writes = [];
let release;
async function login(email) {
  const response = await fetch(`${api}/api/auth/login`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:process.env.QA_PASSWORD || "password123"})});
  assert.equal(response.status,200); return (await response.json()).data;
}
async function read(path,token) { const response = await fetch(`${api}${path}`,{headers:{Authorization:`Bearer ${token}`}}); assert.equal(response.status,200); return (await response.json()).data; }
async function pageFor(auth) {
  const context = await browser.newContext({viewport:{width:1440,height:1000},locale:"vi-VN"}); contexts.push(context);
  await context.addInitScript(token=>{if(location.origin!=="null")sessionStorage.setItem("studiohub.api-token",token);},auth.token);
  await context.route("https://images.unsplash.com/**",route=>route.abort());
  await context.route(`${api}/**`,async route=>{
    const request=route.request();
    if (!["GET","OPTIONS"].includes(request.method()) && new URL(request.url()).pathname!=="/api/auth/logout") {
      writes.push({path:new URL(request.url()).pathname,method:request.method(),body:JSON.parse(request.postData())});
      await new Promise(resolve=>{release=resolve;}); return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  const page=await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror",error=>errors.push(error.message)); return page;
}
async function goto(page,path) {await page.goto(`${base}${path}`,{waitUntil:"networkidle"});}
async function shot(page,name) {await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output)),fullPage:await page.getByRole("dialog").count()===0,animations:"disabled"});}
async function noOverflow(page) {assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
try {
  const auth=await login("host1@studio.local"), page=await pageFor(auth);
  const studios=await read("/api/studios/mine",auth.token); assert.ok(studios.length);
  const equipments=await read(`/api/equipments?studio_id=${studios[0].studio_id}`,auth.token); assert.ok(equipments.length);
  const rooms=(await read("/api/rooms?page=1&limit=50",auth.token)).items.filter(room=>String(room.studio_id)===String(studios[0].studio_id)); assert.ok(rooms.length);
  const rates=await read(`/api/rooms/${rooms[0].room_id}/rates`,auth.token); assert.ok(rates.length);
  const profile=await read("/api/auth/profile",auth.token);
  const widths=process.env.QA_VIEWPORTS?.split(",").map(Number) || [360,390,768,1024,1440];
  for (const width of widths) {
    await page.setViewportSize({width,height:1000});
    for (const path of ["equipments","rates","settings"]) {
      await goto(page,`/host/${path}`); await expect(page.locator('[data-workspace-role="host"]')).toBeVisible();
      if(path!=="settings") {await expect(page.locator(".host-table tbody tr").first()).toBeVisible(); await expect(page.getByRole("button",{name:path==="equipments"?`Ngừng cung cấp ${equipments[0].name}`:new RegExp("Ngừng áp dụng")}).first()).toBeAttached();}
      else {await expect(page.getByRole("button",{name:"Xem hợp đồng",exact:true})).toBeVisible();await expect(page.getByLabel("Ngày sinh",{exact:true})).toBeDisabled();}
      await noOverflow(page); await shot(page,`${path}-${width}`);
      if(path!=="settings") {
        await page.getByRole("button",{name:path==="equipments"?`Ngừng cung cấp ${equipments[0].name}`:/^Ngừng áp dụng /}).first().click();
        const confirm=page.getByRole("dialog");await expect(confirm).toBeVisible();await expect(confirm.getByRole("button",{name:/^Xác nhận ngừng /})).toBeVisible();
        await noOverflow(page);await shot(page,`${path}-confirm-${width}`);await confirm.getByRole("button",{name:"Hủy",exact:true}).click();
      }
    }
    await page.getByRole("button",{name:"Xem hợp đồng",exact:true}).click(); const dialog=page.getByRole("dialog"); await expect(dialog).toBeVisible();
    await expect(dialog.getByText("TÀI LIỆU MINH HỌA",{exact:true})).toBeVisible();
    await expect.poll(()=>dialog.locator("img").evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    assert.ok(await dialog.locator("img").getAttribute("src").then(src=>src.includes("contract-preview-placeholder.svg")));
    await dialog.getByRole("button",{name:"Phóng to tài liệu",exact:true}).click(); await expect(dialog.getByLabel("Tỷ lệ xem",{exact:true})).toHaveText("125%");
    await noOverflow(page); await shot(page,`contract-modal-${width}`);
    await dialog.getByRole("button",{name:"Thu nhỏ tài liệu",exact:true}).click(); await expect(dialog.getByLabel("Tỷ lệ xem",{exact:true})).toHaveText("100%");
    await shot(page,`contract-fit-${width}`);
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);await expect(page.getByRole("button",{name:"Xem hợp đồng",exact:true})).toBeFocused();
  }
  await page.setViewportSize({width:1440,height:1000});
  await goto(page,"/host/equipments");
  await page.getByRole("button",{name:`Sửa ${equipments[0].name}`,exact:true}).click(); await expect(page.getByRole("dialog").getByLabel("Tên thiết bị",{exact:true})).toHaveValue(equipments[0].name); await page.getByRole("dialog").getByRole("button",{name:"Hủy",exact:true}).click();
  const search=page.getByPlaceholder("Tên thiết bị…"); await search.fill(equipments[0].name);
  const filteredRows=await page.locator(".host-table tbody tr").count(); const equipmentAction=page.getByRole("button",{name:`Ngừng cung cấp ${equipments[0].name}`,exact:true});
  await equipmentAction.click(); let dialog=page.getByRole("dialog"); await expect(dialog.getByText(equipments[0].name,{exact:true})).toBeVisible(); await shot(page,"equipment-confirm");
  await dialog.getByRole("button",{name:"Hủy",exact:true}).click(); await expect(equipmentAction).toBeFocused();assert.equal(writes.length,0);
  await equipmentAction.click(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);await expect(equipmentAction).toBeFocused();
  await equipmentAction.click();await page.getByRole("dialog").getByRole("button",{name:"Xác nhận ngừng cung cấp",exact:true}).click(); await expect.poll(()=>typeof release).toBe("function");
  await expect(page.getByRole("dialog").getByRole("button",{name:"Đang xử lý…",exact:true})).toBeDisabled();
  await page.getByRole("dialog").locator("form").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));assert.equal(writes.length,1);
  await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toBeVisible();release();release=undefined;
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Chưa xác nhận được thay đổi"); await shot(page,"equipment-error");
  assert.deepEqual(writes[0],{path:`/api/equipments/${equipments[0].equipment_id}`,method:"PATCH",body:{status:"inactive"}});
  await page.getByRole("dialog").getByRole("button",{name:"Hủy",exact:true}).click();await expect(search).toHaveValue(equipments[0].name);assert.equal(await page.locator(".host-table tbody tr").count(),filteredRows);await expect(page.locator(".host-success")).toHaveCount(0);
  await goto(page,"/host/rates");
  await page.getByRole("button",{name:/^Sửa giá /}).first().click(); await expect(page.getByRole("dialog").getByLabel("Giá (VND)",{exact:true})).toHaveValue(String(rates[0].unit_price));await page.getByRole("dialog").getByRole("button",{name:"Hủy",exact:true}).click();
  const rateAction=page.getByRole("button",{name:/^Ngừng áp dụng /}).first(); await rateAction.click();dialog=page.getByRole("dialog");
  await expect(dialog.getByText(rooms[0].name,{exact:true})).toBeVisible(); await expect(dialog.getByText(new RegExp(`${rates[0].unit_minutes} phút`))).toBeVisible();await shot(page,"rate-confirm");
  await dialog.getByRole("button",{name:"Hủy",exact:true}).click();await expect(rateAction).toBeFocused();
  await rateAction.click();await page.getByRole("dialog").getByRole("button",{name:"Xác nhận ngừng áp dụng",exact:true}).click();await expect.poll(()=>typeof release).toBe("function");assert.equal(writes.length,2);release();release=undefined;
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();assert.deepEqual(writes[1],{path:`/api/rooms/${rooms[0].room_id}/rates/${rates[0].rate_id}`,method:"PATCH",body:{status:"inactive"}});await shot(page,"rate-error");
  await page.getByRole("dialog").getByRole("button",{name:"Hủy",exact:true}).click(); assert.equal(await page.locator(".host-table tbody tr").count(),rates.length);await expect(page.locator(".host-success")).toHaveCount(0);
  await goto(page,"/host/settings");await expect(page.getByLabel("Họ tên",{exact:true})).toHaveValue(profile.full_name);await expect(page.getByLabel("Email",{exact:true})).toHaveAttribute("readonly","");
  assert.equal(await page.locator('.host-legal-profile input,.host-legal-profile select,input[type="file"]').count(),0);assert.equal(await page.getByText("Đã ký",{exact:true}).count(),0);
  const compact=page.getByRole("switch",{name:"Chế độ hiển thị gọn",exact:true}), reduced=page.getByRole("switch",{name:"Giảm hiệu ứng chuyển động",exact:true});await compact.click();await reduced.click();await page.reload({waitUntil:"networkidle"});await expect(compact).toHaveAttribute("aria-checked","true");await expect(reduced).toHaveAttribute("aria-checked","true");
  const stored=await page.evaluate(()=>Object.keys(localStorage).map(key=>({key,value:localStorage.getItem(key)})));assert.ok(stored.every(item=>item.key.startsWith("studiohub.workspace.preferences.v1.")&&Object.keys(JSON.parse(item.value)).every(key=>["compact","reduceMotion"].includes(key))));
  await page.getByRole("button",{name:"Xem hợp đồng",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Tab");assert.ok(await page.getByRole("dialog").evaluate(el=>el.contains(document.activeElement)));await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();await expect(page.getByRole("button",{name:"Xem hợp đồng",exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Mở bản xem trước hợp đồng minh họa",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");
  const name=page.getByLabel("Họ tên",{exact:true});await name.fill("Bản nháp tài khoản không lưu");await page.getByRole("button",{name:"Lưu thông tin",exact:true}).click();await expect.poll(()=>typeof release).toBe("function");release();release=undefined;await expect(page.locator(".host-form-error")).toBeVisible();assert.deepEqual(Object.keys(writes[2].body).sort(),["full_name","phone"]);await expect(name).toHaveValue("Bản nháp tài khoản không lưu");
  page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Hủy thay đổi",exact:true}).click();
  for(const path of ["","studios","rooms","calendar","bookings","reports","policies"]) {await goto(page,`/host/${path}`);await expect(page.locator('[data-workspace-role="host"]')).toBeVisible();await noOverflow(page);}
  const admin=await pageFor(await login("admin@studio.local"));await goto(admin,"/admin/settings");await expect(admin.getByRole("heading",{name:"Giao diện làm việc",exact:true})).toBeVisible();assert.equal(await admin.locator(".host-contract-panel,.host-legal-profile").count(),0);assert.equal(await admin.getByLabel("Ngày sinh",{exact:true}).count(),0);
  const customer=await pageFor(await login("customer@studio.local"));await goto(customer,"/profile");await expect(customer.locator(".customer-profile-form")).toBeVisible();assert.equal(await customer.locator(".host-contract-panel,.host-legal-profile").count(),0);
  assert.deepEqual(await read(`/api/equipments?studio_id=${studios[0].studio_id}`,auth.token),equipments);assert.deepEqual(await read(`/api/rooms/${rooms[0].room_id}/rates`,auth.token),rates);
  assert.deepEqual(errors,[]);assert.equal(writes.length,3);
  console.log("PASS: real Host equipment/rates/settings across 5 widths, confirm/cancel/Escape/focus/edit/filter, correct blocked PATCH IDs/status/pending/duplicate/errors/no fake deletion, contract SVG/zoom/close/focus/mobile, preferences, profile payload, Customer/Admin/Host regression. No database mutation forwarded.");
} finally { for(const context of contexts)await context.close();await browser.close(); }
