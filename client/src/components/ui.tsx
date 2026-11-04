"use client";
import Image from "@/components/image";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "./motion/navigation-link";
import { useIsPresent, useDialogMotion, SharedPhoto } from "./motion/system";
import {
  X,
  ArrowUpRight,
  MapPin,
  Maximize,
  Users,
  ArrowRight,
} from "lucide-react";
import type { Room, Booking } from "@/domain/models";
import {
  money,
  dateTime,
  statusLabel,
  paymentLabel,
  refundLabel,
} from "@/domain/models";
import { roomRate, balance } from "@/domain/engine";
import { useStore } from "./store";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  sheet = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  sheet?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const present = useIsPresent();
  const drawer = className.includes("navigation-drawer");
  useDialogMotion(ref, drawer);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    d?.showModal();
    return () => {
      d?.close();
      document.body.style.overflow=previousOverflow;
      if (previous?.isConnected) previous.focus();
      else document.getElementById("main-content")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      data-exiting={!present}
      onClickCapture={e=>{if(!present){e.preventDefault();e.stopPropagation();}}}
      onSubmitCapture={e=>{if(!present){e.preventDefault();e.stopPropagation();}}}
      onPointerDownCapture={e=>{if(!present){e.preventDefault();e.stopPropagation();}}}
      className={`dialog ${wide ? "wide" : ""} ${sheet ? "sheet" : ""} ${className}`}
      aria-labelledby="dialog-title"
      onCancel={e=>{e.preventDefault();if(present)onClose();}}
      onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link className="btn" href={href}>
          {label ?? "Khám phá phòng"}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function PrintArtwork({ variant = 0 }: { variant?: number }) {
  return <div className={`print-art print-art-${variant % 4}`} aria-hidden="true">
    <span className="print-dots" /><span className="print-circle primary" />
    <span className="print-circle accent" /><span className="print-spark" />
  </div>;
}
export function RoomCard({
  room,
  editorial = false,
}: {
  room: Room;
  editorial?: boolean;
}) {
  const { state } = useStore();
  const st = state.studios.find(
    (s) => s.id === state.types.find((t) => t.id === room.typeId)?.studioId,
  );
  return (
    <article className={`room-card ${editorial ? "editorial" : ""}`}>
      <Link className="room-image" href={`/rooms/${room.id}`}>
        <SharedPhoto name={`room-${room.id}`}><Image
          width={1400}
          height={1000}
          src={room.images[0]}
          alt={`${room.name} · ${room.code}, ảnh không gian minh họa`}
          loading="lazy"
        /></SharedPhoto>
        <span className="image-code">{room.code}</span>
      </Link>
      <div className="room-copy">
        <div className="room-location">
          <MapPin size={13} />
          {st?.district}, TP. Hồ Chí Minh
        </div>
        <Link className="room-title" href={`/rooms/${room.id}`}>
          <h3>{room.name}</h3>
          <ArrowUpRight size={21} />
        </Link>
        <p className="muted">
          {room.floor} · {room.feature}
        </p>
        <div className="attributes">
          <span>
            <Maximize size={15} />
            {room.area} m²
          </span>
          <span>
            <Users size={15} />
            {room.capacity} người
          </span>
          <span>{state.types.find((t) => t.id === room.typeId)?.category}</span>
        </div>
        {!editorial && (
          <div className="amenity-line">
            {room.amenities.slice(0, 3).join(" · ")}
          </div>
        )}
        <div className="room-bottom">
          <div>
            <strong className="price">{money(roomRate(state, room.id))}</strong>
            <span className="muted"> / giờ</span>
          </div>
          {!editorial && (
            <Link className="btn secondary small" href={`/rooms/${room.id}`}>
              Xem phòng <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
export function BookingRow({
  booking: b,
  base = "/my-bookings",
}: {
  booking: Booking;
  base?: string;
}) {
  const { state } = useStore();
  const r = state.rooms.find((r) => r.id === b.roomId);
  return (
    <article className="booking-row">
      <SharedPhoto name={`booking-${b.id}`}><Image
        width={1400}
        height={1000}
        src={r?.images[0] ?? "/images/daylight.jpg"}
        alt={`Phòng ${r?.code}`}
        loading="lazy"
      /></SharedPhoto>
      <div>
        <span className="mono muted">{b.id}</span>
        <h3>
          {r?.name} <span className="mono">/ {r?.code}</span>
        </h3>
        <p>
          {dateTime(b.start)} — {dateTime(b.end)}
        </p>
        <div className="status-line">
          <span className={`status ${b.status}`}>{statusLabel[b.status]}</span>
          <span className={`payment-badge ${b.payment}`}>{paymentLabel[b.payment]}</span>
          <span className="booking-deposit">{b.payment === "paid" ? "Cọc đã trả" : "Cọc yêu cầu"}: {money(b.deposit)}</span>
          {b.refund.status !== "not_required" && (
            <span className="small-text">{refundLabel[b.refund.status]}</span>
          )}
        </div>
      </div>
      <div className="booking-end">
        <small>{['cancelled','expired','no_show'].includes(b.status)?'Giá thuê đã đặt':'Còn phải thanh toán'}</small>
        <strong className="mono">{money(['cancelled','expired','no_show'].includes(b.status)?b.total:balance(b))}</strong>
        <Link className="text-link" href={`${base}/${b.id}`}>
          Chi tiết đơn <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
