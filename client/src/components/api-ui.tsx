"use client";
import { useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/services/api/client";
export function ApiMessage({ loading, error }: {
    loading?: boolean;
    error?: string;
}) {
    return loading ? <p role="status">Đang tải dữ liệu…</p> : error ? <p className="note" role="alert">{error}</p> : null;
}
export function useApiAction() {
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const pending = useRef(false);
    const run = async (action: () => Promise<void>) => {
        if (pending.current)
            return;
        pending.current = true;
        setBusy(true);
        setError("");
        setFieldErrors({});
        try {
            await action();
        }
        catch (e) {
            if (e instanceof ApiError)
                setFieldErrors(Object.fromEntries((e.fields ?? []).map(f => [f.field, f.message])));
            setError(e instanceof ApiError ? [e.message, ...(e.fields?.map(f => f.message) ?? [])].join(" · ") : e instanceof Error ? e.message : "Không thực hiện được yêu cầu.");
        }
        finally {
            pending.current = false;
            setBusy(false);
        }
    };
    return { busy, error, fieldErrors, run };
}
export function Unavailable({ children }: {
    children: ReactNode;
}) { return <section className="note"><h2>Chức năng chưa được API hỗ trợ</h2><p>{children}</p></section>; }
