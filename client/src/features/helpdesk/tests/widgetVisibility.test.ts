import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowHelpdesk } from "../components/widgetVisibility";

test("helpdesk widget is hidden throughout host and admin workspaces", () => {
  for (const path of ["/host", "/host/rooms", "/host/reports", "/admin", "/admin/users"]) {
    assert.equal(shouldShowHelpdesk(path), false, path);
  }
});

test("helpdesk widget remains available on public and customer pages", () => {
  for (const path of ["/", "/rooms", "/rooms/4", "/my-bookings", "/profile"]) {
    assert.equal(shouldShowHelpdesk(path), true, path);
  }
});
