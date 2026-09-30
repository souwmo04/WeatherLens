import { lazy, Suspense, useMemo, useState } from "react";
import { AlertTriangle, CloudRain, Cloudy, Gauge, Sun, Thermometer, Wind, type LucideIcon } from "lucide-react";
import { CloudLoader } from "@/components/ui/States";
import { useApp, useActivePlace } from "@/state/AppState";
import type { GridLayer } from "@/components/maps/RadarMap";

const RadarMap = lazy(() => import("@/components/maps/RadarMap"));

const LAYERS: { key: GridLayer; label: string; icon: LucideIcon; legend?: [string, string, string] }[] = [
  { key: "none", label: "Radar only", icon: CloudRain },
  { key: "temperature", label: "Temperature", icon: Thermometer, legend: ["#3b6fd8", "#ffd166", "#e63946"] },
  { key: "wind", label: "Wind", icon: Wind, legend: ["#a8d8ea", "#5fa8d3", "#c2185b"] },
  { key: "cloud", label: "Clouds", icon: Cloudy, legend: ["#e8eef7", "#aab6c8", "#5d6b80"] },
  { key: "uv", label: "UV", icon: Sun, legend: ["#3fbf6b", "#f28c28", "#8e44ad"] },
  { key: "aqi", label: "Air quality", icon: Gauge, legend: ["#3fbf6b", "#f28c28", "#8e44ad"] },
];

const LEGEND_TEXT: Partial<Record<GridLayer, [string, string]>> = {
  temperature: ["Cold", "Hot"], wind: ["Calm", "Strong"], cloud: ["Clear", "Overcast"], uv: ["Low", "Extreme"], aqi: ["Good", "Unhealthy"],
};

export default function RadarPage() {
  const place = useActivePlace();
  const { resolvedTheme } = useApp();
  const [radar, setRadar] = useState(true);
  const [layer, setLayer] = useState<GridLayer>("none");
  const [status, setStatus] = useState<{ radar: string; grid: string }>({ radar: "loading", grid: "idle" });
  const center = useMemo<[number, number]>(() => [place.latitude, place.longitude], [place.latitude, place.longitude]);
  const active = LAYERS.find((l) => l.key === layer)!;

  return (
    <div className="relative h-[100dvh] w-full">
      <h1 className="sr-only">Weather radar for {place.name}</h1>
      <Suspense fallback={<div className="grid h-full place-items-center bg-sunken"><CloudLoader label="Loading map" /></div>}>
        <RadarMap center={center} theme={resolvedTheme} radar={radar} layer={layer}
          onStatus={(s) => setStatus((prev) => ({ radar: s.radar ?? prev.radar, grid: s.grid === "idle" ? prev.grid : s.grid }))} />
      </Suspense>

      {/* layer controls */}
      <div className="pointer-events-none absolute inset-x-0 top-24 z-[500] flex justify-center px-3 sm:top-24 lg:top-28">
        <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2">
          <div role="radiogroup" aria-label="Map layer" className="glass no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 shadow-[var(--shadow-lift)]">
            {LAYERS.map((l) => (
              <button key={l.key} role="radio" aria-checked={layer === l.key} onClick={() => setLayer(l.key)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${layer === l.key ? "bg-ink text-bg" : "text-ink-soft hover:bg-sunken hover:text-ink"}`}>
                <l.icon size={15} aria-hidden="true" />{l.label}
              </button>
            ))}
          </div>
          <label className="glass flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink shadow-[var(--shadow-soft)]">
            <input type="checkbox" checked={radar} onChange={(e) => setRadar(e.target.checked)} className="accent-[var(--accent)]" />
            Rain radar overlay
          </label>
        </div>
      </div>

      {/* legend + status */}
      <div className="absolute bottom-24 right-3 z-[500] flex flex-col items-end gap-2 lg:bottom-24 lg:right-6">
        {status.radar === "unavailable" && radar && (
          <p role="status" className="glass flex max-w-xs items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-ink shadow-[var(--shadow-soft)]">
            <AlertTriangle size={15} className="shrink-0 text-fair" aria-hidden="true" />
            Radar imagery is unavailable right now. Other layers still work.
          </p>
        )}
        {status.grid === "error" && layer !== "none" && (
          <p role="status" className="glass rounded-2xl px-3.5 py-2.5 text-xs font-medium text-ink">Couldn't load the {active.label.toLowerCase()} layer.</p>
        )}
        {active.legend && (
          <div className="glass w-52 rounded-2xl px-3.5 py-3 shadow-[var(--shadow-soft)]">
            <p className="mb-1.5 text-xs font-bold text-ink">{active.label}</p>
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${active.legend.join(",")})` }} aria-hidden="true" />
            <div className="mt-1 flex justify-between text-[0.68rem] font-semibold text-ink-mute">
              <span>{LEGEND_TEXT[layer]?.[0]}</span><span>{LEGEND_TEXT[layer]?.[1]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
