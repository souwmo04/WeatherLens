import type { Condition, DemoScenario, Scene } from "@/types/weather";

/** Accent colour per world. The UI borrows it for highlights so the page "feels" the weather. */
export const SCENE_ACCENT: Record<Scene, { light: string; dark: string }> = {
  sunny: { light: "#e8900c", dark: "#ffb547" },
  cloudy: { light: "#56679a", dark: "#9fb0dc" },
  rain: { light: "#2f6fe0", dark: "#6ea2ff" },
  storm: { light: "#6a55e0", dark: "#a595ff" },
  night: { light: "#4b5fd6", dark: "#8ea6ff" },
  sunset: { light: "#e0603f", dark: "#ff8e6b" },
  snow: { light: "#3f86b8", dark: "#9fd3ff" },
  fog: { light: "#687489", dark: "#aab4c6" },
};

export const SCENE_LABEL: Record<Scene, string> = {
  sunny: "Sunny", cloudy: "Cloudy", rain: "Rain", storm: "Storm",
  night: "Night", sunset: "Sunset", snow: "Snow", fog: "Fog",
};

export const DEMO_SCENARIOS: { key: DemoScenario; label: string }[] = [
  { key: "sunny", label: "Sunny" },
  { key: "cloudy", label: "Cloudy" },
  { key: "rain", label: "Rain" },
  { key: "storm", label: "Storm" },
  { key: "sunset", label: "Sunset" },
  { key: "night", label: "Night" },
];

export type IconKind =
  | "sun" | "moon" | "sun-cloud" | "moon-cloud" | "cloud" | "fog" | "drizzle" | "rain"
  | "heavy-rain" | "snow" | "storm";

export function iconFor(condition: Condition, isDay = true): IconKind {
  switch (condition) {
    case "clear": return isDay ? "sun" : "moon";
    case "mostly_clear":
    case "partly_cloudy": return isDay ? "sun-cloud" : "moon-cloud";
    case "cloudy": return "cloud";
    case "fog": return "fog";
    case "drizzle": return "drizzle";
    case "rain": return "rain";
    case "heavy_rain": return "heavy-rain";
    case "snow": return "snow";
    case "storm": return "storm";
  }
}

export const isWetCondition = (c: Condition) => c === "drizzle" || c === "rain" || c === "heavy_rain" || c === "storm";

export function aqiInfo(aqi: number | null | undefined): { label: string; tone: "good" | "fair" | "poor" } | null {
  if (aqi == null) return null;
  if (aqi <= 50) return { label: "Good", tone: "good" };
  if (aqi <= 100) return { label: "Moderate", tone: "fair" };
  if (aqi <= 150) return { label: "Sensitive groups", tone: "poor" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "poor" };
  return { label: "Very unhealthy", tone: "poor" };
}

export function uvInfo(uv: number | null | undefined): string {
  if (uv == null) return "—";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

/** Tiny deterministic PRNG so generated scenery is stable per city. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
