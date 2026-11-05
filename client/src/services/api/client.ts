import { apiMode } from "@/data/api-mode";

export type ApiEnvelope<T> = {
  status: "success";
  code: number;
  message: string;
  data: T;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fields?: { field: string; code: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getStoredApiToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem("studiohub.api-token");
  } catch {
    return null;
  }
  return null;
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const backendEnabled =
  apiMode === "rest";

export function setStoredApiToken(token: string | null) {
  if (token) window.sessionStorage.setItem("studiohub.api-token", token);
  else window.sessionStorage.removeItem("studiohub.api-token");
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string | null;
    idempotencyKey?: string;
    responseType?: "pdf";
  } = {},
): Promise<T> {
  if (!apiBaseUrl) throw new ApiError("Backend chưa được cấu hình. Đặt NEXT_PUBLIC_API_URL.", 0);
  let response: Response;
  const token = options.token !== undefined ? options.token : getStoredApiToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "application/json",
        ...(isFormData || options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      "Không kết nối được máy chủ. Kiểm tra API đang chạy và địa chỉ NEXT_PUBLIC_API_URL.",
      0,
    );
  }

  if (response.ok && options.responseType === "pdf") {
    if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("application/pdf"))
      throw new ApiError("Máy chủ không trả về tài liệu PDF hợp lệ.", response.status, "contract_error");
    return await response.blob() as T;
  }
  if (response.status === 204 && response.ok) return undefined as T;
  let payload: {
    status?: string;
    code?: number | string;
    error_code?: string;
    message?: string;
    data?: T;
    errors?: { field: string; code: string; message: string }[];
  };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("Máy chủ trả về dữ liệu không hợp lệ.", response.status);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new ApiError("Máy chủ trả về dữ liệu không hợp lệ.", response.status);
  if (payload.errors && !Array.isArray(payload.errors)) payload.errors = [];
  if (payload.errors) payload.errors = payload.errors.filter(e => e && typeof e.field === "string" && typeof e.code === "string" && typeof e.message === "string");
  if (!response.ok || payload.status !== "success") {
    if (token && getStoredApiToken() === token && (response.status === 401 || payload.error_code === "account_locked" || payload.code === "account_locked" || payload.errors?.some(e => e?.code === "account_locked"))) {
      try { setStoredApiToken(null); } catch { /* Session still expires in memory. */ }
      if (typeof window !== "undefined") window.dispatchEvent(new Event("studiohub:session-expired"));
    }
    throw new ApiError(
      payload.message ?? "Yêu cầu chưa hoàn tất.",
      response.status,
      typeof payload.error_code === "string" ? payload.error_code : typeof payload.code === "string" ? payload.code : payload.errors?.[0]?.code,
      payload.errors,
    );
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "data"))
    throw new ApiError("Phản hồi API thiếu trường data.", response.status, "contract_error");
  return payload.data as T;
}
