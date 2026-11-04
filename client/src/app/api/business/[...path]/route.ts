import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allowed = new Set(["GET catalog", "GET workspace", "GET reports", "POST commands", "POST booking-quotes", "POST auth/login", "POST auth/register", "POST auth/logout", "GET auth/profile", "PATCH auth/profile"]);
const fail = (status: number, message: string) => NextResponse.json({ status: "error", code: status, message }, { status, headers: { "Cache-Control": "no-store" } });

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!allowed.has(`${request.method} ${endpoint}`)) return fail(404, "Không tìm thấy API.");
  if (request.method !== "GET" && request.headers.get("origin") !== (process.env.APP_ORIGIN || request.nextUrl.origin)) return fail(403, "Nguồn yêu cầu không hợp lệ.");
  const configured = process.env.BUSINESS_API_URL || "http://127.0.0.1:8000";
  let upstream: URL;
  try {
    upstream = new URL(configured);
    if (upstream.username || upstream.password || upstream.search || upstream.hash || upstream.pathname !== "/" || !["http:", "https:"].includes(upstream.protocol)) return fail(503, "Cấu hình API không hợp lệ.");
  } catch { return fail(503, "Cấu hình API không hợp lệ."); }
  upstream.pathname = `/api/${endpoint}`;
  upstream.search = request.nextUrl.search;
  const token = request.cookies.get("studiohub_auth")?.value;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const key = request.headers.get("idempotency-key");
  if (key && /^[A-Za-z0-9_-]{16,100}$/.test(key)) headers["Idempotency-Key"] = key;
  let body: string | undefined;
  if (request.method !== "GET") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail(415, "Cần nội dung JSON.");
    if (Number(request.headers.get("content-length")) > 262144) return fail(413, "Nội dung quá lớn.");
    const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    if (reader) for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length; if (size > 262144) { await reader.cancel(); return fail(413, "Nội dung quá lớn."); }
      chunks.push(part.value);
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  try {
    const result = await fetch(upstream, { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) });
    const payload = await result.json();
    let issued: string | undefined;
    if (["auth/login", "auth/register"].includes(endpoint) && result.ok) {
      issued = payload.data?.token;
      if (typeof issued !== "string" || issued.length > 4096) return fail(502, "Phản hồi xác thực không hợp lệ.");
      delete payload.data.token;
    }
    const response = NextResponse.json(payload, { status: result.status, headers: { "Cache-Control": "no-store" } });
    if (issued) response.cookies.set("studiohub_auth", issued, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/api", maxAge: 7200 });
    if (result.status === 401 || (endpoint === "auth/logout" && result.ok)) response.cookies.set("studiohub_auth", "", { httpOnly: true, sameSite: "lax", path: "/api", maxAge: 0 });
    return response;
  } catch { return fail(503, "Không kết nối được máy chủ. Vui lòng thử lại."); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
