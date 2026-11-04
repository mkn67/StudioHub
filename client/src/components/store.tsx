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
import { backendEnabled } from "@/services/api/client";
type Context = {
  state: State;
  ready: boolean;
  dispatch: (command: Command) => State | null;
  reset: () => void;
  loadScenario: (name: DemoScenario) => void;
  notice: (text: string) => void;
};
const Store = createContext<Context | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  const ref = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      const s = backendEnabled ? initialState() : browserRepository.load();
      ref.current = s;
      setState(s);
      setReady(true);
    });
    return () => {
      mounted = false;
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
      browserRepository.save(s);
    } catch {
      notice(
        "Không lưu được trên trình duyệt. Dữ liệu hiện tại vẫn dùng được trong phiên này.",
      );
    }
    return s;
  };
  const dispatch = (c: Command) => {
    if (backendEnabled) { notice("Thao tác demo không khả dụng trong chế độ API."); return null; }
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
        reset: () => persist(browserRepository.reset()),
        loadScenario: (name) => persist(scenarioState(name)),
        notice,
      }}
    >
      {children}
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
  if (backendEnabled || process.env.NODE_ENV === "production") return null;
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
