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
  const { user } = useApiSession();
  const workspace = useResource("/api/host-applications/current", nullableRecord), action = useApiAction(); const [saved, setSaved] = useState(false);
  const application = workspace.data;
  const pending = application?.status === "pending" || application?.status === "approved";
  return <div className="container account-page"><h1>Đăng ký đối tác StudioHub</h1><p>Gửi thông tin Studio để quản trị viên xem xét.</p><HostResourceState resource={workspace}/><HostPanel title="Thông tin đăng ký"><form className="api-form" onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaved(false);
    void action.run(async () => { await apiRequest("/api/host-applications", { method: "POST", body: { studio_name: String(data.get("studioName")).trim(), address: String(data.get("address")).trim(), description: String(data.get("description")).trim(), contact_phone: String(data.get("contactPhone")).trim(), website: String(data.get("website")).trim(), studio_type: String(data.get("studioType")), expected_room_count: Number(data.get("roomCount")), legal_name: String(data.get("legalName")).trim(), tax_id: String(data.get("taxId")).trim() } }); setSaved(true); workspace.reload(); });
  }}><fieldset className="host-fields host-application-fields" disabled={action.busy || workspace.loading || !!workspace.error || pending}><legend className="sr-only">Thông tin Studio đăng ký</legend><h2>Thông tin cơ sở</h2><label>Tên Studio<input name="studioName" required minLength={2} maxLength={150} placeholder="Tên thương hiệu Studio"/></label><label>Địa chỉ đầy đủ<input name="address" required minLength={2} maxLength={255} placeholder="Số nhà, đường, phường, quận, tỉnh/thành"/></label><label>Loại hình Studio<select name="studioType" required defaultValue=""><option value="" disabled>Chọn loại hình chính</option>{["Visual & Photo Studio", "Video & Film Production", "Livestream & Broadcast", "Audio & Event", "Đa năng / Khác"].map(type => <option key={type}>{type}</option>)}</select></label><label>Số phòng dự kiến kinh doanh<input name="roomCount" type="number" min={1} max={500} required placeholder="Ví dụ: 3"/></label><label>Giới thiệu Studio<textarea name="description" required minLength={20} maxLength={10000} placeholder="Không gian, thiết bị, nhóm khách hàng và loại hình sản xuất phù hợp…"/></label><h2>Thông tin liên hệ và pháp lý</h2><p className="host-application-account">Hồ sơ gửi dưới tài khoản <strong>{user?.full_name}</strong> · {user?.email}</p><label>Số điện thoại liên hệ<input name="contactPhone" type="tel" required minLength={8} maxLength={20} defaultValue={user?.phone ?? ""} autoComplete="tel"/></label><label>Website hoặc trang giới thiệu<input name="website" type="url" maxLength={255} placeholder="https://…" autoComplete="url"/></label><label>Tên cá nhân / pháp nhân sở hữu<input name="legalName" maxLength={180} placeholder="Có thể bổ sung sau nếu chưa thành lập doanh nghiệp"/></label><label>Mã số thuế (nếu có)<input name="taxId" maxLength={30}/></label></fieldset>{action.error && <p className="host-form-error" role="alert">{action.error}</p>}{saved && <p className="host-success" role="status">Máy chủ đã nhận hồ sơ đăng ký. Vui lòng chờ xét duyệt.</p>}{pending && <p role="status">Bạn đang có hồ sơ chờ xét duyệt.</p>}<button className="btn" disabled={action.busy || workspace.loading || !!workspace.error || pending}>{action.busy ? "Đang gửi…" : "Gửi hồ sơ đăng ký"}</button></form></HostPanel>{application && <HostPanel title="Hồ sơ đã gửi"><h2>{text(application.studio_name)}</h2><p>{text(application.address)}</p><p>{text(application.studio_type)} · {text(application.expected_room_count)} phòng dự kiến</p><p>Liên hệ: {text(application.contact_phone)} · {text(application.website, "Chưa có website")}</p><p>{text(application.status)}</p><p>{text(application.reason, "")}</p></HostPanel>}</div>;
}
