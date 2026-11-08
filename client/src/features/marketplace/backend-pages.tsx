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
import { Modal } from "@/components/ui";
import { RoomListingCard, RoomListingSkeleton } from "./RoomListingCard";
import { discoveryPurposes, typesForPurpose } from "./discovery-purposes";
import { MIN_PRICE, MAX_PRICE, PRICE_STEP, SEARCH_RATE_UNITS, readRoomSearch, roomSearchRequest, roomSearchUrl, formatSearchPrice, type RoomSearch } from "@/services/api/room-search";
export function ApiImage({ src, alt }: {
    src?: string | null;
    alt: string;
}) {
    const [failed, setFailed] = useState(false);
    if (!src || failed)
        return <div className="image-fallback" role="img" aria-label={`${alt} – ảnh không khả dụng`}>Ảnh StudioHub</div>;
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
    return <img src={url.href} alt={alt} loading="lazy" onError={() => setFailed(true)}/>;
}
type SpaceType = { space_type_id: number; name: string; category?: string | null; description?: string | null };

const roomSpecLabels: Record<string, { key: "ceiling_height" | "soundproof_level" | "power_specs"; label: string }[]> = {
    "Cyclorama Studio": [{ key: "ceiling_height", label: "Chiều cao trần" }, { key: "power_specs", label: "Nguồn điện" }],
    "Lookbook & Fashion": [{ key: "ceiling_height", label: "Chiều cao trần" }],
    "Podcast & Livestream Hub": [{ key: "soundproof_level", label: "Mức xử lý âm học" }, { key: "power_specs", label: "Nguồn điện" }],
    "Concept & Set Design": [{ key: "ceiling_height", label: "Chiều cao trần" }],
    "Green Screen & VFX": [{ key: "ceiling_height", label: "Chiều cao trần" }, { key: "power_specs", label: "Nguồn điện" }],
    "Acoustic Soundstage": [{ key: "soundproof_level", label: "Mức cách âm được Studio khai báo" }, { key: "ceiling_height", label: "Chiều cao trần" }, { key: "power_specs", label: "Nguồn điện" }],
    "Workshop & Event Studio": [{ key: "power_specs", label: "Nguồn điện" }],
    "Livestream & E-commerce": [{ key: "power_specs", label: "Nguồn điện" }],
    "Music Recording Studio": [{ key: "soundproof_level", label: "Mức cách âm được Studio khai báo" }, { key: "power_specs", label: "Nguồn điện" }],
};

function RoomSpecGroup({ room }: { room: ApiRoom }) {
    const typeName = room.space_types?.[0]?.name;
    const fields = typeName ? roomSpecLabels[typeName] ?? [] : [];
    const specs = fields.flatMap(field => {
        const value = room[field.key];
        if (value === null || value === undefined || value === "") return [];
        if (field.key === "soundproof_level" && value === "Chuẩn Studio") return [];
        return [{ label: field.label, value: field.key === "ceiling_height" ? `${value} m` : value }];
    });
    return <section className="room-spec-group" aria-label="Thông số kỹ thuật theo loại phòng">
        <h3>Thông số phù hợp với loại phòng</h3>
        {specs.length ? <dl>{specs.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl> : <p>Studio chưa cung cấp thông số kỹ thuật chuyên biệt cho phòng này.</p>}
    </section>;
}

function SearchFilters({ applied, rateUnit, types, amenities, apply, reset, close }: {
    applied: RoomSearch;
    rateUnit: string;
    types: ReturnType<typeof useResource<SpaceType[]>>;
    amenities: ReturnType<typeof useResource<{ amenity_id: number; name: string }[]>>;
    apply: (search: RoomSearch, rateUnit: string) => void;
    reset: () => void;
    close: () => void;
}) {
    const [draft, setDraft] = useState(applied);
    const [draftRateUnit, setDraftRateUnit] = useState(rateUnit);
    return <form id="explore-filters" className="explore-filter-form" onSubmit={e => {
        e.preventDefault(); apply({ ...draft, page: 1 }, draftRateUnit); close();
    }}>
      <h2>Bộ lọc tìm kiếm</h2>
      <p className="explore-filter-hint">Tìm không gian phù hợp với nhu cầu của bạn.</p>
      <label>Tìm Studio / phòng<input name="keyword" placeholder="Tên Studio hoặc phòng" value={draft.keyword} onChange={e => setDraft({ ...draft, keyword: e.target.value })}/></label>
      <label>Loại không gian<select name="space_type_id" value={draft.spaceType} onChange={e => setDraft({ ...draft, spaceType: e.target.value })}>
        <option value="">Tất cả loại không gian</option>
        {Array.from((types.data ?? []).reduce((groups, type) => groups.set(type.category || "Loại không gian khác", [...(groups.get(type.category || "Loại không gian khác") ?? []), type]), new Map<string, SpaceType[]>())).map(([category, items]) => <optgroup key={category} label={category}>{items.map(t => <option key={t.space_type_id} value={t.space_type_id}>{t.name}</option>)}</optgroup>)}
      </select></label>
      <ApiMessage loading={types.loading} error={types.error}/>
      {types.error && <button type="button" className="text-button" onClick={types.reload}>Tải lại loại không gian</button>}
      <div className="explore-price">
        <label htmlFor="explore-rate-unit">Đơn vị so sánh giá</label>
        <select id="explore-rate-unit" value={draftRateUnit} onChange={e => setDraftRateUnit(e.target.value)}>
          {SEARCH_RATE_UNITS.map(unit => <option key={unit} value={unit}>{unitLabels[unit]}</option>)}
        </select>
        <label htmlFor="explore-max-price">Giá tối đa / {unitLabels[draftRateUnit] ?? "giờ"}</label>
        <output htmlFor="explore-max-price">{draft.maxPrice === MAX_PRICE ? "Không giới hạn" : <>{formatSearchPrice(draft.maxPrice)} <span>/ {unitLabels[draftRateUnit] ?? "giờ"}</span></>}</output>
        <input id="explore-max-price" name="max_price" type="range" min={MIN_PRICE} max={MAX_PRICE} step={PRICE_STEP} value={draft.maxPrice}
          aria-valuetext={draft.maxPrice === MAX_PRICE ? "Không giới hạn" : `${formatSearchPrice(draft.maxPrice)} mỗi ${unitLabels[draftRateUnit] ?? "giờ"}`}
          style={{ "--price-fill": `${draft.maxPrice / MAX_PRICE * 100}%` } as CSSProperties}
          onChange={e => setDraft({ ...draft, maxPrice: Number(e.target.value) })}/>
        <div className="explore-price-limits"><span>0đ</span><span>2.000.000đ</span></div>
      </div>
      <label>Quận / khu vực<input name="district" placeholder="Ví dụ: Quận 3" value={draft.district} onChange={e => setDraft({ ...draft, district: e.target.value })}/></label>
      <label>Diện tích tối thiểu (m²)<input type="number" min={0} max={10000} value={draft.minArea || ""} onChange={e => setDraft({ ...draft, minArea: Number(e.target.value) || 0 })}/></label>
      <label>Sức chứa tối thiểu<input type="number" min={0} max={1000} value={draft.minCapacity || ""} onChange={e => setDraft({ ...draft, minCapacity: Number(e.target.value) || 0 })}/></label>
      <label>Tiện ích<select value={draft.amenityId} onChange={e => setDraft({ ...draft, amenityId: e.target.value })}><option value="">Mọi tiện ích</option>{(amenities.data ?? []).map(item => <option key={item.amenity_id} value={item.amenity_id}>{item.name}</option>)}</select></label>
      <ApiMessage loading={amenities.loading} error={amenities.error}/>
      <div className="explore-availability-fields"><strong>Lịch còn trống</strong><label>Ngày<input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })}/></label><div><label>Bắt đầu<input type="time" value={draft.startTime} onChange={e => setDraft({ ...draft, startTime: e.target.value })}/></label><label>Thời lượng<select value={draft.durationHours} onChange={e => setDraft({ ...draft, durationHours: Number(e.target.value) })}>{[1, 2, 3, 4, 6, 8, 12, 24].map(hours => <option key={hours} value={hours}>{hours} giờ</option>)}</select></label></div><small>Máy chủ loại phòng đã có đơn hoặc đang được giữ chỗ.</small></div>
      <button className="btn" type="submit">Tìm phòng</button>
      <button className="explore-reset" type="button" onClick={() => { setDraft(readRoomSearch(new URLSearchParams())); reset(); close(); }}>Xóa bộ lọc</button>
    </form>;
}

export function BackendSearchResults({ home = false }: { home?: boolean }) {
    const params = useSearchParams();
    const currentQuery = params.toString();
    const applied = readRoomSearch(params);
    const rawRateUnit = params.get("rate_unit") ?? "hour";
    const rateUnit = SEARCH_RATE_UNITS.includes(rawRateUnit as typeof SEARCH_RATE_UNITS[number]) ? rawRateUnit : "hour";
    const [filtersOpen, setFiltersOpen] = useState(false);
    const rooms = useResource<{ items: ApiRoom[]; pagination: { total_pages: number; total_items: number } }>(roomSearchRequest(applied, rateUnit));
    const types = useResource<SpaceType[]>("/api/space-types");
    const amenities = useResource<{ amenity_id: number; name: string }[]>("/api/amenities");

    // Native history integrates with Next's useSearchParams without a server roundtrip.
    function apply(search: RoomSearch, nextRateUnit = rateUnit) {
        const query = roomSearchUrl(currentQuery, search, nextRateUnit);
        window.history.pushState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
    }
    useEffect(() => {
        const normalized = roomSearchUrl(currentQuery, readRoomSearch(new URLSearchParams(currentQuery)), rateUnit);
        if (normalized !== currentQuery)
            window.history.replaceState(null, "", `${window.location.pathname}?${normalized}${window.location.hash}`);
    }, [currentQuery, rateUnit]);
    function closeFilters() {
        setFiltersOpen(false);
        if (window.matchMedia("(max-width: 767px)").matches)
            document.getElementById("explore-filter-toggle")?.focus();
    }
    function reset() { apply(readRoomSearch(new URLSearchParams()), "hour"); }
    const activeChips: { label: string; clear: () => void }[] = [];
    if (applied.keyword) activeChips.push({ label: `Từ khóa: ${applied.keyword}`, clear: () => apply({ ...applied, keyword: "", page: 1 }) });
    if (applied.spaceType) activeChips.push({ label: types.data?.find(item => String(item.space_type_id) === applied.spaceType)?.name ?? "Loại không gian", clear: () => apply({ ...applied, spaceType: "", page: 1 }) });
    if (applied.district) activeChips.push({ label: applied.district, clear: () => apply({ ...applied, district: "", page: 1 }) });
    if (applied.minArea) activeChips.push({ label: `Từ ${applied.minArea} m²`, clear: () => apply({ ...applied, minArea: 0, page: 1 }) });
    if (applied.minCapacity) activeChips.push({ label: `Từ ${applied.minCapacity} người`, clear: () => apply({ ...applied, minCapacity: 0, page: 1 }) });
    if (applied.amenityId) activeChips.push({ label: amenities.data?.find(item => String(item.amenity_id) === applied.amenityId)?.name ?? "Tiện ích", clear: () => apply({ ...applied, amenityId: "", page: 1 }) });
    if (applied.date) activeChips.push({ label: `${applied.date} · ${applied.startTime} · ${applied.durationHours} giờ`, clear: () => apply({ ...applied, date: "", page: 1 }) });
    if (applied.maxPrice < MAX_PRICE) activeChips.push({ label: `Tối đa ${formatSearchPrice(applied.maxPrice)}`, clear: () => apply({ ...applied, maxPrice: MAX_PRICE, page: 1 }) });

    return <div className="container account-page explore-page">
      <div className="explore-heading"><h1>{home ? "Không gian cho ý tưởng của bạn" : "Khám phá phòng Studio"}</h1><p>Danh sách phòng và giá từ hệ thống StudioHub.</p></div>
      <div className="explore-layout">
        <aside className="explore-sidebar" aria-label="Bộ lọc tìm kiếm" data-open={filtersOpen}>
          <button id="explore-filter-toggle" className="btn secondary explore-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="explore-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Đóng bộ lọc" : "Bộ lọc"}</button>
          <SearchFilters key={JSON.stringify(applied)} applied={applied} rateUnit={rateUnit} types={types} amenities={amenities} apply={apply} reset={reset} close={closeFilters}/>
        </aside>
        <section className="explore-results" aria-label="Kết quả tìm kiếm" aria-busy={rooms.loading}>
          <div className="explore-results-heading" aria-live="polite"><h2>{rooms.data ? `${rooms.data.pagination.total_items} phòng phù hợp` : rooms.loading ? "Đang tìm phòng…" : "Kết quả tìm kiếm"}</h2><label className="explore-sort">Sắp xếp<select value={applied.sort} onChange={event => apply({ ...applied, sort: event.target.value, page: 1 })}><option value="recommended">Đề xuất</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option><option value="area_desc">Diện tích lớn nhất</option><option value="capacity_desc">Sức chứa lớn nhất</option><option value="newest">Mới cập nhật</option></select></label></div>
          <nav className="quick-filter-chips" aria-label="Lọc nhanh theo mục đích"><span>Tìm theo nhu cầu</span><button type="button" aria-pressed={!applied.spaceType} className={!applied.spaceType ? "active" : ""} onClick={() => apply({ ...applied, spaceType: "", page: 1 })}>Tất cả</button>{discoveryPurposes.map(purpose => typesForPurpose(types.data ?? [], purpose.typeNames).map(type => <button type="button" key={`${purpose.id}-${type.space_type_id}`} aria-pressed={applied.spaceType === String(type.space_type_id)} className={applied.spaceType === String(type.space_type_id) ? "active" : ""} onClick={() => apply({ ...applied, spaceType: String(type.space_type_id), page: 1 })}>{purpose.label}</button>))}</nav>
          {!!activeChips.length && <ul className="active-filter-chips" aria-label="Bộ lọc đang áp dụng">{activeChips.map((chip, index) => <li key={`${chip.label}:${index}`}><button type="button" onClick={chip.clear}>{chip.label}<span aria-hidden="true">×</span><span className="sr-only"> · Xóa bộ lọc</span></button></li>)}<li><button type="button" onClick={reset}>Xóa tất cả</button></li></ul>}
          <ApiMessage error={rooms.error}/>
          {rooms.error && <button className="btn secondary" onClick={rooms.reload}>Thử lại</button>}
          {rooms.data && <>
            {rooms.data.items.length === 0 && <div className="explore-empty"><p>Không tìm thấy phòng phù hợp với bộ lọc.</p><button className="btn secondary" onClick={reset}>Xóa bộ lọc</button></div>}
            <div className="explore-room-list">{rooms.data.items.map(room => <RoomListingCard key={room.room_id} className="explore-room-card" room={{
              href: `/rooms/${room.room_id}`, image: <ApiImage src={room.thumbnail_url} alt={room.name}/>, title: room.name,
              studio: room.studio.name, district: room.studio.district, type: room.primary_space_type?.name || "Studio sáng tạo",
              details: `${room.area} m² · Tối đa ${room.capacity} người`,
              ...(room.review_summary && room.review_summary.review_count > 0 ? { rating: { average: room.review_summary.average_rating, count: room.review_summary.review_count } } : {}),
              amenities: (room.amenities ?? []).map(item => item.name),
              price: room.display_rate ? `${formatSearchPrice(room.display_rate.unit_price)} / ${unitLabels[room.display_rate.rate_unit] ?? room.display_rate.rate_unit}` : "Chưa có bảng giá",
              priceContext: room.display_rate?.rate_unit === "session" && room.display_rate.unit_minutes ? `${room.display_rate.unit_minutes / 60} giờ mỗi buổi` : undefined,
            }} />)}</div>
            {rooms.data.pagination.total_items > 0 && <nav className="explore-pagination" aria-label="Phân trang kết quả"><button className="btn secondary" disabled={applied.page <= 1 || rooms.loading} onClick={() => apply({ ...applied, page: applied.page - 1 })}>Trang trước</button><span>Trang {applied.page} / {Math.max(1, rooms.data.pagination.total_pages)}</span><button className="btn secondary" disabled={applied.page >= rooms.data.pagination.total_pages || rooms.loading} onClick={() => apply({ ...applied, page: applied.page + 1 })}>Trang sau</button></nav>}
          </>}
          {rooms.loading && <div className="explore-room-list" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <RoomListingSkeleton key={index}/>)}</div>}
        </section>
      </div>
    </div>;
}
export function BackendRoomDetail({ id }: { id: string }) {
    const room = useResource<ApiRoom>(`/api/rooms/${encodeURIComponent(id)}`);
    const calendar = useResource<CalendarData>(`/api/rooms/${encodeURIComponent(id)}/calendar`);
    const reviews = useResource<{ summary: { review_count: number; average_rating: number }; items: { review_id: number; rating: number; review_text: string; customer_name: string; created_at: string }[] }>(`/api/rooms/${encodeURIComponent(id)}/reviews`);
    const relatedRooms = useResource<{ items: ApiRoom[] }>(room.data ? "/api/rooms?limit=50" : null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const r = room.data;
    const primaryType = r?.space_types?.[0]?.space_type_id;
    const related = (relatedRooms.data?.items ?? []).filter(item => item.room_id !== r?.room_id).sort((a, b) => {
        const aType = primaryType && a.primary_space_type?.space_type_id === primaryType ? 1 : 0;
        const bType = primaryType && b.primary_space_type?.space_type_id === primaryType ? 1 : 0;
        return bType - aType || Number(b.studio_id === r?.studio_id) - Number(a.studio_id === r?.studio_id);
    }).slice(0, 4);
    return <div className="container account-page room-detail-page">
        <Link href="/rooms">← Khám phá phòng</Link>
        <ApiMessage loading={room.loading} error={room.error}/>
        {r && <>
            <header className="room-detail-heading">
                <div><h1>{r.name}</h1><p>{r.studio.name} · {r.studio.address}, {r.studio.district}, {r.studio.city}</p></div>
                <span className="room-availability-state">Nhận đặt thuê · cần kiểm tra lịch theo ngày giờ</span>
            </header>
            <nav className="room-detail-anchor" aria-label="Đi tới nội dung phòng"><a href="#room-description">Không gian</a><a href="#room-amenities">Tiện ích</a><a href="#room-rates">Giá thuê</a><a href="#room-policies">Quy định</a><a href="#room-reviews-title">Đánh giá</a></nav>
            <div className="api-gallery" data-count={Math.min(r.images?.length || 1, 3)}>{r.images?.length ? r.images.map((img, index) => <button type="button" className="api-gallery-item" key={index} onClick={() => setLightboxIndex(index)} aria-label={`Mở ảnh ${index + 1} của ${r.name}`}><ApiImage src={img.image_url} alt={`${r.name} – ${index + 1}`}/></button>) : <button type="button" className="api-gallery-item" onClick={() => setLightboxIndex(0)} aria-label={`Mở ảnh ${r.name}`}><ApiImage src={r.thumbnail_url} alt={r.name}/></button>}<button className="api-gallery-all" type="button" onClick={() => setLightboxIndex(0)}>▦　Xem tất cả ảnh</button></div>
            <div className="room-detail-layout">
                <section className="surface room-information">
                    <h2 id="room-description">Thông tin & điều kiện thuê</h2>
                    <div className="room-info-table-wrap"><table className="room-info-table"><tbody>
                        <tr><th>Loại không gian</th><td>{r.space_types?.map(type => <div className="room-space-type" key={type.space_type_id}><strong>{type.name}</strong>{type.description && <><small>Mục đích thường dùng</small><p>{type.description}</p></>}</div>) || "Studio sáng tạo"}</td></tr>
                        <tr><th>Diện tích & sức chứa</th><td>{r.area} m² · tối đa {r.capacity} người{r.ceiling_height ? ` · trần cao ${r.ceiling_height} m` : ""}</td></tr>
                        <tr><th>Mô tả</th><td>{r.description || "Studio chưa bổ sung mô tả."}</td></tr>
                        <tr id="room-policies"><th>Quy định</th><td>{r.rules || "Liên hệ Studio để biết thêm quy định."}</td></tr>
                        <tr id="room-amenities"><th>Tiện ích</th><td>{r.amenities?.map(item => item.name).join(" · ") || "Studio chưa cung cấp danh sách tiện ích."}</td></tr>
                        <tr id="room-rates"><th>Giá thuê</th><td>{r.rates?.length ? <ul className="room-rate-table-list">{r.rates.map(rate => <li key={rate.rate_id}><span>{unitLabels[rate.rate_unit] ?? rate.rate_unit} · {rate.unit_minutes >= 1440 ? `${rate.unit_minutes / 1440} ngày` : `${rate.unit_minutes / 60} giờ`} mỗi đơn vị</span><strong>{money(rate.unit_price)}</strong></li>)}</ul> : "Liên hệ Studio để hỏi giá."}</td></tr>
                        <tr><th>Lịch đã bận</th><td><ApiMessage loading={calendar.loading} error={calendar.error}/>{calendar.data && (calendar.data.busy_slots.length ? <ul className="room-busy-list">{calendar.data.busy_slots.map((slot, index) => <li key={index}>{formatApiTime(slot.busy_start)} – {formatApiTime(slot.busy_end)}</li>)}</ul> : "Chưa có khung bận trong 30 ngày tới. Lịch được xác nhận lại khi đặt thuê.")}</td></tr>
                        <tr><th>Địa chỉ Studio</th><td>{r.studio.address}, {r.studio.district}, {r.studio.city}</td></tr>
                        <tr><th>Người cho thuê</th><td><strong>{r.studio.host_name || r.studio.name}</strong><div className="room-contact-links">{(r.studio.host_phone || r.studio.phone) && <a href={`tel:${r.studio.host_phone || r.studio.phone}`}>Điện thoại: {r.studio.host_phone || r.studio.phone}</a>}{r.studio.host_email && <a href={`mailto:${r.studio.host_email}`}>Email: {r.studio.host_email}</a>}</div></td></tr>
                    </tbody></table></div>
                    <RoomSpecGroup room={r}/>
                </section>
                <aside className="surface room-booking-card"><h2>Đặt thuê phòng</h2><p>Chọn ngày và gói thuê để máy chủ kiểm tra lịch, giá và tiền cọc.</p><Link className="btn" href={`/rooms/${id}/book`}>Kiểm tra giá & đặt thuê</Link><small>Lịch được xác nhận lại khi tạo đơn.</small></aside>
            </div>
            <section className="room-review-section surface" aria-labelledby="room-reviews-title"><div className="room-review-heading"><div><p className="booking-eyebrow">Khách đã thuê</p><h2 id="room-reviews-title">Đánh giá từ khách hàng</h2></div>{reviews.data && (reviews.data.summary.review_count > 0 ? <strong className="room-review-average" aria-label={`${reviews.data.summary.average_rating} trên 5 sao`}>★ {reviews.data.summary.average_rating.toFixed(1)} <small>({reviews.data.summary.review_count})</small></strong> : <small>Chưa có điểm đánh giá</small>)}</div><ApiMessage loading={reviews.loading} error={reviews.error}/>{reviews.data?.items.length ? <div className="room-review-list">{reviews.data.items.map(review => <article key={review.review_id}><div><strong>{review.customer_name}</strong><span aria-label={`${review.rating} trên 5 sao`} className="room-review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>{review.review_text && <p>{review.review_text}</p>}<small>{formatApiTime(review.created_at)}</small></article>)}</div> : reviews.data && <p>Chưa có đánh giá. Khách có thể đánh giá sau khi đơn thuê hoàn tất.</p>}</section>
            <section className="room-related-section"><div><h2>Phòng liên quan</h2><p>Gợi ý cùng loại không gian hoặc cùng Studio nếu khung bạn chọn không còn.</p></div><ApiMessage loading={relatedRooms.loading} error={relatedRooms.error}/>{related.length > 0 && <div className="room-related-grid">{related.map(item => <Link className="room-related-card" href={`/rooms/${item.room_id}`} key={item.room_id}><ApiImage src={item.thumbnail_url} alt={item.name}/><span>{item.primary_space_type?.name || item.studio.name}</span><strong>{item.name}</strong><small>{item.display_rate ? `${money(item.display_rate.unit_price)} / ${unitLabels[item.display_rate.rate_unit] ?? item.display_rate.rate_unit}` : "Xem bảng giá"}</small></Link>)}</div>}</section>
            <div className="api-mobile-booking-bar"><div><strong>{r.display_rate ? `${money(r.display_rate.unit_price)}` : "Xem bảng giá"}</strong><small>{r.display_rate ? ` / ${unitLabels[r.display_rate.rate_unit] ?? r.display_rate.rate_unit}` : ""}</small></div><Link className="btn" href={`/rooms/${id}/book`}>Chọn lịch</Link></div>
            {lightboxIndex !== null && <Modal wide title={`${r.name} · Ảnh ${lightboxIndex + 1}/${r.images?.length || 1}`} onClose={() => setLightboxIndex(null)}><div className="api-lightbox"><ApiImage src={r.images?.[lightboxIndex]?.image_url ?? r.thumbnail_url} alt={`${r.name} – ảnh ${lightboxIndex + 1}`}/><div><button className="btn secondary" disabled={(r.images?.length ?? 0) < 2} onClick={() => setLightboxIndex(index => ((index ?? 0) + (r.images?.length ?? 1) - 1) % (r.images?.length ?? 1))}>Ảnh trước</button><button className="btn secondary" disabled={(r.images?.length ?? 0) < 2} onClick={() => setLightboxIndex(index => ((index ?? 0) + 1) % (r.images?.length ?? 1))}>Ảnh tiếp</button></div></div></Modal>}
        </>}
    </div>;
}
