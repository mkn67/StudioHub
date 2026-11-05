"use client";
import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Building2, DoorOpen, Boxes, Tag, CalendarDays, ClipboardList, BarChart3, Settings, ScrollText } from "lucide-react";
import { useResource } from "@/services/api/use-resource";
import { ManagementWorkspace, type WorkspaceNavGroup } from "@/features/workspace/management-workspace";
import { HostSettings } from "./host-settings";
import { HostContext } from "./host-context";
import { hostStudios } from "@/services/api/host-contract";
import { HostEmptyState } from "./host-ui";
import { HostStudiosPage, HostResourcesPage } from "./host-resources";
import { HostReports, HostBookings } from "./host-activity";
import { BackendBookingDetail } from "@/features/booking/backend-booking";
import { RestHostPolicies as HostPolicies } from "./host-rest-forms";
import { RestHostOverview as WorkspaceHostOverview } from "./rest-reporting";

const groups: WorkspaceNavGroup[] = [
  { label: "Tổng quan", links: [{ path: "", label: "Tổng quan", icon: LayoutDashboard }] },
  { label: "Tài nguyên", links: [{ path: "studios", label: "Studio của tôi", icon: Building2 }, { path: "rooms", label: "Loại phòng & phòng", icon: DoorOpen }, { path: "equipments", label: "Thiết bị", icon: Boxes }, { path: "rates", label: "Bảng giá", icon: Tag }] },
  { label: "Vận hành", links: [{ path: "calendar", label: "Lịch đặt phòng", icon: CalendarDays }, { path: "bookings", label: "Quản lý đơn", icon: ClipboardList }] },
  { label: "Phân tích & thiết lập", links: [{ path: "reports", label: "Báo cáo", icon: BarChart3 }, { path: "policies", label: "Chính sách", icon: ScrollText }, { path: "settings", label: "Cài đặt", icon: Settings }] },
];
const aliases: Record<string, string> = { studio: "studios", equipment: "equipments", pricing: "rates", analytics: "reports" };
export function HostWorkspace({ segments }: { segments: string[] }) {
  const path = aliases[segments[0]] ?? segments[0] ?? "";
  const studios = useResource("/api/studios/mine", hostStudios);
  const [selected, selectStudio] = useState("");
  const studioId = studios.data?.some(studio => String(studio.studio_id) === selected) ? selected : String(studios.data?.[0]?.studio_id ?? "");
  let content;
  if (!path) content = <WorkspaceHostOverview/>;
  else if (path === "studios") content = <HostStudiosPage/>;
  else if (["rooms", "equipments", "rates", "calendar"].includes(path)) content = <HostResourcesPage key={path} section={path}/>;
  else if (path === "bookings") content = segments[1] ? <div className="host-booking-detail"><Link className="host-inline-link" href="/host/bookings">← Quản lý đơn thuê</Link><BackendBookingDetail id={segments[1]} host/></div> : <HostBookings/>;
  else if (path === "reports") content = <HostReports/>;
  else if (path === "settings") content = <HostSettings/>;
  else if (path === "policies") content = <HostPolicies/>;
  else content = <HostEmptyState title="Không tìm thấy trang" description="Chọn chức năng trong thanh điều hướng để tiếp tục." action={<Link className="btn" href="/host">Về tổng quan</Link>}/>;
  return <HostContext.Provider value={{ studios, studioId, selectStudio }}><ManagementWorkspace role="host" path={path} title={groups.flatMap(group => group.links).find(link => link.path === path)?.label ?? "Không gian làm việc"} groups={groups} context={studios.data?.find(studio => String(studio.studio_id) === studioId)?.name}>{content}</ManagementWorkspace></HostContext.Provider>;
}
