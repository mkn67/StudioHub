import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createPhpHelpdeskAdapter, validateHelpdeskResponse } from "../services/phpHelpdeskAdapter";
import { proxyHelpdesk } from "../server/bridge";
import { POST as helpdeskRoutePost } from "../../../app/api/helpdesk/[...path]/route";

const ok = (data: unknown) => Response.json({ status: "success", code: 200, message: "OK", data });
const response = { text: "Đây là nội dung từ PHP.", mode: "connected", state: "unavailable", sources: [] };
test("navigation reset prevents a late previous-page conversation from contaminating the next room", async () => {
  let release!: (response: Response) => void;
  const late = new Promise<Response>(resolve => { release = resolve; });
  const bodies: Record<string, unknown>[] = [];
  let calls = 0;
  const fake: typeof fetch = async (url, options) => {
    bodies.push(JSON.parse(String(options?.body)));
    calls++;
    if (calls === 1) return late;
    if (calls === 2) return ok({ conversation: { id: "22222222-2222-4222-8222-222222222222" } });
    assert.match(String(url), /22222222-2222-4222-8222-222222222222\/messages$/);
    return ok({ response });
  };
  const adapter = createPhpHelpdeskAdapter(fake);
  const old = adapter.sendMessage("Phòng này?", { surface: "public", scope: "catalog", roomId: 1 });
  adapter.reset?.();
  release(ok({ conversation: { id: "11111111-1111-4111-8111-111111111111" } }));
  await assert.rejects(old, /đổi trang/);
  await adapter.sendMessage("Phòng này?", { surface: "public", scope: "catalog", roomId: 2 });
  assert.deepEqual(bodies.at(-1)?.context, { surface: "public", scope: "catalog", roomId: 2 });
  assert.equal(calls, 3);
});
test("connected response strips URLs and rejects invented payload kinds", () => {
  assert.equal(validateHelpdeskResponse({ ...response, links: [{ href: "javascript:alert(1)" }] }).links, undefined);
  assert.equal(validateHelpdeskResponse({ ...response, operatorMessage: true }).operatorMessage, true);
  assert.throws(() => validateHelpdeskResponse({ ...response, mode: "demo" }));
  assert.throws(() => validateHelpdeskResponse({ ...response, cards: [{ kind: "booking", bookingStatus: "confirmed" }] }));
  assert.throws(() => validateHelpdeskResponse({ ...response, sources: Array(4).fill({ title: "x", reference: "y" }) }));
});
test("adapter creates real conversation and keeps idempotency key after lost response", async () => {
  const bodies: Record<string, unknown>[] = []; let calls = 0;
  const fake: typeof fetch = async (_url, options) => {
    calls++; bodies.push(JSON.parse(String(options?.body)));
    if (calls === 1) return ok({ conversation: { id: "11111111-1111-4111-8111-111111111111" } });
    if (calls === 2) throw new Error("lost connection");
    return ok({ response });
  };
  const adapter = createPhpHelpdeskAdapter(fake);
  await assert.rejects(adapter.sendMessage("hello"));
  assert.deepEqual(await adapter.sendMessage("hello"), response);
  assert.equal(bodies[1].clientMessageId, bodies[2].clientMessageId);
  adapter.reset?.();
});
test("ticket is shown only after successful persistence response", async () => {
  let calls = 0;
  const fake: typeof fetch = async () => {
    calls++;
    if (calls === 1) return ok({ conversation: { id: "11111111-1111-4111-8111-111111111111" } });
    if (calls === 2) return ok({ response });
    return ok({ ticket: { id: "22222222-2222-4222-8222-222222222222", status: "open" } });
  };
  const adapter = createPhpHelpdeskAdapter(fake); await adapter.sendMessage("prepare");
  const result = await adapter.confirmTicket!("proposal");
  assert.equal(result.cards?.[0].kind, "ticket");
});
test("malformed agent reply has an actionable error instead of generic failure", async () => {
  let calls = 0;
  const fake: typeof fetch = async () => ++calls === 1
    ? ok({ conversation: { id: "11111111-1111-4111-8111-111111111111" } })
    : Response.json({ status: "error", errors: [{ code: "invalid_agent_response" }] }, { status: 502 });
  await assert.rejects(createPhpHelpdeskAdapter(fake).sendMessage("Hello"), error =>
    error instanceof Error && error.message.includes("JSON"));
});
test("bridge enforces origin and fixed route; no arbitrary upstream URL", async () => {
  const denied = await proxyHelpdesk(new Request("http://localhost:3000/api/helpdesk/conversations", { method: "POST", headers: { origin: "https://attacker.invalid" } }), ["conversations"], "a".repeat(64));
  assert.equal(denied.status, 403);
  const arbitrary = await proxyHelpdesk(new Request("http://localhost:3000/api/helpdesk/https://evil.invalid"), ["https:", "evil.invalid"], "a".repeat(64));
  assert.equal(arbitrary.status, 404);
});

test("Helpdesk bridge fails closed in production when its trusted origin is missing", async () => {
  const before = { origin: process.env.HELPDESK_FRONTEND_ORIGIN, nodeEnv: process.env.NODE_ENV };
  delete process.env.HELPDESK_FRONTEND_ORIGIN;
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    const response = await proxyHelpdesk(new Request("http://localhost:3000/api/helpdesk/conversations", {
      method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{}",
    }), ["conversations"], "a".repeat(64));
    assert.equal(response.status, 503);
  } finally {
    if (before.origin === undefined) delete process.env.HELPDESK_FRONTEND_ORIGIN; else process.env.HELPDESK_FRONTEND_ORIGIN = before.origin;
    if (before.nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", before.nodeEnv);
  }
});

test("Helpdesk bridge rejects insecure production origins and upstream URLs", async () => {
  const keys = ["HELPDESK_FRONTEND_ORIGIN", "HELPDESK_API_URL", "HELPDESK_BRIDGE_SECRET", "NODE_ENV"] as const;
  const previous = keys.map(key => process.env[key]);
  process.env.HELPDESK_FRONTEND_ORIGIN = "http://studio.example";
  process.env.HELPDESK_API_URL = "http://support.example";
  process.env.HELPDESK_BRIDGE_SECRET = "test-only-".repeat(5);
  Reflect.set(process.env, "NODE_ENV", "production");
  try {
    const response = await proxyHelpdesk(new Request("http://studio.example/api/helpdesk/conversations", {
      method: "POST", headers: { origin: "http://studio.example", "content-type": "application/json" }, body: "{}",
    }), ["conversations"], "a".repeat(64));
    assert.equal(response.status, 503);
    process.env.HELPDESK_FRONTEND_ORIGIN = "https://studio.example";
    const insecureUpstream = await proxyHelpdesk(new Request("https://studio.example/api/helpdesk/conversations", {
      method: "POST", headers: { origin: "https://studio.example", "content-type": "application/json" }, body: "{}",
    }), ["conversations"], "a".repeat(64));
    assert.equal(insecureUpstream.status, 503);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) Reflect.deleteProperty(process.env, key);
      else Reflect.set(process.env, key, previous[index]);
    });
  }
});

test("Helpdesk session cookie is secure and HttpOnly in production", async () => {
  const keys = ["HELPDESK_FRONTEND_ORIGIN", "HELPDESK_API_URL", "HELPDESK_BRIDGE_SECRET", "NODE_ENV"] as const;
  const previous = keys.map(key => process.env[key]);
  const previousFetch = globalThis.fetch;
  process.env.HELPDESK_FRONTEND_ORIGIN = "https://studio.example";
  process.env.HELPDESK_API_URL = "https://support.example";
  process.env.HELPDESK_BRIDGE_SECRET = "test-only-".repeat(5);
  Reflect.set(process.env, "NODE_ENV", "production");
  globalThis.fetch = async () => ok({ conversation: { id: "11111111-1111-4111-8111-111111111111" } });
  try {
    const request = new NextRequest("https://studio.example/api/helpdesk/conversations", {
      method: "POST", headers: { origin: "https://studio.example", "content-type": "application/json" }, body: "{}",
    });
    const response = await helpdeskRoutePost(request, { params: Promise.resolve({ path: ["conversations"] }) });
    const cookie = response.cookies.get("studiohub_helpdesk_session");
    assert.equal(cookie?.httpOnly, true);
    assert.equal(cookie?.secure, true);
    assert.equal(cookie?.sameSite, "lax");
    assert.equal(cookie?.path, "/api/helpdesk");
  } finally {
    globalThis.fetch = previousFetch;
    keys.forEach((key, index) => {
      if (previous[index] === undefined) Reflect.deleteProperty(process.env, key);
      else Reflect.set(process.env, key, previous[index]);
    });
  }
});
test("bridge forwards only allowlisted server headers", async () => {
  const old = process.env.HELPDESK_BRIDGE_SECRET; process.env.HELPDESK_BRIDGE_SECRET = "test-only-".repeat(5);
  try {
    let called = false;
    const fake: typeof fetch = async (url, options) => {
      called = true; assert.equal(String(url), "http://127.0.0.1:8010/api/v1/helpdesk/conversations");
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers["X-Helpdesk-Session"], "a".repeat(64)); assert.equal(headers["X-Evil"], undefined);
      return ok({ conversation: { id: "example" } });
    };
    const request = new Request("http://localhost:3000/api/helpdesk/conversations", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", "x-evil": "do not forward" }, body: "{}" });
    const r = await proxyHelpdesk(request, ["conversations"], "a".repeat(64), fake);
    assert.equal(r.status, 200); assert.ok(called);
  } finally { if (old === undefined) delete process.env.HELPDESK_BRIDGE_SECRET; else process.env.HELPDESK_BRIDGE_SECRET = old; }
});

test("Docker HTTP upstream needs an exact server-configured hostname", async () => {
  const keys = ["HELPDESK_API_URL", "HELPDESK_HTTP_HOSTS", "HELPDESK_BRIDGE_SECRET"] as const;
  const previous = keys.map(key => process.env[key]);
  process.env.HELPDESK_BRIDGE_SECRET = "test-only-".repeat(5);
  process.env.HELPDESK_API_URL = "http://helpdesk-php";
  delete process.env.HELPDESK_HTTP_HOSTS;
  const request = () => new Request("http://localhost:3000/api/helpdesk/conversations", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{}",
  });
  let calls = 0;
  const fake: typeof fetch = async url => {
    calls++;
    assert.equal(String(url), "http://helpdesk-php/api/v1/helpdesk/conversations");
    return ok({ conversation: { id: "example" } });
  };
  try {
    assert.equal((await proxyHelpdesk(request(), ["conversations"], "a".repeat(64), fake)).status, 503);
    process.env.HELPDESK_HTTP_HOSTS = "helpdesk-php";
    assert.equal((await proxyHelpdesk(request(), ["conversations"], "a".repeat(64), fake)).status, 200);
    process.env.HELPDESK_API_URL = "http://helpdesk-php.attacker.invalid";
    assert.equal((await proxyHelpdesk(request(), ["conversations"], "a".repeat(64), fake)).status, 503);
    assert.equal(calls, 1);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});

test("container GET validates public Host with same-origin fetch metadata", async () => {
  const previous = process.env.HELPDESK_BRIDGE_SECRET;
  process.env.HELPDESK_BRIDGE_SECRET = "test-only-".repeat(5);
  const fake: typeof fetch = async () => ok({ conversation: { id: "example" } });
  const request = (host: string, site = "same-origin") => new Request("http://0.0.0.0:3000/api/helpdesk/conversations", {
    headers: { host, "sec-fetch-site": site },
  });
  try {
    assert.equal((await proxyHelpdesk(request("localhost:3000"), ["conversations"], "a".repeat(64), fake)).status, 200);
    assert.equal((await proxyHelpdesk(request("attacker.invalid"), ["conversations"], "a".repeat(64), fake)).status, 403);
    assert.equal((await proxyHelpdesk(request("localhost:3000", "cross-site"), ["conversations"], "a".repeat(64), fake)).status, 403);
  } finally {
    if (previous === undefined) delete process.env.HELPDESK_BRIDGE_SECRET; else process.env.HELPDESK_BRIDGE_SECRET = previous;
  }
});
