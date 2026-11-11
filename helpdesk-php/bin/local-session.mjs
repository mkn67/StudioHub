import { readFileSync } from "node:fs";
// Local QA only. No credentials or cookies are printed or persisted.
export async function localSession() {
  let email=process.env.HELPDESK_CHECK_EMAIL;
  let password=process.env.HELPDESK_CHECK_PASSWORD;
  if ((!email || !password) && process.argv.includes("--dev-seed")) {
    const seed=readFileSync(new URL("../../server/database/seed.sql",import.meta.url),"utf8");
    email="customer@studio.local";
    password=seed.match(/demo password:\s*([A-Za-z0-9_!@#$%^&*-]+)/)?.[1];
  }
  if(!email || !password) throw new Error("Provide HELPDESK_CHECK_EMAIL/PASSWORD or explicitly use --dev-seed for the existing local demo account.");
  const r=await fetch("http://localhost:3000/api/rest/auth/login",{method:"POST",headers:{Origin:"http://localhost:3000","Content-Type":"application/json"},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(15000)});
  if(r.status!==200)throw new Error(`Local QA login failed: HTTP ${r.status}`);
  const cookie=r.headers.getSetCookie().map(value=>value.split(";")[0]).filter(value=>value.startsWith("studiohub_auth=")).join("; ");
  if(!cookie)throw new Error("Local QA login returned no HttpOnly session cookie");
  return cookie;
}
