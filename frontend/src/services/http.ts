const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export type ApiErrorCode =
  | "network" | "timeout" | "provider_unavailable" | "place_not_found" | "invalid_scenario"
  | "air_quality_unavailable" | "not_found" | "server" | string;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface CacheEntry { expires: number; value: unknown }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

type Params = Record<string, string | number | boolean | null | undefined | string[]>;

function buildUrl(path: string, params?: Params): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, item));
    else qs.set(k, String(v));
  }
  const q = qs.toString();
  return `${BASE}${path}${q ? `?${q}` : ""}`;
}

async function doFetch<T>(url: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: init?.signal ?? ctrl.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new ApiError("timeout", "The request took too long.");
    throw new ApiError("network", "Can't reach WeatherLens. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let code: ApiErrorCode = res.status >= 500 ? "server" : "error";
    let message = `Request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string }; detail?: unknown };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
      else if (res.status === 422) { code = "invalid_input"; message = "Some input looks invalid."; }
    } catch { /* non-JSON error body */ }
    if (res.status === 502 || res.status === 504) code = code === "server" ? "provider_unavailable" : code;
    throw new ApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

/** GET with in-memory TTL cache and in-flight de-duplication. */
export async function apiGet<T>(path: string, params?: Params, ttlMs = 0): Promise<T> {
  const url = buildUrl(path, params);
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const p = doFetch<T>(url)
    .then((value) => {
      if (ttlMs > 0) cache.set(url, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

export function apiPost<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  return doFetch<T>(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, timeoutMs);
}

export function invalidateCache(prefix = ""): void {
  for (const key of cache.keys()) if (key.includes(prefix)) cache.delete(key);
}
