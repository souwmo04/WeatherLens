import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { GridPoint } from "@/types/weather";
import { getGrid } from "@/services/weatherApi";
import { L, SCALES, baseLayer, pinIcon, scaleColor } from "./mapUtils";

export type GridLayer = "none" | "temperature" | "wind" | "cloud" | "uv" | "aqi";

interface Props {
  center: [number, number];
  theme: "light" | "dark";
  radar: boolean;
  layer: GridLayer;
  onStatus?: (s: { radar: "ok" | "unavailable" | "loading"; grid: "ok" | "error" | "loading" | "idle"; frameTime?: number }) => void;
}

interface Frame { time: number; path: string }

const valueOf = (p: GridPoint, layer: GridLayer): number | null => ({
  none: null, temperature: p.temperature, wind: p.wind_speed, cloud: p.cloud_cover, uv: p.uv_index, aqi: p.us_aqi,
}[layer]);

const fmt = (v: number, layer: GridLayer) =>
  layer === "temperature" ? `${Math.round(v)}°` : layer === "cloud" ? `${Math.round(v)}%` : layer === "uv" ? v.toFixed(0) : `${Math.round(v)}`;

export default function RadarMap({ center, theme, radar, layer, onStatus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const radarLayers = useRef<L.TileLayer[]>([]);
  const gridGroup = useRef<L.LayerGroup | null>(null);
  const [frames, setFrames] = useState<{ host: string; frames: Frame[] } | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  // map init
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center, zoom: 8, zoomControl: false, attributionControl: true, worldCopyJump: true });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.marker(center, { icon: pinIcon("var(--accent)"), keyboard: false, interactive: false }).addTo(m);
    gridGroup.current = L.layerGroup().addTo(m);
    let t: ReturnType<typeof setTimeout>;
    m.on("moveend", () => { clearTimeout(t); t = setTimeout(() => setBounds(m.getBounds()), 350); });
    map.current = m;
    setBounds(m.getBounds());
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.setView(center, map.current.getZoom()); }, [center]);

  useEffect(() => {
    if (!map.current) return;
    base.current?.remove();
    base.current = baseLayer(theme).addTo(map.current);
    base.current.bringToBack();
  }, [theme]);

  // RainViewer frames (public, keyless)
  useEffect(() => {
    if (!radar) return;
    statusRef.current?.({ radar: "loading", grid: "idle" });
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { host: string; radar?: { past?: Frame[]; nowcast?: Frame[] } }) => {
        const all = [...(j.radar?.past ?? []), ...(j.radar?.nowcast ?? [])];
        if (!all.length) throw new Error("no frames");
        setFrames({ host: j.host, frames: all.slice(-12) });
        setFrameIdx(Math.min(all.length, 12) - 1);
      })
      .catch(() => { setFrames(null); statusRef.current?.({ radar: "unavailable", grid: "idle" }); });
  }, [radar]);

  // Build one tile layer per frame; animate by toggling opacity (avoids re-downloading).
  useEffect(() => {
    const m = map.current;
    radarLayers.current.forEach((l) => l.remove());
    radarLayers.current = [];
    if (!m || !radar || !frames) return;
    radarLayers.current = frames.frames.map((f) => {
      const layer = L.tileLayer(`${frames.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0, maxNativeZoom: 7, maxZoom: 18, zIndex: 20,
        attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>',
      });
      layer.on("tileerror", () => statusRef.current?.({ radar: "unavailable", grid: "idle" }));
      return layer.addTo(m);
    });
  }, [frames, radar]);

  useEffect(() => {
    radarLayers.current.forEach((l, i) => l.setOpacity(i === frameIdx ? 0.72 : 0));
    const f = frames?.frames[frameIdx];
    if (f) statusRef.current?.({ radar: "ok", grid: "idle", frameTime: f.time });
  }, [frameIdx, frames]);

  useEffect(() => {
    if (!playing || !frames || !radar) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setFrameIdx((i) => (i + 1) % frames.frames.length), 700);
    return () => clearInterval(t);
  }, [playing, frames, radar]);

  // Grid layers from our backend
  useEffect(() => {
    const g = gridGroup.current;
    g?.clearLayers();
    if (!g || !bounds || layer === "none") return;
    let alive = true;
    const b = { south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() };
    if (b.east - b.west > 60) return; // zoomed too far out for a meaningful sample
    getGrid(b, 7, layer === "aqi").then((pts) => {
      if (!alive) return;
      g.clearLayers();
      const cellKm = ((b.north - b.south) * 111) / 7;
      const scale = SCALES[layer === "cloud" ? "cloud" : layer];
      for (const p of pts) {
        const v = valueOf(p, layer);
        if (v == null) continue;
        const color = scaleColor(scale, v);
        L.circle([p.latitude, p.longitude], { radius: cellKm * 650, stroke: false, fillColor: color, fillOpacity: layer === "cloud" ? v / 180 : 0.32, interactive: false }).addTo(g);
        const arrow = layer === "wind" && p.wind_direction != null
          ? `<span style="display:inline-block;transform:rotate(${p.wind_direction + 180}deg)">↑</span> ` : "";
        L.marker([p.latitude, p.longitude], {
          interactive: false, keyboard: false,
          icon: L.divIcon({ className: "wl-marker", iconSize: [54, 24], iconAnchor: [27, 12],
            html: `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;padding:3px 8px;border-radius:999px;background:rgb(255 255 255/.9);color:#0c1530;font:700 12px 'Plus Jakarta Sans',sans-serif;box-shadow:0 2px 8px rgb(0 0 0/.18);border-left:4px solid ${color}">${arrow}${fmt(v, layer)}</span>` }),
        }).addTo(g);
      }
      statusRef.current?.({ radar: radar ? "ok" : "loading", grid: "ok" });
    }).catch(() => { if (alive) statusRef.current?.({ radar: "ok", grid: "error" }); });
    return () => { alive = false; };
  }, [bounds, layer, radar]);

  const frame = frames?.frames[frameIdx];
  return (
    <div className="relative h-full w-full">
      <div ref={el} className="isolate h-full w-full" role="application" aria-label="Interactive weather map" />
      {radar && frames && (
        <div className="glass absolute bottom-4 left-4 z-[500] flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 shadow-[var(--shadow-lift)]">
          <button onClick={() => setPlaying((p) => !p)} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-bg" aria-label={playing ? "Pause radar animation" : "Play radar animation"}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <input type="range" min={0} max={frames.frames.length - 1} value={frameIdx} aria-label="Radar frame"
            onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }} className="w-28 accent-[var(--accent)] sm:w-44" />
          <span className="num w-16 text-xs font-semibold text-ink">
            {frame ? new Date(frame.time * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
          </span>
        </div>
      )}
    </div>
  );
}
