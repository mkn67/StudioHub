import { readFile, writeFile, mkdir } from "node:fs/promises";
const api = process.env.QA_API_URL || "http://localhost:8000";
const source = await readFile(new URL("../../server/public/index.php", import.meta.url), "utf8");
const routes = [...source.matchAll(/\$router->(get|post|patch)\('([^']+)'/g)].map(match => ({ method: match[1].toUpperCase(), path: match[2] }));
const evidence = [];
const tokens = {};
async function check(role, path, expected = 200) {
  const response = await fetch(`${api}${path}`, { headers: tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {} });
  const payload = await response.json();
  evidence.push({ role, method: "GET", path, expected, actual: response.status, passed: response.status === expected, responseFields: payload.data && !Array.isArray(payload.data) ? Object.keys(payload.data) : [], itemFields: Array.isArray(payload.data) ? Object.keys(payload.data[0] ?? {}) : Object.keys(payload.data?.items?.[0] ?? {}), total: payload.data?.total_items ?? payload.data?.pagination?.total_items ?? (Array.isArray(payload.data) ? payload.data.length : undefined) });
  return payload.data;
}
for (const [role, email] of [["admin", "admin@studio.local"], ["host", "host1@studio.local"], ["customer", "customer@studio.local"]]) {
  const response = await fetch(`${api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: process.env.QA_PASSWORD || "password123" }) });
  const payload = await response.json();
  if (!response.ok || !payload.data?.token) throw new Error(`Runtime login unavailable for ${role}`);
  tokens[role] = payload.data.token;
  evidence.push({ role, method: "POST", path: "/api/auth/login", actual: response.status, passed: true, note: "Source AuthService::login chỉ SELECT và tạo JWT, không cập nhật DB." });
  await check(role, "/api/auth/profile");
}
await check("guest", "/api/health");
await check("admin", "/api/admin/users?page=1&limit=12");
await check("admin", "/api/admin/users?page=1&limit=12&search=studio&role=host&status=active");
await check("admin", "/api/admin/users?page=1&limit=12&status=locked");
await check("host", "/api/admin/users", 403);
await check("guest", "/api/admin/users", 401);
await check("admin", "/api/admin/statistics");
await check("admin", "/api/admin/statistics?from=2026-10-01&to=2026-11-01");
await check("host", "/api/admin/statistics", 403);
await check("host", "/api/host/statistics");
await check("admin", "/api/host/statistics", 403);
const studios = await check("host", "/api/studios/mine");
await check("admin", "/api/studios/mine", 403);
const rooms = await check("guest", "/api/rooms?limit=50");
await check("guest", "/api/space-types");
await check("guest", "/api/amenities");
const room = rooms?.items?.find(item => item.studio_id === studios?.[0]?.studio_id);
if (room) {
  await check("guest", `/api/rooms/${room.room_id}`);
  await check("guest", `/api/rooms/${room.room_id}/rates`);
  await check("guest", `/api/rooms/${room.room_id}/calendar`);
}
if (studios?.[0]) {
  await check("guest", `/api/equipments?studio_id=${studios[0].studio_id}`);
  await check("host", `/api/equipment-categories?studio_id=${studios[0].studio_id}`);
  await check("admin", `/api/equipment-categories?studio_id=${studios[0].studio_id}`, 403);
}
await check("admin", "/api/bookings?page=1&limit=12&status=");
await check("host", "/api/bookings?page=1&limit=12&status=pending");
await check("customer", "/api/bookings?page=1&limit=12");
const logout = await fetch(`${api}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${tokens.admin}` } });
evidence.push({ role: "admin", method: "POST", path: "/api/auth/logout", actual: logout.status, expected: 200, passed: logout.status === 200, note: "AuthController::logout chỉ trả success, không ghi DB hoặc thu hồi JWT phía server." });
// Do not read pending booking detail: its expire-on-access path may mutate DB.
const prod = routes.filter(route => route.path.startsWith("/api/") && !route.path.startsWith("/api/test/"));
const output = new URL("../../docs/api/", import.meta.url); await mkdir(output, { recursive: true });
const result = { capturedAt: new Date().toISOString(), scope: "PHP API StudioHub, không gồm Helpdesk; không chạy mutation tài nguyên/hồ sơ/quyền", registeredRoutes: routes, productionApiRoutes: prod, runtimeChecks: evidence, summary: { registered: routes.length, productionApi: prod.length, successfulChecks: evidence.filter(check => check.passed).length, failedChecks: evidence.filter(check => !check.passed).length, runtimeVerifiedOperations: [...new Set(evidence.filter(check => check.passed && check.actual === 200).map(check => `${check.method} ${check.path.split("?")[0].replace(/\/\d+(?=\/|$)/g, "/{id}")}`))].length } };
await writeFile(new URL("API_RUNTIME_EVIDENCE.json", output), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.summary));
if (result.summary.failedChecks) process.exitCode = 1;
