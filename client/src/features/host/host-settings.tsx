"use client";
import { UserRound, Building2, ShieldCheck } from "lucide-react";
import { WorkspaceSettings } from "@/features/workspace/workspace-settings";
import { HostPanel } from "./host-ui";
import { HostContractPanel } from "./contract-preview";
import "./host-contract.css";

function HostLegalProfile() {
  return <HostPanel className="host-legal-profile" title="Thông tin pháp lý & hợp đồng" description="Thông tin phục vụ việc xác lập hợp đồng hợp tác với StudioHub.">
    <div className="host-legal-intro"><span className="host-legal-tag">Chưa hỗ trợ cập nhật</span><p>Loại bên ký kết và hồ sơ pháp lý chưa được lưu trên hệ thống. Thông tin tài khoản hoặc địa chỉ Studio không thay thế thông tin pháp lý.</p></div>
    <div className="host-legal-parties" aria-label="Các hình thức bên ký kết dự kiến"><section><UserRound size={22}/><h3>Cá nhân</h3><p>Họ tên pháp lý, ngày sinh và địa chỉ liên hệ của bên ký kết.</p><p className="host-legal-muted">Thông tin giấy tờ định danh chỉ được yêu cầu khi có mục đích và cơ chế bảo mật phù hợp.</p></section><section><Building2 size={22}/><h3>Doanh nghiệp / Tổ chức</h3><p>Tên pháp lý, mã đăng ký, mã số thuế, địa chỉ đăng ký và người đại diện có thẩm quyền.</p><p className="host-legal-muted">Chưa thể khai báo hoặc xác nhận tư cách đại diện trên StudioHub.</p></section></div>
    <div className="host-legal-privacy"><ShieldCheck size={21}/><p>Chưa thu thập CCCD, ảnh giấy tờ hoặc thông tin tài khoản ngân hàng tại đây. Hiện chưa có dữ liệu xác minh pháp lý.</p></div>
  </HostPanel>;
}
export function HostSettings() {
  return <WorkspaceSettings role="host" extraAccountFields={<label>Ngày sinh <span className="host-legal-tag">Chưa hỗ trợ</span><input aria-label="Ngày sinh" type="date" disabled aria-describedby="host-birthday-unavailable"/><small id="host-birthday-unavailable">Hệ thống chưa hỗ trợ lưu ngày sinh.</small></label>} afterAccount={<><HostLegalProfile/><HostContractPanel/></>}/>;
}
