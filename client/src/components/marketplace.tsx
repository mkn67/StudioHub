"use client";
import { Presence, SharedPhoto, useContentMotion } from "./motion/system";
import { GalleryImage } from "./motion/gallery-image";
import Image from "@/components/image";
import { useState } from "react";
import Link from "./motion/navigation-link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  MapPin,
  Maximize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "./store";
import { RoomCard, Modal, PageHeading, Empty, PrintArtwork } from "./ui";
import { BookingWizard } from "./wizard";
import { effectivePricingPlans } from "@/domain/featured-pricing";
import { StudioCategoryIllustration } from "./studio-category-illustration";
import { RoomEditorialContent } from "@/features/pricing/components/RoomEditorialContent";
import { money, localDate, atDate } from "@/domain/models";
import {
  roomRate,
  studioFor,
  HOUR,
  activeStatuses,
  overlaps,
} from "@/domain/engine";
export function Home() {
  const { state } = useStore(),
    router = useRouter();
  const [location, setLocation] = useState(""),
    [category, setCategory] = useState(""),
    [date, setDate] = useState("");
  return (
    <>
      <section className="hero">
        <Image
          width={1400}
          height={1000}
          className="hero-photo"
          src="/images/cyclorama-2.jpg"
          alt="Studio ánh sáng tự nhiên, phông ấm, sàn gỗ và thiết bị chụp ảnh"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-inner">
          <div className="hero-editorial">
          <h1 className="riso-headline">
            StudioHub-UIT
            <br />Xin chào<span className="hero-emphasis"> bạn!</span>
          </h1>
          <p>
            Nền tảng tìm kiếm Studio lớn nhì UIT.
          </p>
          </div>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              const p = new URLSearchParams();
              if (location) p.set("location", location);
              if (category) p.set("category", category);
              if (date) p.set("date", date);
              router.push("/rooms?" + p.toString());
            }}
          >
            <label>
              <span>Địa điểm</span>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Bạn muốn sáng tạo ở đâu?</option>
                <option>Thảo Điền</option>
              </select>
            </label>
            <label>
              <span>Không gian</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Mọi loại Studio</option>
                {state.types.map((t) => (
                  <option key={t.id} value={t.category}>
                    {t.category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Ngày thuê</span>
              <input
                aria-label="Ngày thuê"
                type="date"
                min={localDate(state.now)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button className="btn" type="submit">
              <Search size={18} />
              Tìm Studio
            </button>
          </form>
        </div>
        <div className="hero-caption">
          <span>UIT Studio Rooms · Thảo Điền</span>
          <span>
            Ảnh không gian minh họa <ArrowUpRight size={14} />
          </span>
        </div>
      </section>
      <section className="section container">
        <div className="section-head">
          <h2>
            Mỗi ý tưởng,
            <br />
            một không gian.
          </h2>
          <p className="muted">
            Từ những khung hình đầu tiên đến bản thu cuối cùng.
            <br />
            Chọn không gian theo cách bạn sáng tạo.
          </p>
        </div>
        <div className="categories">
          {state.types.map((t, i) => (
            <Link
              key={t.id}
              href={`/rooms?category=${encodeURIComponent(t.category)}`}
            >
              <StudioCategoryIllustration category={t.category} />
              <span>{t.category}</span>
              <ArrowUpRight size={22} />
              <small>
                {
                  [
                    "Ánh sáng, bố cục và những khung hình",
                    "Tự do kể câu chuyện của bạn",
                    "Gặp gỡ và chia sẻ ý tưởng",
                    "Tập trung vào từng thanh âm",
                  ][i]
                }
              </small>
            </Link>
          ))}
        </div>
      </section>
      <section className="section container">
        <div className="section-head">
          <div>
            <h2>Chọn nơi bắt đầu.</h2>
            <p className="muted">
              Những phòng Studio trong bộ dữ liệu minh họa.
            </p>
          </div>
          <Link className="text-link" href="/rooms">
            Khám phá tất cả <ArrowRight size={18} />
          </Link>
        </div>
        <div className="featured-grid">
          {state.rooms
            .filter((_, i) => [0, 2, 4].includes(i))
            .map((room) => (
              <RoomCard key={room.id} room={room} editorial />
            ))}
        </div>
      </section>
      <section className="how-section">
        <div className="container how-grid">
          <h2>
            Từ ý tưởng
            <br />
            đến buổi sáng tạo.
          </h2>
          <div>
            {[
              [
                "Chọn đúng không gian",
                "Xem ảnh, tiện ích và thông tin của từng phòng thực tế.",
              ],
              [
                "Chọn lịch và thiết bị",
                "Biết rõ chi phí và chính sách trước khi xác nhận.",
              ],
              [
                "Đặt cọc, nhận xác nhận",
                "Thanh toán cọc mô phỏng và chờ chủ Studio duyệt.",
              ],
            ].map(([title, text], i) => (
              <div className="how-row" key={title}>
                <span className="mono">0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p className="muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="host-cta container">
        <PrintArtwork />
        <div>
          <h2>
            Không gian của bạn.
            <br />
            Cảm hứng của nhiều người.
          </h2>
          <p className="muted">
            Đưa Studio của bạn đến với cộng đồng sáng tạo.
          </p>
          <Link href="/register/host" className="btn">
            Trở thành đối tác <ArrowUpRight size={18} />
          </Link>
        </div>
        <Image
          width={1400}
          height={1000}
          src="/images/cyclorama.jpg"
          alt="Không gian Studio rộng với cửa sổ lớn"
          loading="lazy"
        />
      </section>
    </>
  );
}
type Filters = {
  location: string;
  category: string;
  date: string;
  start: number;
  hours: number;
  price: number;
  area: number;
  capacity: number;
  amenity: string;
};
export function SearchRooms() {
  const { state } = useStore(),
    params = useSearchParams();
  const defaults: Filters = {
    location: params.get("location") ?? "",
    category: params.get("category") ?? "",
    date: params.get("date") ?? "",
    start: 9,
    hours: 2,
    price: 600000,
    area: 0,
    capacity: 0,
    amenity: "",
  };
  const [filters, setFilters] = useState(defaults),
    [sort, setSort] = useState("recommended"),
    [page, setPage] = useState(1),
    [mobile, setMobile] = useState(false);
  const f = filters;
  const update = (key: keyof Filters, value: string | number) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };
  const rooms = state.rooms
    .filter((r) => {
      const t = state.types.find((t) => t.id === r.typeId),
        st = studioFor(state, r.id);
      if (!r.active || !st?.active) return false;
      if (
        f.location &&
        !st.district.toLowerCase().includes(f.location.toLowerCase())
      )
        return false;
      if (f.category && t?.category !== f.category) return false;
      if (
        roomRate(state, r.id) > f.price ||
        r.area < f.area ||
        r.capacity < f.capacity ||
        (f.amenity && !r.amenities.includes(f.amenity))
      )
        return false;
      if (f.date) {
        const start = atDate(f.date, f.start),
          end = start + f.hours * HOUR;
        if (
          start < state.now ||
          end <= start ||
          f.start < st.policy.openHour ||
          f.start + f.hours > st.policy.closeHour ||
          state.bookings.some(
            (b) =>
              b.roomId === r.id &&
              activeStatuses.includes(b.status) &&
              overlaps({ start, end }, b),
          ) ||
          (state.availability ?? []).some(b => b.roomId === r.id && overlaps({ start, end }, b))
        )
          return false;
      }
      return true;
    })
    .sort((a, b) =>
      sort === "price-up"
        ? roomRate(state, a.id) - roomRate(state, b.id)
        : sort === "price-down"
          ? roomRate(state, b.id) - roomRate(state, a.id)
          : sort === "area"
            ? b.area - a.area
            : a.code.localeCompare(b.code),
    );
  const resultsRef = useContentMotion(`${page}|${sort}|${JSON.stringify(f)}|${rooms.map(r=>r.id).join()}`);
  const filterContent = (
    <>
      <div className="filter-heading">
        <h3>Bộ lọc</h3>
        <button
          className="text-button"
          onClick={() => {
            setFilters({
              location: "",
              category: "",
              date: "",
              start: 9,
              hours: 2,
              price: 600000,
              area: 0,
              capacity: 0,
              amenity: "",
            });
            setPage(1);
          }}
        >
          Xóa tất cả
        </button>
      </div>
      <label>
        Địa điểm
        <select
          value={f.location}
          onChange={(e) => update("location", e.target.value)}
        >
          <option value="">Tất cả địa điểm</option>
          <option>Thảo Điền</option>
        </select>
      </label>
      <label>
        Loại không gian
        <select
          value={f.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Tất cả không gian</option>
          {state.types.map((t) => (
            <option key={t.id} value={t.category}>
              {t.category}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Thời gian thuê</legend>
        <label>
          Ngày
          <input
            type="date"
            min={localDate(state.now)}
            value={f.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Bắt đầu
            <select
              value={f.start}
              onChange={(e) => update("start", +e.target.value)}
            >
              {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </label>
          <label>
            Số giờ
            <input
              type="number"
              min="1"
              max="10"
              value={f.hours}
              onChange={(e) => update("hours", +e.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <label>
        Giá tối đa / giờ <strong className="mono">{money(f.price)}</strong>
        <input
          type="range"
          min="200000"
          max="600000"
          step="50000"
          value={f.price}
          onChange={(e) => update("price", +e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label>
          Diện tích từ
          <select
            value={f.area}
            onChange={(e) => update("area", +e.target.value)}
          >
            <option value="0">Bất kỳ</option>
            {[40, 60, 80].map((a) => (
              <option key={a} value={a}>
                {a} m²
              </option>
            ))}
          </select>
        </label>
        <label>
          Sức chứa từ
          <input
            type="number"
            min="0"
            max="20"
            value={f.capacity}
            onChange={(e) => update("capacity", +e.target.value)}
          />
        </label>
      </div>
      <label>
        Tiện ích
        <select
          value={f.amenity}
          onChange={(e) => update("amenity", e.target.value)}
        >
          <option value="">Tất cả tiện ích</option>
          {["Ánh sáng tự nhiên", "Cách âm", "Phòng thay đồ", "Wi-Fi"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
      </label>
    </>
  );
  return (
    <div className="container search-page">
      <div className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <span>/</span>Khám phá Studio
      </div>
      <PageHeading
        title="Không gian cho lần sáng tạo tiếp theo."
        description="Chọn chính xác căn phòng phù hợp với bạn."
      />
      <div className="search-layout">
        <aside className="filters">{filterContent}</aside>
        <section>
          <div className="results-toolbar">
            <span>
              <strong>{rooms.length}</strong> phòng phù hợp{" "}
              <span className="muted">· Dữ liệu minh họa</span>
            </span>
            <button
              className="btn secondary mobile-filter"
              onClick={() => setMobile(true)}
            >
              <SlidersHorizontal size={16} />
              Bộ lọc
            </button>
            <label className="sort-label">
              <span className="sr-only">Sắp xếp</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="recommended">Theo mã phòng</option>
                <option value="price-up">Giá tăng dần</option>
                <option value="price-down">Giá giảm dần</option>
                <option value="area">Diện tích lớn nhất</option>
              </select>
            </label>
          </div>
          {(f.category || f.location || f.date || f.amenity) && (
            <div className="active-filters">
              {(["category", "location", "date", "amenity"] as const)
                .filter((k) => f[k])
                .map((k) => (
                  <button key={k} onClick={() => update(k, "")}>
                    {f[k]} ×
                  </button>
                ))}
            </div>
          )}
          <div ref={resultsRef} className="results-list">
            {rooms.slice((page - 1) * 4, page * 4).map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
          {!rooms.length && (
            <Empty
              title="Chưa tìm thấy phòng phù hợp"
              text="Thử thay đổi thời gian hoặc nới rộng bộ lọc để xem thêm không gian."
            />
          )}
          {rooms.length > 4 && (
            <nav className="pagination" aria-label="Phân trang">
              {Array.from({ length: Math.ceil(rooms.length / 4) }, (_, i) => (
                <button
                  aria-current={page === i + 1 ? "page" : undefined}
                  className={`btn ${page === i + 1 ? "" : "secondary"}`}
                  key={i}
                  onClick={() => {
                    setPage(i + 1);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </section>
      </div>
      <Presence>{mobile && (
        <Modal sheet title="Bộ lọc tìm kiếm" onClose={() => setMobile(false)}>
          <div className="mobile-filter-content">
            {filterContent}
            <button className="btn full" onClick={() => setMobile(false)}>
              Xem {rooms.length} phòng
            </button>
          </div>
        </Modal>
      )}</Presence>
    </div>
  );
}
export function RoomDetail({ id }: { id: string }) {
  const { state } = useStore(),
    params = useSearchParams();
  const room = state.rooms.find((r) => r.id === id),
    [wizard, setWizard] = useState(params.get("book") === "1"),
    [lightbox, setLightbox] = useState<number | null>(null);
  if (!room)
    return (
      <Empty
        title="Không tìm thấy phòng"
        text="Phòng có thể đã ngừng hiển thị. Hãy chọn một phòng khác."
        href="/rooms"
      />
    );
  const st = studioFor(state, id)!,
    type = state.types.find((t) => t.id === room.typeId)!;
  const displayRates = effectivePricingPlans(state, id);
  const displayRate = displayRates.find(rate => rate.kind === "hourly") ?? displayRates[0];
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href="/rooms">Khám phá Studio</Link>
        <span>/</span>
        {room.code}
      </div>
      <div className="detail-heading">
        <div>
          <h1>
            {room.name} <span className="muted">/ {room.code}</span>
          </h1>
          <p className="muted">
            <MapPin size={15} />
            {st.address}
          </p>
        </div>
        <span className="tag">{type.category}</span>
      </div>
      <div className="mosaic">
        {room.images.map((src, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            aria-label={`Mở ảnh ${i + 1}`}
          >
            <SharedPhoto name={i === 0 ? `room-${room.id}` : `room-${room.id}-gallery-${i}`}><Image
              width={1400}
              height={1000}
              src={src}
              alt={`Ảnh minh họa ${room.name}, góc ${i + 1}`}
            /></SharedPhoto>
            {i === 2 && (
              <span>
                Xem bộ ảnh <Maximize size={15} />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="detail-layout">
        <RoomEditorialContent state={state} roomId={id} />
        <aside className="booking-card">
          <div className="price-large">
            {displayRate ? money(displayRate.amount) : "Chưa có giá"}
            <small>{displayRate?.unit}</small>
          </div>
          <p className="muted">
            Phòng {room.code} · {room.area} m² · {room.capacity} người
          </p>
          <div className="line-item">
            <span>Đặt cọc</span>
            <strong>{st.policy.depositPercent}% tổng giá</strong>
          </div>
          <div className="line-item">
            <span>Thời hạn thanh toán</span>
            <strong>{st.policy.paymentMinutes} phút</strong>
          </div>
          <button
            className="btn full"
            disabled={!room.active || !displayRate}
            onClick={() => setWizard(true)}
          >
            Chọn lịch thuê <ArrowRight size={18} />
          </button>
          <small>Chưa có khoản tiền nào được thu. Đây là bản mô phỏng.</small>
          <hr />
          <p className="small-text">
            Chọn ngày để kiểm tra phòng và thiết bị. Chủ Studio phản hồi trong 2
            giờ sau khi nhận cọc.
          </p>
        </aside>
      </div>
      <div className="mobile-booking-bar">
        <div>
          <strong>{displayRate ? money(displayRate.amount) : "Chưa có giá"}</strong>
          <small>{displayRate?.unit} · {room.code}</small>
        </div>
        <button
          className="btn"
          disabled={!room.active || !displayRate}
          onClick={() => setWizard(true)}
        >
          Chọn lịch thuê
        </button>
      </div>
      <Presence>{wizard && <BookingWizard room={room} onClose={() => setWizard(false)} />}</Presence>{" "}
      <Presence>{lightbox !== null && (
        <Modal
          wide
          title={`${room.name} · Ảnh minh họa ${lightbox + 1}/${room.images.length}`}
          onClose={() => setLightbox(null)}
        >
          <div className="lightbox">
            <GalleryImage
              src={room.images[lightbox]}
              alt={`Góc chụp ${lightbox + 1} minh họa`}
            />
            <div className="actions">
              <button
                className="btn secondary"
                onClick={() =>
                  setLightbox(
                    (lightbox + room.images.length - 1) % room.images.length,
                  )
                }
              >
                <ChevronLeft size={16} />
                Ảnh trước
              </button>
              <button
                className="btn secondary"
                onClick={() => setLightbox((lightbox + 1) % room.images.length)}
              >
                Ảnh tiếp
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}</Presence>
    </div>
  );
}
