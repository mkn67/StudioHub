"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeading } from "@/components/ui";
import { activeStatuses, BUFFER, HOUR, MIN } from "@/domain/engine";
import { atDate, dateTime, localDate, statusLabel, type State, type Room, type RoomType, type Booking } from "@/domain/models";
import { CALENDAR_PIXELS_PER_MINUTE, calendarInitialMinute, calendarPeriods, calendarY, clipCalendarInterval, periodBounds, weekStart, type CalendarPeriod } from "@/domain/host-operations";
import { calendarEventLanes } from "../calendar-event-layout";

const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function HostCalendar({ state, rooms, types, bookings }: { state: State; rooms: Room[]; types: RoomType[]; bookings: Booking[] }) {
  const [view, setView] = useState("week"), [date, setDate] = useState(localDate(state.now)), [room, setRoom] = useState(rooms[0]?.id ?? ""),
    [status, setStatus] = useState("all"), [typeId, setTypeId] = useState(""), [period, setPeriod] = useState<CalendarPeriod>("full");
  const day = atDate(date || localDate(state.now), 0), range = calendarPeriods[period];
  const viewport = useRef<HTMLDivElement>(null);
  const scopedRooms = rooms.filter(item => !typeId || item.typeId === typeId);
  const columns = !scopedRooms.length ? [] : view === "week" ? Array.from({ length: 7 }, (_, index) => {
    const start = weekStart(day) + index * 24 * HOUR;
    return { key: String(index), roomId: room, date: localDate(start), title: new Date(start).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "short", day: "2-digit", month: "2-digit" }) };
  }) : scopedRooms.map(item => ({ key: item.id, roomId: item.id, date: localDate(day), title: `${item.code} · ${item.name}` }));
  const ticks = Array.from({ length: (range.end - range.start) / 60 + 1 }, (_, index) => range.start + index * 60);
  const halfHours = Array.from({ length: (range.end - range.start) / 60 }, (_, index) => range.start + index * 60 + 30);
  const height = (range.end - range.start) * CALENDAR_PIXELS_PER_MINUTE;
  const focusMinute = calendarInitialMinute(state, columns, period, status);
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = calendarY(day + focusMinute * MIN, day + range.start * MIN);
  }, [day, focusMinute, period, range.start, room, status, typeId, view]);
  return <section className="host-calendar">
    <PageHeading title="Lịch đặt phòng" description="Giờ Việt Nam · vùng gạch là 30 phút chuẩn bị, không tính vào giờ thuê. Cả ngày bao gồm 00:00–05:00." />
    <div className="toolbar host-calendar-toolbar">
      <div className="actions">
        <button className="icon-button" aria-label="Kỳ trước" onClick={() => setDate(localDate(day - (view === "week" ? 7 : 1) * 24 * HOUR))}><ChevronLeft size={18} /></button>
        <label><span className="sr-only">Ngày xem lịch</span><input type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
        <button className="icon-button" aria-label="Kỳ tiếp" onClick={() => setDate(localDate(day + (view === "week" ? 7 : 1) * 24 * HOUR))}><ChevronRight size={18} /></button>
        <label><span className="sr-only">Chế độ lịch</span><select value={view} onChange={event => setView(event.target.value)}><option value="week">Tuần</option><option value="day">Ngày</option></select></label>
        {view === "week" && <label><span className="sr-only">Phòng</span><select aria-label="Phòng" value={room} onChange={event => setRoom(event.target.value)}>{rooms.filter(item => !typeId || item.typeId === typeId).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>}
        {period === "full" && <button type="button" className="text-button host-midnight-action" onClick={() => viewport.current?.scrollTo({ top: 0, behavior: "auto" })}>Về 00:00</button>}
      </div>
      <div className="actions host-calendar-secondary">
        <div className="host-period-control" role="group" aria-label="Khoảng giờ hiển thị">{Object.entries(calendarPeriods).map(([key, item]) => <button type="button" key={key} aria-pressed={period === key} onClick={() => setPeriod(key as CalendarPeriod)}>{item.label}</button>)}</div>
        <label><span className="sr-only">Loại phòng</span><select value={typeId} onChange={event => { setTypeId(event.target.value); setRoom(rooms.find(item => !event.target.value || item.typeId === event.target.value)?.id ?? ""); }}><option value="">Mọi loại phòng</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label><span className="sr-only">Trạng thái đơn</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Mọi trạng thái giữ chỗ</option>{activeStatuses.map(item => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></label>
      </div>
    </div>
    {columns.length > 0 && <div ref={viewport} className="host-calendar-scroll" tabIndex={0} role="region" aria-label="Lưới lịch đặt phòng, cuộn để xem thêm giờ và ngày">
      <div className="host-calendar-grid" style={{ gridTemplateColumns: `64px repeat(${Math.max(1, columns.length)}, minmax(${view === "week" ? 140 : 220}px, 1fr))`, "--host-track-height": `${height}px` } as CSSProperties}>
        <div className="host-calendar-head host-axis-head">Giờ</div>{columns.map(column => <div className="host-calendar-head" key={`head:${column.key}`}>{column.title}</div>)}
        <div className="host-time-body host-time-axis"><div className="host-time-track">{ticks.map(minutes => <span className="host-time-tick" data-minute={minutes} key={minutes} style={{ top: calendarY(day + minutes * MIN, day + range.start * MIN) }}><span>{minutes === 1440 ? "24:00" : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`}</span></span>)}</div></div>
        {columns.map(column => {
          const bounds = periodBounds(column.date, period);
          const visibleBookings = bookings.filter(booking => booking.roomId === column.roomId && activeStatuses.includes(booking.status) && (status === "all" || booking.status === status));
          const lanes = calendarEventLanes(visibleBookings.filter(booking => booking.start < bounds.end && booking.end > bounds.start));
          return <div className="host-time-body" data-calendar-room={column.roomId} data-calendar-date={column.date} key={column.key}><div className="host-time-track">
            {ticks.map(minutes => <div className="host-hour-boundary" data-minute={minutes} key={minutes} style={{ top: calendarY(atDate(column.date, 0) + minutes * MIN, bounds.start) }} />)}
            {halfHours.map(minutes => <div className="host-half-hour-boundary" aria-hidden="true" key={minutes} style={{ top: calendarY(atDate(column.date, 0) + minutes * MIN, bounds.start) }} />)}
            {visibleBookings.map(booking => {
              const box = clipCalendarInterval(booking.start, booking.end, bounds.start, bounds.end);
              const buffer = clipCalendarInterval(booking.end, booking.end + BUFFER, bounds.start, bounds.end);
              const roomCode = rooms.find(item => item.id === booking.roomId)?.code ?? booking.roomId;
              const label = `${roomCode} · ${statusLabel[booking.status]} · ${dateTime(booking.start)} — ${dateTime(booking.end)}`;
              const density = !box || box.height >= 72 ? "full" : box.height >= 48 ? "medium" : box.height >= 24 ? "compact" : box.height >= 6 ? "micro" : "sliver";
              const lane = lanes.get(booking.id) ?? { lane: 0, lanes: 1 };
              const laneStyle = { left: `calc(${lane.lane / lane.lanes * 100}% + 2px)`, right: `calc(${(lane.lanes - lane.lane - 1) / lane.lanes * 100}% + 2px)` };
              const interval = `${time.format(booking.start)}–${time.format(booking.end)}`;
              return <div key={booking.id}>
                {box && <Link className={`host-calendar-event ${booking.status}`} data-density={density} data-booking-id={booking.id} href={`/host/bookings/${booking.id}`} title={label} aria-label={label} style={{ ...laneStyle, top: box.top, height: box.height }} onKeyDown={event => {
                  if (event.key === " ") { event.preventDefault(); if (!event.repeat) event.currentTarget.click(); }
                }}>
                  <span className="host-event-face">
                    {box.height >= 18 && <strong className="host-event-code">{box.clippedStart ? "↥ " : ""}{roomCode}{box.clippedEnd ? " ↧" : ""}</strong>}
                    {(density === "full" || density === "medium") && <span className="host-event-time">{interval}</span>}
                    {density === "full" && <span className="host-event-status">{statusLabel[booking.status]}</span>}
                  </span>
                </Link>}
                {buffer && <div className="host-calendar-buffer" data-buffer-for={booking.id} role="img" title={`Chuẩn bị phòng ${roomCode} · ${dateTime(booking.end)} — ${dateTime(booking.end + BUFFER)}`} aria-label={`Chuẩn bị phòng ${roomCode} · ${dateTime(booking.end)} — ${dateTime(booking.end + BUFFER)}`} style={{ ...laneStyle, top: buffer.top, height: buffer.height }} />}
              </div>;
            })}
          </div></div>;
        })}
      </div>
    </div>}
    {!columns.length && <p className="dashboard-empty">Chưa có phòng thực tế trong phạm vi đã chọn.</p>}
  </section>;
}
