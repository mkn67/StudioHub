"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, backendEnabled } from "@/services/api/client";
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
        try {
            const profile = await apiRequest<ApiUser>("/api/auth/profile");
            setUser(profile);
        }
        catch (e) {
            setUser(null);
            // A 401 on initial load is the normal signed-out state.
            if (!(e && typeof e === "object" && "status" in e && e.status === 401))
                setError(e instanceof Error ? e.message : "Không xác minh được phiên đăng nhập.");
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
        await apiRequest<{ user: ApiUser }>(path, { method: "POST", body });
        // Login/register responses contain a compact user. Hydrate the full
        // profile so DOB, address and avatar are available without a page reload.
        const profile = await apiRequest<ApiUser>("/api/auth/profile");
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
        finally { setUser(null); }
    };
    return <Context.Provider value={{ user, ready, error, authenticate, logout, refresh }}>{children}</Context.Provider>;
}
export function useApiSession() {
    const value = useContext(Context);
    if (!value)
        throw new Error("ApiSessionProvider missing");
    return value;
}
