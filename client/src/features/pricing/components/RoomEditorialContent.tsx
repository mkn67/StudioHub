"use client";
import { useRef } from "react";
import { Wifi, Wind, Sun, AudioLines, Shirt, Check, MapPin, Boxes } from "lucide-react";
import type { State } from "@/domain/models";
import { money } from "@/domain/models";
import { gsap, useGSAP, gsapEase } from "@/components/motion/gsap-runtime";
import { PricingList } from "./PricingList";
import styles from "../styles/editorial.module.css";

const amenityIcons = { "Wi-Fi": Wifi, "Điều hòa": Wind, "Ánh sáng tự nhiên": Sun, "Cách âm": AudioLines, "Phòng thay đồ": Shirt };

export function RoomEditorialContent({ state, roomId }: { state: State; roomId: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      root.current?.querySelectorAll<HTMLElement>("[data-editorial-heading]").forEach(heading => {
        gsap.fromTo(heading, { opacity: .8, y: 4 }, { opacity: 1, y: 0, duration: .28, ease: gsapEase, immediateRender: false, clearProps: "opacity,transform",
          scrollTrigger: { trigger: heading, start: "top 94%", once: true } });
      });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [roomId], revertOnUpdate: true });
  const room = state.rooms.find(r => r.id === roomId), type = state.types.find(t => t.id === room?.typeId);
  const studio = state.studios.find(s => s.id === type?.studioId);
  if (!room || !type || !studio) return null;
  const equipment = state.equipment.filter(e => e.studioId === studio.id && e.active);
  return <div ref={root} className={styles.roomEditorial}>
    <section className={styles.section} aria-labelledby="room-overview">
      <span className={styles.eyebrow}>01 / KHÔNG GIAN</span>
      <h2 id="room-overview" data-editorial-heading>Một khoảng riêng<br />cho sáng tạo.</h2>
      <p className={styles.lead}>{room.feature}.</p>
      <p>Bạn chọn đúng phòng vật lý <strong>{room.code}</strong>, thuộc loại {type.name}. Mỗi phòng có lịch riêng; không tự động xếp sang phòng cùng loại.</p>
      <dl className={styles.specifications}>
        <div><dt>Diện tích</dt><dd>{room.area}<small> m²</small></dd></div>
        <div><dt>Sức chứa tối đa</dt><dd>{room.capacity}<small> người</small></dd></div>
        <div><dt>Vị trí phòng</dt><dd className={styles.floor}>{room.floor}</dd></div>
      </dl>
      <p className={styles.demoNote}>Thông tin, giá và hình ảnh trên trang này là dữ liệu minh họa.</p>
    </section>
    <section className={styles.section} aria-labelledby="room-amenities">
      <span className={styles.eyebrow}>02 / CÓ SẴN TRONG PHÒNG</span>
      <h2 id="room-amenities" data-editorial-heading>Tiện ích trong phòng</h2>
      <ul className={styles.amenities}>{room.amenities.map(name => {
        const Icon = amenityIcons[name as keyof typeof amenityIcons] ?? Check;
        return <li key={name}><Icon size={21} aria-hidden="true" /><span>{name}</span></li>;
      })}</ul>
      <h3 className={styles.includedHeading}>Đã bao gồm trong giá phòng</h3>
      <ul className={styles.included}>{room.included.map(name => <li key={name}><Check size={15} aria-hidden="true" />{name}</li>)}</ul>
    </section>
    <section className={styles.section} aria-labelledby="room-equipment">
      <span className={styles.eyebrow}>03 / THUÊ THÊM THIẾT BỊ</span>
      <h2 id="room-equipment" data-editorial-heading>Thêm công cụ,<br />thêm khả năng.</h2>
      <p>Thiết bị tính phí riêng, dùng chung kho Studio. Số lượng được kiểm tra theo thời gian thuê.</p>
      <ul className={styles.equipment}>{equipment.map(item => <li key={item.id}>
        <span className={styles.equipmentName}><Boxes size={19} aria-hidden="true" />{item.name}</span>
        <span className={styles.equipmentRate}><strong>{money(item.hourlyRate)}</strong><small> / giờ</small></span>
      </li>)}</ul>
      {!equipment.length && <p>Hiện chưa có thiết bị thuê thêm đang hoạt động tại Studio.</p>}
    </section>
    <section className={styles.section} aria-labelledby="room-pricing">
      <span className={styles.eyebrow}>04 / BẢNG GIÁ ÁP DỤNG</span>
      <h2 id="room-pricing" data-editorial-heading>Chọn thời lượng.<br /><span className={styles.cyan}>Rõ giá thuê.</span></h2>
      <p>Giá dành cho phòng {room.code}. Thiết bị thuê thêm được tính riêng theo thời gian sử dụng.</p>
      <PricingList state={state} roomId={roomId} />
    </section>
    <section className={styles.section} aria-labelledby="room-policies">
      <span className={styles.eyebrow}>05 / TRƯỚC KHI BẠN ĐẶT</span>
      <h2 id="room-policies" data-editorial-heading>Giá thuê & chính sách</h2>
      <dl className={styles.policies}>
        <div><dt>Khung giờ & chuẩn bị</dt><dd>Mở cửa <strong>{studio.policy.openHour}:00–{studio.policy.closeHour}:00</strong>. Sau mỗi ca có <strong>30 phút</strong> chuẩn bị, không phải giờ sử dụng miễn phí.</dd></div>
        <div><dt>Đặt trước & tiền cọc</dt><dd>Đặt trước ít nhất <strong>24 giờ + {studio.policy.paymentMinutes} phút</strong> thanh toán. Cọc <strong>{studio.policy.depositPercent}%</strong> tổng giá.</dd></div>
        <div><dt>Hủy & hoàn cọc</dt><dd>Tự hủy trước ít nhất <strong>{studio.policy.cancelHours} giờ</strong>. {studio.policy.refundTiers.map((tier, i) => <span key={i}>Trước <strong>{tier.hours} giờ</strong>: hoàn <strong>{tier.percent}%</strong> cọc{ i < studio.policy.refundTiers.length - 1 ? "; " : "." }</span>)}</dd></div>
        <div><dt>Đổi lịch</dt><dd>Gửi trước ít nhất <strong>{studio.policy.changeHours} giờ</strong>; tối đa <strong>một lần</strong> đổi thành công, cần chủ Studio duyệt.</dd></div>
        <div><dt>Quá giờ & đến muộn</dt><dd><strong>{money(studio.policy.overtimePerBlock)} / 30 phút</strong>, làm tròn lên. Đến muộn không kéo dài giờ trả.</dd></div>
      </dl>
    </section>
    <section className={styles.section} aria-labelledby="room-studio">
      <span className={styles.eyebrow}>06 / STUDIO CỦA PHÒNG NÀY</span>
      <h2 id="room-studio" data-editorial-heading>{studio.name}</h2>
      <p className={styles.studioDescription}>{studio.description}</p>
      <p className={styles.studioLocation}><MapPin size={20} aria-hidden="true" />{studio.address}</p>
    </section>
  </div>;
}
