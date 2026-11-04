"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, RotateCcw, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import type { ApiUser } from "@/services/api/contracts";
import type { HostRoom } from "@/features/host/host-types";
import { HostPageHeader, HostPanel, HostResourceState, HostEmptyState, HostPagination, HostImage } from "@/features/host/host-ui";

const roles = { customer: "Khách hàng", host: "Chủ Studio", admin: "Quản trị viên" };
export function AdminUsers({ permissions = false }: { permissions?: boolean }) {
  const session = useApiSession(), action = useApiAction();
  const [page, setPage] = useState(1), [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ search: "", role: "", status: "" }), [saved, setSaved] = useState(false);
  const list = useResource<{ items: ApiUser[]; total_pages: number; total_items: number }>(`/api/admin/users?page=${page}&limit=12&${query}`);
  function mutate(user: ApiUser, kind: "role" | "status", value: string) {
    const consequence = kind === "role" ? `Đổi vai trò của ${user.email} thành ${roles[value as keyof typeof roles]}? Quyền truy cập của tài khoản sẽ thay đổi.` : `${value === "locked" ? "Khóa" : "Mở khóa"} tài khoản ${user.email}? ${value === "locked" ? "Tài khoản sẽ không thể tiếp tục truy cập các chức năng cần đăng nhập." : "Tài khoản được phép đăng nhập trở lại."}`;
    if (!window.confirm(consequence)) return;
    setSaved(false); void action.run(async () => { await apiRequest(`/api/admin/users/${user.user_id}/${kind}`, { method: "PATCH", body: { [kind]: value } }); list.reload(); setSaved(true); });
  }
  const reset = () => { setDraft({ search: "", role: "", status: "" }); setQuery(""); setPage(1); };
  return <>
    <HostPageHeader title={permissions ? "Vai trò & phân quyền" : "Quản lý tài khoản"} description={permissions ? "Xem vai trò tài khoản và các thao tác phân công hiện được hỗ trợ." : "Tra cứu và quản lý tài khoản trong hệ thống."}/>
    {permissions && <><div className="workspace-role-explanation">{Object.entries(roles).map(([key, label]) => <div key={key}><ShieldCheck size={22}/><h2>{label}</h2><p>Vai trò {key} đang được hệ thống sử dụng.</p></div>)}</div><HostPanel title="Phạm vi phân quyền hiện tại"><p>Có thể phân công vai trò Chủ Studio hoặc Khách hàng cho tài khoản đủ điều kiện. Chưa có danh mục quyền chi tiết hoặc chức năng tạo vai trò tại đây.</p></HostPanel></>}
    <form className="workspace-admin-filters" onSubmit={event => { event.preventDefault(); setQuery(new URLSearchParams(draft).toString()); setPage(1); }}>
      <label>Tìm tài khoản<input aria-label="Tìm tài khoản" name="search" placeholder="Tên, email hoặc số điện thoại" value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })}/></label>
      <label>Vai trò<select aria-label="Vai trò" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}><option value="">Tất cả vai trò</option>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Trạng thái<select aria-label="Trạng thái" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select></label>
      <button className="btn" type="submit"><Search size={17}/>Tìm kiếm</button><button className="btn secondary" type="button" onClick={reset}><RotateCcw size={17}/>Xóa bộ lọc</button>
    </form>
    {action.error && <p className="host-form-error" role="alert">{action.error}</p>}{saved && <p className="host-success" role="status">Thay đổi tài khoản đã được máy chủ xác nhận.</p>}
    <HostPanel title={permissions ? "Phân công vai trò tài khoản" : "Danh sách tài khoản"} description={list.data ? `${list.data.total_items} tài khoản phù hợp` : undefined}>
      <HostResourceState resource={list}/>
      {list.data?.items.length === 0 && <HostEmptyState title="Không tìm thấy tài khoản" description="Thử tìm kiếm khác hoặc xóa bộ lọc đang áp dụng." action={<button className="btn secondary" onClick={reset}>Xóa bộ lọc</button>}/>}
      {!!list.data?.items.length && <div className="host-table-scroll" tabIndex={0} aria-label="Bảng tài khoản có thể cuộn ngang"><table className="host-table"><thead><tr><th>Tài khoản</th><th>Email</th><th>Vai trò hiện tại</th><th>Trạng thái</th><th>{permissions ? "Phân công" : "Thao tác tài khoản"}</th></tr></thead><tbody>{list.data.items.map(user => <tr key={user.user_id}><td><strong>{user.full_name}</strong>{user.user_id === session.user?.user_id && <small>Phiên của bạn</small>}</td><td>{user.email}<small>{user.phone}</small></td><td><span className="host-badge">{roles[user.role]}</span></td><td><span className="host-badge" data-status={user.status === "locked" ? "rejected" : user.status}>{user.status === "locked" ? "Đã khóa" : user.status === "active" ? "Hoạt động" : user.status ?? "—"}</span></td><td>{user.user_id !== session.user?.user_id && (permissions ? user.role !== "admin" && <button className="btn secondary" disabled={action.busy} onClick={() => mutate(user, "role", user.role === "host" ? "customer" : "host")}>{user.role === "host" ? "Chuyển thành khách" : "Cấp vai trò Host"}</button> : <button className="btn secondary" disabled={action.busy} onClick={() => mutate(user, "status", user.status === "locked" ? "active" : "locked")}>{user.status === "locked" ? "Mở khóa" : "Khóa"}</button>)}</td></tr>)}</tbody></table></div>}
      <p className="workspace-admin-note">Không thể tự khóa tài khoản hoặc tự đổi vai trò. Không cấp vai trò quản trị mới qua các thao tác này.</p>
    </HostPanel><HostPagination page={page} total={list.data?.total_pages ?? 1} onChange={setPage} loading={list.loading}/>
  </>;
}

export function AdminCatalog() {
  const [page, setPage] = useState(1), [keyword, setKeyword] = useState(""), [draft, setDraft] = useState("");
  const list = useResource<{ items: HostRoom[]; pagination: { total_items: number; total_pages: number } }>(`/api/rooms?page=${page}&limit=12&keyword=${encodeURIComponent(keyword)}`);
  return <><HostPageHeader title="Studio & phòng" description="Tham khảo các phòng đang công khai trên StudioHub."/><HostPanel title="Phạm vi danh mục"><p>Danh sách dưới đây chỉ gồm các phòng đang công khai. Quản lý toàn bộ Studio, phòng ẩn hoặc bảo trì và các thao tác quản trị chưa được hỗ trợ tại đây.</p></HostPanel>
    <form className="workspace-admin-filters" onSubmit={event => { event.preventDefault(); setKeyword(draft.trim()); setPage(1); }}><label>Tìm Studio / phòng<input aria-label="Tìm Studio / phòng" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Tên Studio hoặc phòng"/></label><button className="btn" type="submit"><Search size={17}/>Tìm kiếm</button><button className="btn secondary" type="button" onClick={() => { setDraft(""); setKeyword(""); setPage(1); }}>Xóa bộ lọc</button></form>
    <HostPanel title="Phòng đang công khai" description={list.data ? `${list.data.pagination.total_items} phòng trong danh mục công khai` : undefined}><HostResourceState resource={list}/>{list.data?.items.length === 0 && <HostEmptyState title="Không tìm thấy phòng công khai" description="Thử một từ khóa khác hoặc xóa bộ lọc."/>}{!!list.data?.items.length && <div className="host-table-scroll" tabIndex={0} aria-label="Danh mục phòng công khai"><table className="host-table"><thead><tr><th>Phòng</th><th>Studio</th><th>Diện tích / sức chứa</th><th><span className="host-sr-only">Xem phòng</span></th></tr></thead><tbody>{list.data.items.map(room => <tr key={room.room_id}><td><div className="host-table-resource"><HostImage src={room.thumbnail_url} alt={room.name}/><strong>{room.name}</strong></div></td><td>{room.studio.name}<small>{room.studio.district}, {room.studio.city}</small></td><td>{room.area} m²<small>{room.capacity} người</small></td><td><Link className="host-icon-button" href={`/rooms/${room.room_id}`} target="_blank" rel="noopener noreferrer" aria-label={`Xem ${room.name}`}><ArrowUpRight size={18}/></Link></td></tr>)}</tbody></table></div>}</HostPanel><HostPagination page={page} total={list.data?.pagination.total_pages ?? 1} onChange={setPage} loading={list.loading}/></>;
}
