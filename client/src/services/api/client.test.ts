import test from "node:test";
import assert from "node:assert/strict";

test("REST transport uses same-origin proxy and never exposes a JWT to browser storage or headers", async t => {
  const client = await import("./client");
  const target = new EventTarget();
  const storage = new Map<string, string>();
  Object.assign(target, { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: target, configurable: true });
  const originalFetch = globalThis.fetch;
  try {
    client.setStoredApiToken("must-not-be-stored");
    assert.equal(client.getStoredApiToken(), null);
    assert.equal(storage.size, 0);
    await t.test("JSON payload is sent to same-origin BFF without Authorization", async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "/api/rest/bookings");
        assert.equal(new Headers(init?.headers).has("Authorization"), false);
        assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
        assert.equal(init?.cache, "no-store");
        assert.deepEqual(JSON.parse(String(init?.body)), { room_id: 11 });
        return Response.json({ status: "success", data: { booking_id: 7 } });
      };
      assert.deepEqual(await client.apiRequest("/api/bookings", { method: "POST", body: { room_id: 11 } }), { booking_id: 7 });
    });
    await t.test("multipart and idempotency headers pass through", async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "/api/rest/rooms/1/images");
        assert.equal(new Headers(init?.headers).has("Content-Type"), false);
        assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "qa-command-key-12345678");
        assert.ok(init?.body instanceof FormData);
        return Response.json({ status: "success", data: { image_id: 1 } });
      };
      const body = new FormData(); body.set("image", new Blob(["image"]), "room.jpg");
      await client.apiRequest("/api/rooms/1/images", { method: "POST", body, idempotencyKey: "qa-command-key-12345678" });
    });
    await t.test("PDF grant is kept on same-origin and validated", async () => {
      const { downloadContract } = await import("./management");
      const grantPath = `/api/host/contracts/7/documents/${"a".repeat(64)}`;
      let calls = 0;
      globalThis.fetch = async (url, init) => {
        calls++;
        assert.equal(String(url), calls === 1 ? "/api/rest/host/contracts/7/document-access" : `/api/rest${grantPath.slice(4)}`);
        assert.equal(new Headers(init?.headers).has("Authorization"), false);
        if (calls === 1) return Response.json({ status: "success", data: { access_url: grantPath } });
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
    await t.test("initial profile 401 is quiet; protected endpoint 401 expires session", async () => {
      let expired = false;
      target.addEventListener("studiohub:session-expired", () => { expired = true; }, { once: true });
      globalThis.fetch = async () => Response.json({ status: "error", code: 401, message: "Hết phiên", errors: [{ field: "token", code: "token_expired", message: "Hết phiên" }] }, { status: 401 });
      await assert.rejects(client.apiRequest("/api/auth/profile"), (error: unknown) => error instanceof client.ApiError && error.code === "token_expired");
      assert.equal(expired, false);
      await assert.rejects(client.apiRequest("/api/bookings"), (error: unknown) => error instanceof client.ApiError && error.code === "token_expired");
      assert.equal(expired, true);
      globalThis.fetch = async () => Response.json({ status: "error", message: "Không hợp lệ", errors: [{ field: "email", code: "invalid", message: "Email không hợp lệ" }] }, { status: 400 });
      await assert.rejects(client.apiRequest("/api/auth/register"), (error: unknown) => error instanceof client.ApiError && error.fields?.[0]?.field === "email");
      await assert.rejects(client.apiRequest("https://attacker.test/api"), client.ApiError);
      await assert.rejects(client.apiRequest("/api/../admin"), client.ApiError);
    });
    await t.test("network and malformed envelope failures remain explicit", async () => {
      globalThis.fetch = async () => { throw new Error("offline"); };
      await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
      for (const payload of [null, [], { status: "error" }]) {
        globalThis.fetch = async () => Response.json(payload);
        await assert.rejects(client.apiRequest("/api/bookings"), client.ApiError);
      }
      globalThis.fetch = async () => Response.json({ status: "success" });
      await assert.rejects(client.apiRequest("/api/bookings"), (error: unknown) => error instanceof client.ApiError && error.code === "contract_error");
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor); else Reflect.deleteProperty(globalThis, "window");
  }
});
