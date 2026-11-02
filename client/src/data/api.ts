import type { State } from "@/domain/models";
export const demoMode = process.env.NEXT_PUBLIC_APP_MODE === "demo";
export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: { field: string; message: string }[] = []) { super(message); }
}
export async function api<T>(path: string, body?: unknown, key?: string): Promise<T> {
  const response = await fetch(`/api/business/${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000),
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== "success") throw new ApiError(payload.message || "Yêu cầu không thành công.", response.status, payload.errors || []);
  return payload.data as T;
}
export async function loadWorkspace(): Promise<State> {
  try { return await api<State>("workspace"); }
  catch (error) { if (error instanceof ApiError && error.status === 401) return api<State>("catalog"); throw error; }
}
export const emptyState = (): State => ({ version: 1, now: Date.now(), sessionId: null, users: [], studios: [], types: [], rooms: [], equipment: [], bookings: [], applications: [], audit: [], notifications: [] });
