import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localSession } from "./local-session.mjs";
if(!process.argv.includes("--live"))throw new Error("This harness check calls the configured model; explicitly use --live.");
const base="http://localhost:3000";let cookie=await localSession();let calls=0;
const request=async(path,body)=>{
  const r=await fetch(base+"/api/helpdesk/"+path,{method:body?"POST":"GET",headers:{Origin:base,Cookie:cookie,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(35000)});
  const data=await r.json();
  if(!r.ok)throw new Error(`Harness request failed: HTTP ${r.status}, ${data.errors?.[0]?.code??"unknown"}`);
  const next=r.headers.getSetCookie().map(v=>v.split(";")[0]).filter(v=>v.startsWith("studiohub_helpdesk_session="));if(next.length)cookie=cookie.split("; ").filter(v=>!v.startsWith("studiohub_helpdesk_session=")).concat(next).join("; ");
  return data.data;
};
const context=roomId=>({surface:"public",scope:"catalog",...(roomId?{roomId}:{})});
const create=async()=> (await request("conversations",{locale:"vi-VN"})).conversation.id;
const send=async(id,text,roomId)=>{
  const r=await request(`conversations/${id}/messages`,{text,context:context(roomId),clientMessageId:randomUUID()});calls++;
  console.log(JSON.stringify({turn:calls,answerKind:r.answerKind,state:r.response.state,cards:r.response.cards?.length??0,conversationId:id}));
  assert.equal(r.response.state,"answered");return r;
};
let r;
if(!process.argv.includes("--names-only")) {
const id=await create();
r=await send(id,"Giá thuê, tiện ích và thiết bị của phòng này thế nào?",6);
assert.match(r.response.text,/Zenith Music Recording/);
r=await send(id,"phòng Zenith",6);assert.match(r.response.text,/Zenith Music Recording/);
r=await send(id,"Phòng này giá thuê theo giờ bao nhiêu?",15);
assert.match(r.response.text,/Zenith Vocal Recording Booth/);assert.match(r.response.text,/VND/);
r=await send(id,"Zenith Music Recording giá thuê theo giờ bao nhiêu?");
assert.match(r.response.text,/Zenith Music Recording/);assert.match(r.response.text,/VND/);
r=await send(id,"phòng thu âm giá bao nhiêu");
assert.ok(r.response.cards?.length);assert.ok(r.response.cards.every(card=>card.description.includes("VND")));
const resumed=await request("conversations/current");assert.equal(resumed.conversation.id,id);assert.equal(resumed.messages.length,10);
}
const other=await create();r=await send(other,"Giá thuê phòng Zenith thế nào?");
assert.ok(r.response.cards?.length>1);
r=await send(other,"Zenith Music Recording");assert.match(r.response.text,/Zenith Music Recording/);assert.match(r.response.text,/VND/);
console.log(JSON.stringify({passed:true,liveTurns:calls,roomContext:true,namedRoom:true,ambiguousName:true,priceIntent:true,resume:true}));
