"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { gsap, useGSAP } from "@/components/motion/gsap-runtime";
import { localDate, statusLabel, type Booking } from "@/domain/models";

type Accent = "cyan" | "blue" | "mint" | "yellow" | "lilac" | "coral";

export function DashboardKpis({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = scope.current?.querySelectorAll(".dashboard-kpi");
      if (cards?.length) gsap.fromTo(cards, { opacity: .8, y: 10 }, {
        opacity: 1, y: 0, duration: .26, stagger: .045, ease: "power2.out", clearProps: "opacity,transform",
      });
    });
    return () => media.revert();
  }, { scope });
  return <div className="dashboard-kpis" ref={scope}>{children}</div>;
}

export function DashboardKpi({ label, value, hint, icon: Icon, accent = "cyan", href }: {
  label: string; value: ReactNode; hint: string; icon: LucideIcon; accent?: Accent; href?: string;
}) {
  const content = <>
    <div className="dashboard-kpi-top"><span className="dashboard-kpi-icon"><Icon size={19} aria-hidden="true" /></span><span>{label}</span>{href && <ArrowUpRight className="dashboard-kpi-arrow" size={17} aria-hidden="true" />}</div>
    <strong className="dashboard-kpi-value">{value}</strong>
    <span className="dashboard-kpi-hint">{hint}</span>
  </>;
  return href ? <Link href={href} className={`dashboard-kpi accent-${accent}`}>{content}</Link>
    : <div className={`dashboard-kpi accent-${accent}`}>{content}</div>;
}

export function DashboardPanel({ title, eyebrow, action, children, className = "" }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`dashboard-panel ${className}`}>
    <div className="dashboard-panel-heading"><div>{eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>
    {children}
  </section>;
}

export function BookingAnalytics({ bookings, now }: { bookings: Booking[]; now: number }) {
  // Display rental dates, not invented revenue or growth. All states are included.
  const days = Array.from({ length: 7 }, (_, index) => {
    const time = now + (index - 3) * 86400000;
    const date = localDate(time);
    return { date, label: new Date(time).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }), count: bookings.filter(b => localDate(b.start) === date).length };
  });
  const maximum = Math.max(1, ...days.map(day => day.count));
  const statuses = Object.entries(statusLabel).map(([status, label]) => ({ status, label, count: bookings.filter(b => b.status === status).length })).filter(item => item.count > 0);
  return <div className="dashboard-analytics">
    <DashboardPanel title="Nhịp đặt thuê" eyebrow="7 ngày quanh ngày vận hành" action={<span className="dashboard-tag">Theo ngày thuê · mọi trạng thái</span>}>
      <div className="dashboard-chart" role="img" aria-label={days.map(day => `${day.label}: ${day.count} đơn`).join("; ")}>
        {days.map(day => <div className={`dashboard-chart-column ${day.date === localDate(now) ? "is-today" : ""}`} key={day.date}>
          <span className="dashboard-chart-number">{day.count}</span>
          <div className="dashboard-chart-track"><span style={{ height: `${day.count / maximum * 100}%` }} /></div>
          <span className="dashboard-chart-label">{day.label}</span>
        </div>)}
      </div>
      <p className="dashboard-chart-caption"><span /> Số đơn theo ngày thuê <strong>{days.reduce((sum, day) => sum + day.count, 0)} đơn trong khoảng hiển thị</strong></p>
    </DashboardPanel>
    <DashboardPanel title="Trạng thái đơn" eyebrow="Toàn bộ đơn trong phạm vi">
      <div className="dashboard-status-total"><strong>{bookings.length}</strong><span>đơn đặt thuê</span></div>
      <div className="dashboard-distribution">{statuses.map(item => <div key={item.status}>
        <div><span>{item.label}</span><strong>{item.count}</strong></div>
        <div className="dashboard-distribution-track"><span className={item.status} style={{ width: `${item.count / bookings.length * 100}%` }} /></div>
      </div>)}</div>
      {!bookings.length && <p className="muted">Chưa có đơn để thống kê.</p>}
    </DashboardPanel>
  </div>;
}
