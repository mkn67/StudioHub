"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useApiSession } from "@/components/api-session";
import { useApiAction } from "@/components/api-ui";
import { authDestination } from "./navigation";
import styles from "./public-auth.module.css";

export function PublicAuth({ register = false }: { register?: boolean }) {
  const session = useApiSession(), action = useApiAction(), router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const fieldError = (name: string) => action.fieldErrors[name] ? <span id={`${name}-error`} className={styles.error}>{action.fieldErrors[name]}</span> : null;
  return <section className={styles.page} aria-labelledby="auth-title">
    <div className={styles.panel}>
      <p className={styles.eyebrow}>StudioHub / Không gian sáng tạo</p>
      <h1 id="auth-title">{register ? "Tạo tài khoản" : "Chào mừng trở lại"}</h1>
      <p className={styles.intro}>{register ? "Đăng ký để bắt đầu đặt đơn thuê." : "Đăng nhập để tiếp tục sử dụng các tính năng."}</p>
      <form aria-busy={action.busy} onSubmit={event => {
        event.preventDefault();
        if (action.busy) return;
        if (register && !accepted) { setConsentError(true); document.getElementById("terms-acceptance")?.focus(); return; }
        const data = Object.fromEntries(new FormData(event.currentTarget));
        if (new TextEncoder().encode(String(data.password)).length > 72) { setPasswordError("Mật khẩu tối đa 72 byte."); return; }
        setPasswordError("");
        void action.run(async () => {
          const user = await session.authenticate(`/api/auth/${register ? "register" : "login"}`, data);
          router.push(authDestination(new URLSearchParams(window.location.search).get("returnTo"), user.role));
        });
      }}>
        <fieldset disabled={action.busy} className={styles.fields}>
          {register && <label htmlFor="full_name">Họ và tên<input id="full_name" name="full_name" placeholder="Nhập họ và tên của bạn" autoComplete="name" required minLength={2} maxLength={100} aria-invalid={!!action.fieldErrors.full_name} aria-describedby={action.fieldErrors.full_name ? "full_name-error" : undefined}/>{fieldError("full_name")}</label>}
          <label htmlFor="email">Email<input id="email" name="email" type="email" placeholder="Nhập email của bạn" autoComplete="email" required maxLength={150} aria-invalid={!!action.fieldErrors.email} aria-describedby={action.fieldErrors.email ? "email-error" : undefined}/>{fieldError("email")}</label>
          <label htmlFor="password">Mật khẩu</label>
          <div className={styles.password}>
            <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder={register ? "Tạo mật khẩu" : "Nhập mật khẩu"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : undefined} aria-invalid={!!(passwordError || action.fieldErrors.password)} aria-describedby={passwordError || action.fieldErrors.password ? "password-error" : register ? "password-hint" : undefined} onChange={() => setPasswordError("")}/>
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
          </div>
          {passwordError ? <span id="password-error" className={styles.error}>{passwordError}</span> : fieldError("password")}
          {register && <p id="password-hint" className={styles.hint}>Ít nhất 8 ký tự.</p>}
          {register && <label htmlFor="phone">Số điện thoại <span className={styles.optional}>(không bắt buộc)</span><input id="phone" name="phone" type="tel" placeholder="Nhập số điện thoại của bạn" autoComplete="tel" maxLength={20} aria-invalid={!!action.fieldErrors.phone} aria-describedby={action.fieldErrors.phone ? "phone-error" : undefined}/>{fieldError("phone")}</label>}
          {!register && <details className={styles.recovery}><summary>Quên mật khẩu?</summary><p>StudioHub hiện chưa hỗ trợ đặt lại mật khẩu qua email. Chức năng khôi phục tài khoản chưa khả dụng trên website.</p></details>}
          {register && <>
            <div className={styles.consent}>
              <input id="terms-acceptance" type="checkbox" checked={accepted} aria-required="true" aria-labelledby="consent-copy" aria-invalid={consentError} aria-describedby={consentError ? "consent-error" : undefined} onChange={event => { setAccepted(event.target.checked); setConsentError(false); }}/>
              <div><span id="consent-copy"><label htmlFor="terms-acceptance">Tôi đồng ý với </label><Link href="/policies/privacy" target="_blank" rel="noopener noreferrer">Chính sách</Link><label htmlFor="terms-acceptance"> và </label><Link href="/policies/terms" target="_blank" rel="noopener noreferrer">Điều khoản</Link><label htmlFor="terms-acceptance"> của StudioHub.</label></span><span className={styles.srOnly}> (các tài liệu mở trong thẻ mới)</span></div>
            </div>
            {consentError && <p id="consent-error" role="alert" className={styles.error}>Vui lòng đồng ý với Chính sách và Điều khoản để tạo tài khoản.</p>}
          </>}
          {action.error && <p role="alert" className={styles.errorBox}>{action.error}</p>}
          <button className={styles.submit} type="submit">{action.busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}<ArrowRight size={18} aria-hidden="true"/></button>
        </fieldset>
        <span role="status" className={styles.srOnly}>{action.busy ? "Đang xử lý yêu cầu, vui lòng chờ." : ""}</span>
      </form>
      <p className={styles.switch}>{register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}<Link href={register ? "/login" : "/register"}>{register ? "Đăng nhập" : "Đăng ký"}</Link></p>
    </div>
  </section>;
}
