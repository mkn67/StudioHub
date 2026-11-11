import test from "node:test";
import assert from "node:assert/strict";
import { authDestination } from "@/features/auth/navigation";

test("auth preserves local room destinations and query parameters", () => {
  assert.equal(authDestination("/rooms/6?plan=hour#rates", "customer"), "/rooms/6?plan=hour#rates");
});
test("auth rejects external, protocol-relative and backslash destinations", () => {
  for (const destination of ["https://example.com", "//example.com", "/\\example.com", "/\n/example.com", "/\t/example.com"])
    assert.equal(authDestination(destination, "customer"), "/my-bookings");
});
test("auth keeps existing role fallbacks", () => {
  assert.equal(authDestination(null, "customer"), "/my-bookings");
  assert.equal(authDestination(null, "host"), "/host");
  assert.equal(authDestination(null, "admin"), "/admin");
});
