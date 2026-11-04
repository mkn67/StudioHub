"use client";
import { useId, useState, type ReactNode } from "react";
import { Building2, DoorOpen, Boxes, Lightbulb, Mic2, Camera, Inbox, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { Modal } from "@/components/ui";
import { useApiAction } from "@/components/api-ui";
import { apiBaseUrl, apiRequest } from "@/services/api/client";

export function HostPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="host-page-header"><div><p className="host-eyebrow">Không gian làm việc</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="host-header-actions">{action}</div>}</div>;
}
export function HostPanel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`host-panel ${className}`}>{title && <div className="host-panel-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>}<div className="host-panel-body">{children}</div></section>;
}
export function HostKpi({ label, value, icon, tone = "cyan", detail }: { label: string; value: ReactNode; icon: ReactNode; tone?: string; detail?: string }) {
  return <div className={`host-kpi host-tone-${tone}`}><div className="host-kpi-label"><span>{label}</span>{icon}</div><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
const statuses: Record<string, string> = { active: "Hoạt động", inactive: "Đã ẩn", maintenance: "Bảo trì", available: "Sẵn sàng", pending: "Chờ xử lý", confirmed: "Đã xác nhận", checked_in: "Đang sử dụng", completed: "Hoàn thành", cancelled: "Đã hủy", rejected: "Đã từ chối", expired: "Hết hạn" };
export function HostStatusBadge({ status }: { status: string }) { return <span className="host-badge" data-status={status}>{statuses[status] ?? status}</span>; }
export function HostEmptyState({ title, description, action, unavailable = false }: { title: string; description: string; action?: ReactNode; unavailable?: boolean }) {
  return <div className={`host-empty ${unavailable ? "host-unavailable" : ""}`}><span className="host-empty-icon">{unavailable ? <AlertCircle size={27}/> : <Inbox size={27}/>}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function HostSkeleton({ rows = 3 }: { rows?: number }) { return <div className="host-skeleton" role="status" aria-label="Đang tải dữ liệu">{Array.from({ length: rows }, (_, i) => <div key={i}><span/><span/><span/></div>)}</div>; }
export function HostResourceState({ resource, empty, children }: { resource: { loading: boolean; error: string; reload: () => void }; empty?: boolean; children?: ReactNode }) {
  if (resource.loading) return <HostSkeleton/>;
  if (resource.error) return <div className="host-error" role="alert"><AlertCircle size={22}/><div><h3>Không thể tải dữ liệu</h3><p>{resource.error}</p><button className="btn secondary" onClick={resource.reload}><RefreshCw size={16}/>Thử lại</button></div></div>;
  if (empty) return <>{children}</>;
  return null;
}
export function HostImage({ src, alt, kind = "room", category = "" }: { src?: string | null; alt: string; kind?: "studio" | "room" | "equipment"; category?: string }) {
  const [failed, setFailed] = useState("");
  let url = "";
  try { if (src) { const candidate = new URL(src, apiBaseUrl || "http://localhost"); if (["http:", "https:"].includes(candidate.protocol)) url = candidate.href; } } catch { /* Show the resource placeholder. */ }
  const Icon = kind === "studio" ? Building2 : kind === "room" ? DoorOpen : /đèn|light|softbox/i.test(category) ? Lightbulb : /âm thanh|audio|micro/i.test(category) ? Mic2 : /camera|máy ảnh/i.test(category) ? Camera : Boxes;
  return <span className={`host-thumbnail host-thumbnail-${kind}`}>{url && failed !== url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={alt} loading="lazy" onError={() => setFailed(url)}/>
    : <span role="img" aria-label={`${alt} · chưa có ảnh`}><Icon size={28} aria-hidden="true"/></span>}</span>;
}
export function HostAddButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) { return <button className="btn" onClick={onClick} disabled={disabled}><Plus size={18}/>{children}</button>; }
export function HostPagination({ page, total, onChange, loading = false }: { page: number; total: number; onChange: (page: number) => void; loading?: boolean }) {
  if (total <= 1) return null;
  return <nav className="host-pagination" aria-label="Phân trang"><button className="btn secondary" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>Trang trước</button><span>Trang {page} / {total}</span><button className="btn secondary" disabled={loading || page >= total} onClick={() => onChange(page + 1)}>Trang sau</button></nav>;
}

export type HostField = { name: string; label: string; type?: string; min?: number; minLength?: number; required?: boolean; value?: string | number; options?: { value: string; label: string }[] };
export function HostEditor({ title, fields, path, method = "POST", extra, mapBody, onSaved, onClose, children }: { title: string; fields: HostField[]; path: string; method?: "POST" | "PATCH"; extra?: Record<string, unknown>; mapBody?: (body: Record<string, unknown>) => Record<string, unknown>; onSaved: (data: unknown) => void; onClose: () => void; children?: ReactNode }) {
  const action = useApiAction(), id = useId();
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  function requestClose() { if (!action.busy) { if (dirty) setDiscard(true); else onClose(); } }
  return <Modal title={title} onClose={requestClose} wide className="host-dialog">
    <form id={id} className="host-editor" onChange={() => setDirty(true)} onSubmit={e => {
      e.preventDefault(); const entries = Object.fromEntries(new FormData(e.currentTarget));
      const body: Record<string, unknown> = { ...extra };
      for (const field of fields) { const value = entries[field.name]; if (value !== "" && value !== undefined) body[field.name] = field.type === "number" ? Number(value) : value; }
      void action.run(async () => { const data = await apiRequest(path, { method, body: mapBody ? mapBody(body) : body }); onSaved(data); });
    }}>
      <div className="host-editor-intro"><span>Thông tin cơ bản</span><p>Kiểm tra thông tin trước khi lưu thay đổi.</p></div>
      <fieldset disabled={action.busy} className="host-fields"><legend className="host-sr-only">{title}</legend>{fields.map(field => <label key={field.name} htmlFor={`${id}-${field.name}`}>{field.label}{field.options
        ? <select id={`${id}-${field.name}`} name={field.name} aria-label={field.label} required={field.required ?? true} defaultValue={field.value ?? ""} aria-invalid={!!action.fieldErrors[field.name]} aria-describedby={action.fieldErrors[field.name] ? `${id}-${field.name}-error` : undefined}><option value="">Chọn…</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : <input id={`${id}-${field.name}`} name={field.name} aria-label={field.label} type={field.type ?? "text"} min={field.min} minLength={field.minLength} step={field.type === "number" ? "1" : undefined} required={field.required ?? true} defaultValue={field.value ?? ""} aria-invalid={!!action.fieldErrors[field.name]} aria-describedby={action.fieldErrors[field.name] ? `${id}-${field.name}-error` : undefined}/>}
        {action.fieldErrors[field.name] && <span className="field-error" id={`${id}-${field.name}-error`}>{action.fieldErrors[field.name]}</span>}
      </label>)}</fieldset>
      {children}
      {action.error && <p className="host-form-error" role="alert">{action.error}</p>}
      {discard && <div className="host-discard" role="alert"><strong>Bỏ các thay đổi chưa lưu?</strong><p>Thông tin đang nhập sẽ không được lưu.</p><div className="host-actions"><button type="button" className="btn secondary" onClick={() => setDiscard(false)}>Tiếp tục chỉnh sửa</button><button type="button" className="btn destructive" onClick={onClose}>Bỏ thay đổi</button></div></div>}
      <div className="host-editor-footer"><button type="button" className="btn secondary" disabled={action.busy} onClick={requestClose}>Hủy</button><button className="btn" type="submit" disabled={action.busy || discard}>{action.busy ? "Đang lưu…" : "Lưu thay đổi"}</button></div>
    </form>
  </Modal>;
}

export const hostStatusOptions = [{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Ẩn" }];
