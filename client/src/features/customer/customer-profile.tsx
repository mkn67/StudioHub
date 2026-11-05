"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, UserRound, MapPin, ShieldCheck, CalendarDays, LockKeyhole, Check } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import type { ApiUser } from "@/services/api/contracts";
import { customerInitials, profilePayload } from "./profile-data";
import "./customer.css";
import { AccountCapabilities, IdentityVerification } from "@/features/workspace/account-capabilities";
import { HostImage } from "@/features/host/host-ui";

export function CustomerProfile() {
  const session = useApiSession();
  return <section className="customer-profile">
    {!session.ready ? <div className="customer-profile-state" role="status">Đang tải hồ sơ của bạn…</div> : !session.user ? <div className="customer-profile-state"><h1>Hồ sơ của tôi</h1><p>Đăng nhập để quản lý thông tin tài khoản của bạn.</p><Link className="btn" href="/login?returnTo=/profile">Đăng nhập</Link></div> : session.user.role !== "customer" ? <div className="customer-profile-state"><h1>Tài khoản quản lý</h1><Link className="btn" href={`/${session.user.role}/settings`}>Mở cài đặt tài khoản</Link></div> : <ProfileCenter key={session.user.user_id} user={session.user} refresh={session.refresh}/>}
  </section>;
}
function ProfileCenter({ user, refresh }: { user: ApiUser; refresh: () => Promise<void> }) {
  const action = useApiAction();
  const [baseline, setBaseline] = useState({ full_name: user.full_name, phone: user.phone ?? "", date_of_birth: user.date_of_birth ?? "", address: user.address ?? "" });
  const [birthday, setBirthday] = useState(user.date_of_birth ?? ""), [address, setAddress] = useState(user.address ?? "");
  const [name, setName] = useState(user.full_name), [phone, setPhone] = useState(user.phone ?? ""), [saved, setSaved] = useState(false), [validation, setValidation] = useState("");
  const dirty = name !== baseline.full_name || phone !== baseline.phone || birthday !== baseline.date_of_birth || address !== baseline.address;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (anchor && !anchor.getAttribute("href")?.startsWith("#") && !window.confirm("Bạn có thay đổi chưa lưu. Rời khỏi trang?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", prevent); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", prevent); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  return <div className="customer-profile-container">
    <header className="customer-profile-heading"><span className="customer-eyebrow">TÀI KHOẢN STUDIOHUB</span><h1>Hồ sơ của tôi<span aria-hidden="true">.</span></h1><p>Quản lý thông tin cá nhân và tài khoản StudioHub.</p></header>
    <div className="customer-profile-layout">
      <aside className="customer-profile-aside">
        <div className="customer-profile-summary">{user.avatar_url ? <HostImage src={user.avatar_url} alt={user.full_name}/> : <span className="customer-avatar" aria-hidden="true">{customerInitials(user.full_name)}</span>}<span className="customer-role">Khách hàng</span><h2>{user.full_name}</h2><p>{user.email}</p>{user.status === "active" && <span className="customer-status"><span/>Tài khoản đang hoạt động</span>}</div>
        <nav className="customer-profile-links" aria-label="Tài khoản của tôi"><a href="#personal-information" aria-current="location"><UserRound size={18}/>Thông tin cá nhân</a><a href="#contact-address"><MapPin size={18}/>Địa chỉ liên hệ</a><a href="#identity-information"><ShieldCheck size={18}/>Xác minh danh tính</a><Link href="/my-bookings"><CalendarDays size={18}/>Đơn thuê của tôi<ArrowUpRight size={16}/></Link></nav>
        <p className="customer-aside-note"><LockKeyhole size={18}/>Thông tin tài khoản chỉ hiển thị trong phiên đăng nhập của bạn.</p>
      </aside>
      <form className="customer-profile-form" onSubmit={event => {
        event.preventDefault(); if (!dirty || action.busy) return;
        setSaved(false); setValidation("");
        let body; try { body = profilePayload(name, phone, { date_of_birth: birthday, address }); } catch (error) { setValidation((error as Error).message); return; }
        void action.run(async () => {
          const updated = await apiRequest<ApiUser>("/api/auth/profile", { method: "PATCH", body });
          setBaseline({ full_name: updated.full_name, phone: updated.phone ?? "", date_of_birth: updated.date_of_birth ?? "", address: updated.address ?? "" }); setName(updated.full_name); setPhone(updated.phone ?? ""); setBirthday(updated.date_of_birth ?? ""); setAddress(updated.address ?? "");
          setSaved(true); await refresh();
        });
      }}>
        <section className="customer-profile-section" id="personal-information"><div className="customer-section-title"><UserRound size={22}/><div><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin để thuận tiện khi đặt và thuê Studio.</p></div></div>
          <fieldset disabled={action.busy} className="customer-fields"><legend className="sr-only">Thông tin cá nhân</legend>
            <label className="customer-field-wide" htmlFor="customer-name">Họ và tên <span aria-hidden="true">*</span><input aria-label="Họ và tên" id="customer-name" name="full_name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => { setName(event.target.value); setSaved(false); }} aria-invalid={!!action.fieldErrors.full_name} aria-describedby={action.fieldErrors.full_name ? "customer-name-error" : undefined}/>{action.fieldErrors.full_name && <small id="customer-name-error" className="customer-error">{action.fieldErrors.full_name}</small>}</label>
            <label htmlFor="customer-phone">Số điện thoại<input aria-label="Số điện thoại" id="customer-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setSaved(false); }} aria-invalid={!!action.fieldErrors.phone} aria-describedby="customer-phone-help"/><small id="customer-phone-help">{action.fieldErrors.phone || "Không bắt buộc · tối đa 20 ký tự."}</small></label>
            <label htmlFor="customer-birthday">Ngày sinh<input id="customer-birthday" name="date_of_birth" type="date" value={birthday} onChange={e => { setBirthday(e.target.value); setSaved(false); }}/></label>
            <label className="customer-field-wide" htmlFor="customer-email">Email<input aria-label="Email" id="customer-email" type="email" autoComplete="email" value={user.email} readOnly/><small>Dùng mục đổi email bên dưới để xác nhận địa chỉ mới.</small></label>
          </fieldset>
        </section>
        <section className="customer-profile-section" id="contact-address"><div className="customer-section-title"><MapPin size={22}/><div><h2>Địa chỉ liên hệ</h2><p>Thông tin liên hệ cho những lần thuê tiếp theo.</p></div></div><label>Địa chỉ<input name="address" autoComplete="street-address" maxLength={255} value={address} disabled={action.busy} onChange={e => { setAddress(e.target.value); setSaved(false); }}/></label></section>
        <div className="customer-save-area">
          {(validation || action.error) && <p className="customer-error" role="alert">{validation || (action.error.startsWith("Không kết nối được máy chủ") ? "Không kết nối được máy chủ. Thay đổi chưa được lưu. Vui lòng thử lại." : action.error)}</p>}
          {saved && <p className="customer-success" role="status"><Check size={18}/>Đã lưu thông tin cá nhân trên máy chủ.</p>}
          <div className="customer-save-row"><p role="status">{action.busy ? "Đang gửi thay đổi…" : dirty ? "Bạn có thay đổi chưa lưu." : "Thông tin cá nhân của bạn."}</p><div><button type="button" className="btn secondary" disabled={!dirty || action.busy} onClick={() => { if (window.confirm("Hủy các thay đổi chưa lưu?")) { setName(baseline.full_name); setPhone(baseline.phone); setBirthday(baseline.date_of_birth); setAddress(baseline.address); setValidation(""); setSaved(false); } }}>Hủy thay đổi</button><button className="btn" disabled={!dirty || action.busy}>{action.busy ? "Đang lưu…" : "Lưu thay đổi"}</button></div></div>
        </div>
      </form>
    </div>
    <AccountCapabilities onProfileChanged={refresh}/>
    <section id="identity-information"><IdentityVerification/></section>
  </div>;
}
