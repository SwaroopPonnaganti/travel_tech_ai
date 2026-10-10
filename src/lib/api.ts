export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function apiFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      ...rest,
      headers: { "Content-Type": "application/json", ...(headers ?? {}) },
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        if (body?.error) detail = body.error;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(detail || `Request failed (${res.status})`, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 408);
    }
    throw new ApiError(err instanceof Error ? err.message : "Network unavailable", 0);
  } finally {
    clearTimeout(timer);
  }
}

export interface ApiResult<T> {
  data: T | null;
  source: "live" | "demo";
  error: string | null;
}

/**
 * Tries the Express API first, silently falls back to bundled demo data so the
 * UI stays usable before the backend is running (Phase 2).
 */
export async function withFallback<T>(path: string, fallback: () => T): Promise<ApiResult<T>> {
  try {
    const data = await apiFetch<T>(path);
    return { data, source: "live", error: null };
  } catch (err) {
    return { data: fallback(), source: "demo", error: err instanceof ApiError ? err.message : "Unknown error" };
  }
}
