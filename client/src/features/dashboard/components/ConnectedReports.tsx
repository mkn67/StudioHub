"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import { money } from "@/domain/models";
import { DashboardKpis, DashboardKpi } from "./DashboardUi";
import { Wallet, CircleDollarSign, RotateCcw, ClipboardList } from "lucide-react";
export function ConnectedReports() {
  const { state } = useStore();
  const [period, setPeriod] = useState<"weeklyRooms" | "monthlyRooms">("weeklyRooms");
  const report = state.report;
  if (!report) return <p role="status">Chưa tải được báo cáo máy chủ.</p>;
  const groups = Object.entries(report[period]).sort(([a], [b]) => b.localeCompare(a));
  return <>
    <h1>Hoạt động & công nợ</h1><p>Số liệu từ máy chủ · múi giờ Việt Nam. Đã thu ròng bằng cọc cộng thu bổ sung, trừ tiền đã hoàn.</p>
    <DashboardKpis>
      <DashboardKpi label="Số đơn" value={report.bookingCount} hint="Tất cả trạng thái" icon={ClipboardList} accent="blue" />
      <DashboardKpi label="Cọc đã nhận" value={money(report.deposits)} hint="Cọc đã ghi nhận thanh toán" icon={Wallet} accent="cyan" />
      <DashboardKpi label="Thu bổ sung" value={money(report.collections)} hint="Khoản thu đã ghi sổ" icon={CircleDollarSign} accent="yellow" />
      <DashboardKpi label="Đã hoàn" value={money(report.refunded)} hint="Nghĩa vụ đã hoàn tất" icon={RotateCcw} accent="lilac" />
      <DashboardKpi label="Cần hoàn" value={money(report.refundDue)} hint="Nghĩa vụ chưa hoàn tất" icon={RotateCcw} accent="coral" />
      <DashboardKpi label="Còn phải thu" value={money(report.outstanding)} hint="Đơn xác nhận, đang dùng, hoàn thành" icon={Wallet} accent="yellow" />
      <DashboardKpi label="Đã thu ròng" value={money(report.netCollected)} hint="Cọc + thu bổ sung − đã hoàn" icon={CircleDollarSign} accent="blue" />
    </DashboardKpis>
    <h2>Phòng được đặt nhiều nhất</h2>
    <label>Kỳ báo cáo<select value={period} onChange={event => setPeriod(event.target.value as typeof period)}><option value="weeklyRooms">Theo tuần (ISO)</option><option value="monthlyRooms">Theo tháng</option></select></label>
    <p>Chỉ tính đơn đã xác nhận, đang sử dụng và hoàn thành, theo thời gian bắt đầu thuê.</p>
    {groups.length ? groups.map(([key, rooms]) => <section key={key}><h3>{key}</h3><div className="table-scroll"><table><thead><tr><th>Phòng thực tế</th><th>Lượt đặt</th></tr></thead><tbody>{Object.entries(rooms).sort((a,b) => b[1]-a[1]).map(([id,count]) => <tr key={id}><td>{state.rooms.find(room => room.id === id)?.name ?? id}</td><td>{count}</td></tr>)}</tbody></table></div></section>) : <p>Chưa có lượt đặt hợp lệ.</p>}
  </>;
}
