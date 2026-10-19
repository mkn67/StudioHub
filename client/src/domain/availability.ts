import type { BookingRequest, Database, Result } from "./schema";
import {
  minuteOfDay,
  vietnamWeekday,
  vietnamInstant,
  localDate,
} from "@/lib/format";
import { getEffectiveRoomStatus } from "./access";
import { occupies } from "./booking";
import { calculateBooking, onlineUnit } from "./pricing";
export const overlaps = (
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
) => start < otherEnd && otherStart < end;
export function equipmentAvailable(
  db: Database,
  id: string,
  start: number,
  end: number,
  now = Date.now(),
) {
  const equipment = db.equipment.find((e) => e.id === id);
  if (!equipment || equipment.status !== "available") return 0;
  const reservations = db.bookings.filter(
    (b) =>
      b.studioId === equipment.studioId &&
      occupies(b, now) &&
      overlaps(start, end, b.start, b.end),
  );
  const points = [
    start,
    ...reservations
      .filter((b) => b.start >= start && b.start < end)
      .map((b) => b.start),
  ];
  const peak = Math.max(
    0,
    ...points.map((point) =>
      reservations
        .filter((b) => b.start <= point && point < b.end)
        .reduce(
          (sum, b) =>
            sum +
            (b.snapshot.price.equipment.find((e) => e.id === id)?.quantity ??
              0),
          0,
        ),
    ),
  );
  return Math.max(0, equipment.quantity - peak);
}
export function checkAvailability(
  db: Database,
  request: BookingRequest,
  now = Date.now(),
): Result<ReturnType<typeof calculateBooking>> {
  const fail = (
    code: string,
    message: string,
  ): Result<ReturnType<typeof calculateBooking>> => ({
    ok: false,
    code,
    message,
  });
  const { start, end, roomId, rateId, participants } = request;
  const room = db.rooms.find((r) => r.id === roomId),
    studio = db.studios.find((s) => s.id === room?.studioId),
    rate = db.rates.find((r) => r.id === rateId && r.roomId === roomId);
  if (!room || !studio) return fail("not-found", "Không tìm thấy phòng.");
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    return fail("interval", "Giờ kết thúc phải sau giờ bắt đầu.");
  if (start < now)
    return fail("past", "Vui lòng chọn thời gian trong tương lai.");
  if (getEffectiveRoomStatus(db, room, start) !== "bookable")
    return fail("visibility", "Phòng hiện không nhận đơn mới.");
  if (
    !Number.isInteger(participants) ||
    participants < 1 ||
    participants > room.capacity
  )
    return fail("capacity", `Số người cần từ 1 đến ${room.capacity}.`);
  if (
    minuteOfDay(start) % studio.stepMinutes ||
    minuteOfDay(end) % studio.stepMinutes ||
    start % 60_000 ||
    end % 60_000
  )
    return fail(
      "increment",
      `Chọn thời gian theo bước ${studio.stepMinutes} phút.`,
    );
  if (
    !rate ||
    !rate.active ||
    !onlineUnit(rate.unit) ||
    rate.effectiveFrom > start ||
    (rate.effectiveTo !== null && end > rate.effectiveTo)
  )
    return fail("rate", "Bảng giá không áp dụng cho thời gian này.");
  if (rate.unit === "day" && !room.overnight)
    return fail("overnight", "Phòng không hỗ trợ thuê liên tục 24 giờ.");
  const crossesDay = localDate(start) !== localDate(end - 1);
  if (crossesDay && !room.overnight)
    return fail("hours", "Phòng không hỗ trợ thuê qua đêm.");
  const firstMidnight = vietnamInstant(localDate(start));
  for (let day = firstMidnight; day < end; day += 86_400_000) {
    if (!room.operatingDays.includes(vietnamWeekday(day)))
      return fail("hours", "Phòng đóng cửa vào ngày đã chọn.");
    if (
      !room.overnight &&
      (start < day + room.openMinute * 60_000 ||
        end > day + room.closeMinute * 60_000)
    )
      return fail("hours", "Thời gian nằm ngoài giờ hoạt động của phòng.");
  }
  if (
    db.bookings.some(
      (b) =>
        b.roomId === roomId &&
        occupies(b, now) &&
        overlaps(
          start,
          end + room.cleaningMinutes * 60_000,
          b.start,
          b.end + b.snapshot.cleaningMinutes * 60_000,
        ),
    )
  )
    return fail(
      "conflict",
      "Phòng đã được giữ trong thời gian này hoặc đang dọn phòng. Chọn thời gian khác.",
    );
  for (const selection of request.equipment) {
    const item = db.equipment.find((e) => e.id === selection.id);
    if (
      !item ||
      item.studioId !== studio.id ||
      !Number.isInteger(selection.quantity) ||
      selection.quantity < 0 ||
      selection.quantity > equipmentAvailable(db, selection.id, start, end, now)
    )
      return fail(
        "equipment",
        `${item?.name ?? "Thiết bị"} không đủ số lượng trong thời gian đã chọn.`,
      );
  }
  try {
    return {
      ok: true,
      value: calculateBooking({
        start,
        end,
        rate,
        studio,
        equipment: db.equipment,
        selections: request.equipment,
      }),
    };
  } catch (error) {
    return fail(
      "pricing",
      error instanceof Error ? error.message : "Không thể tính giá.",
    );
  }
}
