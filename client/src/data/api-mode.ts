export type ApiMode = "rest" | "connected" | "demo";

// Keep the existing REST/JWT client as the default. The incoming cookie-based
// workspace client is selected explicitly, so its session never replaces JWT.
export function resolveApiMode(appMode?: string, legacyDemoMode?: string): ApiMode {
  if (appMode === "connected" || appMode === "demo") return appMode;
  return legacyDemoMode === "true" ? "demo" : "rest";
}
export const apiMode = resolveApiMode(process.env.NEXT_PUBLIC_APP_MODE, process.env.NEXT_PUBLIC_DEMO_MODE);
