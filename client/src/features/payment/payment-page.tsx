"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Clock3 } from "lucide-react";
import { useApp, useMutation } from "@/providers/app-provider";
import { AccessGuard } from "@/features/auth/guard";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeading,
  PriceBreakdown,
  StatusBadge,
} from "@/components/shared/common";
import { dateTime, money } from "@/lib/format";
import { displayStatus, paymentLabels } from "@/domain/booking";
function PaymentContent({
  code,
  result = false,
}: {
  code: string;
  result?: boolean;
}) {
  const { db, user, now, service } = useApp(),
    router = useRouter(),
    mutation = useMutation();
  const [busy, setBusy] = useState(false);
  const booking = db?.bookings.find(
    (b) => b.code === code && b.customerId === user?.id,
  );
  if (!booking)
    return (
      <main id="main-content" tabIndex={-1} className="container">
        <EmptyState
          title="Không tìm thấy đơn thuê"
          href="/my-bookings"
          action="Đơn thuê của tôi"
        />
      </main>
    );
  const status = displayStatus(booking, now),
    eligible = status === "awaiting-deposit",
    success = booking.paymentStatus === "success";
  async function pay(outcome: "success" | "failed" | "cancelled") {
    if (busy) return;
    setBusy(true);
    const r = await mutation(
      () => service.pay(code, outcome),
      outcome === "success"
        ? "Đã ghi nhận đặt cọc mô phỏng."
        : outcome === "failed"
          ? "Thanh toán mô phỏng thất bại. Bạn có thể thử lại."
          : "Đã dừng lần thanh toán này.",
    );
    setBusy(false);
    if (r.ok) router.push(`/payment/${code}/result`);
  }
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container payment-page narrow"
    >
      <PageHeading
        eyebrow="THANH TOÁN MÔ PHỎNG"
        title={
          result
            ? success
              ? "Đã đặt cọc mô phỏng"
              : status === "expired"
                ? "Đơn đã hết hạn"
                : "Chưa hoàn tất đặt cọc"
            : "Đặt cọc cho đơn thuê"
        }
      />
      <div className="surface">
        {result && success && (
          <CheckCircle2
            className="payment-result-icon"
            size={48}
            strokeWidth={1.3}
          />
        )}
        <div className="booking-code">{booking.code}</div>
        <h2>{booking.snapshot.roomName}</h2>
        <p className="muted">{booking.snapshot.studioName}</p>
        <p>
          {dateTime(booking.start)} → {dateTime(booking.end)}
        </p>
        <StatusBadge booking={booking} now={now} />
        <PriceBreakdown price={booking.snapshot.price} />
        <div className="notice">
          <CreditCard className="inline-icon" size={18} /> Bản demo không chuyển
          tiền thật. Khoản còn lại chưa được thanh toán.
        </div>
        {success ? (
          <>
            <p role="status">
              Đã ghi nhận cọc {money(booking.depositPaid)}.{" "}
              {status === "pending-confirmation"
                ? "Chờ chủ Studio xác nhận đơn thuê."
                : "Xem trạng thái hiện tại trong chi tiết đơn."}
            </p>
            <Button asChild className="full-width">
              <Link href={`/my-bookings/${code}`}>Xem chi tiết đơn</Link>
            </Button>
          </>
        ) : status === "expired" ? (
          <>
            <p role="status">
              Thời gian giữ chỗ đã hết. Phòng và thiết bị đã được giải phóng.
            </p>
            <Button asChild>
              <Link href={`/booking/${booking.snapshot.slug}`}>
                Tạo đơn mới
              </Link>
            </Button>
          </>
        ) : eligible ? (
          <>
            <p className="hold-timer" role="timer">
              <Clock3 size={16} /> Giữ chỗ còn{" "}
              {Math.max(0, Math.ceil((booking.holdUntil - now) / 60000))} phút
            </p>
            {booking.paymentStatus !== "pending" && (
              <div className="notice notice-error">
                {paymentLabels[booking.paymentStatus]}. Lần thử tiếp theo sử
                dụng đơn {booking.code}.
              </div>
            )}
            {result ? (
              <Button className="full-width" asChild>
                <Link href={`/payment/${code}`}>Thử thanh toán lại</Link>
              </Button>
            ) : (
              <div className="payment-controls">
                <Button
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => pay("success")}
                >
                  {busy ? "Đang ghi nhận thanh toán…" : "Tôi đã thanh toán"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => pay("failed")}
                >
                  Mô phỏng thất bại
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => pay("cancelled")}
                >
                  Dừng thanh toán
                </Button>
              </div>
            )}
          </>
        ) : (
          <p>Đơn hiện không thể đặt cọc.</p>
        )}
        <Link
          className="text-link payment-detail-link"
          href={`/my-bookings/${code}`}
        >
          Chi tiết đơn thuê
        </Link>
      </div>
      <section className="payment-history">
        <h2>Lịch sử thanh toán mô phỏng</h2>
        {db?.payments
          .filter((p) => p.bookingId === booking.id)
          .map((p) => (
            <div key={p.id}>
              <span>{dateTime(p.at)}</span>
              <span>{paymentLabels[p.status]}</span>
              <strong>{money(p.amount)}</strong>
            </div>
          ))}
      </section>
    </main>
  );
}
export function PaymentPage(props: { code: string; result?: boolean }) {
  return (
    <AccessGuard>
      <PaymentContent {...props} />
    </AccessGuard>
  );
}
