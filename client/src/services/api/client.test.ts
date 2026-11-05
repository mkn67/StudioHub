import test from "node:test";
import assert from "node:assert/strict";

test("API transport uses real envelopes, exact token namespace and never falls back on failure", async t => {
  const oldUrl = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
  const client = await import("./client");
  const target = new EventTarget();
  const storage = new Map<string, string>();
  Object.assign(target, { sessionStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k,v), removeItem: (k: string) => storage.delete(k) } });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: target, configurable: true });
  const originalFetch = globalThis.fetch;
  try {
    await t.test("JSON, bearer token and payload use PHP contract", async () => {
      storage.set("unrelated.api-token", "wrong");
      assert.equal(client.getStoredApiToken(), null);
      client.setStoredApiToken("test-jwt");
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "http://localhost:8000/api/bookings");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-jwt");
        assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
        assert.equal(init?.cache, "no-store");
        assert.deepEqual(JSON.parse(String(init?.body)), { room_id: 11 });
        return Response.json({ status: "success", data: { booking_id: 7 } });
      };
      assert.deepEqual(await client.apiRequest("/api/bookings", { method: "POST", body: { room_id: 11 } }), { booking_id: 7 });
    });
    await t.test("multipart upload leaves Content-Type boundary to fetch", async () => {
      globalThis.fetch = async (_url, init) => {
        assert.equal(new Headers(init?.headers).has("Content-Type"), false);
        assert.ok(init?.body instanceof FormData);
        return Response.json({ status:"success", data:{ image_id:1 } });
      };
      const body = new FormData(); body.set("image", new Blob(["image"]), "room.jpg");
      await client.apiRequest("/api/rooms/1/images", { method:"POST", body });
    });
    await t.test("workspace command reuses Bearer transport and explicit idempotency key", async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "http://localhost:8000/api/commands");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-jwt");
        assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "qa-command-key-12345678");
        assert.deepEqual(JSON.parse(String(init?.body)), { type: "application", studioName: "QA" });
        return Response.json({ status: "success", data: { accepted: true } });
      };
      await client.apiRequest("/api/commands", { method: "POST", body: { type: "application", studioName: "QA" }, idempotencyKey: "qa-command-key-12345678" });
    });
    await t.test("contract PDF uses Bearer and one-time grant; foreign URLs and non-PDF bodies reject", async () => {
      const { downloadContract } = await import("./management");
      const grantPath = `/api/host/contracts/7/documents/${"a".repeat(64)}`;
      let calls = 0;
      globalThis.fetch = async (url, init) => {
        calls++; assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-jwt");
        if (String(url).endsWith("/document-access")) { assert.equal(init?.method, "POST"); return Response.json({ status: "success", data: { access_url: grantPath } }); }
        assert.equal(String(url), `http://localhost:8000${grantPath}`);
        return new Response("%PDF-1.4\n", { headers: { "Content-Type": "application/pdf" } });
      };
      assert.equal((await downloadContract(7)).type, "application/pdf"); assert.equal(calls, 2);
      for (const access_url of ["https://attacker.test/file", "//attacker.test/file", grantPath.replace("/7/", "/8/"), "/invalid"]) {
        calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ status: "success", data: { access_url } }); };
        await assert.rejects(downloadContract(7)); assert.equal(calls, 1);
      }
      globalThis.fetch = async () => new Response("not a PDF", { headers: { "Content-Type": "text/html" } });
      await assert.rejects(client.apiRequest(grantPath, { responseType: "pdf" }), /PDF/);
      globalThis.fetch = async () => new Response(null, { status: 204 });
      assert.equal(await client.apiRequest("/api/equipments/3", { method: "DELETE" }), undefined);
    });
    await t.test("401 expires only the API session and emits an event", async () => {
      let expired = false;
      target.addEventListener("studiohub:session-expired", () => { expired = true; }, { once:true });
      globalThis.fetch = async () => Response.json({ status:"error", code:401, message:"Hết phiên", errors:[{field:"token",code:"token_expired",message:"Hết phiên"}] }, { status:401 });
      await assert.rejects(client.apiRequest("/api/auth/profile"), (e: unknown) => e instanceof client.ApiError && e.code === "token_expired");
      assert.equal(client.getStoredApiToken(), null);
      assert.equal(storage.get("unrelated.api-token"), "wrong");
      assert.equal(expired, true);
    });
    await t.test("validation errors retain fields; network and invalid envelopes reject", async () => {
      globalThis.fetch = async () => Response.json({ status:"error", message:"Không hợp lệ", errors:[{field:"email",code:"invalid",message:"Email không hợp lệ"}] }, { status:400 });
      await assert.rejects(client.apiRequest("/api/auth/register"), (e:unknown) => e instanceof client.ApiError && e.fields?.[0]?.field === "email");
      globalThis.fetch = async () => { throw new Error("offline"); };
      await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
      for (const payload of [null, [], {status:"error"}]) {
        globalThis.fetch = async () => Response.json(payload);
        await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
      }
      globalThis.fetch = async () => Response.json({ status: "success" });
      await assert.rejects(client.apiRequest("/api/bookings"), (e: unknown) => e instanceof client.ApiError && e.code === "contract_error");
      client.setStoredApiToken("locked-token");
      globalThis.fetch = async () => Response.json({ status: "error", code: 403, error_code: "account_locked", message: "Tài khoản bị khóa", errors: [] }, { status: 403 });
      await assert.rejects(client.apiRequest("/api/auth/profile"), (e: unknown) => e instanceof client.ApiError && e.code === "account_locked");
      assert.equal(client.getStoredApiToken(), null);
      globalThis.fetch = async () => new Response("<html>error</html>");
      await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis,"window",descriptor); else Reflect.deleteProperty(globalThis,"window");
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL=oldUrl;
  }
});
