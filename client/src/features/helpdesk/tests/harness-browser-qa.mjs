import { chromium, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const base=process.env.HELPDESK_QA_URL || "http://localhost:3000";
const browser=await chromium.launch({headless:true});
const errors=[];let scenarios=0;
try {
  for(const width of [390,1440])for(const reducedMotion of ["reduce","no-preference"]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
    const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
    let loggedIn=false,creates=0;const id=randomUUID();const history=[];const submitted=[];
    await page.route("**/api/rest/**",async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/auth/profile"))return route.fulfill({status:loggedIn?200:401,json:loggedIn?{status:"success",data:{user_id:1,role:"customer",full_name:"Synthetic Customer",email:"synthetic@example.test",phone:null}}:{status:"error",errors:[{code:"unauthorized"}]}});
      // Public room metadata is real local API data; session and agent are fixtures.
      if(/^\/api\/rest\/(rooms|space-types|amenities|equipments|studios)/.test(url.pathname)) {
        const target=base+url.pathname+url.search;
        let r;
        try { r=await fetch(target,{headers:{Connection:"close"}}); }
        catch { r=await fetch(target,{headers:{Connection:"close"}}); }
        return route.fulfill({status:r.status,body:await r.text(),contentType:"application/json"});
      }
      return route.fulfill({json:{status:"success",data:[]}});
    });
    await page.route("**/api/helpdesk/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      if(!loggedIn)return route.fulfill({status:401,json:{status:"error",errors:[{code:"authentication_required"}]}});
      if(path.endsWith("/conversations/current"))return route.fulfill({json:{status:"success",data:{conversation:creates?{id,state:"bot_active"}:null,messages:history}}});
      if(path.endsWith("/conversations")) {creates++;return route.fulfill({json:{status:"success",data:{conversation:{id}}}});}
      const body=route.request().postDataJSON();submitted.push({path,context:body.context});
      const room=body.context.roomId;
      const response={text:`Thông tin đã xác minh cho phòng ${room}.`,mode:"connected",state:"answered",sources:[],cards:room===6?[{kind:"room",roomId:"15",title:"Zenith Vocal Recording Booth",description:"Phòng khác để so sánh"}]:[]};
      history.push({id:randomUUID(),role:"user",text:body.text,createdAt:new Date().toISOString()},{id:randomUUID(),role:"assistant",text:response.text,createdAt:new Date().toISOString(),response});
      return route.fulfill({json:{status:"success",data:{response}}});
    });
    await page.goto(base+"/rooms/6");
    const launcher=page.getByRole("button",{name:"Trò chuyện với StudioHub AI",exact:true});
    await launcher.click();const panel=page.locator("#studiohub-helpdesk");
    await expect(panel).toContainText("Đăng nhập để trò chuyện");await expect(panel.locator("textarea")).toHaveCount(0);expect(creates).toBe(0);
    const restored=page.waitForResponse(r=>r.url().endsWith("/api/helpdesk/conversations/current"));
    loggedIn=true;await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await restored;
    await launcher.click();await expect(panel).toBeVisible();
    await expect(panel.locator("#helpdesk-mode")).toContainText("Zenith Music Recording");
    let input=panel.getByLabel("Tin nhắn của bạn",{exact:true});await expect(input).toBeEnabled();await input.fill("Giá phòng này?");await input.press("Enter");
    await expect(panel.getByRole("log")).toContainText("phòng 6");
    await panel.locator('a[href="/rooms/15"]').click();await page.waitForURL("**/rooms/15");
    await expect(panel).toBeVisible();await expect(panel.getByRole("log")).toContainText("phòng 6");
    await expect(panel.locator("#helpdesk-mode")).toContainText("Zenith Vocal Recording Booth");
    input=panel.getByLabel("Tin nhắn của bạn",{exact:true});await input.fill("Phòng này có gì?");await input.press("Enter");await expect(panel.getByRole("log")).toContainText("phòng 15");
    expect(creates).toBe(1);expect(submitted.map(r=>r.context.roomId)).toEqual([6,15]);expect(submitted[0].path).toBe(submitted[1].path);
    const resume=page.waitForResponse(r=>r.url().endsWith("/api/helpdesk/conversations/current"));await page.reload();await resume;await launcher.click();
    await expect(panel.getByRole("log")).toContainText("phòng 6");await expect(panel.getByRole("log")).toContainText("phòng 15");expect(creates).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    loggedIn=false;await page.evaluate(()=>window.dispatchEvent(new Event("studiohub:session-expired")));await launcher.click();
    await expect(panel).toContainText("Đăng nhập để trò chuyện");await expect(panel).not.toContainText("Thông tin đã xác minh");await expect(panel.locator("textarea")).toHaveCount(0);
    scenarios++;await context.close();
  }
  expect(errors).toEqual([]);console.log(JSON.stringify({scenarios,pageErrors:errors.length,loginRequired:true,sameConversationAcrossPages:true,currentRoomContext:true,resumeAfterReload:true,identityReset:true,reducedMotion:true,provider:"none",sessionAndAgent:"fixtures"}));
} finally {await browser.close();}
