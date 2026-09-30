import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DemoScenario, Place, Preferences } from "@/types/weather";

export type ThemePref = "system" | "light" | "dark";

export const DHAKA: Place = {
  name: "Dhaka", country: "Bangladesh", country_code: "BD", admin1: "Dhaka Division",
  latitude: 23.8103, longitude: 90.4125, timezone: "Asia/Dhaka",
};

export const DEFAULT_PREFS: Preferences = {
  home: "Uttara", work: "North South University", departure_time: "15:00", return_time: "20:00",
  commute_mode: "rickshaw", activities: ["cycling"], activity_time: "17:00",
};

interface AppState {
  place: Place;
  setPlace: (p: Place) => void;
  recent: Place[];
  scenario: DemoScenario | null;
  setScenario: (s: DemoScenario | null) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  resolvedTheme: "light" | "dark";
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  personalize: boolean;
  setPersonalize: (v: boolean) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

// localStorage can throw (private mode, blocked storage) — always guard.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`wl:${key}`);
    return raw ? { ...fallback, ...JSON.parse(raw) } as T : fallback;
  } catch { return fallback; }
}
function loadScalar<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`wl:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(`wl:${key}`, JSON.stringify(value)); } catch { /* ignore */ }
}

function useSystemDark() {
  const [dark, setDark] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [place, setPlaceState] = useState<Place>(() => loadScalar("place", DHAKA));
  const [recent, setRecent] = useState<Place[]>(() => loadScalar("recent", [DHAKA]));
  // Demo mode is session-scoped on purpose: a fresh visit always shows live data.
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  const [theme, setThemeState] = useState<ThemePref>(() => loadScalar("theme", "system"));
  const [prefs, setPrefsState] = useState<Preferences>(() => load("prefs", DEFAULT_PREFS));
  const [personalize, setPersonalizeState] = useState<boolean>(() => loadScalar("personalize", true));
  const [sound, setSound] = useState(false);
  const systemDark = useSystemDark();
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => { document.documentElement.dataset.theme = resolvedTheme; }, [resolvedTheme]);

  const setPlace = useCallback((p: Place) => {
    setPlaceState(p);
    save("place", p);
    setRecent((prev) => {
      const next = [p, ...prev.filter((x) => x.name !== p.name || x.country !== p.country)].slice(0, 6);
      save("recent", next);
      return next;
    });
  }, []);
  const setTheme = useCallback((t: ThemePref) => { setThemeState(t); save("theme", t); }, []);
  const setPrefs = useCallback((p: Preferences) => { setPrefsState(p); save("prefs", p); }, []);
  const setPersonalize = useCallback((v: boolean) => { setPersonalizeState(v); save("personalize", v); }, []);

  const value = useMemo<AppState>(() => ({
    place, setPlace, recent, scenario, setScenario, theme, setTheme, resolvedTheme,
    prefs, setPrefs, personalize, setPersonalize, sound, setSound,
  }), [place, setPlace, recent, scenario, theme, setTheme, resolvedTheme, prefs, setPrefs, personalize, setPersonalize, sound]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppStateProvider");
  return v;
}

/** The place actually being shown: demo mode always shows Dhaka. */
export function useActivePlace(): Place {
  const { place, scenario } = useApp();
  return scenario ? DHAKA : place;
}
