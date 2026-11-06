import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PRICE, readRoomSearch, roomSearchRequest, roomSearchUrl, formatSearchPrice } from "./room-search";

test("price defaults, invalid URL values and Vietnamese display", () => {
  for (const raw of ["", "max_price=", "max_price=oops", "max_price=-1", "max_price=2000001"])
    assert.equal(readRoomSearch(new URLSearchParams(raw)).maxPrice, MAX_PRICE);
  assert.equal(formatSearchPrice(1_000_000), "1.000.000đ");
  assert.equal(formatSearchPrice(0), "0đ");
});

test("a lowered slider filters hourly prices; its top position includes session-only rooms", () => {
  for (const maxPrice of [0, 100_000, 1_000_000, 2_000_000]) {
    const search = readRoomSearch(new URLSearchParams(`max_price=${maxPrice}`));
    assert.equal(search.maxPrice, maxPrice);
    const request = new URL(roomSearchRequest(search), "http://test");
    assert.equal(request.searchParams.get("max_price"), maxPrice === MAX_PRICE ? null : String(maxPrice));
    assert.equal(request.searchParams.get("rate_unit"), "hour");
  }
});

test("restore combined filters and page; preserve active area filter", () => {
  const query = "keyword=Artemis&space_type_id=1&max_price=1000000&page=2&min_area=999&minArea=888&utm_source=qa";
  const search = readRoomSearch(new URLSearchParams(query));
  assert.deepEqual(search, { keyword: "Artemis", spaceType: "1", district: "", minArea: 999, minCapacity: 0, amenityId: "", date: "", startTime: "09:00", durationHours: 4, maxPrice: 1_000_000, sort: "recommended", page: 2 });
  const request = new URL(roomSearchRequest(search), "http://test").searchParams;
  assert.equal(request.get("keyword"), "Artemis");
  assert.equal(request.get("space_type_id"), "1");
  assert.equal(request.get("page"), "2");
  assert.equal(request.get("min_area"), "999");
  const normalized = new URLSearchParams(roomSearchUrl(query, search));
  assert.equal(normalized.get("min_area"), "999");
  assert.equal(normalized.has("minArea"), false);
  assert.equal(normalized.get("utm_source"), "qa");
});

test("reset clears search filters including area; resets pagination", () => {
  const query = "keyword=Artemis&space_type_id=2&max_price=0&min_area=999&page=3&utm_source=qa";
  const reset = new URLSearchParams(roomSearchUrl(query, readRoomSearch(new URLSearchParams())));
  assert.deepEqual(Object.fromEntries(reset), { utm_source: "qa", max_price: "2000000" });
  for (const raw of ["page=-1", "page=0", "page=oops", "page=1.5"])
    assert.equal(readRoomSearch(new URLSearchParams(raw)).page, 1);
});
