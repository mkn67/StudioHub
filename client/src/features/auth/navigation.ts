/** Only local application destinations may be used after authentication. */
export function authDestination(returnTo: string | null, role: string): string {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//") && !/[\\\u0000-\u0020]/.test(returnTo)) {
    try {
      const url = new URL(returnTo, "https://studiohub.invalid");
      if (url.origin === "https://studiohub.invalid") return url.pathname + url.search + url.hash;
    } catch { /* Fall back to the existing role destination. */ }
  }
  return role === "customer" ? "/my-bookings" : `/${role}`;
}
