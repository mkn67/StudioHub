import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const php = process.env.HELPDESK_TEST_PHP || resolve(root, ".runtime/php/php.exe");
const ini = process.env.HELPDESK_TEST_INI || resolve(root, ".runtime/php.ini");
const base = "http://127.0.0.1:18010";
await mkdir(resolve(root, "tests/.tmp"), { recursive: true });
const db = resolve(root, "tests/.tmp/http-" + randomUUID() + ".sqlite");
const secret = randomBytes(32).toString("hex");
const env = { ...process.env, HELPDESK_DATABASE_URL: "sqlite:" + db, HELPDESK_BRIDGE_SECRET: secret, HELPDESK_FRONTEND_ORIGIN: "http://localhost:3000" };
async function command(args) {
  return new Promise((accept, reject) => {
    const p = spawn(php, ["-c", ini, ...args], { cwd: root, env, windowsHide: true }); let output = "";
    p.stdout.on("data", b => output += b); p.stderr.on("data", b => output += b);
    p.on("error", reject); p.on("exit", code => code === 0 ? accept(output) : reject(new Error(output)));
  });
}
await command(["bin/migrate.php", "--apply"]);
const server = spawn(php, ["-c", ini, "-S", "127.0.0.1:18010", "-t", "public", "public/index.php"], { cwd: root, env, windowsHide: true, stdio: "ignore" });
let tests = 0;
try {
  for (let n = 0; n < 40; n++) { try { if ((await fetch(base + "/health")).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const session = randomBytes(32).toString("hex");
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:3000", "X-Helpdesk-Bridge": secret, "X-Helpdesk-Session": session };
  async function request(path, body, custom = headers, method = "POST") {
    const r = await fetch(base + "/api/v1/helpdesk/" + path, { method, headers: custom, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
    return { status: r.status, json: await r.json() };
  }
  let r = await request("conversations", {}); assert.equal(r.status, 201); tests++;
  const id = r.json.data.conversation.id; assert.equal(r.json.data.conversation.capabilities.publicFaq, false); tests++;
  assert.equal((await request("conversations", {}, { ...headers, "X-Helpdesk-Bridge": "wrong" })).status, 401); tests++;
  assert.equal((await request("conversations", {}, { ...headers, Origin: "https://attacker.invalid" })).status, 403); tests++;
  assert.equal((await request("conversations", "{")).status, 400); tests++;
  assert.equal((await request("conversations", { text: "x".repeat(9000) })).status, 413); tests++;
  assert.equal((await request("conversations", { ownerId: "admin" })).status, 400); tests++;
  assert.equal((await request("conversations/" + id, undefined, { ...headers, "X-Helpdesk-Session": randomBytes(32).toString("hex") }, "GET")).status, 404); tests++;
  r = await request("conversations/" + id + "/messages", { text: "Khoảng đệm có miễn phí không?", clientMessageId: randomUUID() });
  assert.equal(r.status, 503); assert.equal(r.json.errors[0].code, "provider_not_configured"); tests++;
  const key = randomUUID();
  r = await request("conversations/" + id + "/messages", { text: "/handoff", clientMessageId: key }); assert.equal(r.status, 200); assert.equal(r.json.data.response.state, "human_handoff"); tests++;
  const messageId = r.json.data.messageId;
  r = await request("conversations/" + id + "/messages", { text: "/handoff", clientMessageId: key }); assert.equal(r.json.data.messageId, messageId); tests++;
  r = await request("conversations/" + id, undefined, headers, "GET"); assert.equal(r.json.data.conversation.state, "human_pending"); assert.equal(r.json.data.messages.length, 2); tests++;
  assert.equal((await request("conversations/" + id + "/operator", { action: "activate" })).status, 404); tests++;
  assert.equal((await request("support/inbox", undefined, headers, "GET")).status, 404); tests++;
  assert.equal((await request("conversations/not-a-uuid", undefined, headers, "GET")).status, 404); tests++;
  console.log(JSON.stringify({ http_checks: tests, failed: 0, provider: "No live/model request; unavailable provider and real handoff persistence tested." }));
} finally {
  server.kill(); await new Promise(r => server.once("exit", r));
  await rm(db, { force: true });
}
