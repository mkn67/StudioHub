import { apiRequest, ApiError } from "./client";

export type Scalar = string | number | boolean | null;
export type RecordData = Record<string, unknown>;
export type ResourcePage = { items: RecordData[]; page: number; limit: number };
export function record(value: unknown): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError("Dữ liệu API không đúng cấu trúc đối tượng.", 200, "contract_error");
  return value as RecordData;
}
export function records(value: unknown): RecordData[] {
  if (!Array.isArray(value)) throw new ApiError("Dữ liệu API không đúng cấu trúc danh sách.", 200, "contract_error");
  return value.map(record);
}
export function nullableRecord(value: unknown): RecordData | null { return value === null ? null : record(value); }
export function applicationPage(value: unknown) {
  const data = record(value), pagination = record(data.pagination);
  if (!Number.isInteger(pagination.total_pages)) throw new ApiError("Phân trang hồ sơ không hợp lệ.", 200, "contract_error");
  return { items: records(data.items), pagination };
}
export function reportSeries(value: unknown) {
  const data = record(value);
  const series = records(data.series).map(row => {
    if (typeof row.date !== "string") throw new ApiError("Chuỗi báo cáo thiếu ngày.", 200, "contract_error");
    return { date: row.date, bookings: finiteNumber(row.bookings), revenue: finiteNumber(row.revenue) };
  });
  return { period: record(data.period), series };
}
export function hostOverview(value: unknown) {
  const data = record(value);
  return { statistics: statistics(data.statistics), upcoming_bookings: records(data.upcoming_bookings) };
}
export function finiteNumber(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || value === "" || !Number.isFinite(Number(value))) throw new ApiError("Số liệu API không hợp lệ.", 200, "contract_error");
  return Number(value);
}
export function statistics(value: unknown) {
  const data = record(value), period = record(data.period);
  if (typeof period.from !== "string" || typeof period.to !== "string") throw new ApiError("Báo cáo thiếu kỳ thời gian.", 200, "contract_error");
  return { total_bookings: finiteNumber(data.total_bookings), total_revenue: finiteNumber(data.total_revenue), occupancy_rate: finiteNumber(data.occupancy_rate), total_studios: finiteNumber(data.total_studios), total_rooms: finiteNumber(data.total_rooms), period: { from: period.from, to: period.to }, ...(data.total_customers === undefined ? {} : { total_customers: finiteNumber(data.total_customers) }) };
}
export function resourcePage(value: unknown): ResourcePage {
  const data = record(value);
  if (!Number.isInteger(data.page) || !Number.isInteger(data.limit)) throw new ApiError("API không trả phân trang hợp lệ.", 200, "contract_error");
  return { items: records(data.items), page: Number(data.page), limit: Number(data.limit) };
}
export function text(value: unknown, fallback = "—"): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}
export function queryPath(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `${path}${query.size ? `?${query}` : ""}`;
}
export function validateUpload(file: FormDataEntryValue | null, document = false): asserts file is File {
  const types = document ? ["application/pdf", "image/jpeg", "image/png"] : ["image/jpeg", "image/png", "image/webp"];
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !types.includes(file.type))
    throw new Error(document ? "Chọn tài liệu PDF/JPG/PNG tối đa 5 MiB." : "Chọn ảnh JPG/PNG/WebP tối đa 5 MiB.");
}
export async function downloadContract(id: number | string): Promise<Blob> {
  if (!/^[1-9]\d*$/.test(String(id))) throw new ApiError("Mã hợp đồng không hợp lệ.", 0, "contract_error");
  const grant = record(await apiRequest(`/api/host/contracts/${id}/document-access`, { method: "POST" }));
  // Never forward a Bearer token to a URL supplied by a response on another origin.
  const path = text(grant.access_url, "");
  if (!new RegExp(`^/api/host/contracts/${id}/documents/[a-f0-9]{64}$`).test(path))
    throw new ApiError("Đường dẫn truy cập hợp đồng không hợp lệ.", 200, "contract_error");
  return apiRequest<Blob>(path, { responseType: "pdf" });
}
