"use client";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { useResource } from "@/services/api/use-resource";
import type { ApiRoom } from "@/services/api/contracts";
import { buildSearchSuggestions } from "./search-suggestions";

export function RoomSearchAutocomplete({ value, onChange, types, placeholder = "Thử ‘lookbook’, ‘podcast’, ‘Quận 3’…" }: { value: string; onChange: (value: string) => void; types: { space_type_id: number; name: string }[]; placeholder?: string }) {
  const [query, setQuery] = useState(value), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const id = useId(), router = useRouter();
  useEffect(() => { const timer = setTimeout(() => setQuery(value.trim()), 250); return () => clearTimeout(timer); }, [value]);
  const rooms = useResource<{ items: ApiRoom[] }>(open && query.length >= 2 ? `/api/rooms?limit=5&keyword=${encodeURIComponent(query)}` : null);
  const suggestions = buildSearchSuggestions(value, query === value.trim() ? rooms.data?.items ?? [] : [], types);
  const expanded = open && (suggestions.length > 0 || rooms.loading || value.trim().length > 1);
  const select = (href: string) => { setOpen(false); setActive(-1); router.push(href); };
  return <div className="room-search-autocomplete">
    <input role="combobox" aria-label="Tên Studio, loại phòng hoặc nhu cầu" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-list`} aria-activedescendant={active >= 0 && suggestions[active] ? `${id}-${active}` : undefined} autoComplete="off" placeholder={placeholder} value={value}
      onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }}
      onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); setOpen(false); setActive(-1); }
        if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); setOpen(true); setActive(n => (n+1)%suggestions.length); }
        if (e.key === "ArrowUp" && suggestions.length) { e.preventDefault(); setActive(n => (n-1+suggestions.length)%suggestions.length); }
        if (e.key === "Enter" && expanded && active >= 0 && suggestions[active]) { e.preventDefault(); select(suggestions[active].href); }
      }}/>
    {expanded && <div className="room-search-suggestions" id={`${id}-list`} role="listbox" aria-label="Gợi ý tìm phòng"><p>Gợi ý phù hợp với bạn</p>{suggestions.map((s,i) => <a key={s.id} href={s.href} id={`${id}-${i}`} role="option" aria-selected={active===i} tabIndex={-1} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={e => { e.preventDefault(); select(s.href); }}><Search size={17}/><span><strong>{s.label}</strong><small>{s.detail}</small></span><ArrowUpRight size={16}/></a>)}{rooms.loading && <small className="room-search-status">Đang tìm phòng…</small>}{!rooms.loading && !suggestions.length && <small className="room-search-status">Chưa có gợi ý. Nhấn Enter để tìm với từ khóa này.</small>}</div>}
  </div>;
}
