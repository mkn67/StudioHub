"use client";
import { Presence, MotionSurface } from "./motion/system";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import {
  Plus,
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  LayoutDashboard, Building2, DoorOpen, Boxes, Tag, CalendarDays,
  ClipboardList, BarChart3, Settings, Users, UserCheck, ShieldCheck,
  ReceiptText, ScrollText, PanelLeftClose, PanelLeftOpen,
  Clock3, Wallet, CircleDollarSign, Layers3, RotateCcw,
  Menu, LogOut, UserRound, ChevronDown,
} from "lucide-react";
import { DashboardKpis, DashboardKpi, DashboardPanel, BookingAnalytics } from "@/features/dashboard/components/DashboardUi";
import "@/features/dashboard/styles/dashboard.css";
import { HostDeadline, UpcomingAgenda, RoomPopularity } from "@/features/dashboard/components/HostInsights";
import { HostPricing } from "@/features/dashboard/components/HostPricing";
import { HostCalendar } from "@/features/dashboard/components/HostCalendar";
import "@/features/dashboard/styles/host-operations.css";
import "@/features/dashboard/styles/workspace-refinement.css";
import "@/features/dashboard/styles/colored-refinement.css";
import { bookingRentalTime, bookingStatusTokenCSS } from "@/features/dashboard/booking-status";
import { useStore, useSession } from "./store";
import { PageHeading, Empty, Modal } from "./ui";
import { BookingDetail } from "./bookings";
import {
  money,
  dateTime,
  statusLabel,
  localDate,
  type Equipment,
  type Room,
  type RoomType,
  type Policy,
  type Studio,
} from "@/domain/models";
import { balance, studioFor } from "@/domain/engine";
import { StudioRentalSettings } from "@/features/pricing/components/StudioRentalSettings";
import { EquipmentVisual } from "@/features/pricing/components/EquipmentVisual";
export const hostLinks = [
  ["", "Tổng quan"],
  ["studios", "Studio của tôi"],
  ["rooms", "Loại phòng & phòng"],
  ["equipments", "Thiết bị"],
  ["rates", "Bảng giá"],
  ["calendar", "Lịch đặt phòng"],
  ["bookings", "Quản lý đơn"],
  ["reports", "Báo cáo"],
  ["settings", "Chính sách"],
];
export const adminLinks = [
  ["", "Tổng quan"],
  ["users", "Tài khoản"],
  ["host-requests", "Xét duyệt đối tác"],
  ["studios", "Studio & phòng"],
  ["equipments", "Thiết bị"],
  ["roles", "Phân quyền"],
  ["refunds", "Ngoại lệ hoàn tiền"],
  ["audit-logs", "Nhật ký hoạt động"],
];
const navigationIcons = {
  "": LayoutDashboard, studios: Building2, rooms: DoorOpen, equipments: Boxes,
  rates: Tag, calendar: CalendarDays, bookings: ClipboardList, reports: BarChart3,
  settings: Settings, users: Users, "host-requests": UserCheck, roles: ShieldCheck,
  refunds: ReceiptText, "audit-logs": ScrollText,
};
function NavigationIcon({ path }: { path: string }) {
  const Icon = navigationIcons[path as keyof typeof navigationIcons] ?? LayoutDashboard;
  return <Icon size={17} aria-hidden="true" />;
}
export function Operations({
  role,
  segments,
}: {
  role: "host" | "admin";
  segments: string[];
}) {
  const user = useSession(),
    { state, dispatch } = useStore();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("studiohub.ops.sidebar.collapsed") === "true"; } catch { return false; }
  });
  if (!user || user.role !== role || user.locked)
    return (
      <Empty
        title="Khu vực quản lý"
        text={`Vui lòng đăng nhập tài khoản ${role === "host" ? "chủ Studio" : "quản trị"} để tiếp tục.`}
        href="/login"
        label="Đăng nhập"
      />
    );
  const path = segments[0] ?? "";
  const links = role === "host" ? hostLinks : adminLinks;
  function logout() {
    dispatch({ type: "login", userId: null });
    router.push("/");
  }
  return (
    <div className={`ops-shell ${collapsed ? "nav-collapsed" : ""}`} data-role={role} data-page={path || "overview"}>
      <style>{bookingStatusTokenCSS}</style>
      <aside className="ops-nav">
        <div className="ops-title">
          <Link href={`/${role}`} className="ops-logo" aria-label={role === "host" ? "StudioHub · Tổng quan Host" : "StudioHub · Tổng quan Admin"}>
            <span className="ops-logo-mark"><Layers3 size={20} aria-hidden="true" /></span>
            <span className="ops-logo-copy"><strong>StudioHub</strong><small>{role === "host" ? "Host workspace" : "Admin console"}</small></span>
          </Link>
          <button className="icon-button nav-collapse" aria-label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"} aria-expanded={!collapsed} onClick={() => {
            const next = !collapsed; setCollapsed(next);
            try { localStorage.setItem("studiohub.ops.sidebar.collapsed", String(next)); } catch { /* Session state still works when storage is unavailable. */ }
          }}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav aria-label={role === "host" ? "Điều hướng Host" : "Điều hướng Admin"}>
          <p className="ops-nav-caption">{role === "host" ? "Quản lý Studio" : "Quản trị"}</p>
          {(role === "host" ? hostLinks : adminLinks).map(([p, l]) => (
            <Link
              className={path === p ? "active" : ""}
              href={`/${role}${p ? "/" + p : ""}`}
              key={p}
              title={l}
              aria-label={l}
              aria-current={path === p ? "page" : undefined}
            >
              <NavigationIcon path={p} />
              <span className="nav-label">{l}</span>
              {p === "bookings" && (
                <span className="ops-nav-count">
                  {
                    state.bookings.filter(
                      (b) =>
                        b.status === "pending" &&
                        studioFor(state, b.roomId)?.hostId === user.id,
                    ).length
                  }
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="ops-nav-bottom">
          <div className="ops-account"><span className="ops-avatar" aria-hidden="true">{user.name.split(" ").map(word => word[0]).slice(-2).join("")}</span><div><p>{user.name}</p><small>{role === "host" ? "Chủ Studio" : "Quản trị viên"}</small></div></div>
          <Link href="/rooms">
            Xem marketplace <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <main id="main-content" className="ops-main" tabIndex={-1}>
        <div className="ops-workspace-bar">
          <button type="button" className="icon-button ops-menu-toggle" aria-label="Mở điều hướng" aria-expanded={menu} aria-controls="workspace-mobile-nav" onClick={() => setMenu(true)}><Menu size={21} aria-hidden="true" /></button>
          <div className="ops-breadcrumb"><Link href={`/${role}`}>{role === "host" ? "Không gian làm việc" : "Quản trị hệ thống"}</Link><ChevronRight size={13} aria-hidden="true" /><strong>{(role === "host" ? hostLinks : adminLinks).find(([key]) => key === path)?.[1] ?? "Chi tiết đơn"}</strong></div>
          <div className="ops-workspace-context"><span className="dashboard-tag">Dữ liệu minh họa</span><time dateTime={localDate(state.now)}>{new Date(state.now).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })}</time>
            <details className="ops-account-menu" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
              <summary aria-label={`Tài khoản ${user.name}`}><span className="ops-avatar" aria-hidden="true">{user.name.split(" ").at(-1)?.slice(0, 1)}</span><span className="ops-account-name">{user.name.split(" ").at(-1)}</span><ChevronDown size={13} aria-hidden="true" /></summary>
              <div className="ops-account-popover"><strong>{user.name}</strong><Link href="/profile"><UserRound size={16} aria-hidden="true" /> Hồ sơ</Link><Link href="/rooms"><ArrowUpRight size={16} aria-hidden="true" /> Xem marketplace</Link><button type="button" onClick={logout}><LogOut size={16} aria-hidden="true" /> Đăng xuất</button></div>
            </details>
          </div>
        </div>
        <MotionSurface operational>
        {segments[0] === "bookings" && segments[1] ? (
          <BookingDetail id={segments[1]} />
        ) : role === "host" ? (
          <HostSurface path={path} />
        ) : (
          <AdminSurface path={path} />
        )}
      </MotionSurface></main>
      <Presence>{menu && <Modal title="Điều hướng StudioHub" onClose={() => setMenu(false)} className="navigation-drawer ops-navigation-drawer">
        <nav id="workspace-mobile-nav" className="ops-drawer-links" aria-label="Điều hướng di động" onClick={event => { if ((event.target as HTMLElement).closest("a")) setMenu(false); }}>
          {links.map(([key, label]) => <Link key={key} href={`/${role}${key ? "/" + key : ""}`} aria-current={path === key ? "page" : undefined}><NavigationIcon path={key} /><span>{label}</span></Link>)}
        </nav>
        <div className="ops-drawer-account"><strong>{user.name}</strong><Link href="/profile" onClick={() => setMenu(false)}>Hồ sơ</Link><Link href="/rooms" onClick={() => setMenu(false)}>Xem marketplace</Link><button type="button" className="text-button" onClick={() => { setMenu(false); logout(); }}>Đăng xuất</button></div>
      </Modal>}</Presence>
    </div>
  );
}
function useHostData() {
  const { state } = useStore(),
    user = useSession()!;
  const studios = state.studios.filter((s) => s.hostId === user.id),
    types = state.types.filter((t) => studios.some((s) => s.id === t.studioId)),
    rooms = state.rooms.filter((r) => types.some((t) => t.id === r.typeId)),
    equipment = state.equipment.filter((e) =>
      studios.some((s) => s.id === e.studioId),
    ),
    bookings = state.bookings.filter((b) =>
      rooms.some((r) => r.id === b.roomId),
    );
  return { studios, types, rooms, equipment, bookings };
}
function HostSurface({ path }: { path: string }) {
  if (path === "rooms") return <RoomManagement />;
  if (path === "equipments") return <EquipmentManagement />;
  if (path === "rates") return <Rates />;
  if (path === "settings") return <PolicySettings />;
  if (path === "studios") return <StudioManagement />;
  if (path === "calendar") return <Calendar />;
  if (path === "bookings") return <Kanban />;
  if (path === "reports") return <Reports />;
  if (path)
    return (
      <Empty
        title="Không tìm thấy trang"
        text="Chọn một chức năng từ thanh điều hướng."
        href="/host"
        label="Tổng quan"
      />
    );
  return <HostOverview />;
}
function HostOverview() {
  const { state } = useStore(),
    { studios, bookings, rooms } = useHostData();
  const pending = bookings.filter((b) => b.status === "pending").sort((a, b) => (a.paidAt ?? Infinity) - (b.paidAt ?? Infinity)),
    today = bookings.filter(
      (b) =>
        localDate(b.start) === localDate(state.now) &&
        ["confirmed", "checked_in"].includes(b.status),
    );
  if (!studios.length)
    return (
      <Empty
        title="Chào mừng, đối tác mới."
        text="Bắt đầu thiết lập Studio → loại phòng → phòng thực tế → thiết bị → giá và chính sách."
        href="/host/studios"
        label="Thiết lập Studio"
      />
    );
  return (
    <>
      <PageHeading
        title="Tổng quan Studio"
        description={`${new Date(state.now).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "long" })} · ${studios[0].name}`}
        action={
          <Link className="btn secondary" href="/host/calendar">
            Xem lịch đặt phòng
            <ArrowRight size={16} />
          </Link>
        }
      />
      <DashboardKpis>
        <DashboardKpi label="Chờ xác nhận" value={pending.length} hint="Ưu tiên phản hồi trong 2 giờ" icon={Clock3} accent="yellow" href="/host/bookings" />
        <DashboardKpi label="Ca thuê hôm nay" value={today.length} hint="Đã xác nhận & đang sử dụng" icon={CalendarDays} accent="blue" href="/host/calendar" />
        <DashboardKpi label="Đã thu trong tháng" value={money(
              bookings
                .filter(
                  (b) =>
                    localDate(b.start).slice(0, 7) ===
                    localDate(state.now).slice(0, 7),
                )
                .reduce(
                  (s, b) =>
                    s +
                    (b.payment === "paid" ? b.deposit : 0) +
                    b.collections.reduce((n, c) => n + c.amount, 0) -
                    (b.refund.status === "refunded" ? b.refund.amount : 0),
                  0,
                ),
            )} hint="Theo tháng thuê · đã trừ hoàn" icon={Wallet} accent="mint" href="/host/reports" />
        <DashboardKpi label="Công nợ đã sử dụng" value={money(
              bookings
                .filter((b) => ["completed", "checked_in"].includes(b.status))
                .reduce((s, b) => s + balance(b), 0),
            )} hint="Ca đang dùng hoặc đã hoàn thành" icon={CircleDollarSign} accent="coral" href="/host/reports" />
      </DashboardKpis>
      <div className="ops-columns">
        <DashboardPanel title="Cần bạn xác nhận" eyebrow={`${pending.length} đơn cần phản hồi`} action={
            <Link className="text-link" href="/host/bookings">
              Tất cả đơn
              <ArrowRight size={15} />
            </Link>
          }>
          {pending.map((b) => (
            <Link
              className="task-row"
              href={`/host/bookings/${b.id}`}
              key={b.id}
            >
              <div>
                <span className="mono">{b.id}</span>
                <span className={`status ${b.status}`} data-booking-status={b.status}>{statusLabel[b.status]}</span>
                <h3>
                  {rooms.find(room => room.id === b.roomId)?.code ?? b.roomId} ·{" "}
                  {state.users.find((u) => u.id === b.customerId)?.name}
                </h3>
                <small>
                  {dateTime(b.start)} — {dateTime(b.end)}
                </small>
              </div>
              <HostDeadline booking={b} now={state.now} />
              <ArrowUpRight size={18} />
            </Link>
          ))}
          {!pending.length && (
            <p className="dashboard-empty">Bạn đã xử lý hết đơn chờ duyệt.</p>
          )}
        </DashboardPanel>
        <UpcomingAgenda bookings={bookings} now={state.now} rooms={rooms} />
      </div>
      <BookingAnalytics bookings={bookings} now={state.now} />
    </>
  );
}
function Kanban() {
  const { state } = useStore(),
    { bookings } = useHostData();
  const [history, setHistory] = useState(false),
    [query, setQuery] = useState("");
  const statuses = history
    ? (["awaiting_payment", "cancelled", "expired", "no_show"] as const)
    : (["pending", "confirmed", "checked_in", "completed"] as const);
  return (
    <>
      <PageHeading
        title="Quản lý đơn đặt thuê"
        description="Mở đơn để thực hiện bước tiếp theo. Mỗi thao tác tuân theo trạng thái hiện tại."
      />
      <div className="toolbar">
        <label>
          <span className="sr-only">Tìm đơn</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn / phòng…"
          />
        </label>
        <button className="btn secondary" onClick={() => setHistory(!history)}>
          {history ? "Xem đơn đang vận hành" : "Chờ cọc & lịch sử"}
        </button>
      </div>
      <div className="kanban">
        {statuses.map((status) => (
          <section className="kanban-column" data-status={status} key={status}>
            <h3>
              {statusLabel[status]}
              <span>{bookings.filter((b) => b.status === status && (b.id + b.roomId).toLowerCase().includes(query.toLowerCase())).length}</span>
            </h3>
            {bookings
              .filter(
                (b) =>
                  b.status === status &&
                  (b.id + b.roomId).toLowerCase().includes(query.toLowerCase()),
              )
              .map((b) => (
                <Link
                  className="kanban-card"
                  key={b.id}
                  href={`/host/bookings/${b.id}`}
                >
                  <span className="mono muted kanban-reference">{b.id}</span>
                  <h3>
                    {state.rooms.find((r) => r.id === b.roomId)?.code ?? b.roomId} ·{" "}
                    {state.rooms.find((r) => r.id === b.roomId)?.name}
                  </h3>
                  <p className="kanban-customer">{state.users.find((u) => u.id === b.customerId)?.name}</p>
                  <p className="kanban-rental-time">{bookingRentalTime(b.start, b.end)}</p>
                  <div className="line-item">
                    <span>{b.payment === "paid" ? "Cọc đã nhận" : b.payment === "processing" ? "Cọc đang xử lý" : "Cọc yêu cầu"}</span>
                    <strong>{money(b.deposit)}</strong>
                  </div>
                  {b.status === "pending" && <HostDeadline booking={b} now={state.now} />}
                  {b.status === "completed" && balance(b) > 0 && (
                    <small className="warning">
                      Còn phải thu {money(balance(b))}
                    </small>
                  )}
                </Link>
              ))}
            {!bookings.some((b) => b.status === status && (b.id + b.roomId).toLowerCase().includes(query.toLowerCase())) && (
              <p className="muted small-text">Chưa có đơn</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
function Calendar() {
  const { state } = useStore();
  const { rooms, types, bookings } = useHostData();
  return <HostCalendar state={state} rooms={rooms} types={types} bookings={bookings} />;
}
function StudioManagement() {
  const { studios } = useHostData(),
    { state, dispatch, notice } = useStore(),
    user = useSession()!;
  const st = studios[0];
  const [name, setName] = useState(st?.name ?? ""),
    [address, setAddress] = useState(st?.address ?? ""),
    [description, setDescription] = useState(st?.description ?? "");
  return (
    <>
      <PageHeading
        title="Studio của tôi"
        description="Thông tin thương hiệu, địa chỉ và giới thiệu cơ sở."
      />
      <div className="settings-layout">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const studio: Studio = {
              ...st,
              id: st?.id ?? crypto.randomUUID(),
              hostId: user.id,
              name,
              address,
              description,
              district: st?.district ?? "TP. Hồ Chí Minh",
              active: st?.active ?? false,
              policy: st?.policy ?? structuredClone(state.studios[0].policy),
            };
            if (dispatch({ type: "studio_save", studio }))
              notice("Đã lưu Studio. Tiếp theo: loại phòng và phòng thực tế.");
          }}
        >
          <label>
            Tên Studio
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Địa chỉ
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label>
            Giới thiệu
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button className="btn">Lưu thông tin Studio</button>
        </form>
        <aside className="note">
          <h3>Thiết lập không gian</h3>
          <ol>
            <li>Thông tin Studio</li>
            <li>
              <Link href="/host/rooms">Loại phòng → phòng thực tế</Link>
            </li>
            <li>
              <Link href="/host/equipments">Thiết bị</Link>
            </li>
            <li>
              <Link href="/host/rates">Bảng giá</Link>
            </li>
            <li>
              <Link href="/host/settings">Chính sách</Link>
            </li>
          </ol>
          <p className="small-text">
            Studio mới ở trạng thái nháp. Mở nhận đặt sau khi kiểm tra đầy đủ
            danh mục và chính sách.
          </p>
        </aside>
      </div>
      {st && <StudioRentalSettings key={st.id} studio={st} />}
    </>
  );
}
function RoomManagement({ admin = false }: { admin?: boolean }) {
  const { state, dispatch, notice } = useStore(),
    hostData = useHostData();
  const [selectedStudio, setSelectedStudio] = useState(
    state.studios[0]?.id ?? "",
  );
  const types = admin
      ? state.types.filter((t) => t.studioId === selectedStudio)
      : hostData.types,
    rooms = admin ? state.rooms : hostData.rooms;
  const [edit, setEdit] = useState<Room | null>(null),
    [editType, setEditType] = useState<RoomType | null>(null);
  return (
    <>
      <PageHeading
        title={admin ? "Giám sát Studio & phòng" : "Loại phòng & phòng thực tế"}
        description="Mỗi phòng là một không gian riêng. Thông tin và giá mặc định được nhóm theo loại phòng."
        action={
          !admin && hostData.studios.length > 0 ? (
            <button
              className="btn"
              onClick={() =>
                setEditType({
                  id: crypto.randomUUID(),
                  studioId: hostData.studios[0].id,
                  name: "",
                  category: "Chụp ảnh",
                  hourlyRate: 300000,
                  plans: ["hourly"],
                })
              }
            >
              <Plus size={17} />
              Thêm loại phòng
            </button>
          ) : undefined
        }
      />
      {admin && (
        <div className="toolbar">
          <label>
            Studio
            <select
              value={selectedStudio}
              onChange={(e) => setSelectedStudio(e.target.value)}
            >
              {state.studios.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} · {st.active ? "Đang hiển thị" : "Đã ẩn"}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn secondary"
            onClick={() => {
              const studio = state.studios.find(
                (st) => st.id === selectedStudio,
              );
              if (!studio) return;
              const reason = window.prompt("Lý do giám sát Studio (bắt buộc):");
              if (reason)
                dispatch({
                  type: "studio_status",
                  id: studio.id,
                  active: !studio.active,
                  reason,
                });
            }}
          >
            {state.studios.find((st) => st.id === selectedStudio)?.active
              ? "Ẩn Studio"
              : "Hiển thị Studio"}
          </button>
        </div>
      )}
      {!types.length && (
        <Empty
          title="Chưa có loại phòng"
          text="Thiết lập Studio trước, sau đó thêm loại phòng và từng phòng vật lý."
          href="/host/studios"
          label="Thiết lập Studio"
        />
      )}
      {types.map((t) => (
        <details className="room-group" key={t.id} open>
          <summary>
            <div>
              <h2>{t.name}</h2>
              <span className="muted">
                {rooms.filter((r) => r.typeId === t.id).length} phòng ·{" "}
                {t.category} · {money(t.hourlyRate)} / giờ
              </span>
            </div>
            <span className="mono">
              {state.studios.find((s) => s.id === t.studioId)?.name}
            </span>
          </summary>
          <div className="room-group-body">
            {rooms
              .filter((r) => r.typeId === t.id)
              .map((r) => (
                <div className="inventory-room" key={r.id}>
                  <Image
                    width={1400}
                    height={1000}
                    src={r.images[0]}
                    sizes={admin ? undefined : "108px"}
                    alt={`Phòng ${r.code}`}
                  />
                  <div>
                    <h3>
                      {r.code} · {r.name}
                    </h3>
                    <p>
                      {r.floor} · {r.area} m² · {r.capacity} người
                    </p>
                    <small className="muted">{r.feature}</small>
                  </div>
                  <span className="status">
                    {r.active ? "Đang nhận đặt" : "Tạm ngưng"}
                  </span>
                  <div className="actions">
                    {!admin && (
                      <button
                        className="btn secondary small"
                        onClick={() => setEdit(structuredClone(r))}
                      >
                        Chỉnh sửa
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `${r.active ? "Tạm ngưng" : "Mở"} nhận đặt phòng ${r.code}? Các đơn hiện có giữ nguyên.`,
                          )
                        ) {
                          if (
                            dispatch({
                              type: "room_status",
                              id: r.id,
                              active: !r.active,
                            })
                          )
                            notice("Đã cập nhật trạng thái phòng.");
                        }
                      }}
                    >
                      {r.active ? "Tạm ngưng" : "Mở nhận đặt"}
                    </button>
                  </div>
                </div>
              ))}
            {!admin && (
              <div className="actions">
                <button
                  className="btn secondary"
                  onClick={() =>
                    setEdit({
                      id: crypto.randomUUID(),
                      typeId: t.id,
                      code: "",
                      name: t.name,
                      floor: "",
                      area: 50,
                      capacity: 10,
                      feature: "",
                      amenities: ["Wi-Fi", "Điều hòa"],
                      included: [],
                      images: [
                        "/images/daylight.jpg",
                        "/images/cyclorama.jpg",
                        "/images/loft.jpg",
                      ],
                      active: true,
                    })
                  }
                >
                  <Plus size={16} />
                  Thêm phòng thực tế
                </button>
                <button
                  className="text-button"
                  onClick={() => setEditType(structuredClone(t))}
                >
                  Sửa loại phòng
                </button>
              </div>
            )}
          </div>
        </details>
      ))}
      <Presence>{edit && (
        <Modal
          title={
            rooms.some((r) => r.id === edit.id)
              ? "Chỉnh sửa phòng"
              : "Thêm phòng thực tế"
          }
          onClose={() => setEdit(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (dispatch({ type: "room_save", room: edit })) setEdit(null);
            }}
          >
            <div className="form-grid">
              {(["code", "name", "floor", "feature"] as const).map((k, i) => (
                <label key={k}>
                  {
                    [
                      "Mã phòng duy nhất",
                      "Tên phòng",
                      "Tầng / vị trí",
                      "Điểm khác biệt",
                    ][i]
                  }
                  <input
                    required
                    value={edit[k]}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Diện tích (m²)
                <input
                  required
                  type="number"
                  min="1"
                  value={edit.area}
                  onChange={(e) => setEdit({ ...edit, area: +e.target.value })}
                />
              </label>
              <label>
                Sức chứa
                <input
                  required
                  type="number"
                  min="1"
                  value={edit.capacity}
                  onChange={(e) =>
                    setEdit({ ...edit, capacity: +e.target.value })
                  }
                />
              </label>
              <label>
                Giá ghi đè / giờ (để trống: theo loại)
                <input
                  type="number"
                  min="1"
                  value={edit.rateOverride ?? ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      rateOverride: e.target.value
                        ? +e.target.value
                        : undefined,
                    })
                  }
                />
              </label>
            </div>
            <button className="btn">Lưu phòng</button>
          </form>
        </Modal>
      )}</Presence>
      <Presence>{editType && (
        <Modal title="Thông tin loại phòng" onClose={() => setEditType(null)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (dispatch({ type: "type_save", roomType: editType }))
                setEditType(null);
            }}
          >
            <label>
              Tên loại phòng
              <input
                required
                value={editType.name}
                onChange={(e) =>
                  setEditType({ ...editType, name: e.target.value })
                }
              />
            </label>
            <label>
              Danh mục
              <select
                value={editType.category}
                onChange={(e) =>
                  setEditType({ ...editType, category: e.target.value })
                }
              >
                {["Chụp ảnh", "Quay phim", "Workshop", "Thu âm"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Giá theo giờ (VND)
              <input
                required
                type="number"
                min="1"
                value={editType.hourlyRate}
                onChange={(e) =>
                  setEditType({ ...editType, hourlyRate: +e.target.value })
                }
              />
            </label>
            <button className="btn">Lưu loại phòng</button>
          </form>
        </Modal>
      )}</Presence>
    </>
  );
}
function EquipmentManagement({ admin = false }: { admin?: boolean }) {
  const { state, dispatch, notice } = useStore(),
    h = useHostData();
  const list = admin ? state.equipment : h.equipment;
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [edit, setEdit] = useState<Equipment | null>(null);
  return (
    <>
      <PageHeading
        title={admin ? "Giám sát thiết bị" : "Kho thiết bị"}
        description="Kho dùng chung cho các phòng. Kiểm tra tồn theo thời gian sử dụng và 30 phút chuẩn bị."
        action={
          !admin && h.studios.length > 0 ? (
            <button
              className="btn"
              onClick={() =>
                setEdit({
                  id: crypto.randomUUID(),
                  studioId: h.studios[0].id,
                  name: "",
                  category: "Ánh sáng",
                  quantity: 1,
                  hourlyRate: 50000,
                  active: true,
                  image: "",
                  description: "",
                })
              }
            >
              <Plus size={17} />
              Thêm thiết bị
            </button>
          ) : undefined
        }
      />
      <div className="toolbar">
        <label>
          <span className="sr-only">Tìm thiết bị</span>
          <input
            placeholder="Tìm tên thiết bị…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Danh mục thiết bị</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Mọi danh mục</option>
            {[...new Set(list.map((e) => e.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Thiết bị",
                "Danh mục",
                "Tồn kho",
                "Giá / giờ",
                "Trạng thái",
                admin ? "Studio" : "Thao tác",
              ].map((x) => (
                <th key={x} scope="col">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list
              .filter(
                (e) =>
                  e.name.toLowerCase().includes(query.toLowerCase()) &&
                  (!category || e.category === category),
              )
              .map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="table-title">
                      <EquipmentVisual item={e} />
                      {e.name}
                    </div>
                  </td>
                  <td>{e.category}</td>
                  <td className="mono">{e.quantity}</td>
                  <td className="mono">{money(e.hourlyRate)}</td>
                  <td><span className={`status ${e.active ? "confirmed" : "pending"}`}>{e.active ? "Đang cho thuê" : "Tạm ngưng"}</span></td>
                  <td>
                    {admin ? (
                      state.studios.find((s) => s.id === e.studioId)?.name
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => setEdit(structuredClone(e))}
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Presence>{edit && (
        <Modal title="Thông tin thiết bị" onClose={() => setEdit(null)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (dispatch({ type: "equipment_save", equipment: edit }))
                setEdit(null);
            }}
          >
            <label>
              Tên thiết bị
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Danh mục
              <input
                required
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </label>
            <label>Mô tả công dụng<textarea maxLength={300} value={edit.description ?? ""} onChange={e => setEdit({ ...edit, description: e.target.value })} /></label>
            <label>Ảnh thiết bị thật · lưu trong trình duyệt
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 100 * 1024) { notice("Chọn PNG/JPEG/WebP tối đa 100 KB cho dữ liệu demo."); return; }
                const reader = new FileReader(); reader.onload = () => setEdit(current => current ? { ...current, image: String(reader.result) } : current); reader.readAsDataURL(file);
              }} />
            </label>
            <p className="small-text muted">Không có API tải ảnh lên server. Ảnh phòng cũ được thay bằng biểu tượng minh họa khi không có ảnh thiết bị thật.</p>
            <EquipmentVisual item={edit} />
            <button type="button" className="text-button" onClick={() => setEdit({ ...edit, image: "" })}>Bỏ ảnh thiết bị</button>
            <div className="form-grid">
              <label>
                Tổng số lượng
                <input
                  required
                  min="0"
                  type="number"
                  value={edit.quantity}
                  onChange={(e) =>
                    setEdit({ ...edit, quantity: +e.target.value })
                  }
                />
              </label>
              <label>
                Giá thuê / giờ
                <input
                  required
                  min="0"
                  type="number"
                  value={edit.hourlyRate}
                  onChange={(e) =>
                    setEdit({ ...edit, hourlyRate: +e.target.value })
                  }
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={edit.active}
                onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
              />
              Đang cho thuê
            </label>
            <button className="btn">Lưu thiết bị</button>
          </form>
        </Modal>
      )}</Presence>
    </>
  );
}
function Rates() {
  const { types } = useHostData();
  return <HostPricing types={types} />;
}
function PolicySettings() {
  const { studios } = useHostData();
  if (!studios[0])
    return (
      <Empty
        title="Chưa có Studio"
        text="Thiết lập thông tin cơ sở để cấu hình chính sách."
        href="/host/studios"
        label="Thiết lập"
      />
    );
  return <PolicyForm studio={studios[0]} />;
}
function PolicyForm({ studio }: { studio: Studio }) {
  const [policy, setPolicy] = useState<Policy>(structuredClone(studio.policy)),
    [active, setActive] = useState(studio.active),
    { dispatch, notice } = useStore();
  return (
    <>
      <PageHeading
        title="Chính sách Studio"
        description="Các thay đổi chỉ áp dụng cho đơn mới. Mỗi đơn giữ nguyên chính sách tại thời điểm đặt."
      />
      <form
        className="policy-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!window.confirm("Áp dụng chính sách cho các đơn mới?")) return;
          if (dispatch({ type: "policy", studioId: studio.id, policy })) {
            dispatch({
              type: "studio_save",
              studio: { ...studio, policy, active },
            });
            notice("Đã lưu chính sách.");
          }
        }}
      >
        <div className="form-grid">
          <label>
            Hạn thanh toán cọc (phút)
            <input
              required
              type="number"
              min="15"
              max="180"
              value={policy.paymentMinutes}
              onChange={(e) =>
                setPolicy({ ...policy, paymentMinutes: +e.target.value })
              }
            />
          </label>
          <label>
            Tỷ lệ cọc (%)
            <input
              required
              type="number"
              min="1"
              max="100"
              value={policy.depositPercent}
              onChange={(e) =>
                setPolicy({ ...policy, depositPercent: +e.target.value })
              }
            />
          </label>
          <label>
            Tự hủy trước ít nhất
            <select
              value={policy.cancelHours}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  cancelHours: +e.target.value as 24 | 48 | 72,
                })
              }
            >
              {[24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} giờ
                </option>
              ))}
            </select>
          </label>
          <label>
            Đổi lịch trước ít nhất
            <select
              value={policy.changeHours}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  changeHours: +e.target.value as 24 | 48 | 72,
                })
              }
            >
              {[24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} giờ
                </option>
              ))}
            </select>
          </label>
          <label>
            Phụ thu mỗi 30 phút (VND)
            <input
              required
              type="number"
              min="0"
              value={policy.overtimePerBlock}
              onChange={(e) =>
                setPolicy({ ...policy, overtimePerBlock: +e.target.value })
              }
            />
          </label>
          <p>Giờ hoạt động và phụ thu khung giờ được quản lý tại <Link href="/host/studios">Studio của tôi</Link>. Không thay đổi các điều khoản đã lưu trong đơn cũ.</p>
        </div>
        <h2>Các mốc hoàn cọc</h2>
        {policy.refundTiers.map((t, i) => (
          <div className="form-grid" key={i}>
            <label>
              Trước giờ thuê ít nhất (giờ)
              <input
                required
                min={policy.cancelHours}
                type="number"
                value={t.hours}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refundTiers: policy.refundTiers.map((x, j) =>
                      j === i ? { ...x, hours: +e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <label>
              Hoàn % tiền cọc
              <input
                required
                min="0"
                max="100"
                type="number"
                value={t.percent}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refundTiers: policy.refundTiers.map((x, j) =>
                      j === i ? { ...x, percent: +e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
          </div>
        ))}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Mở nhận đặt thuê cho Studio
        </label>
        <button className="btn">Lưu chính sách</button>
        <p className="small-text muted">
          Giá, tỷ lệ và chính sách hiện tại là cấu hình minh họa, không phải
          chính sách thương mại mặc định.
        </p>
      </form>
    </>
  );
}
function Reports() {
  const { bookings, rooms } = useHostData();
  const { state } = useStore();
  return (
    <>
      <PageHeading
        title="Hoạt động & công nợ"
        description="Số liệu tính từ cùng bộ đơn minh họa. Cọc, khoản thu và hoàn tiền được ghi nhận riêng."
      />
      <DashboardKpis>
        {[
          [
            "Tiền cọc đã nhận",
            bookings
              .filter((b) => b.payment === "paid")
              .reduce((s, b) => s + b.deposit, 0),
          ],
          [
            "Thu bổ sung",
            bookings.reduce(
              (s, b) => s + b.collections.reduce((n, c) => n + c.amount, 0),
              0,
            ),
          ],
          [
            "Đã hoàn tiền",
            bookings
              .filter((b) => b.refund.status === "refunded")
              .reduce((s, b) => s + b.refund.amount, 0),
          ],
          [
            "Công nợ ca đã dùng",
            bookings
              .filter((b) => ["completed", "checked_in"].includes(b.status))
              .reduce((s, b) => s + balance(b), 0),
          ],
        ].map(([l, v], index) => (
          <DashboardKpi key={l} label={String(l)} value={money(Number(v))}
            icon={[Wallet, CircleDollarSign, RotateCcw, CircleDollarSign][index]}
            accent={(["cyan", "blue", "lilac", "yellow"] as const)[index]}
            hint={["Khoản cọc của đơn đã thanh toán", "Các khoản thu bổ sung đã ghi nhận", "Khoản hoàn đã thực hiện", "Ca đang dùng hoặc đã hoàn thành"][index]} />
        ))}
      </DashboardKpis>
      <BookingAnalytics bookings={bookings} now={state.now} />
      <RoomPopularity state={state} rooms={rooms} />
      <h2 id="host-reconciliation">Đối soát theo đơn</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Mã đơn",
                "Phòng",
                "Trạng thái",
                "Tiền thuê",
                "Cọc đã trả",
                "Còn phải thu",
              ].map((x) => (
                <th scope="col" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/host/bookings/${b.id}`}>{b.id}</Link>
                </td>
                <td>{b.roomId.toUpperCase()}</td>
                <td><span className="status" data-booking-status={b.status}>{statusLabel[b.status]}</span></td>
                <td>{money(b.total)}</td>
                <td>{money(b.payment === "paid" ? b.deposit : 0)}</td>
                <td>
                  {["checked_in", "completed"].includes(b.status)
                    ? money(balance(b))
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function AdminSurface({ path }: { path: string }) {
  if (path === "host-requests") return <HostApprovals />;
  if (path === "users") return <UsersTable />;
  if (path === "studios") return <RoomManagement admin />;
  if (path === "equipments") return <EquipmentManagement admin />;
  if (path === "audit-logs") return <Audit />;
  if (path === "refunds") return <RefundExceptions />;
  if (path === "roles")
    return (
      <>
        <PageHeading
          title="Phạm vi quyền truy cập"
          description="Quyền của các vai trò trong giai đoạn frontend mô phỏng. Việc kiểm soát an toàn phía máy chủ thuộc giai đoạn tiếp theo."
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Vai trò</th>
                <th scope="col">Được thực hiện</th>
                <th scope="col">Giới hạn</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Khách hàng</td>
                <td>Đặt phòng, thanh toán cọc, hủy / đổi đơn hợp lệ</td>
                <td>Chỉ đơn của mình; không tự duyệt thay đổi</td>
              </tr>
              <tr>
                <td>Chủ Studio</td>
                <td>
                  Quản lý Studio, phòng, kho, giá; vận hành đơn và ghi thu
                </td>
                <td>Chỉ dữ liệu Studio sở hữu</td>
              </tr>
              <tr>
                <td>Admin</td>
                <td>
                  Duyệt Host, hạn chế / khôi phục tài khoản, giám sát, audit
                </td>
                <td>
                  Không sửa giá Host; chỉ hủy đơn trước giờ bắt đầu, có lý do
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  if (path)
    return (
      <Empty
        title="Không tìm thấy trang"
        text="Chọn một chức năng từ thanh điều hướng."
        href="/admin"
        label="Tổng quan"
      />
    );
  return <AdminOverview />;
}
function AdminOverview() {
  const { state } = useStore();
  return (
    <>
      <PageHeading
        title="Tổng quan hệ thống"
        description="Giám sát vận hành, đối tác và các trường hợp cần xử lý · Dữ liệu minh họa."
      />
      <DashboardKpis>
        <DashboardKpi label="Hồ sơ chờ duyệt" value={state.applications.filter(a => a.status === "pending").length} hint="Kiểm tra hồ sơ trước khi cấp quyền" icon={UserCheck} accent="yellow" href="/admin/host-requests" />
        <DashboardKpi label="Studio" value={state.studios.length} hint={`${state.studios.filter(s => s.active).length} cơ sở đang hoạt động`} icon={Building2} accent="blue" href="/admin/studios" />
        <DashboardKpi label="Tài khoản" value={state.users.length} hint="Khách hàng, chủ Studio & quản trị" icon={Users} accent="lilac" href="/admin/users" />
        <DashboardKpi label="Tạm ngưng đặt thuê" value={state.users.filter(u => u.restricted).length} hint="Quản lý riêng với khóa đăng nhập" icon={ShieldCheck} accent="coral" href="/admin/users" />
      </DashboardKpis>
      <div className="ops-columns">
        <DashboardPanel title="Cần xem xét" eyebrow="Hàng đợi quản trị">
          <Link className="task-row" href="/admin/host-requests">
            <div>
              <h3>Hồ sơ đối tác</h3>
              <p className="muted">
                {
                  state.applications.filter((a) => a.status === "pending")
                    .length
                }{" "}
                hồ sơ đang chờ xét duyệt
              </p>
            </div>
            <ArrowUpRight size={20} />
          </Link>
          <Link className="task-row" href="/admin/refunds">
            <div>
              <h3>Ngoại lệ hoàn tiền</h3>
              <p className="muted">
                {
                  state.bookings.filter(
                    (b) => b.refund.escalated || b.reconciliation,
                  ).length
                }{" "}
                giao dịch cần đối soát
              </p>
            </div>
            <ArrowUpRight size={20} />
          </Link>
        </DashboardPanel>
        <DashboardPanel title="Đơn đặt thuê toàn hệ thống" eyebrow={`${state.bookings.length} đơn trong dữ liệu minh họa`}>
          {state.bookings.map((b) => (
            <Link
              className="task-row"
              key={b.id}
              href={`/admin/bookings/${b.id}`}
            >
              <div>
                <span className="mono">{b.id}</span>
                <p>
                  {state.rooms.find(room => room.id === b.roomId)?.code ?? b.roomId} · <span className="status" data-booking-status={b.status}>{statusLabel[b.status]}</span>
                </p>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </DashboardPanel>
      </div>
      <BookingAnalytics bookings={state.bookings} now={state.now} />
      <DashboardPanel title="Hoạt động gần đây" eyebrow="Nhật ký chỉ đọc" action={<Link className="text-link" href="/admin/audit-logs">Xem nhật ký <ArrowRight size={15} /></Link>}>
        {state.audit.slice(-4).reverse().map(event => <div key={event.id} className="dashboard-audit-row"><time className="mono" dateTime={new Date(event.at).toISOString()}>{dateTime(event.at)}</time><strong>{event.action}</strong><span>{state.users.find(user => user.id === event.actorId)?.name ?? "Hệ thống"}</span><span className="mono muted">{event.target}</span></div>)}
        {!state.audit.length && <p className="dashboard-empty">Chưa có hoạt động được ghi nhận.</p>}
      </DashboardPanel>
    </>
  );
}
function HostApprovals() {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState(state.applications[0]?.id ?? ""),
    [reason, setReason] = useState("");
  const app = state.applications.find((a) => a.id === selected);
  return (
    <>
      <PageHeading
        title="Xét duyệt đối tác"
        description="Kiểm tra hồ sơ trước khi cấp quyền quản lý Studio."
      />
      <div className="approval-layout">
        <div className="application-list">
          {state.applications.map((a) => (
            <button
              className={a.id === selected ? "active" : ""}
              key={a.id}
              onClick={() => setSelected(a.id)}
            >
              <strong>{a.studioName}</strong>
              <span>{state.users.find((u) => u.id === a.userId)?.name}</span>
              <small>
                {a.status === "pending"
                  ? "Chờ xét duyệt"
                  : a.status === "approved"
                    ? "Đã duyệt"
                    : "Đã từ chối"}
              </small>
            </button>
          ))}
        </div>
        {app ? (
          <section className="application-detail">
            <span className="mono muted">{app.id}</span>
            <h2>{app.studioName}</h2>
            <p>{app.address}</p>
            <p>{app.description}</p>
            <div className="note">
              <strong>Người đăng ký</strong>
              <p>{state.users.find((u) => u.id === app.userId)?.name}</p>
              <p>{state.users.find((u) => u.id === app.userId)?.email}</p>
            </div>
            {app.status === "pending" ? (
              <>
                <label>
                  Ghi chú / lý do từ chối
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div className="actions">
                  <button
                    className="btn"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Duyệt hồ sơ ${app.studioName} và cấp quyền Host?`,
                        )
                      )
                        dispatch({
                          type: "review_application",
                          id: app.id,
                          approved: true,
                          reason,
                        });
                    }}
                  >
                    Duyệt đối tác
                  </button>
                  <button
                    className="btn secondary"
                    disabled={!reason.trim()}
                    onClick={() => {
                      if (window.confirm(`Từ chối hồ sơ ${app.studioName}?`)) dispatch({
                        type: "review_application",
                        id: app.id,
                        approved: false,
                        reason,
                      });
                    }}
                  >
                    Từ chối hồ sơ
                  </button>
                </div>
              </>
            ) : (
              <p>
                {app.status === "approved"
                  ? "Đã cấp quyền Host. Đối tác tiếp tục thiết lập Studio."
                  : "Lý do: " + app.reason}
              </p>
            )}
            <h3 className="subheading">Lịch sử xử lý</h3>
            {state.audit
              .filter((e) => e.target === app.id)
              .map((e) => (
                <p key={e.id}>
                  {dateTime(e.at)} · {e.action} · {e.reason}
                </p>
              ))}
          </section>
        ) : (
          <Empty
            title="Chưa có hồ sơ"
            text="Hồ sơ đăng ký mới sẽ xuất hiện tại đây."
          />
        )}
      </div>
    </>
  );
}
function UsersTable() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState(""),
    [role, setRole] = useState(""),
    [selected, setSelected] = useState(""),
    [reason, setReason] = useState("");
  return (
    <>
      <PageHeading
        title="Tài khoản"
        description="Tạm ngưng quyền đặt thuê khác với khóa đăng nhập. Khôi phục sẽ đặt lại bộ đếm, giữ lịch sử vi phạm."
      />
      {state.supportRequests
        ?.filter((r) => r.status === "pending")
        .map((r) => (
          <div className="note" key={r.id}>
            <strong>
              Yêu cầu khôi phục ·{" "}
              {state.users.find((u) => u.id === r.userId)?.name}
            </strong>
            <p>{r.reason}</p>
            <button
              className="btn secondary"
              onClick={() => {
                setSelected(r.userId);
                setReason("Đã xem xét yêu cầu: " + r.reason);
              }}
            >
              Xem xét tài khoản
            </button>
          </div>
        ))}
      <div className="toolbar">
        <label>
          <span className="sr-only">Tìm tài khoản</span>
          <input
            placeholder="Tìm tên hoặc email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Vai trò</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Mọi vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="host">Chủ Studio</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Tài khoản",
                "Vai trò",
                "Đặt thuê",
                "Đăng nhập",
                "Vi phạm hiệu lực",
                "Thao tác",
              ].map((x) => (
                <th scope="col" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.users
              .filter(
                (u) =>
                  (u.name + u.email)
                    .toLowerCase()
                    .includes(query.toLowerCase()) &&
                  (!role || u.role === role),
              )
              .map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>{u.role}</td>
                  <td><span className={`status ${u.restricted ? "pending" : "confirmed"}`}>{u.restricted ? "Tạm ngưng" : "Được phép"}</span></td>
                  <td><span className={`status ${u.locked ? "cancelled" : "confirmed"}`}>{u.locked ? "Đã khóa" : "Hoạt động"}</span></td>
                  <td className="mono">
                    {u.strikes.filter((s) => s.active).length} / 3{" "}
                    <small>{u.strikes.length} trong lịch sử</small>
                  </td>
                  <td>
                    {u.role !== "admin" && (
                      <button
                        className="text-button"
                        onClick={() => setSelected(u.id)}
                      >
                        Xử lý tài khoản
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Presence>{selected && (
        <Modal title="Xử lý tài khoản" onClose={() => setSelected("")}>
          <div className="modal-form">
            <p>
              Thay đổi quyền của{" "}
              {state.users.find((u) => u.id === selected)?.name}. Mọi thao tác
              được ghi audit.
            </p>
            <label>
              Lý do
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </label>
            <div className="stack-actions">
              {(
                [
                  ["restrict", "Tạm ngưng đặt thuê"],
                  ["lock", "Khóa đăng nhập"],
                  ["restore", "Khôi phục & đặt lại vi phạm"],
                ] as const
              ).map(([type, label]) => (
                <button
                  className="btn secondary"
                  disabled={!reason.trim()}
                  key={type}
                  onClick={() => {
                    if (dispatch({ type, userId: selected, reason })) {
                      setSelected("");
                      setReason("");
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}</Presence>
    </>
  );
}
function Audit() {
  const { state } = useStore();
  const [query, setQuery] = useState(""),
    [actor, setActor] = useState(""),
    [date, setDate] = useState("");
  return (
    <>
      <PageHeading
        title="Nhật ký hoạt động"
        description="Lịch sử hành động dùng chung giữa các vai trò. Nhật ký không thể sửa hoặc xóa tại đây."
      />
      <div className="toolbar">
        <label>
          <span className="sr-only">Tìm hành động hoặc đối tượng</span>
          <input
            placeholder="Tìm hành động / đối tượng…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Người thực hiện</span>
          <select value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">Mọi người thực hiện</option>
            <option value="system">Hệ thống</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Ngày hoạt động</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Thời điểm",
                "Người thực hiện",
                "Hành động",
                "Đối tượng",
                "Lý do / trước → sau",
              ].map((x) => (
                <th key={x} scope="col">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.audit
              .filter(
                (e) =>
                  (e.action + e.target + e.reason)
                    .toLowerCase()
                    .includes(query.toLowerCase()) &&
                  (!actor || e.actorId === actor) &&
                  (!date || localDate(e.at) === date),
              )
              .slice()
              .reverse()
              .map((e) => (
                <tr key={e.id}>
                  <td className="mono">{dateTime(e.at)}</td>
                  <td>
                    {state.users.find((u) => u.id === e.actorId)?.name ??
                      "Hệ thống"}
                  </td>
                  <td className="mono">{e.action}</td>
                  <td className="mono">{e.target}</td>
                  <td>
                    {e.reason}
                    <small>{e.before && `${e.before} → ${e.after}`}</small>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!state.audit.length && (
        <Empty
          title="Chưa có hoạt động"
          text="Thử tạo đơn, duyệt đối tác hoặc thay đổi trạng thái để xem nhật ký."
        />
      )}
    </>
  );
}
function RefundExceptions() {
  const { state } = useStore();
  return (
    <>
      <PageHeading
        title="Ngoại lệ & đối soát"
        description="Giao dịch chưa rõ kết quả không được retry để tránh hoàn trùng. Các khoản đã thất bại 3 lần được chuyển xử lý thủ công."
      />
      {state.bookings
        .filter((b) => b.refund.escalated || b.reconciliation)
        .map((b) => (
          <Link
            key={b.id}
            className="task-row"
            href={`/admin/bookings/${b.id}`}
          >
            <div>
              <h3>{b.id}</h3>
              <p>
                {b.reconciliation
                  ? "Thanh toán cần đối soát"
                  : "Hoàn tiền thất bại sau 2 lượt retry"}
              </p>
              <small>
                {money(b.refund.amount)} · {b.refund.attempts.length} lần thử
              </small>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      {!state.bookings.some((b) => b.refund.escalated || b.reconciliation) && (
        <Empty
          title="Chưa có ngoại lệ cần xử lý"
          text="Khoản hoàn lỗi hoặc giao dịch chưa rõ kết quả sẽ xuất hiện tại đây."
        />
      )}
    </>
  );
}
