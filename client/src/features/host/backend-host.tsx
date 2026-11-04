"use client";
import Link from "next/link";
import { useApiSession } from "@/components/api-session";
import { ApiMessage } from "@/components/api-ui";
import { HostWorkspace } from "./host-workspace";
import { AdminWorkspace } from "@/features/admin/admin-workspace";

export function BackendOperations({ role, segments }: { role: "host" | "admin"; segments: string[] }) {
  const session = useApiSession();
  if (!session.ready) return <ApiMessage loading/>;
  if (session.user?.role !== role)
    return <div className="container account-page"><h1>Khu vực quản lý</h1><p>Vui lòng đăng nhập tài khoản {role === "host" ? "chủ Studio" : "quản trị"}.</p><ApiMessage error={session.error}/><Link className="btn" href="/login">Đăng nhập</Link></div>;
  return role === "host" ? <HostWorkspace segments={segments}/> : <AdminWorkspace segments={segments}/>;
}
