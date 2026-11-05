"use client";
import Link from "next/link";
import { useResource } from "@/services/api/use-resource";
import { hostOverview, reportSeries, text } from "@/services/api/management";
import { HostPanel, HostPageHeader, HostResourceState, HostEmptyState, HostKpi, HostStatusBadge } from "./host-ui";
import { hostMoney } from "./host-presentation";
import { formatApiTime } from "@/services/api/contracts";
import { ClipboardList, Banknote, DoorOpen } from "lucide-react";

export function RestHostOverview() {
  const resource = useResource("/api/host/overview", hostOverview);
  const stats = resource.data?.statistics;
  const upcoming = resource.data?.upcoming_bookings;
  return <><HostPageHeader title="Tổng quan Studio" description="Tất cả Studio thuộc Host · thống kê theo kỳ mặc định của máy chủ."/><HostResourceState resource={resource}/>{stats && <div className="host-kpi-grid"><HostKpi label="Đơn thuê trong kỳ" value={text(stats.total_bookings)} icon={<ClipboardList/>}/><HostKpi label="Doanh thu hoàn tất" value={hostMoney(Number(stats.total_revenue))} icon={<Banknote/>} tone="mint"/><HostKpi label="Phòng hoạt động" value={text(stats.total_rooms)} icon={<DoorOpen/>} tone="yellow"/><HostKpi label="Tỷ lệ sử dụng" value={`${text(stats.occupancy_rate)}%`} icon={<DoorOpen/>}/></div>}<HostPanel title="Đơn thuê sắp tới" description="Tối đa 10 đơn do máy chủ cung cấp; xem lịch để tra cứu theo phòng và ngày.">{upcoming?.length === 0 && <HostEmptyState title="Chưa có đơn thuê sắp tới" description="Trong phạm vi máy chủ cung cấp."/>}{upcoming?.map(item => <article key={text(item.booking_id)} className="host-room-row"><div><Link href={`/host/bookings/${text(item.booking_id)}`}>{text(item.booking_code)}</Link><p>{text(item.room_name)} · {formatApiTime(text(item.start_time, ""))}</p></div><HostStatusBadge status={text(item.status)}/></article>)}</HostPanel></>;
}
export function RestReportSeries({ role, period }: { role: "host" | "admin"; period: string }) {
  const resource = useResource(`/api/${role}/reports/series${period ? `?${period}` : ""}`, reportSeries);
  const rows = resource.data?.series;
  return <HostPanel title="Xu hướng theo ngày trong kỳ" description={`${role === "host" ? "Tất cả Studio thuộc Host" : "Toàn hệ thống"} · ngày theo giờ Việt Nam. Các ngày không được API trả về không được tự điền số liệu.`}><HostResourceState resource={resource}/>{rows?.length === 0 && <HostEmptyState title="Chưa có số liệu theo ngày trong kỳ" description="Chọn kỳ khác để tra cứu."/>}{!!rows?.length && <div className="host-table-scroll"><table className="host-table"><thead><tr><th>Ngày</th><th>Đơn bắt đầu thuê</th><th>Doanh thu đơn hoàn tất (VND)</th></tr></thead><tbody>{rows.map(row => <tr key={text(row.date)}><td>{text(row.date)}</td><td>{text(row.bookings)}</td><td>{hostMoney(Number(row.revenue))}</td></tr>)}</tbody></table></div>}</HostPanel>;
}
