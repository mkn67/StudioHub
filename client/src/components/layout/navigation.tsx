"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Aperture,
  Menu,
  UserRound,
  LogOut,
  LayoutDashboard,
  CalendarDays,
} from "lucide-react";
import { useApp, DataGate, useToast } from "@/providers/app-provider";
import { roleHome } from "@/domain/access";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog, StudioImage } from "@/components/shared/common";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="StudioHub — Trang chủ">
      <Aperture size={29} strokeWidth={1.65} aria-hidden="true" />
      <span>
        Studio<span className="logo-accent">Hub</span>
      </span>
    </Link>
  );
}
export function AccountMenu() {
  const { user, service } = useApp(),
    router = useRouter(),
    toast = useToast();
  const [reset, setReset] = useState(false);
  if (!user)
    return (
      <div className="auth-links">
        <Link href="/login" className="text-link">
          Đăng nhập
        </Link>
        <Button asChild variant="outline">
          <Link href="/register">Đăng ký</Link>
        </Button>
      </div>
    );
  const restricted =
    user.locked || (user.role === "host" && user.approval !== "approved");
  function logout() {
    service.logout();
    router.push("/login");
    toast("Đã đăng xuất.");
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="account-trigger"
            aria-label={`Tài khoản ${user.name}`}
          >
            <span className="avatar">
              {user.avatar ? (
                <StudioImage src={user.avatar} alt="Ảnh đại diện" />
              ) : (
                user.name
                  .split(" ")
                  .slice(-2)
                  .map((n) => n[0])
                  .join("")
              )}
            </span>
            <span className="account-name">{user.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <p className="menu-label">{user.email}</p>
          {!restricted && (
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserRound size={16} /> Tài khoản của tôi
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              href={
                restricted
                  ? "/account/status"
                  : user.role === "customer"
                    ? "/my-bookings"
                    : roleHome(user)
              }
            >
              {user.role === "customer" && !restricted ? (
                <CalendarDays size={16} />
              ) : (
                <LayoutDashboard size={16} />
              )}{" "}
              {restricted
                ? "Trạng thái tài khoản"
                : user.role === "customer"
                  ? "Đơn thuê của tôi"
                  : user.role === "host"
                    ? "Quản lý Studio"
                    : "Quản trị"}
            </Link>
          </DropdownMenuItem>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <DropdownMenuItem onSelect={() => setReset(true)}>
              Đặt lại dữ liệu demo
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="menu-separator" />
          <DropdownMenuItem onSelect={logout}>
            <LogOut size={16} /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={reset}
        onOpenChange={setReset}
        title="Đặt lại dữ liệu demo?"
        description="Xóa đơn và mọi chỉnh sửa trong trình duyệt này, khôi phục dữ liệu mẫu và đăng xuất tài khoản trong tab này."
        destructive
        label="Đặt lại dữ liệu"
        onConfirm={() => {
          service.reset();
          window.location.replace("/");
        }}
      />
    </>
  );
}
export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <Link href="/studios">Khám phá Studio</Link>
          <Link href="/become-a-host">Cho thuê Studio</Link>
        </nav>
        <div className="nav-right">
          <AccountMenu />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="mobile-menu"
                size="icon"
                variant="ghost"
                aria-label="Mở menu"
              >
                <Menu size={22} />
              </Button>
            </DialogTrigger>
            <DialogContent variant="drawer">
              <DialogTitle>Điều hướng</DialogTitle>
              <DialogDescription>
                Khám phá và quản lý StudioHub
              </DialogDescription>
              <nav className="drawer-nav">
                <Link href="/studios" onClick={() => setOpen(false)}>
                  Khám phá Studio
                </Link>
                <Link href="/become-a-host" onClick={() => setOpen(false)}>
                  Cho thuê Studio
                </Link>
                <Link href="/account" onClick={() => setOpen(false)}>
                  Tài khoản
                </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer container">
      <Logo />
      <p>Không gian cho ý tưởng của bạn.</p>
      <div>
        <Link href="/studios">Khám phá Studio</Link>
        <Link href="/become-a-host">Dành cho chủ Studio</Link>
      </div>
      <small>
        Dữ liệu và thanh toán mô phỏng · Lưu trong trình duyệt của bạn
      </small>
    </footer>
  );
}
export function RouteFrame({ children }: { children: ReactNode }) {
  const path = usePathname(),
    dashboard = path.startsWith("/host") || path.startsWith("/admin"),
    auth = path === "/login" || path.startsWith("/register");
  return (
    <DataGate>
      {!dashboard && !auth && <Navbar />}
      {children}
      {!dashboard && !auth && <Footer />}
    </DataGate>
  );
}
