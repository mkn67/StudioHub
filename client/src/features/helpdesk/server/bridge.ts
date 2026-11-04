const UUID = "[a-f0-9-]{36}";
const routes = [
  /^conversations$/,
  new RegExp(`^conversations/${UUID}$`, "i"),
  new RegExp(`^conversations/${UUID}/messages$`, "i"),
  /^tickets$/,
  new RegExp(`^tickets/${UUID}$`, "i"),
];
const failure = (status: number, code: string) => Response.json({
  status: "error", code: status, message: "Helpdesk chưa xử lý được yêu cầu.",
  errors: [{ field: "", code, message: "Vui lòng thử lại sau." }],
}, { status, headers: { "Cache-Control": "no-store" } });

export async function proxyHelpdesk(request: Request, segments: string[], session: string, fetcher: typeof fetch = fetch): Promise<Response> {
  const path = segments.join("/");
  if (!routes.some(rule => rule.test(path)) || segments.some(s => s.includes("..") || s.includes("%"))) return failure(404, "resource_not_found");
  const expected = process.env.HELPDESK_FRONTEND_ORIGIN || "http://localhost:3000";
  const requestUrl = new URL(request.url);
  const frontendUrl = new URL(expected);
  // Next.js may reconstruct the URL with 0.0.0.0 inside a container.
  // Require the public Host and protocol when the reconstructed origin differs.
  const matchesFrontend = requestUrl.origin === expected ||
    (request.headers.get("host")?.toLowerCase() === frontendUrl.host.toLowerCase() && requestUrl.protocol === frontendUrl.protocol);
  const sameOriginGet = request.method === "GET" && !request.headers.get("origin") &&
    request.headers.get("sec-fetch-site") === "same-origin" && matchesFrontend;
  if (request.headers.get("origin") !== expected && !sameOriginGet) return failure(403, "origin_denied");
  const secret = process.env.HELPDESK_BRIDGE_SECRET || "";
  if (secret.length < 32) return failure(503, "bridge_not_configured");
  const base = process.env.HELPDESK_API_URL || "http://127.0.0.1:8010";
  let upstream: URL;
  try {
    upstream = new URL(base);
    // Server-only opt-in for exact container DNS names, never request-supplied hosts.
    const httpHosts = ["localhost", "127.0.0.1", "[::1]", ...(process.env.HELPDESK_HTTP_HOSTS || "").split(",").map(host => host.trim().toLowerCase()).filter(Boolean)];
    if (upstream.username || upstream.password || upstream.search || upstream.hash || upstream.pathname !== "/" ||
      !["https:", "http:"].includes(upstream.protocol) ||
      (upstream.protocol === "http:" && !httpHosts.includes(upstream.hostname))) return failure(503, "invalid_bridge_configuration");
  } catch { return failure(503, "invalid_bridge_configuration"); }
  const query = new URL(request.url).search;
  // URL paths are fixed by this allowlist; user URLs/headers are never forwarded.
  upstream.pathname = "/api/v1/helpdesk/" + path;
  upstream.search = query;
  const headers: Record<string, string> = {
    "Content-Type": "application/json", "X-Helpdesk-Bridge": secret,
    "X-Helpdesk-Session": session, Origin: expected,
  };
  const bearer = request.headers.get("authorization");
  if (bearer) {
    if (!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer) || bearer.length > 4096) return failure(401, "invalid_authentication");
    headers.Authorization = bearer;
  }
  let body: string | undefined;
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return failure(415, "unsupported_media_type");
    if (Number(request.headers.get("content-length")) > 8192) return failure(413, "payload_too_large");
    if (!request.body) return failure(400, "invalid_json");
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.length; if (length > 8192) { await reader.cancel(); return failure(413, "payload_too_large"); }
      chunks.push(next.value);
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  try {
    const result = await fetcher(upstream, {
      method: request.method, headers, body, cache: "no-store", redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(65000)]),
    });
    if (!result.body) return failure(502, "invalid_helpdesk_response");
    const reader = result.body.getReader(); const parts: Uint8Array[] = []; let received = 0;
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      received += next.value.length;
      if (received > 524288) { await reader.cancel(); return failure(502, "invalid_helpdesk_response"); }
      parts.push(next.value);
    }
    const text = Buffer.concat(parts).toString("utf8");
    try { JSON.parse(text); } catch { return failure(502, "invalid_helpdesk_response"); }
    return new Response(text, { status: result.status, headers: {
      "Content-Type": "application/json", "Cache-Control": "no-store",
      ...(result.headers.get("retry-after") ? { "Retry-After": result.headers.get("retry-after")! } : {}),
    } });
  } catch { return failure(503, "backend_unavailable"); }
}
