import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/rest/[...path]/route";

function request(url: string, method = "GET", headers: Record<string, string> = {}, body?: BodyInit) {
  return new NextRequest(url, { method, headers, body });
}

test("REST BFF uses fixed backend, stores login JWT only in HttpOnly cookie, and strips it from JSON", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "http://api";
  process.env.APP_ORIGIN = "https://studio.example";
  let authorization = "";
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "http://api/api/auth/login");
    authorization = new Headers(init?.headers).get("Authorization") || "";
    return Response.json({ status: "success", data: { token: "a.jwt.token", user: { user_id: 3 } } });
  };
  try {
    const response = await POST(request("https://studio.example/api/rest/auth/login", "POST", { origin: "https://studio.example", "content-type": "application/json" }, JSON.stringify({ email: "x@y.test", password: "secret" })), { params: Promise.resolve({ path: ["auth", "login"] }) });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.data, { user: { user_id: 3 } });
    assert.equal(authorization, "");
    const cookie = response.cookies.get("studiohub_auth");
    assert.equal(cookie?.value, "a.jwt.token");
    assert.equal(cookie?.httpOnly, true);
    assert.equal(cookie?.secure, true);
    assert.equal(cookie?.sameSite, "lax");
    assert.equal(cookie?.path, "/api");
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});

test("REST BFF forwards the HttpOnly session, rejects foreign origins, and preserves binary uploads/downloads", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "http://api";
  process.env.APP_ORIGIN = "https://studio.example";
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), "http://api/api/rooms/4/images");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer header.payload.signature");
    assert.match(new Headers(init?.headers).get("Content-Type") || "", /^multipart\/form-data; boundary=/);
    assert.ok(init?.body instanceof ArrayBuffer);
    return new Response("%PDF-1.4", { headers: { "Content-Type": "application/pdf" } });
  };
  try {
    const denied = await POST(request("https://studio.example/api/rest/rooms/4/images", "POST", { origin: "https://attacker.example" }, "blocked"), { params: Promise.resolve({ path: ["rooms", "4", "images"] }) });
    assert.equal(denied.status, 403);
    assert.equal(calls, 0);
    const form = new FormData(); form.set("image", new Blob(["photo"]), "room.jpg");
    const formRequest = new NextRequest(new Request("https://studio.example/api/rest/rooms/4/images", { method: "POST", headers: {
      origin: "https://studio.example",
      cookie: "studiohub_auth=header.payload.signature",
    }, body: form }));
    const response = await POST(formRequest, { params: Promise.resolve({ path: ["rooms", "4", "images"] }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});

test("REST BFF accepts an allow-listed public origin behind an internal reverse-proxy host", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "http://api";
  process.env.APP_ORIGIN = "https://studio.example,https://preview.studio.example";
  globalThis.fetch = async () => Response.json({ status: "success", data: { token: "a.jwt.token", user: { user_id: 3 } } });
  try {
    const response = await POST(request("http://client-internal:3000/api/rest/auth/login", "POST", {
      origin: "https://preview.studio.example",
      "content-type": "application/json",
    }, JSON.stringify({ email: "x@y.test", password: "secret" })), { params: Promise.resolve({ path: ["auth", "login"] }) });
    assert.equal(response.status, 200);
    assert.equal(response.cookies.get("studiohub_auth")?.httpOnly, true);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});

test("REST BFF clears expired auth and restricts malformed paths", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "http://api";
  process.env.APP_ORIGIN = "https://studio.example";
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer header.payload.signature");
    return Response.json({ status: "error", code: 401, message: "Expired" }, { status: 401 });
  };
  try {
    const response = await GET(request("https://studio.example/api/rest/auth/profile", "GET", { cookie: "studiohub_auth=header.payload.signature" }), { params: Promise.resolve({ path: ["auth", "profile"] }) });
    assert.equal(response.status, 401);
    assert.equal(response.cookies.get("studiohub_auth")?.maxAge, 0);
    const invalid = await GET(request("https://studio.example/api/rest/auth/%2e%2e/admin"), { params: Promise.resolve({ path: ["..", "admin"] }) });
    assert.equal(invalid.status, 404);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});

test("REST BFF fails closed in production when APP_ORIGIN is missing", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, nodeEnv: process.env.NODE_ENV, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "https://api.example";
  Reflect.set(process.env, "NODE_ENV", "production");
  delete process.env.APP_ORIGIN;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ status: "success", data: {} }); };
  try {
    const response = await POST(request("https://studio.example/api/rest/auth/logout", "POST", { origin: "https://studio.example" }), { params: Promise.resolve({ path: ["auth", "logout"] }) });
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
    if (before.nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", before.nodeEnv);
  }
});

test("REST BFF rejects insecure production APP_ORIGIN values", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, nodeEnv: process.env.NODE_ENV, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "https://api.example";
  process.env.APP_ORIGIN = "http://studio.example";
  Reflect.set(process.env, "NODE_ENV", "production");
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ status: "success", data: {} }); };
  try {
    const response = await POST(request("http://studio.example/api/rest/auth/logout", "POST", { origin: "http://studio.example" }), { params: Promise.resolve({ path: ["auth", "logout"] }) });
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
    if (before.nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", before.nodeEnv);
  }
});

test("Vercel BFF requires the server-only API_INTERNAL_URL", async () => {
  const before = { url: process.env.API_INTERNAL_URL, publicUrl: process.env.NEXT_PUBLIC_API_URL, vercel: process.env.VERCEL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  delete process.env.API_INTERNAL_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://api.example";
  process.env.VERCEL = "1";
  process.env.APP_ORIGIN = "https://studio.example";
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ status: "success", data: {} }); };
  try {
    const response = await POST(request("https://studio.example/api/rest/auth/logout", "POST", { origin: "https://studio.example" }), { params: Promise.resolve({ path: ["auth", "logout"] }) });
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.publicUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = before.publicUrl;
    if (before.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = before.vercel;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});

test("REST BFF clears the browser cookie when logout cannot reach the API", async () => {
  const before = { url: process.env.API_INTERNAL_URL, origin: process.env.APP_ORIGIN, fetch: globalThis.fetch };
  process.env.API_INTERNAL_URL = "https://api.example";
  process.env.APP_ORIGIN = "https://studio.example";
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const response = await POST(request("https://studio.example/api/rest/auth/logout", "POST", {
      origin: "https://studio.example", cookie: "studiohub_auth=header.payload.signature",
    }), { params: Promise.resolve({ path: ["auth", "logout"] }) });
    assert.equal(response.status, 503);
    assert.equal(response.cookies.get("studiohub_auth")?.maxAge, 0);
    assert.equal(response.cookies.get("studiohub_auth")?.httpOnly, true);
    assert.equal(response.cookies.get("studiohub_auth")?.secure, true);
  } finally {
    globalThis.fetch = before.fetch;
    if (before.url === undefined) delete process.env.API_INTERNAL_URL; else process.env.API_INTERNAL_URL = before.url;
    if (before.origin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = before.origin;
  }
});
