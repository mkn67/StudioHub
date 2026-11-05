import type { ApiRoom, ApiBooking, EquipmentItem, Rate } from "@/services/api/contracts";

export type HostStudio = {
  studio_id: number; name: string; address: string; district: string; city: string;
  phone: string; status: string; description?: string | null;
  total_rooms?: number; total_equipments?: number; cover_url?: string | null;
};
export type HostRoom = Omit<ApiRoom, "studio"> & {
  studio?: ApiRoom["studio"];
  room_type_id?: number | null;
  status?: string;
  primary_space_type?: { space_type_id: number; name: string } | null;
};
export type HostEquipment = EquipmentItem & {
  studio_id?: number;
  category_id?: number; category_name?: string; image_url?: string | null;
  brand?: string | null; description?: string | null;
};
export type HostBooking = ApiBooking & { customer_name?: string; customer_phone?: string };
export type HostRate = Rate & { status?: string; effective_from?: string; effective_to?: string | null };
export type HostStats = {
  total_customers?: number;
  total_bookings: number; total_revenue: number; occupancy_rate: number;
  total_studios: number; total_rooms: number; period: { from: string; to: string };
};
