"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { balance } from "@/domain/engine";
import { dateTime, localDate, money, statusLabel, type Booking, type State, type Room } from "@/domain/models";
import { confirmationDeadline, operationalAgenda, reportBounds, roomPopularity, type ReportPeriod } from "@/domain/host-operations";
import { DashboardPanel } from "./DashboardUi";

export function HostDeadline({ booking, now }: { booking: Booking; now: number }) {
  const deadline = confirmationDeadline(booking, now);
  if (!deadline) return null;
  return <div className={`ops-deadline host-deadline-${deadline.state}`} data-deadline-state={deadline.state}>
    <small>{deadline.label}</small>{deadline.at !== null && <strong className="mono">{dateTime(deadline.at)}</strong>}
  </div>;
}

export function UpcomingAgenda({ bookings, now, rooms }: { bookings: Booking[]; now: number; rooms: Room[] }) {
  const tasks = operationalAgenda(bookings, now);
  return <DashboardPanel title="Việc sắp diễn ra" eyebrow="24 giờ tới & việc còn cần xử lý" action={<Link className="text-link" href="/host/bookings" aria-label="Xem toàn bộ công việc">Xem đơn <ArrowRight size={15} /></Link>} className="host-agenda">
    {tasks.length ? <ol>{tasks.map(task => <li key={task.key}>
      <Link href={`/host/bookings/${task.booking.id}`}>
        <time dateTime={new Date(task.at).toISOString()}>{dateTime(task.at)}{task.until && ` – ${dateTime(task.until)}`}</time>
        <strong>{task.label} · {rooms.find(room => room.id === task.booking.roomId)?.code ?? task.booking.roomId}</strong>
        <span className="host-agenda-meta"><span className="mono">{task.booking.id}</span><span className="status" data-booking-status={task.booking.status}>{statusLabel[task.booking.status]}</span></span>
        {task.key.endsWith(":collection") && <span>{money(balance(task.booking))}</span>}
        {task.urgent && <span className="host-urgent-label">Cần kiểm tra</span>}
      </Link>
    </li>)}</ol> : <p className="dashboard-empty">Chưa có công việc cần xử lý trong khoảng thời gian này.</p>}
  </DashboardPanel>;
}

export function RoomPopularity({ state, rooms }: { state: State; rooms: Room[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("week"), [date, setDate] = useState(localDate(state.now));
  const bounds = reportBounds(date, period), rows = roomPopularity(state, rooms, date, period);
  const leading = rows.filter(row => row.count > 0 && row.count === rows[0]?.count);
  function shift(direction: number) {
    if (period === "week") setDate(localDate(bounds.start + direction * 7 * 86400000));
    else { const [year, month] = date.split("-").map(Number); setDate(new Date(Date.UTC(year, month - 1 + direction, 1)).toISOString().slice(0, 10)); }
  }
  return <DashboardPanel title="Phòng được đặt nhiều nhất" eyebrow="Xếp hạng từng phòng thực tế" className="host-popularity">
    <div className="host-report-filters">
      <div className="host-period-control" role="group" aria-label="Kỳ báo cáo"><button type="button" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Theo tuần</button><button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Theo tháng</button></div>
      <div className="actions"><button type="button" className="icon-button" aria-label="Kỳ báo cáo trước" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
        <label><span className="sr-only">Kỳ thống kê phòng</span><input type={period === "month" ? "month" : "date"} value={period === "month" ? date.slice(0, 7) : date} onChange={event => { if (event.target.value) setDate(period === "month" ? event.target.value + "-01" : event.target.value); }} /></label>
        <button type="button" className="icon-button" aria-label="Kỳ báo cáo tiếp" onClick={() => shift(1)}><ChevronRight size={18} /></button></div>
    </div>
    <p className="muted">{localDate(bounds.start).split("-").reverse().join("/")} – {localDate(bounds.end - 1).split("-").reverse().join("/")} · Theo ngày bắt đầu thuê, giờ Việt Nam.</p>
    <p className="host-metric-note">Chỉ tính đơn đã xác nhận, đang sử dụng hoặc đã trả phòng. Không tính chờ cọc, chờ duyệt, hủy, hết hạn và không đến. Giờ thuê không gồm 30 phút chuẩn bị. Giá trị đơn là tổng giá đặt thuê, chưa phải doanh thu thực thu.</p>
    {leading.length ? <>
      <p className="host-popularity-insight">{leading.length === 1 ? `Phòng ${leading[0].room.code} có nhiều lượt đặt nhất trong kỳ: ${leading[0].count} lượt.` : `${leading.length} phòng cùng có ${leading[0].count} lượt đặt, xếp tiếp theo tổng giờ thuê và mã định danh.`}</p>
      <div className="table-scroll"><table><thead><tr><th scope="col">Hạng</th><th scope="col">Phòng thực tế</th><th scope="col">Loại phòng</th><th scope="col">Lượt đặt</th><th scope="col">Giờ thuê</th><th scope="col">Giá trị đơn</th><th scope="col">Lượt đặt tương đối</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.room.id} data-popularity-room={row.room.id}><td>{index + 1}</td><td><strong>{row.room.code}</strong><small>{row.room.name}</small></td><td>{row.type?.name}</td><td className="mono">{row.count}</td><td className="mono">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(row.hours)}</td><td className="mono">{money(row.bookingValue)}</td><td><div className="host-popularity-bar" role="img" aria-label={`${row.count} lượt, so với mức cao nhất ${rows[0].count} lượt`}><span style={{ width: `${row.relative * 100}%` }} /></div></td></tr>)}</tbody>
      </table></div>
    </> : <p className="dashboard-empty">Chưa có lượt đặt hợp lệ trong kỳ đã chọn.</p>}
  </DashboardPanel>;
}
