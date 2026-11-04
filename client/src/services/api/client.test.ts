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
      globalThis.fetch = async () => new Response("<html>error</html>");
      await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis,"window",descriptor); else Reflect.deleteProperty(globalThis,"window");
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL=oldUrl;
  }
});
