import { test } from "node:test";
import assert from "node:assert/strict";
import { createPhpHelpdeskAdapter, validateHelpdeskResponse } from "../services/phpHelpdeskAdapter";
import { proxyHelpdesk } from "../server/bridge";

const ok = (data: unknown) => Response.json({ status: "success", code: 200, message: "OK", data });
const response = { text: "Đây là nội dung từ PHP.", mode: "connected", state: "unavailable", sources: [] };
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
