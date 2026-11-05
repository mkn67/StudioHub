"use client";
import type { ReactNode } from "react";
import { Modal } from "@/components/ui";
import { useApiAction } from "@/components/api-ui";
import { apiRequest } from "@/services/api/client";
import { validateUpload } from "@/services/api/management";

export function ApiOperationDialog({ title, path, method = "POST", build, onClose, onSaved, children, label = "Xác nhận" }: {
  title: string; path: string; method?: "POST" | "PATCH" | "DELETE";
  build?: (data: FormData) => unknown; onClose: () => void; onSaved: () => void; children?: ReactNode; label?: string;
}) {
  const action = useApiAction();
  return <Modal title={title} onClose={() => { if (!action.busy) onClose(); }} className="host-dialog"><form className="host-editor" onSubmit={event => {
    event.preventDefault(); if (action.busy) return;
    const data = new FormData(event.currentTarget);
    void action.run(async () => { await apiRequest(path, { method, body: build?.(data) }); onSaved(); });
  }}><fieldset className="host-fields" disabled={action.busy}>{children}</fieldset>{action.error && <p className="host-form-error" role="alert">{action.error}</p>}<div className="host-editor-footer"><button type="button" className="btn secondary" disabled={action.busy} onClick={onClose}>Hủy</button><button className={`btn${method === "DELETE" ? " destructive" : ""}`} disabled={action.busy}>{action.busy ? "Đang xử lý…" : label}</button></div></form></Modal>;
}
export function UploadDialog({ title, path, onClose, onSaved }: { title: string; path: string; onClose: () => void; onSaved: () => void }) {
  return <ApiOperationDialog title={title} path={path} onClose={onClose} onSaved={onSaved} label="Tải ảnh lên" build={data => { validateUpload(data.get("image")); return data; }}><p>Ảnh JPG/PNG/WebP tối đa 5 MiB.</p><label>Chọn ảnh<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required/></label>{path.endsWith("/images") && <label><input type="checkbox" name="is_primary" value="true"/>Ảnh chính</label>}</ApiOperationDialog>;
}
