"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ArrowUpRight } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import type { ApiUser } from "@/services/api/contracts";
import { HostPageHeader, HostPanel, HostResourceState, HostStatusBadge } from "@/features/host/host-ui";
import { preferenceKey } from "./preferences";
import { useWorkspacePreferences } from "./use-preferences";

export function WorkspaceSwitch({ label, description, checked, onChange, disabled = false }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <div className="workspace-switch-row"><div><strong id={`${id}-label`}>{label}</strong><p id={`${id}-description`}>{description}</p></div><button type="button" role="switch" aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`} aria-checked={checked} disabled={disabled} className="workspace-switch" onClick={() => onChange(!checked)}><span/></button></div>;
}

function AccountInformation({ user, onSaved, onDraft, extraFields }: { user: ApiUser; onSaved: () => void; onDraft: () => void; extraFields?: ReactNode }) {
  const action = useApiAction();
  const [draft, setDraft] = useState({ full_name: user.full_name, phone: user.phone ?? "" });
  const [saved, setSaved] = useState(false);
  const dirty = draft.full_name !== user.full_name || draft.phone !== (user.phone ?? "");
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  return <form className="workspace-account-form" onChange={onDraft} onSubmit={event => {
    event.preventDefault(); setSaved(false);
    void action.run(async () => { await apiRequest<ApiUser>("/api/auth/profile", { method: "PATCH", body: { full_name: draft.full_name.trim(), phone: draft.phone.trim() } }); setSaved(true); onSaved(); });
  }}>
    <fieldset disabled={action.busy} className="host-fields"><legend className="host-sr-only">Thông tin tài khoản</legend>
      <label>Họ tên<input aria-label="Họ tên" name="full_name" required minLength={2} maxLength={100} value={draft.full_name} onChange={event => { setDraft({ ...draft, full_name: event.target.value }); setSaved(false); }} aria-invalid={!!action.fieldErrors.full_name} aria-describedby={action.fieldErrors.full_name ? "workspace-name-error" : undefined}/>{action.fieldErrors.full_name && <span id="workspace-name-error" className="field-error">{action.fieldErrors.full_name}</span>}</label>
      {extraFields}
      <label>Số điện thoại<input aria-label="Số điện thoại" name="phone" type="tel" maxLength={20} value={draft.phone} onChange={event => { setDraft({ ...draft, phone: event.target.value }); setSaved(false); }} aria-invalid={!!action.fieldErrors.phone} aria-describedby={action.fieldErrors.phone ? "workspace-phone-error" : undefined}/>{action.fieldErrors.phone && <span id="workspace-phone-error" className="field-error">{action.fieldErrors.phone}</span>}</label>
      <label className="workspace-email-field">Email<input aria-label="Email" value={user.email} readOnly type="email"/><small>Email hiện chỉ dùng để xem tại đây.</small></label>
    </fieldset>
    {action.error && <p className="host-form-error" role="alert">{action.error}</p>}
    {saved && <p className="host-success" role="status">Thông tin tài khoản đã được lưu trên máy chủ.</p>}
    <div className="workspace-form-footer"><span>{dirty ? "Có thay đổi chưa lưu" : "Thông tin tài khoản hiện tại"}</span><div className="host-actions"><button type="button" className="btn secondary" disabled={!dirty || action.busy} onClick={() => { if (window.confirm("Bỏ các thay đổi thông tin tài khoản chưa lưu?")) { setDraft({ full_name: user.full_name, phone: user.phone ?? "" }); setSaved(false); } }}>Hủy thay đổi</button><button className="btn" type="submit" disabled={action.busy || !dirty}>{action.busy ? "Đang lưu…" : "Lưu thông tin"}</button></div></div>
  </form>;
}

export function WorkspaceSettings({ role, extraAccountFields, afterAccount }: { role: "host" | "admin"; extraAccountFields?: ReactNode; afterAccount?: ReactNode }) {
  const session = useApiSession(), router = useRouter();
  const profile = useResource<ApiUser>("/api/auth/profile");
  const { preferences, update } = useWorkspacePreferences(preferenceKey(role, session.user!.user_id));
  const [storageWarning, setStorageWarning] = useState(false), [logoutBusy, setLogoutBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const user = profile.data;
  return <>
    <HostPageHeader title="Cài đặt" description="Quản lý thông tin tài khoản và tùy chọn làm việc."/>
    {confirmed && <p className="host-success" role="status">Thông tin tài khoản đã được lưu trên máy chủ.</p>}
    <HostResourceState resource={profile}/>
    {user && <>
      <section className="workspace-account-summary"><span className="workspace-summary-avatar" aria-label={`Tên viết tắt của ${user.full_name}`}>{user.full_name.trim().split(/\s+/).slice(-2).map(part => part.replace(/[^\p{L}]/gu, "")[0] ?? "").join("")}</span><div><h2>{user.full_name}</h2><p>{user.email}</p></div><div className="host-actions"><span className="host-badge">{user.role === "host" ? "Chủ Studio" : user.role === "admin" ? "Quản trị viên" : "Khách hàng"}</span>{user.status && <HostStatusBadge status={user.status}/>}</div></section>
      <div className={`workspace-settings-grid${afterAccount ? " host-extended-settings" : ""}`}><HostPanel title="Thông tin tài khoản" description="Cập nhật tên hiển thị và thông tin liên hệ."><AccountInformation key={user.user_id} user={user} extraFields={extraAccountFields} onDraft={() => setConfirmed(false)} onSaved={() => { setConfirmed(true); void session.refresh(); profile.reload(); }}/></HostPanel>
      {afterAccount}
      <HostPanel title="Giao diện làm việc" description="Tùy chọn chỉ lưu trên trình duyệt này.">
        <WorkspaceSwitch label="Chế độ hiển thị gọn" description="Giảm khoảng cách trong danh sách và bảng quản lý." checked={preferences.compact} onChange={checked => setStorageWarning(!update({ compact: checked }))}/>
        <WorkspaceSwitch label="Giảm hiệu ứng chuyển động" description="Hạn chế hiệu ứng chuyển động trong giao diện quản lý." checked={preferences.reduceMotion} onChange={checked => setStorageWarning(!update({ reduceMotion: checked }))}/>
        <p className="workspace-preference-note">Tùy chọn giảm chuyển động của hệ điều hành luôn được tôn trọng. Các tùy chọn tại đây không đồng bộ giữa thiết bị.</p>
        {storageWarning && <p className="host-form-error" role="status">Không lưu được trên trình duyệt. Tùy chọn chỉ áp dụng trong phiên hiện tại.</p>}
      </HostPanel></div>
    </>}
    <HostPanel title="Thao tác tài khoản"><div className="workspace-account-actions"><div><strong>Tiếp tục công việc của bạn</strong><p>Mở website công khai hoặc kết thúc phiên làm việc.</p></div><div className="host-actions"><Link className="btn secondary" href="/"><ArrowUpRight size={17}/>Xem website</Link><button className="btn secondary" disabled={logoutBusy} onClick={async () => { setLogoutBusy(true); await session.logout(); router.push("/"); }}><LogOut size={17}/>{logoutBusy ? "Đang đăng xuất…" : "Đăng xuất"}</button></div></div></HostPanel>
  </>;
}
