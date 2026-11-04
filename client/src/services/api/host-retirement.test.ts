import test from "node:test";
import assert from "node:assert/strict";
import { retirementRequest, type RetirementTarget } from "../../features/host/host-retirement";
const rate = { rate_id: 12, rate_unit: "session", unit_minutes: 180, unit_price: 950000, minimum_units: 1, maximum_units: null };
test("retirement only changes status and preserves room/rate identity without submitting price or stock", () => {
  const equipment = retirementRequest({ kind: "equipment", equipment: { equipment_id: 7, name: "Đèn Studio" } });
  assert.deepEqual(equipment, { path: "/api/equipments/7", method: "PATCH", body: { status: "inactive" } });
  const request = retirementRequest({ kind: "rate", rate, roomId: "8", roomName: "Phòng A" });
  assert.equal(request.path, "/api/rooms/8/rates/12"); assert.deepEqual(request.body, { status: "inactive" });
  assert.equal(rate.unit_price, 950000);
});
test("invalid identifiers never produce a request against another route or resource", () => {
  for (const roomId of ["0", "-1", "1/2", "1?x=2", "NaN", "9007199254740992"]) assert.throws(() => retirementRequest({ kind: "rate", rate, roomId, roomName: "A" }));
  for (const equipment_id of [0, -2, Infinity, NaN, 1.2]) assert.throws(() => retirementRequest({ kind: "equipment", equipment: { equipment_id, name: "A" } } as RetirementTarget));
});
