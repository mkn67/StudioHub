"use client";
import Link from "next/link";
import { LayoutDashboard, Users, UserCheck, ShieldCheck, Building2, Boxes, ReceiptText, ScrollText, Settings, BarChart3, ClipboardList, ArrowUpRight, DoorOpen } from "lucide-react";
import { ManagementWorkspace, type WorkspaceNavGroup } from "@/features/workspace/management-workspace";
import { WorkspaceSettings } from "@/features/workspace/workspace-settings";
import { HostPageHeader, HostPanel, HostKpi, HostEmptyState, HostResourceState } from "@/features/host/host-ui";
import { HostBookings, HostReports } from "@/features/host/host-activity";
import { useResource } from "@/services/api/use-resource";
import type { HostStats } from "@/features/host/host-types";
import type { ApiBooking } from "@/services/api/contracts";
import { formatApiTime, bookingLabels } from "@/services/api/contracts";
import { hostMoney } from "@/features/host/host-presentation";
import { AdminUsers, AdminCatalog } from "./system-pages";

const groups: WorkspaceNavGroup[] = [
  { label: "Tổng quan", links: [{ path: "", label: "Tổng quan", icon: LayoutDashboard }] },
  { label: "Quản lý người dùng", links: [{ path: "users", label: "Tài khoản", icon: Users }, { path: "host-requests", label: "Xét duyệt đối tác", icon: UserCheck }, { path: "roles", label: "Phân quyền", icon: ShieldCheck }] },
  { label: "Quản lý tài nguyên", links: [{ path: "studios", label: "Studio & phòng", icon: Building2 }, { path: "equipments", label: "Thiết bị", icon: Boxes }] },
  { label: "Vận hành", links: [{ path: "bookings", label: "Giám sát đơn thuê", icon: ClipboardList }, { path: "refunds", label: "Ngoại lệ hoàn tiền", icon: ReceiptText }, { path: "audit-logs", label: "Nhật ký hoạt động", icon: ScrollText }] },
  { label: "Không gian làm việc", links: [{ path: "reports", label: "Báo cáo", icon: BarChart3 }, { path: "settings", label: "Cài đặt", icon: Settings }] },
];
const unavailable: Record<string, { title: string; description: string; message: string; details: [string, string][] }> = {
  "host-requests": { title: "Xét duyệt đối tác", description: "Quản lý yêu cầu đăng ký trở thành đối tác StudioHub.", message: "Chức năng xét duyệt đối tác chưa sẵn sàng.", details: [["Hồ sơ đối tác", "Chưa thể xem danh sách hoặc chi tiết yêu cầu tại đây."], ["Quyết định xét duyệt", "Chưa có thao tác duyệt hoặc từ chối được kết nối."]] },
  equipments: { title: "Quản lý thiết bị", description: "Theo dõi tài nguyên thiết bị trên toàn hệ thống.", message: "Quản lý thiết bị toàn hệ thống chưa sẵn sàng.", details: [["Phạm vi quản trị", "Danh mục thiết bị đang công khai của từng Studio chưa thay thế được tồn kho quản trị."], ["Thao tác quản lý", "Chưa hỗ trợ chỉnh sửa thiết bị với quyền quản trị tại đây."]] },
  refunds: { title: "Ngoại lệ hoàn tiền", description: "Theo dõi các trường hợp hoàn tiền cần được xử lý.", message: "Quản lý ngoại lệ hoàn tiền chưa sẵn sàng.", details: [["Hồ sơ hoàn tiền", "Chưa có danh sách và lịch sử xử lý để hiển thị."], ["Xử lý ngoại lệ", "Không có thao tác duyệt hoặc thử hoàn tiền tại đây."]] },
  "audit-logs": { title: "Nhật ký hoạt động", description: "Tra cứu các hoạt động quản trị và lịch sử thay đổi.", message: "Tra cứu nhật ký hoạt động chưa sẵn sàng.", details: [["Dữ liệu nhật ký", "Hệ thống có ghi nhận một số hoạt động nhưng chưa hỗ trợ tra cứu tại đây."], ["Tìm kiếm & bộ lọc", "Chưa có danh sách nhật ký để áp dụng bộ lọc."]] },
};
function UnavailableModule({ page }: { page: typeof unavailable[string] }) {
  return <><HostPageHeader title={page.title} description={page.description}/><div className="workspace-unavailable-grid"><HostPanel title="Khả năng hiện tại"><HostEmptyState unavailable title={page.message} description="Chức năng này sẽ được mở khi quy trình và dữ liệu quản trị được hỗ trợ đầy đủ."/></HostPanel><HostPanel title="Phạm vi chức năng"><div className="workspace-module-context">{page.details.map(([title, text]) => <div key={title}><strong>{title}</strong><p>{text}</p></div>)}</div><Link className="host-inline-link" href="/admin">Về tổng quan →</Link></HostPanel></div></>;
}
function AdminOverview() {
  const stats = useResource<HostStats>("/api/admin/statistics");
  const users = useResource<{ total_items: number }>("/api/admin/users?page=1&limit=1");
  const hosts = useResource<{ total_items: number }>("/api/admin/users?page=1&limit=1&role=host");
  return <>
    <HostPageHeader title="Tổng quan hệ thống" description="Theo dõi tài nguyên và các khu vực quản trị StudioHub." action={<Link className="btn secondary" href="/admin/reports"><BarChart3 size={17}/>Xem báo cáo</Link>}/>
    <div className="host-kpi-grid"><HostKpi label="Tài khoản" value={users.data?.total_items ?? "—"} icon={<Users size={23}/>} tone="cyan" detail="Tất cả vai trò và trạng thái"/><HostKpi label="Chủ Studio" value={hosts.data?.total_items ?? "—"} icon={<UserCheck size={23}/>} tone="blue" detail="Tài khoản mang vai trò Host"/><HostKpi label="Studio hoạt động" value={stats.data?.total_studios ?? "—"} icon={<Building2 size={23}/>} tone="mint" detail="Số liệu hiện tại"/><HostKpi label="Phòng hoạt động" value={stats.data?.total_rooms ?? "—"} icon={<DoorOpen size={23}/>} tone="yellow" detail="Trong các Studio hoạt động"/></div>
    <HostResourceState resource={stats}/><HostResourceState resource={users}/><HostResourceState resource={hosts}/>
    <div className="host-overview-grid"><HostPanel title="Truy cập quản trị" description="Các chức năng đã được kết nối."><div className="workspace-queue-links">{[["users", "Tài khoản", "Tra cứu tài khoản, vai trò và trạng thái"], ["bookings", "Giám sát đơn thuê", "Xem dữ liệu đơn thuê được hệ thống cung cấp"], ["reports", "Báo cáo", "Xem số liệu tổng hợp theo kỳ"]].map(([path, title, text]) => <Link href={`/admin/${path}`} key={path}><div><strong>{title}</strong><small>{text}</small></div><ArrowUpRight size={18}/></Link>)}</div></HostPanel><HostPanel title="Các khu vực đang hoàn thiện" description="Chưa có hàng đợi xử lý để thống kê."><div className="workspace-module-context"><div><strong>Xét duyệt đối tác</strong><p>Chưa có danh sách yêu cầu và số lượng chờ duyệt.</p></div><div><strong>Ngoại lệ hoàn tiền</strong><p>Chưa có dữ liệu các trường hợp cần can thiệp.</p></div><div><strong>Hoạt động gần đây</strong><p>Chưa có dữ liệu nhật ký để hiển thị dòng hoạt động.</p></div></div></HostPanel></div>
  </>;
}
function AdminBookingDetail({ id }: { id: string }) {
  const booking = useResource<ApiBooking>(`/api/bookings/${encodeURIComponent(id)}`);
  const b = booking.data;
  return <><HostPageHeader title="Chi tiết đơn thuê" description="Thông tin giám sát đơn thuê, chỉ xem." action={<Link className="btn secondary" href="/admin/bookings">Về danh sách</Link>}/><HostResourceState resource={booking}/>{b && <HostPanel title={b.booking_code} description={b.room_name}><div className="workspace-module-context"><div><strong>{bookingLabels[b.status] ?? b.status}</strong><p>{formatApiTime(b.start_time)} – {formatApiTime(b.end_time)}</p></div><div><strong>Tổng: {hostMoney(b.total_amount)}</strong><p>Tiền cọc: {hostMoney(b.deposit_amount)}</p></div><div><strong>Giao dịch được ghi nhận</strong>{b.payments?.length ? b.payments.map(payment => <p key={payment.payment_id}>{payment.payment_type} · {hostMoney(payment.amount)} · {payment.status}</p>) : <p>Chưa có giao dịch.</p>}</div></div></HostPanel>}</>;
}
export function AdminWorkspace({ segments }: { segments: string[] }) {
  const path = segments[0] === "analytics" ? "reports" : segments[0] ?? "";
  let content;
  if (!path) content = <AdminOverview/>;
  else if (path === "users" || path === "roles") content = <AdminUsers key={path} permissions={path === "roles"}/>;
  else if (path === "settings") content = <WorkspaceSettings role="admin"/>;
  else if (path === "studios") content = <AdminCatalog/>;
  else if (path === "reports") content = <HostReports role="admin"/>;
  else if (path === "bookings") content = segments[1] ? <AdminBookingDetail id={segments[1]}/> : <HostBookings basePath="/admin/bookings"/>;
  else if (unavailable[path]) content = <UnavailableModule page={unavailable[path]}/>;
  else content = <HostEmptyState title="Không tìm thấy trang" description="Chọn một chức năng trong thanh điều hướng." action={<Link className="btn" href="/admin">Về tổng quan</Link>}/>;
  return <ManagementWorkspace role="admin" path={path} title={groups.flatMap(group => group.links).find(link => link.path === path)?.label ?? "Quản trị hệ thống"} groups={groups}>{content}</ManagementWorkspace>;
}
