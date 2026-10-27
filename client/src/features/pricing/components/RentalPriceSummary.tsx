import { money, type RentalSnapshot } from "@/domain/models";
import styles from "../styles/rental.module.css";
export function RentalPriceSummary({ snapshot }: { snapshot: RentalSnapshot }) {
  const p = snapshot.breakdown;
  return <dl className={styles.breakdown} aria-label="Chi tiết giá thuê">
    <div><dt>{snapshot.plan.title}<small>Thiết bị và dịch vụ kèm gói không tính thêm</small>{!!p.discountSavings && <small>Đã giảm {money(p.discountSavings)} so với giá gốc {money(p.rental + p.discountSavings)} theo ngày thuê</small>}</dt><dd>{money(p.rental)}</dd></div>
    {!!p.equipment && <div><dt>Thiết bị chọn thêm</dt><dd>{money(p.equipment)}</dd></div>}
    {!!p.timeSurcharge && <div><dt>Phụ thu khung giờ<small>{p.timeSurchargeMinutes} phút × {snapshot.timeSurcharge?.method === "fixed" ? `${money(snapshot.timeSurcharge.value)} / giờ` : `${snapshot.timeSurcharge?.value}% giá phòng phân bổ`}</small></dt><dd>{money(p.timeSurcharge)}</dd></div>}
    {!!p.crewSurcharge && <div><dt>Phụ thu ekip<small>{p.extraPeople} người vượt mức · {snapshot.crewPolicy?.unit === "hour" ? "tính theo thời lượng thuê" : "mỗi đơn"}</small></dt><dd>{money(p.crewSurcharge)}</dd></div>}
    <div className={`${styles.total} total`}><dt>Tổng cộng</dt><dd>{money(p.total)}</dd></div>
  </dl>;
}
