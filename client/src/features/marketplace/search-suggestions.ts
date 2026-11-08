export type SearchSuggestion = { id: string; label: string; detail: string; href: string; kind: "room" | "purpose"; score: number };
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases: Record<string, string> = {
  "Cyclorama Studio": "chup anh san pham phong trang vo cuc catalog my pham",
  "Lookbook & Fashion": "lookbook fashion chup anh thoi trang chan dung",
  "Concept & Set Design": "concept vintage han quoc boi canh lifestyle",
  "Podcast & Livestream Hub": "podcast talkshow phong tro chuyen phong van",
  "Music Recording Studio": "thu am nhac vocal long tieng ca hat",
  "Workshop & Event Studio": "workshop su kien lop hoc hoi thao",
  "Green Screen & VFX": "phong xanh green screen ky xao quay phim",
  "Livestream & E-commerce": "livestream ban hang thuong mai san pham",
  "Acoustic Soundstage": "phim truong cach am quay tvc ghi hinh",
};
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
    previous = current;
  }
  return previous[b.length];
}
export function suggestionScore(query: string, title: string, extra = ""): number {
  const q = normalizeSearch(query), name = normalizeSearch(title), haystack = `${name} ${normalizeSearch(extra)}`;
  if (!q) return 10;
  if (name === q) return 100;
  if (name.startsWith(q)) return 85;
  if (name.includes(q)) return 70;
  const tokens = q.split(" ").filter(t => !["phong", "studio", "tim", "toi", "muon", "can", "cho", "chup"].includes(t));
  if (!tokens.length) return 15;
  const words = haystack.split(" ");
  const matches = tokens.filter(t => words.some(w => w === t || w.startsWith(t) || (t.length >= 4 && Math.abs(t.length - w.length) <= 1 && distance(t, w) <= 1))).length;
  return matches ? Math.round(matches / tokens.length * 55) : 0;
}
export function buildSearchSuggestions(query: string, rooms: { room_id: number; name: string; studio: { name: string; district?: string | null }; primary_space_type?: { name: string } | null }[], types: { space_type_id: number; name: string }[]): SearchSuggestion[] {
  const purpose = types.map(t => ({ id: `type-${t.space_type_id}`, label: t.name, detail: "Tìm theo nhu cầu", href: `/rooms?space_type_id=${t.space_type_id}`, kind: "purpose" as const, score: suggestionScore(query, t.name, aliases[t.name]) })).filter(s => s.score > 0).sort((a,b) => b.score-a.score).slice(0,3);
  const matches = rooms.map(r => ({ id: `room-${r.room_id}`, label: r.name, detail: [r.studio.name, r.studio.district].filter(Boolean).join(" · "), href: `/rooms/${r.room_id}`, kind: "room" as const, score: suggestionScore(query, r.name, `${r.primary_space_type?.name ?? ""} ${r.studio.name} ${r.studio.district ?? ""}`) })).filter(s => s.score > 0).sort((a,b) => b.score-a.score).slice(0,4);
  return [...purpose, ...matches].sort((a,b) => b.score-a.score).slice(0,6);
}
