"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiSession } from "./api-session";
import { ApiMessage, useApiAction } from "./api-ui";
import { CustomerProfile } from "@/features/customer/customer-profile";
import { HostApplication } from "@/features/workspace/host-application";
export function ApiAuth({ register = false, host = false }: {
    register?: boolean;
    host?: boolean;
}) {
    const session = useApiSession(), action = useApiAction(), router = useRouter();
    if (host)
        return <HostApplication/>;
    return <div className="auth-page"><div className="auth-panel"><h1>{register ? "Tạo tài khoản" : "Chào mừng trở lại"}</h1>
    <form onSubmit={e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); void action.run(async () => { const user = await session.authenticate(`/api/auth/${register ? "register" : "login"}`, data); const next = new URLSearchParams(window.location.search).get("returnTo"); router.push(next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : user.role === "customer" ? "/my-bookings" : `/${user.role}`); }); }}>
      {register && <label>Họ tên<input name="full_name" autoComplete="name" required minLength={2} maxLength={100}/>{action.fieldErrors.full_name && <span className="field-error">{action.fieldErrors.full_name}</span>}</label>}
      <label>Email<input name="email" type="email" autoComplete="email" required/>{action.fieldErrors.email && <span className="field-error">{action.fieldErrors.email}</span>}</label>
      <label>Mật khẩu<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : undefined}/>{action.fieldErrors.password && <span className="field-error">{action.fieldErrors.password}</span>}</label>
      {register && <label>Số điện thoại<input name="phone" autoComplete="tel" type="tel" maxLength={20}/>{action.fieldErrors.phone && <span className="field-error">{action.fieldErrors.phone}</span>}</label>}
      <ApiMessage error={action.error}/><button className="btn full" disabled={action.busy}>{action.busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}</button>
    </form><p className="auth-switch">{register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}<Link className="auth-action" href={register ? "/login" : "/register"}>{register ? "Đăng nhập" : "Đăng ký"}</Link></p>
  </div></div>;
}
export function ApiProfile() {
    return <CustomerProfile/>;
}
