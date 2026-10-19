"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function useUrlState() {
  const router = useRouter(),
    path = usePathname(),
    params = useSearchParams();
  function update(
    values: Record<string, string | number | null | undefined>,
    resetPage = false,
  ) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === undefined || value === "")
        next.delete(key);
      else next.set(key, String(value));
    }
    if (resetPage) next.delete("page");
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  return { params, update, path, query: params.toString() };
}
