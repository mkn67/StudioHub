"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Users, Maximize, Search } from "lucide-react";
import { apiRequest } from "@/services/api/client";
import { Badge, EmptyState, PageHeading, StudioImage } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";

type RoomSummary = {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  capacity: number;
  studio: { name: string; address: string; district: string; city: string };
  thumbnail_url: string | null;
  primary_space_type: { space_type_id: number; name: string } | null;
  display_rate: { rate_unit: string; unit_price: number } | null;
  amenities: { amenity_id: number; name: string; icon: string | null }[];
};
type RoomDetailData = RoomSummary & {
  ceiling_height: number | null;
  soundproof_level: string | null;
  power_specs: string | null;
  rules: string | null;
  studio: RoomSummary["studio"] & { description: string | null; phone: string | null };
  space_types: { space_type_id: number; name: string; is_primary: boolean }[];
  images: { image_id: number; image_url: string; is_primary: boolean; sort_order: number }[];
  rates: { rate_id: number; rate_unit: string; unit_minutes: number; unit_price: number; minimum_units: number; maximum_units: number | null }[];
};
type RoomPage<T> = { items: T[]; pagination: { page: number; limit: number; total_items: number; total_pages: number } };

const unitLabel: Record<string, string> = {
  hour: "giờ",
  half_day: "nửa ngày",
  day: "ngày",
  week: "tuần",
  month: "tháng",
  session: "buổi",
};

export function BackendSearchResults() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const filters = new URLSearchParams(query);
    const apiQuery = new URLSearchParams({ limit: "50" });
    const keyword = filters.get("location") ?? filters.get("q");
    if (keyword) apiQuery.set("keyword", keyword);
    const typeId = filters.get("type")?.match(/\d+/)?.[0];
    if (typeId) apiQuery.set("space_type_id", typeId);
    void apiRequest<RoomPage<RoomSummary>>(`/api/rooms?${apiQuery}`)
      .then((result) => {
        if (!active) return;
        setRooms(result.items);
        setTotal(result.pagination.total_items);
        setError("");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không tải được danh sách phòng.");
      })
      .finally(() => {
        if (active) setLoadedQuery(query);
      });
    return () => {
      active = false;
    };
  }, [query]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(query);
    if (location.trim()) next.set("location", location.trim());
    else next.delete("location");
    next.delete("q");
    router.push(`/rooms${next.size ? `?${next}` : ""}`);
  }

  return (
    <main id="main-content" tabIndex={-1} className="container search-page">
      <PageHeading title="Khám phá phòng Studio" description="Kết quả được tải trực tiếp từ API StudioHub." />
      <form className="surface backend-search-form" onSubmit={search}>
        <label htmlFor="backend-location">Địa điểm hoặc tên Studio</label>
        <div className="search-input-row">
          <Input id="backend-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ví dụ: Bình Thạnh" />
          <Button type="submit"><Search size={17} /> Tìm phòng</Button>
        </div>
      </form>
      <div className="results-heading">
        <h2>{loading ? "Đang tải phòng…" : `${total} phòng từ máy chủ`}</h2>
      </div>
      {error ? <EmptyState title="Không tải được danh sách phòng" description={error} /> : null}
      {!error && !loading && rooms.length === 0 ? <EmptyState title="Chưa có phòng phù hợp" description="Thử tìm với địa điểm hoặc tên Studio khác." /> : null}
      <div className="room-grid">
        {rooms.map((room) => (
          <article className="room-card" key={room.room_id}>
            <Link className="room-card-image" href={`/rooms/${room.room_id}`} aria-label={`Xem ${room.name}`}>
              <StudioImage src={room.thumbnail_url ?? undefined} alt={room.name} />
            </Link>
            <div className="room-card-content">
              {room.primary_space_type && <Badge>{room.primary_space_type.name}</Badge>}
              <h3><Link href={`/rooms/${room.room_id}`}>{room.name}</Link></h3>
              <p className="room-location"><MapPin size={15} /> {room.studio.district}, {room.studio.city}</p>
              <div className="room-facts">
                <span><Maximize size={15} /> {room.area} m²</span>
                <span><Users size={15} /> Tối đa {room.capacity} người</span>
              </div>
              <div className="room-card-bottom">
                <strong>{room.display_rate ? money(room.display_rate.unit_price) : "Liên hệ"}</strong>
                <small>{room.display_rate ? `/ ${unitLabel[room.display_rate.rate_unit] ?? room.display_rate.rate_unit}` : "Chưa có giá"}</small>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export function BackendRoomDetail({ id }: { id: string }) {
  const [room, setRoom] = useState<RoomDetailData | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== id;
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void apiRequest<RoomDetailData>(`/api/rooms/${encodeURIComponent(id)}`)
      .then((data) => {
        if (active) setRoom(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không tải được thông tin phòng.");
      })
      .finally(() => {
        if (active) setLoadedId(id);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <main className="container"><PageHeading title="Đang tải thông tin phòng…" /></main>;
  if (error || !room)
    return <main className="container"><EmptyState title="Không tải được phòng" description={error || "Phòng không tồn tại hoặc không khả dụng."} href="/rooms" action="Quay lại danh sách" /></main>;

  const photos = room.images.map((image) => image.image_url);
  return (
    <main id="main-content" tabIndex={-1} className="container detail-page">
      <nav className="breadcrumb" aria-label="Đường dẫn"><Link href="/">Trang chủ</Link><span>/</span><Link href="/rooms">Kết quả</Link><span>/</span><span>{room.studio.name}</span></nav>
      <PageHeading eyebrow={room.studio.name} title={room.name} description={`${room.studio.district}, ${room.studio.city} · ${room.area} m² · Tối đa ${room.capacity} người`} />
      <section className="backend-room-gallery" aria-label="Hình ảnh phòng">
        {(photos.length ? photos : [room.thumbnail_url ?? ""]).slice(0, 5).map((src, index) => <StudioImage key={`${src}-${index}`} src={src || undefined} alt={`${room.name} — ảnh ${index + 1}`} />)}
      </section>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="surface"><h2>Về không gian</h2><p>{room.description || "Chưa có mô tả cho phòng này."}</p><ul className="backend-facts"><li>Diện tích: {room.area} m²</li><li>Sức chứa: {room.capacity} người</li>{room.ceiling_height && <li>Chiều cao trần: {room.ceiling_height} m</li>}{room.soundproof_level && <li>Cách âm: {room.soundproof_level}</li>}{room.power_specs && <li>Nguồn điện: {room.power_specs}</li>}</ul></section>
          <section className="surface"><h2>Loại không gian & tiện ích</h2><div className="backend-tag-list">{room.space_types.map((item) => <Badge key={item.space_type_id}>{item.name}</Badge>)}{room.amenities.map((item) => <Badge key={item.amenity_id}>{item.name}</Badge>)}</div></section>
          <section className="surface"><h2>Quy định</h2><p>{room.rules || "Chủ Studio chưa bổ sung quy định."}</p></section>
        </div>
        <aside className="surface backend-rate-panel"><h2>Bảng giá đang áp dụng</h2>{room.rates.map((rate) => <div className="backend-rate" key={rate.rate_id}><span>{unitLabel[rate.rate_unit] ?? rate.rate_unit}</span><strong>{money(rate.unit_price)}</strong></div>)}<p className="field-hint">Giá và thông tin phòng được tải trực tiếp từ máy chủ StudioHub. Kiểm tra lịch và đặt giữ chỗ ngay.</p><Button asChild className="full-width"><Link href={`/rooms/${room.room_id}/book`}>Đặt phòng ngay</Link></Button></aside>
      </div>
    </main>
  );
}

export function BackendBookingNotConnected() {
  return (
    <main id="main-content" tabIndex={-1} className="container">
      <PageHeading title="Đặt thuê chưa được kết nối" />
      <section className="surface">
        <p>
          Backend đã có API kiểm tra khả dụng và tạo đơn, nhưng danh mục phòng,
          bảng giá và thiết bị từ máy chủ chưa được nối vào biểu mẫu đặt thuê.
          Trang này đang dừng để tránh gửi nhầm mã hoặc giá từ dữ liệu demo.
        </p>
        <Button asChild className="mt-4"><Link href="/rooms">Quay lại danh sách phòng</Link></Button>
      </section>
    </main>
  );
}
