"use client";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
export function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const control =
    isValidElement(children) &&
    (typeof children.type !== "string" ||
      ["input", "select", "textarea"].includes(children.type));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              "aria-invalid"?: boolean;
              "aria-describedby"?: string;
            }>,
            { id, "aria-invalid": !!error, "aria-describedby": describedBy },
          )
        : children}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ErrorSummary({ error }: { error: string | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  return error ? (
    <div ref={ref} className="notice notice-error" role="alert" tabIndex={-1}>
      {error}
    </div>
  ) : null;
}
