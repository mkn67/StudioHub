"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiBaseUrl } from "@/services/api/client";
import { useResource } from "@/services/api/use-resource";
import type { ApiRoom, CalendarData } from "@/services/api/contracts";
import { formatApiTime, unitLabels } from "@/services/api/contracts";
import { money } from "@/domain/models";
import { ApiMessage } from "@/components/api-ui";
import { MIN_PRICE, MAX_PRICE, PRICE_STEP, readRoomSearch, roomSearchRequest, roomSearchUrl, formatSearchPrice, type RoomSearch } from "@/services/api/room-search";
export function ApiImage({ src, alt }: {
    src?: string | null;
    alt: string;
}) {
    if (!src)
        return <div className="image-fallback" role="img" aria-label={`${alt} – chưa có ảnh`}>Chưa có ảnh phòng</div>;
    let url: URL;
    try {
        url = new URL(src, apiBaseUrl || "http://localhost");
    }
    catch {
        return null;
    }
    if (!["https:", "http:"].includes(url.protocol))
        return null;
    // Backend uploads can be served from any configured API origin.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url.href} alt={alt} loading="lazy"/>;
}
type SpaceType = { space_type_id: number; name: string };

function SearchFilters({ applied, types, apply, reset, close }: {
    applied: RoomSearch;
    types: ReturnType<typeof useResource<SpaceType[]>>;
    apply: (search: RoomSearch) => void;
    reset: () => void;
    close: () => void;
}) {
    const [draft, setDraft] = useState(applied);
    return <form id="explore-filters" className="explore-filter-form" onSubmit={e => {
        e.preventDefault(); apply({ ...draft, page: 1 }); close();
    }}>
      <h2>Bộ lọc tìm kiếm</h2>
      <p className="explore-filter-hint">Tìm không gian phù hợp với nhu cầu của bạn.</p>
      <label>Tìm Studio / phòng<input name="keyword" placeholder="Tên Studio hoặc phòng" value={draft.keyword} onChange={e => setDraft({ ...draft, keyword: e.target.value })}/></label>
      <label>Loại không gian<select name="space_type_id" value={draft.spaceType} onChange={e => setDraft({ ...draft, spaceType: e.target.value })}>
        <option value="">Tất cả loại không gian</option>
        {types.data?.map(t => <option key={t.space_type_id} value={t.space_type_id}>{t.name}</option>)}
      </select></label>
      <ApiMessage loading={types.loading} error={types.error}/>
      {types.error && <button type="button" className="text-button" onClick={types.reload}>Tải lại loại không gian</button>}
      <div className="explore-price">
        <label htmlFor="explore-max-price">Giá thuê tối đa / giờ</label>
        <output htmlFor="explore-max-price">{formatSearchPrice(draft.maxPrice)} <span>/ giờ</span></output>
        <input id="explore-max-price" name="max_price" type="range" min={MIN_PRICE} max={MAX_PRICE} step={PRICE_STEP} value={draft.maxPrice}
          aria-valuetext={`${formatSearchPrice(draft.maxPrice)} mỗi giờ`}
          style={{ "--price-fill": `${draft.maxPrice / MAX_PRICE * 100}%` } as CSSProperties}
          onChange={e => setDraft({ ...draft, maxPrice: Number(e.target.value) })}/>
        <div className="explore-price-limits"><span>0đ</span><span>2.000.000đ</span></div>
      </div>
      <button className="btn" type="submit">Tìm phòng</button>
      <button className="explore-reset" type="button" onClick={() => { setDraft(readRoomSearch(new URLSearchParams())); reset(); close(); }}>Xóa bộ lọc</button>
    </form>;
}

export function BackendSearchResults({ home = false }: { home?: boolean }) {
    const params = useSearchParams();
    const currentQuery = params.toString();
    const applied = readRoomSearch(params);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const rooms = useResource<{ items: ApiRoom[]; pagination: { total_pages: number; total_items: number } }>(roomSearchRequest(applied));
    const types = useResource<SpaceType[]>("/api/space-types");

    // Native history integrates with Next's useSearchParams without a server roundtrip.
    function apply(search: RoomSearch) {
        const query = roomSearchUrl(currentQuery, search);
        window.history.pushState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
    }
    useEffect(() => {
        const normalized = roomSearchUrl(currentQuery, readRoomSearch(new URLSearchParams(currentQuery)));
        if (normalized !== currentQuery)
            window.history.replaceState(null, "", `${window.location.pathname}?${normalized}${window.location.hash}`);
    }, [currentQuery]);
    function closeFilters() {
        setFiltersOpen(false);
        if (window.matchMedia("(max-width: 767px)").matches)
            document.getElementById("explore-filter-toggle")?.focus();
    }
    function reset() { apply(readRoomSearch(new URLSearchParams())); }

    return <div className="container account-page explore-page">
      <div className="explore-heading"><h1>{home ? "Không gian cho ý tưởng của bạn" : "Khám phá phòng Studio"}</h1><p>Danh sách phòng và giá từ hệ thống StudioHub.</p></div>
      <div className="explore-layout">
        <aside className="explore-sidebar" aria-label="Bộ lọc tìm kiếm" data-open={filtersOpen}>
          <button id="explore-filter-toggle" className="btn secondary explore-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="explore-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Đóng bộ lọc" : "Bộ lọc"}</button>
          <SearchFilters key={`${applied.keyword}:${applied.spaceType}:${applied.maxPrice}`} applied={applied} types={types} apply={apply} reset={reset} close={closeFilters}/>
        </aside>
        <section className="explore-results" aria-label="Kết quả tìm kiếm" aria-busy={rooms.loading}>
          <div className="explore-results-heading" aria-live="polite"><h2>{rooms.data ? `${rooms.data.pagination.total_items} phòng phù hợp` : rooms.loading ? "Đang tìm phòng…" : "Kết quả tìm kiếm"}</h2></div>
          <ApiMessage loading={rooms.loading} error={rooms.error}/>
          {rooms.error && <button className="btn secondary" onClick={rooms.reload}>Thử lại</button>}
          {rooms.data && <>
            {rooms.data.items.length === 0 && <div className="explore-empty"><p>Không tìm thấy phòng phù hợp với bộ lọc.</p><button className="btn secondary" onClick={reset}>Xóa bộ lọc</button></div>}
            <div className="explore-room-list">{rooms.data.items.map(r => <Link className="room-card explore-room-card" key={r.room_id} href={`/rooms/${r.room_id}`}>
              <div className="room-image"><ApiImage src={r.thumbnail_url} alt={r.name}/></div>
              <div className="room-copy"><p>{r.studio.name} · {r.studio.district}</p><h2>{r.name}</h2><p>{r.area} m² · Tối đa {r.capacity} người</p>
                <div className="explore-room-bottom"><strong>{r.display_rate ? `${formatSearchPrice(r.display_rate.unit_price)} / giờ` : "Chưa có giá giờ"}</strong><span>Xem phòng →</span></div>
              </div>
            </Link>)}</div>
            {rooms.data.pagination.total_items > 0 && <nav className="explore-pagination" aria-label="Phân trang kết quả"><button className="btn secondary" disabled={applied.page <= 1 || rooms.loading} onClick={() => apply({ ...applied, page: applied.page - 1 })}>Trang trước</button><span>Trang {applied.page} / {Math.max(1, rooms.data.pagination.total_pages)}</span><button className="btn secondary" disabled={applied.page >= rooms.data.pagination.total_pages || rooms.loading} onClick={() => apply({ ...applied, page: applied.page + 1 })}>Trang sau</button></nav>}
          </>}
        </section>
      </div>
    </div>;
}
export function BackendRoomDetail({ id }: {
    id: string;
}) {
    const room = useResource<ApiRoom>(`/api/rooms/${encodeURIComponent(id)}`);
    const calendar = useResource<CalendarData>(`/api/rooms/${encodeURIComponent(id)}/calendar`);
    const r = room.data;
    return <div className="container account-page"><Link href="/rooms">← Khám phá phòng</Link><ApiMessage loading={room.loading} error={room.error}/>{r && <>
    <h1>{r.name}</h1><p>{r.studio.name} · {r.studio.address}, {r.studio.district}, {r.studio.city}</p>
    <div className="api-gallery">{r.images?.length ? r.images.map((img, i) => <ApiImage key={i} src={img.image_url} alt={`${r.name} – ${i + 1}`}/>) : <ApiImage src={r.thumbnail_url} alt={r.name}/>}</div>
    <div className="detail-layout"><section><h2>Thông tin phòng</h2><p>{r.description}</p><p>{r.area} m² · Tối đa {r.capacity} người</p><h2>Quy định</h2><p style={{ whiteSpace: "pre-line" }}>{r.rules || "Liên hệ Studio để biết thêm quy định."}</p>
      <h2>Tiện ích có sẵn</h2>{r.amenities?.length ? <ul>{r.amenities.map(item => <li key={item.amenity_id}>{item.name}</li>)}</ul> : <p>Studio chưa cung cấp danh sách tiện ích.</p>}
      <h2>Lịch đã bận (bao gồm dọn phòng)</h2><ApiMessage loading={calendar.loading} error={calendar.error}/>{calendar.data && (calendar.data.busy_slots.length ? <ul>{calendar.data.busy_slots.map((s, i) => <li key={i}>{formatApiTime(s.busy_start)} – {formatApiTime(s.busy_end)}</li>)}</ul> : <p>Chưa có khung giờ bận được ghi nhận trong 30 ngày tới. Kiểm tra khả dụng khi đặt thuê.</p>)}</section>
      <aside className="surface api-panel"><h2>Bảng giá</h2>{r.rates?.map(rate => <p key={rate.rate_id}>{money(rate.unit_price)} / {unitLabels[rate.rate_unit] ?? rate.rate_unit}</p>)}<Link className="btn" href={`/rooms/${id}/book`}>Kiểm tra giá & đặt thuê</Link><p>Giá cuối cùng và lịch trống được máy chủ kiểm tra khi đặt.</p></aside></div></>}
  </div>;
}
