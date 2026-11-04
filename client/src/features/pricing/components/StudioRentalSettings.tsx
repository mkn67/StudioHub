"use client";
import { useState } from "react";
import type { OperatingHours, Studio, TimeSurcharge } from "@/domain/models";
import { money } from "@/domain/models";
import { effectiveOperatingHours } from "@/domain/rental";
import { useStore } from "@/components/store";
import styles from "../styles/rental.module.css";

export function StudioRentalSettings({ studio }: { studio: Studio }) {
  const { dispatch, notice } = useStore();
  const [hours, setHours] = useState<OperatingHours>(effectiveOperatingHours(studio) ?? { mode: "fixed", opens: "", closes: "" });
  const [rule, setRule] = useState<TimeSurcharge>(studio.timeSurcharge ?? { enabled: false, start: "22:00", end: "05:00", method: "fixed", value: 0 });
  return <section className={styles.settings} data-operating-settings={studio.id}>
    <h2>Giờ hoạt động & phụ thu khung giờ</h2>
    <p>Áp dụng cho các đơn mới tại {studio.name}. Phụ thu không mở rộng giờ hoạt động. Giá và lịch hiện được mô phỏng trên trình duyệt này.</p>
    <form onSubmit={async event => { event.preventDefault(); if ((await dispatch({ type: "rental_settings", studioId: studio.id, operatingHours: hours, timeSurcharge: rule }))) notice("Đã lưu giờ hoạt động và phụ thu cho đơn mới."); }}>
      <div className={styles.grid}>
        <label>Chế độ hoạt động<select value={hours.mode} onChange={e => setHours(e.target.value === "all_day" ? { mode: "all_day" } : { mode: "fixed", opens: "", closes: "" })}>
          <option value="fixed">Giờ hoạt động cố định</option><option value="all_day">Hoạt động 24/24</option>
        </select></label>
        {hours.mode === "fixed" && <><label>Giờ mở cửa<input type="time" step={1800} required value={hours.opens} onChange={e => setHours({ ...hours, opens: e.target.value })} /></label>
          <label>Giờ đóng cửa<input type="time" step={1800} required value={hours.closes === "24:00" ? "00:00" : hours.closes} onChange={e => setHours({ ...hours, closes: e.target.value })} /></label></>}
      </div>
      <p>{hours.mode === "all_day" ? "Cho phép chọn lịch cả ngày, vẫn cần phòng và thiết bị khả dụng." : hours.closes && hours.opens && hours.closes < hours.opens ? "Giờ đóng cửa thuộc ngày hôm sau." : "Ca thuê phải nằm trọn trong giờ hoạt động đã cấu hình."}</p>
      <label className="checkbox-label"><input type="checkbox" checked={rule.enabled} onChange={e => setRule({ ...rule, enabled: e.target.checked })} /> Bật phụ thu theo khung giờ</label>
      {rule.enabled && <><div className={styles.grid}>
        <label>Bắt đầu phụ thu<input type="time" step={1800} required value={rule.start} onChange={e => setRule({ ...rule, start: e.target.value })} /></label>
        <label>Kết thúc phụ thu<input type="time" step={1800} required value={rule.end} onChange={e => setRule({ ...rule, end: e.target.value })} /></label>
        <label>Cách tính<select value={rule.method} onChange={e => setRule({ ...rule, method: e.target.value as TimeSurcharge["method"] })}><option value="fixed">Số tiền / giờ thuộc khung phụ thu</option><option value="percentage">Phần trăm giá phòng phân bổ theo thời gian</option></select></label>
        <label>{rule.method === "fixed" ? "Phụ thu mỗi giờ (VND)" : "Tỷ lệ phụ thu (%)"}<input type="number" min={0} max={rule.method === "percentage" ? 100 : undefined} step={1} required value={rule.value} onChange={e => setRule({ ...rule, value: +e.target.value })} /></label>
      </div><p className={styles.notice}>Ví dụ 60 phút thuộc khung phụ thu: {rule.method === "fixed" ? `cộng ${money(rule.value)}` : `cộng ${rule.value}% phần giá phòng của 60 phút đó`}. Với combo, giá gói được phân bổ đều theo phút; không phụ thu lên thiết bị hoặc phí ekip. Một khung duy nhất, không cộng chồng. Khác với phí sử dụng quá giờ.</p></>}
      <button className="btn secondary">Lưu giờ hoạt động & phụ thu</button>
    </form>
  </section>;
}
