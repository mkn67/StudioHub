import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchSuggestions, normalizeSearch, suggestionScore } from "../../features/marketplace/search-suggestions";
test("Vietnamese purposes, accents and minor typos produce relevant suggestions", () => {
  assert.equal(normalizeSearch("Phòng THỜI TRANG"), "phong thoi trang");
  const types = [{ space_type_id: 2, name: "Lookbook & Fashion" }, { space_type_id: 9, name: "Music Recording Studio" }];
  assert.equal(buildSearchSuggestions("thời trang", [], types)[0].id, "type-2");
  assert.equal(buildSearchSuggestions("lookbok", [], types)[0].id, "type-2");
  assert.equal(buildSearchSuggestions("thu âm", [], types)[0].id, "type-9");
  assert.equal(buildSearchSuggestions("khong-co-ket-qua", [], types).length, 0);
});
test("exact room matches outrank categories and suggestions use real identifiers", () => {
  const room = { room_id: 73, name: "Artemis Daylight", studio: { name: "Artemis", district: "Quận 3" } };
  const suggestions = buildSearchSuggestions("Artemis Daylight", [room], [{ space_type_id: 2, name: "Lookbook & Fashion" }]);
  assert.equal(suggestions[0].href, "/rooms/73");
  assert.ok(suggestionScore("podcast", "Podcast") > suggestionScore("podcast", "Recording", "podcast"));
});
