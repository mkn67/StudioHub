"use client";
import { useState } from "react";
import { useResource } from "@/services/api/use-resource";
import { apiRequest } from "@/services/api/client";
import { records, record, text } from "@/services/api/management";
import { useApiAction } from "@/components/api-ui";
import { HostEditor, HostPanel, HostResourceState, HostEmptyState, HostAddButton, HostPageHeader, hostStatusOptions } from "./host-ui";
import { useHostContext } from "./host-context";

export function RestRoomTypes({ studioId }: { studioId: string }) {
  const list = useResource(`/api/host/room-types?studio_id=${studioId}`, records);
  const [editor, setEditor] = useState<{ id?: string; name?: string; description?: string; area?: string; capacity?: string; status?: string } | null>(null);
  return <HostPanel title="Loại phòng của Studio" action={<HostAddButton onClick={() => setEditor({})}>Thêm loại phòng</HostAddButton>}><HostResourceState resource={list}/>{list.data?.length === 0 && <HostEmptyState title="Chưa có loại phòng" description="Tạo loại phòng riêng cho Studio đang chọn."/>}<div className="host-resource-rows">{list.data?.map(item => <article className="host-room-row" key={text(item.room_type_id)}><div><h3>{text(item.name)}</h3><p>{text(item.area)} m² · {text(item.capacity)} người · {text(item.status)}</p><p>{text(item.description, "")}</p></div><button className="btn secondary" onClick={() => setEditor({ id: text(item.room_type_id), name: text(item.name, ""), description: text(item.description, ""), area: text(item.area, ""), capacity: text(item.capacity, ""), status: text(item.status) })}>Sửa loại phòng {text(item.name)}</button></article>)}</div>{editor && <HostEditor title={editor.id ? "Sửa loại phòng" : "Thêm loại phòng"} path={`/api/host/room-types${editor.id ? `/${editor.id}` : ""}`} method={editor.id ? "PATCH" : "POST"} extra={editor.id ? {} : { studio_id: Number(studioId) }} fields={[{ name: "name", label: "Tên loại phòng", value: editor.name }, { name: "description", label: "Mô tả", required: false, value: editor.description }, { name: "area", label: "Diện tích", type: "number", step: "any", min: 1, required: false, value: editor.area }, { name: "capacity", label: "Sức chứa", type: "number", min: 1, required: false, value: editor.capacity }, { name: "status", label: "Trạng thái", options: hostStatusOptions, value: editor.status ?? "active" }]} onClose={() => setEditor(null)} onSaved={() => { list.reload(); setEditor(null); }}/>}</HostPanel>;
}
export function RestRoomCreate({ studioId, onClose, onSaved }: { studioId: string; onClose: () => void; onSaved: () => void }) {
  const types = useResource(`/api/host/room-types?studio_id=${studioId}`, records), spaces = useResource("/api/space-types", records), amenities = useResource("/api/amenities", records);
  return <><HostResourceState resource={types}/><HostResourceState resource={spaces}/><HostResourceState resource={amenities}/>{types.data && spaces.data && amenities.data && <HostEditor title="Thêm phòng vật lý" path="/api/rooms" extra={{ studio_id: Number(studioId) }} fields={[
    { name: "name", label: "Tên phòng" }, { name: "room_type_id", label: "Loại phòng của Studio", options: types.data.filter(t => t.status === "active").map(t => ({ value: text(t.room_type_id), label: text(t.name) })) },
    { name: "space_type_id", label: "Loại không gian công khai", options: spaces.data.map(t => ({ value: text(t.space_type_id), label: text(t.name) })) },
    { name: "area", label: "Diện tích", type: "number", step: "any", min: 1 }, { name: "capacity", label: "Sức chứa", type: "number", min: 1 }, { name: "description", label: "Mô tả", required: false },
  ]} mapBody={(body, data) => { const { space_type_id, ...rest } = body; return { ...rest, room_type_id: Number(rest.room_type_id), space_type_ids: [Number(space_type_id)], amenity_ids: data.getAll("amenity_ids").map(Number) }; }} onClose={onClose} onSaved={onSaved}><fieldset><legend>Tiện ích có sẵn</legend>{amenities.data.map(item => <label className="host-checkbox" key={text(item.amenity_id)}><input type="checkbox" name="amenity_ids" value={text(item.amenity_id)}/>{text(item.name)}</label>)}</fieldset></HostEditor>}</>;
}
export function RestHostPolicies() {
  const { studios, studioId, selectStudio } = useHostContext();
  return <><HostPageHeader title="Chính sách Studio" description="Cấu hình điều kiện thuê của Studio."/><HostResourceState resource={studios}/><label>Studio<select value={studioId} onChange={e => { if (window.confirm("Chuyển Studio và bỏ thay đổi chưa lưu?")) selectStudio(e.target.value); }}>{studios.data?.map(s => <option key={s.studio_id} value={s.studio_id}>{s.name}</option>)}</select></label>{studioId && <RestPolicyForm key={studioId} studioId={studioId}/>}</>;
}
function RestPolicyForm({ studioId }: { studioId: string }) {
  const resource = useResource(`/api/host/policies?studio_id=${studioId}`, record), action = useApiAction(), [saved, setSaved] = useState(false);
  const policy = resource.data;
  return <HostPanel title="Điều kiện thuê và hoàn cọc"><HostResourceState resource={resource}/>{policy && <form key={JSON.stringify(policy)} className="workspace-account-form" onChange={() => setSaved(false)} onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget); setSaved(false);
    void action.run(async () => {
      let refund_tiers: unknown;
      try { refund_tiers = JSON.parse(String(data.get("refund_tiers"))); } catch { throw new Error("Mốc hoàn cọc cần là mảng JSON hợp lệ."); }
      await apiRequest("/api/host/policies", { method: "PATCH", body: { studio_id: Number(studioId), ...Object.fromEntries(["payment_minutes", "deposit_percent", "cancel_hours", "change_hours", "overtime_per_30m", "open_hour", "close_hour"].map(key => [key, Number(data.get(key))])), refund_tiers } }); resource.reload(); setSaved(true);
    });
  }}><fieldset className="host-fields" disabled={action.busy}>{[
    ["payment_minutes", "Hạn thanh toán (phút)", 1, 1440], ["deposit_percent", "Tỷ lệ cọc (%)", 0, 100], ["cancel_hours", "Hạn hủy (giờ)", 0, 720], ["change_hours", "Hạn đổi lịch (giờ)", 0, 720], ["overtime_per_30m", "Phí quá giờ / 30 phút (VND)", 0, 100000000], ["open_hour", "Giờ mở cửa", 0, 23], ["close_hour", "Giờ đóng cửa", 1, 24],
  ].map(([key, label, min, max]) => <label key={String(key)}>{String(label)}<input name={String(key)} type="number" min={Number(min)} max={Number(max)} required defaultValue={text(policy[String(key)], "")}/></label>)}<RefundTiers initial={policy.refund_tiers}/></fieldset>{action.error && <p className="host-form-error" role="alert">{action.error}</p>}{saved && <p className="host-success" role="status">Chính sách đã được máy chủ lưu.</p>}<button className="btn" disabled={action.busy}>Lưu chính sách</button></form>}</HostPanel>;
}
function RefundTiers({ initial }: { initial: unknown }) {
  const [tiers, setTiers] = useState(() => records(initial).map(t => ({ hours: text(t.hours, ""), percent: text(t.percent, "") })));
  return <fieldset className="workspace-refund-tiers"><legend>Mốc hoàn cọc</legend><input type="hidden" name="refund_tiers" value={JSON.stringify(tiers.map(t => ({ hours: Number(t.hours), percent: Number(t.percent) })))}/>{tiers.map((tier, index) => <div className="host-actions" key={index}><label>Trước giờ thuê (giờ)<input type="number" aria-label={`Mốc ${index + 1} số giờ`} min={0} required value={tier.hours} onChange={e => setTiers(tiers.map((t, i) => i === index ? { ...t, hours: e.target.value } : t))}/></label><label>Tỷ lệ hoàn (%)<input type="number" aria-label={`Mốc ${index + 1} tỷ lệ hoàn`} min={0} max={100} required value={tier.percent} onChange={e => setTiers(tiers.map((t, i) => i === index ? { ...t, percent: e.target.value } : t))}/></label><button type="button" className="btn secondary" onClick={() => setTiers(tiers.filter((_, i) => i !== index))}>Bỏ mốc {index + 1}</button></div>)}<button className="btn secondary" type="button" disabled={tiers.length >= 10} onClick={() => setTiers([...tiers, { hours: "", percent: "" }])}>Thêm mốc hoàn cọc</button><p>Sắp xếp mốc giảm dần theo số giờ. Máy chủ kiểm tra chính sách trước khi lưu.</p></fieldset>;
}
