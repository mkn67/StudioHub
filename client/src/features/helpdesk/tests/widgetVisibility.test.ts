import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowHelpdesk, helpdeskRoomId } from "../components/widgetVisibility";

test("helpdesk widget is hidden throughout host and admin workspaces", () => {
  for (const path of ["/host", "/host/rooms", "/host/reports", "/admin", "/admin/users"]) {
    assert.equal(shouldShowHelpdesk(path), false, path);
  }
});

test("helpdesk is available only for discovery and room details", () => {
  for (const path of ["/", "/rooms", "/rooms/", "/rooms/4", "/rooms/4/"]) {
    assert.equal(shouldShowHelpdesk(path), true, path);
  }
});

test("booking, payment, account and unrelated pages never mount the widget", () => {
  for (const path of ["/my-bookings", "/my-bookings/history", "/my-bookings/1", "/rooms/4/book", "/payment/1", "/profile", "/login", "/register", "/rooms/abc", "/rooms/0", "/anything"]) {
    assert.equal(shouldShowHelpdesk(path), false, path);
  }
});

test("room context contains only the numeric ID of the current detail page", () => {
  assert.equal(helpdeskRoomId("/rooms/12"), 12);
  for (const path of ["/", "/rooms", "/rooms/12/book", "/rooms/abc", "/rooms/0"]) {
    assert.equal(helpdeskRoomId(path), undefined);
  }
});
