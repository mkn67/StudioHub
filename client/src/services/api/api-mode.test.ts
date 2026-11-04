import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiMode } from "../../data/api-mode";

test("existing REST configuration never silently activates the incoming workspace client", () => {
  assert.equal(resolveApiMode(), "rest");
  assert.equal(resolveApiMode(undefined, "false"), "rest");
  assert.equal(resolveApiMode("invalid", "false"), "rest");
});
test("explicit workspace/demo selections and legacy demo flag remain supported", () => {
  assert.equal(resolveApiMode("connected", "false"), "connected");
  assert.equal(resolveApiMode("demo", "false"), "demo");
  assert.equal(resolveApiMode(undefined, "true"), "demo");
  assert.equal(resolveApiMode("connected", "true"), "connected");
});
