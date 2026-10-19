"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { service, message } from "@/services/service";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, LoadingState } from "@/components/shared/common";
type Toast = { id: string; text: string; error: boolean };
const ToastContext = createContext<(text: string, error?: boolean) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function useApp() {
  const snapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getServerSnapshot,
  );
  return {
    ...snapshot,
    service,
    user: snapshot.ready
      ? (snapshot.db?.users.find((u) => u.id === snapshot.userId) ?? null)
      : undefined,
  };
}
function ToastItem({ toast, remove }: { toast: Toast; remove: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || toast.error) return;
    const timer = setTimeout(remove, 6000);
    return () => clearTimeout(timer);
  }, [paused, toast.error, remove]);
  return (
    <div
      className={`toast ${toast.error ? "toast-error" : ""}`}
      role={toast.error ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p>{toast.text}</p>
      <button aria-label="Đóng thông báo" onClick={remove}>
        <X size={18} />
      </button>
    </div>
  );
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback(
    (text: string, error = false) =>
      setToasts((current) => [
        ...current.slice(-2),
        { id: crypto.randomUUID(), text, error },
      ]),
    [],
  );
  useEffect(() => {
    service.initialize();
    const storage = (e: StorageEvent) => service.refresh(e.key);
    window.addEventListener("storage", storage);
    const timer = setInterval(service.tick, 1000);
    const visibility = () => {
      if (!document.hidden) service.refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
      clearInterval(timer);
    };
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            remove={() =>
              setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function DataGate({ children }: { children: ReactNode }) {
  const { ready, error, db, notice } = useApp();
  const [reset, setReset] = useState(false);
  if (!ready) return <LoadingState />;
  if (error || !db)
    return (
      <main id="main-content" tabIndex={-1} className="container recovery">
        <h1>Không thể mở dữ liệu demo</h1>
        <p role="alert">{error ?? "Dữ liệu chưa sẵn sàng."}</p>
        <div className="actions">
          <Button onClick={() => service.retry()}>Thử lại</Button>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <Button variant="destructive" onClick={() => setReset(true)}>
              Đặt lại dữ liệu demo
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={reset}
          onOpenChange={setReset}
          title="Đặt lại dữ liệu demo?"
          description="Tất cả thay đổi và đơn tạo trong trình duyệt này sẽ bị xóa. Dữ liệu mẫu sẽ được khôi phục."
          destructive
          onConfirm={() => service.reset()}
        />
      </main>
    );
  return (
    <>
      <div className="sr-only" role="status">
        {notice}
      </div>
      {children}
    </>
  );
}
export function useMutation() {
  const toast = useToast();
  return async (
    operation: () => unknown | Promise<unknown>,
    success?: string,
  ) => {
    try {
      const value = await operation();
      if (success) toast(success);
      return { ok: true as const, value };
    } catch (error) {
      toast(message(error), true);
      return { ok: false as const };
    }
  };
}
