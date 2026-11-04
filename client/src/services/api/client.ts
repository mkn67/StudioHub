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
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.endsWith(".api-token") || key === "api-token")) {
        const val = sessionStorage.getItem(key);
        if (val) {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const backendEnabled =
  import.meta.env.MODE !== "test" && apiBaseUrl.length > 0;

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  if (!backendEnabled) throw new ApiError("Backend chưa được cấu hình.", 0);
  let response: Response;
  const token = options.token !== undefined ? options.token : getStoredApiToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(isFormData || options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  let payload: {
    status?: string;
    code?: number | string;
    message?: string;
    data?: T;
    errors?: { field: string; code: string; message: string }[];
  };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("Máy chủ trả về dữ liệu không hợp lệ.", response.status);
  }
  if (!response.ok || payload.status !== "success")
    throw new ApiError(
      payload.message ?? "Yêu cầu chưa hoàn tất.",
      response.status,
      typeof payload.code === "string" ? payload.code : undefined,
      payload.errors,
    );
  return payload.data as T;
}
