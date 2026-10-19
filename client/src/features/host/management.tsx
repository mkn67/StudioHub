"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, ImagePlus } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { useStudio, HostScope } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { EntityDialog, type FormField } from "@/components/forms/entity-dialog";
import {
  PageHeading,
  Badge,
  EmptyState,
  StudioImage,
} from "@/components/shared/common";
import { DataTable, type Column } from "@/components/data-table/table";
import { getEffectiveRoomStatus } from "@/domain/access";
import { occupies } from "@/domain/booking";
import { startingRate } from "@/domain/pricing";
import {
  localDate,
  money,
  normalize,
  unitLabels,
  vietnamInstant,
} from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import { useUnsaved } from "@/hooks/use-unsaved";
import { compressImage } from "@/lib/images";
import { message } from "@/services/service";
import type { Equipment, Rate, Room, Studio } from "@/domain/schema";
export function HostRooms() {
  const { db, now } = useApp(),
    { studioId } = useStudio(),
    { params, update } = useUrlState();
  if (!db) return null;
  const q = normalize(params.get("q") ?? ""),
    rows = db.rooms.filter(
      (r) =>
        r.studioId === studioId &&
        normalize(`${r.name} ${r.code}`).includes(q) &&
        (!params.get("status") || r.status === params.get("status")),
    );
  const columns: Column<Room>[] = [
    {
      key: "name",
      label: "Phòng",
      render: (r) => (
        <div className="table-room">
          <StudioImage src={r.images[0]} alt={r.name} />
          <span>
            <strong>{r.name}</strong>
            <small>{r.code}</small>
          </span>
        </div>
      ),
      sort: (r) => r.name,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (r) => (
        <>
          <Badge
            tone={
              getEffectiveRoomStatus(db, r, now) === "bookable"
                ? "success"
                : "neutral"
            }
          >
            {r.adminHidden
              ? "Admin ẩn"
              : r.status === "active"
                ? "Đang nhận đơn"
                : r.status === "paused"
                  ? "Tạm ngừng"
                  : "Ẩn"}
          </Badge>
          {getEffectiveRoomStatus(db, r, now) === "incomplete" && (
            <small>Chưa đủ điều kiện mở</small>
          )}
        </>
      ),
    },
    {
      key: "capacity",
      label: "Sức chứa",
      render: (r) => `${r.capacity} người`,
      sort: (r) => r.capacity,
    },
    {
      key: "area",
      label: "Diện tích",
      render: (r) => `${r.area} m²`,
      sort: (r) => r.area,
    },
    {
      key: "price",
      label: "Giá tham khảo",
      render: (r) => {
        const rate = startingRate(db.rates, r.id, now);
        return rate
          ? `${money(rate.price)}/${unitLabels[rate.unit]}`
          : "Chưa có bảng giá";
      },
    },
    {
      key: "upcoming",
      label: "Đơn sắp tới",
      render: (r) =>
        db.bookings.filter(
          (b) => b.roomId === r.id && b.start > now && occupies(b, now),
        ).length,
    },
    {
      key: "action",
      label: "Thao tác",
      render: (r) => (
        <Link className="text-link" href={`/host/rooms/${r.id}/edit`}>
          Chỉnh sửa
        </Link>
      ),
    },
  ];
  return (
    <HostScope>
      <PageHeading
        title="Phòng & không gian"
        description="Quản lý các phòng trong Studio đang chọn."
        action={
          <Button asChild>
            <Link href="/host/rooms/new">
              <Plus size={16} /> Thêm phòng
            </Link>
          </Button>
        }
      />
      <div className="list-filters">
        <Field label="Tìm phòng" id="host-room-search">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Tên hoặc mã phòng"
          />
        </Field>
        <Field label="Trạng thái" id="host-room-status">
          <Select
            value={params.get("status") ?? ""}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="active">Đang nhận đơn</option>
            <option value="paused">Tạm ngừng</option>
            <option value="hidden">Ẩn</option>
          </Select>
        </Field>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        id={(r) => r.id}
        label="Danh sách phòng"
      />
    </HostScope>
  );
}
function RoomEditor({ id }: { id?: string }) {
  const { db, service, user, now } = useApp(),
    { studioId } = useStudio(),
    router = useRouter();
  const existing = db?.rooms.find(
    (r) =>
      r.id === id &&
      db.studios.some((s) => s.id === r.studioId && s.ownerId === user?.id),
  );
  const [room, setRoom] = useState<Room>(
    () =>
      existing ?? {
        id: crypto.randomUUID(),
        studioId,
        slug: "",
        code: `P-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
        name: "",
        description: "",
        area: 40,
        capacity: 8,
        typeIds: [],
        amenityIds: [],
        images: [],
        status: "hidden",
        adminHidden: false,
        adminReason: "",
        openMinute: 480,
        closeMinute: 1320,
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
        overnight: false,
        cleaningMinutes: 30,
      },
  );
  const [baseline, setBaseline] = useState(JSON.stringify(room)),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const dirty = baseline !== JSON.stringify(room);
  useUnsaved(dirty);
  if (!db) return null;
  if (id && !existing) return <EmptyState title="Không tìm thấy phòng" />;
  function change(values: Partial<Room>) {
    setRoom((r) => ({ ...r, ...values }));
  }
  const affected = db.bookings.filter(
      (b) => b.roomId === room.id && occupies(b, now),
    ),
    studio = db.studios.find((s) => s.id === room.studioId);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const value = service.saveRoom(room);
      setBaseline(JSON.stringify(value));
      router.push("/host/rooms");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  function reorder(index: number, direction: number) {
    const images = [...room.images];
    [images[index], images[index + direction]] = [
      images[index + direction],
      images[index],
    ];
    change({ images });
  }
  const minuteTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <>
      <PageHeading
        title={id ? "Chỉnh sửa phòng" : "Thêm phòng"}
        description={
          id
            ? "Giữ nguyên mã và đường dẫn của phòng."
            : "Phòng mới bắt đầu ở trạng thái ẩn. Thêm bảng giá trước khi mở nhận đơn."
        }
      />
      {(room.adminHidden || studio?.adminHidden) && (
        <div className="notice notice-error">
          Admin đang ẩn: {room.adminReason || studio?.adminReason}. Chủ Studio
          không thể ghi đè trạng thái này.
        </div>
      )}
      {affected.length > 0 && (
        <div className="notice">
          Thay đổi trạng thái không hủy {affected.length} đơn đang hoạt động.{" "}
          {affected.map((b) => (
            <Link
              key={b.id}
              href={`/host/bookings/${b.code}`}
              className="text-link"
            >
              {b.code}{" "}
            </Link>
          ))}
        </div>
      )}
      <form className="room-editor" onSubmit={save}>
        <ErrorSummary error={error} />
        <section className="surface">
          <h2>Thông tin chung</h2>
          <div className="form-grid">
            <Field label="Tên phòng" id="room-name">
              <Input
                value={room.name}
                onChange={(e) => change({ name: e.target.value })}
                minLength={2}
                required
              />
            </Field>
            <Field label="Mã phòng" id="room-code">
              <Input value={room.code} readOnly />
            </Field>
          </div>
          <Field label="Mô tả" id="room-description">
            <Textarea
              value={room.description}
              onChange={(e) => change({ description: e.target.value })}
              required
            />
          </Field>
          <fieldset>
            <legend>Loại Studio</legend>
            <div className="checkbox-grid">
              {db.types
                .filter((t) => !t.hidden || room.typeIds.includes(t.id))
                .map((t) => (
                  <label className="checkbox-label" key={t.id}>
                    <input
                      type="checkbox"
                      checked={room.typeIds.includes(t.id)}
                      disabled={t.hidden && !room.typeIds.includes(t.id)}
                      onChange={(e) =>
                        change({
                          typeIds: e.target.checked
                            ? [...room.typeIds, t.id]
                            : room.typeIds.filter((id) => id !== t.id),
                        })
                      }
                    />
                    {t.name}
                    {t.hidden && " (danh mục ẩn)"}
                  </label>
                ))}
            </div>
          </fieldset>
        </section>
        <section className="surface">
          <h2>Hình ảnh</h2>
          <p className="muted">
            Ảnh đầu tiên là ảnh bìa. Tối đa 8 ảnh, mỗi ảnh đầu vào dưới 5 MB;
            ảnh được nén trước khi lưu.
          </p>
          <Field label="Chọn ảnh JPG, PNG hoặc WebP" id="room-images">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length + room.images.length > 8) {
                  setError("Tối đa 8 ảnh cho mỗi phòng.");
                  return;
                }
                try {
                  const images = await Promise.all(
                    files.map((f) => compressImage(f)),
                  );
                  change({ images: [...room.images, ...images] });
                  setError(null);
                } catch (error) {
                  setError(message(error));
                }
              }}
            />
          </Field>
          <Button
            variant="outline"
            onClick={() => {
              if (room.images.length < 8)
                change({ images: [...room.images, "/images/daylight.jpg"] });
            }}
          >
            <ImagePlus size={16} /> Dùng ảnh minh họa demo
          </Button>
          <div className="room-image-editor">
            {room.images.map((src, index) => (
              <div key={`${src.slice(0, 40)}-${index}`}>
                <StudioImage src={src} alt={`Ảnh phòng ${index + 1}`} />
                <div>
                  <span>{index === 0 ? "Ảnh bìa" : `Ảnh ${index + 1}`}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Đưa ảnh ${index + 1} lên trước`}
                    disabled={index === 0}
                    onClick={() => reorder(index, -1)}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Đưa ảnh ${index + 1} ra sau`}
                    disabled={index === room.images.length - 1}
                    onClick={() => reorder(index, 1)}
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      change({
                        images: room.images.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="surface">
          <h2>Sức chứa, tiện ích & giờ hoạt động</h2>
          <div className="form-grid">
            <Field label="Diện tích (m²)" id="room-area">
              <Input
                type="number"
                min={1}
                value={room.area}
                onChange={(e) => change({ area: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Số người tối đa" id="room-capacity">
              <Input
                type="number"
                min={1}
                value={room.capacity}
                onChange={(e) => change({ capacity: Number(e.target.value) })}
                required
              />
            </Field>
          </div>
          <fieldset>
            <legend>Tiện ích</legend>
            <div className="checkbox-grid">
              {db.amenities
                .filter((t) => !t.hidden || room.amenityIds.includes(t.id))
                .map((t) => (
                  <label className="checkbox-label" key={t.id}>
                    <input
                      type="checkbox"
                      checked={room.amenityIds.includes(t.id)}
                      onChange={(e) =>
                        change({
                          amenityIds: e.target.checked
                            ? [...room.amenityIds, t.id]
                            : room.amenityIds.filter((id) => id !== t.id),
                        })
                      }
                    />
                    {t.name}
                    {t.hidden && " (ẩn)"}
                  </label>
                ))}
            </div>
          </fieldset>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={room.overnight}
              onChange={(e) =>
                change({
                  overnight: e.target.checked,
                  openMinute: e.target.checked ? 0 : 480,
                  closeMinute: e.target.checked ? 1440 : 1320,
                })
              }
            />
            Cho phép thuê liên tục qua đêm (hoạt động 24 giờ)
          </label>
          {!room.overnight && (
            <div className="form-grid">
              <Field label="Giờ mở cửa" id="room-open">
                <Input
                  type="time"
                  value={minuteTime(room.openMinute)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    change({ openMinute: h * 60 + m });
                  }}
                  required
                />
              </Field>
              <Field label="Giờ đóng cửa" id="room-close">
                <Input
                  type="time"
                  value={minuteTime(room.closeMinute)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    change({ closeMinute: h * 60 + m });
                  }}
                  required
                />
              </Field>
            </div>
          )}
          <fieldset>
            <legend>Ngày hoạt động</legend>
            <div className="checkbox-grid">
              {[
                "Chủ nhật",
                "Thứ hai",
                "Thứ ba",
                "Thứ tư",
                "Thứ năm",
                "Thứ sáu",
                "Thứ bảy",
              ].map((name, index) => (
                <label className="checkbox-label" key={name}>
                  <input
                    type="checkbox"
                    checked={room.operatingDays.includes(index)}
                    onChange={(e) =>
                      change({
                        operatingDays: e.target.checked
                          ? [...room.operatingDays, index]
                          : room.operatingDays.filter((d) => d !== index),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="Dọn phòng sau buổi thuê (phút)"
            id="room-cleaning"
            hint="Cài đặt demo, mặc định 30 phút."
          >
            <Input
              type="number"
              min={0}
              max={180}
              value={room.cleaningMinutes}
              onChange={(e) =>
                change({ cleaningMinutes: Number(e.target.value) })
              }
            />
          </Field>
        </section>
        <section className="surface">
          <h2>Trạng thái & điều kiện mở nhận đơn</h2>
          <Field label="Trạng thái của Chủ Studio" id="room-status">
            <Select
              value={room.status}
              onChange={(e) =>
                change({ status: e.target.value as Room["status"] })
              }
              disabled={!id}
            >
              <option value="hidden">Ẩn</option>
              <option value="paused">Tạm ngừng</option>
              <option value="active">Đang nhận đơn</option>
            </Select>
          </Field>
          <ul className="publishing-checklist">
            <li>
              {room.name && room.typeIds.length ? "✓" : "○"} Tên, loại Studio và
              thông tin hợp lệ
            </li>
            <li>{room.images.length ? "✓" : "○"} Ít nhất một ảnh</li>
            <li>
              {startingRate(db.rates, room.id, now) ? "✓" : "○"} Bảng giá đang
              áp dụng
            </li>
            <li>
              {!room.adminHidden && !studio?.adminHidden ? "✓" : "○"} Không bị
              Admin ẩn
            </li>
          </ul>
          <Link href="/host/pricing" className="text-link">
            Quản lý bảng giá tại trang Bảng giá
          </Link>
          <p className="field-hint">
            Phòng có lịch sử đơn được giữ lại. Bạn có thể ẩn phòng thay vì xóa
            dữ liệu.
          </p>
        </section>
        <div className="form-footer">
          <Button variant="outline" asChild>
            <Link href="/host/rooms">Quay lại danh sách</Link>
          </Button>
          <Button type="submit" disabled={busy || (!dirty && !!id)}>
            {busy ? "Đang lưu…" : "Lưu phòng"}
          </Button>
        </div>
      </form>
    </>
  );
}
export function HostRoomForm(props: { id?: string }) {
  const { studioId } = useStudio();
  return (
    <HostScope>
      <RoomEditor key={`${studioId}-${props.id ?? "new"}`} {...props} />
    </HostScope>
  );
}
const equipmentFields: FormField[] = [
  { key: "name", label: "Tên thiết bị / nội thất", required: true },
  {
    key: "category",
    label: "Nhóm",
    type: "select",
    options: [
      { value: "equipment", label: "Thiết bị" },
      { value: "furniture", label: "Nội thất" },
    ],
  },
  {
    key: "quantity",
    label: "Tổng số lượng",
    type: "number",
    min: 0,
    required: true,
  },
  {
    key: "price",
    label: "Giá thuê (đ)",
    type: "number",
    min: 1,
    required: true,
  },
  {
    key: "unit",
    label: "Đơn vị thuê",
    type: "select",
    options: [
      { value: "hour", label: "Giờ" },
      { value: "session", label: "Buổi" },
      { value: "day", label: "Ngày" },
    ],
  },
  {
    key: "status",
    label: "Trạng thái",
    type: "select",
    options: [
      { value: "available", label: "Sẵn sàng" },
      { value: "maintenance", label: "Bảo trì" },
      { value: "hidden", label: "Ẩn / lưu trữ" },
    ],
  },
  { key: "image", label: "Ảnh thiết bị", type: "image" },
];
export function HostEquipment() {
  const { db, service } = useApp(),
    { studioId } = useStudio(),
    { params, update } = useUrlState();
  const [editing, setEditing] = useState<Equipment | null>(null);
  if (!db) return null;
  const q = normalize(params.get("q") ?? ""),
    rows = db.equipment.filter(
      (e) =>
        e.studioId === studioId &&
        normalize(e.name).includes(q) &&
        (!params.get("category") || e.category === params.get("category")),
    );
  const columns: Column<Equipment>[] = [
    {
      key: "name",
      label: "Thiết bị",
      render: (e) => (
        <div className="table-room">
          <StudioImage src={e.image} alt={e.name} />
          <strong>{e.name}</strong>
        </div>
      ),
      sort: (e) => e.name,
    },
    {
      key: "category",
      label: "Nhóm",
      render: (e) => (e.category === "equipment" ? "Thiết bị" : "Nội thất"),
    },
    {
      key: "quantity",
      label: "Tổng số lượng",
      render: (e) => e.quantity,
      sort: (e) => e.quantity,
    },
    {
      key: "price",
      label: "Giá thuê",
      render: (e) => `${money(e.price)}/${unitLabels[e.unit]}`,
      sort: (e) => e.price,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (e) => (
        <Badge tone={e.status === "available" ? "success" : "neutral"}>
          {e.status === "available"
            ? "Sẵn sàng"
            : e.status === "maintenance"
              ? "Bảo trì"
              : "Ẩn"}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "Thao tác",
      render: (e) => (
        <Button variant="ghost" onClick={() => setEditing(e)}>
          Chỉnh sửa
        </Button>
      ),
    },
  ];
  return (
    <HostScope>
      <PageHeading
        title="Thiết bị & nội thất"
        description="Tồn kho dùng chung cho các phòng trong Studio. Số lượng còn trống được tính theo thời gian thuê."
        action={
          <Button
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                studioId,
                name: "",
                category: "equipment",
                quantity: 1,
                price: 50000,
                unit: "hour",
                status: "available",
                image: "/images/equipment.jpg",
              })
            }
          >
            <Plus size={16} /> Thêm thiết bị
          </Button>
        }
      />
      <div className="list-filters">
        <Field label="Tìm thiết bị" id="equipment-search">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value })}
          />
        </Field>
        <Field label="Nhóm" id="equipment-category">
          <Select
            value={params.get("category") ?? ""}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="equipment">Thiết bị</option>
            <option value="furniture">Nội thất</option>
          </Select>
        </Field>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        id={(e) => e.id}
        label="Tồn kho thiết bị"
      />
      {editing && (
        <EntityDialog
          key={editing.id}
          title={
            db.equipment.some((e) => e.id === editing.id)
              ? "Chỉnh sửa thiết bị"
              : "Thêm thiết bị"
          }
          initial={editing}
          fields={equipmentFields}
          onClose={() => setEditing(null)}
          onSave={(values) =>
            service.saveEquipment({ ...editing, ...values } as Equipment)
          }
        />
      )}
    </HostScope>
  );
}
export function HostPricing() {
  const { db, service } = useApp(),
    { studioId } = useStudio(),
    { params, update } = useUrlState();
  const [editing, setEditing] = useState<Rate | null>(null);
  if (!db) return null;
  const rooms = db.rooms.filter((r) => r.studioId === studioId),
    roomId = rooms.some((r) => r.id === params.get("room"))
      ? params.get("room")!
      : rooms[0]?.id,
    rows = db.rates.filter((r) => r.roomId === roomId);
  const fields: FormField[] = [
    { key: "name", label: "Tên bảng giá", required: true },
    {
      key: "unit",
      label: "Đơn vị",
      type: "select",
      options: Object.entries(unitLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: "price",
      label: "Giá thuê (đ)",
      type: "number",
      min: 1,
      required: true,
    },
    {
      key: "from",
      label: "Ngày bắt đầu hiệu lực",
      type: "date",
      required: true,
    },
    {
      key: "to",
      label: "Ngày kết thúc (không bao gồm)",
      type: "date",
      hint: "Để trống nếu không có ngày kết thúc.",
    },
    {
      key: "minUnits",
      label: "Số đơn vị tối thiểu",
      type: "number",
      min: 0.25,
      step: "any",
      required: true,
    },
    {
      key: "maxUnits",
      label: "Số đơn vị tối đa",
      type: "number",
      min: 0.25,
      step: "any",
      required: true,
    },
    { key: "active", label: "Bảng giá đang hoạt động", type: "checkbox" },
  ];
  const columns: Column<Rate>[] = [
    {
      key: "name",
      label: "Bảng giá",
      render: (r) => (
        <>
          <strong>{r.name}</strong>
          {["half-day", "week", "month"].includes(r.unit) && (
            <small>Chỉ tham khảo · Không đặt trực tuyến</small>
          )}
        </>
      ),
    },
    { key: "unit", label: "Đơn vị", render: (r) => unitLabels[r.unit] },
    {
      key: "price",
      label: "Giá thuê",
      render: (r) => `${money(r.price)}/${unitLabels[r.unit]}`,
      sort: (r) => r.price,
    },
    {
      key: "effective",
      label: "Hiệu lực",
      render: (r) => (
        <>
          {localDate(r.effectiveFrom)}
          <small>
            Đến {r.effectiveTo ? localDate(r.effectiveTo) : "Không giới hạn"}
          </small>
        </>
      ),
    },
    {
      key: "limits",
      label: "Giới hạn",
      render: (r) => `${r.minUnits}–${r.maxUnits} ${unitLabels[r.unit]}`,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (r) => (
        <Badge tone={r.active ? "success" : "neutral"}>
          {r.active ? "Hoạt động" : "Ngừng áp dụng"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (r) => (
        <Button variant="ghost" onClick={() => setEditing(r)}>
          Chỉnh sửa
        </Button>
      ),
    },
  ];
  return (
    <HostScope>
      <PageHeading
        title="Bảng giá thuê"
        description="Giá trong các đơn đã tạo được giữ nguyên khi bảng giá thay đổi."
        action={
          roomId && (
            <Button
              onClick={() =>
                setEditing({
                  id: crypto.randomUUID(),
                  roomId,
                  name: "",
                  unit: "hour",
                  price: 250000,
                  effectiveFrom: vietnamInstant(localDate()),
                  effectiveTo: null,
                  minUnits: 1,
                  maxUnits: 12,
                  active: true,
                })
              }
            >
              <Plus size={16} /> Thêm bảng giá
            </Button>
          )
        }
      />
      {rooms.length ? (
        <>
          <Field label="Phòng áp dụng" id="pricing-room">
            <Select
              value={roomId}
              onChange={(e) => update({ room: e.target.value })}
            >
              {rooms.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="notice">
            Theo giờ, buổi và ngày được đặt trực tuyến nếu phòng hỗ trợ. Giá nửa
            ngày, tuần và tháng chỉ để tham khảo. Bảng giá đang hoạt động cùng
            đơn vị không được trùng ngày hiệu lực.
          </div>
          <DataTable
            rows={rows}
            columns={columns}
            id={(r) => r.id}
            label="Bảng giá thuê"
          />
        </>
      ) : (
        <EmptyState
          title="Thêm phòng trước khi tạo bảng giá"
          href="/host/rooms/new"
          action="Thêm phòng"
        />
      )}
      {editing && (
        <EntityDialog
          key={editing.id}
          title="Chỉnh sửa bảng giá"
          initial={{
            ...editing,
            from: localDate(editing.effectiveFrom),
            to: editing.effectiveTo ? localDate(editing.effectiveTo) : "",
          }}
          fields={fields}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            service.saveRate({
              ...editing,
              name: String(values.name),
              unit: values.unit as Rate["unit"],
              price: Number(values.price),
              minUnits: Number(values.minUnits),
              maxUnits: Number(values.maxUnits),
              active: !!values.active,
              effectiveFrom: vietnamInstant(String(values.from)),
              effectiveTo: values.to ? vietnamInstant(String(values.to)) : null,
            });
          }}
        />
      )}
    </HostScope>
  );
}
function StudioEditor({ isNew }: { isNew: boolean }) {
  const { db, user, service } = useApp(),
    { studioId, selectStudio } = useStudio(),
    router = useRouter();
  const existing = !isNew
    ? db?.studios.find((s) => s.id === studioId && s.ownerId === user?.id)
    : null;
  const app = db?.applications.find((a) => a.userId === user?.id);
  const [studio, setStudio] = useState<Studio>(
    () =>
      existing ?? {
        id: crypto.randomUUID(),
        ownerId: user!.id,
        name: app?.studioName ?? "",
        city: "TP. Hồ Chí Minh",
        district: "",
        address: "",
        phone: user?.phone ?? "",
        description: app?.description ?? "",
        adminHidden: false,
        adminReason: "",
        stepMinutes: 30,
        sessionMinutes: 240,
        depositPercent: 30,
        cancellationHours: 24,
        rules:
          "Giữ gìn không gian và thiết bị. Không hút thuốc. Chính sách demo: khoản cọc chờ xử lý theo chính sách, không hoàn tiền tự động.",
      },
  );
  const [baseline, setBaseline] = useState(JSON.stringify(studio)),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useUnsaved(baseline !== JSON.stringify(studio));
  function set(values: Partial<Studio>) {
    setStudio((s) => ({ ...s, ...values }));
  }
  return (
    <>
      <PageHeading
        title={isNew ? "Tạo Studio" : "Thông tin Studio"}
        description="Thông tin địa điểm và cài đặt thuê trong bản demo."
        action={
          !isNew && (
            <Button asChild variant="outline">
              <Link href="/host/studio/settings?new=1">
                <Plus size={16} /> Thêm Studio
              </Link>
            </Button>
          )
        }
      />
      {studio.adminHidden && (
        <div className="notice notice-error">
          Studio bị Admin ẩn: {studio.adminReason}
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          try {
            const saved = service.saveStudio(studio);
            setBaseline(JSON.stringify(saved));
            selectStudio(saved.id);
            router.replace("/host/studio/settings");
          } catch (error) {
            setError(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorSummary error={error} />
        <section className="surface">
          <h2>Địa điểm & liên hệ</h2>
          <Field label="Tên Studio" id="studio-name">
            <Input
              value={studio.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              minLength={2}
            />
          </Field>
          <div className="form-grid">
            <Field label="Thành phố" id="studio-city">
              <Input
                value={studio.city}
                onChange={(e) => set({ city: e.target.value })}
                required
              />
            </Field>
            <Field label="Quận / khu vực" id="studio-district">
              <Input
                value={studio.district}
                onChange={(e) => set({ district: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Địa chỉ" id="studio-address">
            <Input
              value={studio.address}
              onChange={(e) => set({ address: e.target.value })}
              required
            />
          </Field>
          <Field label="Số điện thoại" id="studio-phone">
            <Input
              value={studio.phone}
              onChange={(e) => set({ phone: e.target.value })}
              required
              inputMode="tel"
            />
          </Field>
          <Field label="Mô tả Studio" id="studio-description">
            <Textarea
              value={studio.description}
              onChange={(e) => set({ description: e.target.value })}
              required
            />
          </Field>
        </section>
        <section className="surface">
          <h2>Cài đặt thuê · Demo</h2>
          <div className="form-grid">
            <Field label="Bước thời gian (phút)" id="studio-step">
              <Select
                value={studio.stepMinutes}
                onChange={(e) => set({ stepMinutes: Number(e.target.value) })}
              >
                {[5, 15, 30, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} phút
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Thời lượng một buổi (phút)" id="studio-session">
              <Input
                type="number"
                min={60}
                max={720}
                step={studio.stepMinutes}
                value={studio.sessionMinutes}
                onChange={(e) =>
                  set({ sessionMinutes: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field label="Tỷ lệ đặt cọc (%)" id="studio-deposit">
              <Input
                type="number"
                min={1}
                max={100}
                value={studio.depositPercent}
                onChange={(e) =>
                  set({ depositPercent: Number(e.target.value) })
                }
                required
              />
            </Field>
            <Field
              label="Hủy đơn xác nhận trước giờ thuê (giờ)"
              id="studio-cancellation"
            >
              <Input
                type="number"
                min={0}
                value={studio.cancellationHours}
                onChange={(e) =>
                  set({ cancellationHours: Number(e.target.value) })
                }
                required
              />
            </Field>
          </div>
          <Field label="Quy định thuê & chính sách demo" id="studio-rules">
            <Textarea
              value={studio.rules}
              onChange={(e) => set({ rules: e.target.value })}
              required
            />
          </Field>
          <p className="field-hint">
            Cài đặt phục vụ trải nghiệm demo. Chính sách thanh toán, hoàn cọc và
            hủy chính thức cần được xác nhận trước khi vận hành thật. Giờ hoạt
            động được cấu hình riêng ở mỗi phòng.
          </p>
        </section>
        <div className="form-footer">
          <Button
            type="submit"
            disabled={busy || (!isNew && baseline === JSON.stringify(studio))}
          >
            {busy ? "Đang lưu…" : isNew ? "Tạo Studio" : "Lưu thông tin"}
          </Button>
        </div>
      </form>
    </>
  );
}
export function HostSettings() {
  const { db, user } = useApp(),
    { studioId } = useStudio(),
    params = useSearchParams();
  const isNew =
    params.get("new") === "1" ||
    !db?.studios.some((s) => s.ownerId === user?.id);
  return isNew ? (
    <StudioEditor key="new" isNew />
  ) : (
    <HostScope>
      <StudioEditor key={studioId} isNew={false} />
    </HostScope>
  );
}
