"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import type { CrewPolicy, Plan, RentalPlanConfig } from "@/domain/models";
import { money, localDate, planLabel } from "@/domain/models";
import { effectiveRentalPlans } from "@/domain/rental";
import { PricingList } from "./PricingList";
import styles from "../styles/rental.module.css";

export function RentalPackageManager({ typeId, scopeId, onScopeChange }: { typeId: string; scopeId?: string; onScopeChange?: (id: string) => void }) {
  const { state } = useStore();
  const type = state.types.find(t => t.id === typeId)!;
  const rooms = state.rooms.filter(r => r.typeId === typeId);
  const [localTargetId, setLocalTargetId] = useState(typeId);
  const targetId = scopeId ?? localTargetId;
  const setTargetId = onScopeChange ?? setLocalTargetId;
  if (!rooms.length) return <p>Tạo phòng thực tế trước khi cấu hình gói và ekip.</p>;
  const target = rooms.find(r => r.id === targetId);
  return <section className={styles.settings} data-package-manager={typeId}>
    <h2>Gói thuê & thiết bị đi kèm</h2>
    <p>Cấu hình theo loại phòng hoặc ghi đè cho một phòng thực tế. Thiết bị kèm gói không tính thêm tiền nhưng vẫn giữ số lượng từ kho chung.</p>
    <label className={styles.field}>Phạm vi bảng giá<select value={targetId} onChange={e => setTargetId(e.target.value)}><option value={typeId}>Mặc định loại phòng · {type.name}</option>{rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.code} · ghi đè riêng</option>)}</select></label>
    <PackageEditor key={targetId} typeId={typeId} roomId={target?.id} previewRoomId={target?.id ?? rooms[0].id} />
    <CrewEditor key={`crew-${targetId}`} roomId={target?.id ?? rooms[0].id} />
  </section>;
}
function PackageEditor({ typeId, roomId, previewRoomId }: { typeId: string; roomId?: string; previewRoomId: string }) {
  const { state, dispatch, notice } = useStore();
  const type = state.types.find(t => t.id === typeId)!, room = state.rooms.find(r => r.id === previewRoomId)!;
  const own = roomId ? room.rentalPlans : type.rentalPlans;
  const previewState = structuredClone(state);
  if (!roomId) { const r = previewState.rooms.find(r => r.id === previewRoomId)!; delete r.rentalPlans; delete r.rateOverride; }
  const [draft, setDraft] = useState<RentalPlanConfig[]>(structuredClone(own ?? effectiveRentalPlans(previewState, previewRoomId)));
  const [planId, setPlanId] = useState<Plan>(draft[0]?.plan ?? "hourly");
  const [addId, setAddId] = useState<Plan>("combo3");
  const current = draft.find(p => p.plan === planId);
  const equipment = state.equipment.filter(e => e.studioId === type.studioId);
  const update = (change: Partial<RentalPlanConfig>) => setDraft(items => items.map(p => p.plan === planId ? { ...p, ...change } : p));
  const preview = structuredClone(state);
  if (roomId) preview.rooms.find(r => r.id === roomId)!.rentalPlans = draft; else { preview.types.find(t => t.id === typeId)!.rentalPlans = draft; delete preview.rooms.find(r => r.id === previewRoomId)!.rentalPlans; }
  return <form onSubmit={e => { e.preventDefault(); if (dispatch({ type: "rental_plans", target: roomId ? "room" : "type", id: roomId ?? typeId, plans: draft })) notice("Đã lưu gói thuê. Các đơn đã tạo giữ nguyên snapshot."); }}>
    <p className={styles.notice}>{roomId && !own ? "Phòng đang kế thừa bảng giá loại phòng. Lưu để tạo bảng giá riêng." : own ? "Bảng giá tùy chỉnh đang áp dụng." : "Hiện dùng giá giờ × thời lượng như dữ liệu cũ; chưa tự thêm thiết bị hoặc giảm giá."}</p>
    <div className={styles.grid}>
      <label>Gói đang chỉnh<select value={planId} onChange={e => setPlanId(e.target.value as Plan)}>{draft.map(p => <option key={p.plan} value={p.plan}>{p.title}{p.active ? "" : " · tạm ngưng"}</option>)}</select></label>
      <label>Thêm vị trí gói<select value={addId} onChange={e => setAddId(e.target.value as Plan)}>{(Object.keys(planLabel) as Plan[]).map(p => <option key={p} value={p} disabled={draft.some(x => x.plan === p)}>{planLabel[p]}</option>)}</select></label>
    </div>
    <button className="text-button" type="button" disabled={draft.some(p => p.plan === addId)} onClick={() => {
      const minutes = addId === "session" ? 240 : addId === "hourly" ? 60 : Number(addId.slice(5)) * 60;
      setDraft([...draft, { plan: addId, title: planLabel[addId], kind: addId === "hourly" ? "hourly" : addId === "session" ? "session" : "duration", price: Math.round(type.hourlyRate * minutes / 60), durationMinutes: minutes, sessionStart: "08:00", sessionEnd: "12:00", includedEquipment: {}, includedServices: [], active: true }]); setPlanId(addId);
    }}>Thêm gói để chỉnh</button>
    {current && <>
      <div className={styles.grid}>
        <label>Tên gói<input required maxLength={100} value={current.title} onChange={e => update({ title: e.target.value })} /></label>
        <label>Hình thức gói<select value={current.kind} onChange={e => update({ kind: e.target.value as RentalPlanConfig["kind"] })}><option value="hourly">Theo giờ</option><option value="duration">Combo thời lượng · giờ bắt đầu linh hoạt</option><option value="session">Buổi cố định</option></select></label>
        <label>{current.kind === "hourly" ? "Giá mỗi giờ (VND)" : "Giá trọn gói (VND)"}<input required type="number" min={1} step={1} value={current.price} onChange={e => update({ price: +e.target.value })} /></label>
        <label>Thời lượng {current.kind === "hourly" ? "tham chiếu" : "gói"} (phút)<input required type="number" min={30} max={1440} step={30} value={current.durationMinutes} onChange={e => update({ durationMinutes: +e.target.value })} /></label>
        {current.kind === "session" && <><label>Buổi bắt đầu<input type="time" step={1800} required value={current.sessionStart ?? ""} onChange={e => update({ sessionStart: e.target.value })} /></label><label>Buổi kết thúc<input type="time" step={1800} required value={current.sessionEnd ?? ""} onChange={e => update({ sessionEnd: e.target.value })} /></label></>}
        <label>Số người kèm gói (để trống: theo phòng)<input type="number" min={1} max={room.capacity} value={current.includedCrew ?? ""} onChange={e => update({ includedCrew: e.target.value ? +e.target.value : undefined })} /></label>
        <label className={styles.check}><input type="checkbox" checked={current.active} onChange={e => update({ active: e.target.checked })} /> Đang áp dụng</label>
      </div>
      <details><summary>Thiết bị & dịch vụ đã bao gồm</summary>
        {equipment.map(item => <div className={styles.bundle} key={item.id}><label><input type="checkbox" checked={!!current.includedEquipment[item.id]} onChange={e => { const next = { ...current.includedEquipment }; if (e.target.checked) next[item.id] = 1; else delete next[item.id]; update({ includedEquipment: next }); }} /><span>{item.name}<small>Kho {item.quantity} · {item.active ? "đang cho thuê" : "tạm ngưng"}</small></span></label>
          {!!current.includedEquipment[item.id] && <input aria-label={`Số lượng kèm gói · ${item.name}`} type="number" min={1} max={item.quantity} required value={current.includedEquipment[item.id]} onChange={e => update({ includedEquipment: { ...current.includedEquipment, [item.id]: +e.target.value } })} />}</div>)}
        <label className={styles.field}>Dịch vụ gồm trong giá (mỗi dòng một mục)<textarea value={current.includedServices.join("\n")} onChange={e => update({ includedServices: e.target.value.split("\n") })} /></label>
        <p>Chỉ mô tả dịch vụ Host cung cấp; chưa có hệ thống lập lịch nhân sự.</p>
      </details>
      <details><summary>Ưu đãi có thời hạn (khác với nhãn nổi bật)</summary>
        <label className="checkbox-label"><input type="checkbox" checked={!!current.promotion} onChange={e => update({ promotion: e.target.checked ? { originalPrice: 0, startsOn: localDate(state.now), endsOn: localDate(state.now) } : undefined })} /> Cấu hình giá gốc và ngày áp dụng</label>
        {current.promotion && <div className={styles.grid}><label>Giá gốc đã xác minh (VND)<input required min={current.price + 1} step={1} type="number" value={current.promotion.originalPrice} onChange={e => update({ promotion: { ...current.promotion!, originalPrice: +e.target.value } })} /></label>
          <label>Từ ngày<input required type="date" value={current.promotion.startsOn} onChange={e => update({ promotion: { ...current.promotion!, startsOn: e.target.value } })} /></label><label>Đến hết ngày<input required type="date" value={current.promotion.endsOn} onChange={e => update({ promotion: { ...current.promotion!, endsOn: e.target.value } })} /></label></div>}
        <p>Giá ở trên là giá ưu đãi trong thời hạn; ngoài thời hạn áp dụng giá gốc. Không nhập giá gốc giả để tạo mức tiết kiệm.</p>
      </details>
    </>}
    <div className="actions" style={{ marginTop: 20 }}><button className="btn secondary">Lưu gói thuê</button><button type="button" className="text-button" disabled={!own} onClick={() => {
      const result = dispatch({ type: "rental_plans", target: roomId ? "room" : "type", id: roomId ?? typeId, plans: null });
      if (result) { const inherited = effectiveRentalPlans(result, previewRoomId); setDraft(inherited); setPlanId(inherited[0]?.plan ?? "hourly"); notice("Đã bỏ bảng giá riêng và tải lại giá kế thừa."); }
    }}>Bỏ cấu hình riêng</button></div>
    <div className={styles.preview} aria-label="Xem trước bảng giá khách hàng"><PricingList state={preview} roomId={previewRoomId} /></div>
  </form>;
}
function CrewEditor({ roomId }: { roomId: string }) {
  const { state, dispatch, notice } = useStore();
  const room = state.rooms.find(r => r.id === roomId)!;
  const [enabled, setEnabled] = useState(!!room.crewPolicy);
  const [crew, setCrew] = useState<CrewPolicy>(room.crewPolicy ?? { included: 1, maximum: room.capacity, surchargeEnabled: false, amount: 0, unit: "booking" });
  return <form className={styles.settings} onSubmit={e => { e.preventDefault(); if (dispatch({ type: "crew_policy", roomId, policy: enabled ? crew : undefined })) notice(`Đã lưu ekip cho phòng ${room.code}.`); }}>
    <h3>Ekip · phòng {room.code}</h3><p>Sức chứa vật lý: {room.capacity} người. Cấu hình riêng từng phòng bằng bộ chọn phạm vi phía trên; không tạo thêm trạng thái duyệt.</p>
    <label className="checkbox-label"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Thiết lập giới hạn ekip và số người gồm trong giá</label>
    {enabled && <div className={styles.grid}>
      <label>Số người gồm trong giá<input type="number" min={1} max={crew.maximum} required value={crew.included} onChange={e => setCrew({ ...crew, included: +e.target.value })} /></label>
      <label>Ekip tối đa cho phép<input type="number" min={crew.included} max={room.capacity} required value={crew.maximum} onChange={e => setCrew({ ...crew, maximum: +e.target.value })} /></label>
      <label className={styles.check}><input type="checkbox" checked={crew.surchargeEnabled} onChange={e => setCrew({ ...crew, surchargeEnabled: e.target.checked })} /> Tính phụ thu người vượt mức</label>
      {crew.surchargeEnabled && <><label>Đơn vị<select value={crew.unit} onChange={e => setCrew({ ...crew, unit: e.target.value as CrewPolicy["unit"] })}><option value="booking">Mỗi người / đơn thuê</option><option value="hour">Mỗi người / giờ thuê</option></select></label><label>Phụ thu (VND)<input type="number" min={0} step={1} required value={crew.amount} onChange={e => setCrew({ ...crew, amount: +e.target.value })} /></label></>}
    </div>}
    <p className={styles.notice}>{enabled ? `Ví dụ thêm 1 người trong 3 giờ: ${money(crew.surchargeEnabled ? crew.amount * (crew.unit === "hour" ? 3 : 1) : 0)}; vẫn không được vượt ${crew.maximum} người.` : "Chưa cấu hình phụ thu ekip: chỉ dùng sức chứa vật lý, không tự thêm phí."}</p>
    <button className="btn secondary">Lưu chính sách ekip</button>
  </form>;
}
