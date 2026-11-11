"use client";

import { useState } from "react";
import { CalendarDays, Camera, Check, Maximize, MoveVertical, Users } from "lucide-react";
import { Modal } from "@/components/ui";
import { Presence } from "@/components/motion/system";
import { money } from "@/domain/models";
import { type ApiRoom, type CalendarData, formatApiTime, unitLabels } from "@/services/api/contracts";
import { ApiImage } from "./ApiImage";
import { BackendBookingWizard } from "@/features/booking/backend-booking";

export function RoomKeySpecs({ room }: { room: ApiRoom }) {
  return <dl className="room-key-specs">
    <div><dt><Maximize size={20}/>Diện tích phòng</dt><dd>{room.area} <small>m²</small></dd></div>
    <div><dt><Users size={20}/>Sức chứa tối đa</dt><dd>{room.capacity} <small>người</small></dd></div>
    {room.ceiling_height != null && room.ceiling_height > 0 && <div><dt><MoveVertical size={20}/>Chiều cao trần</dt><dd>{room.ceiling_height} <small>m</small></dd></div>}
  </dl>;
}

export function RoomDetailGallery({ room }: { room: ApiRoom }) {
  const [selected, setSelected] = useState<number | null>(null);
  const images = room.images?.filter(image => image.image_url?.trim()) ?? [];
  const gallery = images.length ? images : room.thumbnail_url ? [{ image_url: room.thumbnail_url, alt: room.name }] : [];
  return <section className="room-detail-media" aria-label={`Hình ảnh ${room.name}`}>
    {gallery.length ? <div className="api-gallery" data-count={Math.min(gallery.length, 3)}>
      {gallery.slice(0, 3).map((image, index) => <button type="button" className="api-gallery-item" key={`${image.image_url}-${index}`} onClick={() => setSelected(index)} aria-label={`Mở ảnh ${index + 1} của ${room.name}`}><ApiImage src={image.image_url} alt={image.alt || `${room.name} – ảnh ${index + 1}`}/></button>)}
      <button className="api-gallery-all" type="button" onClick={() => setSelected(0)}><Camera size={16}/>Xem {gallery.length > 1 ? `${gallery.length} ảnh` : "ảnh phòng"}</button>
    </div> : <div className="room-media-empty"><Camera size={36}/><strong>Phòng chưa có ảnh</strong><p>Studio chưa cung cấp hình ảnh của phòng này.</p></div>}
    {room.media_notice && <p className="room-media-caption">{room.media_notice}</p>}
    <Presence>{selected !== null && gallery[selected] && <Modal wide title={`${room.name} · Ảnh ${selected + 1}/${gallery.length}`} onClose={() => setSelected(null)}><div className="api-lightbox"><ApiImage src={gallery[selected].image_url} alt={gallery[selected].alt || `${room.name} – ảnh ${selected + 1}`}/>{gallery.length > 1 && <div><button className="btn secondary" onClick={() => setSelected((selected + gallery.length - 1) % gallery.length)}>Ảnh trước</button><button className="btn secondary" onClick={() => setSelected((selected + 1) % gallery.length)}>Ảnh tiếp</button></div>}</div></Modal>}</Presence>
  </section>;
}

export function RoomRateSummary({ room }: { room: ApiRoom }) {
  return <section className="room-editorial-section room-main-rates" id="room-rates" aria-labelledby="room-pricing-title">
    <div className="room-section-heading"><h2 id="room-pricing-title">Giá thuê phòng</h2></div>
    {room.rates?.length ? <ul className="room-package-list">{room.rates.map(rate => {
      const unit = unitLabels[rate.rate_unit] ?? rate.rate_unit;
      const title = unit.charAt(0).toLocaleUpperCase("vi-VN") + unit.slice(1);
      const hours = Math.floor(rate.unit_minutes / 60);
      const minutes = rate.unit_minutes % 60;
      const duration = [hours > 0 ? `${hours} tiếng` : "", minutes > 0 ? `${minutes} phút` : ""].filter(Boolean).join(" ");
      const showDuration = ["session", "half_day"].includes(rate.rate_unit) && duration;
      const quantityUnit = rate.rate_unit === "half_day" ? "gói" : unit;
      return <li key={rate.rate_id}>
        <div><strong>{title}{showDuration ? ` (${duration})` : ""}</strong><span>{money(rate.unit_price)}<small> / {unit}</small></span></div>
        <p>Thuê từ {rate.minimum_units}{rate.maximum_units != null ? ` đến ${rate.maximum_units}` : ""} {quantityUnit}</p>
      </li>;
    })}</ul> : <p className="room-unlisted-price">Phòng chưa có bảng giá. Vui lòng xác nhận với Studio trước khi đặt.</p>}
    <p className="room-editorial-note">Giá và lịch trống được xác nhận khi bạn chọn lịch.</p>
  </section>;
}

export function RoomBookingPanel({ room, calendar }: { room: ApiRoom; calendar: { data: CalendarData | null; loading: boolean; error: string } }) {
  const [open, setOpen] = useState(false);
  return <><aside className="surface room-booking-card room-booking-entry" aria-labelledby="room-booking-title">
    <h2 id="room-booking-title"><CalendarDays size={24} aria-hidden="true"/>Đặt lịch Studio</h2>
    <p className="room-booking-guidance">Chọn gói thuê, ngày giờ và thiết bị trong cửa sổ đặt lịch.</p>
    <button className="btn" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Kiểm tra giá &amp; lịch trống</button>
    <p className="room-quote-note"><Check size={15}/>Giá và lịch được máy chủ kiểm tra theo lựa chọn. Lịch chưa được giữ chỗ.</p>
  </aside>
    <Presence>{open && <Modal wide className="room-booking-dialog" title="Đặt lịch Studio" onClose={() => setOpen(false)}>
      <details className="room-calendar-disclosure room-modal-calendar"><summary>Xem lịch đã bận</summary>
        {calendar.loading ? <p role="status">Đang tải lịch…</p> : calendar.error ? <p role="alert">{calendar.error}</p> : calendar.data ? <>
          {calendar.data.busy_slots.length ? <ul>{calendar.data.busy_slots.map((slot, index) => <li key={index}>{formatApiTime(slot.busy_start)} – {formatApiTime(slot.busy_end)}</li>)}</ul> : <p>Chưa ghi nhận khung giờ bận trong khoảng đang xem.</p>}
          <p>Lịch được kiểm tra lại theo ngày giờ và gói thuê bạn chọn; thông tin này không giữ chỗ.</p>
        </> : <p>Chưa tải được dữ liệu lịch. Hãy kiểm tra lịch theo lựa chọn trong form bên dưới.</p>}
      </details>
      <BackendBookingWizard id={String(room.room_id)} embedded/>
    </Modal>}</Presence>
  </>;
}
