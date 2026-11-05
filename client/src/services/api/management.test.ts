import test from "node:test";
import assert from "node:assert/strict";
import { hostEquipment, hostRooms, hostRates } from "./host-contract";
import { record, records, nullableRecord, applicationPage, resourcePage, queryPath, reportSeries, hostOverview } from "./management";
import { profilePayload } from "../../features/customer/profile-data";

test("dedicated management adapters preserve inactive states, SQL numeric strings and real image references", () => {
  const equipment = hostEquipment([{ equipment_id: "3", studio_id: "2", category_id: "7", name: "Đèn", unit_price: "125000.00", total_quantity: "4", pricing_unit: "hour", status: "maintenance", images: ["/uploads/equipment/real.webp"] }]);
  assert.equal(equipment[0].status, "maintenance"); assert.equal(equipment[0].unit_price, 125000); assert.equal(equipment[0].image_url, "/uploads/equipment/real.webp");
  assert.equal(hostRooms([{ room_id: "8", studio_id: "2", room_type_id: "12", name: "Ẩn", area: "20.5", capacity: "3", status: "inactive" }])[0].room_type_id, 12);
  assert.equal(hostRates([{ rate_id: "4", rate_unit: "session", unit_price: "200000", unit_minutes: "180", minimum_units: "1", maximum_units: null, status: "inactive", effective_from: "2026-01-01", effective_to: null }])[0].unit_minutes, 180);
});
test("malformed management responses reject instead of producing empty lists or zero money", () => {
  for (const parse of [record, records, resourcePage, applicationPage, hostOverview, reportSeries]) assert.throws(() => parse(undefined));
  assert.throws(() => hostEquipment([{ equipment_id: 1 }]));
  assert.throws(() => hostRates([{ rate_id: 1, unit_price: "NaN" }]));
  assert.throws(() => resourcePage({ items: [], page: "1", limit: 25 }));
  assert.deepEqual(resourcePage({ items: [], page: 1, limit: 25 }), { items: [], page: 1, limit: 25 });
  assert.equal(nullableRecord(null), null);
  assert.equal(queryPath("/api/admin/studios", { page: 2, search: "A & B", status: "", limit: 12 }), "/api/admin/studios?page=2&search=A+%26+B&limit=12");
});
test("profile fields use supported keys and validate actual dates with Vietnam day boundaries", () => {
  assert.deepEqual(profilePayload(" Nguyễn An ", "", { date_of_birth: "2000-02-29", address: "  Quận 1  " }), { full_name: "Nguyễn An", phone: "", date_of_birth: "2000-02-29", address: "Quận 1" });
  assert.deepEqual(profilePayload("An", "", { date_of_birth: "", address: "" }), { full_name: "An", phone: "", date_of_birth: null, address: null });
  for (const date_of_birth of ["2001-02-29", "2039-01-01", "2020-13-01", "not-a-date"]) assert.throws(() => profilePayload("An", "", { date_of_birth, address: "" }));
  assert.throws(() => profilePayload("An", "", { date_of_birth: "", address: "a".repeat(256) }));
});
