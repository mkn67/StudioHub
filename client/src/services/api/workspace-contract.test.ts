import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWorkspace, parseReport, ownedInventory, workspaceRooms, workspaceEquipment } from "./workspace-contract";
const fixture = () => JSON.parse(readFileSync(new URL("../../../tests/fixtures/workspace.json", import.meta.url), "utf8"));
test("workspace refuses malformed/missing sections and a different authenticated identity", () => {
  assert.throws(() => parseWorkspace({}, "2")); assert.throws(() => parseWorkspace(fixture(), "3"));
  for (const key of ["rooms", "equipment", "applications", "audit"]) { const raw = fixture(); delete raw[key]; assert.throws(() => parseWorkspace(raw, "2")); }
  const raw = fixture(); raw.equipment[0].quantity = "unknown"; assert.throws(() => parseWorkspace(raw, "2"));
});
test("Host projection removes other owners while preserving inactive rooms/equipment and exact prices", () => {
  const w = parseWorkspace(fixture(), "2"), own = ownedInventory(w, "2");
  assert.deepEqual(own.studios.map(item => item.id), ["10", "11"]); assert.equal(own.rooms.some(room => room.id === "2000"), false);
  assert.ok(own.rooms.some(room => !room.active)); assert.deepEqual(own.equipment.map(item => item.id), ["5000", "5001"]);
  const rooms = workspaceRooms(w, own.rooms); assert.equal(rooms.find(room => room.room_id === 1001)?.status, "not_active");
  assert.equal(workspaceEquipment(own.equipment)[0].unit_price, 50000); assert.equal(workspaceEquipment(own.equipment)[0].studio_id, 10);
});
test("reports retain backend money definitions, accept PHP empty maps, and reject fabricated zero defaults", () => {
  const report = parseReport(fixture().report); assert.equal(report.netCollected, 400000); assert.equal(report.monthlyRooms["2030-01"]["1000"], 1);
  assert.deepEqual(parseReport({ ...fixture().report, weeklyRooms: [], monthlyRooms: [] }).weeklyRooms, {});
  assert.throws(() => parseReport({})); assert.throws(() => parseReport({ ...fixture().report, weeklyRooms: [1] }));
  assert.throws(() => parseReport({ ...fixture().report, netCollected: null }));
});
test("unresolvable room/Studio relation is an error, not a valid-looking empty list", () => {
  const w = parseWorkspace(fixture(), "2"); assert.throws(() => workspaceRooms(w, [{ ...w.rooms[0], typeId: "missing" }]));
});
