import type { Scene } from "@/types/weather";

export type ParticleMode = "none" | "rain" | "storm" | "snow" | "dust" | "fireflies";

export interface SceneStyle {
  /** sky gradient stops, top → horizon */
  sky: string[];
  /** glow near horizon */
  haze: string;
  celestial: "sun" | "low-sun" | "moon" | "hidden-sun" | "none";
  cloud: { top: string; bottom: string; edge: string; count: number; opacity: number; scale: number };
  far: string;
  near: string;
  nearTop: string;
  windowLit: string;
  litChance: number;
  ground: [string, string];
  reflect: number;
  particles: ParticleMode;
  stars: boolean;
  fog: number;
  characters: ("rickshaw" | "walker-umbrella" | "birds" | "walker")[];
}

export const SCENES: Record<Scene, SceneStyle> = {
  sunny: {
    sky: ["#2f7fd8", "#58a4ee", "#9fd0fa", "#ffe9c4"],
    haze: "rgb(255 236 196 / 0.7)",
    celestial: "sun",
    cloud: { top: "#ffffff", bottom: "#d6e6fb", edge: "rgb(120 150 200 / 0.18)", count: 4, opacity: 0.95, scale: 0.85 },
    far: "#9dbbe4", near: "#27416f", nearTop: "#3a5a92",
    windowLit: "#ffe1a0", litChance: 0.03,
    ground: ["#26406e", "#1b2f55"], reflect: 0.16,
    particles: "dust", stars: false, fog: 0,
    characters: ["rickshaw", "birds", "walker"],
  },
  cloudy: {
    sky: ["#72839f", "#95a5bf", "#bcc7d7", "#dde2ea"],
    haze: "rgb(230 234 240 / 0.6)",
    celestial: "hidden-sun",
    cloud: { top: "#f3f5f9", bottom: "#b3bdcf", edge: "rgb(70 85 115 / 0.16)", count: 8, opacity: 0.96, scale: 1.15 },
    far: "#a7b2c5", near: "#3f4d68", nearTop: "#56657f",
    windowLit: "#ffe1a0", litChance: 0.06,
    ground: ["#3a4760", "#2b364c"], reflect: 0.14,
    particles: "none", stars: false, fog: 0.15,
    characters: ["rickshaw", "walker"],
  },
  rain: {
    sky: ["#2f3a50", "#48546c", "#6b7790", "#8e99ad"],
    haze: "rgb(160 172 196 / 0.4)",
    celestial: "none",
    cloud: { top: "#8995aa", bottom: "#56617a", edge: "rgb(20 28 45 / 0.25)", count: 9, opacity: 0.97, scale: 1.25 },
    far: "#66728a", near: "#1f2839", nearTop: "#2c374d",
    windowLit: "#ffd27a", litChance: 0.22,
    ground: ["#1b2333", "#111827"], reflect: 0.34,
    particles: "rain", stars: false, fog: 0.25,
    characters: ["walker-umbrella", "rickshaw"],
  },
  storm: {
    sky: ["#141828", "#23293f", "#363d5a", "#4c5272"],
    haze: "rgb(120 110 170 / 0.3)",
    celestial: "none",
    cloud: { top: "#4b5170", bottom: "#262a40", edge: "rgb(0 0 0 / 0.3)", count: 10, opacity: 0.98, scale: 1.35 },
    far: "#3d4360", near: "#10131f", nearTop: "#1b2033",
    windowLit: "#ffd27a", litChance: 0.28,
    ground: ["#10141f", "#0a0d16"], reflect: 0.38,
    particles: "storm", stars: false, fog: 0.2,
    characters: ["walker-umbrella"],
  },
  night: {
    sky: ["#040817", "#0a1535", "#172a5c", "#2d4480"],
    haze: "rgb(90 120 210 / 0.28)",
    celestial: "moon",
    cloud: { top: "#2a3a6c", bottom: "#16224a", edge: "rgb(0 0 0 / 0.15)", count: 3, opacity: 0.6, scale: 0.9 },
    far: "#1c2a58", near: "#080f28", nearTop: "#111b3d",
    windowLit: "#ffcf70", litChance: 0.5,
    ground: ["#0a1230", "#050a1c"], reflect: 0.42,
    particles: "fireflies", stars: true, fog: 0,
    characters: ["walker"],
  },
  sunset: {
    sky: ["#2b3a7c", "#8a5aa6", "#ff8b62", "#ffd08a"],
    haze: "rgb(255 190 140 / 0.65)",
    celestial: "low-sun",
    cloud: { top: "#ffd1b3", bottom: "#c56f92", edge: "rgb(110 50 90 / 0.18)", count: 5, opacity: 0.92, scale: 1 },
    far: "#8c5d91", near: "#2a2150", nearTop: "#3d2f68",
    windowLit: "#ffd48a", litChance: 0.22,
    ground: ["#2a2150", "#1a1538"], reflect: 0.3,
    particles: "dust", stars: false, fog: 0,
    characters: ["rickshaw", "birds"],
  },
  snow: {
    sky: ["#8ea0bb", "#b1bfd3", "#d3dce8", "#eef2f7"],
    haze: "rgb(240 244 250 / 0.6)",
    celestial: "hidden-sun",
    cloud: { top: "#f5f7fb", bottom: "#c3cddd", edge: "rgb(90 105 130 / 0.14)", count: 7, opacity: 0.95, scale: 1.1 },
    far: "#b5c1d3", near: "#4a5872", nearTop: "#e9eef6",
    windowLit: "#ffe1a0", litChance: 0.15,
    ground: ["#dfe6f0", "#c6d0de"], reflect: 0.08,
    particles: "snow", stars: false, fog: 0.2,
    characters: ["walker"],
  },
  fog: {
    sky: ["#9aa3b2", "#b5bcc8", "#cdd2da", "#e0e3e8"],
    haze: "rgb(235 237 241 / 0.8)",
    celestial: "hidden-sun",
    cloud: { top: "#eef0f3", bottom: "#c3c9d3", edge: "rgb(90 100 120 / 0.1)", count: 5, opacity: 0.8, scale: 1.2 },
    far: "#c0c6d0", near: "#6b7588", nearTop: "#7c8699",
    windowLit: "#ffe1a0", litChance: 0.1,
    ground: ["#7d8697", "#6a7385"], reflect: 0.12,
    particles: "none", stars: false, fog: 0.75,
    characters: ["walker"],
  },
};
