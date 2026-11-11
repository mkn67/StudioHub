// Checks only local create/history persistence. Never sends a model request.
import { localSession } from "./local-session.mjs";
const base="http://localhost:3000";
const authCookie=await localSession();
const create=await fetch(base+"/api/helpdesk/conversations",{method:"POST",headers:{Origin:base,Cookie:authCookie,"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(10000)});
const body=await create.json();
if(create.status!==201 || typeof body.data?.conversation?.id!=="string") {
  const code=body.errors?.[0]?.code;
  const reason=typeof code==="string" && /^[a-z_]{1,64}$/.test(code)?code:"unexpected_response";
  throw new Error(`Local Helpdesk conversation creation failed: HTTP ${create.status}, ${reason}`);
}
const cookie=authCookie+"; "+create.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
const history=await fetch(base+"/api/helpdesk/conversations/"+body.data.conversation.id,{headers:{Origin:base,Cookie:cookie},signal:AbortSignal.timeout(10000)});
const saved=await history.json();
if(history.status!==200 || saved.data?.conversation?.id!==body.data.conversation.id)throw new Error("Local Helpdesk history read failed");
console.log(JSON.stringify({create:create.status,history:history.status,sameOwnerHistory:true,providerCalled:false}));
