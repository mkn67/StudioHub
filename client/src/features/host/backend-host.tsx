"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Edit, Image as ImageIcon, Settings, DoorOpen, Lamp, Tags, Upload } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { apiRequest } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { Badge, EmptyState, PageHeading, StudioImage } from "@/components/shared/common";
import { money } from "@/lib/format";

export type StudioData = {
  studio_id: number;
  host_id: number;
  name: string;
  description: string | null;
  address: string;
  district: string;
  city: string;
  phone: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  total_rooms?: number;
  total_equipments?: number;
};

export type EquipmentCategory = {
  category_id: number;
  studio_id: number;
  name: string;
  description: string | null;
};

export type EquipmentItem = {
  equipment_id: number;
  studio_id: number;
  category_id: number;
  category_name?: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  pricing_unit: string;
  total_quantity: number;
  image_url: string | null;
  status: "active" | "maintenance" | "hidden";
};

export type SpaceType = {
  space_type_id: number;
  name: string;
  description: string | null;
};

export type Amenity = {
  amenity_id: number;
  name: string;
  icon: string | null;
};

export type RoomSummary = {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  capacity: number;
  thumbnail_url: string | null;
  rates: {
    rate_id: number;
    rate_unit: string;
    unit_minutes: number;
    unit_price: number;
    minimum_units: number;
    maximum_units: number | null;
  }[];
  images?: { image_id: number; image_url: string; is_primary: boolean }[];
};

type RoomDetailResponse = {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  capacity: number;
  ceiling_height: number | null;
  soundproof_level: string | null;
  power_specs: string | null;
  rules: string | null;
  space_types?: { space_type_id: number }[];
  amenities?: { amenity_id: number }[];
  images?: { image_id: number; image_url: string; is_primary: boolean }[];
  rates?: { rate_id: number; rate_unit: string; unit_price: number; minimum_units: number }[];
};

const unitLabel: Record<string, string> = {
  hour: "Giờ",
  half_day: "Nửa ngày",
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  session: "Buổi",
};

// ==========================================
// 1. HOST OVERVIEW
// ==========================================
export function BackendHostOverview() {
  const { user } = useApp();
  const [studios, setStudios] = useState<StudioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<StudioData[]>("/api/studios/mine")
      .then((data) => {
        if (active) setStudios(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Không tải được danh sách studio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <main className="container"><PageHeading title="Đang tải tổng quan..." /></main>;
  if (error) return <main className="container"><EmptyState title="Lỗi tải dữ liệu" description={error} /></main>;

  return (
    <main id="main-content" tabIndex={-1} className="container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Tổng quan Studio của bạn"
          description={`Chào mừng ${user?.name || "Chủ Studio"}! Quản lý các cơ sở và dịch vụ cho thuê.`}
        />
        <Button asChild>
          <Link href="/host/studio/settings?action=create">
            <Plus size={16} /> Thêm cơ sở Studio
          </Link>
        </Button>
      </div>

      {studios.length === 0 ? (
        <EmptyState
          title="Bạn chưa có cơ sở Studio nào"
          description="Bắt đầu đăng ký cơ sở Studio đầu tiên để đăng phòng và trang thiết bị."
          href="/host/studio/settings?action=create"
          action="Tạo cơ sở Studio ngay"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((s) => (
            <div key={s.studio_id} className="surface p-5 rounded-lg border space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  <Badge tone={s.status === "active" ? "success" : "neutral"}>
                    {s.status === "active" ? "Đang hoạt động" : "Tạm dừng"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{s.address}, {s.district}, {s.city}</p>
                <p className="text-xs text-muted-foreground">Điện thoại liên hệ: <strong>{s.phone}</strong></p>
                {s.description && <p className="text-xs text-slate-600 line-clamp-2">{s.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t text-sm font-semibold">
                <div className="bg-slate-50 p-2.5 rounded text-center">
                  <span className="block text-xs text-muted-foreground font-normal">Số phòng</span>
                  <span className="text-primary text-base font-bold">{s.total_rooms ?? 0}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded text-center">
                  <span className="block text-xs text-muted-foreground font-normal">Thiết bị</span>
                  <span className="text-primary text-base font-bold">{s.total_equipments ?? 0}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/host/rooms?studio_id=${s.studio_id}`}>
                    <DoorOpen size={14} /> Phòng
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/host/equipment?studio_id=${s.studio_id}`}>
                    <Lamp size={14} /> Thiết bị
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/host/studio/settings?id=${s.studio_id}`} title="Cài đặt">
                    <Settings size={14} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ==========================================
// 2. HOST ROOMS LIST
// ==========================================
export function BackendHostRooms() {
  const searchParams = useSearchParams();
  const [studios, setStudios] = useState<StudioData[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<number>(0);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<StudioData[]>("/api/studios/mine")
      .then((data) => {
        setStudios(data);
        const paramId = Number(searchParams.get("studio_id"));
        if (paramId && data.some((s) => s.studio_id === paramId)) {
          setSelectedStudioId(paramId);
        } else if (data.length > 0) {
          setSelectedStudioId(data[0].studio_id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải studio"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    if (!selectedStudioId) return;
    apiRequest<{ items: RoomSummary[] }>(`/api/rooms?studio_id=${selectedStudioId}&limit=50`)
      .then((res) => {
        if (active) setRooms(res.items);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Lỗi tải phòng");
      });
    return () => {
      active = false;
    };
  }, [selectedStudioId]);

  return (
    <main id="main-content" tabIndex={-1} className="container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Quản lý Phòng Studio"
          description="Danh sách phòng thuộc các cơ sở Studio của bạn."
        />
        <Button asChild>
          <Link href={`/host/rooms/new${selectedStudioId ? `?studio_id=${selectedStudioId}` : ""}`}>
            <Plus size={16} /> Thêm phòng mới
          </Link>
        </Button>
      </div>

      {studios.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="studio-filter" className="font-semibold text-sm">Cơ sở Studio:</label>
          <Select
            id="studio-filter"
            value={selectedStudioId}
            onChange={(e) => setSelectedStudioId(Number(e.target.value))}
            className="w-64"
          >
            {studios.map((s) => (
              <option key={s.studio_id} value={s.studio_id}>{s.name}</option>
            ))}
          </Select>
        </div>
      )}

      {error ? <EmptyState title="Lỗi tải dữ liệu" description={error} /> : null}

      {!loading && rooms.length === 0 ? (
        <EmptyState
          title="Cơ sở này chưa có phòng nào"
          description="Thêm phòng chụp hoặc phòng quay đầu tiên để bắt đầu nhận đơn."
          href={`/host/rooms/new?studio_id=${selectedStudioId}`}
          action="Tạo phòng mới"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((r) => (
            <div key={r.room_id} className="surface rounded-lg border overflow-hidden flex flex-col justify-between">
              <div className="h-44 bg-slate-100 relative">
                <StudioImage src={r.thumbnail_url ?? undefined} alt={r.name} />
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-lg">
                  <Link href={`/rooms/${r.room_id}`} className="hover:underline">{r.name}</Link>
                </h3>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Diện tích: <strong>{r.area} m²</strong></span>
                  <span>Sức chứa: <strong>{r.capacity} người</strong></span>
                </div>
                {r.description && <p className="text-xs text-slate-600 line-clamp-2">{r.description}</p>}
                
                <div className="pt-2 border-t text-xs space-y-1">
                  <strong className="block text-foreground">Bảng giá áp dụng:</strong>
                  {r.rates && r.rates.length > 0 ? (
                    r.rates.map((rate) => (
                      <div key={rate.rate_id} className="flex justify-between">
                        <span>{unitLabel[rate.rate_unit] ?? rate.rate_unit}</span>
                        <strong className="text-primary">{money(rate.unit_price)}</strong>
                      </div>
                    ))
                  ) : (
                    <span className="text-amber-600 italic">Chưa có bảng giá</span>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/host/rooms/${r.room_id}/edit`}>
                    <Edit size={14} /> Chỉnh sửa & Giá
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/rooms/${r.room_id}`}>Xem trang phòng</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ==========================================
// 3. HOST ROOM EDITOR (Create & Edit)
// ==========================================
export function BackendHostRoomEditor({ id }: { id?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [studios, setStudios] = useState<StudioData[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [studioId, setStudioId] = useState<number>(0);
  const [name, setName] = useState("");
  const [area, setArea] = useState<number>(50);
  const [capacity, setCapacity] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [ceilingHeight, setCeilingHeight] = useState<number | undefined>(undefined);
  const [soundproofLevel, setSoundproofLevel] = useState("");
  const [powerSpecs, setPowerSpecs] = useState("");
  const [rules, setRules] = useState("");
  const [selectedSpaceTypes, setSelectedSpaceTypes] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);

  // Room images & rates (for edit mode)
  const [images, setImages] = useState<{ image_id: number; image_url: string; is_primary: boolean }[]>([]);
  const [rates, setRates] = useState<{ rate_id: number; rate_unit: string; unit_price: number; minimum_units: number }[]>([]);

  // Rate creation form
  const [newRateUnit, setNewRateUnit] = useState("hour");
  const [newRatePrice, setNewRatePrice] = useState<number>(300000);
  const [newRateMin, setNewRateMin] = useState<number>(1);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [myStudios, stList, amList] = await Promise.all([
          apiRequest<StudioData[]>("/api/studios/mine"),
          apiRequest<SpaceType[]>("/api/space-types").catch(() => []),
          apiRequest<Amenity[]>("/api/amenities").catch(() => []),
        ]);

        if (!active) return;
        setStudios(myStudios);
        setSpaceTypes(stList);
        setAmenities(amList);

        const initialStudioId = Number(searchParams.get("studio_id")) || myStudios[0]?.studio_id || 0;
        setStudioId(initialStudioId);

        if (id) {
          const roomData = await apiRequest<RoomDetailResponse>(`/api/rooms/${id}`);
          if (!active) return;
          setName(roomData.name);
          setStudioId(roomData.studio_id);
          setArea(roomData.area);
          setCapacity(roomData.capacity);
          setDescription(roomData.description ?? "");
          setCeilingHeight(roomData.ceiling_height ?? undefined);
          setSoundproofLevel(roomData.soundproof_level ?? "");
          setPowerSpecs(roomData.power_specs ?? "");
          setRules(roomData.rules ?? "");
          setSelectedSpaceTypes((roomData.space_types || []).map((t) => t.space_type_id));
          setSelectedAmenities((roomData.amenities || []).map((a) => a.amenity_id));
          setImages(roomData.images || []);
          setRates(roomData.rates || []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu phòng.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      studio_id: studioId,
      name: name.trim(),
      area: Number(area),
      capacity: Number(capacity),
      description: description.trim() || undefined,
      ceiling_height: ceilingHeight ? Number(ceilingHeight) : undefined,
      soundproof_level: soundproofLevel.trim() || undefined,
      power_specs: powerSpecs.trim() || undefined,
      rules: rules.trim() || undefined,
      space_type_ids: selectedSpaceTypes,
      amenity_ids: selectedAmenities,
    };

    try {
      if (id) {
        await apiRequest(`/api/rooms/${id}`, { method: "PATCH", body: payload });
      } else {
        const created = await apiRequest<{ room_id: number }>("/api/rooms", { method: "POST", body: payload });
        router.push(`/host/rooms/${created.room_id}/edit`);
        return;
      }
      router.push("/host/rooms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu phòng.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_primary", images.length === 0 ? "true" : "false");

    setUploadingImage(true);
    setError(null);
    try {
      const res = await apiRequest<{ image_id: number; image_url: string; is_primary: boolean }>(
        `/api/rooms/${id}/images`,
        { method: "POST", body: formData }
      );
      setImages((prev) => [...prev, res]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh lên.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setRateError(null);
    try {
      const createdRate = await apiRequest<{ rate_id: number; rate_unit: string; unit_price: number; minimum_units: number }>(
        `/api/rooms/${id}/rates`,
        {
          method: "POST",
          body: {
            rate_unit: newRateUnit,
            unit_price: Number(newRatePrice),
            minimum_units: Number(newRateMin),
          },
        }
      );
      setRates((prev) => [...prev, createdRate]);
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Lỗi tạo bảng giá.");
    }
  };

  if (loading) return <main className="container"><PageHeading title="Đang tải biểu mẫu phòng..." /></main>;

  return (
    <main id="main-content" tabIndex={-1} className="container max-w-4xl space-y-8">
      <PageHeading
        title={id ? `Chỉnh sửa: ${name}` : "Thêm phòng Studio mới"}
        description="Điền thông tin diện tích, sức chứa và thiết lập giá thuê."
      />

      <ErrorSummary error={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="surface p-6 rounded-lg border space-y-4">
          <h2 className="text-xl font-bold">Thông tin cơ bản</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cơ sở Studio" id="room-studio">
              <Select
                id="room-studio"
                value={studioId}
                onChange={(e) => setStudioId(Number(e.target.value))}
                disabled={!!id}
              >
                {studios.map((s) => (
                  <option key={s.studio_id} value={s.studio_id}>{s.name} ({s.district})</option>
                ))}
              </Select>
            </Field>

            <Field label="Tên phòng" id="room-name">
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Phòng Cyclorama Trắng"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Diện tích (m²)" id="room-area">
              <Input
                type="number"
                id="room-area"
                value={area}
                min={5}
                onChange={(e) => setArea(Number(e.target.value))}
                required
              />
            </Field>

            <Field label="Sức chứa tối đa (người)" id="room-capacity">
              <Input
                type="number"
                id="room-capacity"
                value={capacity}
                min={1}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />
            </Field>

            <Field label="Chiều cao trần (m)" id="room-height">
              <Input
                type="number"
                step="0.1"
                id="room-height"
                value={ceilingHeight ?? ""}
                onChange={(e) => setCeilingHeight(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="4.5"
              />
            </Field>
          </div>

          <Field label="Mô tả không gian" id="room-desc">
            <Textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả phong cách, ánh sáng tự nhiên, góc chụp nổi bật..."
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mức độ cách âm" id="room-soundproof">
              <Input
                id="room-soundproof"
                value={soundproofLevel}
                onChange={(e) => setSoundproofLevel(e.target.value)}
                placeholder="Ví dụ: Cách âm tiêu chuẩn 35dB, Studio thu âm chuyên dụng"
              />
            </Field>

            <Field label="Công suất nguồn điện" id="room-power">
              <Input
                id="room-power"
                value={powerSpecs}
                onChange={(e) => setPowerSpecs(e.target.value)}
                placeholder="Ví dụ: Điện 3 pha 32A, 10 ổ cắm công nghiệp"
              />
            </Field>
          </div>

          <Field label="Quy định sử dụng phòng" id="room-rules">
            <Textarea
              id="room-rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Ví dụ: Không mang giày dơ lên phông vô cực, dọn rác sau buổi chụp..."
              rows={3}
            />
          </Field>
        </section>

        {/* Space types & Amenities */}
        <section className="surface p-6 rounded-lg border space-y-4">
          <h2 className="text-xl font-bold">Loại không gian & Tiện ích</h2>

          {spaceTypes.length > 0 && (
            <div>
              <span className="font-semibold text-sm block mb-2">Loại không gian:</span>
              <div className="flex flex-wrap gap-2">
                {spaceTypes.map((st) => {
                  const selected = selectedSpaceTypes.includes(st.space_type_id);
                  return (
                    <button
                      key={st.space_type_id}
                      type="button"
                      onClick={() => {
                        setSelectedSpaceTypes((prev) =>
                          selected ? prev.filter((x) => x !== st.space_type_id) : [...prev, st.space_type_id]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        selected ? "bg-primary text-white border-primary" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {st.name} {selected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {amenities.length > 0 && (
            <div>
              <span className="font-semibold text-sm block mb-2">Tiện ích đi kèm:</span>
              <div className="flex flex-wrap gap-2">
                {amenities.map((am) => {
                  const selected = selectedAmenities.includes(am.amenity_id);
                  return (
                    <button
                      key={am.amenity_id}
                      type="button"
                      onClick={() => {
                        setSelectedAmenities((prev) =>
                          selected ? prev.filter((x) => x !== am.amenity_id) : [...prev, am.amenity_id]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        selected ? "bg-primary text-white border-primary" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {am.name} {selected && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-between items-center">
          <Button variant="outline" asChild>
            <Link href="/host/rooms">Quay lại danh sách</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : id ? "Lưu thay đổi phòng" : "Tạo phòng và tiếp tục"}
          </Button>
        </div>
      </form>

      {/* EDIT MODE SECTIONS: IMAGES & RATES */}
      {id && (
        <div className="space-y-6 pt-4 border-t">
          {/* Images Section */}
          <section className="surface p-6 rounded-lg border space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon size={20} /> Hình ảnh phòng
            </h2>

            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                <Button type="button" variant="outline" asChild disabled={uploadingImage}>
                  <span>
                    <Upload size={16} /> {uploadingImage ? "Đang tải ảnh lên…" : "Tải ảnh JPG / PNG / WebP"}
                  </span>
                </Button>
              </label>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Chưa có ảnh nào được tải lên cho phòng này.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.image_id} className="relative aspect-video rounded overflow-hidden border">
                    <StudioImage src={img.image_url} alt="Room photo" />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Ảnh chính
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rates Section */}
          <section className="surface p-6 rounded-lg border space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Tags size={20} /> Bảng giá áp dụng
            </h2>

            <ErrorSummary error={rateError} />

            <div className="space-y-2">
              {rates.map((rate) => (
                <div key={rate.rate_id} className="flex justify-between items-center p-3 border rounded bg-slate-50 text-sm">
                  <div>
                    <strong>{unitLabel[rate.rate_unit] ?? rate.rate_unit}</strong>
                    <span className="text-xs text-muted-foreground ml-2">
                      (Tối thiểu {rate.minimum_units} {unitLabel[rate.rate_unit] ?? rate.rate_unit})
                    </span>
                  </div>
                  <strong className="text-primary text-base">{money(rate.unit_price)}</strong>
                </div>
              ))}
            </div>

            {/* Add Rate Form */}
            <form onSubmit={handleCreateRate} className="pt-4 border-t space-y-3">
              <span className="font-semibold text-sm block">Thêm gói giá mới:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <Field label="Đơn vị tính" id="rate-unit">
                  <Select value={newRateUnit} onChange={(e) => setNewRateUnit(e.target.value)}>
                    <option value="hour">Theo giờ (hour)</option>
                    <option value="half_day">Nửa ngày (half_day)</option>
                    <option value="day">Theo ngày (day)</option>
                    <option value="session">Theo buổi (session)</option>
                    <option value="week">Theo tuần (week)</option>
                    <option value="month">Theo tháng (month)</option>
                  </Select>
                </Field>

                <Field label="Đơn giá (VND)" id="rate-price">
                  <Input
                    type="number"
                    id="rate-price"
                    min={0}
                    step={10000}
                    value={newRatePrice}
                    onChange={(e) => setNewRatePrice(Number(e.target.value))}
                    required
                  />
                </Field>

                <Field label="Số lượng tối thiểu" id="rate-min">
                  <Input
                    type="number"
                    id="rate-min"
                    min={1}
                    value={newRateMin}
                    onChange={(e) => setNewRateMin(Number(e.target.value))}
                    required
                  />
                </Field>

                <Button type="submit">
                  <Plus size={16} /> Thêm giá
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

// ==========================================
// 4. HOST EQUIPMENT & CATEGORIES
// ==========================================
export function BackendHostEquipment() {
  const searchParams = useSearchParams();
  const [studios, setStudios] = useState<StudioData[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<number>(0);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);

  // Add category state
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Add/Edit equipment state
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipmentItem | null>(null);
  const [eqCategoryId, setEqCategoryId] = useState<number>(0);
  const [eqName, setEqName] = useState("");
  const [eqBrand, setEqBrand] = useState("");
  const [eqPrice, setEqPrice] = useState<number>(50000);
  const [eqPricingUnit, setEqPricingUnit] = useState<string>("hour");
  const [eqQty, setEqQty] = useState<number>(2);
  const [eqStatus, setEqStatus] = useState<"active" | "maintenance" | "hidden">("active");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<StudioData[]>("/api/studios/mine")
      .then((data) => {
        setStudios(data);
        const paramId = Number(searchParams.get("studio_id"));
        if (paramId && data.some((s) => s.studio_id === paramId)) {
          setSelectedStudioId(paramId);
        } else if (data.length > 0) {
          setSelectedStudioId(data[0].studio_id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải studio"));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    if (selectedStudioId) {
      Promise.all([
        apiRequest<EquipmentCategory[]>(`/api/equipment-categories?studio_id=${selectedStudioId}`),
        apiRequest<EquipmentItem[]>(`/api/equipments?studio_id=${selectedStudioId}`),
      ])
        .then(([cats, eqs]) => {
          if (!active) return;
          setCategories(cats);
          setEquipments(eqs);
          if (cats.length > 0) {
            setEqCategoryId(cats[0].category_id);
          }
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Lỗi tải thiết bị.");
        });
    }
    return () => {
      active = false;
    };
  }, [selectedStudioId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !selectedStudioId) return;
    setCatSaving(true);
    try {
      const created = await apiRequest<EquipmentCategory>("/api/equipment-categories", {
        method: "POST",
        body: { studio_id: selectedStudioId, name: newCatName.trim() },
      });
      setCategories((prev) => [...prev, created]);
      setNewCatName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được danh mục.");
    } finally {
      setCatSaving(false);
    }
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudioId || !eqCategoryId || !eqName.trim()) return;

    setError(null);
    try {
      if (editingEquip) {
        const updated = await apiRequest<EquipmentItem>(`/api/equipments/${editingEquip.equipment_id}`, {
          method: "PATCH",
          body: {
            category_id: eqCategoryId,
            name: eqName.trim(),
            brand: eqBrand.trim() || undefined,
            unit_price: Number(eqPrice),
            pricing_unit: eqPricingUnit,
            total_quantity: Number(eqQty),
            status: eqStatus,
          },
        });
        setEquipments((prev) => prev.map((item) => (item.equipment_id === updated.equipment_id ? updated : item)));
      } else {
        const created = await apiRequest<EquipmentItem>("/api/equipments", {
          method: "POST",
          body: {
            studio_id: selectedStudioId,
            category_id: eqCategoryId,
            name: eqName.trim(),
            brand: eqBrand.trim() || undefined,
            unit_price: Number(eqPrice),
            pricing_unit: eqPricingUnit,
            total_quantity: Number(eqQty),
          },
        });
        setEquipments((prev) => [...prev, created]);
      }
      setShowEquipModal(false);
      setEditingEquip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu thiết bị.");
    }
  };

  const openCreateModal = () => {
    setEditingEquip(null);
    setEqName("");
    setEqBrand("");
    setEqPrice(50000);
    setEqPricingUnit("hour");
    setEqQty(2);
    setEqStatus("active");
    if (categories.length > 0) setEqCategoryId(categories[0].category_id);
    setShowEquipModal(true);
  };

  const openEditModal = (item: EquipmentItem) => {
    setEditingEquip(item);
    setEqCategoryId(item.category_id);
    setEqName(item.name);
    setEqBrand(item.brand ?? "");
    setEqPrice(item.unit_price);
    setEqPricingUnit(item.pricing_unit);
    setEqQty(item.total_quantity);
    setEqStatus(item.status);
    setShowEquipModal(true);
  };

  return (
    <main id="main-content" tabIndex={-1} className="container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Quản lý Thiết bị & Đạo cụ"
          description="Danh mục và kho thiết bị cho thuê kèm tại Studio."
        />
        <Button onClick={openCreateModal} disabled={categories.length === 0}>
          <Plus size={16} /> Thêm thiết bị mới
        </Button>
      </div>

      {studios.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="equip-studio" className="font-semibold text-sm">Cơ sở Studio:</label>
          <Select
            id="equip-studio"
            value={selectedStudioId}
            onChange={(e) => setSelectedStudioId(Number(e.target.value))}
            className="w-64"
          >
            {studios.map((s) => (
              <option key={s.studio_id} value={s.studio_id}>{s.name}</option>
            ))}
          </Select>
        </div>
      )}

      <ErrorSummary error={error} />

      {/* Category Creation Bar */}
      <section className="surface p-4 rounded-lg border space-y-3">
        <span className="font-semibold text-sm block">Danh mục thiết bị ({categories.length}):</span>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <Badge key={c.category_id} tone="neutral">
              {c.name}
            </Badge>
          ))}

          <form onSubmit={handleCreateCategory} className="flex gap-2 items-center ml-auto">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Tên nhóm mới..."
              className="w-44 h-8 text-xs"
              required
            />
            <Button size="sm" type="submit" disabled={catSaving}>
              <Plus size={14} /> Thêm nhóm
            </Button>
          </form>
        </div>
      </section>

      {/* Equipment List */}
      <section className="space-y-4">
        {equipments.length === 0 ? (
          <EmptyState
            title="Chưa có thiết bị nào trong kho"
            description="Hãy thêm nhóm danh mục và tạo thiết bị (đèn, softbox, phông nền, đạo cụ...) đầu tiên."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipments.map((item) => (
              <div key={item.equipment_id} className="surface p-4 rounded-lg border space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <strong className="font-bold text-base">{item.name}</strong>
                    <Badge tone={item.status === "active" ? "success" : "neutral"}>
                      {item.status === "active" ? "Sẵn sàng" : item.status === "maintenance" ? "Bảo trì" : "Ẩn"}
                    </Badge>
                  </div>
                  {item.brand && <span className="text-xs text-muted-foreground block">Hãng: {item.brand}</span>}
                  <div className="flex justify-between text-sm pt-2">
                    <span>Đơn giá:</span>
                    <strong className="text-primary">{money(item.unit_price)} / {unitLabel[item.pricing_unit] ?? item.pricing_unit}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tổng số lượng:</span>
                    <strong className="text-foreground">{item.total_quantity} cái</strong>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>
                    <Edit size={14} /> Chỉnh sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {showEquipModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg">
              {editingEquip ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}
            </h3>

            <form onSubmit={handleSaveEquipment} className="space-y-4">
              <Field label="Nhóm thiết bị" id="eq-cat">
                <Select
                  id="eq-cat"
                  value={eqCategoryId}
                  onChange={(e) => setEqCategoryId(Number(e.target.value))}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Tên thiết bị" id="eq-name">
                <Input
                  id="eq-name"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  placeholder="Ví dụ: Đèn Godox AD600 Pro"
                  required
                />
              </Field>

              <Field label="Thương hiệu (Brand)" id="eq-brand">
                <Input
                  id="eq-brand"
                  value={eqBrand}
                  onChange={(e) => setEqBrand(e.target.value)}
                  placeholder="Godox, Nanlite, Aputure..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Đơn giá (VND)" id="eq-price">
                  <Input
                    type="number"
                    id="eq-price"
                    min={0}
                    step={10000}
                    value={eqPrice}
                    onChange={(e) => setEqPrice(Number(e.target.value))}
                    required
                  />
                </Field>

                <Field label="Đơn vị tính" id="eq-unit">
                  <Select value={eqPricingUnit} onChange={(e) => setEqPricingUnit(e.target.value)}>
                    <option value="hour">Theo giờ</option>
                    <option value="session">Theo buổi</option>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tổng số lượng" id="eq-qty">
                  <Input
                    type="number"
                    id="eq-qty"
                    min={1}
                    value={eqQty}
                    onChange={(e) => setEqQty(Number(e.target.value))}
                    required
                  />
                </Field>

                {editingEquip && (
                  <Field label="Trạng thái" id="eq-status">
                    <Select
                      value={eqStatus}
                      onChange={(e) => setEqStatus(e.target.value as "active" | "maintenance" | "hidden")}
                    >
                      <option value="active">Sẵn sàng</option>
                      <option value="maintenance">Bảo trì</option>
                      <option value="hidden">Ẩn</option>
                    </Select>
                  </Field>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEquipModal(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  Lưu thiết bị
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// ==========================================
// 5. HOST SETTINGS & STUDIO PROFILE
// ==========================================
export function BackendHostSettings() {
  const searchParams = useSearchParams();

  const [studios, setStudios] = useState<StudioData[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<number>(0);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("TP. Hồ Chí Minh");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<StudioData[]>("/api/studios/mine")
      .then((data) => {
        if (!active) return;
        setStudios(data);

        const paramId = Number(searchParams.get("id"));
        const shouldCreate = searchParams.get("action") === "create" || data.length === 0;

        if (shouldCreate) {
          setIsCreatingNew(true);
        } else {
          const current = (paramId && data.find((s) => s.studio_id === paramId)) || data[0];
          if (current) {
            setSelectedStudioId(current.studio_id);
            setName(current.name);
            setAddress(current.address);
            setDistrict(current.district);
            setCity(current.city);
            setPhone(current.phone);
            setDescription(current.description ?? "");
            setStatus(current.status);
          }
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Lỗi tải studio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectStudio = (id: number) => {
    setSelectedStudioId(id);
    const current = studios.find((s) => s.studio_id === id);
    if (current) {
      setName(current.name);
      setAddress(current.address);
      setDistrict(current.district);
      setCity(current.city);
      setPhone(current.phone);
      setDescription(current.description ?? "");
      setStatus(current.status);
    }
  };

  const startCreateNew = () => {
    setIsCreatingNew(true);
    setName("");
    setAddress("");
    setDistrict("");
    setPhone("");
    setDescription("");
    setStatus("active");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      name: name.trim(),
      address: address.trim(),
      district: district.trim(),
      city: city.trim(),
      phone: phone.trim(),
      description: description.trim() || undefined,
      status,
    };

    try {
      if (isCreatingNew) {
        const created = await apiRequest<StudioData>("/api/studios", { method: "POST", body: payload });
        setStudios((prev) => [...prev, created]);
        setSelectedStudioId(created.studio_id);
        setIsCreatingNew(false);
      } else {
        const updated = await apiRequest<StudioData>(`/api/studios/${selectedStudioId}`, {
          method: "PATCH",
          body: payload,
        });
        setStudios((prev) => prev.map((s) => (s.studio_id === updated.studio_id ? updated : s)));
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật studio.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="container"><PageHeading title="Đang tải thông tin studio..." /></main>;

  return (
    <main id="main-content" tabIndex={-1} className="container max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title={isCreatingNew ? "Đăng ký cơ sở Studio mới" : "Cài đặt cơ sở Studio"}
          description="Quản lý địa chỉ, số điện thoại liên hệ và giới thiệu cơ sở."
        />
        {!isCreatingNew && (
          <Button variant="outline" onClick={startCreateNew}>
            <Plus size={16} /> Thêm cơ sở khác
          </Button>
        )}
      </div>

      {!isCreatingNew && studios.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="select-studio-setting" className="font-semibold text-sm">Chọn cơ sở:</label>
          <Select
            id="select-studio-setting"
            value={selectedStudioId}
            onChange={(e) => selectStudio(Number(e.target.value))}
            className="w-64"
          >
            {studios.map((s) => (
              <option key={s.studio_id} value={s.studio_id}>{s.name}</option>
            ))}
          </Select>
        </div>
      )}

      <ErrorSummary error={error} />
      {success && (
        <div className="notice notice-success">
          ✓ Đã lưu thông tin cơ sở Studio thành công!
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface p-6 rounded-lg border space-y-4">
        <Field label="Tên cơ sở Studio" id="studio-name">
          <Input
            id="studio-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Artemis Creative Hub"
            required
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Field label="Địa chỉ cụ thể" id="studio-address">
              <Input
                id="studio-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="142 Nguyễn Thị Minh Khai, Phường 6"
                required
              />
            </Field>
          </div>

          <Field label="Quận / Huyện" id="studio-district">
            <Input
              id="studio-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Quận 3"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Thành phố" id="studio-city">
            <Input
              id="studio-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="TP. Hồ Chí Minh"
              required
            />
          </Field>

          <Field label="Số điện thoại liên hệ" id="studio-phone">
            <Input
              id="studio-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              required
            />
          </Field>
        </div>

        <Field label="Mô tả về Studio" id="studio-description">
          <Textarea
            id="studio-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tổ hợp không gian sáng tạo chuyên nghiệp..."
            rows={4}
          />
        </Field>

        {!isCreatingNew && (
          <Field label="Trạng thái hoạt động" id="studio-status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">Đang hoạt động (active)</option>
              <option value="inactive">Tạm dừng nhận đơn (inactive)</option>
            </Select>
          </Field>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          {isCreatingNew && studios.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setIsCreatingNew(false)}>
              Quay lại danh sách
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : isCreatingNew ? "Tạo Studio" : "Cập nhật Studio"}
          </Button>
        </div>
      </form>
    </main>
  );
}

// ==========================================
// 6. HOST PRICING & RATES
// ==========================================
export function BackendHostPricing() {
  const [studios, setStudios] = useState<StudioData[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<number>(0);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(0);

  // New rate form state
  const [rateUnit, setRateUnit] = useState<string>("hour");
  const [unitPrice, setUnitPrice] = useState<number>(300000);
  const [minUnits, setMinUnits] = useState<number>(1);
  const [savingRate, setSavingRate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiRequest<StudioData[]>("/api/studios/mine")
      .then((data) => {
        setStudios(data);
        if (data.length > 0) setSelectedStudioId(data[0].studio_id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải studio"));
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedStudioId) {
      apiRequest<{ items: RoomSummary[] }>(`/api/rooms?studio_id=${selectedStudioId}&limit=50`)
        .then((res) => {
          if (!active) return;
          setRooms(res.items);
          if (res.items.length > 0) {
            setSelectedRoomId(res.items[0].room_id);
          }
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Lỗi tải danh sách phòng.");
        });
    }
    return () => {
      active = false;
    };
  }, [selectedStudioId]);

  const activeRoom = rooms.find((r) => r.room_id === selectedRoomId);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    setSavingRate(true);
    setError(null);
    setSuccess(false);

    try {
      const createdRate = await apiRequest<{
        rate_id: number;
        rate_unit: string;
        unit_price: number;
        minimum_units: number;
      }>(`/api/rooms/${selectedRoomId}/rates`, {
        method: "POST",
        body: {
          rate_unit: rateUnit,
          unit_price: Number(unitPrice),
          minimum_units: Number(minUnits),
        },
      });

      setRooms((prev) =>
        prev.map((r) =>
          r.room_id === selectedRoomId
            ? { ...r, rates: [...(r.rates || []), { ...createdRate, unit_minutes: 60, maximum_units: null }] }
            : r
        )
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo bảng giá.");
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="container max-w-4xl space-y-6">
      <PageHeading
        title="Quản lý Bảng giá"
        description="Thiết lập các gói giá (theo giờ, theo buổi, theo ngày) cho từng phòng Studio."
      />

      {studios.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="price-studio-select" className="font-semibold text-sm">Cơ sở Studio:</label>
          <Select
            id="price-studio-select"
            value={selectedStudioId}
            onChange={(e) => setSelectedStudioId(Number(e.target.value))}
            className="w-64"
          >
            {studios.map((s) => (
              <option key={s.studio_id} value={s.studio_id}>{s.name}</option>
            ))}
          </Select>
        </div>
      )}

      <ErrorSummary error={error} />
      {success && <div className="notice notice-success">✓ Đã thêm gói giá mới thành công!</div>}

      {rooms.length === 0 ? (
        <EmptyState
          title="Chưa có phòng nào để cấu hình bảng giá"
          description="Tạo phòng trước khi thêm các gói giá thuê."
          href={`/host/rooms/new?studio_id=${selectedStudioId}`}
          action="Tạo phòng ngay"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Room Selector Column */}
          <div className="surface p-4 rounded-lg border space-y-2">
            <span className="font-semibold text-sm block mb-2">Chọn phòng cấu hình giá:</span>
            {rooms.map((r) => (
              <button
                key={r.room_id}
                type="button"
                onClick={() => setSelectedRoomId(r.room_id)}
                className={`w-full text-left p-3 rounded border text-sm transition-all ${
                  r.room_id === selectedRoomId
                    ? "bg-primary text-white border-primary font-bold"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
              >
                {r.name}
                <span className={`block text-xs font-normal ${r.room_id === selectedRoomId ? "text-white/80" : "text-muted-foreground"}`}>
                  {r.rates?.length ?? 0} gói giá
                </span>
              </button>
            ))}
          </div>

          {/* Rates and Add Form Column */}
          <div className="md:col-span-2 space-y-6">
            {activeRoom && (
              <>
                <section className="surface p-6 rounded-lg border space-y-4">
                  <h3 className="font-bold text-lg">Bảng giá hiện tại — {activeRoom.name}</h3>

                  {!activeRoom.rates || activeRoom.rates.length === 0 ? (
                    <p className="text-sm text-amber-700 italic">Phòng này chưa có bảng giá nào. Hãy thêm gói giá bên dưới.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeRoom.rates.map((rate) => (
                        <div key={rate.rate_id} className="flex justify-between items-center p-3 border rounded bg-slate-50 text-sm">
                          <div>
                            <strong>{unitLabel[rate.rate_unit] ?? rate.rate_unit}</strong>
                            <span className="text-xs text-muted-foreground ml-2">
                              (Tối thiểu {rate.minimum_units} {unitLabel[rate.rate_unit] ?? rate.rate_unit})
                            </span>
                          </div>
                          <strong className="text-primary text-base">{money(rate.unit_price)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="surface p-6 rounded-lg border space-y-4">
                  <h3 className="font-bold text-base">Thêm gói giá cho {activeRoom.name}</h3>
                  <form onSubmit={handleAddRate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Đơn vị tính" id="add-rate-unit">
                        <Select value={rateUnit} onChange={(e) => setRateUnit(e.target.value)}>
                          <option value="hour">Theo giờ (hour)</option>
                          <option value="half_day">Nửa ngày (half_day)</option>
                          <option value="day">Theo ngày (day)</option>
                          <option value="session">Theo buổi (session)</option>
                          <option value="week">Theo tuần (week)</option>
                          <option value="month">Theo tháng (month)</option>
                        </Select>
                      </Field>

                      <Field label="Đơn giá (VND)" id="add-rate-price">
                        <Input
                          type="number"
                          id="add-rate-price"
                          min={0}
                          step={10000}
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(Number(e.target.value))}
                          required
                        />
                      </Field>

                      <Field label="Số lượng tối thiểu" id="add-rate-min">
                        <Input
                          type="number"
                          id="add-rate-min"
                          min={1}
                          value={minUnits}
                          onChange={(e) => setMinUnits(Number(e.target.value))}
                          required
                        />
                      </Field>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={savingRate}>
                        <Plus size={16} /> {savingRate ? "Đang lưu..." : "Thêm gói giá"}
                      </Button>
                    </div>
                  </form>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
