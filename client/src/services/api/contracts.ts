export type ApiUser = {
    user_id: number;
    full_name: string;
    email: string;
    phone: string | null;
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
    description: string | null;
    area: number;
    capacity: number;
    rules?: string | null;
    thumbnail_url: string | null;
    studio: {
        name: string;
        address: string;
        district: string;
        city: string;
    };
    images?: {
        image_url: string;
    }[];
    rates?: Rate[];
    display_rate?: {
        unit_price: number;
        rate_unit: string;
    } | null;
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
        total_amount: number;
        deposit_amount: number;
        room_amount: number;
        equipment_amount: number;
    };
};
export type CalendarData = {
    busy_slots: {
        busy_start: string;
        busy_end: string;
    }[];
};
export const unitLabels: Record<string, string> = { hour: "giờ", half_day: "nửa ngày", day: "ngày", week: "tuần", month: "tháng", session: "buổi" };
export const bookingLabels: Record<string, string> = { pending: "Chờ xác nhận / thanh toán", confirmed: "Đã xác nhận", checked_in: "Đã nhận phòng", completed: "Hoàn thành", cancelled: "Đã hủy", rejected: "Đã từ chối", expired: "Hết hạn" };
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
