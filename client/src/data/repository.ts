import type { State } from "@/domain/models";
import { initialState } from "./fixtures";
export interface Repository {
  load(): State;
  save(state: State): void;
  reset(): State;
}
const key = "studiohub.demo.v1";
export const browserRepository: Repository = {
  load() {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as State;
        if (
          s.version === 1 &&
          Array.isArray(s.bookings) &&
          Array.isArray(s.audit)
        )
          return s;
      }
    } catch {}
    return initialState();
  },
  save(state) {
    localStorage.setItem(key, JSON.stringify(state));
  },
  reset() {
    const s = initialState();
    this.save(s);
    return s;
  },
};
