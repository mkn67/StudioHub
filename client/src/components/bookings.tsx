"use client";
import { Presence, SharedPhoto, useContentMotion } from "./motion/system";
import Image from "@/components/image";
import { useState } from "react";
import Link from "./motion/navigation-link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, AlertTriangle } from "lucide-react";
import { useStore, useSession } from "./store";
import { BookingRow, PageHeading, Empty, Modal } from "./ui";
import { BookingWizard } from "./wizard";
import { RentalPriceSummary } from "@/features/pricing/components/RentalPriceSummary";
import { BookingStatusFilters, matchesBookingStatus, type BookingStatusFilter } from "./booking-status-filters";
import {
  money,
  dateTime,
  statusLabel,
  paymentLabel,
  refundLabel,
  planLabel,
} from "@/domain/models";
import { balance, HOUR, studioFor, type Command } from "@/domain/engine";
export function CustomerBookings({ history = false }: { history?: boolean }) {
  const { state } = useStore(),
    user = useSession();
  const [status, setStatus] = useState<BookingStatusFilter>("all"),
    [query, setQuery] = useState("");
  const resultsRef = useContentMotion(`${status}|${query}|${history}|${state.bookings.map(b=>`${b.id}:${b.status}`).join()}`);
  if (!user)
    return (
      <Empty
        title="Những buổi sáng tạo của bạn"
        text="Đăng nhập để theo dõi và quản lý các phòng đã đặt."
        href="/login"
        label="Đăng nhập"
      />
    );
  const searchableBookings = state.bookings
    .filter(
      (b) =>
        b.customerId === user.id &&
        (!history ||
          ["completed", "cancelled", "expired", "no_show"].includes(
            b.status,
          )) &&
        (b.id.toLowerCase().includes(query.toLowerCase()) ||
          b.roomId.includes(query.toLowerCase())),
    );
  const bookings = searchableBookings
    .filter(b => matchesBookingStatus(b, status, state.now))
    .sort((a, b) => b.start - a.start);
  return (
    <div className="container account-page">
      <PageHeading
        title={history ? "Lịch sử đặt thuê" : "Đơn của tôi"}
        description="Lịch sáng tạo, xác nhận và thanh toán ở cùng một nơi."
        action={
          <Link className="btn secondary" href="/rooms">
            Đặt thêm không gian <ArrowRight size={16} />
          </Link>
        }
      />
      {user.restricted && (
        <div className="note warning">
          Quyền tạo đơn và đổi lịch đang tạm ngưng. Các đơn đã xác nhận vẫn sử
          dụng bình thường.
        </div>
      )}
      <BookingStatusFilters bookings={searchableBookings} value={status} now={state.now} onChange={setStatus} />
      <label className="search-input">
        <span className="sr-only">Tìm mã đơn hoặc phòng</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm mã đơn hoặc mã phòng…"
        />
      </label>
      <div ref={resultsRef} className="booking-results">{bookings.map((b) => (
        <BookingRow key={b.id} booking={b} />
      ))}
      {!bookings.length && (
        <Empty
          title="Chưa có đơn phù hợp"
          text="Thay đổi bộ lọc hoặc khám phá một không gian mới cho ý tưởng tiếp theo."
          href="/rooms"
        />
      )}</div>
    </div>
  );
}
export function Payment({
  id,
  result = false,
}: {
  id: string;
  result?: boolean;
}) {
  const { state, dispatch } = useStore(),
    user = useSession(),
    router = useRouter();
  const b = state.bookings.find((b) => b.id === id);
  if (!user)
    return (
      <Empty
        title="Đăng nhập để thanh toán"
        text="Chỉ chủ đơn được thực hiện thanh toán mô phỏng."
        href="/login"
        label="Đăng nhập"
      />
    );
  if (!b || b.customerId !== user.id)
    return (
      <Empty
        title="Không tìm thấy đơn"
        text="Kiểm tra lại mã đơn trong danh sách của bạn."
        href="/my-bookings"
        label="Đơn của tôi"
      />
    );
  const room = state.rooms.find((r) => r.id === b.roomId)!;
  const remaining = Math.max(0, Math.ceil((b.deadline - state.now) / 60000));
  const canPay =
    b.status === "awaiting_payment" &&
    (state.now < b.deadline || b.payment === "processing");
  const pay = async (outcome: "paid" | "failed" | "processing") => {
    if ((await dispatch({ type: "payment", id, outcome })) && outcome !== "processing")
      router.push(`/payment/${id}/result`);
  };
  return (
    <div className="container payment-page">
      <Link className="text-link" href={`/my-bookings/${id}`}>
        ← Chi tiết đơn
      </Link>
      <PageHeading
        title={
          result
            ? b.payment === "paid"
              ? "Đã nhận khoản cọc mô phỏng."
              : b.payment === "failed"
                ? "Thanh toán chưa thành công."
                : "Trạng thái thanh toán"
            : "Thêm một bước để giữ không gian."
        }
        description="Môi trường minh họa · Không có tiền thật được chuyển."
      />
      <div className="payment-grid">
        <div className="payment-main">
          <div className={`payment-state ${b.payment}`}>
            {b.payment === "paid" ? (
              <Check size={32} />
            ) : b.status === "expired" ? (
              <AlertTriangle size={32} />
            ) : (
              <Clock size={32} />
            )}
            <h2>{paymentLabel[b.payment]}</h2>
            <p>
              {b.payment === "paid"
                ? "Chủ Studio có 2 giờ để xác nhận. Hệ thống tự hủy và hoàn 100% cọc nếu quá hạn."
                : b.reconciliation
                  ? "Giao dịch chưa rõ kết quả cần đối soát; không tính vi phạm. Máy chủ giữ tài nguyên cho đến khi xác minh."
                  : b.status === "expired"
                    ? "Giữ chỗ đã hết hiệu lực. Hãy chọn lại lịch phù hợp."
                    : b.payment === "processing"
                      ? "Giao dịch bắt đầu trước hạn được giữ thêm tối đa 5 phút, sau đó cần đối soát."
                      : `Thanh toán trước ${dateTime(b.deadline)}. Còn ${remaining} phút theo đồng hồ mô phỏng.`}
            </p>
          </div>
          {canPay && (
            <div className="payment-actions">
              <button className="btn full" onClick={() => pay("paid")}>
                Mô phỏng thanh toán thành công
              </button>
              <button
                className="btn secondary full"
                onClick={() => pay("failed")}
              >
                Mô phỏng thanh toán thất bại
              </button>
              {b.payment !== "processing" && state.now < b.deadline && (
                <button
                  className="text-button"
                  onClick={() => pay("processing")}
                >
                  Mô phỏng giao dịch đang xử lý
                </button>
              )}
            </div>
          )}
          <p className="small-text muted">
            Bỏ thanh toán quá hạn có thể phát sinh 1 vi phạm. Giao dịch lỗi đã
            xác minh hoặc chưa rõ kết quả không tự tính vi phạm.
          </p>
          {(b.payment === "paid" || !canPay) && (
            <Link className="btn" href={`/my-bookings/${id}`}>
              Theo dõi đơn
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <aside className="order-summary">
          <Image
            width={1400}
            height={1000}
            src={room.images[0]}
            alt={`Phòng ${room.code}`}
          />
          <h3>
            {room.name} / {room.code}
          </h3>
          <p>
            {dateTime(b.start)} — {dateTime(b.end)}
          </p>
          <p className="mono muted">{b.id}</p>
          <div className="line-item">
            <span>Tổng giá</span>
            <span>{money(b.total)}</span>
          </div>
          <div className="line-item total">
            <span>Tiền cọc</span>
            <strong>{money(b.deposit)}</strong>
          </div>
          <div className="line-item">
            <span>Còn lại sau cọc</span>
            <span>{money(b.total - b.deposit)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
type Action =
  | "cancel"
  | "reject"
  | "admin_cancel"
  | "collect"
  | "refund"
  | "reconcile"
  | "resolve_refund"
  | "checkout"
  | "checkin"
  | "approve";
export function BookingDetail({ id }: { id: string }) {
  const { state, dispatch, notice } = useStore(),
    user = useSession();
  const [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState(""),
    [amount, setAmount] = useState(0),
    [method, setMethod] = useState<"cash" | "transfer">("cash"),
    [change, setChange] = useState(false),
    [changeRoom, setChangeRoom] = useState("");
  const b = state.bookings.find((b) => b.id === id);
  if (!user)
    return (
      <Empty
        title="Vui lòng đăng nhập"
        text="Đăng nhập để xem thông tin đặt thuê."
        href="/login"
        label="Đăng nhập"
      />
    );
  if (
    !b ||
    (user.role === "customer" && b.customerId !== user.id) ||
    (user.role === "host" && studioFor(state, b.roomId)?.hostId !== user.id)
  )
    return (
      <Empty
        title="Không tìm thấy đơn"
        text="Bạn không có quyền truy cập đơn này."
        href="/my-bookings"
        label="Quay lại"
      />
    );
  const room = state.rooms.find((r) => r.id === b.roomId)!,
    customer = state.users.find((u) => u.id === b.customerId)!;
  const pending = b.changes.find((c) => c.status === "pending");
  const customerCanCancel =
    user.role === "customer" &&
    ["awaiting_payment", "pending", "confirmed"].includes(b.status) &&
    b.payment !== "processing" &&
    (b.payment !== "paid" ||
      state.now <= b.start - b.policy.cancelHours * HOUR);
  const actionText: Record<Action, string> = {
    cancel: "Hủy đơn đặt thuê",
    reject: "Từ chối cho thuê",
    admin_cancel: "Hủy ngoại lệ trước giờ thuê",
    collect: "Ghi nhận khoản thu",
    refund: "Xử lý hoàn cọc mô phỏng",
    reconcile: "Đối soát thanh toán mô phỏng",
    resolve_refund: "Xác minh hoàn tiền thủ công",
    checkout: "Xác nhận đã trả phòng",
    checkin: "Xác nhận đã nhận phòng",
    approve: "Xác nhận cho thuê",
  };
  const submit = async (outcome?: "failed" | "refunded") => {
    if (!action) return;
    let command: Command;
    if (action === "collect")
      command = {
        type: "collect",
        id,
        amount,
        method,
        collectionId: crypto.randomUUID(),
      };
    else if (action === "refund")
      command = { type: "refund", id, outcome: outcome ?? "refunded" };
    else if (action === "reconcile")
      command = { type: "reconcile", id, paid: outcome !== "failed", reason };
    else if (action === "resolve_refund")
      command = { type: "resolve_refund", id, reason };
    else command = { type: action, id, reason };
    if ((await dispatch(command))) {
      setAction(null);
      setReason("");
      notice("Đã cập nhật đơn.");
    }
  };
  return (
    <div className="booking-detail">
      <div className="breadcrumbs">
        <Link
          href={
            user.role === "host"
              ? "/host/bookings"
              : user.role === "admin"
                ? "/admin"
                : "/my-bookings"
          }
        >
          Danh sách đơn
        </Link>
        <span>/</span>
        {b.id}
      </div>
      <header className="booking-header">
      <div className="status-line">
        <span className={`status ${b.status}`}>{statusLabel[b.status]}</span>
        <span className={`payment-badge ${b.payment}`}>{paymentLabel[b.payment]}</span>
        {b.reconciliation && (
          <span className="error">Cần đối soát giao dịch</span>
        )}
      </div>
      <PageHeading
        title={`${room.name} / ${room.code}`}
        description={`${dateTime(b.start)} — ${dateTime(b.end)}`}
      />
      </header>
      <div className="detail-layout">
        {state.audit.some(
          (e) => e.target === id && e.action === "overtime.conflict",
        ) && (
          <div className="note warning overtime-alert">
            <strong>Quá giờ ảnh hưởng ca tiếp theo</strong>
            <p>
              Cần xử lý vận hành thủ công. Lịch của khách tiếp theo giữ nguyên.
            </p>
          </div>
        )}
        <div>
          <SharedPhoto name={`booking-${b.id}`}><Image
            width={1400}
            height={1000}
            className="booking-detail-photo"
            src={room.images[0]}
            alt={`Phòng ${room.code}`}
          /></SharedPhoto>
          <div className="detail-section">
            <h2>Thông tin đặt thuê</h2>
            {[
              ["Mã đơn", b.id],
              ["Khách hàng", customer.name],
              ["Liên hệ", `${customer.phone} · ${customer.email}`],
              ["Gói thuê", `${b.rentalSnapshot?.plan.title ?? planLabel[b.plan]} · ${b.participants} người`],
              ["Vị trí", room.floor],
              [
                "Nhận phòng thực tế",
                b.actualIn ? dateTime(b.actualIn) : "Chưa nhận phòng",
              ],
              [
                "Trả phòng thực tế",
                b.actualOut ? dateTime(b.actualOut) : "Chưa trả phòng",
              ],
            ].map(([l, v]) => (
              <div className="line-item" key={l}>
                <span className="muted">{l}</span>
                <span>{v}</span>
              </div>
            ))}
            {Object.entries(b.equipment)
              .filter(([, q]) => q > 0)
              .map(([id, q]) => (
                <div className="line-item" key={id}>
                  <span>{state.equipment.find((e) => e.id === id)?.name}</span>
                  <span>× {q}</span>
                </div>
              ))}
          </div>
          {b.rentalSnapshot && <section className="detail-section">
            <h2>Giá & nội dung gói đã lưu</h2>
            <RentalPriceSummary snapshot={b.rentalSnapshot} />
            {Object.entries(b.rentalSnapshot.plan.includedEquipment).map(([id, q]) => <p key={id}>{q} × {state.equipment.find(e => e.id === id)?.name ?? id} · Đã bao gồm, không tính thêm</p>)}
            {b.rentalSnapshot.plan.includedServices.filter(Boolean).map((service, i) => <p key={i}>{service} · Đã bao gồm</p>)}
          </section>}
          <section className="detail-section">
            <h2>Lịch sử đơn</h2>
            <ol className="timeline">
              {b.history.map((h, i) => (
                <li key={i}>
                  <span className="mono muted">{dateTime(h.at)}</span>
                  <p>{h.text}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="detail-section">
            <h2>Chính sách đã lưu khi đặt</h2>
            <p>
              Tự hủy trước {b.policy.cancelHours} giờ.{" "}
              {b.policy.refundTiers
                .map((t) => `Trước ${t.hours} giờ: hoàn ${t.percent}% cọc`)
                .join("; ")}
              .
            </p>
            <p>
              Đổi lịch trước {b.policy.changeHours} giờ, tối đa 1 lần thành
              công. Quá giờ {money(b.policy.overtimePerBlock)} / 30 phút, làm
              tròn lên.
            </p>
            <p className="small-text muted">
              Thay đổi chính sách sau này không ảnh hưởng đơn này.
            </p>
          </section>
          {b.changes.length > 0 && (
            <section className="detail-section">
              <h2>Yêu cầu thay đổi</h2>
              {b.changes.map((c, i) => (
                <div className="note" key={i}>
                  <strong>
                    {c.status === "pending"
                      ? "Đang chờ chủ Studio duyệt"
                      : c.status === "approved"
                        ? "Đã duyệt"
                        : c.status === "withdrawn"
                          ? "Đã rút yêu cầu"
                          : "Đã từ chối"}
                  </strong>
                  <p>
                    {c.selection.roomId.toUpperCase()} ·{" "}
                    {dateTime(c.selection.start)} — {dateTime(c.selection.end)}
                  </p>
                  {c.status === "pending" && (
                    <>
                      <p>Lịch và phòng cũ vẫn giữ nguyên cho đến khi duyệt.</p>
                      <div className="actions">
                        {user.role === "host" ? (
                          <>
                            <button
                              className="btn"
                              onClick={async () =>
                                (await dispatch({ type: "approve_change", id }))
                              }
                            >
                              Duyệt thay đổi
                            </button>
                            <button
                              className="btn secondary"
                              onClick={async () =>
                                (await dispatch({ type: "reject_change", id }))
                              }
                            >
                              Từ chối thay đổi
                            </button>
                          </>
                        ) : (
                          user.role === "customer" && (
                            <button
                              className="btn secondary"
                              onClick={async () =>
                                (await dispatch({ type: "withdraw_change", id }))
                              }
                            >
                              Rút yêu cầu
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
        <aside>
          <div className="finance-panel">
            <h2>Chi phí & thanh toán</h2>
            <div className="line-item">
              <span>Tổng tiền thuê</span>
              <strong>{money(b.total)}</strong>
            </div>
            <div className="line-item">
              <span>Quá giờ</span>
              <span>{money(b.overtime)}</span>
            </div>
            <div className="line-item">
              <span>Cọc {b.payment === "paid" ? "đã trả" : "cần trả"}</span>
              <span>{money(b.deposit)}</span>
            </div>
            <div className="line-item">
              <span>Đã thu bổ sung</span>
              <span>
                {money(b.collections.reduce((s, c) => s + c.amount, 0))}
              </span>
            </div>
            <div className={`line-item total ${['cancelled','expired','no_show'].includes(b.status) ? 'quote-difference' : 'balance-due'}`}>
                <span>{['cancelled','expired','no_show'].includes(b.status)?'Chênh lệch báo giá ban đầu':'Còn phải thu'}</span>
              <strong>{money(balance(b))}</strong>
            </div>
            <p className="small-text muted">
              {b.status === "no_show"
                ? "No-show giữ cọc; không tự phát sinh nghĩa vụ trả phần thuê còn lại."
                : ["cancelled", "expired"].includes(b.status)
                  ? "Đơn không còn hiệu lực. Số dư trên là chênh lệch báo giá, không phải khoản thu tự động."
                  : "Trả phòng và quyết toán được theo dõi độc lập."}
            </p>
            {b.refund.status !== "not_required" && (
              <div className={`note refund-note ${b.refund.status}`}>
                <strong>
                  {refundLabel[b.refund.status]} · {money(b.refund.amount)}
                </strong>
                <p>
                  {b.refund.reason === "excess_deposit"
                    ? "Cọc dư sau đổi lịch"
                    : b.refund.reason === "host_timeout"
                      ? "Chủ Studio quá hạn xác nhận"
                      : "Hoàn theo chính sách / hủy đơn"}
                </p>
                <small>
                  {b.refund.attempts.length} lần thử ·{" "}
                  {b.refund.escalated
                    ? "Chuyển Admin xử lý"
                    : "Lưu lịch sử từng lần"}
                </small>
              </div>
            )}
            <div className="stack-actions">
              {user.role === "admin" && b.reconciliation && (
                <button
                  className="btn secondary"
                  onClick={() => setAction("reconcile")}
                >
                  Đối soát giao dịch
                </button>
              )}
              {user.role === "admin" && b.refund.escalated && (
                <button
                  className="btn secondary"
                  onClick={() => setAction("resolve_refund")}
                >
                  Xác minh hoàn thủ công
                </button>
              )}
              {user.role === "customer" && (
                <>
                  {b.status === "awaiting_payment" && (
                    <Link className="btn" href={`/payment/${id}`}>
                      Thanh toán cọc mô phỏng
                    </Link>
                  )}
                  {customerCanCancel && (
                    <button
                      className="btn secondary destructive"
                      onClick={() => setAction("cancel")}
                    >
                      Hủy đơn
                    </button>
                  )}
                  {b.status === "confirmed" &&
                    !user.restricted &&
                    !pending &&
                    !b.changes.some((c) => c.status === "approved") &&
                    state.now <= b.start - b.policy.changeHours * HOUR && (
                      <>
                        <label>
                          Phòng muốn đổi
                          <select
                            value={changeRoom || b.roomId}
                            onChange={(e) => setChangeRoom(e.target.value)}
                          >
                            {state.rooms
                              .filter(
                                (r) =>
                                  r.active &&
                                  studioFor(state, r.id)?.id ===
                                    studioFor(state, b.roomId)?.id,
                              )
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.code} · {r.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          className="btn secondary"
                          onClick={() => setChange(true)}
                        >
                          Yêu cầu đổi lịch / phòng
                        </button>
                      </>
                    )}
                </>
              )}
              {user.role === "host" && (
                <>
                  {b.status === "pending" && (
                    <>
                      <button
                        className="btn"
                        onClick={() => setAction("approve")}
                      >
                        Xác nhận cho thuê
                      </button>
                      <button
                        className="btn secondary destructive"
                        onClick={() => setAction("reject")}
                      >
                        Từ chối & hoàn cọc
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      className="btn"
                      disabled={state.now < b.start || state.now >= b.end}
                      onClick={() => setAction("checkin")}
                    >
                      Xác nhận nhận phòng
                    </button>
                  )}
                  {b.status === "checked_in" && (
                    <button
                      className="btn"
                      onClick={() => setAction("checkout")}
                    >
                      Xác nhận trả phòng
                    </button>
                  )}
                  {["checked_in", "completed"].includes(b.status) &&
                    balance(b) > 0 && (
                      <button
                        className="btn secondary"
                        onClick={() => {
                          setAmount(balance(b));
                          setAction("collect");
                        }}
                      >
                        Ghi nhận thu tiền
                      </button>
                    )}
                </>
              )}
              {["host", "admin"].includes(user.role) &&
                ["pending", "failed"].includes(b.refund.status) &&
                !b.refund.escalated && (
                  <button
                    className="btn secondary"
                    onClick={() => setAction("refund")}
                  >
                    Xử lý khoản hoàn
                  </button>
                )}
              {user.role === "admin" &&
                ["awaiting_payment", "pending", "confirmed"].includes(
                  b.status,
                ) &&
                state.now < b.start && (
                  <button
                    className="btn secondary destructive"
                    onClick={() => setAction("admin_cancel")}
                  >
                    Hủy ngoại lệ
                  </button>
                )}
            </div>
            {b.collections.length > 0 && (
              <>
                <h3>Lịch sử thu tiền</h3>
                {b.collections.map((c) => (
                  <div className="collection" key={c.id}>
                    <strong>{money(c.amount)}</strong>
                    <small>
                      {dateTime(c.at)} ·{" "}
                      {c.method === "cash"
                        ? "Tiền mặt"
                        : "Chuyển khoản mô phỏng"}
                    </small>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>
      </div>
      <Presence>{action && (
        <Modal title={actionText[action]} onClose={() => setAction(null)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {["reconcile", "resolve_refund"].includes(action) && (
              <>
                <p>
                  Chỉ ghi nhận kết quả đã được xác minh. Không mở lại phòng đã
                  hết hiệu lực và không tự tạo lần chuyển tiền mới.
                </p>
                <label>
                  Lý do / bằng chứng mô phỏng
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {action === "reconcile" && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={!reason.trim()}
                    onClick={() => submit("failed")}
                  >
                    Xác minh chưa nhận tiền
                  </button>
                )}
              </>
            )}
            {["cancel", "reject", "admin_cancel"].includes(action) && (
              <>
                <p>
                  Thao tác sẽ giải phóng phòng và thiết bị. Khoản hoàn được xử
                  lý riêng theo chính sách.
                </p>
                <label>
                  Lý do
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {action === "cancel" && b.payment !== "paid" && (
                  <p className="error">Hủy đơn chưa cọc phát sinh 1 vi phạm.</p>
                )}
              </>
            )}
            {action === "collect" && (
              <>
                <label>
                  Số tiền (VND)
                  <input
                    type="number"
                    required
                    min="1"
                    max={balance(b)}
                    value={amount}
                    onChange={(e) => setAmount(+e.target.value)}
                  />
                </label>
                <label>
                  Phương thức
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as "cash" | "transfer")
                    }
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản mô phỏng</option>
                  </select>
                </label>
              </>
            )}
            {action === "refund" && (
              <>
                <p>
                  Hoàn {money(b.refund.amount)}. Chỉ retry sau một thất bại đã
                  xác minh. Tối đa 2 lượt retry, sau đó chuyển Admin.
                </p>
                <button
                  type="button"
                  className="btn secondary full"
                  onClick={() => submit("failed")}
                >
                  Mô phỏng thất bại đã xác minh
                </button>
              </>
            )}
            {["approve", "checkin", "checkout"].includes(action) && (
              <p>
                {action === "checkin"
                  ? "Ghi giờ nhận phòng thực tế. Giờ trả dự kiến không thay đổi."
                  : action === "checkout"
                    ? "Ghi giờ trả thực tế, tính phụ thu quá giờ theo block 30 phút. Đơn hoàn tất dù vẫn còn công nợ."
                    : "Xác nhận cho thuê đúng phòng và thời gian đã đặt."}
              </p>
            )}
            <div className="actions">
              <button
                className="btn secondary"
                type="button"
                onClick={() => setAction(null)}
              >
                Quay lại
              </button>
              <button className={`btn ${["cancel", "reject", "admin_cancel"].includes(action) ? "destructive" : ""}`} type="submit">
                {action === "refund" ? "Mô phỏng hoàn thành công" : "Xác nhận"}
              </button>
            </div>
          </form>
        </Modal>
      )}</Presence>
      <Presence>{change && (
        <BookingWizard
          room={state.rooms.find((r) => r.id === (changeRoom || b.roomId))!}
          changeId={id}
          onClose={() => setChange(false)}
        />
      )}</Presence>
    </div>
  );
}
