import { describe, it, expect } from "vitest";
import { calculateBooking, rentalUnits } from "@/domain/pricing";
import { money, localDate, vietnamInstant, minuteOfDay } from "@/lib/format";
import { fixture, NOW } from "../fixtures/domain";
describe("Vietnam-local formatting", () => {
  it("formats integer VND", () => {
    expect(money(250000)).toBe("250.000đ");
    expect(money(0)).toBe("0đ");
  });
  it("converts local selections without the host timezone", () => {
    expect(vietnamInstant("2026-10-09", "08:00")).toBe(NOW);
    expect(localDate(Date.parse("2026-10-08T18:00Z"))).toBe("2026-10-09");
    expect(minuteOfDay(NOW)).toBe(480);
  });
  it("rejects rolled-over dates and malformed times", () => {
    expect(vietnamInstant("2026-02-30", "09:00")).toBeNaN();
    expect(vietnamInstant("2026-10-09", "25:00")).toBeNaN();
  });
});
const scenarios = [
  {
    name: "one hourly unit",
    minutes: 60,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [],
    room: 250000,
    equipment: 0,
    total: 250000,
    deposit: 75000,
  },
  {
    name: "fractional 2.5 hours",
    minutes: 150,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [],
    room: 625000,
    equipment: 0,
    total: 625000,
    deposit: 187500,
  },
  {
    name: "fractional VND rounding",
    minutes: 90,
    unit: "hour",
    rate: 333333,
    depositPercent: 30,
    selections: [],
    room: 500000,
    equipment: 0,
    total: 500000,
    deposit: 150000,
  },
  {
    name: "two hourly lights",
    minutes: 120,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [{ id: "equipment-1", quantity: 2 }],
    room: 500000,
    equipment: 320000,
    total: 820000,
    deposit: 246000,
  },
  {
    name: "whole session and daily furniture",
    minutes: 240,
    unit: "session",
    rate: 900000,
    depositPercent: 30,
    selections: [{ id: "equipment-3", quantity: 1 }],
    room: 900000,
    equipment: 60000,
    total: 960000,
    deposit: 288000,
  },
  {
    name: "two sessions and hourly light",
    minutes: 480,
    unit: "session",
    rate: 900000,
    depositPercent: 30,
    selections: [{ id: "equipment-1", quantity: 1 }],
    room: 1800000,
    equipment: 640000,
    total: 2440000,
    deposit: 732000,
  },
  {
    name: "day and hourly equipment with 50 percent",
    minutes: 1440,
    unit: "day",
    rate: 2400000,
    depositPercent: 50,
    selections: [{ id: "equipment-1", quantity: 1 }],
    room: 2400000,
    equipment: 1920000,
    total: 4320000,
    deposit: 2160000,
  },
  {
    name: "two continuous days and two furniture items",
    minutes: 2880,
    unit: "day",
    rate: 2400000,
    depositPercent: 50,
    selections: [{ id: "equipment-3", quantity: 2 }],
    room: 4800000,
    equipment: 240000,
    total: 5040000,
    deposit: 2520000,
  },
  {
    name: "fifteen-minute studio increments",
    minutes: 75,
    unit: "hour",
    rate: 220000,
    depositPercent: 50,
    selections: [],
    room: 275000,
    equipment: 0,
    total: 275000,
    deposit: 137500,
  },
  {
    name: "quarter-hour minimum",
    minutes: 15,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [],
    room: 62500,
    equipment: 0,
    total: 62500,
    deposit: 18750,
  },
  {
    name: "session equipment rounds up whole units",
    minutes: 270,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [{ id: "equipment-2", quantity: 1 }],
    room: 1125000,
    equipment: 240000,
    total: 1365000,
    deposit: 409500,
  },
  {
    name: "daily equipment in a short hourly rental",
    minutes: 90,
    unit: "hour",
    rate: 250000,
    depositPercent: 30,
    selections: [{ id: "equipment-3", quantity: 1 }],
    room: 375000,
    equipment: 60000,
    total: 435000,
    deposit: 130500,
  },
  {
    name: "rounds deposit after total",
    minutes: 90,
    unit: "hour",
    rate: 100001,
    depositPercent: 50,
    selections: [],
    room: 150002,
    equipment: 0,
    total: 150002,
    deposit: 75001,
  },
] as const;
describe("manually verifiable price scenarios", () => {
  it.each(scenarios)("$name", (s) => {
    const db = fixture(),
      studio = { ...db.studios[0], depositPercent: s.depositPercent },
      rate = {
        ...db.rates[0],
        unit: s.unit,
        price: s.rate,
        minUnits: 0.25,
        maxUnits: 72,
      };
    const value = calculateBooking({
      start: NOW,
      end: NOW + s.minutes * 60000,
      rate,
      studio,
      equipment: db.equipment,
      selections: [...s.selections],
    });
    expect(value.roomAmount).toBe(s.room);
    expect(value.equipmentTotal).toBe(s.equipment);
    expect(value.total).toBe(s.total);
    expect(value.deposit).toBe(s.deposit);
    expect(value.remaining).toBe(s.total - s.deposit);
  });
  it("rejects fractional sessions and fractional days", () => {
    const db = fixture();
    expect(() =>
      calculateBooking({
        start: NOW,
        end: NOW + 250 * 60000,
        rate: { ...db.rates[0], unit: "session" },
        studio: db.studios[0],
        equipment: [],
        selections: [],
      }),
    ).toThrow("số buổi nguyên");
    expect(() =>
      calculateBooking({
        start: NOW,
        end: NOW + 1500 * 60000,
        rate: { ...db.rates[0], unit: "day" },
        studio: db.studios[0],
        equipment: [],
        selections: [],
      }),
    ).toThrow("24 giờ");
  });
  it("checks rental bounds and duplicate equipment", () => {
    const db = fixture();
    expect(() =>
      calculateBooking({
        start: NOW,
        end: NOW + 30 * 60000,
        rate: db.rates[0],
        studio: db.studios[0],
        equipment: [],
        selections: [],
      }),
    ).toThrow("giới hạn");
    expect(() =>
      calculateBooking({
        start: NOW,
        end: NOW + 120 * 60000,
        rate: db.rates[0],
        studio: db.studios[0],
        equipment: db.equipment,
        selections: [
          { id: "equipment-1", quantity: 1 },
          { id: "equipment-1", quantity: 1 },
        ],
      }),
    ).toThrow("trùng");
  });
  it("calculates equipment units independently", () => {
    expect(rentalUnits(270, "session", 240)).toBe(2);
    expect(rentalUnits(1500, "day", 240)).toBe(2);
    expect(rentalUnits(150, "hour", 240)).toBe(2.5);
  });
  it("rejects negative and fractional equipment quantities", () => {
    const db = fixture();
    for (const quantity of [-1, 0.5])
      expect(() =>
        calculateBooking({
          start: NOW,
          end: NOW + 120 * 60000,
          rate: db.rates[0],
          studio: db.studios[0],
          equipment: db.equipment,
          selections: [{ id: "equipment-1", quantity }],
        }),
      ).toThrow("Số lượng");
  });
});
