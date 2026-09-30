import { useEffect, useRef } from "react";
import type { RouteWeather } from "@/types/weather";
import { isWetCondition } from "@/utils/weatherHelpers";
import { L, baseLayer, pinIcon } from "./mapUtils";

export default function RouteMap({ route, theme }: { route: RouteWeather; theme: "light" | "dark" }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const group = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    group.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    base.current?.remove();
    base.current = baseLayer(theme).addTo(map.current);
    base.current.bringToBack();
  }, [theme]);

  useEffect(() => {
    const m = map.current, g = group.current;
    if (!m || !g) return;
    g.clearLayers();
    const line = route.geometry.map(([a, b]) => L.latLng(a, b));
    L.polyline(line, { color: "#0c1530", weight: 9, opacity: 0.18, lineCap: "round" }).addTo(g);
    L.polyline(line, { color: "#4b6bff", weight: 5, opacity: 0.95, lineCap: "round", dashArray: route.routing === "straight-line" ? "8 10" : undefined }).addTo(g);
    route.stops.forEach((s, i) => {
      const wet = isWetCondition(s.condition) || (s.precipitation_probability ?? 0) >= 50;
      const color = wet ? "#2f6fe0" : (s.precipitation_probability ?? 0) >= 30 ? "#d38a0b" : "#16a36a";
      L.marker([s.latitude, s.longitude], { icon: pinIcon(color, `${Math.round(s.temperature)}°`), title: s.name, keyboard: false })
        .bindTooltip(`${s.name} · ${s.condition_label} · ${Math.round(s.precipitation_probability ?? 0)}%`, { direction: "top", offset: [0, -14] })
        .addTo(g);
      if (i === 0 || i === route.stops.length - 1) {
        L.circleMarker([s.latitude, s.longitude], { radius: 22, stroke: false, fillColor: color, fillOpacity: 0.15, interactive: false }).addTo(g);
      }
    });
    m.fitBounds(L.latLngBounds(line).pad(0.15), { animate: true });
  }, [route]);

  return <div ref={el} className="isolate h-full w-full" role="img" aria-label={`Map of route from ${route.origin.name} to ${route.destination.name}`} />;
}
