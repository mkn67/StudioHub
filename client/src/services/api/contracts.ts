export type ApiUser = {
    user_id: number;
    full_name: string;
    email: string;
    phone: string | null;
    date_of_birth?: string | null;
    address?: string | null;
    avatar_url?: string | null;
    role: "customer" | "host" | "admin";
    status?: string;
};
export type Rate = {
    rate_id: number;
    rate_unit: string;
    unit_price: number;
    unit_minutes: number;
    minimum_units: number;
    maximum_units: number | null;
};
export type ApiRoom = {
    room_id: number;
    studio_id: number;
    name: string;
    status?: string;
    description: string | null;
    area: number;
    ceiling_height?: number | null;
    capacity: number;
    rules?: string | null;
    thumbnail_url: string | null;
    studio: {
        name: string;
        description?: string | null;
        address: string;
        district: string;
        city: string;
        phone?: string | null;
        host_name?: string | null;
        host_email?: string | null;
        host_phone?: string | null;
        host_avatar_url?: string | null;
        cover_url?: string | null;
        host_bio?: string | null;
        is_demo_profile?: boolean;
    };
    images?: {
        image_url: string;
        alt?: string;
        source_url?: string;
    }[];
    media_notice?: string | null;
    video_reference?: { url: string; label: string; kind: "reference-not-room-tour" } | null;
    rates?: Rate[];
    amenities?: { amenity_id: number; name: string }[];
    soundproof_level?: string | null;
    power_specs?: string | null;
    space_types?: { space_type_id: number; name: string; category?: string | null; description?: string | null }[];
    primary_space_type?: { space_type_id: number; name: string; category?: string | null; description?: string | null } | null;
    display_rate?: {
        unit_price: number;
        rate_unit: string;
        unit_minutes?: number;
    } | null;
    review_summary?: { average_rating: number; review_count: number };
};
export type EquipmentItem = {
    equipment_id: number;
    name: string;
    unit_price: number;
    pricing_unit: string;
    total_quantity: number;
    status: string;
};
export type ApiBooking = {
    booking_id: number;
    booking_code: string;
    room_name: string;
    studio_name: string;
    status: string;
    start_time: string;
    end_time: string;
    expires_at: string | null;
    total_amount: number;
    deposit_amount: number;
    room_amount: number;
    equipment_amount: number;
    payments?: {
        payment_id: number;
        payment_type: string;
        amount: number;
        status: string;
    }[];
};
export type BookingPage = {
    items: ApiBooking[];
    total_pages: number;
    page: number;
    total_items: number;
};
export type Quote = {
    available: boolean;
    start_time: string;
    end_time: string;
    busy_end: string;
    pricing: {
        rate_unit?: string;
        rental_units?: number;
        room_unit_price?: number;
        total_amount: number;
        deposit_amount: number;
        room_amount: number;
        equipment_amount: number;
        equipments?: {
            equipment_id: number;
            name: string;
            quantity: number;
            pricing_unit: string;
            unit_price: number;
            equipment_hours?: number | null;
            subtotal: number;
        }[];
    };
};
export type CalendarData = {
    busy_slots: {
        busy_start: string;
        busy_end: string;
    }[];
};
export const unitLabels: Record<string, string> = { hour: "giờ", half_day: "nửa ngày", day: "ngày", week: "tuần", month: "tháng", session: "buổi" };
export const bookingLabels: Record<string, string> = { pending: "Đang xử lý", confirmed: "Đã xác nhận", checked_in: "Đã nhận phòng", completed: "Hoàn thành", cancelled: "Đã hủy", rejected: "Đã từ chối", expired: "Hết hạn" };
export function vnTimestamp(value: string) {
    const normalized = value.replace(" ", "T");
    return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(normalized) ? normalized : normalized + "+07:00");
}
export function formatApiTime(value: string) {
    return vnTimestamp(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
export function sqlVietnamTime(date: Date) {
    if (!Number.isFinite(date.getTime()))
        throw new Error("Ngày giờ không hợp lệ.");
    return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace("T", " ");
}
export function rentalRange(date: string, time: string, units: number, rate: Rate) {
    const minutes = Number(rate.unit_minutes);
    if (!Number.isInteger(units) || units < Math.max(1, Number(rate.minimum_units)) ||
        (rate.maximum_units != null && units > Number(rate.maximum_units)) || !Number.isFinite(minutes) || minutes <= 0)
        throw new Error("Thời lượng không phù hợp với bảng giá.");
    const start = vnTimestamp(`${date} ${time}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || sqlVietnamTime(start).slice(0, 16) !== `${date} ${time}`)
        throw new Error("Ngày giờ không hợp lệ.");
    return { start_time: sqlVietnamTime(start), end_time: sqlVietnamTime(new Date(start.getTime() + minutes * units * 60000)) };
}
