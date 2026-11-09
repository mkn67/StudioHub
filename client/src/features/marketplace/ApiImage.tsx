"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { apiBaseUrl } from "@/services/api/client";

export function ApiImage({ src, alt }: { src?: string | null; alt: string }) {
  return <ApiImageContent key={src} src={src} alt={alt}/>;
}

function ApiImageContent({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  let href: string | undefined;
  if (src?.startsWith("/images/")) href = src;
  else if (src) {
    try { const url = new URL(src, apiBaseUrl || "http://localhost"); if (["https:", "http:"].includes(url.protocol)) href = url.href; } catch { /* Missing media uses the explicit placeholder. */ }
  }
  if (!href || failed) return <div className="image-fallback" role="img" aria-label={`${alt} — chưa có ảnh`}><ImageIcon size={28}/><span>Chưa có ảnh không gian</span></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)}/>;
}
