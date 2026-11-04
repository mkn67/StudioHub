"use client";
import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useResource } from "@/services/api/use-resource";
import { type CalendarData, sqlVietnamTime, formatApiTime } from "@/services/api/contracts";
import { Modal } from "@/components/ui";
import { calendarSegments, shiftDate, hostDate, type BusySegment } from "./host-presentation";
import { HostPanel, HostResourceState } from "./host-ui";

export function HostCalendar({ roomId }: { roomId: string }) {
  const [from, setFrom] = useState(() => sqlVietnamTime(new Date()).slice(0, 10));
  const [days, setDays] = useState(7), [slot, setSlot] = useState<BusySegment | null>(null);
  const to = shiftDate(from, days - 1);
  // Calendar's `to` date is inclusive (unlike the statistics API).
  const calendar = useResource<CalendarData>(`/api/rooms/${roomId}/calendar?from=${from}&to=${to}`);
  const segments = calendarSegments(calendar.data?.busy_slots ?? [], from, days);
  const dates = Array.from({ length: days }, (_, index) => shiftDate(from, index));
  return <HostPanel title="Lịch bận của phòng" description="Giờ Việt Nam · khoảng bận đã bao gồm thời gian dọn phòng.">
    <div className="host-calendar-toolbar"><div className="host-actions"><button className="host-icon-button" aria-label="Kỳ trước" onClick={() => setFrom(shiftDate(from, -days))}><ChevronLeft size={20}/></button><button className="btn secondary" onClick={() => setFrom(sqlVietnamTime(new Date()).slice(0, 10))}>Hôm nay</button><button className="host-icon-button" aria-label="Kỳ sau" onClick={() => setFrom(shiftDate(from, days))}><ChevronRight size={20}/></button></div><label>Ngày bắt đầu<input aria-label="Ngày bắt đầu lịch" type="date" value={from} onChange={e => { if (e.target.value) setFrom(e.target.value); }}/></label><div className="host-segmented" role="group" aria-label="Chế độ xem lịch">{[1, 7].map(value => <button key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{value === 1 ? "Ngày" : "Tuần"}</button>)}</div></div>
    <HostResourceState resource={calendar}/>
    {calendar.data && <>
      <div className="host-calendar-caption"><span><i/>Khoảng bận</span><span>{hostDate(from)} – {hostDate(to)} · {calendar.data.busy_slots.length} khoảng bận</span></div>
      <div className="host-calendar-scroll" tabIndex={0} aria-label="Thời khóa biểu phòng, có thể cuộn theo chiều ngang và dọc"><div className="host-timetable" style={{ "--calendar-days": days } as CSSProperties}>
        <div className="host-time-header"><CalendarDays size={19}/></div>{dates.map(date => <div className="host-day-header" key={date}><strong>{hostDate(date)}</strong><span>{new Date(`${date}T12:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short" })}</span></div>)}
        <div className="host-time-axis">{Array.from({ length: 24 }, (_, hour) => <div key={hour}>{String(hour).padStart(2, "0")}:00</div>)}</div>
        {dates.map((date, day) => <div className="host-calendar-day" key={date} aria-label={`Lịch ngày ${hostDate(date)}`}>
          {segments.filter(segment => segment.day === day).map((segment, index) => <button key={`${segment.busy_start}:${index}`} className="host-busy-block"
            aria-label={`Khoảng bận từ ${formatApiTime(segment.busy_start)} đến ${formatApiTime(segment.busy_end)}`}
            title={`${formatApiTime(segment.busy_start)} – ${formatApiTime(segment.busy_end)}`}
            style={{ top: segment.start / 60 * 48, height: (segment.end - segment.start) / 60 * 48, left: `calc(${segment.lane / segment.lanes * 100}% + 3px)`, width: `calc(${100 / segment.lanes}% - 6px)` }} onClick={() => setSlot(segment)}><strong>Khoảng bận</strong><span>{String(Math.floor(segment.start / 60)).padStart(2, "0")}:{String(Math.floor(segment.start % 60)).padStart(2, "0")}</span></button>)}
        </div>)}
      </div></div>
      {!calendar.data.busy_slots.length && <p className="host-calendar-empty">Chưa có khoảng bận trong kỳ này.</p>}
      {!!calendar.data.busy_slots.length && <details className="host-interval-list"><summary>Xem các mốc thời gian chính xác</summary><ul>{calendar.data.busy_slots.map((busy, index) => <li key={index}>{formatApiTime(busy.busy_start)} – {formatApiTime(busy.busy_end)}</li>)}</ul></details>}
    </>}
    {slot && <Modal title="Chi tiết khoảng bận" onClose={() => setSlot(null)} className="host-dialog"><div className="host-panel-body"><p><strong>Bắt đầu:</strong> {formatApiTime(slot.busy_start)}</p><p><strong>Kết thúc:</strong> {formatApiTime(slot.busy_end)}</p><p>Khoảng thời gian này đã bao gồm thời gian dọn phòng.</p><button className="btn secondary" onClick={() => setSlot(null)}>Đóng chi tiết</button></div></Modal>}
  </HostPanel>;
}
