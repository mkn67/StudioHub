import test from "node:test";
import assert from "node:assert/strict";
import { parsePreferences, preferenceKey } from "@/features/workspace/preferences";
test("management preferences safely recover from malformed browser storage", () => {
  for (const raw of [null, "bad JSON", "null", "[]", '"text"']) assert.deepEqual(parsePreferences(raw), { compact: false, reduceMotion: false });
});
test("only known boolean preferences are accepted; credentials and unknown keys are ignored", () => {
  assert.deepEqual(parsePreferences('{"compact":true,"reduceMotion":false,"token":"do-not-use","hints":true}'), { compact: true, reduceMotion: false });
  assert.deepEqual(parsePreferences('{"compact":"true","reduceMotion":1}'), { compact: false, reduceMotion: false });
});
test("browser preference namespaces isolate role and account without storing identity fields", () => {
  assert.notEqual(preferenceKey("host", 2), preferenceKey("admin", 2));
  assert.notEqual(preferenceKey("host", 2), preferenceKey("host", 3));
  assert.equal(preferenceKey("host", 2), "studiohub.workspace.preferences.v1.host.2");
});
