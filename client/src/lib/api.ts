export interface HealthResponse {
  success: boolean;
  server: string;
  database: string;
  timestamp?: string;
  message?: string;
  latencyMs?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch health status of the PHP API and PostgreSQL database.
 * Handles network errors, non-200 HTTP statuses, and non-JSON responses gracefully.
 */
export async function getHealth(): Promise<HealthResponse> {
  const startTime = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        server: data?.server || (res.status === 503 ? 'ok' : 'error'),
        database: data?.database || 'error',
        message: data?.message || `HTTP error ${res.status}: ${res.statusText}`,
        timestamp: data?.timestamp,
        latencyMs,
      };
    }

    return {
      success: Boolean(data?.success),
      server: data?.server || 'ok',
      database: data?.database || 'ok',
      timestamp: data?.timestamp,
      message: data?.message,
      latencyMs,
    };
  } catch (error: unknown) {
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);
    const message = error instanceof Error ? error.message : 'Network error or service unreachable';

    return {
      success: false,
      server: 'disconnected',
      database: 'disconnected',
      message,
      latencyMs,
    };
  }
}
