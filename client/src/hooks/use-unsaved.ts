"use client";
import { useEffect } from "react";
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.href !== window.location.href &&
        !window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?")
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
