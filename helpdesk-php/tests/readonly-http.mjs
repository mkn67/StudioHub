import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const php = process.env.HELPDESK_TEST_PHP || resolve(root, ".runtime/php/php.exe");
const ini = process.env.HELPDESK_TEST_INI || resolve(root, ".runtime/php.ini");
// Force synthetic local configuration even when developer environment is configured.
const env = { ...process.env, NINEROUTER_BASE_URL: "http://127.0.0.1:18012/v1", NINEROUTER_API_KEY: "synthetic-http-key", NINEROUTER_MODEL: "synthetic-http-model", NINEROUTER_TOOL_CALLING_ENABLED: "true", STUDIOHUB_API_BASE_URL: "http://127.0.0.1:18012/api", STUDIOHUB_PUBLIC_TOOLS: "true", STUDIOHUB_CUSTOMER_READ_TOOLS: "true", HELPDESK_DATABASE_URL: "sqlite::memory:", HELPDESK_BRIDGE_SECRET: "fixture-".repeat(6) };
const server = spawn(php, ["-c", ini, "-S", "127.0.0.1:18012", "tests/readonly-api-fixture.php"], { cwd: root, env, windowsHide: true, stdio: "ignore" });
try {
  for (let n=0;n<40;n++) { try { if ((await fetch("http://127.0.0.1:18012/health")).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
  await new Promise((accept,reject)=>{
    const child=spawn(php,["-c",ini,"tests/readonly-http.php"],{cwd:root,env,windowsHide:true});
    child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
    child.on("error",reject);child.on("exit",code=>code===0?accept():reject(new Error("HTTP fixture QA failed")));
  });
} finally { server.kill(); }
