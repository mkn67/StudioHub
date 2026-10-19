"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ImageOff, Check, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { statusLabels, displayStatus } from "@/domain/booking";
import type { Booking, DisplayStatus, Price } from "@/domain/schema";
import { money, unitLabels } from "@/lib/format";
export function StudioImage({
  src,
  alt,
  className = "",
}: {
  src: string | undefined;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
      loading="lazy"
    />
  ) : (
    <div className={`image-fallback ${className}`} role="img" aria-label={alt}>
      <ImageOff size={28} />
      <span>Chưa có ảnh</span>
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function StatusBadge({
  booking,
  status,
  now,
}: {
  booking?: Booking;
  status?: DisplayStatus;
  now?: number;
}) {
  const value =
    status ?? (booking ? displayStatus(booking, now) : "awaiting-deposit");
  return (
    <Badge
      tone={
        value === "confirmed" || value === "completed"
          ? "success"
          : value === "rejected" || value === "cancelled"
            ? "danger"
            : value === "awaiting-deposit" || value === "pending-confirmation"
              ? "warning"
              : "neutral"
      }
    >
      {statusLabels[value]}
    </Badge>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  href,
  action,
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {href && (
        <Button asChild variant="outline">
          <Link href={href}>{action ?? "Quay lại"}</Link>
        </Button>
      )}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Đang tải dữ liệu">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-body" />
      <span className="sr-only">Đang tải dữ liệu</span>
    </div>
  );
}
export function PriceBreakdown({ price }: { price: Price }) {
  return (
    <div className="price-breakdown">
      <div>
        <span>
          Phòng · {price.units} {unitLabels[price.unit]}
        </span>
        <span>{money(price.roomAmount)}</span>
      </div>
      {price.equipment.map((e) => (
        <div key={e.id}>
          <span>
            {e.name} × {e.quantity}
            <small>
              {e.units} {unitLabels[e.unit]} × {money(e.unitPrice)}
            </small>
          </span>
          <span>{money(e.amount)}</span>
        </div>
      ))}
      <div className="price-total">
        <strong>Tổng cộng</strong>
        <strong>{money(price.total)}</strong>
      </div>
      <div className="price-deposit">
        <span>Đặt cọc {price.depositPercent}%</span>
        <strong>{money(price.deposit)}</strong>
      </div>
      <div>
        <span>Còn lại tại studio</span>
        <span>{money(price.remaining)}</span>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  requireReason = false,
  onConfirm,
  destructive = false,
  label = "Xác nhận",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
  destructive?: boolean;
  label?: string;
}) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit() {
    if (busy) return;
    if (requireReason && !reason.trim()) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason);
      onOpenChange(false);
      setReason("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể thực hiện thao tác.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          onOpenChange(v);
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
        <ErrorSummary error={error} />
        {requireReason && (
          <Field label="Lý do" id="confirm-reason">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </Field>
        )}
        <div className="dialog-actions">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Quay lại
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Đang xử lý…" : label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <span className="check-item">
      <Check size={16} aria-hidden="true" />
      {children}
    </span>
  );
}
