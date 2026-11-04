"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiSession } from "@/components/api-session";
import { ApiMessage, useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import type { ApiRoom, EquipmentItem, Quote, ApiBooking, BookingPage } from "@/services/api/contracts";
import { rentalRange, sqlVietnamTime, formatApiTime, bookingLabels, unitLabels } from "@/services/api/contracts";
import { money } from "@/domain/models";
export function BackendBookingWizard({ id }: {
    id: string;
}) {
    const room = useResource<ApiRoom>(`/api/rooms/${encodeURIComponent(id)}`), session = useApiSession(), router = useRouter();
    const equipment = useResource<EquipmentItem[]>(room.data ? `/api/equipments?studio_id=${room.data.studio_id}` : null);
    const draftKey = `studiohub.api-booking-draft.${id}`;
    const [selection, setSelection] = useState<Record<string, string>>(() => {
        try {
            const draft: unknown = JSON.parse(window.sessionStorage.getItem(draftKey) ?? "{}");
            if (!draft || typeof draft !== "object" || Array.isArray(draft))
                return {};
            return Object.fromEntries(Object.entries(draft).filter(([k, v]) => /^(date|time|units|party_size|rate_id|equipment:\d+)$/.test(k) && typeof v === "string"));
        }
        catch {
            return {};
        }
    });
    useEffect(() => {
        try {
            window.sessionStorage.setItem(draftKey, JSON.stringify(selection));
        }
        catch { /* A draft is optional; persisted bookings always come from the API. */ }
    }, [draftKey, selection]);
    const [quote, setQuote] = useState<{
        key: string;
        value: Quote;
    } | null>(null);
    const action = useApiAction();
    const r = room.data;
    const [defaultDate] = useState(() => sqlVietnamTime(new Date(Date.now() + 86400000)).slice(0, 10));
    const values = { date: defaultDate, time: "09:00", units: "1", party_size: "1", rate_id: String(r?.rates?.[0]?.rate_id ?? ""), ...selection };
    const selectionKey = JSON.stringify(values);
    const currentQuote = quote?.key === selectionKey ? quote.value : null;
    const change = (key: string, value: string) => setSelection(s => ({ ...s, [key]: value }));
    const payload = () => {
        const rate = r?.rates?.find(v => v.rate_id === Number(values.rate_id));
        if (!r || !rate)
            throw new Error("Phòng chưa có bảng giá khả dụng.");
        return { room_id: r.room_id, rate_id: rate.rate_id, ...rentalRange(values.date, values.time, Number(values.units), rate), party_size: Number(values.party_size), equipments: Object.entries(selection).filter(([k, v]) => k.startsWith("equipment:") && Number(v) > 0).map(([k, v]) => ({ equipment_id: Number(k.split(":")[1]), quantity: Number(v) })) };
    };
    return <div className="container account-page"><h1>Đặt thuê {r?.name ?? "phòng Studio"}</h1><ApiMessage loading={room.loading || equipment.loading} error={room.error || equipment.error}/>
    {r && <form className="surface api-form" onSubmit={e => { e.preventDefault(); const contact = Object.fromEntries(new FormData(e.currentTarget)); void action.run(async () => { if (!currentQuote || !session.user)
            throw new Error("Kiểm tra lại giá và đăng nhập trước khi tạo đơn."); const booking = await apiRequest<ApiBooking>("/api/bookings", { method: "POST", body: { ...payload(), ...contact } }); try { window.sessionStorage.removeItem(draftKey); } catch { /* Optional draft storage. */ } router.push(`/payment/${booking.booking_id}`); }); }}>
      <label>Bảng giá<select value={values.rate_id} onChange={e => change("rate_id", e.target.value)}>{r.rates?.map(rate => <option key={rate.rate_id} value={rate.rate_id}>{money(rate.unit_price)} / {unitLabels[rate.rate_unit] ?? rate.rate_unit}</option>)}</select></label>
      <label>Ngày thuê (giờ Việt Nam)<input required type="date" value={values.date} onChange={e => change("date", e.target.value)}/></label>
      <label>Giờ bắt đầu<input required type="time" value={values.time} onChange={e => change("time", e.target.value)}/></label>
      <label>Số đơn vị thuê<input required type="number" min={1} step={1} value={values.units} onChange={e => change("units", e.target.value)}/></label>
      <label>Số người<input required type="number" min={1} max={r.capacity} step={1} value={values.party_size} onChange={e => change("party_size", e.target.value)}/></label>
      <fieldset><legend>Thiết bị thuê thêm</legend>{equipment.data?.length === 0 && <p>Studio chưa có thiết bị thuê thêm.</p>}{equipment.data?.filter(item => item.status === "available" || item.status === "active").map(item => <label key={item.equipment_id}>{item.name} · {money(item.unit_price)} / {unitLabels[item.pricing_unit] ?? item.pricing_unit}<input type="number" min={0} max={item.total_quantity} step={1} value={selection[`equipment:${item.equipment_id}`] ?? "0"} onChange={e => change(`equipment:${item.equipment_id}`, e.target.value)}/></label>)}</fieldset>
      <button className="btn secondary" type="button" disabled={action.busy || equipment.loading || !!equipment.error} onClick={() => { void action.run(async () => { const body = payload(); const result = await apiRequest<Quote>("/api/bookings/check-availability", { method: "POST", body }); if (!result.available)
            throw new Error("Phòng không khả dụng."); setQuote({ key: selectionKey, value: result }); }); }}>Kiểm tra lịch trống & giá</button>
      {currentQuote && <section className="note"><h2>Chi phí từ máy chủ</h2><p>{formatApiTime(currentQuote.start_time)} – {formatApiTime(currentQuote.end_time)}</p><p>Dọn phòng tới {formatApiTime(currentQuote.busy_end)}</p><p>Phòng: {money(currentQuote.pricing.room_amount)} · Thiết bị: {money(currentQuote.pricing.equipment_amount)}</p><p>Tổng: {money(currentQuote.pricing.total_amount)} · Cọc: {money(currentQuote.pricing.deposit_amount)}</p></section>}
      {session.user?.role === "customer" ? <><label>Người liên hệ<input name="customer_name" required defaultValue={session.user.full_name}/></label><label>Số điện thoại<input name="customer_phone" required type="tel" defaultValue={session.user.phone ?? ""}/></label><label>Email<input type="email" name="customer_email" required defaultValue={session.user.email}/></label><label>Ghi chú<textarea name="note"/></label><label className="checkbox-label"><input required type="checkbox"/> Tôi đã kiểm tra thời gian, giá và nội quy Studio.</label><button className="btn" disabled={action.busy || !currentQuote || equipment.loading || !!equipment.error}>{action.busy ? "Đang xử lý…" : "Tạo đơn thuê"}</button></> : <p>Đặt thuê yêu cầu tài khoản khách hàng. <Link href={`/login?returnTo=${encodeURIComponent(`/rooms/${id}/book`)}`}>Đăng nhập</Link></p>}
      <ApiMessage error={action.error}/><p>Lịch và giá được kiểm tra lại khi tạo đơn. Thanh toán hiện dùng sandbox, không chuyển tiền thật.</p>
    </form>}
  </div>;
}
export function BackendBookings({ host = false }: {
    host?: boolean;
}) {
    const [page, setPage] = useState(1), [status, setStatus] = useState("");
    const list = useResource<BookingPage>(`/api/bookings?page=${page}&limit=12&status=${status}`);
    return <section><h1>{host ? "Quản lý đơn thuê" : "Đơn của tôi"}</h1><label>Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(bookingLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><button className="btn secondary" onClick={list.reload}>Làm mới</button><ApiMessage loading={list.loading} error={list.error}/>{list.data && <><div className="api-table-wrap"><table><thead><tr><th>Mã đơn</th><th>Phòng</th><th>Bắt đầu</th><th>Trạng thái</th><th>Tổng</th></tr></thead><tbody>{list.data.items.map(b => <tr key={b.booking_id}><td><Link href={`${host ? "/host/bookings" : "/my-bookings"}/${b.booking_id}`}>{b.booking_code}</Link></td><td>{b.room_name}</td><td>{formatApiTime(b.start_time)}</td><td>{bookingLabels[b.status] ?? b.status}</td><td>{money(b.total_amount)}</td></tr>)}</tbody></table></div>{!list.data.items.length && <p>Chưa có đơn thuê phù hợp.</p>}<div className="actions"><button className="btn secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page} / {list.data.total_pages}</span><button className="btn secondary" disabled={page >= list.data.total_pages} onClick={() => setPage(page + 1)}>Trang sau</button></div></>}</section>;
}
export function BackendBookingDetail({ id, host = false, payment = false }: {
    id: string;
    host?: boolean;
    payment?: boolean;
}) {
    const booking = useResource<ApiBooking>(`/api/bookings/${encodeURIComponent(id)}`), action = useApiAction();
    const [sandboxConsent, setSandboxConsent] = useState(false);
    const b = booking.data;
    const mutate = (suffix: string, body?: unknown, method: "POST" | "PATCH" = "POST") => { void action.run(async () => { await apiRequest(`/api/bookings/${id}/${suffix}`, { method, body }); booking.reload(); }); };
    const paid = b?.payments?.filter(p => p.status === "success").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    return <section><h1>{payment ? "Thanh toán sandbox" : "Chi tiết đơn thuê"}</h1><ApiMessage loading={booking.loading} error={booking.error || action.error}/><button className="btn secondary" onClick={booking.reload}>Làm mới</button>{b && <><h2>{b.booking_code} · {b.room_name}</h2><p>{bookingLabels[b.status] ?? b.status}</p><p>{formatApiTime(b.start_time)} – {formatApiTime(b.end_time)}</p>{b.expires_at && <p>Hạn xử lý theo máy chủ: {formatApiTime(b.expires_at)}</p>}<p>Tổng: {money(b.total_amount)} · Cọc: {money(b.deposit_amount)} · Đã ghi nhận: {money(paid)}</p>
    <h2>Giao dịch</h2>{b.payments?.length ? <ul>{b.payments.map(p => <li key={p.payment_id}>{p.payment_type}: {money(p.amount)} · {p.status}</li>)}</ul> : <p>Chưa có giao dịch.</p>}
    {!host && ["pending", "confirmed", "checked_in"].includes(b.status) && <><p>Thanh toán mô phỏng trên máy chủ, không chuyển tiền thật. Khoản cần hoàn mới chỉ được ghi nhận; chưa có hoàn tiền thật.</p><label className="checkbox-label"><input type="checkbox" checked={sandboxConsent} onChange={e => setSandboxConsent(e.target.checked)}/> Tôi hiểu đây là thanh toán sandbox.</label><div className="actions">{b.status === "pending" && paid === 0 && <button className="btn" disabled={action.busy || !sandboxConsent} onClick={() => mutate("payments", { payment_type: "deposit", payment_method: "sandbox_qr" })}>Mô phỏng trả cọc</button>}{["confirmed", "checked_in"].includes(b.status) && paid < Number(b.total_amount) && <button className="btn" disabled={action.busy || !sandboxConsent} onClick={() => mutate("payments", { payment_type: "remaining", payment_method: "sandbox_qr" })}>Mô phỏng trả phần còn lại</button>}{["pending", "confirmed"].includes(b.status) && <button className="btn secondary" disabled={action.busy} onClick={() => { if (window.confirm("Hủy đơn này? Khoản cần hoàn sẽ được backend ghi nhận, chưa có hoàn tiền thật."))
            mutate("cancel"); }}>Hủy đơn</button>}</div></>}
    {host && <div className="actions">{(b.status === "pending" ? ["confirmed", "rejected"] : b.status === "confirmed" ? ["checked_in", "cancelled"] : b.status === "checked_in" ? ["completed"] : []).map(status => <button className="btn secondary" disabled={action.busy} key={status} onClick={() => { if (!["cancelled", "rejected"].includes(status) || window.confirm("Từ chối/hủy đơn này?"))
            mutate("status", { status }, "PATCH"); }}>{bookingLabels[status]}</button>)}</div>}
  </>}</section>;
}
