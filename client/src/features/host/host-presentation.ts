import { vnTimestamp } from "@/services/api/contracts";

export function shiftDate(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function reportingPreset(preset: "7" | "30" | "month", today: string) {
  // Existing statistics API uses [from 00:00, to 00:00), Vietnam time.
  if (preset === "month") {
    const next = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { from: `${today.slice(0, 7)}-01`, to: next.toISOString().slice(0, 10) };
  }
  return { from: shiftDate(today, 1 - Number(preset)), to: shiftDate(today, 1) };
}

export type BusySegment = {
  day: number; start: number; end: number; busy_start: string; busy_end: string;
  lane: number; lanes: number;
};
export function calendarSegments(slots: { busy_start: string; busy_end: string }[], from: string, days: number) {
  const segments: BusySegment[] = [];
  for (let day = 0; day < days; day++) {
    const midnight = vnTimestamp(`${shiftDate(from, day)} 00:00:00`).getTime();
    const inDay = slots.flatMap(slot => {
      const start = Math.max(vnTimestamp(slot.busy_start).getTime(), midnight);
      const end = Math.min(vnTimestamp(slot.busy_end).getTime(), midnight + 86400000);
      return Number.isFinite(start) && Number.isFinite(end) && end > start
        ? [{ ...slot, day, start: (start - midnight) / 60000, end: (end - midnight) / 60000, lane: 0, lanes: 1 }] : [];
    }).sort((a, b) => a.start - b.start);
    const laneEnds: number[] = [];
    for (const slot of inDay) {
      let lane = laneEnds.findIndex(end => end <= slot.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = slot.end;
      slot.lane = lane;
    }
    for (const slot of inDay) slot.lanes = laneEnds.length;
    segments.push(...inDay);
  }
  return segments;
}

export const hostMoney = (value: number) => `${Number(value).toLocaleString("vi-VN")}đ`;
export const hostDate = (value: string) => vnTimestamp(`${value} 00:00:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
