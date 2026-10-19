"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Check, Minus, Plus, ChevronDown } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { AccessGuard } from "@/features/auth/guard";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import {
  EmptyState,
  PageHeading,
  PriceBreakdown,
  StudioImage,
} from "@/components/shared/common";
import { defaultRequest, RentalFields } from "./rental-fields";
import { checkAvailability, equipmentAvailable } from "@/domain/availability";
import { getEffectiveRoomStatus } from "@/domain/access";
import { money, dateTime, unitLabels } from "@/lib/format";
import type { BookingDraft, Database, Room } from "@/domain/schema";
import { message } from "@/services/service";
const contactSchema = z.object({
  name: z.string().trim().min(2, "Tên liên hệ cần ít nhất 2 ký tự."),
  email: z.email("Email không hợp lệ."),
  phone: z.string().regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ."),
});
export function QuantitySelector({
  name,
  quantity,
  maximum,
  onChange,
}: {
  name: string;
  quantity: number;
  maximum: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="quantity-selector">
      <Button
        variant="outline"
        size="icon"
        aria-label={`Giảm ${name}`}
        disabled={quantity <= 0}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus size={16} />
      </Button>
      <output aria-label={`Số lượng ${name}`}>{quantity}</output>
      <Button
        variant="outline"
        size="icon"
        aria-label={`Tăng ${name}`}
        disabled={quantity >= maximum}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
function Wizard({ room, db }: { room: Room; db: Database }) {
  const { user, now, service } = useApp(),
    router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<BookingDraft>(() => {
    const saved = service.readDraft(room.slug);
    const initial = saved ?? {
      ...defaultRequest(db, room, now),
      step: 1,
      notes: "",
      contact: { name: "", email: "", phone: "" },
      acknowledged: false,
    };
    return {
      ...initial,
      contact: {
        name: initial.contact.name || user?.name || "",
        email: initial.contact.email || user?.email || "",
        phone: initial.contact.phone || user?.phone || "",
      },
    };
  });
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(false),
    [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const studio = db.studios.find((s) => s.id === room.studioId)!;
  const availability = checkAvailability(db, draft, now),
    price = availability.ok ? availability.value : null;
  const equipment = db.equipment.filter(
    (e) => e.studioId === studio.id && e.status !== "hidden",
  );
  useEffect(() => {
    heading.current?.focus();
  }, [draft.step]);
  function update(values: Partial<BookingDraft>) {
    const next = { ...draft, ...values };
    setDraft(next);
    service.saveDraft(room.slug, next);
    setError(null);
  }
  function go(step: number) {
    const next = { ...draft, step };
    setDraft(next);
    service.saveDraft(room.slug, next);
    setError(null);
  }
  async function next() {
    if (busy) return;
    const checked = checkAvailability(db, draft, Date.now());
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    if (draft.step === 1) {
      go(2);
      return;
    }
    if (draft.step === 2) {
      if (!user) {
        service.saveDraft(room.slug, { ...draft, step: 3 });
        router.push(
          `/login?returnTo=${encodeURIComponent(`/booking/${room.slug}`)}`,
        );
        return;
      }
      if (user.role !== "customer") {
        setError("Chỉ tài khoản khách hàng có thể tạo đơn thuê.");
        return;
      }
      go(3);
      return;
    }
    if (!user) {
      service.saveDraft(room.slug, draft);
      router.push(
        `/login?returnTo=${encodeURIComponent(`/booking/${room.slug}`)}`,
      );
      return;
    }
    const contact = contactSchema.safeParse(draft.contact);
    if (!contact.success) {
      setContactErrors(
        Object.fromEntries(
          contact.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      setError("Kiểm tra thông tin liên hệ.");
      return;
    }
    if (!draft.acknowledged) {
      setError("Vui lòng xác nhận quy định thuê của Studio.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const booking = service.createBooking(
        draft,
        contact.data,
        draft.notes,
        draft.acknowledged,
      );
      service.clearDraft(room.slug);
      router.push(`/payment/${booking.code}`);
    } catch (error) {
      setError(message(error));
      if (
        error instanceof Error &&
        ["conflict", "equipment"].includes(
          "code" in error ? String(error.code) : "",
        )
      )
        go(1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1} className="container wizard-page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href={`/studios/${room.slug}`}>Thông tin Studio</Link>
        <span>/</span>
        <span>Đặt thuê</span>
      </nav>
      <PageHeading title="Đặt thuê Studio" description={room.name} />
      <nav className="wizard-steps" aria-label="Các bước đặt thuê">
        {["Thời gian", "Thiết bị", "Xác nhận"].map((label, i) => (
          <button
            key={label}
            disabled={i + 1 > draft.step}
            onClick={() => go(i + 1)}
            aria-current={draft.step === i + 1 ? "step" : undefined}
            aria-label={`${i + 1} ${label}`}
          >
            <span>{draft.step > i + 1 ? <Check size={16} /> : i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="wizard-layout">
        <section className="surface wizard-main">
          <h2 ref={heading} tabIndex={-1}>
            {draft.step === 1
              ? "Chọn thời gian thuê"
              : draft.step === 2
                ? "Thêm thiết bị & nội thất"
                : "Kiểm tra và xác nhận"}
          </h2>
          <ErrorSummary error={error} />
          {draft.step === 1 && (
            <>
              <p className="muted">
                Giờ Việt Nam (GMT+7).{" "}
                {room.overnight
                  ? "Phòng hỗ trợ thuê liên tục qua đêm."
                  : `Giờ hoạt động ${String(Math.floor(room.openMinute / 60)).padStart(2, "0")}:00–${String(Math.floor(room.closeMinute / 60)).padStart(2, "0")}:00.`}
              </p>
              <RentalFields
                request={draft}
                onChange={(value) => update(value)}
                room={room}
                studio={studio}
                db={db}
                prefix="booking"
              />
              <div
                className={`notice ${availability.ok ? "notice-success" : "notice-error"}`}
                role="status"
              >
                {availability.ok
                  ? "Thời gian đã chọn có thể đặt. Giá được cập nhật bên dưới."
                  : availability.message}
              </div>
            </>
          )}
          {draft.step === 2 && (
            <>
              <p className="muted">
                Tùy chọn · Bạn có thể tiếp tục mà không thuê thêm thiết bị.
              </p>
              {equipment.length ? (
                <div className="equipment-options">
                  {equipment.map((item) => {
                    const quantity =
                        draft.equipment.find((e) => e.id === item.id)
                          ?.quantity ?? 0,
                      maximum = equipmentAvailable(
                        db,
                        item.id,
                        draft.start,
                        draft.end,
                        now,
                      );
                    const line = price?.equipment.find((e) => e.id === item.id);
                    return (
                      <article key={item.id} className="equipment-option">
                        <StudioImage src={item.image} alt={item.name} />
                        <div>
                          <h3>{item.name}</h3>
                          <p>
                            {money(item.price)} / {unitLabels[item.unit]}
                          </p>
                          <small>
                            {item.status === "maintenance"
                              ? "Đang bảo trì"
                              : `Còn ${maximum} trong thời gian đã chọn`}
                          </small>
                          {line && (
                            <p className="equipment-line">
                              Chi phí: {money(line.amount)}
                            </p>
                          )}
                        </div>
                        <QuantitySelector
                          name={item.name}
                          quantity={quantity}
                          maximum={maximum}
                          onChange={(q) =>
                            update({
                              equipment: [
                                ...draft.equipment.filter(
                                  (e) => e.id !== item.id,
                                ),
                                ...(q > 0
                                  ? [{ id: item.id, quantity: q }]
                                  : []),
                              ],
                            })
                          }
                        />
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Không có thiết bị thuê thêm"
                  description="Bạn có thể mang theo thiết bị của mình."
                />
              )}
              {!availability.ok && (
                <ErrorSummary error={availability.message} />
              )}
            </>
          )}
          {draft.step === 3 && (
            <>
              <div className="review-rental">
                <h3>{room.name}</h3>
                <p>
                  {dateTime(draft.start)} → {dateTime(draft.end)}
                </p>
                <p>
                  {draft.participants} người ·{" "}
                  {db.rates.find((r) => r.id === draft.rateId)?.name}
                </p>
                <Button variant="ghost" onClick={() => go(1)}>
                  Sửa thời gian
                </Button>
                <Button variant="ghost" onClick={() => go(2)}>
                  Sửa thiết bị
                </Button>
              </div>
              <h3>Thông tin liên hệ</h3>
              <div className="form-grid">
                <Field
                  label="Họ và tên"
                  id="booking-contact-name"
                  error={contactErrors.name}
                >
                  <Input
                    autoComplete="name"
                    value={draft.contact.name}
                    onChange={(e) =>
                      update({
                        contact: { ...draft.contact, name: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field
                  label="Số điện thoại"
                  id="booking-contact-phone"
                  error={contactErrors.phone}
                >
                  <Input
                    autoComplete="tel"
                    inputMode="tel"
                    value={draft.contact.phone}
                    onChange={(e) =>
                      update({
                        contact: { ...draft.contact, phone: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
              <Field
                label="Email"
                id="booking-contact-email"
                error={contactErrors.email}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  value={draft.contact.email}
                  onChange={(e) =>
                    update({
                      contact: { ...draft.contact, email: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Ghi chú (không bắt buộc)" id="booking-notes">
                <Textarea
                  value={draft.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  maxLength={1000}
                />
              </Field>
              <div className="rental-rules">
                <h3>Quy định của Studio</h3>
                <p>{studio.rules}</p>
                <p className="muted">
                  Giữ chỗ 15 phút để đặt cọc mô phỏng. Khoản còn lại chưa được
                  thu trong demo.
                </p>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.acknowledged}
                  onChange={(e) => update({ acknowledged: e.target.checked })}
                />
                Tôi đã đọc và đồng ý với quy định thuê ở trên.
              </label>
              {!availability.ok && (
                <ErrorSummary error={availability.message} />
              )}
            </>
          )}
          <div className="wizard-navigation">
            {draft.step > 1 && (
              <Button variant="outline" onClick={() => go(draft.step - 1)}>
                Quay lại
              </Button>
            )}
            <Button onClick={next} disabled={busy}>
              {busy
                ? "Đang tạo đơn…"
                : draft.step === 3
                  ? "Tạo đơn & đặt cọc"
                  : "Tiếp tục"}
            </Button>
          </div>
        </section>
        <aside
          className={`surface wizard-summary ${summaryOpen ? "summary-expanded" : ""}`}
        >
          <div className="summary-room">
            <StudioImage src={room.images[0]} alt={room.name} />
            <div>
              <h3>{room.name}</h3>
              <p>{studio.name}</p>
            </div>
          </div>
          <h2>Chi phí dự kiến</h2>
          <p className="summary-period">
            {dateTime(draft.start)}
            <br />
            {dateTime(draft.end)}
          </p>
          <div className="summary-breakdown">
            {price ? (
              <PriceBreakdown price={price} />
            ) : (
              <p className="muted">
                Chọn thời gian và thiết bị hợp lệ để xem giá.
              </p>
            )}
          </div>
          <div className="mobile-summary-header">
            <button
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
              aria-label="Mở chi tiết chi phí"
            >
              <span>
                Đặt cọc dự kiến
                <strong>
                  {price ? money(price.deposit) : "Chưa xác định"}
                </strong>
              </span>
              <ChevronDown size={18} />
            </button>
            <Button onClick={next} disabled={busy}>
              {draft.step === 3 ? "Tạo đơn & đặt cọc" : "Tiếp tục"}
            </Button>
          </div>
          <p className="field-hint desktop-summary-note">
            Giá sẽ được lưu theo thời điểm tạo đơn. Chủ Studio xác nhận sau khi
            bạn đặt cọc.
          </p>
        </aside>
      </div>
    </main>
  );
}
export function BookingWizard({ slug }: { slug: string }) {
  const { db, user, now } = useApp();
  if (!db) return null;
  const room = db.rooms.find((r) => r.slug === slug);
  return (
    <AccessGuard>
      {user && user.role !== "customer" ? (
        <main id="main-content" tabIndex={-1} className="container">
          <EmptyState
            title="Đặt thuê dành cho khách hàng"
            description="Đăng xuất và đăng nhập bằng tài khoản khách hàng để tạo đơn."
            href="/account"
            action="Tài khoản của tôi"
          />
        </main>
      ) : !room || getEffectiveRoomStatus(db, room, now) !== "bookable" ? (
        <main id="main-content" tabIndex={-1} className="container">
          <EmptyState
            title="Phòng không nhận đơn mới"
            href="/studios"
            action="Tìm Studio khác"
          />
        </main>
      ) : (
        <Wizard room={room} db={db} />
      )}
    </AccessGuard>
  );
}
