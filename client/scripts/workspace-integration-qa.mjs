import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const fixture = JSON.parse(await readFile(new URL("../tests/fixtures/workspace.json", import.meta.url), "utf8"));
const base = "http://127.0.0.1:3101", shots = new URL("../test-results/workspace-integration/", import.meta.url); await mkdir(shots, { recursive:true });
const widths = process.env.QA_VIEWPORTS?.split(",").map(Number) || [360,390,768,1024,1440];
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3101"],{cwd:new URL("../",import.meta.url),windowsHide:true,stdio:["ignore","pipe","pipe"]});let log="";server.stdout.on("data",chunk=>log+=chunk);server.stderr.on("data",chunk=>log+=chunk);
const users={host:{user_id:2,full_name:"QA Host",email:"host@qa.test",phone:"0901234567",role:"host",status:"active"},admin:{user_id:1,full_name:"QA Admin",email:"admin@qa.test",phone:"0901234568",role:"admin",status:"active"},customer:{user_id:3,full_name:"QA Customer",email:"customer@qa.test",phone:"0901234569",role:"customer",status:"active"}};
let browser;const contexts=[], errors=[], commands=[];
async function contextFor(role){
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:"vi-VN"});contexts.push(context);const state=structuredClone(fixture);state.sessionId=String(users[role]?.user_id ?? "");
  const control={fail:false,malformed:false,empty:false,hold:false,release:null,holdRead:false,releaseRead:null,unauthorized:false,workspaceGets:0};
  if(role)await context.addInitScript(token=>{if(location.origin!=="null")sessionStorage.setItem("studiohub.api-token",token);},`qa-${role}`);
  await context.route("**/*",async route=>{
    const request=route.request(),url=new URL(request.url());if(!url.pathname.startsWith("/api/")){if(url.origin!==base && url.protocol.startsWith("http"))return route.abort();return route.continue();}
    const path=url.pathname,method=request.method();const ok=data=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"success",code:200,data})});const failure=(status,message)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify({status:"error",code:status,message})});
    if(path.startsWith("/api/helpdesk"))return failure(503,"QA unavailable boundary");
    if(path==="/api/auth/profile")return role?ok(users[role]):failure(401,"QA unauthorized");
    if(path==="/api/auth/logout")return ok(null);
    if(path==="/api/workspace"){
      control.workspaceGets++;if(control.holdRead)await new Promise(resolve=>control.releaseRead=resolve);if(!role||control.unauthorized)return failure(401,"QA unauthorized");if(control.fail)return failure(503,"QA workspace unavailable");if(control.malformed)return ok({rooms:[]});
      const data=structuredClone(state);if(control.empty)for(const key of ["rooms","types","equipment","bookings","applications","audit"])data[key]=[];return ok(data);
    }
    if(path==="/api/commands"){
      const body=request.postDataJSON(),key=request.headers()["idempotency-key"];assert.match(key,/^[A-Za-z0-9_-]{16,100}$/);assert.equal(request.headers().authorization,`Bearer qa-${role}`);commands.push({role,body,key});
      if(control.hold)await new Promise(resolve=>control.release=resolve);
      if(control.fail)return failure(409,"QA command conflict - draft retained");
      if(body.type==="type_save") {const item={...body.roomType,id:body.roomType.id||"150"};const index=state.types.findIndex(t=>t.id===item.id);if(index>=0)state.types[index]=item;else state.types.push(item);}
      if(body.type==="policy")state.studios.find(s=>s.id===body.studioId).policy=body.policy;
      if(body.type==="review_application"){const item=state.applications.find(a=>a.id===body.id);item.status=body.approved?"approved":"rejected";item.reason=body.reason;}
      if(body.type==="studio_status")state.studios.find(s=>s.id===body.id).active=body.active;
      if(body.type==="room_status")state.rooms.find(r=>r.id===body.id).active=body.active;
      if(body.type==="application")state.applications.push({id:"801",userId:String(users[role].user_id),studioName:body.studioName,address:body.address,description:body.description,status:"pending",reason:null});
      return ok(state);
    }
    if(method!=="GET")return failure(501,"QA unexpected mutation");
    if(path==="/api/studios/mine")return ok(state.studios.filter(s=>s.hostId===String(users[role]?.user_id)).map(s=>({studio_id:Number(s.id),name:s.name,address:s.address,district:s.district,city:"",phone:"0901234567",status:s.active?"active":"inactive"})));
    if(path==="/api/equipment-categories")return ok([{category_id:1,name:"Lighting"}]);
    if(path.endsWith("/calendar"))return ok({busy_slots:[]});
    if(path.endsWith("/rates"))return ok([{rate_id:9,rate_unit:"hour",unit_minutes:60,unit_price:200000,minimum_units:1,maximum_units:null,status:"active",effective_from:"2030-01-01"}]);
    if(path==="/api/reports")return ok(state.report);
    if(path.endsWith("/statistics"))return ok({total_bookings:2,total_revenue:200000,occupancy_rate:25,total_rooms:3,total_studios:2,period:{from:"2030-01-01",to:"2030-02-01"}});
    if(path==="/api/bookings")return ok({items:[],total_items:0,total_pages:1,page:1});
    if(path==="/api/admin/users")return ok({items:Object.values(users),total_items:3,total_pages:1,page:1});
    if(path==="/api/space-types")return ok([]);
    if(path==="/api/rooms")return ok({items:[],pagination:{total_items:0,total_pages:1}});
    return failure(404,`QA unsupported ${path}`);
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on("pageerror",error=>errors.push(error.message));return {page,context,state,control};
}
async function goto(page,path){await page.goto(base+path,{waitUntil:"networkidle"});}
async function screenshot(page,name){await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.screenshot({path:fileURLToPath(new URL(name+".png",shots)),fullPage:await page.getByRole("dialog").count()===0,animations:"disabled"});}
try{
  for(let i=0;i<80&&!log.includes("Ready in");i++){if(server.exitCode!==null)throw Error(log);await setTimeout(250);}assert.match(log,/Ready in/);browser=await chromium.launch();
  const host=await contextFor("host"),admin=await contextFor("admin"),customer=await contextFor("customer");
  for(const width of widths){
    for(const [target,path] of [[host,"/host/rooms"],[host,"/host/equipments"],[host,"/host/policies"],[host,"/host/reports"],[admin,"/admin/host-requests"],[admin,"/admin/studios"],[admin,"/admin/equipments"],[admin,"/admin/audit-logs"],[admin,"/admin/refunds"]]){
      await target.page.setViewportSize({width,height:1000});await goto(target.page,path);assert.ok(await target.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${path} ${width}`);await screenshot(target.page,path.slice(1).replaceAll("/","-")+"-"+width);
    }
  }
  const p=host.page;await p.setViewportSize({width:1440,height:1000});host.control.holdRead=true;await p.goto(base+"/host/equipments",{waitUntil:"domcontentloaded"});await expect(p.locator(".host-skeleton").first()).toBeVisible();await expect.poll(()=>typeof host.control.releaseRead).toBe("function");host.control.holdRead=false;host.control.releaseRead();await expect(p.getByText("QA Active Light",{exact:true})).toBeVisible();await goto(p,"/host/rooms");await expect(p.getByRole("heading",{name:"QA Hidden Room",exact:true})).toBeVisible();assert.equal(await p.getByText("QA Other Room",{exact:true}).count(),0);
  await p.getByRole("button",{name:"Thêm loại phòng",exact:true}).click();let dialog=p.getByRole("dialog");await dialog.getByLabel("Tên loại phòng",{exact:true}).fill("QA Created Type");await dialog.getByLabel("Phân loại",{exact:true}).fill("Photography");await dialog.getByLabel("Giá cơ sở theo giờ (VND)",{exact:true}).fill("250000");await dialog.getByLabel("Theo giờ",{exact:true}).check();
  host.control.fail=true;host.control.hold=true;const before=commands.length;await dialog.getByRole("button",{name:"Lưu thay đổi",exact:true}).click();await expect.poll(()=>typeof host.control.release).toBe("function");await expect(dialog.getByRole("button",{name:"Đang lưu…",exact:true})).toBeDisabled();await dialog.locator("form").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));assert.equal(commands.length,before+1);host.control.release();host.control.release=null;host.control.hold=false;await expect(dialog.getByRole("alert")).toContainText("QA command conflict");await expect(dialog.getByLabel("Tên loại phòng",{exact:true})).toHaveValue("QA Created Type");const failedKey=commands.at(-1).key;
  host.control.fail=false;await dialog.getByRole("button",{name:"Lưu thay đổi",exact:true}).click();await expect(dialog).toHaveCount(0);assert.equal(commands.at(-1).key,failedKey);assert.equal(commands.at(-1).body.roomType.studioId,"10");await expect(p.getByText("QA Created Type",{exact:true})).toBeVisible();
  await p.getByRole("button",{name:"Sửa loại phòng QA Created Type",exact:true}).click();dialog=p.getByRole("dialog");await dialog.getByLabel("Tên loại phòng",{exact:true}).fill("QA Edited Type");await dialog.getByRole("button",{name:"Lưu thay đổi",exact:true}).click();await expect(p.getByText("QA Edited Type",{exact:true})).toBeVisible();assert.equal(commands.at(-1).body.roomType.id,"150");
  await goto(p,"/host/equipments");await expect(p.getByText("QA Hidden Light",{exact:true})).toBeVisible();assert.equal(await p.getByText("QA Other Light",{exact:true}).count(),0);await expect(p.getByRole("button",{name:"Ngừng cung cấp QA Hidden Light",exact:true})).toBeDisabled();
  await goto(p,"/host/policies");await p.getByRole("spinbutton",{name:"Tỷ lệ cọc (%)",exact:true}).fill("35");await p.getByRole("button",{name:"Lưu chính sách",exact:true}).click();await expect(p.getByRole("status").filter({hasText:"Chính sách đã được lưu"})).toBeVisible();assert.equal(commands.at(-1).body.studioId,"10");assert.equal(commands.at(-1).body.policy.depositPercent,35);p.once("dialog",d=>d.accept());await p.getByLabel("Chọn Studio chính sách",{exact:true}).selectOption("11");await expect(p.getByRole("spinbutton",{name:"Tỷ lệ cọc (%)",exact:true})).toHaveValue("40");
  await goto(p,"/host/calendar");await p.getByLabel("Ngày bắt đầu lịch",{exact:true}).fill("2030-01-01");await p.getByText("Đơn thuê trong kỳ từ workspace (1)",{exact:true}).click();await expect(p.getByText(/#900/)).toBeVisible();
  const a=admin.page;await a.setViewportSize({width:1440,height:1000});await goto(a,"/admin/host-requests");await a.getByRole("button",{name:"Chi tiết",exact:true}).click();await expect(a.getByRole("dialog").getByText("QA Application Description",{exact:true})).toBeVisible();await a.keyboard.press("Escape");
  await a.getByRole("button",{name:"Duyệt QA Application",exact:true}).click();await a.getByRole("dialog").getByLabel("Lý do xét duyệt",{exact:true}).fill("QA approved reason");await a.getByRole("dialog").getByRole("button",{name:"Xác nhận quyết định",exact:true}).click();await expect(a.getByRole("dialog")).toHaveCount(0);assert.equal(commands.at(-1).body.type,"review_application");assert.equal(commands.at(-1).body.id,"800");assert.equal(commands.at(-1).body.approved,true);
  await goto(a,"/admin/studios");await a.getByRole("button",{name:"Đổi trạng thái QA Owned Studio",exact:true}).click();await a.getByRole("dialog").getByLabel("Lý do đổi trạng thái",{exact:true}).fill("QA status reason");await a.getByRole("dialog").getByRole("button",{name:"Xác nhận trạng thái",exact:true}).click();await expect(a.getByRole("dialog")).toHaveCount(0);assert.equal(commands.at(-1).body.type,"studio_status");assert.equal(commands.at(-1).body.active,false);
  await goto(a,"/admin/refunds");await expect(a.getByText("QA exception",{exact:true})).toBeVisible();assert.equal(await a.getByRole("button",{name:/Xác nhận hoàn|resolve_refund/}).count(),0);
  await goto(a,"/admin/audit-logs");await expect(a.getByText("QA audit action",{exact:true})).toBeVisible();await a.getByLabel("Tìm nhật ký",{exact:true}).fill("no-match");await expect(a.getByRole("heading",{name:"Chưa có nhật ký phù hợp",exact:true})).toBeVisible();
  const c=customer.page;customer.state.applications=[];await goto(c,"/register/host");await c.getByRole("textbox",{name:"Tên Studio",exact:true}).fill("QA New Application");await c.getByRole("textbox",{name:"Địa chỉ Studio",exact:true}).fill("QA Address");await c.getByRole("textbox",{name:"Mô tả Studio",exact:true}).fill("QA Description");await c.getByRole("button",{name:"Gửi hồ sơ đăng ký",exact:true}).click();await expect(c.getByText("QA New Application",{exact:true})).toBeVisible();assert.equal(commands.at(-1).body.type,"application");
  for(const path of ["/host/rooms","/admin/host-requests"]){await goto(c,path);await expect(c.getByRole("heading",{name:"Khu vực quản lý",exact:true})).toBeVisible();}
  await goto(c,"/profile");await expect(c.getByLabel("Họ và tên",{exact:true})).toHaveValue("QA Customer");
  host.control.malformed=true;await goto(p,"/host/equipments");await expect(p.getByRole("alert").filter({hasText:"Dữ liệu workspace không hợp lệ"})).toBeVisible();host.control.malformed=false;host.control.empty=true;await p.getByRole("button",{name:"Thử lại",exact:true}).click();await expect(p.getByRole("heading",{name:/Chưa có thiết bị/})).toBeVisible();host.control.empty=false;
  await goto(p,"/host/reports");await expect(p.getByText("400.000đ",{exact:true}).first()).toBeVisible();await p.getByRole("button",{name:"Theo tuần",exact:true}).click();await expect(p.getByText("2030-W01",{exact:true})).toBeVisible();
  host.control.unauthorized=true;await goto(p,"/host/equipments");await expect(p.getByRole("heading",{name:"Khu vực quản lý",exact:true})).toBeVisible();assert.equal(await p.getByText("QA Active Light",{exact:true}).count(),0);assert.equal(await p.evaluate(()=>sessionStorage.getItem("studiohub.api-token")),null);
  assert.equal(commands.some(command=>command.body.type==="resolve_refund"),false);assert.deepEqual(errors,[]);
  console.log(`PASS: browser HTTP contract fixtures only (no PHP/DB): ${widths.length} widths, owned+inactive inventory, type create/edit, idempotent failure/retry/duplicate guard, Studio policy isolation, calendar, application+review, Admin status/audit/read-only refunds, report definitions, loading/invalid/empty/error/expired-session states and role gates.`);
}finally{for(const context of contexts)await context.close();await browser?.close();server.kill();}
