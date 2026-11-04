"use client";
import { useState } from "react";
import Image from "next/image";
import { FileText, Expand, ZoomIn, ZoomOut } from "lucide-react";
import { Modal } from "@/components/ui";
import { HostPanel } from "./host-ui";
import "./host-contract.css";

export type ContractPreviewSource = { src: string; title: string; description: string; illustrative: boolean };
export const illustrativeContract: ContractPreviewSource = {
  src: "/images/contract-preview-placeholder.svg",
  title: "Mẫu hợp đồng hợp tác StudioHub",
  description: "Bản xem trước bố cục tài liệu, không phải hợp đồng đã ký.",
  illustrative: true,
};

export function ContractPreview({ source, onClose }: { source: ContractPreviewSource; onClose: () => void }) {
  const [zoom, setZoom] = useState(100), [failed, setFailed] = useState(false);
  return <Modal title={source.title} className="host-dialog host-contract-dialog" onClose={onClose} wide>
    <div className="host-contract-preview-tools"><div><strong>{source.illustrative ? "TÀI LIỆU MINH HỌA" : "Tài liệu hợp đồng"}</strong><p>{source.description}</p></div><div className="host-actions"><button className="btn secondary" aria-label="Thu nhỏ tài liệu" disabled={zoom <= 100} onClick={() => setZoom(value => value - 25)}><ZoomOut size={17}/></button><output aria-live="polite" aria-label="Tỷ lệ xem">{zoom}%</output><button className="btn secondary" aria-label="Phóng to tài liệu" disabled={zoom >= 200} onClick={() => setZoom(value => value + 25)}><ZoomIn size={17}/></button></div></div>
    <div className="host-contract-viewport" tabIndex={0} role="region" aria-label="Nội dung tài liệu có thể cuộn">
      {failed ? <p className="host-form-error" role="alert">Không tải được hình xem trước. Đóng cửa sổ và thử lại.</p> : <div className="host-contract-document" style={{ width: `${zoom}%` }}><Image src={source.src} width={794} height={1123} unoptimized alt={source.illustrative ? "Mẫu hợp đồng minh họa khổ A4, không có chữ ký hoặc giá trị xác nhận hợp đồng." : source.description} onError={() => setFailed(true)}/></div>}
    </div>
  </Modal>;
}
export function HostContractPanel() {
  const [open, setOpen] = useState(false);
  return <HostPanel title="Hợp đồng hợp tác StudioHub" description="Xem thông tin và tài liệu hợp đồng hợp tác cho thuê Studio." className="host-contract-panel">
    <div className="host-contract-card"><button className="host-contract-thumbnail" aria-label="Mở bản xem trước hợp đồng minh họa" onClick={() => setOpen(true)}><Image src={illustrativeContract.src} width={148} height={210} alt="Bản mẫu tài liệu A4 minh họa"/><span><Expand size={16}/>Xem mẫu</span></button><div className="host-contract-copy"><span className="host-legal-tag"><FileText size={15}/>Chưa có dữ liệu hợp đồng</span><h3>{illustrativeContract.title}</h3><p>{illustrativeContract.description}</p><small>Không thể ký, tải lên hoặc xác nhận hợp đồng tại đây.</small><button className="btn" onClick={() => setOpen(true)}><FileText size={17}/>Xem hợp đồng</button></div></div>
    {open && <ContractPreview source={illustrativeContract} onClose={() => setOpen(false)}/>}
  </HostPanel>;
}
