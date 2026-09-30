import { useApp, useActivePlace } from "@/state/AppState";
import { getForecast, getRain } from "@/services/weatherApi";
import { useAsync } from "./useAsync";

const POLL = 10 * 60_000;

export function useForecast() {
  const { scenario, prefs, personalize } = useApp();
  const place = useActivePlace();
  const p = personalize ? prefs : null;
  const key = `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}|${scenario ?? "live"}|${p ? JSON.stringify(p) : ""}`;
  return useAsync(key, () => getForecast(place, scenario, p), scenario ? 0 : POLL);
}

export function useRain() {
  const { scenario } = useApp();
  const place = useActivePlace();
  const key = `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}|${scenario ?? "live"}`;
  return useAsync(key, () => getRain(place, scenario), scenario ? 0 : 5 * 60_000);
}
