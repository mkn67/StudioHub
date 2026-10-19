"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useId } from "react";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Users,
  Maximize,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Aperture,
  Check,
  Building2,
} from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, ErrorSummary } from "@/components/forms/field";
import {
  Badge,
  EmptyState,
  PageHeading,
  StudioImage,
  PriceBreakdown,
} from "@/components/shared/common";
import { Pagination } from "@/components/data-table/table";
import { getEffectiveRoomStatus } from "@/domain/access";
import { startingRate } from "@/domain/pricing";
import { checkAvailability } from "@/domain/availability";
import {
  localDate,
  money,
  normalize,
  unitLabels,
  vietnamInstant,
} from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import type { Database, Room } from "@/domain/schema";
import { defaultRequest, RentalFields } from "@/features/booking/rental-fields";

export function SearchForm({
  compact = false,
  onDone,
}: {
  compact?: boolean;
  onDone?: () => void;
}) {
  const { db } = useApp(),
    router = useRouter(),
    params = useSearchParams();
  const [location, setLocation] = useState(params.get("location") ?? ""),
    [type, setType] = useState(
      db?.types.find((t) => t.id === params.get("type"))?.name ?? "",
    ),
    [date, setDate] = useState(params.get("date") ?? ""),
    [error, setError] = useState<string | null>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (date && date < localDate()) {
      setError("Chọn ngày thuê từ hôm nay.");
      return;
    }
    const p = new URLSearchParams();
    if (location) p.set("location", location);
    if (type) {
      const selected = db?.types.find(
        (t) => normalize(t.name) === normalize(type),
      );
      if (!selected) {
        setError("Chọn một loại Studio trong danh sách.");
        return;
      }
      p.set("type", selected.id);
    }
    if (date) p.set("date", date);
    router.push(`/studios${p.size ? `?${p}` : ""}`);
    onDone?.();
  }
  return (
    <>
      <form
        className={`search-form ${compact ? "search-compact" : ""}`}
        onSubmit={submit}
      >
        <div className="search-field">
          <MapPin size={18} />
          <Field label="Khu vực" id="search-location">
            <Input
              list="search-locations"
              placeholder="Bạn muốn thuê ở đâu?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <datalist id="search-locations">
            {[...new Set(db?.studios.flatMap((s) => [s.city, s.district]))].map(
              (city) => (
                <option key={city}>{city}</option>
              ),
            )}
          </datalist>
        </div>
        <div className="search-field">
          <Aperture size={18} />
          <Field label="Loại Studio" id="search-type">
            <Input
              list="search-types"
              placeholder="Tất cả không gian"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </Field>
          <datalist id="search-types">
            {db?.types
              .filter((t) => !t.hidden)
              .map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
          </datalist>
        </div>
        <div className="search-field">
          <CalendarDays size={18} />
          <Field label="Ngày thuê" id="search-date">
            <Input
              type="date"
              min={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit">
          <Search size={18} /> Tìm Studio
        </Button>
      </form>
      <ErrorSummary error={error} />
      {!compact && (
        <div className="quick-filters">
          <span>Thử tìm:</span>
          {["Bình Thạnh", "Thảo Điền"].map((city) => (
            <button key={city} onClick={() => setLocation(city)}>
              {city}
            </button>
          ))}
          {db?.types.slice(0, 2).map((t) => (
            <button key={t.id} onClick={() => setType(t.name)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
export function RoomCard({
  room,
  horizontal = false,
  returnTo = "/studios",
  availability,
}: {
  room: Room;
  horizontal?: boolean;
  returnTo?: string;
  availability?: string;
}) {
  const { db, now } = useApp();
  if (!db) return null;
  const studio = db.studios.find((s) => s.id === room.studioId)!,
    rate = startingRate(db.rates, room.id, now),
    state = getEffectiveRoomStatus(db, room, now);
  const href = `/studios/${room.slug}?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <article
      className={`room-card ${horizontal ? "room-card-horizontal" : ""}`}
    >
      <Link
        href={href}
        className="room-card-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        <StudioImage src={room.images[0]} alt={room.name} />
      </Link>
      <div className="room-card-content">
        <p className="room-studio">{studio.name}</p>
        <h3>
          <Link href={href}>{room.name}</Link>
        </h3>
        <p className="room-location">
          <MapPin size={14} />
          {studio.district}, {studio.city}
        </p>
        <div className="room-meta">
          <span>
            <Maximize size={15} />
            {room.area} m²
          </span>
          <span>
            <Users size={15} />
            {room.capacity} người
          </span>
        </div>
        {horizontal && (
          <div className="room-amenities">
            {room.amenityIds.slice(0, 3).map((id) => (
              <span key={id}>
                {db.amenities.find((a) => a.id === id)?.name}
              </span>
            ))}
          </div>
        )}
        <div className="room-card-bottom">
          <span>
            {rate ? (
              <>
                <strong>{money(rate.price)}</strong>
                <small> / {unitLabels[rate.unit]}</small>
              </>
            ) : (
              <small>Chưa có giá áp dụng</small>
            )}
          </span>
          {state === "paused" ? (
            <Badge>Tạm ngừng nhận đơn</Badge>
          ) : (
            availability && <Badge tone="success">{availability}</Badge>
          )}
          {horizontal && (
            <Link className="text-link" href={href}>
              Xem chi tiết
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
export function Homepage() {
  const { db, now } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  if (!db) return null;
  const rooms = db.rooms.filter((r) =>
    ["bookable", "paused"].includes(getEffectiveRoomStatus(db, r, now)),
  );
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="home-hero container">
        <div className="hero-copy">
          <p className="eyebrow">KHÔNG GIAN CHO BUỔI SÁNG TẠO TIẾP THEO</p>
          <h1>
            Tìm studio,
            <br /> đặt theo giờ.
          </h1>
          <p>Chọn không gian phù hợp. Đặt thời gian bạn cần.</p>
        </div>
        <div className="hero-photo">
          <StudioImage
            src="/images/daylight.jpg"
            alt="Studio sáng thoáng với ánh sáng tự nhiên và phông chụp ảnh"
          />
          <span className="photo-caption">Ánh sáng đẹp. Ý tưởng mới.</span>
        </div>
        <div className="hero-search desktop-search">
          <SearchForm />
        </div>
        <div className="mobile-search">
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="full-width">
                <Search size={20} /> Tìm studio cho buổi thuê của bạn
              </Button>
            </DialogTrigger>
            <DialogContent variant="sheet">
              <DialogTitle>Tìm Studio</DialogTitle>
              <DialogDescription>
                Chọn khu vực, không gian và ngày thuê.
              </DialogDescription>
              <SearchForm compact onDone={() => setSearchOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </section>
      <section className="container marketplace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BẮT ĐẦU TỪ NHU CẦU CỦA BẠN</p>
            <h2>Bạn cần không gian nào?</h2>
          </div>
        </div>
        <div className="category-grid">
          {db.types
            .filter(
              (t) =>
                !t.hidden &&
                t.image &&
                rooms.some((r) => r.typeIds.includes(t.id)),
            )
            .sort((a, b) => a.order - b.order)
            .map((t) => (
              <Link
                className="category-card"
                key={t.id}
                href={`/studios?type=${t.id}`}
              >
                <StudioImage
                  src={t.image}
                  alt={`Không gian ${t.name.toLowerCase()}`}
                />
                <div>
                  <h3>{t.name}</h3>
                  <span>
                    {rooms.filter((r) => r.typeIds.includes(t.id)).length} không
                    gian mẫu
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <section className="container marketplace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KHÁM PHÁ KHÔNG GIAN</p>
            <h2>Studio dành cho ý tưởng của bạn</h2>
          </div>
          <Link href="/studios" className="text-link">
            Xem tất cả Studio
          </Link>
        </div>
        <div className="featured-grid">
          {rooms.slice(0, 4).map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
        <p className="demo-note">
          Danh sách mẫu để trải nghiệm tìm kiếm và đặt thuê. Hình ảnh minh họa
          được tạo cho bản demo.
        </p>
      </section>
      <section className="booking-how container marketplace-section">
        <div>
          <p className="eyebrow">TỪ Ý TƯỞNG ĐẾN BUỔI THUÊ</p>
          <h2>Đặt Studio trong ba bước</h2>
        </div>
        <ol>
          {[
            {
              title: "Tìm Studio",
              text: "Lọc theo khu vực, không gian và tiện ích.",
            },
            {
              title: "Chọn thời gian & thiết bị",
              text: "Kiểm tra lịch trống và xem đầy đủ chi phí.",
            },
            {
              title: "Gửi đơn & theo dõi",
              text: "Đặt cọc mô phỏng, chờ chủ Studio xác nhận.",
            },
          ].map((item, i) => (
            <li key={item.title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="container">
        <div className="host-cta">
          <div>
            <p className="eyebrow">DÀNH CHO CHỦ STUDIO</p>
            <h2>
              Ít việc quản lý hơn.
              <br />
              Nhiều thời gian cho không gian của bạn.
            </h2>
            <p>Quản lý phòng, đơn thuê, thiết bị và bảng giá tại một nơi.</p>
          </div>
          <Button asChild>
            <Link href="/become-a-host">Cho thuê Studio của bạn</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
function dateAvailable(db: Database, room: Room, date: string, now: number) {
  if (!date) return false;
  const studio = db.studios.find((s) => s.id === room.studioId)!;
  const startDay = vietnamInstant(date),
    rate = startingRate(db.rates, room.id, startDay + 12 * 3600000);
  if (!rate) return false;
  const duration =
    rate.unit === "session"
      ? studio.sessionMinutes
      : rate.unit === "day"
        ? 1440
        : Math.max(60, rate.minUnits * 60);
  for (
    let minute = room.openMinute;
    minute + duration <= (room.overnight ? 1440 : room.closeMinute);
    minute += studio.stepMinutes
  ) {
    const start = startDay + minute * 60000;
    if (
      checkAvailability(
        db,
        {
          roomId: room.id,
          rateId: rate.id,
          start,
          end: start + duration * 60000,
          participants: 1,
          equipment: [],
        },
        now,
      ).ok
    )
      return true;
  }
  return false;
}
const filterKeys = [
  "location",
  "type",
  "date",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "capacity",
  "amenities",
];
function Filters({
  onApply,
}: {
  onApply?: (values: Record<string, string>) => void;
}) {
  const { db } = useApp(),
    { params, update } = useUrlState();
  const prefix = useId();
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(filterKeys.map((k) => [k, params.get(k) ?? ""])),
  );
  if (!db) return null;
  const value = (key: string) =>
    onApply ? draft[key] : (params.get(key) ?? "");
  const change = (key: string, v: string) =>
    onApply
      ? setDraft((d) => ({ ...d, [key]: v }))
      : update({ [key]: v }, true);
  const selected = value("amenities").split(",").filter(Boolean);
  return (
    <form
      className="filters"
      onSubmit={(e) => {
        e.preventDefault();
        onApply?.(draft);
      }}
    >
      <Field label="Khu vực" id={`${prefix}-filter-location`}>
        <Input
          value={value("location")}
          onChange={(e) => change("location", e.target.value)}
          placeholder="Thành phố, quận…"
        />
      </Field>
      <Field label="Loại Studio" id={`${prefix}-filter-type`}>
        <Select
          value={value("type")}
          onChange={(e) => change("type", e.target.value)}
        >
          <option value="">Tất cả loại</option>
          {db.types
            .filter((t) => !t.hidden)
            .map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Ngày thuê" id={`${prefix}-filter-date`}>
        <Input
          type="date"
          min={localDate()}
          value={value("date")}
          onChange={(e) => change("date", e.target.value)}
        />
      </Field>
      <fieldset>
        <legend>Giá thuê theo đơn vị (đ)</legend>
        <div className="form-grid">
          <Field label="Từ" id={`${prefix}-filter-min-price`}>
            <Input
              type="number"
              min={0}
              value={value("minPrice")}
              onChange={(e) => change("minPrice", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Đến" id={`${prefix}-filter-max-price`}>
            <Input
              type="number"
              min={0}
              value={value("maxPrice")}
              onChange={(e) => change("maxPrice", e.target.value)}
              placeholder="Không giới hạn"
            />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend>Diện tích (m²)</legend>
        <div className="form-grid">
          <Field label="Tối thiểu" id={`${prefix}-filter-min-area`}>
            <Input
              type="number"
              min={0}
              value={value("minArea")}
              onChange={(e) => change("minArea", e.target.value)}
            />
          </Field>
          <Field label="Tối đa" id={`${prefix}-filter-max-area`}>
            <Input
              type="number"
              min={0}
              value={value("maxArea")}
              onChange={(e) => change("maxArea", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>
      <Field label="Số người" id={`${prefix}-filter-capacity`}>
        <Input
          type="number"
          min={1}
          value={value("capacity")}
          onChange={(e) => change("capacity", e.target.value)}
        />
      </Field>
      <fieldset>
        <legend>Tiện ích</legend>
        {db.amenities
          .filter((a) => !a.hidden)
          .map((a) => (
            <label className="checkbox-label" key={a.id}>
              <input
                type="checkbox"
                checked={selected.includes(a.id)}
                onChange={(e) =>
                  change(
                    "amenities",
                    e.target.checked
                      ? [...selected, a.id].join(",")
                      : selected.filter((id) => id !== a.id).join(","),
                  )
                }
              />
              {a.name}
            </label>
          ))}
      </fieldset>
      {onApply && (
        <Button type="submit" className="full-width">
          Xem kết quả
        </Button>
      )}
    </form>
  );
}
export function SearchResults() {
  const { db, now } = useApp(),
    { params, update, query } = useUrlState();
  const [mobile, setMobile] = useState(false),
    [edit, setEdit] = useState(false);
  const rooms = useMemo(() => {
    if (!db) return [];
    const amenities = (params.get("amenities") ?? "")
        .split(",")
        .filter(Boolean),
      location = normalize(params.get("location") ?? ""),
      date = params.get("date");
    const list = db.rooms.filter((r) => {
      const studio = db.studios.find((s) => s.id === r.studioId)!,
        rate = startingRate(db.rates, r.id, now);
      return (
        ["bookable", "paused"].includes(getEffectiveRoomStatus(db, r, now)) &&
        (!location ||
          normalize(
            `${studio.city} ${studio.district} ${studio.address}`,
          ).includes(location)) &&
        (!params.get("type") || r.typeIds.includes(params.get("type")!)) &&
        (!params.get("minPrice") ||
          (rate?.price ?? 0) >= Number(params.get("minPrice"))) &&
        (!params.get("maxPrice") ||
          (rate?.price ?? Infinity) <= Number(params.get("maxPrice"))) &&
        (!params.get("minArea") || r.area >= Number(params.get("minArea"))) &&
        (!params.get("maxArea") || r.area <= Number(params.get("maxArea"))) &&
        (!params.get("capacity") ||
          r.capacity >= Number(params.get("capacity"))) &&
        amenities.every((id) => r.amenityIds.includes(id)) &&
        (!date || dateAvailable(db, r, date, now))
      );
    });
    const direction =
      params.get("sort") === "asc" ? 1 : params.get("sort") === "desc" ? -1 : 0;
    return direction
      ? list.sort(
          (a, b) =>
            ((startingRate(db.rates, a.id, now)?.price ?? 0) -
              (startingRate(db.rates, b.id, now)?.price ?? 0)) *
            direction,
        )
      : list;
  }, [db, params, now]);
  if (!db) return null;
  const page = Math.max(
    1,
    Math.min(
      Number(params.get("page")) || 1,
      Math.max(1, Math.ceil(rooms.length / 6)),
    ),
  );
  const active = filterKeys.filter((k) => !!params.get(k));
  return (
    <main id="main-content" tabIndex={-1} className="container results-page">
      <div className="search-summary">
        <span>
          <Search size={18} />
          {params.get("location") || "Tất cả khu vực"} ·{" "}
          {db.types.find((t) => t.id === params.get("type"))?.name ||
            "Tất cả loại Studio"}
          {params.get("date") && ` · ${params.get("date")}`}
        </span>
        <Button variant="ghost" onClick={() => setEdit(true)}>
          Thay đổi tìm kiếm
        </Button>
      </div>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Thay đổi tìm kiếm</DialogTitle>
          <DialogDescription>
            Chọn lại tiêu chí tìm kiếm Studio.
          </DialogDescription>
          <SearchForm compact onDone={() => setEdit(false)} />
        </DialogContent>
      </Dialog>
      <div className="results-layout">
        <aside className="filter-sidebar">
          <div className="section-heading">
            <h2>Bộ lọc</h2>
            <Button
              variant="ghost"
              onClick={() =>
                update(
                  Object.fromEntries(filterKeys.map((k) => [k, null])),
                  true,
                )
              }
            >
              Xóa tất cả
            </Button>
          </div>
          <Filters />
        </aside>
        <section className="results-main">
          <div className="section-heading">
            <div>
              <h1>Khám phá Studio</h1>
              <p className="muted" role="status">
                {rooms.length} không gian phù hợp
              </p>
            </div>
            <Field label="Sắp xếp" id="results-sort">
              <Select
                value={params.get("sort") ?? "default"}
                onChange={(e) => update({ sort: e.target.value }, true)}
              >
                <option value="default">Mặc định</option>
                <option value="asc">Giá tăng dần</option>
                <option value="desc">Giá giảm dần</option>
              </Select>
            </Field>
          </div>
          <div className="active-filters">
            {active.map((key) => (
              <button
                className="filter-chip"
                key={key}
                onClick={() => update({ [key]: null }, true)}
                aria-label={`Xóa bộ lọc ${key}`}
              >
                {key === "type"
                  ? db.types.find((t) => t.id === params.get(key))?.name
                  : key === "amenities"
                    ? "Tiện ích đã chọn"
                    : `${({ location: "Khu vực", date: "Ngày", minPrice: "Giá từ", maxPrice: "Giá đến", minArea: "Diện tích từ", maxArea: "Diện tích đến", capacity: "Số người" } as Record<string, string>)[key]}: ${params.get(key)}`}{" "}
                ×
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="mobile-filter-button"
            onClick={() => setMobile(true)}
          >
            <SlidersHorizontal size={18} /> Bộ lọc{" "}
            {active.length > 0 && `(${active.length})`}
          </Button>
          <Dialog open={mobile} onOpenChange={setMobile}>
            <DialogContent variant="sheet">
              <DialogTitle>Bộ lọc</DialogTitle>
              <DialogDescription>
                Lọc không gian theo nhu cầu của bạn.
              </DialogDescription>
              <Filters
                onApply={(values) => {
                  update(values, true);
                  setMobile(false);
                }}
              />
            </DialogContent>
          </Dialog>
          {rooms.length ? (
            <div className="results-list">
              {rooms.slice((page - 1) * 6, page * 6).map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  horizontal
                  returnTo={`/studios${query ? `?${query}` : ""}`}
                  availability={
                    params.get("date")
                      ? "Có khoảng trống trong ngày"
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa tìm thấy không gian phù hợp"
              description="Thử mở rộng khu vực hoặc giảm bớt bộ lọc."
            />
          )}
          <Pagination
            page={page}
            total={rooms.length}
            pageSize={6}
            onChange={(page) => update({ page })}
          />
        </section>
      </div>
    </main>
  );
}
export function AvailabilityCard({ room, db }: { room: Room; db: Database }) {
  const { now, service, user } = useApp(),
    router = useRouter();
  const [request, setRequest] = useState(() => defaultRequest(db, room, now)),
    [checked, setChecked] = useState<string | null>(null);
  const studio = db.studios.find((s) => s.id === room.studioId)!;
  const result =
    checked === JSON.stringify(request)
      ? checkAvailability(db, request, now)
      : null;
  const reference = startingRate(db.rates, room.id, now);
  function begin() {
    if (!result?.ok) return;
    service.saveDraft(room.slug, {
      ...request,
      step: 1,
      notes: "",
      contact: {
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
      },
      acknowledged: false,
    });
    router.push(`/booking/${room.slug}`);
  }
  return (
    <div className="availability-card surface" id="availability">
      <p className="reference-price">
        {reference ? (
          <>
            <strong>{money(reference.price)}</strong> /{" "}
            {unitLabels[reference.unit]}
          </>
        ) : (
          "Chưa có giá áp dụng"
        )}
      </p>
      <h2>Chọn thời gian thuê</h2>
      <RentalFields
        request={request}
        onChange={(value) => {
          setRequest(value);
          setChecked(null);
        }}
        room={room}
        studio={studio}
        db={db}
        prefix="detail"
      />
      <Button
        variant="outline"
        className="full-width"
        onClick={() => setChecked(JSON.stringify(request))}
      >
        Kiểm tra lịch trống
      </Button>
      {result && (
        <div
          className={`notice ${result.ok ? "notice-success" : "notice-error"}`}
          role="status"
        >
          {result.ok ? (
            <>
              <Check size={16} /> Thời gian này có thể đặt
            </>
          ) : (
            result.message
          )}
        </div>
      )}
      {result?.ok && (
        <>
          <PriceBreakdown price={result.value} />
          <Button className="full-width" onClick={begin}>
            Đặt thuê Studio
          </Button>
        </>
      )}
      <p className="field-hint">
        Đặt cọc mô phỏng {studio.depositPercent}%. Chờ chủ Studio xác nhận sau
        khi đặt cọc.
      </p>
    </div>
  );
}
export function RoomDetail({ slug }: { slug: string }) {
  const { db, now } = useApp(),
    params = useSearchParams();
  const [gallery, setGallery] = useState(false),
    [photo, setPhoto] = useState(0);
  if (!db) return null;
  const room = db.rooms.find((r) => r.slug === slug);
  if (
    !room ||
    ["hidden", "incomplete"].includes(getEffectiveRoomStatus(db, room, now))
  )
    return (
      <main id="main-content" tabIndex={-1} className="container">
        <EmptyState
          title="Phòng hiện không khả dụng"
          description="Phòng không tồn tại hoặc đang ẩn. Bạn có thể tìm một không gian khác."
          href="/studios"
          action="Tìm Studio khác"
        />
      </main>
    );
  const studio = db.studios.find((s) => s.id === room.studioId)!,
    owner = db.users.find((u) => u.id === studio.ownerId)!;
  const back =
    params.get("returnTo")?.startsWith("/studios") &&
    !params.get("returnTo")?.startsWith("//")
      ? params.get("returnTo")!
      : "/studios";
  const paused = getEffectiveRoomStatus(db, room, now) === "paused";
  const starting = startingRate(db.rates, room.id, now);
  return (
    <main id="main-content" tabIndex={-1} className="container detail-page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href={back}>Kết quả</Link>
        <span>/</span>
        <span>{studio.name}</span>
      </nav>
      <PageHeading
        eyebrow={studio.name}
        title={room.name}
        description={`${studio.district}, ${studio.city} · ${room.area} m² · Tối đa ${room.capacity} người`}
      />
      {paused && (
        <div className="notice">Phòng đang tạm ngừng nhận đơn mới.</div>
      )}
      <div className="mosaic">
        {room.images.slice(0, 5).map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setPhoto(index);
              setGallery(true);
            }}
            aria-label={`Xem ảnh ${index + 1} của ${room.name}`}
          >
            <StudioImage
              src={image}
              alt={`${room.name} — góc nhìn ${index + 1}`}
            />
          </button>
        ))}
        <Button
          variant="outline"
          className="gallery-button"
          onClick={() => setGallery(true)}
        >
          Xem tất cả ảnh
        </Button>
      </div>
      <Dialog open={gallery} onOpenChange={setGallery}>
        <DialogContent
          variant="gallery"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight")
              setPhoto((p) => (p + 1) % room.images.length);
            if (e.key === "ArrowLeft")
              setPhoto(
                (p) => (p - 1 + room.images.length) % room.images.length,
              );
          }}
        >
          <DialogTitle>{room.name}</DialogTitle>
          <DialogDescription>
            Ảnh {photo + 1} / {room.images.length}. Dùng phím trái và phải để
            chuyển ảnh.
          </DialogDescription>
          <StudioImage
            key={photo}
            src={room.images[photo]}
            alt={`${room.name}, ảnh ${photo + 1}`}
          />
          <div className="gallery-navigation">
            <Button
              variant="outline"
              aria-label="Ảnh trước"
              onClick={() =>
                setPhoto(
                  (p) => (p - 1 + room.images.length) % room.images.length,
                )
              }
            >
              <ChevronLeft />
            </Button>
            <span aria-live="polite">
              {photo + 1} / {room.images.length}
            </span>
            <Button
              variant="outline"
              aria-label="Ảnh tiếp theo"
              onClick={() => setPhoto((p) => (p + 1) % room.images.length)}
            >
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="detail-layout">
        <div className="detail-content">
          <section>
            <h2>Không gian của bạn</h2>
            <div className="room-meta">
              <span>
                <Maximize size={18} />
                {room.area} m²
              </span>
              <span>
                <Users size={18} />
                {room.capacity} người
              </span>
              <span>
                <Aperture size={18} />
                {room.typeIds
                  .map((id) => db.types.find((t) => t.id === id)?.name)
                  .join(" · ")}
              </span>
            </div>
            <p>{room.description}</p>
          </section>
          <section>
            <h2>Tiện ích</h2>
            <div className="amenity-grid">
              {room.amenityIds.map((id) => (
                <span key={id}>
                  <Check size={17} />
                  {db.amenities.find((a) => a.id === id)?.name}
                </span>
              ))}
            </div>
          </section>
          <section>
            <h2>Thiết bị & nội thất tùy chọn</h2>
            {db.equipment.filter(
              (e) => e.studioId === studio.id && e.status === "available",
            ).length ? (
              <div className="equipment-preview">
                {db.equipment
                  .filter(
                    (e) => e.studioId === studio.id && e.status === "available",
                  )
                  .map((e) => (
                    <div key={e.id}>
                      <StudioImage src={e.image} alt={e.name} />
                      <h3>{e.name}</h3>
                      <p>
                        {money(e.price)}/{unitLabels[e.unit]}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="muted">
                Studio này không có thiết bị thuê thêm. Bạn có thể mang thiết bị
                của mình.
              </p>
            )}
          </section>
          <section>
            <h2>Bảng giá thuê</h2>
            <div className="rate-list">
              {db.rates
                .filter((r) => r.roomId === room.id && r.active)
                .map((rate) => (
                  <div key={rate.id}>
                    <span>
                      {rate.name}
                      {["half-day", "week", "month"].includes(rate.unit) && (
                        <small>Chỉ tham khảo · Chưa đặt trực tuyến</small>
                      )}
                    </span>
                    <strong>
                      {money(rate.price)}/{unitLabels[rate.unit]}
                    </strong>
                  </div>
                ))}
            </div>
          </section>
          <section>
            <h2>Chủ Studio & địa điểm</h2>
            <p>
              <Building2 size={18} className="inline-icon" /> {studio.name} ·{" "}
              {owner.name}
            </p>
            <p>{studio.address}</p>
            <a className="text-link" href={`tel:${studio.phone}`}>
              {studio.phone}
            </a>
          </section>
          <section>
            <h2>Quy định thuê</h2>
            <p>{studio.rules}</p>
            <p className="muted">
              Cài đặt demo · Dọn phòng {room.cleaningMinutes} phút sau mỗi buổi.{" "}
              {room.overnight
                ? "Hỗ trợ thuê liên tục qua đêm."
                : "Không hỗ trợ thuê qua đêm."}
            </p>
          </section>
        </div>
        <aside className="booking-aside">
          <AvailabilityCard room={room} db={db} />
        </aside>
      </div>
      <div className="mobile-booking-bar">
        <span>
          {starting ? money(starting.price) : "Chưa có giá áp dụng"}
          {starting && <small>/ {unitLabels[starting.unit]}</small>}
        </span>
        <Button asChild>
          <a href="#availability">Chọn thời gian</a>
        </Button>
      </div>
    </main>
  );
}
export function BecomeHost() {
  const { user } = useApp();
  return (
    <main id="main-content" tabIndex={-1} className="container become-host">
      <PageHeading
        eyebrow="DÀNH CHO CHỦ STUDIO"
        title="Một nơi để quản lý Studio của bạn."
        description="Từ bảng giá đến lịch thuê, giữ công việc vận hành rõ ràng."
      />
      <div className="host-benefits">
        {[
          {
            title: "Phòng & không gian",
            text: "Cập nhật hình ảnh, sức chứa, tiện ích và trạng thái nhận đơn.",
          },
          {
            title: "Đơn thuê & lịch đặt",
            text: "Xem lịch, xác nhận yêu cầu và theo dõi những buổi thuê sắp tới.",
          },
          {
            title: "Thiết bị & bảng giá",
            text: "Quản lý tồn kho dùng chung và giá thuê theo giờ, buổi hoặc ngày.",
          },
        ].map((b) => (
          <section key={b.title}>
            <h2>{b.title}</h2>
            <p>{b.text}</p>
          </section>
        ))}
      </div>
      <div className="surface">
        <h2>Bắt đầu bằng hồ sơ Chủ Studio</h2>
        <p>
          Đăng ký tài khoản và mô tả studio dự kiến. Sau khi được duyệt trong
          bản demo, bạn tự tạo studio đầu tiên.
        </p>
        <Button asChild>
          <Link
            href={
              user?.role === "host"
                ? user.approval === "approved" && !user.locked
                  ? "/host"
                  : "/account/status"
                : "/register/host"
            }
          >
            {user?.role === "host"
              ? "Vào khu vực Chủ Studio"
              : "Đăng ký Chủ Studio"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
