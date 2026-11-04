"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LogOut, UserRound, CalendarDays } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { customerInitials } from "./profile-data";
import "./customer.css";

export function CustomerAccountMenu() {
  const { user, logout } = useApiSession(), router = useRouter(), path = usePathname();
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  if (!user || user.role !== "customer") return null;
  return <div className="customer-account" ref={root} key={path} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []), index = items.indexOf(document.activeElement as HTMLElement);
      items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
    }
  }}>
    <button ref={trigger} className="customer-account-trigger" aria-label="Menu tài khoản khách hàng" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
      <span className="customer-avatar small" aria-hidden="true">{customerInitials(user.full_name)}</span><span className="customer-short-name">{user.full_name.trim().split(/\s+/).at(-1)}</span><ChevronDown size={16}/>
    </button>
    {open && <div className="customer-account-menu" role="menu" id={id} aria-label="Tài khoản khách hàng">
      <div className="customer-menu-identity" role="presentation"><strong>{user.full_name}</strong><span>Khách hàng</span></div>
      <Link role="menuitem" tabIndex={-1} href="/profile" onClick={() => setOpen(false)}><UserRound size={18}/>Hồ sơ của tôi</Link>
      <Link role="menuitem" tabIndex={-1} href="/my-bookings" onClick={() => setOpen(false)}><CalendarDays size={18}/>Đơn thuê của tôi</Link>
      <button role="menuitem" tabIndex={-1} onClick={async () => { setOpen(false); await logout(); router.push("/"); }}><LogOut size={18}/>Đăng xuất</button>
    </div>}
  </div>;
}
