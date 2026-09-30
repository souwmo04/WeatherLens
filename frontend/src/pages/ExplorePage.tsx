import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, GitCompareArrows, Plus, Search } from "lucide-react";
import { CitySearch } from "@/components/CitySearch";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { useAsync } from "@/hooks/useAsync";
import { PageFrame } from "@/layout/AppLayout";
import { getForecast } from "@/services/weatherApi";
import { DHAKA, useApp } from "@/state/AppState";
import type { ForecastBundle, Place } from "@/types/weather";
import { fmtClock, fmtPct, fmtTemp, fmtWind } from "@/utils/formatters";
import { aqiInfo } from "@/utils/weatherHelpers";

export const FEATURED: Place[] = [
  DHAKA,
  { name: "Chittagong", country: "Bangladesh", admin1: "Chittagong", latitude: 22.3569, longitude: 91.7832 },
  { name: "Rajshahi", country: "Bangladesh", admin1: "Rajshahi", latitude: 24.3745, longitude: 88.6042 },
  { name: "London", country: "United Kingdom", admin1: "England", latitude: 51.5072, longitude: -0.1276 },
  { name: "Tokyo", country: "Japan", admin1: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { name: "New York", country: "United States", admin1: "New York", latitude: 40.7128, longitude: -74.006 },
  { name: "Sydney", country: "Australia", admin1: "New South Wales", latitude: -33.8688, longitude: 151.2093 },
  { name: "Melbourne", country: "Australia", admin1: "Victoria", latitude: -37.8136, longitude: 144.9631 },
];

const key = (p: Place) => `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;

function useCity(p: Place | null) {
  return useAsync(p ? `city:${key(p)}` : null, () => getForecast(p!, null));
}

function CityCard({ place, onOpen, onCompare }: { place: Place; onOpen: () => void; onCompare: () => void }) {
  const { data, loading, error } = useCity(place);
  const c = data?.current;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="group overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <WeatherScene scene={c?.scene ?? "cloudy"} seed={place.name} landmarks={place.name === "Dhaka"} compact
        cloudCover={c?.cloud_cover} wind={c?.wind_speed} className="h-64" scrim={0.85}>
        <div className="scene-text flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold tracking-[-0.02em]">{place.name}</h3>
              <p className="text-sm text-white/75">{place.country}{c ? ` · ${fmtClock(c.time)}` : ""}</p>
            </div>
            <button onClick={onCompare} className="glass-on-scene grid h-9 w-9 place-items-center rounded-full opacity-90 hover:bg-white/25" aria-label={`Compare ${place.name}`}>
              <GitCompareArrows size={16} />
            </button>
          </div>
          {loading && !data ? <Skeleton className="h-12 w-32 !bg-white/20" /> : error ? (
            <p className="text-sm text-white/85">Weather unavailable right now.</p>
          ) : c && (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="num text-5xl font-light tracking-[-0.05em]">{fmtTemp(c.temperature)}</p>
                <p className="flex items-center gap-1.5 text-sm font-semibold"><WeatherIcon condition={c.condition} isDay={c.is_day} size={22} />{c.condition_label}</p>
              </div>
              <button onClick={onOpen} className="glass-on-scene flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold hover:bg-white/25">
                Open <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </WeatherScene>
    </motion.article>
  );
}

type Row = { label: string; get: (d: ForecastBundle) => string };
const ROWS: Row[] = [
  { label: "Temperature", get: (d) => fmtTemp(d.current.temperature) },
  { label: "Feels like", get: (d) => fmtTemp(d.current.feels_like) },
  { label: "Today's high / low", get: (d) => d.daily[0] ? `${fmtTemp(d.daily[0].temp_max)} / ${fmtTemp(d.daily[0].temp_min)}` : "—" },
  { label: "Rain chance today", get: (d) => fmtPct(d.daily[0]?.precipitation_probability_max) },
  { label: "Humidity", get: (d) => fmtPct(d.current.humidity) },
  { label: "Wind", get: (d) => fmtWind(d.current.wind_speed) },
  { label: "Air quality", get: (d) => d.air_quality?.us_aqi != null ? `${Math.round(d.air_quality.us_aqi)} · ${aqiInfo(d.air_quality.us_aqi)?.label}` : "Unavailable" },
  { label: "Sunrise", get: (d) => d.daily[0]?.sunrise ? fmtClock(d.daily[0].sunrise) : "—" },
  { label: "Sunset", get: (d) => d.daily[0]?.sunset ? fmtClock(d.daily[0].sunset) : "—" },
];

function ComparePanel({ a, b, pick }: { a: Place; b: Place | null; pick: (slot: 0 | 1) => void }) {
  const A = useCity(a), B = useCity(b);
  const slot = (p: Place | null, s: typeof A, i: 0 | 1) => (
    <div className="overflow-hidden rounded-[1.4rem]">
      <WeatherScene scene={s.data?.current.scene ?? "cloudy"} seed={p?.name ?? "empty"} landmarks={p?.name === "Dhaka"} compact
        cloudCover={s.data?.current.cloud_cover} className="h-36" scrim={0.8}>
        <div className="scene-text relative flex h-full flex-col justify-end p-4">
          <button onClick={() => pick(i)} aria-label={p ? `Change ${p.name}` : "Add a city to compare"}
            className="glass-on-scene absolute right-2.5 top-2.5 flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold hover:bg-white/25">
            {p ? "Change" : <><Plus size={13} aria-hidden="true" />Add</>}
          </button>
          <p className="truncate text-base font-bold">{p?.name ?? "Choose a city"}</p>
          {s.data && <p className="num text-3xl font-light leading-tight">{fmtTemp(s.data.current.temperature)}</p>}
        </div>
      </WeatherScene>
    </div>
  );

  return (
    <section aria-labelledby="compare-title" className="surface p-5 sm:p-6">
      <h2 id="compare-title" className="mb-4 flex items-center gap-2 text-xl font-bold tracking-[-0.02em] text-ink">
        <GitCompareArrows size={20} className="text-accent" aria-hidden="true" /> Compare
      </h2>
      <div className="grid grid-cols-2 gap-3">{slot(a, A, 0)}{slot(b, B, 1)}</div>
      {A.error ? <ErrorState compact error={A.error} onRetry={A.reload} /> : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Weather comparison between {a.name} and {b?.name ?? "a second city"}</caption>
          <thead className="sr-only"><tr><th scope="col">Metric</th><th scope="col">{a.name}</th><th scope="col">{b?.name ?? "—"}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="py-2.5 text-left font-medium text-ink-mute">{r.label}</th>
                <td className="num py-2.5 text-right font-semibold text-ink">{A.data ? r.get(A.data) : "…"}</td>
                <td className="num py-2.5 text-right font-semibold text-ink">{b ? (B.data ? r.get(B.data) : B.error ? "—" : "…") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { setPlace, setScenario } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [extra, setExtra] = useState<Place[]>([]);
  const [compare, setCompare] = useState<[Place, Place | null]>([DHAKA, FEATURED[7]!]);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const cities = useMemo(() => [...extra, ...FEATURED.filter((f) => !extra.some((e) => key(e) === key(f)))], [extra]);

  const open = (p: Place) => { setScenario(null); setPlace(p); navigate("/app"); };
  const addToCompare = (p: Place) => setCompare(([a, b]) => (key(a) === key(p) ? [a, b] : b && key(b) === key(p) ? [a, b] : [a, p]));

  return (
    <PageFrame title="Explore cities" subtitle="Every city gets its own weather world. Open one, or compare two side by side.">
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem] xl:gap-8">
        <div>
          <button onClick={() => { setPicking(null); setSearchOpen(true); }}
            className="mb-6 flex h-13 w-full items-center gap-3 rounded-full border border-line bg-elev px-5 text-left text-ink-mute shadow-[var(--shadow-soft)] hover:border-line-strong">
            <Search size={18} aria-hidden="true" /> Search any city in the world…
          </button>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {cities.map((p) => <CityCard key={key(p)} place={p} onOpen={() => open(p)} onCompare={() => addToCompare(p)} />)}
          </div>
        </div>
        <div className="xl:sticky xl:top-28 xl:h-fit">
          <ComparePanel a={compare[0]} b={compare[1]} pick={(s) => { setPicking(s); setSearchOpen(true); }} />
        </div>
      </div>
      <CitySearch open={searchOpen} onClose={() => setSearchOpen(false)} title={picking == null ? "Add a city" : "Choose a city to compare"}
        onSelect={(p) => {
          if (picking == null) setExtra((x) => [p, ...x.filter((e) => key(e) !== key(p))]);
          else setCompare(([a, b]) => (picking === 0 ? [p, b] : [a, p]));
        }} />
    </PageFrame>
  );
}
