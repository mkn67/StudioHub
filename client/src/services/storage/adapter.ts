import { z } from "zod";
import { databaseSchema, type Database } from "@/domain/schema";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
  keys?(): string[];
}
export class StorageFailure extends Error {
  constructor(
    public code: "corrupt" | "unavailable" | "quota",
    message: string,
  ) {
    super(message);
  }
}
export function migrate(raw: unknown): Database {
  const header = z.object({ schemaVersion: z.number() }).parse(raw);
  if (header.schemaVersion === 1) {
    const old = raw as Record<string, unknown>;
    return databaseSchema.parse({
      ...old,
      schemaVersion: 2,
      revision: typeof old.revision === "string" ? old.revision : "migrated-v1",
      payments: old.payments ?? [],
      audit: old.audit ?? [],
    });
  }
  return databaseSchema.parse(raw);
}
export class BrowserAdapter {
  constructor(
    public persistent: StoragePort,
    public session: StoragePort,
    public namespace = "studiohub.demo",
  ) {}
  get dataKey() {
    return `${this.namespace}.database`;
  }
  read(): Database | null {
    let value: string | null;
    try {
      value = this.persistent.getItem(this.dataKey);
    } catch {
      throw new StorageFailure(
        "unavailable",
        "Trình duyệt không cho phép lưu dữ liệu.",
      );
    }
    if (!value) return null;
    try {
      return migrate(JSON.parse(value));
    } catch {
      throw new StorageFailure(
        "corrupt",
        "Dữ liệu demo không hợp lệ. Dữ liệu cũ được giữ lại; bạn có thể đặt lại sau khi xác nhận.",
      );
    }
  }
  write(db: Database) {
    const valid = databaseSchema.parse(db);
    try {
      this.persistent.setItem(this.dataKey, JSON.stringify(valid));
    } catch {
      throw new StorageFailure(
        "quota",
        "Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy. Thử giảm số ảnh tải lên.",
      );
    }
  }
  readSession<T>(key: string, schema: z.ZodType<T>): T | null {
    try {
      const raw = this.session.getItem(`${this.namespace}.${key}`);
      if (!raw) return null;
      const result = schema.safeParse(JSON.parse(raw));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
  writeSession(key: string, value: unknown) {
    try {
      this.session.setItem(`${this.namespace}.${key}`, JSON.stringify(value));
    } catch {
      throw new StorageFailure(
        "unavailable",
        "Không thể lưu phiên làm việc. Kiểm tra cài đặt trình duyệt.",
      );
    }
  }
  removeSession(key: string) {
    try {
      this.session.removeItem(`${this.namespace}.${key}`);
    } catch {
      throw new StorageFailure(
        "unavailable",
        "Không thể cập nhật phiên làm việc.",
      );
    }
  }
  clearSessionPrefix(prefix: string) {
    try {
      const keys =
        this.session.keys?.() ??
        Array.from({ length: this.session.length ?? 0 }, (_, index) =>
          this.session.key?.(index),
        ).filter((key): key is string => typeof key === "string");
      for (const key of keys)
        if (key.startsWith(`${this.namespace}.${prefix}`))
          this.session.removeItem(key);
    } catch {
      throw new StorageFailure(
        "unavailable",
        "Không thể xóa bản nháp trong phiên làm việc.",
      );
    }
  }
}
export function createBrowserAdapter() {
  let namespace = "studiohub.demo";
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const requested = new URLSearchParams(window.location.search).get(
        "fixture",
      );
      if (requested && /^[a-zA-Z0-9-]{1,80}$/.test(requested))
        window.sessionStorage.setItem("studiohub.fixture", requested);
      const fixture = window.sessionStorage.getItem("studiohub.fixture");
      if (fixture) namespace = `studiohub.test.${fixture}`;
    }
    return new BrowserAdapter(
      window.localStorage,
      window.sessionStorage,
      namespace,
    );
  } catch {
    throw new StorageFailure(
      "unavailable",
      "Không thể truy cập bộ nhớ trình duyệt.",
    );
  }
}
export class MemoryStorage implements StoragePort {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  keys() {
    return [...this.data.keys()];
  }
}
