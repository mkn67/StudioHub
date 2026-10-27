"use client";
import { useState } from "react";
import { Check, Eye } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { money, type FeaturedPricingBadge } from "@/domain/models";
import { effectiveFeaturedPricing, effectivePricingPlans, featuredPricingLabels } from "@/domain/featured-pricing";
import { PricingList } from "./PricingList";
import styles from "../styles/editorial.module.css";

export function FeaturedPricingManager({ typeId }: { typeId: string }) {
  const { state, dispatch, notice } = useStore();
  const rooms = state.rooms.filter(room => room.typeId === typeId);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [draftBadge, setDraftBadge] = useState<FeaturedPricingBadge>("featured");
  const room = rooms.find(r => r.id === roomId) ?? rooms[0];
  if (!room) return null;
  const selected = effectiveFeaturedPricing(state, room.id);
  const badge = selected?.badge ?? draftBadge;
  const rates = effectivePricingPlans(state, room.id);
  function select(plan: (typeof rates)[number]["plan"], nextBadge = badge) {
    if (dispatch({ type: "featured_pricing", roomId: room!.id, selection: { plan, badge: nextBadge } }))
      notice(`Đã đặt gói nổi bật cho ${room!.code}. Giá thuê không thay đổi.`);
  }
  return <section className={styles.manager} aria-labelledby={`featured-heading-${typeId}`} data-featured-manager={typeId}>
    <div className={styles.managerHeading}>
      <div><span className={styles.eyebrow}>HIỂN THỊ TRÊN TRANG PHÒNG</span><h3 id={`featured-heading-${typeId}`}>Một gói nổi bật. Đúng phòng.</h3></div>
      <Link href={`/rooms/${room.id}`} className={styles.previewLink}><Eye size={16} aria-hidden="true" /> Xem phòng {room.code}</Link>
    </div>
    <p className={styles.managerNote}>Nhãn giới thiệu của Host, không phải giảm giá. Lựa chọn riêng cho từng phòng thực tế; dữ liệu mô phỏng được lưu trên trình duyệt này.</p>
    <div className={styles.managerSettings}>
      <label>Phòng thực tế<select aria-label={`Phòng nổi bật · ${typeId}`} value={room.id} onChange={e => setRoomId(e.target.value)}>
        {rooms.map(r => <option key={r.id} value={r.id}>{r.code} · {r.active ? r.name : "Tạm ngưng"}</option>)}
      </select></label>
      <label>Nhãn hiển thị<select aria-label={`Nhãn nổi bật · ${typeId}`} value={badge} onChange={e => {
        const next = e.target.value as FeaturedPricingBadge; setDraftBadge(next);
        if (selected) select(selected.plan, next);
      }}>
        {Object.entries(featuredPricingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button className="text-button" type="button" disabled={!room.featuredPricing} onClick={() => {
        if (dispatch({ type: "featured_pricing", roomId: room.id, selection: null })) notice(`Đã bỏ nổi bật cho ${room.code}.`);
      }}>Bỏ nổi bật</button>
    </div>
    <div className={styles.manageRates} aria-label={`Chọn gói nổi bật cho ${room.code}`}>
      {rates.map(rate => <div className={styles.manageRate} key={rate.plan} data-plan={rate.plan} data-selected={selected?.plan === rate.plan}>
        <div><strong>{rate.title}</strong><small>{money(rate.amount)} {rate.unit}{rate.source === "room" ? " · Giá riêng của phòng" : " · Giá theo loại phòng"}</small></div>
        <button type="button" className="btn secondary small" aria-pressed={selected?.plan === rate.plan} disabled={selected?.plan === rate.plan} onClick={() => select(rate.plan)}>
          {selected?.plan === rate.plan ? <><Check size={15} aria-hidden="true" />Đang nổi bật</> : "Đặt làm nổi bật"}
        </button>
      </div>)}
      {!rates.length && <p className={styles.managerNote}>Phòng hoặc Studio đang ngừng hoạt động, hoặc chưa có bảng giá hợp lệ.</p>}
    </div>
    <div className={styles.preview} aria-live="polite" aria-label={`Xem trước gói nổi bật phòng ${room.code}`}>
      <span className={styles.eyebrow}>XEM TRƯỚC · PHÒNG {room.code}</span>
      <PricingList state={state} roomId={room.id} featuredOnly />
    </div>
  </section>;
}
