import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/http";

export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** true while refreshing with existing data on screen */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Runs `fn` whenever `key` changes (null key = idle). Keeps the previous data
 * visible during refreshes so scenes cross-fade instead of flashing skeletons.
 */
export function useAsync<T>(key: string | null, fn: () => Promise<T>, pollMs = 0): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(key));
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const hasData = useRef(false);

  useEffect(() => {
    if (!key) { setLoading(false); return; }
    let alive = true;
    if (hasData.current) setRefreshing(true); else setLoading(true);
    fnRef.current()
      .then((d) => { if (!alive) return; setData(d); setError(null); hasData.current = true; })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e : new ApiError("unknown", (e as Error)?.message ?? "Something went wrong."));
      })
      .finally(() => { if (alive) { setLoading(false); setRefreshing(false); } });
    return () => { alive = false; };
  }, [key, tick]);

  useEffect(() => {
    if (!key || !pollMs) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") setTick((t) => t + 1); }, pollMs);
    return () => clearInterval(id);
  }, [key, pollMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, refreshing, reload };
}
