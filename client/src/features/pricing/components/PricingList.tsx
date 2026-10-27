"use client";
import { Flame, Star } from "lucide-react";
import type { State } from "@/domain/models";
import { money } from "@/domain/models";
import { effectiveFeaturedPricing, effectivePricingPlans, featuredPricingLabels } from "@/domain/featured-pricing";
import { useContentMotion } from "@/components/motion/system";
import styles from "../styles/editorial.module.css";

export function PricingList({ state, roomId, featuredOnly = false }: { state: State; roomId: string; featuredOnly?: boolean }) {
  const selected = effectiveFeaturedPricing(state, roomId);
  const rates = effectivePricingPlans(state, roomId);
  const scope = useContentMotion<HTMLDivElement>(JSON.stringify([roomId, selected, rates.map(r => r.amount)]));
  const visible = featuredOnly ? rates.filter(r => r.plan === selected?.plan) : rates;
  return <div ref={scope} className={styles.pricingList} role="list" aria-label="Bảng giá áp dụng" data-room-pricing={roomId}>
    {visible.map(rate => {
      const featured = selected?.plan === rate.plan;
      const Icon = selected?.badge === "recommended" ? Star : Flame;
      return <div key={rate.plan} role="listitem" className={styles.pricingRow} data-plan={rate.plan} data-featured={featured}>
        <div className={styles.planCopy}>
          {featured && <span className={styles.featuredBadge}><Icon size={15} aria-hidden="true" />{featuredPricingLabels[selected!.badge]}</span>}
          <h3>{rate.title}</h3><p>{rate.duration}</p>
          {!!Object.keys(rate.includedEquipment).length && <p>Đã bao gồm: {Object.entries(rate.includedEquipment).map(([id, q]) => `${q} × ${state.equipment.find(e => e.id === id)?.name ?? "Thiết bị cần cập nhật"}`).join(" · ")}</p>}
          {!!rate.includedServices.filter(Boolean).length && <p>{rate.includedServices.filter(Boolean).join(" · ")}</p>}
          {rate.includedCrew && <p>Giá gói gồm {rate.includedCrew} người · theo giới hạn ekip của phòng.</p>}
          {rate.promotionDisplay && <p className={styles.promotion}>Ưu đãi · giảm {money(rate.promotionDisplay.savings)} ({rate.promotionDisplay.percent}%) · {rate.promotion?.startsOn.split("-").reverse().join("/")}–{rate.promotion?.endsOn.split("-").reverse().join("/")}</p>}
        </div>
        <div className={styles.rateAmount}>{rate.promotionDisplay && <del>{money(rate.promotionDisplay.originalPrice)}</del>}<strong>{money(rate.amount)}</strong><span>{rate.unit}</span></div>
      </div>;
    })}
    {!visible.length && <p className={styles.emptyPricing}>{featuredOnly ? "Chưa chọn gói nổi bật cho phòng này." : "Hiện chưa có gói thuê đang áp dụng cho phòng này."}</p>}
  </div>;
}
