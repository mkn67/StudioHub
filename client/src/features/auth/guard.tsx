"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/providers/app-provider";
import { resolveAccess, roleHome } from "@/domain/access";
import { LoadingState, PageHeading } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
export function AccessGuard({ children }: { children: ReactNode }) {
  const { user, ready } = useApp(),
    path = usePathname(),
    router = useRouter(),
    access = resolveAccess(ready ? user : undefined, path);
  useEffect(() => {
    if (access === "unauthenticated")
      router.replace(
        `/login?returnTo=${encodeURIComponent(path + (window.location.search || ""))}`,
      );
    if (["locked", "pending-approval", "rejected"].includes(access))
      router.replace("/account/status");
  }, [access, path, router]);
  if (
    access === "loading" ||
    access === "unauthenticated" ||
    ["locked", "pending-approval", "rejected"].includes(access)
  )
    return <LoadingState />;
  if (access === "wrong-role")
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="container narrow account-page"
      >
        <PageHeading
          title="Tài khoản không có quyền truy cập"
          description="Hãy đăng nhập bằng tài khoản có vai trò phù hợp."
        />
        <div className="actions">
          <Button asChild>
            <Link href={user ? roleHome(user) : "/login"}>
              Về khu vực của tôi
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Đến trang đăng nhập</Link>
          </Button>
        </div>
      </main>
    );
  return <>{children}</>;
}
