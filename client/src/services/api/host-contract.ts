import { ApiError } from "./client";
import { record, records, text, type RecordData } from "./management";
import type { HostEquipment, HostRoom, HostRate, HostStudio } from "@/features/host/host-types";

function number(row: RecordData, key: string): number {
  const value = row[key];
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || !Number.isFinite(Number(value))) throw new ApiError(`Dữ liệu API thiếu số hợp lệ: ${key}.`, 200, "contract_error");
  return Number(value);
}
function required(row: RecordData, key: string): string {
  if (typeof row[key] !== "string") throw new ApiError(`Dữ liệu API thiếu trường ${key}.`, 200, "contract_error");
  return row[key];
}
export function hostStudios(value: unknown): HostStudio[] {
  return records(value).map(row => ({ studio_id: number(row, "studio_id"), name: required(row, "name"), address: required(row, "address"), district: text(row.district, ""), city: text(row.city, ""), phone: text(row.phone, ""), status: required(row, "status"), description: text(row.description, ""), cover_url: text(row.cover_url, ""), ...(row.total_rooms == null ? {} : { total_rooms: number(row, "total_rooms") }), ...(row.total_equipments == null ? {} : { total_equipments: number(row, "total_equipments") }) }));
}
export function hostEquipment(value: unknown): HostEquipment[] {
  return records(value).map(row => ({ equipment_id: number(row, "equipment_id"), studio_id: number(row, "studio_id"), category_id: number(row, "category_id"), name: required(row, "name"), status: required(row, "status"), unit_price: number(row, "unit_price"), total_quantity: number(row, "total_quantity"), pricing_unit: required(row, "pricing_unit"), category_name: text(row.category_name, ""), brand: text(row.brand, ""), description: text(row.description, ""), image_url: Array.isArray(row.images) ? text(row.images[0], "") : null }));
}
export function hostRoom(value: unknown): HostRoom {
  const row = record(value);
  const images = row.images === undefined ? [] : records(row.images).map(image => ({ image_url: required(image, "image_url") }));
  return { room_id: number(row, "room_id"), studio_id: number(row, "studio_id"), name: required(row, "name"), area: number(row, "area"), capacity: number(row, "capacity"), room_type_id: row.room_type_id == null ? null : number(row, "room_type_id"), status: required(row, "status"), description: text(row.description, ""), rules: text(row.rules, ""), thumbnail_url: text(row.thumbnail_url, images[0]?.image_url ?? ""), images };
}
export function hostRooms(value: unknown): HostRoom[] { return records(value).map(hostRoom); }
export function hostRates(value: unknown): HostRate[] {
  return records(value).map(row => ({ rate_id: number(row, "rate_id"), rate_unit: required(row, "rate_unit"), unit_minutes: number(row, "unit_minutes"), unit_price: number(row, "unit_price"), minimum_units: number(row, "minimum_units"), maximum_units: row.maximum_units == null ? null : number(row, "maximum_units"), status: required(row, "status"), effective_from: required(row, "effective_from"), effective_to: row.effective_to == null ? null : required(row, "effective_to") }));
}
