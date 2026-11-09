import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const maxRequestBytes = 10 * 1024 * 1024;
function isProductionRuntime(): boolean {
  if (process.env.VERCEL === "1") return true;
  return process.env.APP_ENV
    ? process.env.APP_ENV === "production"
    : process.env.NODE_ENV === "production";
}

const fail = (status: number, message: string) => NextResponse.json(
  { status: "error", code: status, message },
  { status, headers: { "Cache-Control": "no-store" } },
);

function backendOrigin(): URL | null {
  const onVercel = process.env.VERCEL === "1";
  const configured = onVercel
    ? process.env.API_INTERNAL_URL
    : process.env.API_INTERNAL_URL || process.env.BUSINESS_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (!(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/")) return null;
    if (onVercel && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!allowedMethods.has(request.method)) return fail(405, "Phương thức không được hỗ trợ.");
  const { path } = await context.params;
  if (!path.length || path.some(segment => !/^[A-Za-z0-9_-]+$/.test(segment))) return fail(404, "Không tìm thấy API.");
  const endpoint = path.join("/");
  const origin = request.headers.get("origin");
  if (request.method !== "GET") {
    const configuredOrigins = (process.env.APP_ORIGIN || "").split(",").map(value => value.trim().replace(/\/+$/, "")).filter(Boolean);
    const production = isProductionRuntime();
    if (production && configuredOrigins.length === 0) {
      return fail(503, "Origin cho API chưa được cấu hình.");
    }
    if (production && configuredOrigins.some(value => {
      try { return new URL(value).protocol !== "https:"; } catch { return true; }
    })) return fail(503, "Origin production phải dùng HTTPS.");
    const originAllowed = configuredOrigins.length > 0
      ? origin !== null && configuredOrigins.includes(origin)
      : origin === request.nextUrl.origin;
    if (!originAllowed) {
      return fail(403, "Nguồn yêu cầu không hợp lệ.");
    }
  }

  const upstream = backendOrigin();
  if (!upstream) return fail(503, "Backend chưa được cấu hình.");
  upstream.pathname = `/api/${endpoint}`;
  upstream.search = request.nextUrl.search;

  const token = request.cookies.get("studiohub_auth")?.value;
  if (token && !/^[A-Za-z0-9_.-]{16,4096}$/.test(token)) return fail(401, "Phiên đăng nhập không hợp lệ.");
  const headers = new Headers({ Accept: request.headers.get("accept")?.includes("application/pdf") ? "application/pdf, application/json" : "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && /^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) headers.set("Idempotency-Key", idempotencyKey);

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET") {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > maxRequestBytes) return fail(413, "Nội dung tải lên quá lớn.");
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > maxRequestBytes) return fail(413, "Nội dung tải lên quá lớn.");
    body = bytes;
  }

  let result: Response;
  try {
    result = await fetch(upstream, { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000) });
  } catch {
    const response = fail(503, "Không kết nối được máy chủ. Vui lòng thử lại.");
    if (endpoint === "auth/logout") clearAuthCookie(response, request);
    return response;
  }

  const responseType = result.headers.get("content-type") || "application/octet-stream";
  const responseHeaders = new Headers({ "Cache-Control": "no-store", "Content-Type": responseType });
  let response: NextResponse;
  let issued: string | undefined;
  let accountLocked = false;
  if (responseType.toLowerCase().includes("application/json")) {
    let payload: unknown;
    try { payload = await result.json(); } catch {
      const response = fail(502, "Máy chủ API trả về phản hồi không hợp lệ.");
      if (endpoint === "auth/logout") clearAuthCookie(response, request);
      return response;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      const response = fail(502, "Máy chủ API trả về phản hồi không hợp lệ.");
      if (endpoint === "auth/logout") clearAuthCookie(response, request);
      return response;
    }
    const envelope = payload as Record<string, unknown>;
    const errors = Array.isArray(envelope.errors) ? envelope.errors : [];
    accountLocked = envelope.error_code === "account_locked" || envelope.code === "account_locked" || errors.some(error =>
      Boolean(error && typeof error === "object" && (error as Record<string, unknown>).code === "account_locked"),
    );
    const data = envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data) ? envelope.data as Record<string, unknown> : undefined;
    if (["auth/login", "auth/register"].includes(endpoint) && result.ok) {
      issued = typeof data?.token === "string" && data.token.length <= 4096 ? data.token : undefined;
      if (!issued) return fail(502, "Phản hồi xác thực không hợp lệ.");
      delete data?.token;
    }
    response = NextResponse.json(envelope, { status: result.status, headers: responseHeaders });
  } else {
    response = new NextResponse(result.body, { status: result.status, headers: responseHeaders });
  }

  const secure = request.nextUrl.protocol === "https:" || isProductionRuntime();
  if (issued) response.cookies.set("studiohub_auth", issued, { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: 7200 });
  if (result.status === 401 || accountLocked || endpoint === "auth/logout") clearAuthCookie(response, request);
  return response;
}

function clearAuthCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set("studiohub_auth", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:" || isProductionRuntime(),
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
