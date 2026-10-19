"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Phone, Mail } from "lucide-react";
import { useApp, useMutation } from "@/providers/app-provider";
import { AccessGuard } from "@/features/auth/guard";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import {
  EmptyState,
  PageHeading,
  PriceBreakdown,
  StatusBadge,
  StudioImage,
  ConfirmDialog,
  Badge,
} from "@/components/shared/common";
import {
  DataTable,
  Pagination,
  type Column,
} from "@/components/data-table/table";
import {
  canTransition,
  displayStatus,
  statusLabels,
  paymentLabels,
  type BookingAction,
} from "@/domain/booking";
import { getEffectiveRoomStatus } from "@/domain/access";
import { requiresAttention } from "@/domain/statistics";
import {
  dateTime,
  money,
  normalize,
  vietnamInstant,
  addDays,
} from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import { defaultRequest } from "@/features/booking/rental-fields";
import type { Booking } from "@/domain/schema";
export function BookingList({
  scope,
  studioId = "all",
}: {
  scope: "customer" | "host" | "admin";
  studioId?: string;
}) {
  const { db, user, now } = useApp(),
    { params, update, query } = useUrlState();
  if (!db || !user) return null;
  const base = scope === "customer" ? "/my-bookings" : `/${scope}/bookings`,
    tab =
      params.get("tab") ?? (scope === "host" ? "pending-confirmation" : "all"),
    q = normalize(params.get("q") ?? ""),
    from = params.get("from"),
    to = params.get("to"),
    room = params.get("room"),
    attention = params.get("attention") === "true";
  const own = db.bookings.filter((b) =>
    scope === "customer"
      ? b.customerId === user.id
      : scope === "host"
        ? b.ownerId === user.id &&
          (studioId === "all" || b.studioId === studioId)
        : true,
  );
  const rows = own
    .filter((b) => {
      const status = displayStatus(b, now);
      return (
        (tab === "all" ||
          (tab === "history"
            ? ["completed", "rejected", "cancelled", "expired"].includes(status)
            : status === tab)) &&
        (!q ||
          normalize(
            `${b.code} ${b.snapshot.roomName} ${b.snapshot.studioName} ${b.contact.name}`,
          ).includes(q)) &&
        (!room || b.roomId === room) &&
        (!from || b.start >= vietnamInstant(from)) &&
        (!to || b.start < vietnamInstant(addDays(to, 1))) &&
        (!attention || requiresAttention(db, b, now))
      );
    })
    .sort((a, b) =>
      tab === "pending-confirmation"
        ? a.start - b.start
        : b.createdAt - a.createdAt,
    );
  const pageSize = scope === "customer" ? 10 : 20,
    page = Math.max(
      1,
      Math.min(
        Number(params.get("page")) || 1,
        Math.max(1, Math.ceil(rows.length / pageSize)),
      ),
    );
  const tabs =
    scope === "host"
      ? [
          "pending-confirmation",
          "confirmed",
          "awaiting-deposit",
          "history",
          "all",
        ]
      : [
          "all",
          "awaiting-deposit",
          "pending-confirmation",
          "confirmed",
          "completed",
          "history",
        ];
  const href = (b: Booking) =>
    `${base}/${b.code}?returnTo=${encodeURIComponent(`${base}${query ? `?${query}` : ""}`)}`;
  const columns: Column<Booking>[] = [
    {
      key: "code",
      label: "Đơn thuê",
      render: (b) => (
        <Link href={href(b)} className="table-entity">
          <strong>{b.code}</strong>
          <small>{b.snapshot.roomName}</small>
        </Link>
      ),
      sort: (b) => b.code,
    },
    {
      key: "customer",
      label: "Khách hàng",
      render: (b) => (
        <>
          <strong>{b.contact.name}</strong>
          <small>{b.contact.phone}</small>
        </>
      ),
    },
    {
      key: "time",
      label: "Thời gian thuê",
      render: (b) => (
        <>
          <span>{dateTime(b.start)}</span>
          <small>Đến {dateTime(b.end)}</small>
        </>
      ),
      sort: (b) => b.start,
    },
    {
      key: "amount",
      label: "Tổng giá trị",
      render: (b) => money(b.snapshot.price.total),
      sort: (b) => b.snapshot.price.total,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (b) => (
        <>
          <StatusBadge booking={b} now={now} />
          <small>{paymentLabels[b.paymentStatus]}</small>
        </>
      ),
    },
    {
      key: "action",
      label: "Thao tác",
      render: (b) => (
        <Link className="text-link" href={href(b)}>
          Xem chi tiết
        </Link>
      ),
    },
  ];
  if (scope === "admin")
    columns.splice(2, 0, {
      key: "studio",
      label: "Studio & Chủ",
      render: (b) => (
        <>
          <strong>{b.snapshot.studioName}</strong>
          <small>{db.users.find((u) => u.id === b.ownerId)?.name}</small>
          {requiresAttention(db, b, now) && (
            <Badge tone="warning">Cần theo dõi</Badge>
          )}
        </>
      ),
    });
  return (
    <>
      <PageHeading
        title={scope === "customer" ? "Đơn thuê của tôi" : "Quản lý đơn thuê"}
        description={
          scope === "customer"
            ? "Theo dõi thời gian thuê, đặt cọc và xác nhận."
            : "Xem trạng thái và xử lý trong chi tiết từng đơn."
        }
      />
      <div className="tabs" role="tablist" aria-label="Trạng thái đơn">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            onClick={() => update({ tab: t }, true)}
          >
            {t === "all"
              ? "Tất cả"
              : t === "history"
                ? "Lịch sử"
                : statusLabels[t as keyof typeof statusLabels]}
            {t === "pending-confirmation" && (
              <span>
                {
                  own.filter(
                    (b) => displayStatus(b, now) === "pending-confirmation",
                  ).length
                }
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="list-filters">
        <Field label="Tìm đơn thuê" id="bookings-search">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value }, true)}
            placeholder={
              scope === "customer"
                ? "Mã đơn, phòng hoặc Studio"
                : "Mã đơn, khách hàng hoặc phòng"
            }
          />
        </Field>
        <Field label="Từ ngày thuê" id="bookings-from">
          <Input
            type="date"
            value={from ?? ""}
            onChange={(e) => update({ from: e.target.value }, true)}
          />
        </Field>
        <Field label="Đến ngày thuê" id="bookings-to">
          <Input
            type="date"
            value={to ?? ""}
            onChange={(e) => update({ to: e.target.value }, true)}
          />
        </Field>
        {scope !== "customer" && (
          <Field label="Phòng" id="bookings-room">
            <Select
              value={room ?? ""}
              onChange={(e) => update({ room: e.target.value }, true)}
            >
              <option value="">Tất cả phòng</option>
              {db.rooms
                .filter((r) => own.some((b) => b.roomId === r.id))
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        {scope === "admin" && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={attention}
              onChange={(e) =>
                update({ attention: e.target.checked ? "true" : null }, true)
              }
            />
            Chỉ đơn cần theo dõi
          </label>
        )}
      </div>
      {scope === "customer" ? (
        <div className="customer-booking-list">
          {rows.length ? (
            rows.slice((page - 1) * pageSize, page * pageSize).map((b) => (
              <article className="customer-booking-card" key={b.id}>
                <StudioImage src={b.snapshot.image} alt={b.snapshot.roomName} />
                <div>
                  <Link className="booking-code" href={href(b)}>
                    {b.code}
                  </Link>
                  <h2>
                    <Link href={href(b)}>{b.snapshot.roomName}</Link>
                  </h2>
                  <p>
                    {dateTime(b.start)} → {dateTime(b.end)}
                  </p>
                  <div className="actions">
                    <StatusBadge booking={b} now={now} />
                    <small>{paymentLabels[b.paymentStatus]}</small>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <strong>{money(b.snapshot.price.total)}</strong>
                  <Button asChild variant="outline">
                    <Link
                      href={
                        displayStatus(b, now) === "awaiting-deposit"
                          ? `/payment/${b.code}`
                          : href(b)
                      }
                    >
                      {displayStatus(b, now) === "awaiting-deposit"
                        ? "Tiếp tục đặt cọc"
                        : "Xem chi tiết"}
                    </Link>
                  </Button>
                  {displayStatus(b, now) === "awaiting-deposit" && (
                    <Link className="text-link" href={href(b)}>
                      Chi tiết đơn
                    </Link>
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title={
                own.length ? "Không có đơn phù hợp" : "Bạn chưa có đơn thuê"
              }
              description="Thử thay đổi bộ lọc hoặc tìm một Studio để bắt đầu."
              href="/studios"
              action="Khám phá Studio"
            />
          )}
        </div>
      ) : (
        <DataTable
          rows={rows.slice((page - 1) * pageSize, page * pageSize)}
          columns={columns}
          id={(b) => b.id}
          label="Danh sách đơn thuê"
        />
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onChange={(page) => update({ page })}
      />
    </>
  );
}
export function BookingDetail({
  code,
  scope,
}: {
  code: string;
  scope: "customer" | "host" | "admin";
}) {
  const { db, user, now, service } = useApp(),
    mutation = useMutation(),
    router = useRouter(),
    { params } = useUrlState();
  const [action, setAction] = useState<BookingAction | null>(null),
    [rejection, setRejection] = useState("Lịch không khả dụng");
  const booking = db?.bookings.find(
    (b) =>
      b.code === code &&
      (scope === "customer"
        ? b.customerId === user?.id
        : scope === "host"
          ? b.ownerId === user?.id
          : user?.role === "admin"),
  );
  if (!booking || !db || !user)
    return (
      <EmptyState
        title="Không tìm thấy đơn thuê"
        description="Đơn không tồn tại hoặc bạn không có quyền xem."
      />
    );
  const status = displayStatus(booking, now),
    base = scope === "customer" ? "/my-bookings" : `/${scope}/bookings`,
    back = params.get("returnTo")?.startsWith(base)
      ? params.get("returnTo")!
      : base,
    room = db.rooms.find((r) => r.id === booking.roomId),
    rebookable = room && getEffectiveRoomStatus(db, room, now) === "bookable";
  const label =
    action === "confirm"
      ? "Xác nhận đơn thuê"
      : action === "reject"
        ? "Từ chối đơn thuê"
        : action === "complete"
          ? "Hoàn thành đơn thuê"
          : scope === "admin"
            ? "Admin hủy đơn"
            : "Hủy đơn thuê";
  function rebook() {
    if (!room) return;
    const request = defaultRequest(db!, room, now);
    service.saveDraft(room.slug, {
      ...request,
      participants: booking!.participants,
      equipment: booking!.snapshot.price.equipment.map((e) => ({
        id: e.id,
        quantity: e.quantity,
      })),
      step: 1,
      notes: booking!.notes,
      contact: booking!.contact,
      acknowledged: false,
    });
    router.push(`/booking/${room.slug}`);
  }
  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href={back}>Danh sách đơn thuê</Link>
        <span>/</span>
        <span>{booking.code}</span>
      </nav>
      <PageHeading
        title={booking.code}
        description={booking.snapshot.roomName}
        action={
          <Button
            variant="outline"
            onClick={() =>
              mutation(
                () => navigator.clipboard.writeText(booking.code),
                "Đã sao chép mã đơn.",
              )
            }
          >
            <Copy size={16} /> Sao chép mã
          </Button>
        }
      />
      <div className="booking-detail-layout">
        <div>
          <section className="surface booking-snapshot">
            <StudioImage
              src={booking.snapshot.image}
              alt={booking.snapshot.roomName}
            />
            <div>
              <h2>{booking.snapshot.roomName}</h2>
              <p>{booking.snapshot.studioName}</p>
              <p className="muted">{booking.snapshot.address}</p>
              <p>
                {dateTime(booking.start)} → {dateTime(booking.end)}
              </p>
              <p>{booking.participants} người</p>
              <StatusBadge booking={booking} now={now} />
            </div>
          </section>
          <section className="surface">
            <h2>Thông tin liên hệ</h2>
            <p>{booking.contact.name}</p>
            <div className="contact-links">
              <a href={`tel:${booking.contact.phone}`}>
                <Phone size={16} />
                {booking.contact.phone}
              </a>
              <a href={`mailto:${booking.contact.email}`}>
                <Mail size={16} />
                {booking.contact.email}
              </a>
            </div>
            {booking.notes && <p className="notice">{booking.notes}</p>}
            <h3>Thiết bị đã đặt</h3>
            {booking.snapshot.price.equipment.length ? (
              <ul>
                {booking.snapshot.price.equipment.map((e) => (
                  <li key={e.id}>
                    {e.name} × {e.quantity} · {e.units}{" "}
                    {unitLabelsForDetail(e.unit)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Không thuê thêm thiết bị.</p>
            )}
          </section>
          <section className="surface">
            <h2>Lịch sử xử lý</h2>
            <ol className="timeline">
              {booking.timeline.map((event) => (
                <li key={event.id}>
                  <strong>{event.action}</strong>
                  <small>
                    {dateTime(event.at)} · {event.actorName}
                  </small>
                  {event.reason && <p>{event.reason}</p>}
                </li>
              ))}
            </ol>
            {status === "expired" &&
              !booking.timeline.some((e) => e.action === "Hết hạn giữ chỗ") && (
                <p className="notice" role="status">
                  Đơn đã hết hạn giữ chỗ.
                </p>
              )}
          </section>
          <section className="surface">
            <h2>Quy định đã ghi nhận khi đặt</h2>
            <p>{booking.snapshot.rules}</p>
          </section>
        </div>
        <aside className="booking-action-aside">
          <div className="surface">
            <h2>Chi phí đơn thuê</h2>
            <PriceBreakdown price={booking.snapshot.price} />
            <p>
              <Badge
                tone={
                  booking.paymentStatus === "success" ? "success" : "neutral"
                }
              >
                {paymentLabels[booking.paymentStatus]}
              </Badge>
            </p>
            <p className="muted">
              Đã đặt cọc mô phỏng: {money(booking.depositPaid)}. Khoản còn lại
              chưa thu trong demo.
            </p>
            {booking.refundStatus === "pending-policy" && (
              <div className="notice">
                Khoản cọc chờ xử lý theo chính sách. Chưa thực hiện hoàn tiền.
              </div>
            )}
            <div className="booking-detail-actions">
              {scope === "customer" && status === "awaiting-deposit" && (
                <Button asChild>
                  <Link href={`/payment/${code}`}>Tiếp tục đặt cọc</Link>
                </Button>
              )}
              {(["confirm", "reject", "complete", "cancel"] as BookingAction[])
                .filter((a) => canTransition(booking, user, a, now))
                .map((a) => (
                  <Button
                    key={a}
                    variant={
                      a === "cancel" || a === "reject"
                        ? "destructive"
                        : "default"
                    }
                    onClick={() => setAction(a)}
                  >
                    {a === "confirm"
                      ? "Xác nhận đơn"
                      : a === "reject"
                        ? "Từ chối đơn"
                        : a === "complete"
                          ? "Đánh dấu hoàn thành"
                          : scope === "admin"
                            ? "Hủy đơn đặc biệt"
                            : "Hủy đơn thuê"}
                  </Button>
                ))}
              {scope === "customer" &&
                ["cancelled", "rejected", "expired"].includes(status) && (
                  <>
                    <Button
                      variant="outline"
                      disabled={!rebookable}
                      onClick={rebook}
                    >
                      Đặt lại Studio này
                    </Button>
                    {!rebookable && (
                      <p className="field-hint">
                        Phòng hiện không nhận đơn mới.
                      </p>
                    )}
                  </>
                )}
              {scope === "admin" && (
                <p className="field-hint">
                  Admin chỉ được hủy đơn đủ điều kiện. Chủ Studio thực hiện xác
                  nhận và hoàn thành.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={label}
        description={
          action === "cancel" || action === "reject"
            ? "Phòng và thiết bị sẽ được giải phóng. Nếu đã đặt cọc, khoản cọc chờ xử lý theo chính sách; không hoàn tiền tự động."
            : action === "complete"
              ? "Đánh dấu buổi thuê đã hoàn thành. Chi phí được ghi nhận theo giá đã lưu trong đơn."
              : "Xác nhận tiếp nhận buổi thuê và các thiết bị đã đặt."
        }
        destructive={action === "cancel" || action === "reject"}
        requireReason={
          (action === "cancel" && scope !== "customer") ||
          (action === "reject" && rejection === "Khác")
        }
        label={label}
        onConfirm={(reason) => {
          service.transitionBooking(
            code,
            action!,
            action === "reject"
              ? rejection === "Khác"
                ? reason
                : rejection
              : reason,
          );
        }}
      >
        <p>
          <strong>{booking.snapshot.roomName}</strong>
          <br />
          {dateTime(booking.start)} → {dateTime(booking.end)}
        </p>
        {action === "reject" && (
          <Field label="Lý do từ chối" id="reject-reason">
            <Select
              value={rejection}
              onChange={(e) => setRejection(e.target.value)}
            >
              {[
                "Lịch không khả dụng",
                "Phòng cần bảo trì",
                "Yêu cầu không phù hợp",
                "Khác",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
        )}
      </ConfirmDialog>
    </>
  );
}
function unitLabelsForDetail(unit: string) {
  return (
    ({ hour: "giờ", session: "buổi", day: "ngày" } as Record<string, string>)[
      unit
    ] ?? unit
  );
}
export function CustomerBookings({ code }: { code?: string }) {
  return (
    <AccessGuard>
      <main
        id="main-content"
        tabIndex={-1}
        className="container customer-bookings-page"
      >
        {code ? (
          <BookingDetail code={code} scope="customer" />
        ) : (
          <BookingList scope="customer" />
        )}
      </main>
    </AccessGuard>
  );
}
