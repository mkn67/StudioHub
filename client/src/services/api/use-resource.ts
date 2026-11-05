"use client";
import { useEffect, useState } from "react";
import { apiRequest } from "./client";
export function useResource<T>(path: string | null, decode?: (value: unknown) => T) {
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<{
        key: string | null;
        data: T | null;
        error: string;
        loading: boolean;
    }>({ key: null, data: null, error: "", loading: true });
    const key = path === null ? null : `${path}:${revision}`;
    useEffect(() => {
        if (!path)
            return;
        let active = true;
        apiRequest<unknown>(path).then(value => { const data = decode ? decode(value) : value as T; if (active)
            setResult({ key, data, error: "", loading: false }); })
            .catch(e => { if (active)
            setResult({ key, data: null, error: e instanceof Error ? e.message : "Không tải được dữ liệu.", loading: false }); });
        return () => { active = false; };
    }, [path, key, decode]);
    const current = result.key === key;
    return { data: current ? result.data : null, error: current ? result.error : "", loading: !!path && (!current || result.loading), reload: () => setRevision(v => v + 1) };
}
