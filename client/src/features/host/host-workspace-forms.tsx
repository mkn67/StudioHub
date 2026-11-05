"use client";
import { useState } from "react";
import { useWorkspaceData, useHostInventory, useWorkspaceCommand } from "@/features/workspace/workspace-data";
import { WorkspaceCommandDialog } from "@/features/workspace/command-dialog";
import { HostPanel, HostResourceState, HostEmptyState, HostAddButton, HostPageHeader } from "./host-ui";
import { useHostContext } from "./host-context";
import { hostMoney } from "./host-presentation";
import type { WorkspaceType, WorkspacePolicy } from "@/services/api/workspace-contract";

export function WorkspaceRoomCreate({ studioId, onClose, onSaved }: { studioId: string; onClose: () => void; onSaved: () => void }) {
  const inventory = useHostInventory(); const types = inventory.data?.types.filter(type => type.studioId === studioId) ?? [];
  return <WorkspaceCommandDialog title="Thêm phòng vật lý" onClose={onClose} onSaved={onSaved} build={data => {
    const typeId = String(data.get("typeId")); if (!types.some(type => type.id === typeId)) throw new Error("Chọn loại phòng thuộc Studio hiện tại.");
    const images = String(data.get("images")).split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!images.length || images.length > 20 || images.some(src => { try { return !src.startsWith("/images/") && new URL(src).protocol !== "https:"; } catch { return true; } })) throw new Error("Nhập từ 1 đến 20 URL ảnh HTTPS hoặc đường dẫn /images/.");
    return { type: "room_save", room: { typeId, name: String(data.get("name")).trim(), code: String(data.get("code")).trim(), area: Number(data.get("area")), capacity: Number(data.get("capacity")), images, floor: String(data.get("floor") ?? "").trim(), feature: String(data.get("feature") ?? "").trim(), included: [] } };
  }}><label>Tên phòng<input name="name" aria-label="Tên phòng" required maxLength={150}/></label><label>Mã phòng<input name="code" aria-label="Mã phòng" required maxLength={50}/></label><label>Loại phòng<select name="typeId" aria-label="Loại phòng" required><option value="">Chọn…</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Diện tích (m²)<input name="area" aria-label="Diện tích (m²)" type="number" min={1} max={99999} required/></label><label>Sức chứa<input name="capacity" aria-label="Sức chứa" type="number" min={1} max={1000} step={1} required/></label><label>Tầng<input name="floor" maxLength={50}/></label><label>Giới thiệu<textarea name="feature" maxLength={2000}/></label><label>URL ảnh (mỗi dòng một ảnh)<textarea aria-label="URL ảnh" name="images" required/><small>Chỉ lưu URL đã có; không phải chức năng tải ảnh mới.</small></label></WorkspaceCommandDialog>;
}

export function HostRoomTypes({ studioId }: { studioId: string }) {
  const inventory = useHostInventory(); const [editor, setEditor] = useState<{ type?: WorkspaceType } | null>(null), [saved, setSaved] = useState(false);
  const types = inventory.data?.types.filter(type => type.studioId === studioId); const edit = editor?.type;
  return <HostPanel title="Loại phòng của Studio" description="Nhóm phòng và cấu hình giá cơ sở theo loại phòng." action={<HostAddButton disabled={!inventory.data} onClick={() => { setSaved(false); setEditor({}); }}>Thêm loại phòng</HostAddButton>}>
    <HostResourceState resource={inventory}/>{saved && <p className="host-success" role="status">Loại phòng đã được lưu trên máy chủ.</p>}
    {types?.length === 0 && <HostEmptyState title="Chưa có loại phòng" description="Tạo loại phòng cho cơ sở đang chọn."/>}
    {!!types?.length && <div className="host-table-scroll" tabIndex={0}><table className="host-table"><thead><tr><th>Loại phòng</th><th>Phân loại</th><th>Giá cơ sở / giờ</th><th>Gói hỗ trợ</th><th>Thao tác</th></tr></thead><tbody>{types.map(type => <tr key={type.id}><td><strong>{type.name}</strong></td><td>{type.category}</td><td>{hostMoney(type.hourlyRate)}</td><td>{type.plans.map(value => ({ hourly: "Theo giờ", session: "Theo buổi", combo3: "Combo 3", combo5: "Combo 5", combo10: "Combo 10" })[value] ?? value).join(", ")}</td><td><button className="btn secondary" onClick={() => { setSaved(false); setEditor({ type }); }} aria-label={`Sửa loại phòng ${type.name}`}>Sửa</button></td></tr>)}</tbody></table></div>}
    {editor && <WorkspaceCommandDialog title={edit ? `Sửa loại phòng ${edit.name}` : "Thêm loại phòng"} onClose={() => setEditor(null)} onSaved={() => { inventory.reload(); setEditor(null); setSaved(true); }} build={data => {
      const plans = data.getAll("plans").map(String); if (!plans.length) throw new Error("Chọn ít nhất một gói thuê.");
      const name = String(data.get("name")).trim(), category = String(data.get("category")).trim(); if (!name || !category) throw new Error("Nhập tên và phân loại phòng.");
      return { type: "type_save", roomType: { ...(edit ? { id: edit.id } : {}), studioId, name, category, hourlyRate: Number(data.get("hourlyRate")), plans } };
    }}><label>Tên loại phòng<input name="name" aria-label="Tên loại phòng" required maxLength={150} defaultValue={edit?.name}/></label><label>Phân loại<input name="category" aria-label="Phân loại" required maxLength={100} defaultValue={edit?.category}/></label><label>Giá cơ sở theo giờ (VND)<input type="number" name="hourlyRate" aria-label="Giá cơ sở theo giờ (VND)" required min={1} step={1} defaultValue={edit?.hourlyRate}/></label><div><strong>Gói hỗ trợ</strong>{[["hourly", "Theo giờ"], ["session", "Theo buổi"], ["combo3", "Combo 3"], ["combo5", "Combo 5"], ["combo10", "Combo 10"]].map(([value, label]) => <label className="host-checkbox" key={value}><input type="checkbox" name="plans" value={value} defaultChecked={edit?.plans.includes(value)}/>{label}</label>)}</div></WorkspaceCommandDialog>}
  </HostPanel>;
}
export function HostPolicies() {
  const { studios, studioId, selectStudio } = useHostContext(), workspace = useWorkspaceData();
  const [confirmedStudio, setConfirmedStudio] = useState("");
  const studio = workspace.data?.studios.find(studio => studio.id === studioId);
  return <><HostPageHeader title="Chính sách Studio" description="Cấu hình chính sách thuê cho cơ sở đang quản lý."/>{confirmedStudio === studioId && <p className="host-success" role="status">Chính sách đã được lưu trên máy chủ.</p>}<HostResourceState resource={studios}/><HostResourceState resource={workspace}/><div className="host-context-bar"><label>Studio đang quản lý<select aria-label="Chọn Studio chính sách" value={studioId} onChange={event => { if (window.confirm("Chuyển Studio? Các thay đổi chính sách chưa lưu sẽ bị bỏ.")) selectStudio(event.target.value); }}>{studios.data?.map(item => <option key={item.studio_id} value={item.studio_id}>{item.name}</option>)}</select></label></div>{studio && <PolicyForm key={studio.id} studioId={studio.id} policy={studio.policy} onDraft={() => setConfirmedStudio("")} onSaved={() => { setConfirmedStudio(studioId); workspace.reload(); }}/>}</>;
}
function PolicyForm({ studioId, policy, onSaved, onDraft }: { studioId: string; policy: WorkspacePolicy; onSaved: () => void; onDraft: () => void }) {
  const action = useWorkspaceCommand(); const [tiers, setTiers] = useState(policy.refundTiers.map(tier => ({ hours: String(tier.hours), percent: String(tier.percent) }))), [validation, setValidation] = useState("");
  return <HostPanel title="Điều kiện thuê và hoàn cọc" description="Kiểm tra đầy đủ trước khi lưu. Các đơn đã có giữ chính sách do backend quản lý."><p className="workspace-admin-note">Giá trị do hệ thống cung cấp có thể là mẫu cấu hình nếu Studio chưa từng lưu chính sách. Chỉ xác nhận đã lưu khi máy chủ trả thành công.</p><form className="workspace-account-form" onChange={onDraft} onSubmit={event => {
    event.preventDefault(); if (action.busy) return; onDraft(); setValidation(""); const data = new FormData(event.currentTarget);
    const next = { ...Object.fromEntries(["paymentMinutes", "depositPercent", "cancelHours", "changeHours", "overtimePerBlock", "openHour", "closeHour"].map(key => [key, Number(data.get(key))])), refundTiers: tiers.map(tier => ({ hours: Number(tier.hours), percent: Number(tier.percent) })) } as WorkspacePolicy;
    if (!tiers.length || next.openHour >= next.closeHour) { setValidation("Cần ít nhất một mốc hoàn cọc và giờ đóng cửa sau giờ mở cửa."); return; }
    void action.execute({ type: "policy", studioId, policy: next }, onSaved);
  }}><fieldset className="host-fields" disabled={action.busy}><legend className="host-sr-only">Chính sách thuê</legend>
    <label>Hạn thanh toán cọc (phút)<select name="paymentMinutes" defaultValue={policy.paymentMinutes}>{[15, 30, 60, 120, 180].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Tỷ lệ cọc (%)<input name="depositPercent" type="number" min={1} max={100} step={1} required defaultValue={policy.depositPercent}/></label>
    {[['cancelHours', 'Hạn hủy (giờ)'], ['changeHours', 'Hạn đổi lịch (giờ)']].map(([name, label]) => <label key={name}>{label}<select name={name} defaultValue={policy[name as "cancelHours" | "changeHours"]}>{[24, 48, 72].map(value => <option key={value}>{value}</option>)}</select></label>)}
    <label>Phí quá giờ mỗi block (VND)<input name="overtimePerBlock" type="number" min={0} step={1} required defaultValue={policy.overtimePerBlock}/></label>
    <label>Giờ mở cửa<input name="openHour" type="number" min={0} max={23} step={1} required defaultValue={policy.openHour}/></label><label>Giờ đóng cửa<input name="closeHour" type="number" min={1} max={24} step={1} required defaultValue={policy.closeHour}/></label>
  </fieldset><fieldset disabled={action.busy} className="workspace-refund-tiers"><legend>Mốc hoàn cọc</legend>{tiers.map((tier, index) => <div className="host-actions" key={index}><label>Trước giờ thuê (giờ)<input aria-label={`Mốc ${index + 1} số giờ`} type="number" min={0} max={8760} step={1} required value={tier.hours} onChange={event => setTiers(tiers.map((item, i) => i === index ? { ...item, hours: event.target.value } : item))}/></label><label>Tỷ lệ hoàn (%)<input aria-label={`Mốc ${index + 1} tỷ lệ hoàn`} type="number" min={0} max={100} step={1} required value={tier.percent} onChange={event => setTiers(tiers.map((item, i) => i === index ? { ...item, percent: event.target.value } : item))}/></label><button type="button" className="btn secondary" onClick={() => { onDraft(); setTiers(tiers.filter((_, i) => i !== index)); }}>Bỏ mốc {index + 1}</button></div>)}<button type="button" className="btn secondary" onClick={() => { onDraft(); setTiers([...tiers, { hours: "", percent: "" }]); }}>Thêm mốc hoàn cọc</button></fieldset>
  {(validation || action.error) && <p className="host-form-error" role="alert">{validation || action.error}</p>}<div className="host-editor-footer"><button className="btn" disabled={action.busy}>{action.busy ? "Đang lưu…" : "Lưu chính sách"}</button></div></form></HostPanel>;
}
