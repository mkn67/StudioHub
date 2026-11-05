"use client";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { useWorkspaceCommand } from "./workspace-data";
import type { WorkspaceCommand } from "@/services/api/workspace-client";
export function WorkspaceCommandDialog({ title, children, build, onClose, onSaved, confirmLabel = "Lưu thay đổi" }: { title: string; children: ReactNode; build: (data: FormData) => WorkspaceCommand; onClose: () => void; onSaved: () => void; confirmLabel?: string }) {
  const action = useWorkspaceCommand(); const [dirty, setDirty] = useState(false), [validation, setValidation] = useState("");
  const close = () => { if (!action.busy && (!dirty || window.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  return <Modal title={title} onClose={close} className="host-dialog" wide><form className="host-editor" aria-busy={action.busy} onChange={() => setDirty(true)} onSubmit={event => {
    event.preventDefault(); if (action.busy) return; setValidation("");
    let command: WorkspaceCommand; try { command = build(new FormData(event.currentTarget)); } catch (error) { setValidation(error instanceof Error ? error.message : "Kiểm tra dữ liệu trước khi gửi."); return; }
    void action.execute(command, onSaved);
  }}><fieldset className="host-fields" disabled={action.busy}><legend className="host-sr-only">{title}</legend>{children}</fieldset>{(validation || action.error) && <p className="host-form-error" role="alert">{validation || action.error}</p>}<div className="host-editor-footer"><button type="button" className="btn secondary" onClick={close} disabled={action.busy}>Hủy</button><button className="btn" disabled={action.busy}>{action.busy ? "Đang lưu…" : confirmLabel}</button></div></form></Modal>;
}
