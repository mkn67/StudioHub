import { randomUUID } from "node:crypto";
import { localSession } from "./local-session.mjs";
// Explicit opt-in: this probe sends one real chat turn through the existing app.
if(!process.argv.includes("--live"))throw new Error("Use --live to explicitly test the configured model; ordinary tests never call it.");
const base="http://localhost:3000";
const discovery=process.argv.includes("--discovery");
const authCookie=await localSession();
const roomArg=process.argv.find(arg=>arg.startsWith("--room="))?.slice(7);
const messageArg=process.argv.find(arg=>arg.startsWith("--message="))?.slice(10);
const context={surface:"public",scope:"catalog",...(roomArg?{roomId:Number(roomArg)}:{})};
function failure(stage,status,body) {
  const code=body.errors?.[0]?.code;
  const reason=typeof code==="string" && /^[a-z_]{1,64}$/.test(code)?code:"unexpected_response";
  return new Error(`${stage}: HTTP ${status}, ${reason}`);
}
const create=await fetch(base+"/api/helpdesk/conversations",{method:"POST",headers:{Origin:base,Cookie:authCookie,"Content-Type":"application/json"},body:JSON.stringify({context}),signal:AbortSignal.timeout(10000)});
const body=await create.json();
if(create.status!==201 || typeof body.data?.conversation?.id!=="string")throw failure("create",create.status,body);
const cookie=authCookie+"; "+create.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
const reply=await fetch(base+"/api/helpdesk/conversations/"+body.data.conversation.id+"/messages",{
  method:"POST",headers:{Origin:base,Cookie:cookie,"Content-Type":"application/json"},
  body:JSON.stringify({text:messageArg??(discovery?"thu âm":"Xin chào"),context,clientMessageId:randomUUID()}),signal:AbortSignal.timeout(35000),
});
const answer=await reply.json();
if(reply.status!==200)throw failure("message",reply.status,answer);
if(answer.data?.response?.state!=="answered" || typeof answer.data?.response?.text!=="string")throw new Error("The local model turn did not produce an answered response");
if(discovery && (answer.data.answerKind!=="catalog" || !answer.data.response.cards?.length)) {
  console.log(JSON.stringify({conversationId:body.data.conversation.id,answerKind:answer.data.answerKind,reasonCode:answer.data.reasonCode,roomCount:answer.data.response.cards?.length??0}));
  throw new Error("The discovery probe did not return grounded room cards");
}
console.log(JSON.stringify({create:create.status,message:reply.status,state:answer.data.response.state,answerKind:answer.data.answerKind,liveChat:true,
  conversationId:body.data.conversation.id,
  ...(discovery?{roomCount:answer.data.response.cards.length,roomIds:answer.data.response.cards.map(card=>card.roomId)}:{}),
}));
