"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, ArrowUpRight, Pencil, ImagePlus, Building2 } from "lucide-react";
import { useResource } from "@/services/api/use-resource";
import { apiRequest } from "@/services/api/client";
import { sqlVietnamTime, unitLabels } from "@/services/api/contracts";
import { useApiAction } from "@/components/api-ui";
import { Modal } from "@/components/ui";
import { useHostContext } from "./host-context";
import type { HostStudio, HostRoom, HostEquipment, HostRate } from "./host-types";
import { hostMoney } from "./host-presentation";
import { HostPageHeader, HostPanel, HostImage, HostStatusBadge, HostEmptyState, HostResourceState, HostAddButton, HostEditor, HostPagination, hostStatusOptions, type HostField } from "./host-ui";
import { HostCalendar } from "./host-calendar";
import { HostRetirementButton, HostRetirementDialog } from "./host-retirement-dialog";
import { RestRoomTypes as HostRoomTypes, RestRoomCreate as WorkspaceRoomCreate } from "./host-rest-forms";
import { ApiOperationDialog, UploadDialog } from "@/features/workspace/api-operation-dialog";
import { hostEquipment, hostRooms, hostRoom, hostRates } from "@/services/api/host-contract";
import { records, text } from "@/services/api/management";

const studioFields: HostField[] = [{ name: "name", label: "Tên Studio", minLength: 3 }, { name: "description", label: "Mô tả", required: false, clearable: true }, { name: "address", label: "Địa chỉ", minLength: 3 }, { name: "district", label: "Quận / huyện", minLength: 2 }, { name: "city", label: "Tỉnh / thành phố", minLength: 2 }, { name: "phone", label: "Điện thoại", type: "tel", minLength: 9 }];

export function HostStudiosPage() {
  const { studios, selectStudio } = useHostContext();
  const [cover, setCover] = useState<HostStudio | null>(null);
  const [editor, setEditor] = useState<{ studio?: HostStudio } | null>(null), [saved, setSaved] = useState("");
  const edit = editor?.studio;
  return <>
    <HostPageHeader title="Studio của tôi" description="Quản lý thông tin và không gian Studio." action={<HostAddButton onClick={() => setEditor({})}>Thêm Studio</HostAddButton>}/>
    {saved && <p className="host-success" role="status">{saved}</p>}
    <HostPanel title="Các cơ sở của bạn" description={studios.data ? `${studios.data.length} Studio đang quản lý` : undefined}>
      <HostResourceState resource={studios}/>
      {studios.data?.length === 0 && <HostEmptyState title="Bắt đầu với Studio đầu tiên" description="Thêm thông tin cơ sở để thiết lập phòng và thiết bị của bạn." action={<HostAddButton onClick={() => setEditor({})}>Thêm Studio</HostAddButton>}/>}
      <div className="host-studio-list">{studios.data?.map(studio => <article className="host-studio-row" key={studio.studio_id}>
        <HostImage kind="studio" src={studio.cover_url} alt={studio.name}/>
        <div className="host-studio-copy"><div className="host-title-line"><h3>{studio.name}</h3><HostStatusBadge status={studio.status}/></div><p><MapPin size={16}/>{studio.address}, {studio.district}, {studio.city}</p><p><Phone size={16}/>{studio.phone}</p><div className="host-resource-summary">{studio.total_rooms !== undefined && <span>{studio.total_rooms} phòng chưa ẩn</span>}{studio.total_equipments !== undefined && <span>{studio.total_equipments} thiết bị chưa ẩn</span>}</div></div>
        <div className="host-row-actions"><button className="btn secondary" onClick={() => setEditor({ studio })}><Pencil size={16}/>Chỉnh sửa</button><button className="btn secondary" onClick={() => setCover(studio)}>Ảnh Studio</button><Link className="host-inline-link" href="/host/rooms" onClick={() => selectStudio(String(studio.studio_id))}>Quản lý phòng <ArrowUpRight size={16}/></Link></div>
      </article>)}</div>
    </HostPanel>
    {editor && <HostEditor title={edit ? `Sửa ${edit.name}` : "Thêm Studio"} path={edit ? `/api/studios/${edit.studio_id}` : "/api/studios"} method={edit ? "PATCH" : "POST"}
      fields={[...studioFields.map(field => ({ ...field, value: edit?.[field.name as keyof HostStudio] ?? "" } as HostField)), ...(edit ? [{ name: "status", label: "Trạng thái", options: hostStatusOptions, required: false, value: edit.status === "not_active" ? "" : edit.status }] : [])]}
      onClose={() => setEditor(null)} onSaved={() => { studios.reload(); setEditor(null); setSaved("Thông tin Studio đã được lưu trên máy chủ."); }}/>}
    {cover && <UploadDialog title={`Ảnh Studio · ${cover.name}`} path={`/api/studios/${cover.studio_id}/cover`} onClose={() => setCover(null)} onSaved={() => { studios.reload(); setCover(null); setSaved("Ảnh Studio đã được lưu."); }}/>}
  </>;
}

const sections: Record<string, [string, string]> = {
  rooms: ["Quản lý phòng", "Sắp xếp phòng vật lý theo loại không gian của Studio."],
  equipments: ["Thiết bị Studio", "Quản lý danh sách, số lượng và giá thuê thiết bị."],
  rates: ["Bảng giá cho thuê", "Quản lý giá thuê và các gói dịch vụ theo từng phòng."],
  calendar: ["Lịch đặt phòng", "Theo dõi các khoảng thời gian bận của từng phòng."],
};
export function HostResourcesPage({ section }: { section: string }) {
  const { studios, studioId, selectStudio } = useHostContext();
  const [title, description] = sections[section];
  return <>
    <HostPageHeader title={title} description={description}/>
    <HostResourceState resource={studios}/>
    {studios.data && !studios.data.length && <HostEmptyState title="Chưa có Studio" description="Thêm Studio đầu tiên để quản lý phòng và tài nguyên." action={<Link className="btn" href="/host/studios">Thêm Studio</Link>}/>}
    {!!studios.data?.length && <div className="host-context-bar"><span className="host-context-icon"><Building2 size={21}/></span><label>Studio đang quản lý<select aria-label="Chọn Studio" value={studioId} onChange={e => selectStudio(e.target.value)}>{studios.data.map(studio => <option key={studio.studio_id} value={studio.studio_id}>{studio.name}</option>)}</select></label><span className="host-context-meta">{studios.data.find(s => String(s.studio_id) === studioId)?.district}</span></div>}
    {studioId && (section === "equipments" ? <EquipmentList key={studioId} studioId={studioId}/> : <RoomsList key={`${studioId}:${section}`} studioId={studioId} section={section}/>)}
  </>;
}

function EquipmentList({ studioId }: { studioId: string }) {
  const list = useResource(`/api/host/equipments?studio_id=${studioId}`, hostEquipment);
  const categories = useResource<{ category_id: number; name: string }[]>(`/api/equipment-categories?studio_id=${studioId}`);
  const [editor, setEditor] = useState<{ item?: HostEquipment; category?: boolean } | null>(null), [search, setSearch] = useState(""), [saved, setSaved] = useState("");
  const edit = editor?.item;
  const [retiring, setRetiring] = useState<HostEquipment | null>(null);
  const [deleting, setDeleting] = useState<HostEquipment | null>(null), [image, setImage] = useState<HostEquipment | null>(null);
  const items = list.data?.filter(item => item.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <>
    <div className="host-toolbar"><label className="host-search">Tìm trong danh sách<input placeholder="Tên thiết bị…" value={search} onChange={e => setSearch(e.target.value)}/></label><div className="host-actions"><button className="btn secondary" onClick={() => setEditor({ category: true })}>Thêm nhóm</button><HostAddButton onClick={() => setEditor({})} disabled={categories.loading || !!categories.error}>Thêm thiết bị</HostAddButton></div></div>
    {saved && <p className="host-success" role="status">{saved}</p>}
    <HostResourceState resource={categories}/>
    <HostPanel title="Danh sách thiết bị" description="Thiết bị thuộc Studio, gồm cả tài nguyên đã ngừng cung cấp. Xóa theo điều kiện của máy chủ.">
      <HostResourceState resource={list}/>
      {items?.length === 0 && <HostEmptyState title={search ? "Không tìm thấy thiết bị" : "Chưa có thiết bị đang công khai"} description={search ? "Thử một tên khác hoặc xóa nội dung tìm kiếm." : "Thêm thiết bị và cấu hình giá thuê để bắt đầu."} action={search ? <button className="btn secondary" onClick={() => setSearch("")}>Xóa tìm kiếm</button> : <HostAddButton onClick={() => setEditor({})} disabled={!!categories.error || categories.loading}>Thêm thiết bị</HostAddButton>}/>}
      {!!items?.length && <div className="host-table-scroll" tabIndex={0} aria-label="Danh sách thiết bị có thể cuộn ngang"><table className="host-table"><thead><tr><th>Thiết bị</th><th>Số lượng</th><th>Giá thuê</th><th>Trạng thái</th><th><span className="host-sr-only">Thao tác</span></th></tr></thead><tbody>{items.map(item => <tr key={item.equipment_id}><td><div className="host-table-resource"><HostImage kind="equipment" src={item.image_url} alt={item.name} category={item.category_name ?? item.name}/><div><strong>{item.name}</strong><small>{item.category_name}{item.brand ? ` · ${item.brand}` : ""}</small></div></div></td><td className="host-number">{item.total_quantity}</td><td><strong>{hostMoney(item.unit_price)}</strong><small>/ {unitLabels[item.pricing_unit] ?? item.pricing_unit}</small></td><td><HostStatusBadge status={item.status}/></td><td><div className="host-table-actions"><button className="btn secondary" aria-label={`Sửa ${item.name}`} onClick={() => setEditor({ item })}><Pencil size={16}/>Sửa</button><HostRetirementButton disabled={item.status !== "active"} label="Ngừng cung cấp" name={item.name} onClick={() => { setSaved(""); setRetiring(item); }}/><button className="btn secondary" onClick={() => setImage(item)}>Ảnh thiết bị</button><button className="btn destructive" onClick={() => { setSaved(""); setDeleting(item); }}>Xóa {item.name}</button></div></td></tr>)}</tbody></table></div>}
    </HostPanel>
    {image && <UploadDialog title={`Ảnh · ${image.name}`} path={`/api/equipments/${image.equipment_id}/images`} onClose={() => setImage(null)} onSaved={() => { list.reload(); setImage(null); setSaved("Ảnh thiết bị đã được lưu."); }}/>}
    {deleting && <ApiOperationDialog title={`Xóa vĩnh viễn ${deleting.name}?`} method="DELETE" path={`/api/equipments/${deleting.equipment_id}`} onClose={() => setDeleting(null)} onSaved={() => { list.reload(); setDeleting(null); setSaved("Máy chủ đã xóa thiết bị."); }}><p>Thiết bị {deleting.name} sẽ bị xóa vĩnh viễn. Máy chủ sẽ từ chối nếu đã có tham chiếu đặt phòng.</p></ApiOperationDialog>}
    {retiring && <HostRetirementDialog target={{ kind: "equipment", equipment: retiring }} onClose={() => setRetiring(null)} onSaved={() => { list.reload(); setRetiring(null); setSaved("Thiết bị đã được ngừng cung cấp trên máy chủ."); }}/>}
    {editor?.category ? <HostEditor title="Thêm nhóm thiết bị" path="/api/equipment-categories" extra={{ studio_id: Number(studioId) }} fields={[{ name: "name", label: "Tên nhóm" }]} onClose={() => setEditor(null)} onSaved={() => { categories.reload(); setEditor(null); setSaved("Nhóm thiết bị đã được lưu."); }}/>
      : editor && <HostEditor title={edit ? `Sửa ${edit.name}` : "Thêm thiết bị"} path={edit ? `/api/equipments/${edit.equipment_id}` : "/api/equipments"} method={edit ? "PATCH" : "POST"} extra={edit ? {} : { studio_id: Number(studioId) }} fields={[
        ...(!edit ? [{ name: "category_id", label: "Nhóm", options: categories.data?.map(category => ({ value: String(category.category_id), label: category.name })) ?? [] }] : []),
        { name: "name", label: "Tên thiết bị", value: edit?.name }, { name: "unit_price", label: "Giá (VND)", type: "number", min: 0, value: edit?.unit_price },
        { name: "pricing_unit", label: "Đơn vị", options: [{ value: "hour", label: "Giờ" }, { value: "session", label: "Buổi" }], value: edit?.pricing_unit },
        { name: "total_quantity", label: "Tổng số lượng", type: "number", min: edit ? 0 : 1, value: edit?.total_quantity }, ...(edit ? [{ name: "status", label: "Trạng thái", options: [...hostStatusOptions, { value: "maintenance", label: "Bảo trì" }], value: edit.status }] : [])
      ]} onClose={() => setEditor(null)} onSaved={() => { list.reload(); setEditor(null); setSaved("Thiết bị đã được lưu trên máy chủ."); }}/>}
  </>;
}

function RoomsList({ studioId, section }: { studioId: string; section: string }) {
  const [page, setPage] = useState(1), [selectedRoom, selectRoom] = useState("");
  const inventory = useResource(`/api/host/rooms?studio_id=${studioId}`, hostRooms);
  const allRooms = inventory.data ?? [];
  const list = { ...inventory, data: inventory.data ? { items: allRooms.slice((page - 1) * 50, page * 50), pagination: { total_pages: Math.max(1, Math.ceil(allRooms.length / 50)) } } : null };
  const types = useResource<Record<string, unknown>[]>(`/api/host/room-types?studio_id=${studioId}`, records);
  const [editor, setEditor] = useState<"new" | string | null>(null), [imageRoom, setImageRoom] = useState<HostRoom | null>(null), [saved, setSaved] = useState("");
  const rooms = list.data?.items.filter(room => String(room.studio_id) === studioId) ?? [];
  const roomId = rooms.some(room => String(room.room_id) === selectedRoom) ? selectedRoom : String(rooms[0]?.room_id ?? "");
  const roomTypeNames = new Map((types.data ?? []).map(type => [String(type.room_type_id), text(type.name)]));
  const groups = rooms.reduce((result, room) => { const name = room.room_type_id ? roomTypeNames.get(String(room.room_type_id)) ?? "Loại phòng chưa xác định" : "Chưa gắn loại phòng"; result.set(name, [...(result.get(name) ?? []), room]); return result; }, new Map<string, HostRoom[]>());
  return <>
    <div className="host-toolbar"><p className="host-scope-label">Phòng vật lý <span>· Trang {page} · gồm phòng đang hoạt động, bảo trì và đã ẩn</span></p>{section === "rooms" && <HostAddButton onClick={() => setEditor("new")} disabled={types.loading || !!types.error}>Thêm phòng vật lý</HostAddButton>}</div>
    {section === "rooms" && <HostRoomTypes studioId={studioId}/>}
    {saved && <p className="host-success" role="status">{saved}</p>}
    <HostResourceState resource={list}/>
    {section === "rooms" && <HostResourceState resource={types}/>}
    {list.data && !rooms.length && <HostEmptyState title="Không có phòng ở trang quản lý này" description="Chọn trang quản lý khác, cơ sở khác hoặc thêm phòng cho Studio." action={section === "rooms" ? <HostAddButton onClick={() => setEditor("new")} disabled={types.loading || !!types.error}>Thêm phòng vật lý</HostAddButton> : undefined}/>}
    {section === "rooms" ? Array.from(groups, ([name, grouped]) => <HostPanel key={name} title={name} description={`${grouped.length} phòng thuộc loại này`} className="host-room-group"><div className="host-resource-rows">{grouped.map(room => <article className="host-room-row" key={room.room_id}><HostImage src={room.thumbnail_url} alt={room.name}/><div><h3>{room.name}</h3><p>{room.area} m² <span>·</span> {room.capacity} người</p><HostStatusBadge status={room.status ?? "active"}/></div><div className="host-row-actions"><button className="btn secondary" onClick={() => setEditor(String(room.room_id))} aria-label={`Sửa ${room.name}`}><Pencil size={16}/>Chỉnh sửa</button><button className="host-inline-link" onClick={() => setImageRoom(room)}><ImagePlus size={16}/>Ảnh phòng</button></div></article>)}</div></HostPanel>)
      : !!rooms.length && <><div className="host-room-context"><label>Phòng đang xem<select aria-label="Chọn phòng" value={roomId} onChange={e => selectRoom(e.target.value)}>{rooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}</select></label><p>Trong các phòng thuộc Studio đang quản lý.</p></div>{roomId && (section === "calendar" ? <HostCalendar key={roomId} roomId={roomId}/> : <RoomRates key={roomId} roomId={roomId} roomName={rooms.find(room => String(room.room_id) === roomId)?.name ?? ""}/>)}</>}
    <HostPagination page={page} total={list.data?.pagination.total_pages ?? 1} onChange={setPage} loading={list.loading}/>
    {editor === "new" ? <WorkspaceRoomCreate studioId={studioId} onClose={() => setEditor(null)} onSaved={() => { list.reload(); setEditor(null); setSaved("Phòng đã được tạo trên máy chủ."); }}/>
      : editor && <RoomEditor roomId={editor} onClose={() => setEditor(null)} onSaved={() => { list.reload(); setEditor(null); setSaved("Thông tin phòng đã được lưu."); }}/>}
    {imageRoom && <RoomImages room={imageRoom} onClose={() => setImageRoom(null)} onSaved={() => { list.reload(); setImageRoom(null); setSaved("Ảnh phòng đã được tải lên máy chủ."); }}/>}
  </>;
}

function RoomEditor({ roomId, onClose, onSaved }: { roomId: string; onClose: () => void; onSaved: () => void }) {
  const room = useResource(`/api/host/rooms/${roomId}`, hostRoom);
  const types = useResource(room.data ? `/api/host/room-types?studio_id=${room.data.studio_id}` : null, records);
  if (!room.data || types.loading || types.error) return <Modal title="Chỉnh sửa phòng" onClose={onClose} className="host-dialog"><div className="host-panel-body"><HostResourceState resource={room}/><HostResourceState resource={types}/></div></Modal>;
  const r = room.data;
  return <HostEditor title={`Sửa ${r.name}`} path={`/api/rooms/${roomId}`} method="PATCH" fields={[{ name: "room_type_id", clearable: true, label: "Loại phòng của Studio", required: false, value: r.room_type_id ?? "", options: types.data?.filter(t => t.status === "active" || String(t.room_type_id) === String(r.room_type_id)).map(t => ({ value: text(t.room_type_id), label: text(t.name) })) ?? [] }, { name: "name", label: "Tên phòng", value: r.name }, { name: "area", label: "Diện tích (m²)", type: "number", step: "any", min: 1, value: r.area }, { name: "capacity", label: "Sức chứa (người)", type: "number", min: 1, value: r.capacity }, { name: "ceiling_height", label: "Chiều cao trần (m)", type: "number", step: "any", min: 0, required: false, clearable: true, value: r.ceiling_height ?? "" }, { name: "soundproof_level", label: "Cách âm / xử lý âm học (mặc định: Chuẩn Studio)", required: false, clearable: true, value: r.soundproof_level ?? "" }, { name: "power_specs", label: "Thông số nguồn điện", required: false, clearable: true, value: r.power_specs ?? "" }, { name: "description", label: "Mô tả phòng", required: false, clearable: true, value: r.description ?? "" }, { name: "status", label: "Trạng thái", value: r.status === "not_active" ? "" : r.status, required: false, options: [...hostStatusOptions, { value: "maintenance", label: "Bảo trì" }] }]} onClose={onClose} onSaved={onSaved}/>;
}

function RoomImages({ room, onClose, onSaved }: { room: HostRoom; onClose: () => void; onSaved: () => void }) {
  const action = useApiAction();
  const detail = useResource(`/api/host/rooms/${room.room_id}`, hostRoom);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const close = () => { if (!action.busy) { if (dirty) setDiscard(true); else onClose(); } };
  return <Modal title={`Ảnh · ${room.name}`} onClose={close} className="host-dialog" wide><form className="host-editor" onChange={() => setDirty(true)} onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    void action.run(async () => { const file = data.get("image"); if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Chọn ảnh JPG/PNG/WebP tối đa 5 MB."); await apiRequest(`/api/rooms/${room.room_id}/images`, { method: "POST", body: data }); onSaved(); });
  }}><HostResourceState resource={detail}/><div className="host-resource-rows">{detail.data?.images?.map(image => <HostImage key={image.image_url} src={image.image_url} alt={room.name}/>)}</div><div className="host-upload-intro"><HostImage src={room.thumbnail_url} alt={room.name}/><p>Ảnh JPG, PNG hoặc WebP · tối đa 5 MB.</p></div><label>Ảnh phòng<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={action.busy}/></label><label className="host-checkbox"><input name="is_primary" type="checkbox" value="true" disabled={action.busy}/>Ảnh chính</label>{action.error && <p className="host-form-error" role="alert">{action.error}</p>}{discard && <div className="host-discard" role="alert"><p>Bỏ ảnh chưa tải lên?</p><button className="btn secondary" type="button" onClick={() => setDiscard(false)}>Tiếp tục chỉnh sửa</button><button className="btn destructive" type="button" onClick={onClose}>Bỏ thay đổi</button></div>}<div className="host-editor-footer"><button className="btn secondary" type="button" disabled={action.busy} onClick={close}>Hủy</button><button className="btn" disabled={action.busy || discard}>{action.busy ? "Đang tải…" : "Tải ảnh lên"}</button></div></form></Modal>;
}

function RoomRates({ roomId, roomName }: { roomId: string; roomName: string }) {
  const list = useResource(`/api/host/rooms/${roomId}/rates`, hostRates);
  const [deleting, setDeleting] = useState<HostRate | null>(null);
  const [editor, setEditor] = useState<{ rate?: HostRate } | null>(null), [saved, setSaved] = useState(false);
  const edit = editor?.rate;
  const [retiring, setRetiring] = useState<HostRate | null>(null), [retired, setRetired] = useState(false);
  return <>
    {saved && <p className="host-success" role="status">Bảng giá đã được lưu trên máy chủ.</p>}
    {retired && <p className="host-success" role="status">Bảng giá đã được ngừng áp dụng trên máy chủ.</p>}
    <HostPanel title="Giá thuê của phòng" description={`${roomName} · Gồm giá đang và ngừng áp dụng; xóa theo điều kiện của máy chủ.`} action={<HostAddButton onClick={() => setEditor({})}>Thêm bảng giá</HostAddButton>}>
      <HostResourceState resource={list}/>
      {list.data?.length === 0 && <HostEmptyState title="Chưa có bảng giá đang áp dụng" description="Thêm giá thuê cho phòng theo các đơn vị được hỗ trợ."/>}
      {!!list.data?.length && <div className="host-table-scroll" tabIndex={0} aria-label="Bảng giá có thể cuộn ngang"><table className="host-table"><thead><tr><th>Đơn vị thuê</th><th>Thời lượng</th><th>Đơn giá</th><th>Giới hạn đơn vị</th><th>Hiệu lực</th><th><span className="host-sr-only">Thao tác</span></th></tr></thead><tbody>{list.data.map(rate => <tr key={rate.rate_id}><td><strong>{unitLabels[rate.rate_unit] ?? rate.rate_unit}</strong><small>Áp dụng cho phòng đang chọn</small></td><td>{rate.unit_minutes.toLocaleString("vi-VN")} phút</td><td className="host-price">{hostMoney(rate.unit_price)}</td><td>Từ {rate.minimum_units}{rate.maximum_units != null ? ` đến ${rate.maximum_units}` : ""}</td><td>{rate.effective_from ?? "—"}<small>{rate.effective_to ? `Đến ${rate.effective_to}` : ""}</small></td><td><div className="host-table-actions"><button className="btn secondary" aria-label={`Sửa giá ${unitLabels[rate.rate_unit] ?? rate.rate_unit}`} onClick={() => setEditor({ rate })}><Pencil size={16}/>Sửa giá</button><HostRetirementButton label="Ngừng áp dụng" name={`${unitLabels[rate.rate_unit] ?? rate.rate_unit} · ${roomName}`} onClick={() => { setSaved(false); setRetired(false); setRetiring(rate); }}/><HostStatusBadge status={rate.status ?? "unknown"}/><button className="btn destructive" onClick={() => { setSaved(false); setRetired(false); setDeleting(rate); }}>Xóa giá {unitLabels[rate.rate_unit] ?? rate.rate_unit} #{rate.rate_id}</button></div></td></tr>)}</tbody></table></div>}
    </HostPanel>
    {deleting && <ApiOperationDialog title={`Xóa bảng giá #${deleting.rate_id} · ${roomName}?`} path={`/api/rooms/${roomId}/rates/${deleting.rate_id}`} method="DELETE" onClose={() => setDeleting(null)} onSaved={() => { list.reload(); setDeleting(null); setSaved(true); }}><p>Máy chủ chỉ cho phép xóa giá đã ngừng áp dụng và chưa được dùng trong lịch sử đặt phòng.</p></ApiOperationDialog>}
    {retiring && <HostRetirementDialog target={{ kind: "rate", rate: retiring, roomId, roomName }} onClose={() => setRetiring(null)} onSaved={() => { list.reload(); setRetiring(null); setRetired(true); setSaved(false); }}/>}
    {editor && <HostEditor title={edit ? "Sửa giá thuê" : "Thêm bảng giá"} path={`/api/rooms/${roomId}/rates${edit ? `/${edit.rate_id}` : ""}`} method={edit ? "PATCH" : "POST"} fields={[
      ...(!edit ? [{ name: "rate_unit", label: "Đơn vị", options: Object.entries(unitLabels).map(([value, label]) => ({ value, label })) }, { name: "unit_minutes", label: "Số phút (bắt buộc với buổi)", type: "number", min: 1, required: false }] : []),
      { name: "effective_from", label: "Hiệu lực từ", type: "date", value: edit?.effective_from ?? sqlVietnamTime(new Date()).slice(0, 10) }, { name: "unit_price", label: "Giá (VND)", type: "number", min: 0, value: edit?.unit_price }, { name: "minimum_units", label: "Số đơn vị tối thiểu", type: "number", min: 1, value: edit?.minimum_units ?? 1 }, { name: "maximum_units", clearable: true, label: "Số đơn vị tối đa", type: "number", min: 1, required: false, value: edit?.maximum_units ?? "" }, { name: "effective_to", clearable: true, label: "Hiệu lực đến", type: "date", required: false, value: edit?.effective_to ?? "" }, ...(edit ? [{ name: "status", label: "Trạng thái", options: hostStatusOptions, value: edit.status ?? "active" }] : [])
    ]} onClose={() => setEditor(null)} onSaved={() => { list.reload(); setEditor(null); setSaved(true); }}/>}
  </>;
}
