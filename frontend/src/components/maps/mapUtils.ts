import L from "leaflet";
import "leaflet/dist/leaflet.css";

export { L };

// Keyless, minimal basemaps (Esri Canvas). Override with VITE_MAP_TILE_URL / VITE_MAP_TILE_URL_DARK.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const TILE_LIGHT = (import.meta.env.VITE_MAP_TILE_URL as string | undefined) || `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const TILE_DARK = (import.meta.env.VITE_MAP_TILE_URL_DARK as string | undefined) || `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;

export function baseLayer(theme: "light" | "dark") {
  return L.tileLayer(theme === "dark" ? TILE_DARK : TILE_LIGHT, {
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 16,
  });
}

type Stop = [number, string];

function lerpColor(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t)).join(",")})`;
}

export function scaleColor(stops: Stop[], v: number) {
  if (v <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i]!;
    const [x0, c0] = stops[i - 1]!;
    if (v <= x1) return lerpColor(c0, c1, (v - x0) / (x1 - x0));
  }
  return stops.at(-1)![1];
}

export const SCALES = {
  temperature: [[-10, "#3b6fd8"], [0, "#6ec3f0"], [12, "#8fd694"], [22, "#ffd166"], [30, "#ff8c42"], [40, "#e63946"]] as Stop[],
  wind: [[0, "#a8d8ea"], [15, "#5fa8d3"], [35, "#6a4c93"], [60, "#c2185b"]] as Stop[],
  cloud: [[0, "#e8eef7"], [50, "#aab6c8"], [100, "#5d6b80"]] as Stop[],
  uv: [[0, "#3fbf6b"], [3, "#f2d43d"], [6, "#f28c28"], [8, "#e53935"], [11, "#8e44ad"]] as Stop[],
  aqi: [[0, "#3fbf6b"], [50, "#f2d43d"], [100, "#f28c28"], [150, "#e53935"], [200, "#8e44ad"]] as Stop[],
};

export function pinIcon(color: string, label?: string) {
  return L.divIcon({
    className: "wl-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 4px 14px rgb(0 0 0 / .3);color:#fff;font:700 11px 'Plus Jakarta Sans',sans-serif">${label ?? ""}</span>`,
  });
}
