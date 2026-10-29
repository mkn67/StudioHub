"use client";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { localDate, type Selection, type State } from "@/domain/models";
import { slotsForDate } from "@/domain/rental";
import styles from "../styles/rental.module.css";

const dateLabel = (date: string) => date.split("-").reverse().join("/");
export function BookingCalendar({ state, selection, date, selectedStart, onDate, onStart, ignoreId }: {
  state: State; selection: Selection; date: string; selectedStart: number | null; onDate: (date: string) => void; onStart: (start: number) => void; ignoreId?: string;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const calendar = useRef<HTMLDivElement>(null);
  const today = localDate(state.now), [year, number] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const days = useMemo(() => Array.from({ length: count }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    const slots = day < today ? [] : slotsForDate(state, selection, day, ignoreId);
    const available = slots.filter(s => !s.reason).length;
    return { day, available, partial: available > 0 && available < slots.length };
  }), [count, month, state, selection, today, ignoreId]);
  const slots = slotsForDate(state, selection, date, ignoreId);
  function moveMonth(delta: number) { setMonth(new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7)); }
  return <div className={styles.scheduler}>
    <div className={styles.calendar} ref={calendar}>
      <div className={styles.calendarHeader}>
        <button type="button" aria-label="Tháng trước" disabled={month <= today.slice(0, 7)} onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button>
        <strong aria-live="polite">Tháng {number} / {year}</strong>
        <button type="button" aria-label="Tháng sau" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button>
      </div>
      <div className={styles.week} aria-hidden="true">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => <span key={d}>{d}</span>)}</div>
      <div className={styles.days} aria-label={`Lịch tháng ${number}/${year}`} onKeyDown={event => {
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (!delta) return;
        const buttons = Array.from(calendar.current?.querySelectorAll<HTMLButtonElement>("button[data-date]") ?? []);
        let index = buttons.indexOf(document.activeElement as HTMLButtonElement) + delta;
        while (index >= 0 && index < buttons.length && buttons[index].disabled) index += Math.sign(delta);
        if (buttons[index]) { event.preventDefault(); buttons[index].focus(); }
      }}>
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {days.map(({ day, available, partial }, i) => <button key={day} type="button" data-date={day} data-available={!!available} data-partial={partial}
          disabled={day < today || !available} aria-pressed={date === day} aria-label={`${dateLabel(day)} · ${available ? `${available} giờ bắt đầu khả dụng` : "không có giờ phù hợp"}`}
          onClick={() => onDate(day)}>{i + 1}</button>)}
      </div>
      <p className={styles.notice}>Gạch cyan: còn giờ phù hợp · ngày mờ: không còn slot cho lựa chọn hiện tại. Lịch minh họa dùng chung trong trình duyệt, chưa phải khả dụng từ server.</p>
    </div>
    <div><p className={styles.dateSummary}>Chọn giờ bắt đầu · {dateLabel(date)}</p>
      <div className={styles.slotScroll} aria-label="Các giờ bắt đầu">
        {[["Buổi sáng", 6, 12], ["Buổi chiều", 12, 18], ["Buổi tối", 18, 24], ["Ban đêm", 0, 6]].map(([name, from, to]) => {
          const group = slots.filter(s => { const h = +(s.label.split(":")[0]); return h >= Number(from) && h < Number(to); });
          return <section key={name}><h4 className={styles.slotGroup}>{name}</h4><div className={styles.slots}>{group.map(slot => <button type="button" key={slot.start} disabled={!!slot.reason} aria-pressed={!slot.reason && selectedStart === slot.start}
            aria-label={`${slot.label}${slot.reason ? ` · ${slot.reason}` : " · có thể chọn"}`} title={slot.reason ?? "Toàn bộ thời lượng và thiết bị đã được kiểm tra trong dữ liệu demo"} onClick={() => onStart(slot.start)}>{slot.label}</button>)}</div></section>;
        })}
      </div>
      {!slots.some(s => !s.reason) && <p role="status" className={styles.error}>Ngày này không có giờ phù hợp với gói, ekip, thiết bị hoặc thời hạn đặt trước. Hãy đổi ngày hoặc lựa chọn thuê.</p>}
      <p className={styles.notice}>Giờ gạch bỏ: ngoài giờ hoạt động, đang giữ/chuẩn bị, thiếu thời lượng liên tục hoặc thiếu thiết bị. Đặt trước 24 giờ + thời hạn cọc. Không hiển thị thông tin người đặt khác.</p>
    </div>
  </div>;
}
