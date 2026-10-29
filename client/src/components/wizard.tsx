"use client";
import { Presence, StepPanel, useContentMotion } from "./motion/system";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Modal } from "./ui";
import { useStore, useSession } from "./store";
import { money, localDate, atDate, type Room, type Selection, type Plan } from "@/domain/models";
import { validateSelection, studioFor, HOUR } from "@/domain/engine";
import { effectiveCrew, effectiveRentalPlans, planDuration, quoteRental, rentalDateTime as dateTime } from "@/domain/rental";
import { BookingCalendar } from "@/features/pricing/components/BookingCalendar";
import { RentalPriceSummary } from "@/features/pricing/components/RentalPriceSummary";
import { EquipmentVisual } from "@/features/pricing/components/EquipmentVisual";
import styles from "@/features/pricing/styles/rental.module.css";

export function BookingWizard({ room, onClose, changeId }: { room: Room; onClose: () => void; changeId?: string }) {
  const { state, dispatch } = useStore(), user = useSession(), router = useRouter();
  const [direction, setDirection] = useState(1), [step, setStep] = useState(1);
  const [date, setDate] = useState(localDate(state.now + 3 * 24 * HOUR));
  const [chosenStart, setChosenStart] = useState<number | null>(atDate(date, 9));
  const [hours, setHours] = useState(2), [plan, setPlan] = useState<Plan>("hourly"), [participants, setParticipants] = useState(1);
  const [equipment, setEquipment] = useState<Record<string, number>>({}), [error, setError] = useState(""), [accepted, setAccepted] = useState(false), [auth, setAuth] = useState(false);
  const studio = studioFor(state, room.id)!;
  const plans = effectiveRentalPlans(state, room.id), selectedPlan = plans.find(p => p.plan === plan) ?? plans[0];
  const duration = selectedPlan ? planDuration(selectedPlan, hours) / 60 : hours;
  const start = chosenStart ?? atDate(date, 9);
  const selection: Selection = { roomId: room.id, start, end: start + duration * HOUR, participants, plan: selectedPlan?.plan ?? plan, equipment };
  let snapshot: ReturnType<typeof quoteRental> | undefined;
  try { snapshot = quoteRental(state, selection); } catch { /* Invalid drafts never become a booking. */ }
  const crew = effectiveCrew(state, room.id, selectedPlan), maximum = Math.min(room.capacity, crew?.maximum ?? room.capacity);
  const availabilityError = selectedPlan ? validateSelection(state, selection, changeId) : "Phòng chưa có gói thuê đang áp dụng.";
  const validSelectedSlot = chosenStart !== null && !availabilityError;
  const total = snapshot?.breakdown.total ?? 0, deposit = snapshot?.breakdown.deposit ?? 0;
  const summaryRef = useContentMotion<HTMLElement>(`${total}|${deposit}`);
  function resetSlot() { setChosenStart(null); setAccepted(false); setError(""); }
  const validate = () => {
    const reason = !validSelectedSlot ? availabilityError ?? "Chọn một giờ bắt đầu khả dụng trên lịch." : "";
    setError(reason); return !reason && !!snapshot;
  };
  const submit = () => {
    if (!validate()) return;
    if (!accepted) { setError("Vui lòng xác nhận đã đọc các chính sách."); return; }
    if (!user) { setAuth(true); return; }
    const result = dispatch(changeId ? { type: "change", id: changeId, selection } : { type: "create", selection });
    if (result) { onClose(); router.push(changeId ? `/my-bookings/${changeId}` : `/payment/${result.bookings.at(-1)!.id}`); }
  };
  return <Modal wide title={changeId ? "Yêu cầu đổi lịch" : "Đặt thuê không gian"} onClose={onClose}>
    <div className={styles.booking}>
      <div className="wizard-steps">{["Thời gian thuê", "Thêm thiết bị", "Kiểm tra & xác nhận"].map((x, i) => <div className={step >= i + 1 ? "current" : ""} key={x}><span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>{x}</div>)}</div>
      <div className="wizard-body">
        <Presence initial={false} custom={direction} mode="popLayout"><StepPanel key={step} direction={direction} animateEntrance={step !== 1 || direction < 0}>
          <p className="mono muted">{room.code} / {room.name}</p>
          {step === 1 && <>
            <h3>Chọn lịch cho buổi sáng tạo.</h3>
            <div className={styles.grid}>
              <label>Hình thức thuê<select value={selectedPlan?.plan ?? ""} onChange={e => { setPlan(e.target.value as Plan); resetSlot(); }}>{plans.map(p => <option key={p.plan} value={p.plan}>{p.title}</option>)}</select></label>
              <label>Thời lượng (giờ)<input type="number" min={0.5} max={24} step={0.5} disabled={selectedPlan?.kind !== "hourly"} value={duration} onChange={e => { setHours(+e.target.value); resetSlot(); }} /></label>
              <label>Số người tham gia<input type="number" min={1} max={maximum} required value={participants} onChange={e => { setParticipants(+e.target.value); setAccepted(false); }} /></label>
            </div>
            {crew && <p className={styles.notice}>Giá thuê đã bao gồm {crew.included} người · tối đa {maximum} người. {snapshot?.breakdown.extraPeople ? `Ekip ${participants} người vượt ${snapshot.breakdown.extraPeople} người; phụ thu ${money(snapshot.breakdown.crewSurcharge)}.` : crew.surchargeEnabled ? `Vượt mức: ${money(crew.amount)} / người / ${crew.unit === "hour" ? "giờ" : "đơn"}.` : "Không phụ thu trong giới hạn cho phép."}</p>}
            {participants > maximum && <p role="alert" className={styles.error}>Vượt giới hạn {maximum} người. Không thể tiếp tục đặt trực tuyến cho ekip này.</p>}
            <BookingCalendar state={state} selection={selection} date={date} selectedStart={validSelectedSlot ? chosenStart : null} ignoreId={changeId} onDate={next => { setDate(next); resetSlot(); }} onStart={next => { setChosenStart(next); setError(""); setAccepted(false); }} />
            <div className={styles.interval} aria-live="polite"><strong>{validSelectedSlot ? `${dateTime(start)} → ${dateTime(selection.end)}` : "Chọn ngày và giờ khả dụng để xác nhận khoảng thuê"}</strong>{duration} giờ · {selectedPlan?.title ?? "Chưa có gói"}. 30 phút chuẩn bị sau ca không phải giờ sử dụng; đến muộn không kéo dài giờ trả.</div>
          </>}
          {step === 2 && <>
            <h3>Thêm thiết bị bạn cần.</h3><p className="muted">Số lượng chọn ở đây là phần thuê thêm, ngoài thiết bị đã có trong gói. Tồn kho kiểm tra cho cả ca thuê và 30 phút chuẩn bị.</p>
            {!!Object.keys(selectedPlan?.includedEquipment ?? {}).length && <div className={styles.included}><strong>Đã bao gồm trong gói · không tính thêm</strong>{Object.entries(selectedPlan!.includedEquipment).map(([id, q]) => <div key={id}>{q} × {state.equipment.find(e => e.id === id)?.name}</div>)}</div>}
            {!!selectedPlan?.includedServices.filter(Boolean).length && <p className={styles.included}>Dịch vụ kèm gói: {selectedPlan.includedServices.filter(Boolean).join(" · ")}. Mô tả của Host, chưa có lập lịch nhân sự tự động.</p>}
            {state.equipment.filter(e => e.studioId === studio.id && e.active).map(e => <div className="equipment-choice" data-selected={(equipment[e.id] ?? 0) > 0} key={e.id}>
              <EquipmentVisual item={e} /><div><strong>{e.name}</strong><small>{money(e.hourlyRate)} / giờ · Tổng kho: {e.quantity}{selectedPlan?.includedEquipment[e.id] ? ` · ${selectedPlan.includedEquipment[e.id]} đã gồm trong gói` : ""}</small></div>
              <label><span className="sr-only">Số lượng {e.name}</span><input type="number" min={0} max={Math.max(0, e.quantity - (selectedPlan?.includedEquipment[e.id] ?? 0))} value={equipment[e.id] ?? 0} onChange={event => { setEquipment({ ...equipment, [e.id]: +event.target.value }); setAccepted(false); }} /></label>
            </div>)}
            {availabilityError && <p role="alert" className={styles.error}>{availabilityError}</p>}
          </>}
          {step === 3 && <>
            <h3>Kiểm tra lần cuối.</h3>
            <div className="line-item"><span>Phòng thực tế</span><strong>{room.code} · {room.floor}</strong></div>
            <div className="line-item"><span>Thời gian</span><span>{dateTime(start)} → {dateTime(selection.end)}</span></div>
            <div className="line-item"><span>Gói thuê</span><span>{selectedPlan?.title} · {participants} người</span></div>
            {Object.entries(selectedPlan?.includedEquipment ?? {}).map(([id, q]) => <div className="line-item" key={`included-${id}`}><span>{state.equipment.find(e => e.id === id)?.name}</span><span>× {q} · Đã bao gồm</span></div>)}
            {selectedPlan?.includedServices.filter(Boolean).map((service, index) => <div className="line-item" key={`service-${index}`}><span>{service}</span><span>Đã bao gồm</span></div>)}
            {Object.entries(equipment).filter(([, q]) => q > 0).map(([id, q]) => <div className="line-item" key={id}><span>{state.equipment.find(e => e.id === id)?.name}</span><span>× {q} · Thuê thêm</span></div>)}
            <div className="note"><strong>Chính sách áp dụng cho đơn này</strong><p>Thanh toán cọc trong {studio.policy.paymentMinutes} phút. Chủ Studio duyệt trong 2 giờ sau khi nhận cọc.</p><p>Tự hủy trước {studio.policy.cancelHours} giờ. {studio.policy.refundTiers.map(t => `Trước ${t.hours} giờ hoàn ${t.percent}% cọc`).join("; ")}.</p><p>Đổi lịch trước {studio.policy.changeHours} giờ, tối đa 1 lần được duyệt. Quá giờ {money(studio.policy.overtimePerBlock)} / 30 phút làm tròn lên.</p><p>Hủy đơn chưa trả cọc hoặc bỏ thanh toán: 1 vi phạm. Đủ 3 vi phạm sẽ tạm ngưng đặt thuê.</p>{changeId && <p>Lịch cũ giữ nguyên trong lúc chờ duyệt. Cọc đã trả được giữ nguyên khi đổi thành công.</p>}</div>
            <label className="checkbox-label"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Tôi đã kiểm tra thông tin và đồng ý với các chính sách trên.</label>
            {auth && !user && <div className="note"><strong>Đăng nhập để xác nhận</strong><p>Tài khoản minh họa, không cần mật khẩu. Lựa chọn của bạn được giữ trong biểu mẫu này.</p><button className="btn secondary" onClick={() => { dispatch({ type: "login", userId: "customer" }); setAuth(false); }}>Tiếp tục với Minh Anh</button></div>}
          </>}
          {error && <p role="alert" className="error">{error}</p>}
        </StepPanel></Presence>
        <aside ref={summaryRef} className="wizard-summary">
          <Image width={1400} height={1000} src={room.images[0]} alt={`Phòng ${room.code}`} /><h3>{room.name}</h3><p className="mono">{room.code} · {room.area} m²</p>
          {snapshot ? <RentalPriceSummary snapshot={snapshot} /> : <p>Chưa thể tính giá cho lựa chọn này.</p>}
          <div className="line-item"><span>{changeId ? "Giữ cọc đã trả" : `Cọc cần thanh toán · ${studio.policy.depositPercent}%`}</span><strong>{money(changeId ? state.bookings.find(b => b.id === changeId)!.deposit : deposit)}</strong></div>
          <div className="line-item"><span>Còn lại theo dự kiến</span><span>{money(Math.max(0, total - (changeId ? state.bookings.find(b => b.id === changeId)!.deposit : deposit)))}</span></div>
          <small>Giá và khả dụng minh họa · Không thu tiền thật. Các điều khoản được lưu cùng đơn khi xác nhận.</small>
        </aside>
      </div>
      <div className="wizard-footer">{step > 1 ? <button className="btn secondary" onClick={() => { setDirection(-1); setStep(step - 1); setError(""); }}><ArrowLeft size={16} />Quay lại</button> : <button className="text-button" onClick={onClose}>Đóng</button>}
        {step < 3 ? <button className="btn" onClick={() => { if (validate()) { setDirection(1); setStep(step + 1); } }}>Tiếp tục<ArrowRight size={17} /></button> : <button className="btn" onClick={submit}>{!user ? "Đăng nhập để tiếp tục" : changeId ? "Gửi yêu cầu đổi lịch" : "Xác nhận & đến thanh toán"}<ArrowRight size={17} /></button>}
      </div>
    </div>
  </Modal>;
}
