import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDownUp, Clock, Loader2, MapPin, Navigation, Sparkles } from "lucide-react";
import { PageFrame } from "@/layout/AppLayout";
import { CloudLoader, EmptyState, ErrorState } from "@/components/ui/States";
import { Pill } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { getRoute } from "@/services/weatherApi";
import type { ApiError } from "@/services/http";
import { useApp, useActivePlace } from "@/state/AppState";
import type { RouteWeather } from "@/types/weather";
import { fmtClock, fmtDuration, fmtKm, fmtPct, fmtTemp, fmtWind } from "@/utils/formatters";
import { isWetCondition } from "@/utils/weatherHelpers";

const RouteMap = lazy(() => import("@/components/maps/RouteMap"));

const EXAMPLES: [string, string][] = [["Uttara", "North South University"], ["Dhanmondi", "Gulshan"], ["Mirpur", "Motijheel"]];

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function RoutesPage() {
  const { prefs, resolvedTheme } = useApp();
  const place = useActivePlace();
  const [params] = useSearchParams();
  // Shareable links: /routes?from=Uttara&to=Gulshan&depart=09:00
  const [from, setFrom] = useState(params.get("from") || prefs.home || "");
  const [to, setTo] = useState(params.get("to") || prefs.work || "");
  const [mode, setMode] = useState<"depart" | "arrive">("depart");
  const [time, setTime] = useState(params.get("depart") || prefs.departure_time || nowHHMM());
  const [route, setRoute] = useState<RouteWeather | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (a = from, b = to) => {
    if (a.trim().length < 2 || b.trim().length < 2) return;
    setLoading(true); setError(null);
    try {
      setRoute(await getRoute(a.trim(), b.trim(), { [mode]: time || undefined, near: place }));
    } catch (e) {
      setError(e as ApiError); setRoute(null);
    } finally { setLoading(false); }
  };

  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoRan.current && params.get("from") && params.get("to")) {
      autoRan.current = true;
      void run(params.get("from")!, params.get("to")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const field = "h-12 w-full rounded-2xl border border-line bg-bg px-4 text-[0.97rem] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-line-strong";

  return (
    <PageFrame title="Weather along your route" subtitle="Conditions at every stop, matched to when you'll actually be there.">
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:gap-8">
        <form className="surface flex h-fit flex-col gap-4 p-6" onSubmit={(e) => { e.preventDefault(); void run(); }} aria-label="Plan a route">
          <div className="relative flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
              Starting point
              <span className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-good" aria-hidden="true" />
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Uttara" className={`${field} pl-10`} required minLength={2} />
              </span>
            </label>
            <button type="button" onClick={() => { setFrom(to); setTo(from); }}
              className="absolute right-3 top-[3.9rem] z-10 grid h-8 w-8 place-items-center rounded-full border border-line bg-elev text-ink-soft hover:text-ink" aria-label="Swap start and destination">
              <ArrowDownUp size={14} />
            </button>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
              Destination
              <span className="relative">
                <Navigation size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" aria-hidden="true" />
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. North South University" className={`${field} pl-10`} required minLength={2} />
              </span>
            </label>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold text-ink-soft">Timing</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunken p-1">
              {(["depart", "arrive"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className={`h-9 rounded-xl text-sm font-semibold transition-colors ${mode === m ? "bg-elev text-ink shadow-[var(--shadow-soft)]" : "text-ink-mute hover:text-ink"}`}>
                  {m === "depart" ? "Depart at" : "Arrive by"}
                </button>
              ))}
            </div>
            <label className="relative">
              <span className="sr-only">{mode === "depart" ? "Departure time" : "Arrival time"}</span>
              <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" aria-hidden="true" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${field} num pl-10`} />
            </label>
          </fieldset>

          <button type="submit" disabled={loading}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60">
            {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
            {loading ? "Checking the route…" : "Analyze route weather"}
          </button>
          <p className="text-xs text-ink-mute">Places are matched near {place.name}. Landmarks and neighbourhoods work too.</p>
        </form>

        <section aria-live="polite" aria-label="Route results" className="min-w-0">
          {loading && !route ? (
            <div className="surface"><CloudLoader label="Tracing your route" /></div>
          ) : error ? (
            <div className="surface"><ErrorState error={error} onRetry={() => run()} /></div>
          ) : !route ? (
            <div className="surface">
              <EmptyState title="No route selected yet." body="Enter where you're starting and where you're heading. We'll check the weather at each stop along the way.">
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map(([a, b]) => (
                    <button key={a} onClick={() => { setFrom(a); setTo(b); void run(a, b); }}
                      className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-soft hover:border-line-strong hover:text-ink">
                      {a} → {b}
                    </button>
                  ))}
                </div>
              </EmptyState>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="surface overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">{route.origin.name} → {route.destination.name}</h2>
                    <p className="num mt-1 text-sm text-ink-mute">{fmtKm(route.distance_km)} · about {fmtDuration(route.duration_min)}{route.routing === "straight-line" ? " · approximate path" : " by road"}</p>
                  </div>
                  <p className="flex max-w-md items-start gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-[0.97rem] font-semibold text-ink">
                    <Sparkles size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />{route.summary}
                  </p>
                </div>
                <div className="h-[340px] border-t border-line sm:h-[400px]">
                  <Suspense fallback={<div className="grid h-full place-items-center"><CloudLoader label="Loading map" /></div>}>
                    <RouteMap route={route} theme={resolvedTheme} />
                  </Suspense>
                </div>
              </div>

              <ol className="surface relative p-6" aria-label="Stops along the route">
                <span className="absolute bottom-10 left-[2.55rem] top-10 w-0.5 rounded-full bg-line-strong" aria-hidden="true" />
                {route.stops.map((s, i) => {
                  const wet = isWetCondition(s.condition) || (s.precipitation_probability ?? 0) >= 50;
                  return (
                    <motion.li key={`${s.name}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="relative flex items-center gap-4 py-3">
                      <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 bg-elev ${wet ? "border-[#2f6fe0]" : "border-line-strong"}`}>
                        <WeatherIcon condition={s.condition} size={26} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{s.name}</p>
                        <p className="num text-sm text-ink-mute">{fmtClock(s.eta)} · {fmtKm(s.distance_km)} in</p>
                      </div>
                      <div className="hidden text-right text-sm sm:block">
                        <p className="font-semibold text-ink">{s.condition_label}</p>
                        <p className="num text-ink-mute">Wind {fmtWind(s.wind_speed)}</p>
                      </div>
                      <Pill tone={wet ? "accent" : (s.precipitation_probability ?? 0) >= 30 ? "fair" : "good"}>{fmtPct(s.precipitation_probability)} rain</Pill>
                      <span className="num w-12 text-right text-xl font-bold text-ink">{fmtTemp(s.temperature)}</span>
                    </motion.li>
                  );
                })}
              </ol>
            </motion.div>
          )}
        </section>
      </div>
    </PageFrame>
  );
}
