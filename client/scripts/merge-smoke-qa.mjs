import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

// Every API request is blocked before it reaches PHP. This smoke test must not
// depend on database migrations, existing records, logins or a running backend.
const port = Number(process.env.MERGE_QA_PORT || 3100), base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: new URL("../", import.meta.url), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "", browser;
server.stdout.on("data", chunk => { serverLog += chunk; }); server.stderr.on("data", chunk => { serverLog += chunk; });
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`QA server exited: ${serverLog}`);
    if (serverLog.includes("Ready in")) break;
    await setTimeout(250);
  }
  assert.match(serverLog, /Ready in/);
  browser = await chromium.launch(); const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const apiRequests = [], errors = [];
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/") || url.port === "8000") { apiRequests.push(url.pathname); return route.abort("blockedbyclient"); }
    if (url.protocol.startsWith("http") && url.origin !== base) return route.abort("blockedbyclient");
    return route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/rooms", "/profile", "/host/settings", "/admin/settings"]) {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (path === "/profile") await expect(page.getByRole("link", { name: "Đăng nhập", exact: true }).first()).toBeVisible();
    if (path.startsWith("/host") || path.startsWith("/admin")) { await expect(page.getByRole("heading", { name: "Khu vực quản lý", exact: true })).toBeVisible(); assert.equal(await page.locator(".site-header").count(), 0); }
    else await expect(page.locator(".site-header")).toBeVisible();
    assert.equal(await page.getByText("Chưa tải được StudioHub", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Dành cho chủ Studio", { exact: true }).count(), 0);
  }
  assert.ok(apiRequests.some(path => path.startsWith("/api/rooms")));
  assert.equal(apiRequests.some(path => path.startsWith("/api/business/")), false, "REST mode must not request cookie-based workspace state");
  assert.deepEqual(errors, []);
  console.log("PASS: production Guest/Public/Profile/Host/Admin routes render, no workspace session mixing, no uncaught JavaScript errors; every API request blocked before backend.");
} finally { await browser?.close(); server.kill(); }
