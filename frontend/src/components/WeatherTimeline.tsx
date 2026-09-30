import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, CloudRain, Droplets, Thermometer, Wind } from "lucide-react";
import type { HourlyPoint } from "@/types/weather";
import { WeatherIcon } from "./ui/WeatherIcon";
import { Skeleton } from "./ui/primitives";
import { compassPoint, fmtHour, fmtPct, fmtTemp, fmtWind } from "@/utils/formatters";

const CELL = 76;
const CURVE_H = 64;

/** Catmull-Rom → cubic Bézier for a smooth line through every point. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

interface Props {
  hours: HourlyPoint[] | null;
  loading?: boolean;
  title?: string;
  count?: number;
}

export function WeatherTimeline({ hours, loading, title = "Next 24 hours", count = 24 }: Props) {
  const data = useMemo(() => (hours ?? []).slice(0, count), [hours, count]);
  const [selected, setSelected] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const { path, area, points } = useMemo(() => {
    if (!data.length) return { path: "", area: "", points: [] as [number, number][] };
    const temps = data.map((h) => h.temperature);
    const min = Math.min(...temps), max = Math.max(...temps);
    const span = Math.max(1, max - min);
    const pts = data.map((h, i) => [i * CELL + CELL / 2, 12 + (1 - (h.temperature - min) / span) * (CURVE_H - 24)] as [number, number]);
    const p = smoothPath(pts);
    return { path: p, area: `${p} L${pts.at(-1)![0]},${CURVE_H} L${pts[0]![0]},${CURVE_H} Z`, points: pts };
  }, [data]);

  const sel = data[selected];
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * CELL * 5, behavior: "smooth" });

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? data.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(data.length - 1, next));
    setSelected(n);
    buttons.current[n]?.focus();
    buttons.current[n]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };

  return (
    <section aria-labelledby="timeline-title" className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-7">
        <h2 id="timeline-title" className="text-xl font-bold tracking-[-0.02em] text-ink">{title}</h2>
        <div className="hidden gap-1.5 sm:flex">
          <button onClick={() => scrollBy(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink" aria-label="Scroll earlier">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scrollBy(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink" aria-label="Scroll later">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading && !data.length ? (
        <div className="flex gap-3 p-6">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-40 w-16 shrink-0" />)}</div>
      ) : (
        <>
          <div ref={scroller} className="no-scrollbar mt-3 overflow-x-auto scroll-smooth px-3 pb-2 sm:px-4" style={{ scrollSnapType: "x proximity" }}>
            <div className="relative" style={{ width: data.length * CELL }}>
              {/* temperature curve */}
              <svg width={data.length * CELL} height={CURVE_H} className="block" aria-hidden="true">
                <defs>
                  <linearGradient id="tl-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
                    <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#tl-area)" />
                <motion.path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut" }} />
                {points[selected] && (
                  <g>
                    <line x1={points[selected]![0]} x2={points[selected]![0]} y1={points[selected]![1]} y2={CURVE_H} stroke="var(--accent)" strokeOpacity="0.35" strokeDasharray="3 3" />
                    <circle cx={points[selected]![0]} cy={points[selected]![1]} r="5.5" fill="var(--bg-elev)" stroke="var(--accent)" strokeWidth="2.5" />
                  </g>
                )}
              </svg>

              <ul role="listbox" aria-label="Hourly forecast" aria-orientation="horizontal" className="flex">
                {data.map((h, i) => {
                  const active = i === selected;
                  const prob = h.precipitation_probability ?? 0;
                  const label = `${i === 0 ? "Now" : fmtHour(h.time)}: ${h.condition_label}, ${fmtTemp(h.temperature)}, ${fmtPct(h.precipitation_probability)} chance of rain`;
                  return (
                    <li key={h.time} role="presentation" style={{ width: CELL, scrollSnapAlign: "start" }}>
                      <button ref={(el) => { buttons.current[i] = el; }} role="option" aria-selected={active} aria-label={label}
                        tabIndex={active ? 0 : -1} onKeyDown={(e) => onKey(e, i)}
                        onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)}
                        className={`flex w-full flex-col items-center gap-2 rounded-[1.1rem] py-3 transition-colors ${active ? "bg-accent-soft" : "hover:bg-sunken"}`}>
                        <span className={`num text-xs font-semibold ${active ? "text-accent" : "text-ink-mute"}`}>{i === 0 ? "Now" : fmtHour(h.time)}</span>
                        <WeatherIcon condition={h.condition} isDay={h.is_day} size={34} />
                        <span className="num text-[1.05rem] font-bold text-ink">{fmtTemp(h.temperature)}</span>
                        <span className="flex h-9 w-2.5 items-end overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                          <span className="w-full rounded-full bg-[#4b8bff] transition-all duration-500" style={{ height: `${Math.max(4, prob)}%`, opacity: prob < 10 ? 0.35 : 1 }} />
                        </span>
                        <span className={`num text-[0.7rem] font-semibold ${prob >= 50 ? "text-[#2f6fe0] dark:text-[#6ea2ff]" : "text-ink-mute"}`}>{fmtPct(prob)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="border-t border-line px-6 py-4 sm:px-7" aria-live="polite">
            <AnimatePresence mode="wait">
              {sel && (
                <motion.dl key={sel.time} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <dt className="sr-only">Time</dt><dd>{selected === 0 ? "Now" : fmtHour(sel.time)} · {sel.condition_label}</dd>
                  </div>
                  <div className="flex items-center gap-1.5 text-ink-soft"><Thermometer size={15} aria-hidden="true" /><dt>Feels</dt><dd className="num font-semibold text-ink">{fmtTemp(sel.feels_like)}</dd></div>
                  <div className="flex items-center gap-1.5 text-ink-soft"><CloudRain size={15} aria-hidden="true" /><dt>Rain</dt><dd className="num font-semibold text-ink">{fmtPct(sel.precipitation_probability)}{sel.precipitation ? ` · ${sel.precipitation} mm` : ""}</dd></div>
                  <div className="flex items-center gap-1.5 text-ink-soft"><Wind size={15} aria-hidden="true" /><dt>Wind</dt><dd className="num font-semibold text-ink">{fmtWind(sel.wind_speed)} {compassPoint(sel.wind_direction)}</dd></div>
                  <div className="flex items-center gap-1.5 text-ink-soft"><Droplets size={15} aria-hidden="true" /><dt>Humidity</dt><dd className="num font-semibold text-ink">{fmtPct(sel.humidity)}</dd></div>
                </motion.dl>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  );
}
