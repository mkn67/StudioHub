import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { proxyHelpdesk } from "@/features/helpdesk/server/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const previous = request.cookies.get("studiohub_helpdesk_session")?.value;
  const session = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  const authenticated = new Request(request, { headers: new Headers(request.headers) });
  // Only the HttpOnly business session can identify a browser actor.
  authenticated.headers.delete("authorization");
  const token = request.cookies.get("studiohub_auth")?.value;
  if (token) authenticated.headers.set("authorization", `Bearer ${token}`);
  const response = await proxyHelpdesk(authenticated, path, session);
  const result = new NextResponse(response.body, { status: response.status, headers: response.headers });
  if (!previous || previous !== session) result.cookies.set("studiohub_helpdesk_session", session, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/api/helpdesk", maxAge: 86400,
  });
  return result;
}
export const GET = handle;
export const POST = handle;
