export const MIN_PRICE = 0;
export const MAX_PRICE = 2_000_000;
export const PRICE_STEP = 100_000;

export function readRoomSearch(params: Pick<URLSearchParams, "get">) {
  const raw = params.get("max_price");
  const price = raw?.trim() ? Number(raw) : NaN;
  const page = Number(params.get("page"));
  return {
    keyword: params.get("keyword") ?? "",
    spaceType: params.get("space_type_id") ?? "",
    maxPrice: Number.isFinite(price) && price >= MIN_PRICE && price <= MAX_PRICE
      ? Math.round(price / PRICE_STEP) * PRICE_STEP : MAX_PRICE,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export type RoomSearch = ReturnType<typeof readRoomSearch>;

export function roomSearchRequest(search: RoomSearch) {
  const query = new URLSearchParams({
    rate_unit: "hour", max_price: String(search.maxPrice),
    page: String(search.page), limit: "12",
  });
  if (search.keyword.trim()) query.set("keyword", search.keyword.trim());
  if (search.spaceType) query.set("space_type_id", search.spaceType);
  return `/api/rooms?${query}`;
}

export function roomSearchUrl(current: string, search: RoomSearch) {
  const query = new URLSearchParams(current);
  // Obsolete area filters must never survive invisibly in the URL.
  for (const key of ["keyword", "space_type_id", "max_price", "min_area", "minArea", "page"])
    query.delete(key);
  if (search.keyword.trim()) query.set("keyword", search.keyword.trim());
  if (search.spaceType) query.set("space_type_id", search.spaceType);
  query.set("max_price", String(search.maxPrice));
  if (search.page > 1) query.set("page", String(search.page));
  return query.toString();
}

export const formatSearchPrice = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
