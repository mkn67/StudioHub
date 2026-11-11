"use client";
import { ArrowUpRight, Building2, Check, MapPin, Package, Play, ShieldCheck } from "lucide-react";
import { type ApiRoom } from "@/services/api/contracts";
import { RoomRateSummary } from "./RoomDetailPresentation";

function RoomRentalPolicies({ room }: { room: ApiRoom }) {
  const rules = room.rules?.trim();
  const long = !!rules && (rules.length > 320 || rules.split("\n").length > 4);
  return <section className="room-editorial-section" id="room-policies">
    <div className="room-policy-panel"><ShieldCheck size={24} aria-hidden="true"/><div>
      <h2>Những điều cần biết trước khi thuê</h2>
      {long ? <details><summary>Đọc nội quy phòng</summary><p className="room-rules-copy">{rules}</p></details> : <p className="room-rules-copy">{rules || "Studio chưa cập nhật nội quy cho phòng này. Vui lòng xác nhận trước khi đặt."}</p>}
    </div></div>
  </section>;
}

function RoomStudioIdentity({ room }: { room: ApiRoom }) {
  const studio = room.studio;
  const demo = studio.is_demo_profile === true;
  const address = [studio.address, studio.district, studio.city].filter(Boolean).join(", ");
  const phone = !demo && studio.phone && /^\+?[\d\s().-]{7,24}$/.test(studio.phone) ? studio.phone : null;
  return <section className="room-editorial-section room-studio-identity" aria-labelledby="room-studio-title">
    <div className="room-section-heading"><h2 id="room-studio-title">Studio &amp; đơn vị vận hành</h2></div>
    <div className="room-studio-row"><span className="room-studio-icon"><Building2 size={26} aria-hidden="true"/></span><div>
      <h3>{studio.name}</h3>
      {demo ? <p className="room-studio-meta">Studio mẫu · thông tin minh họa, địa chỉ chưa được xác minh.</p> : address ? <p className="room-studio-address"><MapPin size={16} aria-hidden="true"/><span>{address}</span></p> : <p className="room-studio-meta">Studio chưa cung cấp địa chỉ công khai.</p>}
      {phone && <a className="room-studio-contact" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Gọi Studio <ArrowUpRight size={16}/></a>}
    </div></div>
  </section>;
}

export function RoomEditorialDetails({ room: r }: { room: ApiRoom }) {
  const preview = r.video_reference?.kind === "reference-not-room-tour" && /^https:\/\/www\.pexels\.com\/video\/[a-z0-9-]+\/$/.test(r.video_reference.url) ? r.video_reference : null;
  return <div className="room-editorial-content">
    <section className="room-editorial-section" id="room-description">
      <div className="room-section-heading"><h2>Không gian dành cho bạn</h2></div>
      <p className="room-intro-copy">{r.description || "Studio đang cập nhật mô tả cho phòng này."}</p>
      {preview && <a className="room-video-reference" href={preview.url} target="_blank" rel="noopener noreferrer"><span className="room-video-play"><Play size={18}/></span><span><strong>{preview.label}</strong><small>Video tham khảo · không phải video quay phòng này</small></span><ArrowUpRight size={18}/></a>}
    </section>
    <section className="room-editorial-section" id="room-amenities"><div className="room-section-heading"><h2>Tiện ích của phòng</h2></div>{r.amenities?.length ? <ul className="room-amenity-grid" data-single={r.amenities.length === 1}>{r.amenities.map(a => <li key={a.amenity_id}><Check size={18}/><span>{a.name}</span></li>)}</ul> : <p>Phòng chưa cập nhật danh sách tiện ích.</p>}<div className="room-equipment-note"><Package size={22}/><div><h3>Thiết bị đi kèm</h3><p>Chưa có danh sách xác nhận thiết bị bao gồm trong giá phòng. Thiết bị thuê thêm và chi phí được hiển thị riêng ở bước chọn lịch.</p></div></div></section>
    <RoomRateSummary room={r}/>
    <RoomRentalPolicies room={r}/>
    <RoomStudioIdentity room={r}/>

  </div>;
}
