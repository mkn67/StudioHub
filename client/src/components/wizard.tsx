"use client";
import { Presence, StepPanel, useContentMotion } from "./motion/system";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Modal } from "./ui";
import { useStore, useSession } from "./store";
import {
  money,
  localDate,
  atDate,
  planLabel,
  dateTime,
  type Room,
  type Selection,
  type Plan,
} from "@/domain/models";
import { price, validateSelection, studioFor, HOUR } from "@/domain/engine";
export function BookingWizard({
  room,
  onClose,
  changeId,
}: {
  room: Room;
  onClose: () => void;
  changeId?: string;
}) {
  const { state, dispatch } = useStore(),
    user = useSession(),
    router = useRouter();
  const [direction, setDirection] = useState(1);
  const [step, setStep] = useState(1),
    [date, setDate] = useState(localDate(state.now + 3 * 24 * HOUR)),
    [startHour, setStartHour] = useState(9),
    [hours, setHours] = useState(2),
    [plan, setPlan] = useState<Plan>("hourly"),
    [participants, setParticipants] = useState(1),
    [equipment, setEquipment] = useState<Record<string, number>>({}),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [auth, setAuth] = useState(false);
  const studio = studioFor(state, room.id)!,
    type = state.types.find((t) => t.id === room.typeId)!;
  const effectivePlan = type.plans.includes(plan) ? plan : type.plans[0];
  const duration =
    effectivePlan === "session"
      ? 4
      : effectivePlan.startsWith("combo")
        ? Number(effectivePlan.slice(5))
        : hours;
  const start = atDate(date, effectivePlan === "session" ? 8 : startHour);
  const selection: Selection = {
    roomId: room.id,
    start,
    end: start + duration * HOUR,
    participants,
    plan: effectivePlan,
    equipment,
  };
  const total = price(state, selection),
    deposit = Math.round((total * studio.policy.depositPercent) / 100);
  const summaryRef = useContentMotion<HTMLElement>(`${total}|${deposit}`);
  const validate = () => {
    const e = validateSelection(state, selection, changeId);
    setError(e ?? "");
    return !e;
  };
  const submit = () => {
    if (!validate()) return;
    if (!accepted) {
      setError("Vui lòng xác nhận đã đọc các chính sách.");
      return;
    }
    if (!user) {
      setAuth(true);
      return;
    }
    const result = dispatch(
      changeId
        ? { type: "change", id: changeId, selection }
        : { type: "create", selection },
    );
    if (result) {
      onClose();
      if (changeId) router.push(`/my-bookings/${changeId}`);
      else router.push(`/payment/${result.bookings.at(-1)!.id}`);
    }
  };
  return (
    <Modal
      wide
      title={changeId ? "Yêu cầu đổi lịch" : "Đặt thuê không gian"}
      onClose={onClose}
    >
      <div className="wizard-steps">
        {["Thời gian thuê", "Thêm thiết bị", "Kiểm tra & xác nhận"].map(
          (x, i) => (
            <div className={step >= i + 1 ? "current" : ""} key={x}>
              <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
              {x}
            </div>
          ),
        )}
      </div>
      <div className="wizard-body">
        <Presence initial={false} custom={direction} mode="popLayout"><StepPanel key={step} direction={direction} animateEntrance={step !== 1 || direction < 0}>
          <p className="mono muted">
            {room.code} / {room.name}
          </p>
          {step === 1 && (
            <>
              <h3>Khi nào bạn muốn bắt đầu?</h3>
              <div className="form-grid">
                <label>
                  Ngày thuê
                  <input
                    type="date"
                    required
                    min={localDate(state.now)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label>
                  Hình thức thuê
                  <select
                    value={effectivePlan}
                    onChange={(e) => setPlan(e.target.value as Plan)}
                  >
                    {type.plans.map((p) => (
                      <option key={p} value={p}>
                        {planLabel[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Giờ bắt đầu
                  <select
                    value={effectivePlan === "session" ? 8 : startHour}
                    disabled={effectivePlan === "session"}
                    onChange={(e) => setStartHour(+e.target.value)}
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Thời lượng (giờ)
                  <input
                    type="number"
                    min="1"
                    max="10"
                    disabled={effectivePlan !== "hourly"}
                    value={duration}
                    onChange={(e) => setHours(+e.target.value)}
                  />
                </label>
                <label>
                  Số người tham gia
                  <input
                    type="number"
                    min="1"
                    max={room.capacity}
                    required
                    value={participants}
                    onChange={(e) => setParticipants(+e.target.value)}
                  />
                </label>
              </div>
              <div className="note">
                <strong>Giờ trả dự kiến: {dateTime(selection.end)}</strong>
                <p>
                  30 phút chuẩn bị sau ca không phải giờ sử dụng. Đến muộn không
                  kéo dài giờ trả.
                </p>
              </div>
              <p className="small-text muted">
                Cần đặt trước 24 giờ + {studio.policy.paymentMinutes} phút thanh
                toán.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <h3>Thêm thiết bị bạn cần.</h3>
              <p className="muted">
                Không bắt buộc. Giá tính theo số giờ thuê; tồn kho được kiểm tra
                trước khi xác nhận.
              </p>
              {state.equipment
                .filter((e) => e.studioId === studio.id && e.active)
                .map((e) => (
                  <div className="equipment-choice" data-selected={(equipment[e.id] ?? 0) > 0} key={e.id}>
                    <div>
                      <strong><Check className="equipment-selected" size={14} aria-hidden="true" /> {e.name}</strong>
                      <small>
                        {money(e.hourlyRate)} / giờ · Kho: {e.quantity}
                      </small>
                    </div>
                    <label>
                      <span className="sr-only">Số lượng {e.name}</span>
                      <input
                        type="number"
                        min="0"
                        max={e.quantity}
                        value={equipment[e.id] ?? 0}
                        onChange={(event) =>
                          setEquipment({
                            ...equipment,
                            [e.id]: +event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
            </>
          )}
          {step === 3 && (
            <>
              <h3>Kiểm tra lần cuối.</h3>
              <div className="line-item">
                <span>Phòng thực tế</span>
                <strong>
                  {room.code} · {room.floor}
                </strong>
              </div>
              <div className="line-item">
                <span>Thời gian</span>
                <span>
                  {dateTime(start)} — {dateTime(selection.end)}
                </span>
              </div>
              <div className="line-item">
                <span>Gói thuê</span>
                <span>
                  {planLabel[effectivePlan]} · {participants} người
                </span>
              </div>
              {Object.entries(equipment)
                .filter(([, q]) => q > 0)
                .map(([id, q]) => (
                  <div className="line-item" key={id}>
                    <span>
                      {state.equipment.find((e) => e.id === id)?.name}
                    </span>
                    <span>× {q}</span>
                  </div>
                ))}
              <div className="note">
                <strong>Chính sách áp dụng cho đơn này</strong>
                <p>
                  Thanh toán cọc trong {studio.policy.paymentMinutes} phút. Chủ
                  Studio duyệt trong 2 giờ sau khi nhận cọc.
                </p>
                <p>
                  Tự hủy trước {studio.policy.cancelHours} giờ.{" "}
                  {studio.policy.refundTiers
                    .map((t) => `Trước ${t.hours} giờ hoàn ${t.percent}% cọc`)
                    .join("; ")}
                  .
                </p>
                <p>
                  Đổi lịch trước {studio.policy.changeHours} giờ, tối đa 1 lần
                  được duyệt. Quá giờ {money(studio.policy.overtimePerBlock)} /
                  30 phút làm tròn lên.
                </p>
                <p>
                  Hủy đơn chưa trả cọc hoặc bỏ thanh toán: 1 vi phạm. Đủ 3 vi
                  phạm sẽ tạm ngưng đặt thuê.
                </p>
                {changeId && (
                  <p>
                    Lịch cũ giữ nguyên trong lúc chờ duyệt. Cọc đã trả được giữ
                    nguyên khi đổi thành công.
                  </p>
                )}
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                Tôi đã kiểm tra thông tin và đồng ý với các chính sách trên.
              </label>
              {auth && !user && (
                <div className="note">
                  <strong>Đăng nhập để xác nhận</strong>
                  <p>
                    Tài khoản minh họa, không cần mật khẩu. Lựa chọn của bạn
                    được giữ trong biểu mẫu này.
                  </p>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      dispatch({ type: "login", userId: "customer" });
                      setAuth(false);
                    }}
                  >
                    Tiếp tục với Minh Anh
                  </button>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </StepPanel></Presence>
        <aside ref={summaryRef} className="wizard-summary">
          <Image
            width={1400}
            height={1000}
            src={room.images[0]}
            alt={`Phòng ${room.code}`}
          />
          <h3>{room.name}</h3>
          <p className="mono">
            {room.code} · {room.area} m²
          </p>
          <div className="line-item">
            <span>Thuê phòng</span>
            <span>{money(price(state, { ...selection, equipment: {} }))}</span>
          </div>
          <div className="line-item">
            <span>Thiết bị</span>
            <span>
              {money(total - price(state, { ...selection, equipment: {} }))}
            </span>
          </div>
          <div className="line-item total">
            <span>Tổng cộng</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="line-item">
            <span>{changeId ? "Giữ cọc đã trả" : "Cọc cần thanh toán"}</span>
            <strong>
              {money(
                changeId
                  ? state.bookings.find((b) => b.id === changeId)!.deposit
                  : deposit,
              )}
            </strong>
          </div>
          <small>Đơn giá minh họa · Không thu tiền thật</small>
        </aside>
      </div>
      <div className="wizard-footer">
        {step > 1 ? (
          <button
            className="btn secondary"
            onClick={() => {
              setDirection(-1);
              setStep(step - 1);
              setError("");
            }}
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>
        ) : (
          <button className="text-button" onClick={onClose}>
            Đóng
          </button>
        )}
        {step < 3 ? (
          <button
            className="btn"
            onClick={() => {
              if (validate()) { setDirection(1); setStep(step + 1); }
            }}
          >
            Tiếp tục
            <ArrowRight size={17} />
          </button>
        ) : (
          <button className="btn" onClick={submit}>
            {!user
              ? "Đăng nhập để tiếp tục"
              : changeId
                ? "Gửi yêu cầu đổi lịch"
                : "Xác nhận & đến thanh toán"}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
    </Modal>
  );
}
