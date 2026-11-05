"use client";
import { useState } from "react";
import Link from "next/link";
import { useApiSession } from "@/components/api-session";
import { HostPanel, HostResourceState } from "@/features/host/host-ui";
import { useResource } from "@/services/api/use-resource";
import { apiRequest } from "@/services/api/client";
import { nullableRecord, text } from "@/services/api/management";
import { useApiAction } from "@/components/api-ui";
export function HostApplication() {
  const { user, ready } = useApiSession();
  if (!ready) return <p role="status">Đang kiểm tra tài khoản…</p>;
  if (user?.role !== "customer") return <div className="container account-page"><h1>Đăng ký đối tác StudioHub</h1><p>Đăng nhập tài khoản khách hàng để gửi hồ sơ đăng ký Host.</p><Link className="btn" href="/login?returnTo=/register/host">Đăng nhập</Link></div>;
  return <ApplicationForm key={user.user_id}/>;
}
function ApplicationForm() {
  const workspace = useResource("/api/host-applications/current", nullableRecord), action = useApiAction(); const [saved, setSaved] = useState(false);
  const application = workspace.data;
  const pending = application?.status === "pending" || application?.status === "approved";
  return <div className="container account-page"><h1>Đăng ký đối tác StudioHub</h1><p>Gửi thông tin Studio để quản trị viên xem xét.</p><HostResourceState resource={workspace}/><HostPanel title="Thông tin đăng ký"><form className="api-form" onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaved(false);
    void action.run(async () => { await apiRequest("/api/host-applications", { method: "POST", body: { studio_name: String(data.get("studioName")).trim(), address: String(data.get("address")).trim(), description: String(data.get("description")).trim() } }); setSaved(true); workspace.reload(); });
  }}><fieldset className="host-fields" disabled={action.busy || workspace.loading || !!workspace.error || pending}><legend className="sr-only">Thông tin Studio đăng ký</legend><label>Tên Studio<input name="studioName" required minLength={2} maxLength={150}/></label><label>Địa chỉ Studio<input name="address" required minLength={2} maxLength={255}/></label><label>Mô tả Studio<textarea name="description" required minLength={2} maxLength={10000}/></label></fieldset>{action.error && <p className="host-form-error" role="alert">{action.error}</p>}{saved && <p className="host-success" role="status">Máy chủ đã nhận hồ sơ đăng ký. Vui lòng chờ xét duyệt.</p>}{pending && <p role="status">Bạn đang có hồ sơ chờ xét duyệt.</p>}<button className="btn" disabled={action.busy || workspace.loading || !!workspace.error || pending}>{action.busy ? "Đang gửi…" : "Gửi hồ sơ đăng ký"}</button></form></HostPanel>{application && <HostPanel title="Hồ sơ đã gửi"><h2>{text(application.studio_name)}</h2><p>{text(application.address)}</p><p>{text(application.status)}</p><p>{text(application.reason, "")}</p></HostPanel>}</div>;
}
