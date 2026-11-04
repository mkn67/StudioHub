"use client";
import { useState } from "react";
import Link from "next/link";
import { Clock3, CheckCircle2, DoorOpen, Building2, CalendarDays, ArrowUpRight, ClipboardList, RefreshCw, Banknote, BarChart3 } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { useResource } from "@/services/api/use-resource";
import { type BookingPage, bookingLabels, formatApiTime, sqlVietnamTime, vnTimestamp } from "@/services/api/contracts";
import { useHostContext } from "./host-context";
import type { HostStats, HostBooking } from "./host-types";
import { hostMoney, reportingPreset } from "./host-presentation";
import { HostPageHeader, HostPanel, HostKpi, HostStatusBadge, HostEmptyState, HostResourceState, HostSkeleton, HostPagination } from "./host-ui";

type HostBookingPage = Omit<BookingPage, "items"> & { items: HostBooking[] };
function BookingPreview({ bookings }: { bookings: HostBooking[] }) {
  return <div className="host-booking-previews">{bookings.map(booking => <Link key={booking.booking_id} href={`/host/bookings/${booking.booking_id}`}><span className="host-event-icon"><CalendarDays size={19}/></span><div><strong>{booking.room_name}</strong><small>{booking.booking_code} · {formatApiTime(booking.start_time)}</small></div><HostStatusBadge status={booking.status}/><ArrowUpRight size={17}/></Link>)}</div>;
}
export function HostOverview() {
  const { user } = useApiSession(), { studios } = useHostContext();
  const pending = useResource<HostBookingPage>("/api/bookings?status=pending&page=1&limit=5");
  const confirmed = useResource<HostBookingPage>("/api/bookings?status=confirmed&page=1&limit=1");
  const checkedIn = useResource<HostBookingPage>("/api/bookings?status=checked_in&page=1&limit=1");
  const latest = useResource<HostBookingPage>("/api/bookings?page=1&limit=50&status=");
  const today = sqlVietnamTime(new Date()).slice(0, 10);
  const todaysBookings = latest.data?.items.filter(booking => sqlVietnamTime(vnTimestamp(booking.start_time)).slice(0, 10) === today && ["confirmed", "checked_in"].includes(booking.status)).sort((a, b) => a.start_time.localeCompare(b.start_time)) ?? [];
  const metrics = [
    { resource: pending, label: "Đơn đang chờ", icon: <Clock3 size={23}/>, tone: "yellow", detail: "Chờ xác nhận hoặc thanh toán", value: pending.data?.total_items },
    { resource: confirmed, label: "Đơn đã xác nhận", icon: <CheckCircle2 size={23}/>, tone: "cyan", detail: "Sẵn sàng cho ca thuê", value: confirmed.data?.total_items },
    { resource: checkedIn, label: "Đang sử dụng", icon: <DoorOpen size={23}/>, tone: "mint", detail: "Đơn đã nhận phòng", value: checkedIn.data?.total_items },
    { resource: studios, label: "Studio của bạn", icon: <Building2 size={23}/>, tone: "blue", detail: "Các cơ sở đang quản lý", value: studios.data?.length },
  ];
  return <>
    <HostPageHeader title={`Chào ${user?.full_name.split(" ").slice(-2).join(" ") ?? "bạn"}, một ngày mới!`} description={new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "long", year: "numeric" })} action={<Link className="btn secondary" href="/host/calendar"><CalendarDays size={18}/>Xem lịch phòng</Link>}/>
    <div className="host-kpi-grid">{metrics.map(metric => <div key={metric.label}>{metric.resource.loading ? <HostSkeleton rows={1}/> : <HostKpi label={metric.label} icon={metric.icon} tone={metric.tone} value={metric.value ?? "—"} detail={metric.resource.error ? "Chưa tải được số liệu" : metric.detail}/>}</div>)}</div>
    <div className="host-overview-grid">
      <HostPanel title="Đơn cần xem xét" description="Kiểm tra thông tin thanh toán trước khi xử lý." action={<Link className="host-inline-link" href="/host/bookings">Tất cả đơn <ArrowUpRight size={16}/></Link>}>
        <HostResourceState resource={pending}/>{pending.data && (pending.data.items.length ? <BookingPreview bookings={pending.data.items}/> : <HostEmptyState title="Không có đơn đang chờ" description="Các yêu cầu chờ xử lý sẽ xuất hiện tại đây."/>)}
      </HostPanel>
      <HostPanel title="Hôm nay tại Studio" description="Trong 50 đơn thuê mới nhất."><HostResourceState resource={latest}/>{latest.data && (todaysBookings.length ? <BookingPreview bookings={todaysBookings}/> : <HostEmptyState title="Chưa thấy ca thuê hôm nay" description="Không có đơn đã xác nhận hoặc đang sử dụng trong danh sách gần nhất." action={<Link className="host-inline-link" href="/host/calendar">Mở lịch phòng →</Link>}/>)}</HostPanel>
    </div>
    <div className="host-overview-bottom"><HostPanel title="Không gian của bạn" description="Đi từ thông tin cơ sở đến từng phòng và thiết bị."><HostResourceState resource={studios}/>{studios.data?.length === 0 ? <HostEmptyState title="Thiết lập Studio đầu tiên" description="Thêm cơ sở để bắt đầu quản lý không gian sáng tạo." action={<Link className="btn" href="/host/studios">Thêm Studio</Link>}/> : <div className="host-overview-studios">{studios.data?.map(studio => <Link href="/host/studios" key={studio.studio_id}><span className="host-event-icon"><Building2 size={22}/></span><div><strong>{studio.name}</strong><small>{studio.district} · {studio.city}</small></div><ArrowUpRight size={18}/></Link>)}</div>}</HostPanel>
      <div className="host-quick-panel"><span className="host-eyebrow">Lối tắt công việc</span><h2>Thiết lập tốt.<br/>Vận hành nhẹ nhàng.</h2><p>Thông tin rõ ràng giúp khách tìm đúng không gian cho ý tưởng của họ.</p><Link href="/host/rooms">Quản lý phòng <DoorOpen size={18}/></Link><Link href="/host/rates">Kiểm tra bảng giá <ArrowUpRight size={18}/></Link><Link href="/host/reports">Xem báo cáo <BarChart3 size={18}/></Link></div></div>
  </>;
}

export function HostBookings({ basePath = "/host/bookings" }: { basePath?: string }) {
  const [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const list = useResource<HostBookingPage>(`/api/bookings?page=${page}&limit=12&status=${status}`);
  return <>
    <HostPageHeader title="Quản lý đơn thuê" description="Theo dõi và xử lý đơn thuê Studio." action={<button className="btn secondary" onClick={list.reload}><RefreshCw size={17}/>Làm mới</button>}/>
    <div className="host-status-filters" role="group" aria-label="Lọc đơn theo trạng thái">{[["", "Tất cả"], ...Object.entries(bookingLabels)].map(([value, label]) => <button key={value} aria-pressed={status === value} data-status={value} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div>
    <HostPanel title="Danh sách đơn thuê" description={list.data ? `${list.data.total_items} đơn phù hợp` : undefined}>
      <HostResourceState resource={list}/>
      {list.data?.items.length === 0 && <HostEmptyState title="Chưa có đơn thuê phù hợp" description={status ? `Không có đơn thuộc trạng thái “${bookingLabels[status]}”.` : "Các đơn thuê của Studio sẽ xuất hiện tại đây."} action={status ? <button className="btn secondary" onClick={() => { setStatus(""); setPage(1); }}>Xóa bộ lọc</button> : undefined}/>}
      {!!list.data?.items.length && <div className="host-table-scroll" tabIndex={0} aria-label="Bảng đơn thuê có thể cuộn ngang"><table className="host-table"><thead><tr><th>Mã đơn / khách hàng</th><th>Phòng</th><th>Thời gian thuê</th><th>Trạng thái</th><th>Tổng giá thuê</th><th><span className="host-sr-only">Chi tiết</span></th></tr></thead><tbody>{list.data.items.map(booking => <tr key={booking.booking_id}><td><Link className="host-inline-link" href={`${basePath}/${booking.booking_id}`}>{booking.booking_code}</Link>{booking.customer_name && <small>{booking.customer_name}</small>}</td><td><strong>{booking.room_name}</strong><small>{booking.studio_name}</small></td><td>{formatApiTime(booking.start_time)}<small>Đến {formatApiTime(booking.end_time)}</small></td><td><HostStatusBadge status={booking.status}/></td><td className="host-number"><strong>{hostMoney(booking.total_amount)}</strong><small>Cọc: {hostMoney(booking.deposit_amount)}</small></td><td><Link className="host-icon-button" href={`${basePath}/${booking.booking_id}`} aria-label={`Chi tiết ${booking.booking_code}`}><ArrowUpRight size={19}/></Link></td></tr>)}</tbody></table></div>}
    </HostPanel>
    <HostPagination page={page} total={list.data?.total_pages ?? 1} onChange={setPage} loading={list.loading}/>
  </>;
}

export function HostReports({ role = "host" }: { role?: "host" | "admin" }) {
  const today = sqlVietnamTime(new Date()).slice(0, 10);
  const [period, setPeriod] = useState(""), [preset, setPreset] = useState("default");
  const stats = useResource<HostStats>(`/api/${role}/statistics${period ? `?${period}` : ""}`);
  const [draft, setDraft] = useState(() => reportingPreset("month", today));
  function choose(value: "7" | "30" | "month") { const range = reportingPreset(value, today); setDraft(range); setPeriod(new URLSearchParams(range).toString()); setPreset(value); }
  return <>
    <HostPageHeader title="Báo cáo hoạt động" description="Theo dõi hiệu quả hoạt động và tình hình cho thuê Studio." action={<button className="btn secondary" onClick={stats.reload}><RefreshCw size={17}/>Làm mới</button>}/>
    <div className="host-report-toolbar"><div className="host-segmented" role="group" aria-label="Kỳ báo cáo">{[["7", "7 ngày"], ["30", "30 ngày"], ["month", "Tháng này"]].map(([value, label]) => <button key={value} aria-pressed={preset === value || preset === "default" && value === "month"} onClick={() => choose(value as "7" | "30" | "month")}>{label}</button>)}<button aria-pressed={preset === "custom"} onClick={() => setPreset("custom")}>Tùy chỉnh</button></div>
      <form className="host-date-form" onSubmit={e => { e.preventDefault(); setPeriod(new URLSearchParams(draft).toString()); setPreset("custom"); }}><label>Từ ngày<input name="from" type="date" required value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })}/></label><label>Đến trước ngày<input name="to" type="date" required value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })}/></label><button className="btn" type="submit">Áp dụng</button></form></div>
    <HostResourceState resource={stats}/>
    {stats.data && <><p className="host-period-label">Từ {stats.data.period.from.split("-").reverse().join("/")} đến trước {stats.data.period.to.split("-").reverse().join("/")} · giờ Việt Nam</p>
      <div className="host-kpi-grid"><HostKpi label="Đơn thuê trong kỳ" value={stats.data.total_bookings} icon={<ClipboardList size={23}/>} tone="blue" detail="Theo thời điểm bắt đầu thuê"/><HostKpi label="Doanh thu hoàn tất" value={hostMoney(stats.data.total_revenue)} icon={<Banknote size={23}/>} tone="mint" detail="Theo thời điểm hoàn tất đơn"/><HostKpi label="Tỷ lệ sử dụng" value={`${stats.data.occupancy_rate}%`} icon={<BarChart3 size={23}/>} tone="yellow" detail="Giá trị do hệ thống ghi nhận"/><HostKpi label="Phòng hoạt động" value={stats.data.total_rooms} icon={<DoorOpen size={23}/>} tone="cyan" detail={`${stats.data.total_studios} Studio hoạt động hiện tại`}/></div>
      {role === "admin" && stats.data.total_customers !== undefined && <HostPanel title="Khách hàng hoạt động"><p><strong>{stats.data.total_customers}</strong> tài khoản khách hàng đang hoạt động ở thời điểm hiện tại.</p></HostPanel>}
      <div className="host-report-grid"><HostPanel title="Mức sử dụng không gian" description="Tỷ lệ sử dụng trong kỳ báo cáo."><div className="host-utilization"><strong>{stats.data.occupancy_rate}<span>%</span></strong><div className="host-utilization-track" role="img" aria-label={`Tỷ lệ sử dụng ${stats.data.occupancy_rate}%`}><span style={{ width: `${Math.max(0, Math.min(100, stats.data.occupancy_rate))}%` }}/></div><p>Số liệu tổng hợp từ các phòng đang hoạt động.</p></div></HostPanel><HostPanel title="Xu hướng theo thời gian" description="Phân tích chi tiết hoạt động của Studio."><HostEmptyState unavailable title="Chưa có dữ liệu xu hướng" description="Hiện chưa có chuỗi số liệu theo ngày để hiển thị biểu đồ."/></HostPanel></div>
      <HostPanel title="Tổng hợp trong kỳ"><div className="host-table-scroll" tabIndex={0} aria-label="Bảng tổng hợp"><table className="host-table"><thead><tr><th>Chỉ số</th><th>Giá trị</th><th>Phạm vi</th></tr></thead><tbody><tr><td>Số đơn thuê</td><td>{stats.data.total_bookings}</td><td>Bắt đầu thuê trong kỳ, không tính đơn hết hạn</td></tr><tr><td>Doanh thu đơn hoàn tất</td><td>{hostMoney(stats.data.total_revenue)}</td><td>Theo thời điểm hoàn tất</td></tr><tr><td>Studio hoạt động</td><td>{stats.data.total_studios}</td><td>Hiện tại</td></tr><tr><td>Phòng hoạt động</td><td>{stats.data.total_rooms}</td><td>Hiện tại</td></tr></tbody></table></div></HostPanel>
    </>}
  </>;
}
