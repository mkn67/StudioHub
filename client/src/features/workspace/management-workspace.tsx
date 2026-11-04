"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, PanelLeftOpen, PanelLeftClose, Menu, LogOut, ArrowUpRight, ChevronDown, Settings, type LucideIcon } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { Modal } from "@/components/ui";
import { preferenceKey } from "./preferences";
import { useWorkspacePreferences } from "./use-preferences";
import "@/features/host/host.css";
import "./workspace.css";

export type WorkspaceNavGroup = { label: string; links: { path: string; label: string; icon: LucideIcon }[] };
function AccountMenu({ role, context }: { role: "host" | "admin"; context?: string }) {
  const session = useApiSession(), router = useRouter(), id = useId();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const roleLabel = role === "host" ? "Chủ Studio" : "Quản trị";
  const initials = session.user?.full_name.trim().split(/\s+/).slice(-2).map(part => part.replace(/[^\p{L}]/gu, "")[0] ?? "").join("");
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className="workspace-account" ref={root}>
    <button ref={trigger} className="workspace-account-trigger" aria-label="Menu tài khoản" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}><span className="host-avatar">{initials}</span><span className="workspace-account-role">{roleLabel}</span><ChevronDown size={16}/></button>
    {open && <div className="workspace-account-menu" id={id} role="menu" aria-label={`Tài khoản ${roleLabel}`} onKeyDown={event => {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      else if (event.key === "Tab") { setOpen(false); trigger.current?.focus(); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items[next]?.focus(); }
    }}>
      <div className="workspace-menu-identity" role="presentation"><strong>{session.user?.full_name}</strong><small>{roleLabel}{context ? ` · ${context}` : ""}</small></div>
      <Link role="menuitem" href={`/${role}/settings`} onClick={() => setOpen(false)}><Settings size={17}/>Cài đặt</Link>
      <Link role="menuitem" href="/" onClick={() => setOpen(false)}><ArrowUpRight size={17}/>Xem website</Link>
      <button role="menuitem" disabled={busy} onClick={async () => { setBusy(true); await session.logout(); setOpen(false); router.push("/"); }}><LogOut size={17}/>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </div>}
  </div>;
}

export function ManagementWorkspace({ role, path, title, groups, context, children }: { role: "host" | "admin"; path: string; title: string; groups: WorkspaceNavGroup[]; context?: string; children: ReactNode }) {
  const session = useApiSession(), router = useRouter();
  const [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false);
  const { preferences } = useWorkspacePreferences(preferenceKey(role, session.user!.user_id));
  const name = role === "host" ? "Host" : "Admin";
  const initials = session.user!.full_name.trim().split(/\s+/).slice(-2).map(part => part.replace(/[^\p{L}]/gu, "")[0] ?? "").join("");
  const navigation = <>
    <Link className="host-brand" href={`/${role}`} aria-label="StudioHub · Tổng quan"><span><Building2 size={23}/></span><div>StudioHub<small>{name} Workspace</small></div></Link>
    <nav className="host-navigation" aria-label={`Điều hướng ${name}`} onClick={() => setMobile(false)}>{groups.map(group => <div className="host-nav-group" key={group.label}><p>{group.label}</p>{group.links.map(link => <Link key={link.path} href={`/${role}${link.path ? `/${link.path}` : ""}`} className={path === link.path ? "is-active" : ""} aria-current={path === link.path ? "page" : undefined} title={collapsed ? link.label : undefined}><link.icon size={19} aria-hidden="true"/><span>{link.label}</span></Link>)}</div>)}</nav>
    <div className="host-sidebar-footer"><div className="host-identity"><span className="host-avatar">{initials}</span><div><strong>{session.user!.full_name}</strong><small>{role === "host" ? "Chủ Studio" : "Quản trị viên"}</small></div></div><Link href={`/${role}/settings`} title="Cài đặt"><Settings size={18}/><span>Cài đặt tài khoản</span></Link><button title="Đăng xuất" onClick={async () => { await session.logout(); router.push("/"); }}><LogOut size={18}/><span>Đăng xuất</span></button></div>
  </>;
  return <div className={`host-workspace management-workspace ${collapsed ? "host-is-collapsed" : ""}`} data-workspace-role={role} data-compact={preferences.compact} data-reduced-motion={preferences.reduceMotion}>
    <aside className="host-sidebar">{navigation}</aside><div className="host-main"><header className="host-topbar"><div><button className="host-desktop-collapse host-icon-button" aria-label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={20}/> : <PanelLeftClose size={20}/>}</button><button className="host-mobile-menu host-icon-button" aria-label={`Mở điều hướng ${name}`} aria-expanded={mobile} onClick={() => setMobile(true)}><Menu size={22}/></button><span><span className="workspace-breadcrumb-root">{name} <span aria-hidden="true">/</span> </span><strong>{title}</strong></span></div><AccountMenu role={role} context={context}/></header>
      <main id="main-content" className="host-content" tabIndex={-1}>{session.error && <p className="host-form-error" role="alert">{session.error}</p>}{children}</main></div>
    {mobile && <Modal title={`Điều hướng ${name}`} onClose={() => setMobile(false)} className="host-dialog host-mobile-navigation"><div className="host-mobile-sidebar">{navigation}</div></Modal>}
  </div>;
}
