"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, ChevronDown, Clock, Copy } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { apiRequest } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "@/components/forms/field";
import { Badge, EmptyState, PageHeading, StudioImage } from "@/components/shared/common";
import { money } from "@/lib/format";

export type RoomDetailData = {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  capacity: number;
  rules: string | null;
  studio: { name: string; address: string; district: string; city: string; phone?: string | null };
  thumbnail_url: string | null;
  images: { image_id: number; image_url: string; is_primary: boolean }[];
  rates: {
    rate_id: number;
    rate_unit: string;
    unit_minutes: number;
    unit_price: number;
    minimum_units: number;
    maximum_units: number | null;
  }[];
};

export type EquipmentItem = {
  equipment_id: number;
  studio_id: number;
  category_id: number;
  category_name: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  pricing_unit: string;
  total_quantity: number;
  image_url: string | null;
  status: string;
};

export type CalendarData = {
  room_id: number;
  from: string;
  to: string;
  busy_slots: { busy_start: string; busy_end: string }[];
};

export type CheckAvailabilityResult = {
  available: boolean;
  room: { room_id: number; name: string; capacity: number };
  start_time: string;
  end_time: string;
  busy_start: string;
  busy_end: string;
  pricing: {
    booking_type: string;
    rate_unit: string;
    rental_units: number;
    room_unit_price: number;
    room_amount: number;
    equipment_amount: number;
    total_amount: number;
    deposit_amount: number;
    equipments: {
      equipment_id: number;
      name?: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[];
  };
};

export type BookingResult = {
  booking_id: number;
  booking_code: string;
  room_id: number;
  room_name: string;
  studio_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  party_size: number;
  rate_id: number;
  booking_type: string;
  rate_unit: string;
  rental_units: number;
  room_unit_price: number;
  room_amount: number;
  equipment_amount: number;
  total_amount: number;
  deposit_amount: number;
  start_time: string;
  end_time: string;
  busy_start: string;
  busy_end: string;
  note: string | null;
  status: "pending" | "confirmed" | "cancelled";
  expires_at: string;
  created_at: string;
  equipments: { equipment_id: number; quantity: number; unit_price: number; subtotal: number }[];
};

const unitLabel: Record<string, string> = {
  hour: "Giờ",
  half_day: "Nửa ngày (4h)",
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  session: "Buổi",
};

export function QuantitySelector({
  name,
  quantity,
  maximum,
  onChange,
}: {
  name: string;
  quantity: number;
  maximum: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="quantity-selector">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Giảm ${name}`}
        disabled={quantity <= 0}
        onClick={() => onChange(Math.max(0, quantity - 1))}
      >
        <Minus size={16} />
      </Button>
      <output aria-label={`Số lượng ${name}`}>{quantity}</output>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Tăng ${name}`}
        disabled={quantity >= maximum}
        onClick={() => onChange(Math.min(maximum, quantity + 1))}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState<number>(() => {
    const target = new Date(expiresAt.replace(" ", "T") + "+07:00").getTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  });

  useEffect(() => {
    const target = new Date(expiresAt.replace(" ", "T") + "+07:00").getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <span className={`countdown ${remaining < 300 ? "text-red-500 font-bold" : ""}`}>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

function computeTimeRange(
  date: string,
  startHour: string,
  durationUnits: number,
  rate?: RoomDetailData["rates"][number],
) {
  const startStr = `${date} ${startHour}:00`;
  const startDateObj = new Date(`${date}T${startHour}:00+07:00`);

  let endMinutes = 60;
  if (rate) {
    if (rate.rate_unit === "hour") {
      endMinutes = durationUnits * 60;
    } else if (rate.rate_unit === "half_day") {
      endMinutes = durationUnits * 240;
    } else if (rate.rate_unit === "day") {
      endMinutes = durationUnits * 1440;
    } else if (rate.unit_minutes) {
      endMinutes = durationUnits * rate.unit_minutes;
    } else {
      endMinutes = durationUnits * 60;
    }
  }

  const endDateObj = new Date(startDateObj.getTime() + endMinutes * 60000);
  const y = endDateObj.getFullYear();
  const m = String(endDateObj.getMonth() + 1).padStart(2, "0");
  const d = String(endDateObj.getDate()).padStart(2, "0");
  const h = String(endDateObj.getHours()).padStart(2, "0");
  const min = String(endDateObj.getMinutes()).padStart(2, "0");
  const s = String(endDateObj.getSeconds()).padStart(2, "0");
  const endStr = `${y}-${m}-${d} ${h}:${min}:${s}`;

  return { startStr, endStr };
}

export function BackendBookingWizard({ id }: { id: string }) {
  const { user } = useApp();
  const heading = useRef<HTMLHeadingElement>(null);

  // Data states
  const [room, setRoom] = useState<RoomDetailData | null>(null);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Step state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Booking draft form state
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [rateId, setRateId] = useState<number>(0);
  const [date, setDate] = useState<string>(tomorrowStr);
  const [startHour, setStartHour] = useState<string>("09:00");
  const [durationUnits, setDurationUnits] = useState<number>(2);
  const [partySize, setPartySize] = useState<number>(2);
  const [selectedEquipments, setSelectedEquipments] = useState<Record<number, number>>({});

  // Contact info state
  const [contactName, setContactName] = useState(() => user?.name ?? "");
  const [contactPhone, setContactPhone] = useState(() => user?.phone ?? "");
  const [contactEmail, setContactEmail] = useState(() => user?.email ?? "");
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  // Availability & calculation state
  const [checking, setChecking] = useState(false);
  const [availResult, setAvailResult] = useState<CheckAvailabilityResult | null>(null);
  const [availError, setAvailError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Mobile summary accordion
  const [summaryOpen, setSummaryOpen] = useState(false);

  // 1. Initial Load: Room Detail, Equipments, Calendar
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const roomData = await apiRequest<RoomDetailData>(`/api/rooms/${encodeURIComponent(id)}`);
        if (!active) return;
        setRoom(roomData);
        if (roomData.rates.length > 0) {
          setRateId(roomData.rates[0].rate_id);
          const minUnits = roomData.rates[0].minimum_units || 1;
          setDurationUnits(minUnits);
        }

        // Fetch equipments for this studio
        const equipData = await apiRequest<EquipmentItem[]>(`/api/equipments?studio_id=${roomData.studio_id}`).catch(() => []);
        if (active) setEquipments(equipData);

        // Fetch calendar busy slots
        const calData = await apiRequest<CalendarData>(`/api/rooms/${encodeURIComponent(id)}/calendar`).catch(() => null);
        if (active) setCalendar(calData);
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : "Không tải được thông tin phòng.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const activeRate = room?.rates.find((r) => r.rate_id === rateId);

  // 2. Debounced Check Availability on Input Changes
  useEffect(() => {
    if (!room || !rateId || !date || !startHour) return;

    let active = true;

    const timer = setTimeout(async () => {
      setChecking(true);
      setAvailError(null);
      try {
        const { startStr, endStr } = computeTimeRange(date, startHour, durationUnits, activeRate);
        const equipList = Object.entries(selectedEquipments)
          .filter(([, qty]) => qty > 0)
          .map(([eqId, qty]) => ({ equipment_id: Number(eqId), quantity: qty }));

        const result = await apiRequest<CheckAvailabilityResult>("/api/bookings/check-availability", {
          method: "POST",
          body: {
            room_id: room.room_id,
            rate_id: rateId,
            start_time: startStr,
            end_time: endStr,
            party_size: partySize,
            equipments: equipList,
          },
        });

        if (active) {
          setAvailResult(result);
          setAvailError(null);
        }
      } catch (err) {
        if (active) {
          setAvailResult(null);
          setAvailError(err instanceof Error ? err.message : "Khung giờ này không khả dụng.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [room, rateId, date, startHour, durationUnits, partySize, selectedEquipments, activeRate]);

  // Handle Equipment Quantity Change
  const updateEquipmentQty = (eqId: number, qty: number) => {
    setSelectedEquipments((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[eqId];
      else next[eqId] = qty;
      return next;
    });
  };

  // Submit Booking to Backend
  const handleBookingSubmit = async () => {
    if (!room || !availResult || !acknowledged) return;
    if (!user || user.role !== "customer") {
      setSubmitError("Vui lòng đăng nhập bằng tài khoản khách hàng để hoàn tất đặt phòng.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { startStr, endStr } = computeTimeRange(date, startHour, durationUnits, activeRate);
      const equipList = Object.entries(selectedEquipments)
        .filter(([, qty]) => qty > 0)
        .map(([eqId, qty]) => ({ equipment_id: Number(eqId), quantity: qty }));

      const booking = await apiRequest<BookingResult>("/api/bookings", {
        method: "POST",
        body: {
          room_id: room.room_id,
          rate_id: rateId,
          start_time: startStr,
          end_time: endStr,
          party_size: partySize,
          customer_name: contactName.trim() || user.name,
          customer_phone: contactPhone.trim() || user.phone,
          customer_email: contactEmail.trim() || user.email,
          note: note.trim() || undefined,
          equipments: equipList,
        },
      });

      setCreatedBooking(booking);
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo đơn đặt phòng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container" tabIndex={-1}>
        <PageHeading title="Đang tải thông tin đặt phòng…" />
      </main>
    );
  }

  if (loadError || !room) {
    return (
      <main className="container" tabIndex={-1}>
        <EmptyState
          title="Không tải được thông tin đặt phòng"
          description={loadError || "Phòng không tồn tại hoặc đã ngừng nhận đơn."}
          href="/rooms"
          action="Quay lại danh sách phòng"
        />
      </main>
    );
  }

  const selectedRate = room.rates.find((r) => r.rate_id === rateId) ?? room.rates[0];
  const { startStr, endStr } = computeTimeRange(date, startHour, durationUnits, selectedRate);

  // Find busy slots on selected date for preview
  const dayBusySlots = calendar?.busy_slots.filter((slot) => slot.busy_start.startsWith(date)) ?? [];

  // SUCCESS SCREEN (Step 4)
  if (step === 4 && createdBooking) {
    return (
      <main id="main-content" tabIndex={-1} className="container booking-success-page">
        <PageHeading
          title="Đặt phòng thành công!"
          description="Đơn đặt phòng của bạn đã được ghi nhận trên hệ thống StudioHub."
        />

        <div className="surface success-card max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <span className="text-sm text-muted-foreground">Mã đơn đặt phòng</span>
              <div className="flex items-center gap-2 mt-1">
                <strong className="text-2xl font-mono text-primary">{createdBooking.booking_code}</strong>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    void navigator.clipboard.writeText(createdBooking.booking_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title="Sao chép mã đơn"
                >
                  <Copy size={16} />
                </Button>
                {copied && <span className="text-xs text-green-600">Đã chép!</span>}
              </div>
            </div>
            <Badge tone="neutral">
              Chờ thanh toán cọc
            </Badge>
          </div>

          <div className="notice notice-warning flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <strong className="block text-amber-900 font-semibold">Thời hạn giữ chỗ 15 phút</strong>
              <p className="text-sm text-amber-800 mt-0.5">
                Vui lòng chuyển khoản tiền cọc trong vòng{" "}
                <CountdownTimer expiresAt={createdBooking.expires_at} /> trước khi phòng tự động mở lại cho khách khác.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
            <div>
              <span className="text-muted-foreground block">Studio & Phòng:</span>
              <strong>{room.studio.name}</strong> — {createdBooking.room_name}
            </div>
            <div>
              <span className="text-muted-foreground block">Địa điểm:</span>
              <span>{room.studio.address}, {room.studio.district}, {room.studio.city}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Thời gian thuê:</span>
              <strong>{createdBooking.start_time}</strong> đến <strong>{createdBooking.end_time}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Khách hàng:</span>
              <span>{createdBooking.customer_name} ({createdBooking.customer_phone})</span>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h3 className="font-semibold text-base">Thông tin thanh toán cọc (30%)</h3>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Tổng tiền thuê:</span>
              <span>{money(createdBooking.total_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold py-1 text-primary border-t border-dashed">
              <span>Số tiền cần chuyển khoản cọc:</span>
              <span className="text-lg text-emerald-600">{money(createdBooking.deposit_amount)}</span>
            </div>

            <div className="mt-4 p-4 bg-slate-50 border rounded text-xs space-y-1.5 font-mono">
              <p><strong>Ngân hàng:</strong> Vietcombank (Chi nhánh TP.HCM)</p>
              <p><strong>Số tài khoản:</strong> 0901234567</p>
              <p><strong>Chủ tài khoản:</strong> STUDIOHUB ESCROW</p>
              <p><strong>Nội dung chuyển khoản:</strong> {createdBooking.booking_code}</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button asChild className="flex-1">
              <Link href="/rooms">Khám phá phòng khác</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/rooms/${room.room_id}`}>Trang thông tin phòng</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // WIZARD STEPS 1-3
  return (
    <main id="main-content" tabIndex={-1} className="container">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href="/rooms">Phòng Studio</Link>
        <span>/</span>
        <Link href={`/rooms/${room.room_id}`}>{room.name}</Link>
        <span>/</span>
        <span>Đặt thuê</span>
      </nav>

      <PageHeading title="Đặt thuê Studio" description={`${room.name} — ${room.studio.name}`} />

      {/* Steps Indicator */}
      <nav className="wizard-steps" aria-label="Các bước đặt thuê">
        {[
          { num: 1, label: "Thời gian & Giá" },
          { num: 2, label: "Thiết bị bổ sung" },
          { num: 3, label: "Xác nhận & Đặt cọc" },
        ].map((item) => (
          <button
            key={item.num}
            type="button"
            disabled={item.num > step}
            onClick={() => setStep(item.num as 1 | 2 | 3)}
            aria-current={step === item.num ? "step" : undefined}
          >
            <span>{step > item.num ? <Check size={16} /> : item.num}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="wizard-layout">
        {/* Main form section */}
        <section className="surface wizard-main">
          <h2 ref={heading} tabIndex={-1}>
            {step === 1 && "1. Chọn thời gian & Gói giá"}
            {step === 2 && "2. Chọn thiết bị bổ sung"}
            {step === 3 && "3. Thông tin người đặt & Xác nhận"}
          </h2>

          <ErrorSummary error={submitError} />

          {/* STEP 1: TIME & RATES */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="muted text-sm">
                Giờ Việt Nam (GMT+7). Hệ thống tự động áp dụng 30 phút dọn dẹp giữa các ca thuê.
              </p>

              {/* Rate Selection */}
              <div className="form-group">
                <label className="font-semibold block mb-2">Gói bảng giá</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.rates.map((rate) => {
                    const active = rate.rate_id === rateId;
                    return (
                      <div
                        key={rate.rate_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setRateId(rate.rate_id);
                          setDurationUnits(rate.minimum_units || 1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setRateId(rate.rate_id);
                            setDurationUnits(rate.minimum_units || 1);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <strong>{unitLabel[rate.rate_unit] ?? rate.rate_unit}</strong>
                          <span className="text-primary font-bold">{money(rate.unit_price)}</span>
                        </div>
                        <small className="text-muted-foreground block mt-1">
                          Tối thiểu {rate.minimum_units || 1} {unitLabel[rate.rate_unit] ?? rate.rate_unit}
                          {rate.maximum_units ? ` · Tối đa ${rate.maximum_units}` : ""}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ngày thuê" id="booking-date">
                  <Input
                    type="date"
                    id="booking-date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Giờ bắt đầu" id="booking-start-time">
                  <Input
                    type="time"
                    id="booking-start-time"
                    value={startHour}
                    step={1800} // 30 min steps
                    onChange={(e) => setStartHour(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label={`Số lượng (${unitLabel[selectedRate?.rate_unit ?? "hour"] ?? "đơn vị"})`}
                  id="booking-duration"
                >
                  <Input
                    type="number"
                    id="booking-duration"
                    min={selectedRate?.minimum_units || 1}
                    max={selectedRate?.maximum_units || 24}
                    value={durationUnits}
                    onChange={(e) => setDurationUnits(Math.max(1, Number(e.target.value)))}
                    required
                  />
                </Field>
              </div>

              {/* Party size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Số người tham gia"
                  id="booking-party-size"
                  hint={`Sức chứa tối đa của phòng: ${room.capacity} người`}
                >
                  <Input
                    type="number"
                    id="booking-party-size"
                    min={1}
                    max={room.capacity}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  />
                </Field>
              </div>

              {/* Busy Slots Indicator for Selected Date */}
              {dayBusySlots.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
                  <strong>Khung giờ phòng đã bận trong ngày {date}:</strong>
                  <ul className="list-disc list-inside">
                    {dayBusySlots.map((slot, idx) => (
                      <li key={idx}>
                        {slot.busy_start.slice(11, 16)} – {slot.busy_end.slice(11, 16)} (bao gồm thời gian dọn phòng)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Availability Status */}
              <div
                className={`notice ${checking ? "notice-neutral" : availResult ? "notice-success" : "notice-error"}`}
                role="status"
              >
                {checking
                  ? "Đang kiểm tra lịch trống và tính giá…"
                  : availResult
                    ? `✓ Khung giờ khả dụng: ${availResult.start_time.slice(11, 16)} - ${availResult.end_time.slice(11, 16)} (dọn phòng tới ${availResult.busy_end.slice(11, 16)})`
                    : availError || "Khung giờ này không khả dụng."}
              </div>

              <div className="wizard-navigation flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={checking || !availResult}
                >
                  Tiếp tục: Chọn thiết bị
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: ADD-ON EQUIPMENTS */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="muted text-sm">
                Tùy chọn bổ sung thiết bị hoặc đạo cụ chuyên dụng từ Studio. Bạn có thể bỏ qua bước này nếu không có nhu cầu.
              </p>

              {equipments.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg">
                  Studio này hiện chưa đăng ký thiết bị thuê kèm riêng.
                </div>
              ) : (
                <div className="space-y-3">
                  {equipments.map((item) => {
                    const currentQty = selectedEquipments[item.equipment_id] || 0;
                    return (
                      <div
                        key={item.equipment_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 bg-white"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-base">{item.name}</strong>
                            <Badge>{item.category_name}</Badge>
                            {item.brand && <span className="text-xs text-muted-foreground">({item.brand})</span>}
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          <div className="text-sm font-semibold text-primary">
                            {money(item.unit_price)} / {unitLabel[item.pricing_unit] ?? item.pricing_unit}
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                              (Còn sẵn: {item.total_quantity})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <QuantitySelector
                            name={item.name}
                            quantity={currentQty}
                            maximum={item.total_quantity}
                            onChange={(q) => updateEquipmentQty(item.equipment_id, q)}
                          />
                          <div className="w-24 text-right font-semibold text-sm">
                            {currentQty > 0 ? money(currentQty * item.unit_price) : "0 đ"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Equipment Price notice */}
              {availResult && (
                <div className="notice notice-success">
                  Tiền thuê thiết bị: <strong>{money(availResult.pricing.equipment_amount)}</strong>
                </div>
              )}

              <div className="wizard-navigation flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button onClick={() => setStep(3)}>
                  Tiếp tục: Xác nhận đơn
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT & CONFIRMATION */}
          {step === 3 && (
            <div className="space-y-6">
              {!user && (
                <div className="notice notice-warning flex items-center justify-between">
                  <span>Bạn cần đăng nhập tài khoản khách hàng để hoàn tất tạo đơn.</span>
                  <Button asChild size="sm">
                    <Link href={`/login?returnTo=${encodeURIComponent(`/rooms/${room.room_id}/book`)}`}>
                      Đăng nhập
                    </Link>
                  </Button>
                </div>
              )}

              {user && user.role !== "customer" && (
                <div className="notice notice-error">
                  Tài khoản của bạn có vai trò <strong>{user.role}</strong>. Chỉ khách hàng mới có thể tạo đơn thuê phòng.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Họ và tên người đặt" id="contact-name">
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </Field>

                <Field label="Số điện thoại" id="contact-phone">
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0901234567"
                    required
                  />
                </Field>
              </div>

              <Field label="Email nhận thông báo" id="contact-email">
                <Input
                  type="email"
                  id="contact-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </Field>

              <Field label="Ghi chú cho Studio (tùy chọn)" id="booking-note">
                <Textarea
                  id="booking-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Cần chuẩn bị thêm 2 ghế bar cao, quay lookbook thời trang..."
                  rows={3}
                />
              </Field>

              {/* Studio rules */}
              {room.rules && (
                <div className="p-4 bg-muted/30 rounded-lg text-xs space-y-1">
                  <strong>Quy định của Studio:</strong>
                  <p className="whitespace-pre-line text-muted-foreground">{room.rules}</p>
                </div>
              )}

              {/* Agreement Checkbox */}
              <label className="checkbox-label flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Tôi đã kiểm tra kỹ thời gian thuê và đồng ý với điều khoản đặt cọc 30%, thời gian dọn phòng 30 phút cũng như quy định của Studio.
                </span>
              </label>

              <div className="wizard-navigation flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Quay lại
                </Button>
                <Button
                  onClick={handleBookingSubmit}
                  disabled={submitting || !availResult || !acknowledged || !user || user.role !== "customer"}
                >
                  {submitting ? "Đang tạo đơn đặt phòng…" : "Tạo đơn & Đặt cọc"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Aside Summary Panel */}
        <aside className={`surface wizard-summary ${summaryOpen ? "summary-expanded" : ""}`}>
          <div className="summary-room">
            <StudioImage src={room.images[0]?.image_url ?? room.thumbnail_url ?? undefined} alt={room.name} />
            <div>
              <h3>{room.name}</h3>
              <p className="text-xs text-muted-foreground">{room.studio.name}</p>
              <p className="text-xs text-muted-foreground">{room.studio.district}, {room.studio.city}</p>
            </div>
          </div>

          <h2>Chi phí dự kiến</h2>

          <div className="text-xs text-muted-foreground space-y-1 py-2 border-b">
            <div>
              <span className="font-semibold text-foreground">Bắt đầu:</span> {startStr}
            </div>
            <div>
              <span className="font-semibold text-foreground">Kết thúc:</span> {endStr}
            </div>
            <div className="text-amber-700 font-medium">
              + 30 phút dọn dẹp sau ca thuê
            </div>
          </div>

          <div className="summary-breakdown space-y-2 py-3 text-sm">
            {availResult ? (
              <>
                <div className="flex justify-between">
                  <span>Tiền thuê phòng:</span>
                  <strong>{money(availResult.pricing.room_amount)}</strong>
                </div>
                {availResult.pricing.equipment_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tiền thiết bị:</span>
                    <strong>{money(availResult.pricing.equipment_amount)}</strong>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Tổng chi phí:</span>
                  <span className="text-primary">{money(availResult.pricing.total_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-emerald-700 font-bold">
                  <span>Tiền cọc giữ chỗ (30%):</span>
                  <span>{money(availResult.pricing.deposit_amount)}</span>
                </div>
              </>
            ) : (
              <p className="muted text-xs">
                {checking ? "Đang tính toán chi phí…" : "Vui lòng chọn thời gian hợp lệ để xem chi phí."}
              </p>
            )}
          </div>

          {/* Mobile Accordion Toggle */}
          <div className="mobile-summary-header">
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
              aria-label="Mở chi tiết chi phí"
            >
              <span>
                Cọc dự kiến:{" "}
                <strong>
                  {availResult ? money(availResult.pricing.deposit_amount) : "Chưa xác định"}
                </strong>
              </span>
              <ChevronDown size={18} />
            </button>
          </div>

          <p className="field-hint desktop-summary-note text-xs mt-4">
            Đơn sau khi tạo sẽ được giữ chỗ trong 15 phút để bạn chuyển khoản thanh toán tiền cọc.
          </p>
        </aside>
      </div>
    </main>
  );
}
