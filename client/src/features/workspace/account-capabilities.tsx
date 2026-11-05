"use client";
import { useState } from "react";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import { record, nullableRecord, text, validateUpload } from "@/services/api/management";
import { HostPanel, HostResourceState } from "@/features/host/host-ui";

export function AccountCapabilities({ onProfileChanged }: { onProfileChanged: () => Promise<void> }) {
  return <><AvatarUpload onSaved={onProfileChanged}/><EmailChange onSaved={onProfileChanged}/><NotificationPreferences/><PasswordChange/></>;
}
function AvatarUpload({ onSaved }: { onSaved: () => Promise<void> }) {
  const action = useApiAction(), [saved, setSaved] = useState(false);
  return <HostPanel title="Ảnh đại diện"><form className="workspace-account-form" onSubmit={e => {
    e.preventDefault(); const form = e.currentTarget, body = new FormData(form); setSaved(false);
    void action.run(async () => { validateUpload(body.get("image")); await apiRequest("/api/account/avatar", { method: "POST", body }); await onSaved(); form.reset(); setSaved(true); });
  }}><label>Ảnh JPG/PNG/WebP tối đa 5 MiB<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required disabled={action.busy}/></label><ActionResult error={action.error} saved={saved}/><button className="btn" disabled={action.busy}>{action.busy ? "Đang tải…" : "Cập nhật ảnh"}</button></form></HostPanel>;
}
function EmailChange({ onSaved }: { onSaved: () => Promise<void> }) {
  const action = useApiAction(), [pending, setPending] = useState<{ email: string; code?: string } | null>(null), [saved, setSaved] = useState(false);
  return <HostPanel title="Đổi email" description="Xác nhận mật khẩu hiện tại và mã gửi đến địa chỉ mới.">{!pending ? <form className="workspace-account-form" onSubmit={e => {
    e.preventDefault(); const form = e.currentTarget, data = new FormData(form); setSaved(false);
    void action.run(async () => { const result = record(await apiRequest("/api/auth/email-change-requests", { method: "POST", body: { new_email: data.get("new_email"), current_password: data.get("current_password") } })); form.reset(); setPending({ email: text(result.email, String(data.get("new_email"))), ...(typeof result.development_code === "string" ? { code: result.development_code } : {}) }); });
  }}><fieldset disabled={action.busy} className="host-fields"><label>Email mới<input type="email" name="new_email" autoComplete="email" required maxLength={150}/></label><label>Mật khẩu hiện tại<input type="password" name="current_password" autoComplete="current-password" required/></label></fieldset><button className="btn" disabled={action.busy}>Yêu cầu đổi email</button></form> : <form className="workspace-account-form" onSubmit={e => {
    e.preventDefault(); const form = e.currentTarget, data = new FormData(form);
    void action.run(async () => { await apiRequest("/api/auth/email-change-confirmations", { method: "POST", body: { new_email: pending.email, code: data.get("code") } }); await onSaved(); form.reset(); setPending(null); setSaved(true); });
  }}><p>Đang xác nhận {pending.email}. Mã có hiệu lực 15 phút.</p>{pending.code && <p role="status">Mã từ môi trường phát triển: <strong>{pending.code}</strong></p>}<label>Mã xác nhận<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required disabled={action.busy}/></label><div className="host-actions"><button className="btn" disabled={action.busy}>Xác nhận email mới</button><button type="button" className="btn secondary" disabled={action.busy} onClick={() => setPending(null)}>Gửi yêu cầu mới</button></div></form>}<ActionResult error={action.error} saved={saved}/></HostPanel>;
}
const preferences = { email_booking_updates: "Email cập nhật đơn thuê", email_product_updates: "Email tin sản phẩm", sms_booking_updates: "SMS cập nhật đơn thuê", in_app_updates: "Thông báo trong ứng dụng" };
function NotificationPreferences() {
  const resource = useResource("/api/account/notification-preferences", record), action = useApiAction(), [saved, setSaved] = useState(false);
  return <HostPanel title="Tùy chọn thông báo"><HostResourceState resource={resource}/>{resource.data && <form key={JSON.stringify(resource.data)} className="workspace-account-form" onChange={() => setSaved(false)} onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    void action.run(async () => { await apiRequest("/api/account/notification-preferences", { method: "PATCH", body: Object.fromEntries(Object.keys(preferences).map(key => [key, data.has(key)])) }); resource.reload(); setSaved(true); });
  }}><fieldset disabled={action.busy}>{Object.entries(preferences).map(([key, label]) => <label className="host-checkbox" key={key}><input type="checkbox" name={key} defaultChecked={resource.data?.[key] === true}/>{label}</label>)}</fieldset><button className="btn" disabled={action.busy}>Lưu tùy chọn thông báo</button></form>}<ActionResult error={action.error} saved={saved}/></HostPanel>;
}
function PasswordChange() {
  const action = useApiAction(), [saved, setSaved] = useState(false);
  return <HostPanel title="Đổi mật khẩu"><form className="workspace-account-form" onSubmit={e => {
    e.preventDefault(); const form = e.currentTarget, data = new FormData(form); setSaved(false);
    void action.run(async () => { if (data.get("new_password") !== data.get("confirmation")) throw new Error("Mật khẩu xác nhận không khớp."); await apiRequest("/api/auth/profile", { method: "PATCH", body: { current_password: data.get("current_password"), new_password: data.get("new_password") } }); form.reset(); setSaved(true); });
  }}><fieldset className="host-fields" disabled={action.busy}><label>Mật khẩu hiện tại<input name="current_password" type="password" autoComplete="current-password" required/></label><label>Mật khẩu mới<input name="new_password" type="password" autoComplete="new-password" minLength={8} required/></label><label>Xác nhận mật khẩu mới<input name="confirmation" type="password" autoComplete="new-password" minLength={8} required/></label></fieldset><ActionResult error={action.error} saved={saved}/><button className="btn" disabled={action.busy}>Đổi mật khẩu</button></form></HostPanel>;
}
export function IdentityVerification() {
  const resource = useResource("/api/account/identity-verification", nullableRecord), action = useApiAction(), [saved, setSaved] = useState(false);
  const data = resource.data;
  return <HostPanel title="Xác minh danh tính" description="Chỉ hiển thị bốn ký tự cuối. Hồ sơ gửi đi cần được xét duyệt."><HostResourceState resource={resource}/>{!resource.loading && !resource.error && <><p>Trạng thái: {data ? text(data.status) : "Chưa gửi hồ sơ"} {data && text(data.document_hint, "")}</p>{data?.decision_reason && <p>{text(data.decision_reason)}</p>}{(!data || data.status === "rejected") && <form className="workspace-account-form" onSubmit={e => {
    e.preventDefault(); const form = e.currentTarget, body = new FormData(form); setSaved(false);
    void action.run(async () => { validateUpload(body.get("document"), true); await apiRequest("/api/account/identity-verification", { method: "POST", body }); form.reset(); setSaved(true); resource.reload(); });
  }}><fieldset className="host-fields" disabled={action.busy}><label>Họ tên pháp lý<input name="legal_name" maxLength={150} required autoComplete="off"/></label><label>Loại giấy tờ<select name="document_type"><option value="national_id">Giấy tờ định danh</option><option value="passport">Hộ chiếu</option><option value="business_registration">Đăng ký kinh doanh</option></select></label><label>4 ký tự cuối của giấy tờ<input name="document_last4" pattern="[A-Za-z0-9]{4}" maxLength={4} required autoComplete="off"/></label><label>Tài liệu PDF/JPG/PNG tối đa 5 MiB<input name="document" type="file" accept="application/pdf,image/jpeg,image/png" required/></label></fieldset><p>Tài liệu được gửi riêng đến máy chủ để xét duyệt. Không lưu số giấy tờ trong bộ nhớ trình duyệt.</p><button className="btn" disabled={action.busy}>Gửi hồ sơ xác minh</button></form>}</>}<ActionResult error={action.error} saved={saved} message="Đã gửi hồ sơ; đang chờ xét duyệt."/></HostPanel>;
}
export function ActionResult({ error, saved, message = "Máy chủ đã xác nhận thay đổi." }: { error: string; saved: boolean; message?: string }) {
  return <>{error && <p className="host-form-error" role="alert">{error}</p>}{saved && <p className="host-success" role="status">{message}</p>}</>;
}
