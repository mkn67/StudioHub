"use client";
import { Presence, MotionSurface, useContentMotion } from "./motion/system";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  LayoutDashboard, Building2, DoorOpen, Boxes, Tag, CalendarDays,
  ClipboardList, BarChart3, Settings, Users, UserCheck, ShieldCheck,
  ReceiptText, ScrollText, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useStore, useSession } from "./store";
import { PageHeading, Empty, Modal } from "./ui";
import { BookingDetail } from "./bookings";
import {
  money,
  dateTime,
  statusLabel,
  localDate,
  atDate,
  planLabel,
  type Equipment,
  type Room,
  type RoomType,
  type Policy,
  type Plan,
  type Studio,
} from "@/domain/models";
import { balance, HOUR, activeStatuses, studioFor } from "@/domain/engine";
import { FeaturedPricingManager } from "@/features/pricing/components/FeaturedPricingManager";
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
    { state } = useStore();
  const [collapsed, setCollapsed] = useState(false);
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
  return (
    <div className={`ops-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <aside className="ops-nav">
        <div className="ops-title">
          <span>{role === "host" ? "Không gian làm việc" : "Quản trị hệ thống"}</span>
          <button className="icon-button nav-collapse" aria-label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav>
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
                <span>
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
          <p>{user.name}</p>
          <small>Dữ liệu minh họa</small>
          <Link href="/rooms">
            Xem marketplace <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <main id="main-content" className="ops-main" tabIndex={-1}><MotionSurface operational>
        {segments[0] === "bookings" && segments[1] ? (
          <BookingDetail id={segments[1]} />
        ) : role === "host" ? (
          <HostSurface path={path} />
        ) : (
          <AdminSurface path={path} />
        )}
      </MotionSurface></main>
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
    { studios, bookings } = useHostData();
  const pending = bookings.filter((b) => b.status === "pending"),
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
        title="Một ngày sáng tạo mới."
        description={`${new Date(state.now).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "long" })} · ${studios[0].name}`}
        action={
          <Link className="btn secondary" href="/host/calendar">
            Xem lịch phòng
            <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="metrics">
        {[
          ["Chờ xác nhận", String(pending.length)],
          ["Ca thuê hôm nay", String(today.length)],
          [
            "Đã thu trong tháng",
            money(
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
            ),
          ],
          [
            "Công nợ đã sử dụng",
            money(
              bookings
                .filter((b) => ["completed", "checked_in"].includes(b.status))
                .reduce((s, b) => s + balance(b), 0),
            ),
          ],
        ].map(([l, v]) => (
          <div key={l}>
            <span className="muted">{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="ops-columns">
        <section>
          <div className="section-head compact">
            <h2>Cần bạn xác nhận</h2>
            <Link className="text-link" href="/host/bookings">
              Tất cả đơn
              <ArrowRight size={15} />
            </Link>
          </div>
          {pending.map((b) => (
            <Link
              className="task-row"
              href={`/host/bookings/${b.id}`}
              key={b.id}
            >
              <div>
                <span className="mono">{b.id}</span>
                <h3>
                  {b.roomId.toUpperCase()} ·{" "}
                  {state.users.find((u) => u.id === b.customerId)?.name}
                </h3>
                <small>
                  {dateTime(b.start)} — {dateTime(b.end)}
                </small>
              </div>
              <div>
                <small>Phản hồi trước</small>
                <strong className="mono">
                  {dateTime((b.paidAt ?? 0) + 2 * HOUR)}
                </strong>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
          {!pending.length && (
            <p className="muted">Bạn đã xử lý hết đơn chờ duyệt.</p>
          )}
          <h2 className="subheading">Ca thuê hôm nay</h2>
          {today.map((b) => (
            <Link
              className="task-row"
              href={`/host/bookings/${b.id}`}
              key={b.id}
            >
              <div>
                <h3>
                  {b.roomId.toUpperCase()} · {statusLabel[b.status]}
                </h3>
                <span>
                  {dateTime(b.start)} — {dateTime(b.end)}
                </span>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
          {!today.length && <p className="muted">Hôm nay chưa có ca thuê.</p>}
        </section>
        <section className="note">
          <h3>Việc vận hành cần nhớ</h3>
          <p>
            Phản hồi trong 2 giờ từ khi nhận cọc. Quá hạn, đơn tự hủy và hoàn
            100% cọc.
          </p>
          <p>
            Check-in và trả phòng được xác nhận thủ công. Đơn đã trả có thể còn
            công nợ.
          </p>
          <Link className="text-link" href="/host/settings">
            Xem chính sách Studio
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <Calendar compact />
    </>
  );
}
function Kanban() {
  const { state } = useStore(),
    { bookings } = useHostData();
  const [history, setHistory] = useState(false),
    [query, setQuery] = useState("");
  const boardRef = useContentMotion(`${history}|${query}|${bookings.map(b=>`${b.id}:${b.status}`).join()}`);
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
      <div ref={boardRef} className="kanban">
        {statuses.map((status) => (
          <section className="kanban-column" key={status}>
            <h3>
              {statusLabel[status]}
              <span>{bookings.filter((b) => b.status === status).length}</span>
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
                  <span className="mono muted">{b.id}</span>
                  <h3>
                    {b.roomId.toUpperCase()} ·{" "}
                    {state.rooms.find((r) => r.id === b.roomId)?.name}
                  </h3>
                  <p>{state.users.find((u) => u.id === b.customerId)?.name}</p>
                  <p className="mono small-text">
                    {dateTime(b.start)}
                    <br />
                    {dateTime(b.end)}
                  </p>
                  <div className="line-item">
                    <span>Cọc</span>
                    <strong>{money(b.deposit)}</strong>
                  </div>
                  {b.status === "completed" && balance(b) > 0 && (
                    <small className="warning">
                      Còn phải thu {money(balance(b))}
                    </small>
                  )}
                </Link>
              ))}
            {!bookings.some((b) => b.status === status) && (
              <p className="muted small-text">Chưa có đơn</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
function Calendar({ compact = false }: { compact?: boolean }) {
  const { state } = useStore(),
    { rooms, bookings, types } = useHostData();
  const [view, setView] = useState("week"),
    [date, setDate] = useState(localDate(state.now)),
    [room, setRoom] = useState(rooms[0]?.id ?? ""),
    [status, setStatus] = useState("all"),
    [typeId, setTypeId] = useState("");
  const gridRef = useContentMotion<HTMLDivElement>(`${view}|${date}|${room}|${status}|${typeId}`);
  const day = atDate(date, 0),
    dow = (new Date(day + 7 * HOUR).getUTCDay() + 6) % 7;
  const columns =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => ({
          key: String(i),
          title: new Date(day + (i - dow) * 24 * HOUR).toLocaleDateString(
            "vi-VN",
            {
              timeZone: "Asia/Ho_Chi_Minh",
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            },
          ),
          start: day + (i - dow) * 24 * HOUR,
          roomId: room,
        }))
      : rooms
          .filter((r) => !typeId || r.typeId === typeId)
          .map((r) => ({
            key: r.id,
            title: r.code,
            start: day,
            roomId: r.id,
          }));
  return (
    <section className={compact ? "calendar-preview" : ""}>
      {!compact && (
        <PageHeading
          title="Lịch đặt phòng"
          description="Thời gian thực tế của từng phòng · vùng gạch là 30 phút chuẩn bị."
        />
      )}
      <div className="toolbar">
        <div className="actions">
          <label>
            <span className="sr-only">Loại phòng</span>
            <select
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                const first = rooms.find(
                  (r) => !e.target.value || r.typeId === e.target.value,
                );
                if (first) setRoom(first.id);
              }}
            >
              <option value="">Mọi loại phòng</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Kỳ trước"
            className="icon-button"
            onClick={() =>
              setDate(localDate(day - (view === "week" ? 7 : 1) * 24 * HOUR))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            <span className="sr-only">Ngày xem lịch</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button
            aria-label="Kỳ tiếp"
            className="icon-button"
            onClick={() =>
              setDate(localDate(day + (view === "week" ? 7 : 1) * 24 * HOUR))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="actions">
          <label>
            <span className="sr-only">Chế độ lịch</span>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="week">Tuần</option>
              <option value="day">Ngày</option>
            </select>
          </label>
          {view === "week" && (
            <label>
              <span className="sr-only">Phòng</span>
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {rooms
                  .filter((r) => !typeId || r.typeId === typeId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            <span className="sr-only">Trạng thái đơn</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Mọi trạng thái giữ chỗ</option>
              {activeStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="table-scroll">
        <div
          ref={gridRef}
          className="timetable"
          style={{
            minWidth: Math.max(750, columns.length * 130),
            gridTemplateColumns: `56px repeat(${columns.length}, 1fr)`,
          }}
        >
          <div className="time-axis">
            <div className="calendar-column-title">Giờ</div>
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} style={{ top: 42 + i * 48 }}>
                {String(i + 8).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {columns.map((c) => (
            <div className="calendar-day" key={c.key}>
              <div className="calendar-column-title">{c.title}</div>
              <div className="calendar-hours">
                {Array.from({ length: 14 }, (_, i) => (
                  <div className="calendar-hour" key={i} />
                ))}
                {bookings
                  .filter(
                    (b) =>
                      b.roomId === c.roomId &&
                      localDate(b.start) === localDate(c.start) &&
                      activeStatuses.includes(b.status) &&
                      (status === "all" || status === b.status),
                  )
                  .map((b) => (
                    <Link
                      key={b.id}
                      href={`/host/bookings/${b.id}`}
                      className={`calendar-event ${b.status}`}
                      style={{
                        top: ((b.start - (c.start + 8 * HOUR)) / HOUR) * 48,
                        height: ((b.end - b.start) / HOUR) * 48,
                      }}
                    >
                      <strong>{b.roomId.toUpperCase()}</strong>
                      <small>
                        {new Date(b.start).toLocaleTimeString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        —
                        {new Date(b.end).toLocaleTimeString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                      <span className="calendar-buffer" />
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
  const { state, dispatch } = useStore(),
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
                  image: "/images/cyclorama.jpg",
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
                      <Image width={1400} height={1000} src={e.image} alt="" />
                      {e.name}
                    </div>
                  </td>
                  <td>{e.category}</td>
                  <td className="mono">{e.quantity}</td>
                  <td className="mono">{money(e.hourlyRate)}</td>
                  <td>{e.active ? "Đang cho thuê" : "Tạm ngưng"}</td>
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
  const { types } = useHostData(),
    { dispatch, notice } = useStore();
  return (
    <>
      <PageHeading
        title="Bảng giá thuê"
        description="Giá mặc định theo loại phòng; giá riêng của phòng được cấu hình tại quản lý phòng. Gói minh họa tính theo số giờ, không tự thêm chiết khấu."
      />
      {types.map((t) => (
        <div key={t.id}>
          <RateForm
            type={t}
            save={(rate, plans) => {
              if (dispatch({ type: "rate", id: t.id, hourlyRate: rate, plans }))
                notice("Đã cập nhật bảng giá cho các đơn mới.");
            }}
          />
          <FeaturedPricingManager typeId={t.id} />
        </div>
      ))}
    </>
  );
}
function RateForm({
  type,
  save,
}: {
  type: RoomType;
  save: (rate: number, plans: Plan[]) => void;
}) {
  const [rate, setRate] = useState(type.hourlyRate),
    [plans, setPlans] = useState(type.plans);
  return (
    <form
      className="rate-form"
      onSubmit={(e) => {
        e.preventDefault();
        save(rate, plans);
      }}
    >
      <div>
        <h2>{type.name}</h2>
        <label>
          Đơn giá theo giờ (VND)
          <input
            required
            type="number"
            min="1"
            value={rate}
            onChange={(e) => setRate(+e.target.value)}
          />
        </label>
      </div>
      <fieldset>
        <legend>Gói cho phép</legend>
        <div className="plan-checks">
          {(Object.keys(planLabel) as Plan[]).map((p) => (
            <label className="checkbox-label" key={p}>
              <input
                type="checkbox"
                checked={plans.includes(p)}
                onChange={(e) =>
                  setPlans(
                    e.target.checked
                      ? [...plans, p]
                      : plans.filter((x) => x !== p),
                  )
                }
              />
              {planLabel[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn secondary">Lưu bảng giá</button>
    </form>
  );
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
          <label>
            Giờ mở cửa
            <input
              required
              type="number"
              min="0"
              max="23"
              value={policy.openHour}
              onChange={(e) =>
                setPolicy({ ...policy, openHour: +e.target.value })
              }
            />
          </label>
          <label>
            Giờ đóng cửa
            <input
              required
              type="number"
              min="1"
              max="24"
              value={policy.closeHour}
              onChange={(e) =>
                setPolicy({ ...policy, closeHour: +e.target.value })
              }
            />
          </label>
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
  const { bookings } = useHostData();
  return (
    <>
      <PageHeading
        title="Hoạt động & công nợ"
        description="Số liệu tính từ cùng bộ đơn minh họa. Cọc, khoản thu và hoàn tiền được ghi nhận riêng."
      />
      <div className="metrics">
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
        ].map(([l, v]) => (
          <div key={l}>
            <span className="muted">{l}</span>
            <strong>{money(Number(v))}</strong>
          </div>
        ))}
      </div>
      <h2>Đối soát theo đơn</h2>
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
                <td>{statusLabel[b.status]}</td>
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
      <div className="metrics">
        {[
          ["Tài khoản", state.users.length],
          ["Studio", state.studios.length],
          [
            "Hồ sơ chờ duyệt",
            state.applications.filter((a) => a.status === "pending").length,
          ],
          [
            "Tạm ngưng đặt thuê",
            state.users.filter((u) => u.restricted).length,
          ],
        ].map(([l, v]) => (
          <div key={l}>
            <span className="muted">{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="ops-columns">
        <section>
          <h2>Cần xem xét</h2>
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
        </section>
        <section>
          <h2>Đơn đặt thuê toàn hệ thống</h2>
          {state.bookings.map((b) => (
            <Link
              className="task-row"
              key={b.id}
              href={`/admin/bookings/${b.id}`}
            >
              <div>
                <span className="mono">{b.id}</span>
                <p>
                  {b.roomId.toUpperCase()} · {statusLabel[b.status]}
                </p>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </section>
      </div>
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
                    onClick={() =>
                      dispatch({
                        type: "review_application",
                        id: app.id,
                        approved: false,
                        reason,
                      })
                    }
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
                  <td>{u.restricted ? "Tạm ngưng" : "Được phép"}</td>
                  <td>{u.locked ? "Đã khóa" : "Hoạt động"}</td>
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
