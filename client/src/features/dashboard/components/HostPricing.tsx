"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, ArrowRight } from "lucide-react";
import { Presence } from "@/components/motion/system";
import { PageHeading, Modal } from "@/components/ui";
import { HostPricingDraftProvider, useStore } from "@/components/store";
import { execute, type Command } from "@/domain/engine";
import { effectiveRentalPlans } from "@/domain/rental";
import { applyHostPricing, type HostPricingCommand } from "@/domain/host-pricing";
import { money, planLabel, type RoomType, type Plan, type State } from "@/domain/models";
import { RentalPackageManager } from "@/features/pricing/components/RentalPackageManager";
import { FeaturedPricingManager } from "@/features/pricing/components/FeaturedPricingManager";
import { PricingList } from "@/features/pricing/components/PricingList";

export function HostPricing({ types }: { types: RoomType[] }) {
  const { state } = useStore();
  const [editing, setEditing] = useState<{ typeId: string; roomId?: string } | null>(null);
  return <>
    <PageHeading title="Bảng giá thuê" description="Giá mặc định theo loại phòng, ghi đè riêng cho từng phòng thực tế. Mở trình chỉnh sửa để lưu các thay đổi cùng một lần." />
    <div className="host-pricing-overview">{types.map((type, index) => {
      const rooms = state.rooms.filter(room => room.typeId === type.id);
      const overrides = rooms.filter(room => room.rentalPlans || room.rateOverride !== undefined);
      const enabledPlans = type.rentalPlans ? type.rentalPlans.filter(plan => plan.active).map(plan => ({ id: plan.plan, title: plan.title })) : type.plans.map(plan => ({ id: plan, title: planLabel[plan] }));
      return <section className="host-pricing-summary" key={type.id} data-pricing-type={type.id} data-tone={["cyan", "blue", "lilac"][index % 3]}>
        <div className="host-pricing-summary-head"><div><p className="dashboard-eyebrow">{state.studios.find(studio => studio.id === type.studioId)?.name} · {rooms.length} phòng thực tế</p><h2>{type.name}</h2><p className="host-pricing-base">Giá cơ bản <strong>{money(type.hourlyRate)} <span>/ giờ</span></strong></p><p className="muted">{type.rentalPlans ? "Có cấu hình gói tùy chỉnh" : "Gói theo giá nền"}</p></div>
          <button className="btn secondary" onClick={() => setEditing({ typeId: type.id })} aria-label={`Chỉnh sửa bảng giá ${type.name}`}><Pencil size={15} aria-hidden="true" />Chỉnh sửa bảng giá</button></div>
        <div className="host-pricing-plans" aria-label="Gói mặc định đang bật">{enabledPlans.map(plan => <span className="dashboard-tag" key={plan.id}>{plan.title}</span>)}{!enabledPlans.length && <span className="muted">Chưa có gói đang bật</span>}<span className="muted">{overrides.length} phòng có giá riêng</span></div>
        <ul className="host-pricing-units">{rooms.map(room => <li key={room.id}><div><strong>{room.code}</strong><span>{room.rentalPlans ? "Gói riêng của phòng" : room.rateOverride !== undefined ? "Đơn giá giờ riêng" : "Kế thừa giá loại phòng"}</span></div><button type="button" className="text-button" aria-label={`Chỉnh giá phòng ${room.code}`} onClick={() => setEditing({ typeId: type.id, roomId: room.id })}>Chỉnh giá phòng <ArrowRight size={14} aria-hidden="true" /></button></li>)}</ul>
      </section>;
    })}</div>
    {!types.length && <p className="dashboard-empty">Tạo loại phòng và phòng thực tế trước khi cấu hình bảng giá.</p>}
    <Presence>{editing && <PricingEditor key={editing.typeId} typeId={editing.typeId} initialRoomId={editing.roomId} onClose={() => setEditing(null)} />}</Presence>
  </>;
}

type EditorTab = "basic" | "packages" | "featured" | "preview";
const tabs: [EditorTab, string][] = [["basic", "Giá nền"], ["packages", "Gói thuê & ekip"], ["featured", "Gói nổi bật"], ["preview", "Xem trước"]];
function PricingEditor({ typeId, initialRoomId, onClose }: { typeId: string; initialRoomId?: string; onClose: () => void }) {
  const shared = useStore();
  const [draft, setDraft] = useState(() => structuredClone(shared.state));
  const draftRef = useRef(draft), commands = useRef<HostPricingCommand[]>([]), dirty = useRef(false), failedStage = useRef(false);
  const body = useRef<HTMLDivElement>(null);
  const [scopeId, setScopeId] = useState(initialRoomId ?? typeId), [tab, setTab] = useState<EditorTab>(initialRoomId ? "packages" : "basic"), [message, setMessage] = useState("");
  const type = draft.types.find(item => item.id === typeId)!;
  const rooms = draft.rooms.filter(room => room.typeId === typeId), room = rooms.find(item => item.id === scopeId);
  const previewRoomId = room?.id ?? rooms[0]?.id;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function stage(command: Command): State | null {
    try {
      if (!["rate", "rental_plans", "crew_policy", "featured_pricing"].includes(command.type)) throw Error("Thao tác ngoài phạm vi bảng giá.");
      if (command.type === "rental_plans" && command.plans !== null) {
        const current = draftRef.current;
        const target = command.target === "room" ? current.rooms.find(item => item.id === command.id) : current.types.find(item => item.id === command.id);
        const representative = command.target === "room" ? current.rooms.find(item => item.id === command.id) : current.rooms.find(item => item.typeId === command.id);
        if (target && !target.rentalPlans && representative) {
          const inherited = structuredClone(current);
          if (command.target === "type") { const previewRoom = inherited.rooms.find(item => item.id === representative.id)!; delete previewRoom.rentalPlans; delete previewRoom.rateOverride; }
          if (JSON.stringify(command.plans) === JSON.stringify(effectiveRentalPlans(inherited, representative.id))) return current;
        }
      }
      const next = execute(draftRef.current, command);
      if (JSON.stringify([next.types, next.rooms]) !== JSON.stringify([draftRef.current.types, draftRef.current.rooms])) {
        commands.current.push(structuredClone(command as HostPricingCommand));
        draftRef.current = next; setDraft(next); dirty.current = true;
      }
      return next;
    } catch (error) {
      failedStage.current = true; setMessage(error instanceof Error ? error.message : "Bản nháp chưa hợp lệ."); return null;
    }
  }
  function captureForms() {
    const forms = Array.from(body.current?.querySelectorAll<HTMLFormElement>("form") ?? []);
    if (forms.some(form => !form.reportValidity())) return false;
    failedStage.current = false;
    forms.forEach(form => form.requestSubmit());
    return !failedStage.current;
  }
  function switchTo(nextTab: EditorTab, nextScope = scopeId) {
    if (!captureForms()) return;
    setMessage(""); setTab(nextTab); setScopeId(nextScope);
  }
  function close() {
    if (!dirty.current || window.confirm("Bỏ các thay đổi bảng giá chưa lưu?")) onClose();
  }
  async function save() {
    if (!captureForms()) return;
    // Validate the whole transaction before asking the shared provider to persist.
    try { applyHostPricing(shared.state, commands.current); } catch (error) { setMessage(error instanceof Error ? error.message : "Bảng giá chưa hợp lệ."); return; }
    if ((await shared.saveHostPricing(commands.current))) { dirty.current = false; shared.notice("Đã lưu bảng giá. Các đơn đã tạo giữ nguyên snapshot."); onClose(); }
    else setMessage("Chưa lưu được bảng giá. Bản nháp vẫn còn, bạn có thể thử lại.");
  }
  return <Modal title={`Chỉnh sửa bảng giá · ${type.name}`} onClose={close} wide className="host-pricing-modal">
    <div className="host-pricing-scope"><p><strong>{shared.state.studios.find(studio => studio.id === type.studioId)?.name}</strong> / {type.name}</p>
      <label>Phạm vi chỉnh sửa<select aria-label="Phạm vi chỉnh sửa bảng giá" value={scopeId} onChange={event => switchTo(event.target.value === typeId ? "basic" : "packages", event.target.value)}><option value={typeId}>Mặc định loại phòng · {type.name}</option>{rooms.map(item => <option key={item.id} value={item.id}>Phòng {item.code} · ghi đè riêng</option>)}</select></label>
      <p className="host-metric-note">{room ? `${room.code}: ${room.rentalPlans || room.rateOverride !== undefined ? "đang có giá riêng" : "đang kế thừa giá loại phòng"}. Chỉnh gói thuê để lưu giá riêng cho đúng phòng này.` : "Thay đổi mặc định loại phòng; các phòng có cấu hình riêng vẫn giữ giá riêng."} Chỉ nút “Lưu thay đổi” mới ghi vào dữ liệu dùng chung.</p>
    </div>
    <div className="host-editor-tabs" role="tablist" aria-label="Các phần bảng giá">{tabs.map(([key, label], index) => <button type="button" role="tab" key={key} id={`pricing-tab-${key}`} aria-selected={tab === key} aria-controls="pricing-editor-panel" tabIndex={tab === key ? 0 : -1} onClick={() => switchTo(key)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      if (captureForms()) { setTab(tabs[next][0]); document.getElementById(`pricing-tab-${tabs[next][0]}`)?.focus(); }
    }}>{label}</button>)}</div>
    <HostPricingDraftProvider state={draft} dispatch={stage} notice={() => setMessage("Đã cập nhật bản nháp, chưa ghi vào dữ liệu dùng chung.")}>
      <div ref={body} className="host-editor-content" id="pricing-editor-panel" role="tabpanel" aria-labelledby={`pricing-tab-${tab}`} onChangeCapture={() => { dirty.current = true; }} onClickCapture={event => {
        const target = event.target as HTMLElement;
        if (target.closest("a[href]") && dirty.current && !window.confirm("Rời bảng giá và bỏ thay đổi chưa lưu?")) { event.preventDefault(); event.stopPropagation(); }
      }}>
        {tab === "basic" && (room ? <p>Giá riêng phòng {room.code} được chỉnh tại phần <button className="text-button" onClick={() => switchTo("packages")}>Gói thuê & ekip</button>. Giá nền loại phòng không bị thay đổi.</p> : type.rentalPlans ? <p>Loại phòng đang có gói tùy chỉnh. Chỉnh giá hiệu lực trong <button className="text-button" onClick={() => switchTo("packages")}>Gói thuê & ekip</button>; giá nền cũ {money(type.hourlyRate)} / giờ được giữ làm nguồn kế thừa.</p> : <BaseRateForm key={type.id} type={type} save={(hourlyRate, plans) => stage({ type: "rate", id: type.id, hourlyRate, plans })} />)}
        {tab === "packages" && <RentalPackageManager key={scopeId} typeId={typeId} scopeId={scopeId} onScopeChange={id => switchTo("packages", id)} />}
        {tab === "featured" && <FeaturedPricingManager key={scopeId} typeId={typeId} initialRoomId={room?.id} lockRoom={Boolean(room)} />}
        {tab === "preview" && (previewRoomId ? <div><p className="host-metric-note">Xem trước bản nháp · phòng {draft.rooms.find(item => item.id === previewRoomId)?.code}</p><PricingList state={draft} roomId={previewRoomId} /></div> : <p>Tạo phòng thực tế trước khi xem trước bảng giá.</p>)}
      </div>
    </HostPricingDraftProvider>
    {message && <p className="host-editor-message" role="status">{message}</p>}
    <footer className="host-editor-footer"><span>Bản nháp · chỉ áp dụng cho đơn mới</span><div className="actions"><button type="button" className="btn secondary" onClick={close}>Hủy</button><button type="button" className="btn" onClick={save}>Lưu thay đổi</button></div></footer>
  </Modal>;
}

function BaseRateForm({ type, save }: { type: RoomType; save: (rate: number, plans: Plan[]) => void }) {
  const [rate, setRate] = useState(type.hourlyRate), [plans, setPlans] = useState(type.plans);
  return <form className="rate-form" onSubmit={event => { event.preventDefault(); save(rate, plans); }}><div><h2>Giá nền · {type.name}</h2><label>Đơn giá theo giờ (VND)<input required type="number" min={1} step={1} value={rate} onChange={event => setRate(+event.target.value)} /></label></div>
    <fieldset><legend>Gói cho phép</legend><div className="plan-checks">{(Object.keys(planLabel) as Plan[]).map(plan => <label className="checkbox-label" key={plan}><input type="checkbox" checked={plans.includes(plan)} onChange={event => setPlans(event.target.checked ? [...plans, plan] : plans.filter(item => item !== plan))} />{planLabel[plan]}</label>)}</div></fieldset>
  </form>;
}
