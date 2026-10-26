"use client";
import { useEffect, useRef } from "react";
import type { Booking, Status } from "@/domain/models";

export type BookingStatusFilter = "all" | Status;

const filters = [
  ["all", "Tất cả"],
  ["awaiting_payment", "Chờ cọc"],
  ["pending", "Chờ duyệt"],
  ["confirmed", "Sắp tới"],
  ["checked_in", "Đang sử dụng"],
  ["completed", "Đã trả phòng"],
  ["cancelled", "Đã hủy"],
  ["expired", "Hết hạn"],
  ["no_show", "Không đến"],
] as const satisfies ReadonlyArray<readonly [BookingStatusFilter, string]>;

// A presentation predicate, not a booking state transition. "All" is synthetic;
// "Upcoming" is confirmed inventory whose scheduled start has not passed.
export function matchesBookingStatus(booking: Booking, filter: BookingStatusFilter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "confirmed") return booking.status === "confirmed" && booking.start >= now;
  return booking.status === filter;
}

export function BookingStatusFilters({ bookings, value, now, onChange }: {
  bookings: readonly Booking[];
  value: BookingStatusFilter;
  now: number;
  onChange: (value: BookingStatusFilter) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const container = row.current;
    if (!container) return;
    const keepVisible = () => {
      if (!active.current) return;
      const bounds = container.getBoundingClientRect();
      const selected = active.current.getBoundingClientRect();
      if (selected.left < bounds.left + 5)
        container.scrollLeft += selected.left - bounds.left - 5;
      else if (selected.right > bounds.right - 5)
        container.scrollLeft += selected.right - bounds.right + 5;
    };
    keepVisible();
    const observer = new ResizeObserver(keepVisible);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, bookings]);

  return <div ref={row} className="booking-status-filters" role="group" aria-label="Lọc trạng thái đặt thuê">
    {filters.map(([status, label]) => {
      const count = bookings.filter(booking => matchesBookingStatus(booking, status, now)).length;
      const selected = value === status;
      return <button key={status} ref={selected ? active : undefined} type="button"
        className={`booking-status-filter${selected ? " active" : ""}`} aria-pressed={selected}
        aria-label={`${label}, ${count} đơn`} onClick={() => onChange(status)}>
        <span>{label}</span><span className="booking-status-count" aria-hidden="true">{count}</span>
      </button>;
    })}
  </div>;
}
