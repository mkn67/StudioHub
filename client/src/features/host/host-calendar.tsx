"use client";
import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useResource } from "@/services/api/use-resource";
import { sqlVietnamTime, formatApiTime } from "@/services/api/contracts";
import { Modal } from "@/components/ui";
import { calendarSegments, shiftDate, hostDate, type BusySegment } from "./host-presentation";
import { HostPanel, HostResourceState } from "./host-ui";
import { useHostContext } from "./host-context";
import { record, records, text, type RecordData } from "@/services/api/management";
import { HostStatusBadge } from "./host-ui";

export function HostCalendar({ roomId }: { roomId: string }) {
  const { studioId } = useHostContext();
  const [from, setFrom] = useState(() => sqlVietnamTime(new Date()).slice(0, 10));
  const [days, setDays] = useState(7), [slot, setSlot] = useState<BusySegment | null>(null);
  const to = shiftDate(from, days - 1);
  // Calendar's `to` date is inclusive (unlike the statistics API).
  const ownerCalendar = useResource(`/api/host/calendar?studio_id=${studioId}&from=${from}&to=${to}`, decodeCalendar);
  const bookings = ownerCalendar.data?.bookings.filter(booking => String(booking.room_id) === roomId);
  const calendar = { ...ownerCalendar, data: ownerCalendar.data ? { busy_slots: bookings ?? [] } : null };
  const segments = calendarSegments(calendar.data?.busy_slots ?? [], from, days);
  const dates = Array.from({ length: days }, (_, index) => shiftDate(from, index));
  return <HostPanel title="Lịch bận của phòng" description="Giờ Việt Nam · khoảng bận đã bao gồm thời gian dọn phòng.">
    <div className="host-calendar-toolbar"><div className="host-actions"><button className="host-icon-button" aria-label="Kỳ trước" onClick={() => setFrom(shiftDate(from, -days))}><ChevronLeft size={20}/></button><button className="btn secondary" onClick={() => setFrom(sqlVietnamTime(new Date()).slice(0, 10))}>Hôm nay</button><button className="host-icon-button" aria-label="Kỳ sau" onClick={() => setFrom(shiftDate(from, days))}><ChevronRight size={20}/></button></div><label>Ngày bắt đầu<input aria-label="Ngày bắt đầu lịch" type="date" value={from} onChange={e => { if (e.target.value) setFrom(e.target.value); }}/></label><div className="host-segmented" role="group" aria-label="Chế độ xem lịch">{[1, 7].map(value => <button key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{value === 1 ? "Ngày" : "Tuần"}</button>)}</div></div>
    <HostResourceState resource={calendar}/>
    {ownerCalendar.data && <details className="host-interval-list"><summary>Đơn đang chiếm chỗ của toàn Studio ({ownerCalendar.data.bookings.length})</summary>{ownerCalendar.data.bookings.map(booking => <p key={text(booking.booking_id)}>{text(booking.booking_code)} · {text(booking.room_name)} · {formatApiTime(text(booking.start_time))} – {formatApiTime(text(booking.end_time))} · <HostStatusBadge status={text(booking.status)}/></p>)}</details>}
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
      {!calendar.data.busy_slots.length && <p className="host-calendar-empty">Chưa có khoảng bận được ghi nhận trong kỳ này. Khả năng đặt còn phụ thuộc trạng thái phòng và kiểm tra khả dụng khi đặt.</p>}
      {!!calendar.data.busy_slots.length && <details className="host-interval-list"><summary>Xem các mốc thời gian chính xác</summary><ul>{calendar.data.busy_slots.map((busy, index) => <li key={index}>{formatApiTime(busy.busy_start)} – {formatApiTime(busy.busy_end)}</li>)}</ul></details>}
    </>}
    {slot && <Modal title="Chi tiết khoảng bận" onClose={() => setSlot(null)} className="host-dialog"><div className="host-panel-body"><p><strong>Bắt đầu:</strong> {formatApiTime(slot.busy_start)}</p><p><strong>Kết thúc:</strong> {formatApiTime(slot.busy_end)}</p><p>Khoảng thời gian này đã bao gồm thời gian dọn phòng.</p><button className="btn secondary" onClick={() => setSlot(null)}>Đóng chi tiết</button></div></Modal>}
  </HostPanel>;
}
function decodeCalendar(value: unknown) {
  const data = record(value);
  const bookings = records(data.bookings).map((item): RecordData & { busy_start: string; busy_end: string } => {
    if (typeof item.busy_start !== "string" || typeof item.busy_end !== "string") throw new Error("Lịch API thiếu mốc thời gian bận.");
    return { ...item, busy_start: item.busy_start, busy_end: item.busy_end };
  });
  return { bookings };
}
