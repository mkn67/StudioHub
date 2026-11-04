"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { State } from "@/domain/models";
import { execute, type Command } from "@/domain/engine";
import {
  initialState,
  scenarioState,
  demoScenarios,
  type DemoScenario,
} from "@/data/fixtures";
import { browserRepository } from "@/data/repository";
import { applyHostPricing, type HostPricingCommand } from "@/domain/host-pricing";
import { api, ApiError, demoMode, emptyState, loadWorkspace } from "@/data/api";
type Context = {
  state: State;
  ready: boolean;
  dispatch: (command: Command) => State | null | Promise<State | null>;
  saveHostPricing: (commands: HostPricingCommand[]) => State | null | Promise<State | null>;
  authenticate: (email: string, password: string, signup?: { name: string; phone: string }) => Promise<State | null>;
  busy: boolean;
  reset: () => void;
  loadScenario: (name: DemoScenario) => void;
  notice: (text: string) => void;
};
const Store = createContext<Context | null>(null);
// Host editor uses the same context/engine with a temporary draft, never a
// second persistent repository. Other consumers keep the original provider.
export function HostPricingDraftProvider({ children, state, dispatch, notice }: {
  children: ReactNode; state: State; dispatch: Context["dispatch"]; notice: Context["notice"];
}) {
  const parent = useStore();
  return <Store.Provider value={{ ...parent, state, dispatch, notice }}>{children}</Store.Provider>;
}
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => demoMode ? initialState() : emptyState()),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(""),
    [message, setMessage] = useState("");
  const ref = useRef(state);
  const working = useRef(false);
  const retry = useRef(new Map<string, { key: string; body: unknown }>());
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      if (working.current) return;
      const started = revision.current;
      try {
        const s = demoMode ? browserRepository.load() : await loadWorkspace();
        if (!mounted || working.current || started !== revision.current) return;
        ref.current = s; setState(s); setReady(true); setLoadError("");
      } catch (error) {
        if (mounted) setLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu.");
      }
    };
    void load();
    const interval = demoMode ? undefined : setInterval(() => void load(), 30000);
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const notice = (text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 6000);
  };
  const persist = (s: State) => {
    ref.current = s;
    setState(s);
    try {
      if (demoMode) browserRepository.save(s);
    } catch {
      notice(
        "Không lưu được trên trình duyệt. Dữ liệu hiện tại vẫn dùng được trong phiên này.",
      );
    }
    return s;
  };
  const remote = async (c: unknown) => {
    if (working.current) return null;
    working.current = true; setBusy(true);
    revision.current++;
    const normalized = c && typeof c === "object" && "type" in c && c.type === "collect" ? { ...c, collectionId: undefined } : c;
    const payload = JSON.stringify(normalized);
    if (!retry.current.has(payload)) {
      const key = crypto.randomUUID();
      retry.current.set(payload, { key, body: normalized && typeof normalized === "object" && "type" in normalized && normalized.type === "collect" ? { ...normalized, collectionId: key } : c });
    }
    const request = retry.current.get(payload)!;
    try {
      const next = await api<State>("commands", request.body, request.key);
      retry.current.delete(payload); return persist(next);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) persist(emptyState());
      notice(error instanceof Error ? error.message : "Không thực hiện được yêu cầu."); return null;
    } finally { working.current = false; setBusy(false); }
  };
  const dispatch: Context["dispatch"] = (c) => {
    if (!demoMode) {
      if (c.type === "login" && c.userId === null) return (async () => {
        if (working.current) return null;
        working.current = true; setBusy(true); revision.current++;
        try { await api("auth/logout", {}); return persist(await loadWorkspace()); }
        catch (error) { if (error instanceof ApiError && error.status === 401) return persist(await loadWorkspace()); notice("Chưa đăng xuất được. Vui lòng thử lại."); return null; }
        finally { working.current = false; setBusy(false); retry.current.clear(); }
      })();
      if (c.type === "login" || c.type === "register" || c.type === "advance") { notice("Vui lòng đăng nhập bằng email và mật khẩu."); return null; }
      return remote(c);
    }
    try {
      return persist(execute(ref.current, c));
    } catch (e) {
      notice(
        e instanceof Error
          ? e.message
          : "Không thực hiện được. Vui lòng thử lại.",
      );
      return null;
    }
  };
  return (
    <Store.Provider
      value={{
        state,
        ready,
        dispatch,
        busy,
        authenticate: async (email, password, signup) => {
          if (working.current) return null;
          working.current = true; setBusy(true);
          revision.current++;
          try {
            await api(signup ? "auth/register" : "auth/login", signup ? { email, password, full_name: signup.name, phone: signup.phone } : { email, password });
            return persist(await loadWorkspace());
          } catch (error) { notice(error instanceof Error ? error.message : "Không đăng nhập được."); return null; }
          finally { working.current = false; setBusy(false); }
        },
        saveHostPricing: commands => {
          if (!demoMode) return remote({ type: "pricing_batch", commands });
          try {
            const next = applyHostPricing(ref.current, commands);
            browserRepository.save(next);
            ref.current = next; setState(next);
            return next;
          } catch (error) {
            notice(error instanceof Error ? error.message : "Không lưu được bảng giá. Bản nháp vẫn được giữ để thử lại.");
            return null;
          }
        },
        reset: () => { if (demoMode) persist(browserRepository.reset()); },
        loadScenario: (name) => { if (demoMode) persist(scenarioState(name)); },
        notice,
      }}
    >
      {ready ? children : <div className="container account-page" role="status"><h1>{loadError ? "Chưa tải được StudioHub" : "Đang tải StudioHub…"}</h1><p>{loadError}</p>{loadError && <button className="btn" onClick={() => window.location.reload()}>Thử lại</button>}</div>}
      {busy && <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 99999, cursor: "progress", background: "#ffffff33", display: "grid", placeItems: "center" }}><span className="note">Đang xử lý…</span></div>}
      {demoMode && <span className="mono" style={{ position: "fixed", top: 4, right: 4, pointerEvents: "none", fontSize: 10, zIndex: 100 }}>Dữ liệu demo · Không thu tiền thật</span>}
      <div className="toast" role="status" aria-live="polite" hidden={!message}>
        {message}
        <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
          ×
        </button>
      </div>
    </Store.Provider>
  );
}
export function useStore() {
  const c = useContext(Store);
  if (!c) throw Error("Store missing");
  return c;
}
export function useSession() {
  const { state } = useStore();
  return state.users.find((u) => u.id === state.sessionId);
}
export function DemoTools() {
  const { state, dispatch, reset, loadScenario } = useStore(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  if (!demoMode || process.env.NODE_ENV === "production") return null;
  return (
    <div className="demo-tools">
      <button className="demo-toggle" onClick={() => setOpen(!open)}>
        Môi trường demo {open ? "−" : "+"}
      </button>
      {open && (
        <div className="demo-panel">
          <strong>Công cụ phát triển</strong>
          <p>
            Đồng hồ mô phỏng:{" "}
            {new Date(state.now).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
          <label>
            Nhân vật
            <select
              value={state.sessionId ?? ""}
              onChange={(e) => {
                dispatch({ type: "login", userId: e.target.value || null });
                router.push(
                  e.target.value === "admin"
                    ? "/admin"
                    : e.target.value === "host"
                      ? "/host"
                      : "/rooms",
                );
              }}
            >
              <option value="">Khách vãng lai</option>
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            {[5, 60, 120, 1440].map((minutes) => (
              <button
                className="btn secondary small"
                key={minutes}
                onClick={() => dispatch({ type: "advance", minutes })}
              >
                +{minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}
              </button>
            ))}
          </div>
          <label style={{ marginTop: 20 }}>
            Tải tình huống mẫu
            <select
              value=""
              onChange={(e) => {
                if (
                  e.target.value &&
                  window.confirm(
                    "Thay dữ liệu demo hiện tại bằng tình huống này?",
                  )
                ) {
                  loadScenario(e.target.value as DemoScenario);
                  router.push("/my-bookings");
                }
              }}
            >
              <option value="">Chọn tình huống…</option>
              {Object.entries(demoScenarios).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              if (
                window.confirm(
                  "Xóa mọi thay đổi demo và tải lại các tình huống ban đầu?",
                )
              ) {
                reset();
                router.push("/");
              }
            }}
          >
            Đặt lại dữ liệu minh họa
          </button>
          <small>
            Có sẵn: đơn chờ duyệt, ca sắp nhận, đơn đã trả còn nợ. Dữ liệu dùng
            chung giữa các vai trò.
          </small>
        </div>
      )}
    </div>
  );
}
