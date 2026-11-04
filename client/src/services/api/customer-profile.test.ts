import test from "node:test";
import assert from "node:assert/strict";
import { profilePayload, customerInitials } from "../../features/customer/profile-data";
test("profile payload preserves Vietnamese, phone formatting and only permits supported keys", () => {
  assert.deepEqual(profilePayload("  Lộc Dương Đức  ", "  +84 090 123 4567  "), { full_name: "Lộc Dương Đức", phone: "+84 090 123 4567" });
  assert.deepEqual(profilePayload("An", ""), { full_name: "An", phone: "" });
  assert.equal(profilePayload("An", "0123456789").phone, "0123456789");
});
test("profile validation rejects trimmed empty names and oversized fields without imposing a new phone pattern", () => {
  for (const name of ["   ", " A ", "a".repeat(101)]) assert.throws(() => profilePayload(name, ""));
  assert.throws(() => profilePayload("An", "1".repeat(21)));
  assert.equal(profilePayload("An", "(028) 123-456").phone, "(028) 123-456");
});
test("initials derive from actual Vietnamese identity and handle missing whitespace", () => {
  assert.equal(customerInitials(" Lộc Dương Đức "), "DĐ"); assert.equal(customerInitials("An"), "A"); assert.equal(customerInitials("  "), "SH");
});
