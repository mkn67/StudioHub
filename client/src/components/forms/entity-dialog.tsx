"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, ErrorSummary } from "./field";
import { StudioImage } from "@/components/shared/common";
import { compressImage } from "@/lib/images";
import { message } from "@/services/service";
export type FormValues = Record<string, string | number | boolean | null>;
export type FormField = {
  key: string;
  label: string;
  type?:
    "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "image";
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  hint?: string;
};
export function EntityDialog({
  title,
  description,
  initial,
  fields,
  onSave,
  onClose,
}: {
  title: string;
  description?: string;
  initial: FormValues;
  fields: FormField[];
  onSave: (values: FormValues) => unknown | Promise<unknown>;
  onClose: () => void;
}) {
  const [values, setValues] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  function set(key: string, value: string | number | boolean) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="entity-dialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description ??
            "Chỉnh sửa thông tin và lưu thay đổi trong dữ liệu demo."}
        </DialogDescription>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
              await onSave(values);
              onClose();
            } catch (error) {
              setError(message(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <ErrorSummary error={error} />
          <div className="form-grid">
            {fields.map((field) => (
              <div
                key={field.key}
                className={
                  field.type === "textarea" || field.type === "image"
                    ? "form-span"
                    : ""
                }
              >
                {field.type === "checkbox" ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!values[field.key]}
                      onChange={(e) => set(field.key, e.target.checked)}
                    />
                    {field.label}
                  </label>
                ) : (
                  <Field
                    label={field.label}
                    id={`entity-${field.key}`}
                    hint={field.hint}
                  >
                    {field.type === "select" ? (
                      <Select
                        value={String(values[field.key] ?? "")}
                        onChange={(e) => set(field.key, e.target.value)}
                        required={field.required}
                      >
                        {field.options?.map((o) => (
                          <option value={o.value} key={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        value={String(values[field.key] ?? "")}
                        onChange={(e) => set(field.key, e.target.value)}
                        required={field.required}
                        maxLength={field.max}
                      />
                    ) : field.type === "image" ? (
                      <div>
                        {values[field.key] && (
                          <StudioImage
                            className="form-image-preview"
                            src={String(values[field.key])}
                            alt="Ảnh đang chọn"
                          />
                        )}
                        <Input
                          id={`entity-${field.key}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              set(field.key, await compressImage(file));
                            } catch (error) {
                              setError(message(error));
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          onClick={() => set(field.key, "")}
                        >
                          Xóa ảnh
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type={field.type ?? "text"}
                        value={String(values[field.key] ?? "")}
                        onChange={(e) =>
                          set(
                            field.key,
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                      />
                    )}
                  </Field>
                )}
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Quay lại
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
