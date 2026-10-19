import type {
  Equipment,
  Price,
  Rate,
  RentalUnit,
  Selection,
  Studio,
} from "./schema";
export function rentalUnits(
  minutes: number,
  unit: RentalUnit,
  sessionMinutes: number,
) {
  if (!Number.isInteger(minutes) || minutes <= 0)
    throw new Error("Thời lượng thuê không hợp lệ.");
  if (unit === "hour") return minutes / 60;
  const divisor = {
    session: sessionMinutes,
    "half-day": 720,
    day: 1440,
    week: 10080,
    month: 43200,
  }[unit];
  return Math.ceil(minutes / divisor);
}
export function calculateBooking(input: {
  start: number;
  end: number;
  rate: Rate;
  studio: Studio;
  equipment: Equipment[];
  selections: Selection[];
}): Price {
  const { start, end, rate, studio, selections, equipment } = input;
  const minutes = (end - start) / 60_000;
  const units = rentalUnits(minutes, rate.unit, studio.sessionMinutes);
  if (rate.unit === "session" && minutes % studio.sessionMinutes !== 0)
    throw new Error("Thời gian thuê phải là số buổi nguyên.");
  if (rate.unit === "day" && minutes % 1440 !== 0)
    throw new Error("Thuê ngày cần đủ mỗi chu kỳ 24 giờ.");
  if (units < rate.minUnits || units > rate.maxUnits)
    throw new Error("Thời lượng nằm ngoài giới hạn bảng giá.");
  if (new Set(selections.map((s) => s.id)).size !== selections.length)
    throw new Error("Thiết bị bị chọn trùng.");
  if (
    selections.some(
      (selection) =>
        !Number.isInteger(selection.quantity) || selection.quantity < 0,
    )
  )
    throw new Error("Số lượng thiết bị không hợp lệ.");
  const lines = selections
    .filter((s) => s.quantity > 0)
    .map((selection) => {
      const item = equipment.find((e) => e.id === selection.id);
      if (
        !item ||
        item.studioId !== studio.id ||
        !Number.isInteger(selection.quantity)
      )
        throw new Error("Thiết bị không hợp lệ.");
      const equipmentUnits = rentalUnits(
        minutes,
        item.unit,
        studio.sessionMinutes,
      );
      return {
        id: item.id,
        name: item.name,
        quantity: selection.quantity,
        unit: item.unit,
        unitPrice: item.price,
        units: equipmentUnits,
        amount: Math.round(item.price * equipmentUnits * selection.quantity),
      };
    });
  const roomAmount = Math.round(rate.price * units);
  const equipmentTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const total = roomAmount + equipmentTotal;
  const deposit = Math.round((total * studio.depositPercent) / 100);
  return {
    minutes,
    units,
    rateId: rate.id,
    rateName: rate.name,
    unit: rate.unit,
    unitPrice: rate.price,
    roomAmount,
    equipment: lines,
    equipmentTotal,
    total,
    depositPercent: studio.depositPercent,
    deposit,
    remaining: total - deposit,
  };
}
export const onlineUnit = (unit: RentalUnit) =>
  ["hour", "session", "day"].includes(unit);
export function startingRate(rates: Rate[], roomId: string, at = Date.now()) {
  const active = rates.filter(
    (r) =>
      r.roomId === roomId &&
      r.active &&
      onlineUnit(r.unit) &&
      r.effectiveFrom <= at &&
      (r.effectiveTo === null || at < r.effectiveTo),
  );
  return active.find((r) => r.unit === "hour") ?? active[0];
}
