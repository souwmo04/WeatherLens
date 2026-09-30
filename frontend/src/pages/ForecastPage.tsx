import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Droplets, Sun, Sunrise, Sunset, Umbrella, Wind } from "lucide-react";
import { DailyForecast } from "@/components/DailyForecast";
import { DailyStory } from "@/components/DailyStory";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/primitives";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { useForecast } from "@/hooks/useWeather";
import { PageFrame } from "@/layout/AppLayout";
import { useActivePlace } from "@/state/AppState";
import type { DailyPoint, Scene } from "@/types/weather";
import { fmtClock, fmtHour, fmtLongDate, fmtPct, fmtTemp, fmtWind } from "@/utils/formatters";
import { uvInfo } from "@/utils/weatherHelpers";

function sceneForDay(d: DailyPoint): Scene {
  switch (d.condition) {
    case "storm": return "storm";
    case "rain": case "heavy_rain": case "drizzle": return "rain";
    case "snow": return "snow";
    case "fog": return "fog";
    case "cloudy": return "cloudy";
    default: return "sunny";
  }
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3">
      <span className="text-accent" aria-hidden="true">{icon}</span>
      <div>
        <dt className="text-xs font-semibold text-ink-mute">{label}</dt>
        <dd className="num font-bold text-ink">{value}</dd>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const forecast = useForecast();
  const place = useActivePlace();
  const d = forecast.data;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const day = d?.daily.find((x) => x.date === selectedDate) ?? d?.daily[0];
  const dayHours = useMemo(
    () => (d && day ? d.hourly.filter((h) => h.time.startsWith(day.date)).filter((_, i) => i % 3 === 0) : []),
    [d, day],
  );

  return (
    <PageFrame title="Forecast" subtitle={`The next 48 hours and 7 days for ${d?.location.name ?? place.name}.`}>
      {forecast.error && !d ? (
        <div className="surface"><ErrorState error={forecast.error} onRetry={forecast.reload} /></div>
      ) : (
        <div className="flex flex-col gap-6 lg:gap-8">
          <WeatherTimeline hours={d?.hourly ?? null} loading={forecast.loading} title="Next 48 hours" count={48} />

          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            <DailyForecast days={d?.daily ?? null} loading={forecast.loading} title="7 days"
              onSelect={(x) => setSelectedDate(x.date)} selected={day?.date} />

            <section aria-live="polite" aria-label="Selected day" className="surface overflow-hidden">
              {!day ? <Skeleton className="m-6 h-80" /> : (
                <AnimatePresence mode="wait">
                  <motion.div key={day.date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <WeatherScene scene={sceneForDay(day)} seed={d!.location.name} landmarks={d!.location.name.includes("Dhaka")}
                      compact className="h-52" scrim={0.8}>
                      <div className="scene-text flex h-full items-end justify-between gap-4 p-6">
                        <div>
                          <p className="text-sm font-semibold text-white/80">{fmtLongDate(day.date)}</p>
                          <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
                            <WeatherIcon condition={day.condition} size={36} />{day.condition_label}
                          </p>
                        </div>
                        <p className="num text-4xl font-light tracking-[-0.04em]">
                          {fmtTemp(day.temp_max)}<span className="text-2xl text-white/70"> / {fmtTemp(day.temp_min)}</span>
                        </p>
                      </div>
                    </WeatherScene>
                    <div className="p-6">
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Fact icon={<Umbrella size={18} />} label="Rain chance" value={fmtPct(day.precipitation_probability_max)} />
                        <Fact icon={<Droplets size={18} />} label="Rain total" value={day.precipitation_sum != null ? `${day.precipitation_sum} mm` : "—"} />
                        <Fact icon={<Wind size={18} />} label="Max wind" value={fmtWind(day.wind_speed_max)} />
                        <Fact icon={<Sun size={18} />} label="UV max" value={day.uv_index_max != null ? `${Math.round(day.uv_index_max)} · ${uvInfo(day.uv_index_max)}` : "—"} />
                        <Fact icon={<Sunrise size={18} />} label="Sunrise" value={day.sunrise ? fmtClock(day.sunrise) : "—"} />
                        <Fact icon={<Sunset size={18} />} label="Sunset" value={day.sunset ? fmtClock(day.sunset) : "—"} />
                      </dl>
                      {dayHours.length > 0 && (
                        <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="Every three hours">
                          {dayHours.map((h) => (
                            <li key={h.time} className="flex flex-col items-center gap-1 rounded-2xl py-2 text-center">
                              <span className="num text-xs font-semibold text-ink-mute">{fmtHour(h.time)}</span>
                              <WeatherIcon condition={h.condition} isDay={h.is_day} size={28} />
                              <span className="num text-sm font-bold text-ink">{fmtTemp(h.temperature)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {dayHours.length === 0 && (
                        <p className="mt-5 text-sm text-ink-mute">Hour-by-hour detail is available for the next 48 hours.</p>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </section>
          </div>

          <DailyStory story={d?.story ?? null} mood={d?.mood ?? null} city={d?.location.name ?? place.name} loading={forecast.loading && !d} />
        </div>
      )}
    </PageFrame>
  );
}
