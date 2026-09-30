import { motion } from "motion/react";
import { Droplet } from "lucide-react";
import type { DailyPoint } from "@/types/weather";
import { WeatherIcon } from "./ui/WeatherIcon";
import { Skeleton } from "./ui/primitives";
import { fmtPct, fmtTemp, fmtWeekday } from "@/utils/formatters";

/** 7-day list with temperature range bars placed on a shared weekly scale. */
export function DailyForecast({ days, loading, title = "7-day forecast", onSelect, selected }: {
  days: DailyPoint[] | null; loading: boolean; title?: string; onSelect?: (d: DailyPoint) => void; selected?: string;
}) {
  const lo = Math.min(...(days ?? []).map((d) => d.temp_min));
  const hi = Math.max(...(days ?? []).map((d) => d.temp_max));
  const span = Math.max(1, hi - lo);

  return (
    <section aria-labelledby="daily-title" className="surface h-full p-6 sm:p-7">
      <h2 id="daily-title" className="mb-4 text-xl font-bold tracking-[-0.02em] text-ink">{title}</h2>
      {loading || !days ? (
        <div className="space-y-3">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <ul className="divide-y divide-line">
          {days.map((d, i) => {
            const left = ((d.temp_min - lo) / span) * 100;
            const width = Math.max(6, ((d.temp_max - d.temp_min) / span) * 100);
            const rain = d.precipitation_probability_max ?? 0;
            const Row = onSelect ? "button" : "div";
            return (
              <motion.li key={d.date} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.4 }}>
                <Row {...(onSelect ? { onClick: () => onSelect(d), "aria-pressed": selected === d.date } : {})}
                  className={`grid w-full grid-cols-[3.4rem_2.4rem_3.2rem_2.2rem_1fr_2.2rem] items-center gap-2 py-2.5 text-left sm:grid-cols-[4.5rem_2.6rem_4rem_2.4rem_1fr_2.4rem] ${
                    onSelect ? `rounded-2xl px-2 transition-colors ${selected === d.date ? "bg-accent-soft" : "hover:bg-sunken"}` : ""}`}
                  aria-label={`${i === 0 ? "Today" : fmtWeekday(d.date)}: ${d.condition_label}, low ${fmtTemp(d.temp_min)}, high ${fmtTemp(d.temp_max)}, ${fmtPct(rain)} chance of rain`}>
                  <span className="font-semibold text-ink">{i === 0 ? "Today" : fmtWeekday(d.date)}</span>
                  <WeatherIcon condition={d.condition} size={30} />
                  <span className={`num flex items-center gap-0.5 text-xs font-semibold ${rain >= 40 ? "text-[#2f6fe0] dark:text-[#6ea2ff]" : "text-ink-mute"}`}>
                    <Droplet size={11} aria-hidden="true" />{fmtPct(rain)}
                  </span>
                  <span className="num text-right text-sm font-medium text-ink-mute">{fmtTemp(d.temp_min)}</span>
                  <span className="relative h-1.5 rounded-full bg-sunken" aria-hidden="true">
                    <span className="absolute inset-y-0 rounded-full"
                      style={{ left: `${left}%`, width: `${width}%`, background: "linear-gradient(90deg, #6ea2ff, #ffc14d 60%, #ff8a4c)" }} />
                  </span>
                  <span className="num text-sm font-bold text-ink">{fmtTemp(d.temp_max)}</span>
                </Row>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
