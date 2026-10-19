"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  DoorOpen,
  Lamp,
  Tags,
  ChartNoAxesCombined,
  Settings,
  Users,
  ClipboardCheck,
  Building2,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Search,
} from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { AccessGuard } from "@/features/auth/guard";
import { Logo, AccountMenu } from "./navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/common";
import { displayStatus } from "@/domain/booking";
import { normalize } from "@/lib/format";
const StudioContext = createContext({
  studioId: "all",
  selectStudio: (_id: string) => {
    void _id;
  },
});
export const useStudio = () => useContext(StudioContext);
const hostNav = [
  { href: "/host", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/host/bookings", label: "Đơn thuê", Icon: CalendarDays },
  { href: "/host/calendar", label: "Lịch đặt", Icon: CalendarRange },
  { href: "/host/rooms", label: "Phòng", Icon: DoorOpen },
  { href: "/host/equipment", label: "Thiết bị", Icon: Lamp },
  { href: "/host/pricing", label: "Bảng giá", Icon: Tags },
  { href: "/host/analytics", label: "Thống kê", Icon: ChartNoAxesCombined },
  { href: "/host/studio/settings", label: "Thông tin Studio", Icon: Settings },
];
const adminNav = [
  { href: "/admin", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/admin/approvals", label: "Duyệt Chủ Studio", Icon: ClipboardCheck },
  { href: "/admin/users", label: "Tài khoản", Icon: Users },
  { href: "/admin/studios", label: "Studio & Phòng", Icon: Building2 },
  { href: "/admin/categories", label: "Danh mục", Icon: Tags },
  { href: "/admin/bookings", label: "Đơn thuê", Icon: CalendarDays },
  { href: "/admin/audit", label: "Nhật ký hoạt động", Icon: ListChecks },
];
function GlobalSearch() {
  const { db } = useApp();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const q = normalize(query);
  const groups =
    !db || q.length < 2
      ? []
      : [
          {
            label: "Tài khoản",
            items: db.users
              .filter((x) =>
                normalize(`${x.name} ${x.id} ${x.email}`).includes(q),
              )
              .slice(0, 5)
              .map((x) => ({
                id: x.id,
                name: x.name,
                detail: x.email,
                href: `/admin/users/${x.id}`,
              })),
          },
          {
            label: "Studio",
            items: db.studios
              .filter((x) =>
                normalize(`${x.name} ${x.id} ${x.address}`).includes(q),
              )
              .slice(0, 5)
              .map((x) => ({
                id: x.id,
                name: x.name,
                detail: x.address,
                href: `/admin/studios/${x.id}`,
              })),
          },
          {
            label: "Phòng",
            items: db.rooms
              .filter((x) =>
                normalize(`${x.name} ${x.id} ${x.code}`).includes(q),
              )
              .slice(0, 5)
              .map((x) => ({
                id: x.id,
                name: x.name,
                detail: x.code,
                href: `/admin/studios/${x.studioId}`,
              })),
          },
          {
            label: "Đơn thuê",
            items: db.bookings
              .filter((x) =>
                normalize(
                  `${x.code} ${x.contact.name} ${x.snapshot.roomName}`,
                ).includes(q),
              )
              .slice(0, 5)
              .map((x) => ({
                id: x.id,
                name: x.code,
                detail: x.snapshot.roomName,
                href: `/admin/bookings/${x.code}`,
              })),
          },
        ];
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="global-search-trigger"
          aria-label="Tìm kiếm toàn hệ thống"
        >
          <Search size={17} />
          <span>Tìm tài khoản, Studio, đơn thuê…</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          const links = Array.from(
            e.currentTarget.querySelectorAll<HTMLAnchorElement>(
              "[data-search-result]",
            ),
          );
          if (!links.length) return;
          e.preventDefault();
          const current = links.findIndex((l) => l === document.activeElement);
          links[
            (current + (e.key === "ArrowDown" ? 1 : -1) + links.length) %
              links.length
          ].focus();
        }}
      >
        <DialogTitle>Tìm kiếm toàn hệ thống</DialogTitle>
        <DialogDescription>
          Nhập ít nhất hai ký tự. Dùng phím mũi tên để duyệt kết quả.
        </DialogDescription>
        <Input
          autoFocus
          aria-label="Từ khóa tìm kiếm toàn hệ thống"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="field-hint" role="status">
          {q.length < 2
            ? "Nhập tên, mã hoặc email."
            : `${count} kết quả được hiển thị`}
        </p>
        <div className="global-search-results">
          {groups
            .filter((g) => g.items.length)
            .map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                {group.items.map((item) => (
                  <Link
                    data-search-result
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </Link>
                ))}
              </section>
            ))}
          {q.length >= 2 && !count && <p>Không có kết quả phù hợp.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function DashboardInner({
  role,
  children,
}: {
  role: "host" | "admin";
  children: ReactNode;
}) {
  const { db, user, now, service } = useApp(),
    path = usePathname();
  const [collapsed, setCollapsed] = useState(
      () => service.preference("sidebar.collapsed", z.boolean()) ?? false,
    ),
    [drawer, setDrawer] = useState(false),
    [selected, setSelected] = useState(
      () => service.preference("studio", z.string()) ?? "all",
    );
  const studios = db?.studios.filter((s) => s.ownerId === user?.id) ?? [];
  const bookingCode = path.match(/^\/host\/bookings\/([^/]+)$/)?.[1];
  const deepStudio = db?.bookings.find(
    (b) => b.code === bookingCode && b.ownerId === user?.id,
  )?.studioId;
  const studioId =
    deepStudio ??
    (studios.length === 1
      ? studios[0].id
      : studios.some((s) => s.id === selected)
        ? selected
        : "all");
  function selectStudio(id: string) {
    setSelected(id);
    service.setPreference("studio", id);
  }
  const nav = role === "host" ? hostNav : adminNav;
  const pending =
    db?.bookings.filter(
      (b) =>
        b.ownerId === user?.id &&
        (studioId === "all" || b.studioId === studioId) &&
        displayStatus(b, now) === "pending-confirmation",
    ).length ?? 0;
  const allAllowed = ["/host", "/host/bookings", "/host/analytics"].includes(
    path,
  );
  function sidebar(mobile = false) {
    return (
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <Logo />
        </div>
        <p className="sidebar-role">
          {role === "host" ? "QUẢN LÝ STUDIO" : "QUẢN TRỊ"}
        </p>
        {role === "host" && (
          <div className="studio-switcher">
            {studios.length === 1 ? (
              <p title={studios[0].name}>{studios[0].name}</p>
            ) : (
              <>
                <label
                  htmlFor={
                    mobile ? "mobile-studio-switcher" : "studio-switcher"
                  }
                >
                  Studio đang xem
                </label>
                <Select
                  id={mobile ? "mobile-studio-switcher" : "studio-switcher"}
                  value={studioId}
                  onChange={(e) => selectStudio(e.target.value)}
                >
                  <option value="all">
                    {allAllowed ? "Tất cả Studio" : "Chọn một Studio"}
                  </option>
                  {studios.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </>
            )}
          </div>
        )}
        <nav
          aria-label={
            role === "host" ? "Điều hướng Chủ Studio" : "Điều hướng Quản trị"
          }
        >
          {nav.map(({ href, label, Icon }, i) => {
            const active =
              path === href ||
              (href !== `/${role}` && path.startsWith(`${href}/`));
            return (
              <Link
                href={href}
                key={href}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={`${active ? "active" : ""} ${role === "host" && i === 7 ? "sidebar-settings" : ""}`}
                onClick={() => setDrawer(false)}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{label}</span>{" "}
                {href === "/host/bookings" && pending > 0 && <b>{pending}</b>}
                {href === "/admin/approvals" && (
                  <b>
                    {
                      db?.users.filter(
                        (u) => u.role === "host" && u.approval === "pending",
                      ).length
                    }
                  </b>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/studios">Khám phá Studio</Link>
          <small>Dữ liệu mô phỏng trong trình duyệt</small>
          {!mobile && (
            <Button
              variant="ghost"
              onClick={() => {
                setCollapsed(!collapsed);
                service.setPreference("sidebar.collapsed", !collapsed);
              }}
              aria-label={
                collapsed
                  ? "Mở rộng thanh điều hướng"
                  : "Thu gọn thanh điều hướng"
              }
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
              <span>Thu gọn</span>
            </Button>
          )}
        </div>
      </div>
    );
  }
  return (
    <StudioContext.Provider value={{ studioId, selectStudio }}>
      <div
        className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        <aside className="dashboard-sidebar">{sidebar()}</aside>
        <div className="dashboard-body">
          <header className="dashboard-topbar">
            <Dialog open={drawer} onOpenChange={setDrawer}>
              <DialogTrigger asChild>
                <Button
                  className="dashboard-mobile-menu"
                  variant="ghost"
                  size="icon"
                  aria-label="Mở điều hướng"
                >
                  <Menu size={22} />
                </Button>
              </DialogTrigger>
              <DialogContent variant="drawer" className="dashboard-drawer">
                <DialogTitle className="sr-only">
                  Điều hướng {role === "host" ? "Chủ Studio" : "Quản trị"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Các khu vực quản lý StudioHub.
                </DialogDescription>
                {sidebar(true)}
              </DialogContent>
            </Dialog>
            <span className="topbar-context">
              {role === "host"
                ? (studios.find((s) => s.id === studioId)?.name ??
                  "Tất cả Studio")
                : "StudioHub · Quản trị"}
            </span>
            {role === "admin" && <GlobalSearch />}
            <AccountMenu />
          </header>
          <main id="main-content" tabIndex={-1} className="dashboard-main">
            {children}
          </main>
        </div>
      </div>
    </StudioContext.Provider>
  );
}
export function DashboardShell(props: {
  role: "host" | "admin";
  children: ReactNode;
}) {
  return (
    <AccessGuard>
      <DashboardInner {...props} />
    </AccessGuard>
  );
}
export function HostScope({ children }: { children: ReactNode }) {
  const { studioId } = useStudio(),
    { db, user } = useApp();
  if (!db?.studios.some((s) => s.ownerId === user?.id))
    return (
      <EmptyState
        title="Bạn chưa có Studio"
        description="Tạo Studio trước khi thêm phòng, thiết bị và bảng giá."
        href="/host/studio/settings?new=1"
        action="Tạo Studio đầu tiên"
      />
    );
  if (studioId === "all")
    return (
      <EmptyState
        title="Chọn một Studio để quản lý"
        description="Chọn Studio trong thanh điều hướng. Mỗi Studio có phòng, thiết bị và cài đặt riêng."
      />
    );
  return <>{children}</>;
}
