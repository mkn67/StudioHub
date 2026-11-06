"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiSession } from "@/components/api-session";
import { ApiMessage, useApiAction } from "@/components/api-ui";
import { apiRequest, ApiError } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import type { ApiRoom, EquipmentItem, Quote, ApiBooking, BookingPage, CalendarData } from "@/services/api/contracts";
import { rentalRange, sqlVietnamTime, formatApiTime, vnTimestamp, bookingLabels, unitLabels } from "@/services/api/contracts";
import { money } from "@/domain/models";

function localSqlDate(value: Date) {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function suggestAvailableStarts(date: string, selectedTime: string, durationMinutes: number, busySlots: CalendarData["busy_slots"]) {
    const suggestions: { date: string; time: string; label: string }[] = [];
    const base = vnTimestamp(`${date} 00:00:00`);
    const selectedStart = vnTimestamp(`${date} ${selectedTime}:00`).getTime();
    for (let dayOffset = 0; dayOffset < 14 && suggestions.length < 4; dayOffset++) {
        const day = localSqlDate(new Date(base.getTime() + dayOffset * 86400000));
        for (let hour = 8; hour <= 20 && suggestions.length < 4; hour++) {
            const time = `${String(hour).padStart(2, "0")}:00`;
            const start = vnTimestamp(`${day} ${time}:00`);
            const end = new Date(start.getTime() + durationMinutes * 60000);
            const close = vnTimestamp(`${day} 22:00:00`);
            if (start <= new Date() || start.getTime() < selectedStart || end > close) continue;
            const busyEnd = new Date(end.getTime() + 30 * 60000);
            const overlaps = busySlots.some(slot => vnTimestamp(slot.busy_start).getTime() < busyEnd.getTime() && vnTimestamp(slot.busy_end).getTime() > start.getTime());
            if (!overlaps && !(day === date && time === selectedTime)) suggestions.push({ date: day, time, label: `${day} · ${time}` });
        }
    }
    return suggestions;
}

export function BackendBookingWizard({ id }: { id: string }) {
    const room = useResource<ApiRoom>(`/api/rooms/${encodeURIComponent(id)}`);
    const session = useApiSession();
    const router = useRouter();
    const equipment = useResource<EquipmentItem[]>(room.data ? `/api/equipments?studio_id=${room.data.studio_id}` : null);
    const draftKey = `studiohub.api-booking-draft.${id}`;
    const [selection, setSelection] = useState<Record<string, string>>({});
    const [draftReady, setDraftReady] = useState(false);
    const [quote, setQuote] = useState<{ key: string; value: Quote } | null>(null);
    const [quoteError, setQuoteError] = useState<{ key: string; message: string } | null>(null);
    const [suggestions, setSuggestions] = useState<{ date: string; time: string; label: string }[]>([]);
    const [quotingKey, setQuotingKey] = useState<string | null>(null);
    const [defaultDate] = useState(() => sqlVietnamTime(new Date(Date.now() + 86400000)).slice(0, 10));
    const action = useApiAction();
    const r = room.data;
    const values: Record<string, string> = {
        date: defaultDate, time: "09:00", units: String(r?.rates?.[0]?.minimum_units ?? 1), party_size: "1",
        rate_id: String(r?.rates?.[0]?.rate_id ?? ""), ...selection
    };
    const rate = r?.rates?.find(item => item.rate_id === Number(values.rate_id));
    const units = Number(values.units);
    const selectionKey = JSON.stringify(values);
    const currentQuote = quote?.key === selectionKey ? quote.value : null;
    const currentQuoteError = quoteError?.key === selectionKey ? quoteError.message : "";
    const quoting = quotingKey === selectionKey;
    const change = (key: string, value: string) => setSelection(previous => ({ ...previous, [key]: value }));
    const payload = () => {
        if (!r || !rate) throw new Error("Phòng chưa có bảng giá khả dụng.");
        return {
            room_id: r.room_id,
            rate_id: rate.rate_id,
            ...rentalRange(values.date, values.time, units, rate),
            party_size: Number(values.party_size),
            equipments: (equipment.data ?? [])
                .filter(item => ["available", "active"].includes(item.status) && Number(values[`equipment:${item.equipment_id}`]) > 0)
                .map(item => ({ equipment_id: item.equipment_id, quantity: Number(values[`equipment:${item.equipment_id}`]) }))
        };
    };
    let preview = "";
    try {
        if (rate) {
            const range = rentalRange(values.date, values.time, units, rate);
            preview = `${formatApiTime(range.start_time)} – ${formatApiTime(range.end_time)}`;
        }
    } catch { /* The quote below shows the actionable validation message. */ }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            try {
                const draft: unknown = JSON.parse(window.sessionStorage.getItem(draftKey) ?? "{}");
                if (draft && typeof draft === "object" && !Array.isArray(draft)) {
                    setSelection(Object.fromEntries(Object.entries(draft).filter(([key, value]) =>
                        /^(date|time|units|party_size|rate_id|equipment:\d+)$/.test(key) && typeof value === "string"
                    )));
                }
            } catch { /* Draft storage is optional. */ }
            setDraftReady(true);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [draftKey]);

    useEffect(() => {
        if (!draftReady) return;
        try { window.sessionStorage.setItem(draftKey, JSON.stringify(selection)); }
        catch { /* Draft storage is optional. */ }
    }, [draftKey, draftReady, selection]);

    useEffect(() => {
        if (!draftReady || !r || !rate || equipment.loading || equipment.error) return;
        let active = true;
        const timer = window.setTimeout(() => {
            setQuotingKey(selectionKey);
            setQuoteError(null);
            setSuggestions([]);
            let body: ReturnType<typeof payload>;
            try { body = payload(); }
            catch (error) {
                if (active) {
                    setQuoteError({ key: selectionKey, message: error instanceof Error ? error.message : "Lựa chọn chưa hợp lệ." });
                    setQuotingKey(null);
                }
                return;
            }
            void apiRequest<Quote>("/api/bookings/check-availability", { method: "POST", body })
                .then(result => {
                    if (!active) return;
                    if (!result.available) {
                        setQuoteError({ key: selectionKey, message: "Khung giờ này đã có người đặt. Hãy chọn giờ hoặc ngày khác." });
                        setQuote(null);
                    } else {
                        setQuote({ key: selectionKey, value: result });
                    }
                })
                .catch(async error => {
                    if (active) {
                        setQuote(null);
                        setQuoteError({ key: selectionKey, message: error instanceof Error ? error.message : "Không thể kiểm tra giá và lịch trống." });
                    }
                    if (active && error instanceof ApiError && error.status === 409) {
                        try {
                            const from = values.date;
                            const to = localSqlDate(new Date(vnTimestamp(`${from} 00:00:00`).getTime() + 13 * 86400000));
                            const calendar = await apiRequest<CalendarData>(`/api/rooms/${encodeURIComponent(id)}/calendar?from=${from}&to=${to}`);
                            const durationMinutes = rate ? Number(rate.unit_minutes) * units : 0;
                            const next = suggestAvailableStarts(from, values.time, durationMinutes, calendar.busy_slots);
                            if (active) setSuggestions(next);
                        } catch { /* Suggestions are optional; the customer can still choose another time manually. */ }
                    }
                })
                .finally(() => { if (active) setQuotingKey(null); });
        }, 400);
        return () => { active = false; window.clearTimeout(timer); };
        // The serialized selection includes every quote input; a changed choice invalidates the old quote.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectionKey, r, equipment.loading, equipment.error, draftReady]);

    return <div className="container account-page booking-flow">
        <header className="booking-flow-heading">
            <p className="booking-eyebrow">Đặt không gian · {r?.studio.name ?? "Studio"}</p>
            <h1>{r?.name ?? "Đặt phòng Studio"}</h1>
            <p>Chọn gói thuê và thiết bị. Lịch trống cùng tổng tiền sẽ được máy chủ kiểm tra tự động.</p>
        </header>
        <ApiMessage loading={room.loading || equipment.loading} error={room.error || equipment.error}/>
        {r && <form className="booking-flow-grid" onSubmit={event => {
            event.preventDefault();
            const contact = Object.fromEntries(new FormData(event.currentTarget));
            void action.run(async () => {
                if (!currentQuote || !session.user) throw new Error("Cần báo giá còn hiệu lực và tài khoản khách hàng.");
                const booking = await apiRequest<ApiBooking>("/api/bookings", {
                    method: "POST", body: { ...payload(), ...contact }
                });
                try { window.sessionStorage.removeItem(draftKey); } catch { /* Optional draft. */ }
                router.push(`/payment/${booking.booking_id}`);
            });
        }}>
            <div className="booking-flow-main">
                <section className="surface booking-step">
                    <div className="booking-step-title"><span>01</span><div><h2>Chọn gói thuê</h2><p>Mỗi phòng có bảng giá và thời lượng riêng.</p></div></div>
                    {r.rates?.length ? <div className="booking-rate-grid">
                        {r.rates.map(item => {
                            const chosen = values.rate_id === String(item.rate_id);
                            const duration = item.unit_minutes >= 1440
                                ? `${item.unit_minutes / 1440} ngày / đơn vị`
                                : `${item.unit_minutes / 60} giờ / đơn vị`;
                            return <label className={`booking-rate-card${chosen ? " selected" : ""}`} key={item.rate_id}>
                                <input type="radio" value={item.rate_id} checked={chosen}
                                    onChange={() => setSelection(previous => ({ ...previous, rate_id: String(item.rate_id), units: String(item.minimum_units) }))}/>
                                <span><strong>{unitLabels[item.rate_unit] ?? item.rate_unit}</strong><small>{duration}</small></span>
                                <b>{money(item.unit_price)}</b>
                            </label>;
                        })}
                    </div> : <p>Phòng này chưa có bảng giá khả dụng.</p>}
                </section>

                <section className="surface booking-step">
                    <div className="booking-step-title"><span>02</span><div><h2>Ngày giờ và ekip</h2><p>Thời gian bạn chọn đã gồm chuẩn bị và trả phòng.</p></div></div>
                    <div className="booking-field-grid">
                        <label>Ngày bắt đầu <small>Giờ Việt Nam</small>
                            <input required type="date" min={defaultDate} value={values.date} onChange={event => change("date", event.target.value)}/>
                        </label>
                        <label>Giờ bắt đầu
                            <input required type="time" value={values.time} onChange={event => change("time", event.target.value)}/>
                        </label>
                        <label>Số {unitLabels[rate?.rate_unit ?? "hour"] ?? "đơn vị"} thuê
                            <input required type="number" min={rate?.minimum_units ?? 1}
                                max={rate?.maximum_units ?? undefined} step={1} value={values.units}
                                onChange={event => change("units", event.target.value)}/>
                        </label>
                        <label>Số người tham gia <small>Tối đa {r.capacity} người</small>
                            <input required type="number" min={1} max={r.capacity} step={1}
                                value={values.party_size} onChange={event => change("party_size", event.target.value)}/>
                        </label>
                    </div>
                    {rate && <p className="booking-help">Gói {unitLabels[rate.rate_unit] ?? rate.rate_unit}: {rate.unit_minutes >= 1440 ? `${rate.unit_minutes / 1440} ngày` : `${rate.unit_minutes / 60} giờ`} mỗi đơn vị; từ {rate.minimum_units} đến {rate.maximum_units ?? "không giới hạn"} đơn vị. {["day", "week", "month"].includes(rate.rate_unit) ? "Phòng được giữ liên tục qua giờ đóng cửa; bàn giao bắt đầu trong giờ hoạt động." : "Giờ kết thúc phải nằm trong giờ hoạt động của Studio."}</p>}
                    {preview && <p className="booking-range">Dự kiến: {preview}</p>}
                </section>

                <section className="surface booking-step">
                    <div className="booking-step-title"><span>03</span><div><h2>Thiết bị thuê thêm</h2><p>Chọn số lượng; tiền thiết bị sẽ hiện trong báo giá.</p></div></div>
                    <div className="booking-equipment-list">
                        {equipment.data?.filter(item => ["available", "active"].includes(item.status)).map(item =>
                            <label className="booking-equipment-row" key={item.equipment_id}>
                                <span><strong>{item.name}</strong><small>{money(item.unit_price)} / {unitLabels[item.pricing_unit] ?? item.pricing_unit} · còn {item.total_quantity}</small></span>
                                <input aria-label={`Số lượng ${item.name}`} type="number" min={0}
                                    max={item.total_quantity} step={1}
                                    value={values[`equipment:${item.equipment_id}`] ?? "0"}
                                    onChange={event => change(`equipment:${item.equipment_id}`, event.target.value)}/>
                            </label>
                        )}
                        {equipment.data?.length === 0 && <p>Studio chưa có thiết bị cho thuê thêm.</p>}
                    </div>
                </section>

                <section className="surface booking-step">
                    <div className="booking-step-title"><span>04</span><div><h2>Thông tin liên hệ</h2><p>Studio dùng thông tin này để trao đổi về đơn thuê.</p></div></div>
                    {session.user?.role === "customer" ? <>
                        <div className="booking-field-grid">
                            <label>Người liên hệ<input name="customer_name" required defaultValue={session.user.full_name}/></label>
                            <label>Số điện thoại<input name="customer_phone" required type="tel" defaultValue={session.user.phone ?? ""}/></label>
                            <label className="booking-full-width">Email<input type="email" name="customer_email" required defaultValue={session.user.email}/></label>
                            <label className="booking-full-width">Ghi chú cho Studio<textarea name="note"/></label>
                        </div>
                        <label className="checkbox-label"><input required type="checkbox"/> Tôi đã kiểm tra thời gian, giá và nội quy Studio.</label>
                    </> : <p>Đặt phòng cần tài khoản khách hàng. <Link href={`/login?returnTo=${encodeURIComponent(`/rooms/${id}/book`)}`}>Đăng nhập để tiếp tục</Link>.</p>}
                </section>
            </div>

            <aside className="surface booking-quote">
                <p className="booking-eyebrow">Báo giá từ máy chủ</p>
                <h2>Chi phí đặt phòng</h2>
                {quoting && <p role="status">Đang kiểm tra lịch trống và cập nhật giá…</p>}
                {!quoting && currentQuoteError && <p className="booking-quote-error" role="alert">{currentQuoteError}</p>}
                {!quoting && currentQuoteError && suggestions.length > 0 && <div className="booking-time-suggestions"><strong>Khung giờ gần nhất nên thử</strong><small>Chọn khung giờ để kiểm tra lại giá và lịch trực tiếp với máy chủ.</small>{suggestions.map(item => <button key={`${item.date}-${item.time}`} type="button" onClick={() => { change("date", item.date); change("time", item.time); }}>{item.label}<span>→</span></button>)}</div>}
                {!quoting && !currentQuote && !currentQuoteError && <p>Chọn gói và thời gian để xem chi phí.</p>}
                {currentQuote && !quoting && <>
                    <p className="booking-quote-range">{formatApiTime(currentQuote.start_time)}<br/>đến {formatApiTime(currentQuote.end_time)}</p>
                    <dl className="booking-cost-lines">
                        <div><dt>Giá phòng{currentQuote.pricing.rental_units && currentQuote.pricing.room_unit_price != null ? ` · ${currentQuote.pricing.rental_units} × ${money(currentQuote.pricing.room_unit_price)}` : ""}</dt><dd>{money(currentQuote.pricing.room_amount)}</dd></div>
                        {currentQuote.pricing.equipments?.map((item, index) =>
                            <div key={`${item.equipment_id}-${index}`}><dt>{item.name} · {item.quantity} × {item.pricing_unit === "hour" ? `${item.equipment_hours ?? 0} giờ` : "1 buổi"}</dt><dd>{money(item.subtotal)}</dd></div>
                        )}
                        <div><dt>Thiết bị thuê thêm</dt><dd>{money(currentQuote.pricing.equipment_amount)}</dd></div>
                        <div className="booking-total"><dt>Tổng tiền</dt><dd>{money(currentQuote.pricing.total_amount)}</dd></div>
                        <div><dt>Cọc cần thanh toán</dt><dd>{money(currentQuote.pricing.deposit_amount)}</dd></div>
                    </dl>
                    <p className="booking-help">Studio giữ lịch đến {formatApiTime(currentQuote.busy_end)} để dọn phòng. Phần cọc nằm trong tổng tiền, không cộng thêm.</p>
                </>}
                <button className="btn" type="submit" disabled={action.busy || quoting || !currentQuote || !session.user || session.user.role !== "customer" || equipment.loading || !!equipment.error}>
                    {action.busy ? "Đang tạo đơn…" : "Tạo đơn giữ chỗ"}
                </button>
                <ApiMessage error={action.error}/>
                <p className="booking-help">Máy chủ kiểm tra lịch và giá lần nữa khi tạo đơn. Thanh toán hiện ở chế độ mô phỏng, không chuyển tiền thật.</p>
            </aside>
        </form>}
    </div>;
}
export function BackendBookings({ host = false, history = false }: {
    host?: boolean;
    history?: boolean;
}) {
    const [page, setPage] = useState(1), [status, setStatus] = useState(history ? "completed" : "");
    const list = useResource<BookingPage>(`/api/bookings?page=${page}&limit=12&status=${status}`);
    const statusOptions = history ? Object.entries(bookingLabels).filter(([key]) => ["completed", "cancelled", "rejected", "expired"].includes(key)) : Object.entries(bookingLabels);
    return <section><h1>{host ? "Quản lý đơn thuê" : history ? "Lịch sử thuê" : "Đơn của tôi"}</h1>
      {history && <p>Các đơn đã kết thúc. Chọn trạng thái để xem lại từng nhóm đơn.</p>}
      {!host && !history && <p>Đơn “Đang xử lý” có thể đang chờ thanh toán hoặc chờ Studio xác nhận. Mở mã đơn để xem hạn xử lý.</p>}
      <label>Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        {!history && <option value="">Tất cả</option>}{statusOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label><button className="btn secondary" onClick={list.reload}>Làm mới</button><ApiMessage loading={list.loading} error={list.error}/>{list.data && <><div className="api-table-wrap"><table><thead><tr><th>Mã đơn</th><th>Phòng</th><th>Bắt đầu</th><th>Trạng thái</th><th>Tổng</th></tr></thead><tbody>{list.data.items.map(b => <tr key={b.booking_id}><td><Link href={`${host ? "/host/bookings" : "/my-bookings"}/${b.booking_id}`}>{b.booking_code}</Link></td><td>{b.room_name}</td><td>{formatApiTime(b.start_time)}</td><td>{bookingLabels[b.status] ?? b.status}</td><td>{money(b.total_amount)}</td></tr>)}</tbody></table></div>{!list.data.items.length && <p>{history ? "Chưa có đơn nào ở trạng thái này." : "Chưa có đơn thuê phù hợp."}</p>}<div className="actions"><button className="btn secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page} / {list.data.total_pages}</span><button className="btn secondary" disabled={page >= list.data.total_pages} onClick={() => setPage(page + 1)}>Trang sau</button></div></>}</section>;
}
export function BackendBookingDetail({ id, host = false, payment = false }: {
    id: string;
    host?: boolean;
    payment?: boolean;
}) {
    const booking = useResource<ApiBooking>(`/api/bookings/${encodeURIComponent(id)}`), action = useApiAction();
    const [sandboxConsent, setSandboxConsent] = useState(false);
    const b = booking.data;
    const savedReview = useResource<{ review_id: number; rating: number; review_text: string } | null>(!host && !payment && b?.status === "completed" ? `/api/bookings/${encodeURIComponent(id)}/review` : null);
    const mutate = (suffix: string, body?: unknown, method: "POST" | "PATCH" = "POST") => { void action.run(async () => { await apiRequest(`/api/bookings/${id}/${suffix}`, { method, body }); booking.reload(); }); };
    const paid = b?.payments?.filter(p => p.status === "success").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const pendingMessage = b?.status === "pending" ? paid > 0 ? "Đã ghi nhận thanh toán · đang chờ Studio xác nhận" : "Đang giữ lịch tạm thời · chờ thanh toán" : null;
    return <section><h1>{payment ? "Thanh toán sandbox" : "Chi tiết đơn thuê"}</h1><ApiMessage loading={booking.loading} error={booking.error || action.error}/><button className="btn secondary" onClick={booking.reload}>Làm mới</button>{b && <><h2>{b.booking_code} · {b.room_name}</h2><p className="booking-status-explainer"><strong>{pendingMessage ?? bookingLabels[b.status] ?? b.status}</strong></p><p>{formatApiTime(b.start_time)} – {formatApiTime(b.end_time)}</p>{b.status === "pending" && b.expires_at && <BookingExpiry expiresAt={b.expires_at} paid={paid > 0}/>}<p>Tổng: {money(b.total_amount)} · Cọc: {money(b.deposit_amount)} · Đã ghi nhận: {money(paid)}</p>
    <h2>Giao dịch</h2>{b.payments?.length ? <ul>{b.payments.map(p => <li key={p.payment_id}>{p.payment_type}: {money(p.amount)} · {p.status}</li>)}</ul> : <p>Chưa có giao dịch.</p>}
    {!host && ["pending", "confirmed", "checked_in"].includes(b.status) && <><p>Thanh toán mô phỏng trên máy chủ, không chuyển tiền thật. Khoản cần hoàn mới chỉ được ghi nhận; chưa có hoàn tiền thật.</p><label className="checkbox-label"><input type="checkbox" checked={sandboxConsent} onChange={e => setSandboxConsent(e.target.checked)}/> Tôi hiểu đây là thanh toán sandbox.</label><div className="actions">{b.status === "pending" && paid === 0 && <button className="btn" disabled={action.busy || !sandboxConsent} onClick={() => mutate("payments", { payment_type: "deposit", payment_method: "sandbox_qr" })}>Mô phỏng trả cọc</button>}{["confirmed", "checked_in"].includes(b.status) && paid < Number(b.total_amount) && <button className="btn" disabled={action.busy || !sandboxConsent} onClick={() => mutate("payments", { payment_type: "remaining", payment_method: "sandbox_qr" })}>Mô phỏng trả phần còn lại</button>}{["pending", "confirmed"].includes(b.status) && <button className="btn secondary" disabled={action.busy} onClick={() => { if (window.confirm("Hủy đơn này? Khoản cần hoàn sẽ được backend ghi nhận, chưa có hoàn tiền thật."))
            mutate("cancel"); }}>Hủy đơn</button>}</div></>}
    {host && <div className="actions">{(b.status === "pending" ? ["confirmed", "rejected"] : b.status === "confirmed" ? ["checked_in", "cancelled"] : b.status === "checked_in" ? ["completed"] : []).map(status => <button className="btn secondary" disabled={action.busy} key={status} onClick={() => { if (!["cancelled", "rejected"].includes(status) || window.confirm("Từ chối/hủy đơn này?"))
            mutate("status", { status }, "PATCH"); }}>{bookingLabels[status]}</button>)}</div>}
    {!host && !payment && b.status === "completed" && <section className="booking-review-form"><h2>Đánh giá lượt thuê</h2><ApiMessage loading={savedReview.loading} error={savedReview.error}/>{savedReview.data ? <p role="status">Bạn đã đánh giá lượt thuê này · {"★".repeat(savedReview.data.rating)}{"☆".repeat(5 - savedReview.data.rating)}</p> : !savedReview.loading && <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void action.run(async () => { await apiRequest(`/api/bookings/${encodeURIComponent(id)}/review`, { method: "POST", body: { rating: Number(data.get("rating")), review_text: String(data.get("review_text") ?? "") } }); savedReview.reload(); }); }}><label>Điểm đánh giá<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}</select></label><label>Chia sẻ trải nghiệm<textarea name="review_text" maxLength={1200} placeholder="Không gian, thiết bị và trải nghiệm làm việc tại studio…"/></label><button className="btn" disabled={action.busy}>Gửi đánh giá</button></form>}</section>}
  </>}</section>;
}

function BookingExpiry({ expiresAt, paid }: { expiresAt: string; paid: boolean }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const remaining = Math.max(0, Math.floor((vnTimestamp(expiresAt).getTime() - now) / 1000));
    const expired = remaining === 0;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    const countdown = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return <div className="booking-expiry" aria-live="polite">
        <strong>{paid ? "Thời hạn Studio phản hồi" : "Thời gian giữ lịch chờ thanh toán"}</strong>
        <span>{expired ? "Đã quá hạn · hãy tải lại đơn để đồng bộ trạng thái" : `Còn ${countdown}`}</span>
        <small>Hạn theo máy chủ: {formatApiTime(expiresAt)}</small>
    </div>;
}
