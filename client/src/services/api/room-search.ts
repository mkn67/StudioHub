export const MIN_PRICE = 0;
export const MAX_PRICE = 2_000_000;
export const PRICE_STEP = 100_000;
export const SEARCH_RATE_UNITS = ["hour", "half_day", "day", "week", "month", "session"] as const;
export type SearchRateUnit = typeof SEARCH_RATE_UNITS[number];

export function readRoomSearch(params: Pick<URLSearchParams, "get">) {
  const raw = params.get("max_price");
  const price = raw?.trim() ? Number(raw) : NaN;
  const page = Number(params.get("page"));
  const rawDate = params.get("available_date") ?? "";
  const parsedDate = new Date(`${rawDate}T00:00:00+07:00`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && Number.isFinite(parsedDate.getTime()) && new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(parsedDate) === rawDate ? rawDate : "";
  const rawTime = params.get("available_time") ?? "09:00";
  const startTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : "09:00";
  const minArea = Number(params.get("min_area"));
  const minCapacity = Number(params.get("min_capacity"));
  const duration = Number(params.get("duration_hours"));
  return {
    keyword: params.get("keyword") ?? "",
    spaceType: params.get("space_type_id") ?? "",
    district: params.get("district") ?? "",
    minArea: Number.isFinite(minArea) && minArea >= 0 && minArea <= 10000 ? minArea : 0,
    minCapacity: Number.isSafeInteger(minCapacity) && minCapacity >= 0 && minCapacity <= 1000 ? minCapacity : 0,
    amenityId: params.get("amenity_id") ?? "",
    date,
    startTime,
    durationHours: Number.isFinite(duration) && duration >= 1 && duration <= 24 ? duration : 4,
    maxPrice: Number.isFinite(price) && price >= MIN_PRICE && price <= MAX_PRICE
      ? Math.round(price / PRICE_STEP) * PRICE_STEP : MAX_PRICE,
    sort: ["recommended", "price_asc", "price_desc", "area_desc", "capacity_desc", "newest"].includes(params.get("sort") ?? "") ? params.get("sort")! : "recommended",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export type RoomSearch = ReturnType<typeof readRoomSearch>;

export function roomSearchRequest(search: RoomSearch, rateUnit: string = "hour") {
  const selectedUnit = SEARCH_RATE_UNITS.includes(rateUnit as SearchRateUnit) ? rateUnit : "hour";
  const query = new URLSearchParams({
    rate_unit: selectedUnit,
    page: String(search.page), limit: "12",
  });
  // The slider's top position means no price limit, so session-only rooms remain discoverable.
  if (search.maxPrice < MAX_PRICE) query.set("max_price", String(search.maxPrice));
  if (search.keyword.trim()) query.set("keyword", search.keyword.trim());
  if (search.spaceType) query.set("space_type_id", search.spaceType);
  if (search.district.trim()) query.set("district", search.district.trim());
  if (search.minArea > 0) query.set("min_area", String(search.minArea));
  if (search.minCapacity > 0) query.set("min_capacity", String(search.minCapacity));
  if (search.amenityId) query.set("amenity_id", search.amenityId);
  query.set("sort", search.sort);
  if (search.date) {
    const from = `${search.date} ${search.startTime}:00`;
    const start = new Date(`${search.date}T${search.startTime}:00+07:00`);
    const to = new Date(start.getTime() + search.durationHours * 3600000);
    const end = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(to).replace("T", " ");
    query.set("available_from", from);
    query.set("available_to", end);
  }
  return `/api/rooms?${query}`;
}

export function roomSearchUrl(current: string, search: RoomSearch, rateUnit: string = "hour") {
  const query = new URLSearchParams(current);
  // Replace only the supported catalog filters; keep unrelated campaign parameters intact.
  for (const key of ["keyword", "space_type_id", "max_price", "min_area", "minArea", "min_capacity", "district", "amenity_id", "available_date", "available_time", "duration_hours", "available_from", "available_to", "sort", "page", "rate_unit"])
    query.delete(key);
  const selectedUnit = SEARCH_RATE_UNITS.includes(rateUnit as SearchRateUnit) ? rateUnit : "hour";
  if (search.keyword.trim()) query.set("keyword", search.keyword.trim());
  if (search.spaceType) query.set("space_type_id", search.spaceType);
  if (search.district.trim()) query.set("district", search.district.trim());
  if (search.minArea > 0) query.set("min_area", String(search.minArea));
  if (search.minCapacity > 0) query.set("min_capacity", String(search.minCapacity));
  if (search.amenityId) query.set("amenity_id", search.amenityId);
  if (search.date) {
    query.set("available_date", search.date);
    query.set("available_time", search.startTime);
    query.set("duration_hours", String(search.durationHours));
  }
  if (search.sort !== "recommended") query.set("sort", search.sort);
  if (selectedUnit !== "hour") query.set("rate_unit", selectedUnit);
  query.set("max_price", String(search.maxPrice));
  if (search.page > 1) query.set("page", String(search.page));
  return query.toString();
}

export const formatSearchPrice = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
