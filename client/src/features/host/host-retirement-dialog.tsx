"use client";
import { Trash2, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { unitLabels } from "@/services/api/contracts";
import { hostMoney } from "./host-presentation";
import { retirementRequest, type RetirementTarget } from "./host-retirement";
import "./host-contract.css";

export function HostRetirementButton({ label, name, onClick, disabled = false }: { label: string; name: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="btn secondary host-retire-button" disabled={disabled} aria-label={`${label} ${name}`} onClick={onClick}><Trash2 size={16}/>{label}</button>;
}
export function HostRetirementDialog({ target, onClose, onSaved }: { target: RetirementTarget; onClose: () => void; onSaved: () => void }) {
  const action = useApiAction();
  const equipment = target.kind === "equipment";
  const label = equipment ? "Ngừng cung cấp" : "Ngừng áp dụng";
  return <Modal title={equipment ? "Ngừng cung cấp thiết bị?" : "Ngừng áp dụng bảng giá?"} className="host-dialog host-retirement-dialog" onClose={() => { if (!action.busy) onClose(); }}>
    <form className="host-retirement-form" aria-busy={action.busy} onSubmit={event => { event.preventDefault(); void action.run(async () => { const { path, ...request } = retirementRequest(target); await apiRequest(path, request); onSaved(); }); }}>
      <span className="host-retirement-icon"><TriangleAlert size={24}/></span>
      <p>{equipment ? "Bạn có chắc muốn ngừng cung cấp thiết bị này trong danh sách cho thuê?" : "Bạn có chắc muốn ngừng áp dụng mức giá này cho các lượt đặt thuê mới?"}</p>
      <div className="host-retirement-resource">{target.kind === "equipment" ? <strong>{target.equipment.name}</strong> : <><strong>{target.roomName}</strong><span>{hostMoney(target.rate.unit_price)} / {unitLabels[target.rate.rate_unit] ?? target.rate.rate_unit}</span><span>{target.rate.unit_minutes.toLocaleString("vi-VN")} phút · Tối thiểu {target.rate.minimum_units} đơn vị{target.rate.maximum_units != null ? ` · Tối đa ${target.rate.maximum_units}` : ""}</span></>}</div>
      <p className="host-retirement-note">Thao tác này chuyển sang trạng thái ngừng hoạt động, không xóa vĩnh viễn. {equipment ? "Thiết bị sẽ không còn xuất hiện trong danh sách đang công khai." : "Mức giá sẽ không còn xuất hiện trong bảng giá đang áp dụng."} Dữ liệu tham chiếu của đơn thuê cũ được giữ lại.</p>
      <p className="host-retirement-note">Tài nguyên ngừng hoạt động vẫn có trong danh sách quản lý. Có thể chỉnh sửa trạng thái khi máy chủ cho phép.</p>
      {action.error && <p className="host-form-error" role="alert">{action.error.startsWith("Không kết nối được") ? "Không kết nối được máy chủ. Chưa xác nhận được thay đổi. Vui lòng thử lại." : action.error}</p>}
      <div className="host-retirement-footer"><button type="button" className="btn secondary" disabled={action.busy} onClick={onClose}>Hủy</button><button type="submit" className="btn destructive" disabled={action.busy}>{action.busy ? "Đang xử lý…" : `Xác nhận ${label.toLocaleLowerCase("vi-VN")}`}</button></div>
    </form>
  </Modal>;
}
