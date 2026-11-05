"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, backendEnabled, getStoredApiToken, setStoredApiToken } from "@/services/api/client";
import type { ApiUser } from "@/services/api/contracts";
type Session = {
    user: ApiUser | null;
    ready: boolean;
    error: string;
    authenticate: (path: string, body: unknown) => Promise<ApiUser>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function ApiSessionProvider({ children }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [ready, setReady] = useState(!backendEnabled);
    const [error, setError] = useState("");
    const refresh = useCallback(async () => {
        setError("");
        const token = getStoredApiToken();
        if (!token) {
            setUser(null);
            setReady(true);
            return;
        }
        try {
            const profile = await apiRequest<ApiUser>("/api/auth/profile");
            if (getStoredApiToken() === token)
                setUser(profile);
        }
        catch (e) {
            if (getStoredApiToken() === token) {
                setUser(null);
                setError(e instanceof Error ? e.message : "Không xác minh được phiên đăng nhập.");
            }
        }
        finally {
            setReady(true);
        }
    }, []);
    useEffect(() => {
        if (!backendEnabled)
            return;
        const expired = () => { setUser(null); setError("Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."); };
        const focused = () => { void refresh(); };
        window.addEventListener("studiohub:session-expired", expired);
        window.addEventListener("focus", focused);
        queueMicrotask(() => { void refresh(); });
        return () => { window.removeEventListener("studiohub:session-expired", expired); window.removeEventListener("focus", focused); };
    }, [refresh]);
    const authenticate = async (path: string, body: unknown) => {
        const result = await apiRequest<{
            token: string;
            user: ApiUser;
        }>(path, { method: "POST", body, token: null });
        try {
            setStoredApiToken(result.token);
        }
        catch {
            throw new Error("Trình duyệt đang chặn lưu phiên. Cho phép sessionStorage rồi đăng nhập lại.");
        }
        // Login/register responses contain a compact user. Hydrate the full
        // profile so DOB, address and avatar are available without a page reload.
        const profile = await apiRequest<ApiUser>("/api/auth/profile", { token: result.token });
        setUser(profile);
        setError("");
        return profile;
    };
    const logout = async () => {
        try {
            await apiRequest("/api/auth/logout", { method: "POST" });
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Không kết nối được API đăng xuất.");
        }
        finally {
            try {
                setStoredApiToken(null);
            }
            finally {
                setUser(null);
            }
        }
    };
    return <Context.Provider value={{ user, ready, error, authenticate, logout, refresh }}>{children}</Context.Provider>;
}
export function useApiSession() {
    const value = useContext(Context);
    if (!value)
        throw new Error("ApiSessionProvider missing");
    return value;
}
