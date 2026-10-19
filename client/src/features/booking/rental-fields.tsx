"use client";
import type { BookingRequest, Database, Room, Studio } from "@/domain/schema";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import {
  addDays,
  localDate,
  time,
  vietnamInstant,
  money,
  unitLabels,
} from "@/lib/format";
import { startingRate, onlineUnit } from "@/domain/pricing";
export function defaultRequest(
  db: Database,
  room: Room,
  now = Date.now(),
): BookingRequest {
  const rate = startingRate(db.rates, room.id, now);
  const day = addDays(localDate(now), 1);
  return {
    roomId: room.id,
    rateId: rate?.id ?? "",
    start: vietnamInstant(day, "09:00"),
    end: vietnamInstant(day, "11:00"),
    participants: 1,
    equipment: [],
  };
}
export function RentalFields({
  request,
  onChange,
  room,
  studio,
  db,
  prefix = "rental",
}: {
  request: BookingRequest;
  onChange: (value: BookingRequest) => void;
  room: Room;
  studio: Studio;
  db: Database;
  prefix?: string;
}) {
  const change = (values: Partial<BookingRequest>) =>
    onChange({ ...request, ...values });
  return (
    <div className="rental-fields">
      <div className="form-grid">
        <Field label="Ngày bắt đầu" id={`${prefix}-start-date`}>
          <Input
            type="date"
            min={localDate()}
            value={localDate(request.start)}
            onChange={(e) => {
              const start = vietnamInstant(e.target.value, time(request.start));
              if (Number.isFinite(start)) {
                const delta = start - request.start;
                change({ start, end: request.end + delta });
              }
            }}
          />
        </Field>
        <Field label="Ngày kết thúc" id={`${prefix}-end-date`}>
          <Input
            type="date"
            min={localDate(request.start)}
            value={localDate(request.end)}
            onChange={(e) => {
              const end = vietnamInstant(e.target.value, time(request.end));
              if (Number.isFinite(end)) change({ end });
            }}
          />
        </Field>
        <Field label="Giờ bắt đầu" id={`${prefix}-start-time`}>
          <Input
            type="time"
            step={studio.stepMinutes * 60}
            value={time(request.start)}
            onChange={(e) => {
              const start = vietnamInstant(
                localDate(request.start),
                e.target.value,
              );
              if (Number.isFinite(start)) change({ start });
            }}
          />
        </Field>
        <Field label="Giờ kết thúc" id={`${prefix}-end-time`}>
          <Input
            type="time"
            step={studio.stepMinutes * 60}
            value={time(request.end)}
            onChange={(e) => {
              const end = vietnamInstant(
                localDate(request.end),
                e.target.value,
              );
              if (Number.isFinite(end)) change({ end });
            }}
          />
        </Field>
      </div>
      <Field
        label="Bảng giá"
        id={`${prefix}-rate`}
        hint={`Mỗi buổi: ${studio.sessionMinutes / 60} giờ · Bước thời gian: ${studio.stepMinutes} phút`}
      >
        <Select
          value={request.rateId}
          onChange={(e) => change({ rateId: e.target.value })}
        >
          {db.rates
            .filter(
              (r) => r.roomId === room.id && r.active && onlineUnit(r.unit),
            )
            .map((r) => {
              const reason =
                r.unit === "day" && !room.overnight
                  ? "Không hỗ trợ qua đêm"
                  : r.effectiveFrom > request.start
                    ? "Chưa đến ngày áp dụng"
                    : r.effectiveTo !== null && request.end > r.effectiveTo
                      ? "Ngoài kỳ áp dụng"
                      : "";
              return (
                <option key={r.id} value={r.id} disabled={!!reason}>
                  {r.name} · {money(r.price)}/{unitLabels[r.unit]}
                  {reason && ` · ${reason}`}
                </option>
              );
            })}
        </Select>
      </Field>
      <Field
        label="Số người tham gia"
        id={`${prefix}-participants`}
        hint={`Tối đa ${room.capacity} người`}
      >
        <Input
          type="number"
          min={1}
          max={room.capacity}
          value={request.participants}
          onChange={(e) => change({ participants: Number(e.target.value) })}
        />
      </Field>
    </div>
  );
}
