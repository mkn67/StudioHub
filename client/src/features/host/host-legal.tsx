"use client";
import { useEffect, useState } from "react";
import { useApiAction } from "@/components/api-ui";
import { useResource } from "@/services/api/use-resource";
import { apiRequest } from "@/services/api/client";
import { record, nullableRecord, records, text, downloadContract } from "@/services/api/management";
import { HostPanel, HostResourceState, HostEmptyState, HostStatusBadge } from "./host-ui";
import { ActionResult } from "@/features/workspace/account-capabilities";
import { Modal } from "@/components/ui";

export function HostLegalProfile() {
  const resource = useResource("/api/host/legal-profile", nullableRecord), action = useApiAction(), [saved, setSaved] = useState(false);
  const profile = resource.data ?? {};
  const [entity, setEntity] = useState("");
  const company = (entity || profile.entity_type) === "company";
  return <HostPanel className="host-legal-profile" title="Thông tin pháp lý & hợp đồng" description="Thông tin gửi đi sẽ chờ xét duyệt; không tự xác nhận tư cách pháp lý."><HostResourceState resource={resource}/>{!resource.loading && !resource.error && <form key={JSON.stringify(profile)} className="workspace-account-form" onChange={() => setSaved(false)} onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    void action.run(async () => { await apiRequest("/api/host/legal-profile", { method: "PATCH", body: Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value).trim() || null])) }); setSaved(true); resource.reload(); });
  }}><p>Trạng thái: {text(profile.status, "Chưa gửi")}</p>{typeof profile.decision_reason === "string" && <p>{profile.decision_reason}</p>}<fieldset disabled={action.busy} className="host-fields"><label>Bên ký kết<select name="entity_type" defaultValue={text(profile.entity_type, "individual")} onChange={e => setEntity(e.target.value)}><option value="individual">Cá nhân</option><option value="company">Doanh nghiệp / Tổ chức</option></select></label>{[
    ["legal_name", "Tên pháp lý", true, 180], ["legal_address", "Địa chỉ pháp lý", true, 255], ["contact_email", "Email liên hệ", true, 150], ["contact_phone", "Điện thoại liên hệ", true, 20], ["tax_id", "Mã số thuế", company, 50], ["representative_name", "Người đại diện", company, 150], ["representative_title", "Chức danh đại diện", false, 100],
  ].map(([name, label, required, max]) => <label key={String(name)}>{String(label)}<input name={String(name)} type={name === "contact_email" ? "email" : "text"} defaultValue={text(profile[String(name)], "")} required={Boolean(required)} maxLength={Number(max)}/></label>)}</fieldset><button className="btn" disabled={action.busy}>{action.busy ? "Đang lưu…" : "Lưu hồ sơ pháp lý"}</button></form>}<ActionResult error={action.error} saved={saved} message="Đã lưu hồ sơ pháp lý; đang chờ xét duyệt."/></HostPanel>;
}
export function HostContracts() {
  const list = useResource("/api/host/contracts", records), [selected, setSelected] = useState("");
  return <HostPanel title="Hợp đồng hợp tác" description="Hợp đồng và tài liệu thực tế được cấp cho tài khoản Host."><HostResourceState resource={list}/>{list.data?.length === 0 && <HostEmptyState title="Chưa có hợp đồng" description="Hợp đồng sẽ hiển thị sau khi được tạo trên hệ thống."/>}{list.data?.map(item => <article className="host-studio-row" key={text(item.contract_id)}><div><h3>{text(item.title)}</h3><p>{text(item.contract_code)} · {text(item.studio_name)}</p><HostStatusBadge status={text(item.status)}/><p>{text(item.effective_from)} – {text(item.effective_to)}</p></div><button className="btn secondary" onClick={() => setSelected(text(item.contract_id))}>Xem hợp đồng</button></article>)}{selected && <ContractDetail id={selected} onClose={() => setSelected("")}/>}</HostPanel>;
}
function ContractDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useResource(`/api/host/contracts/${id}`, record), action = useApiAction();
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const loadDocument = async () => {
    if (preview) return preview;
    const blob = await downloadContract(id), url = URL.createObjectURL(blob);
    setPreview(url); return url;
  };
  const available = detail.data?.document_available;
  const canRead = (available === true || available === 1 || available === "1") && detail.data?.status === "active";
  return <Modal title="Chi tiết hợp đồng" wide className="host-dialog" onClose={() => { if (!action.busy) onClose(); }}><div className="host-panel-body"><HostResourceState resource={detail}/>{detail.data && <><h3>{text(detail.data.title)}</h3><p>{text(detail.data.contract_code)} · {text(detail.data.status)}</p><p>{text(detail.data.effective_from)} – {text(detail.data.effective_to)}</p><p>Tệp: {text(detail.data.document_name)}</p><div className="host-actions"><button className="btn secondary" disabled={action.busy || !canRead} onClick={() => { void action.run(async () => { await loadDocument(); }); }}>Xem tài liệu hợp đồng</button><button className="btn" disabled={action.busy || !canRead} onClick={() => { void action.run(async () => {
    const url = await loadDocument(), anchor = document.createElement("a"); anchor.href = url; anchor.download = "contract.pdf"; anchor.click();
  }); }}>{action.busy ? "Đang tải…" : "Tải tài liệu hợp đồng"}</button></div>{preview && <iframe title="Tài liệu hợp đồng" src={preview} style={{ width: "100%", height: 480, border: 0 }}/>}<p>Tài liệu chỉ cấp cho hợp đồng đang hoạt động. Trạng thái do máy chủ cung cấp.</p></>}<ActionResult error={action.error} saved={false}/></div></Modal>;
}
