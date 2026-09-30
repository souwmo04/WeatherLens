import { motion } from "motion/react";
import { Droplets, Eye, Gauge, Sparkles, Sun, Volume2, VolumeX, Wind } from "lucide-react";
import { useApp } from "@/state/AppState";
import type { ForecastBundle, Scene } from "@/types/weather";
import type { ApiError } from "@/services/http";
import { WeatherScene } from "./scene/WeatherScene";
import { AnimatedNumber, Skeleton } from "./ui/primitives";
import { ErrorState } from "./ui/States";
import { WeatherIcon } from "./ui/WeatherIcon";
import { aqiInfo, uvInfo } from "@/utils/weatherHelpers";
import { compassPoint, fmtClock, fmtLongDate, fmtTemp } from "@/utils/formatters";

interface Props {
  data: ForecastBundle | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

const HEIGHT = "h-[max(620px,min(92vh,820px))] sm:h-[max(640px,min(88vh,820px))]";

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-[8.2rem] shrink-0 items-center gap-3 px-4 py-3 sm:min-w-0 sm:flex-1">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</p>
        <p className="num truncate text-[0.98rem] font-bold text-white">
          {value}{sub && <span className="ml-1 text-xs font-medium text-white/70">{sub}</span>}
        </p>
      </div>
    </div>
  );
}

export function WeatherHero({ data, loading, error, onRetry }: Props) {
  const { sound, setSound } = useApp();
  const scene: Scene = data?.current.scene ?? "cloudy";
  const c = data?.current;
  const today = data?.daily[0];
  const intensity = c ? Math.min(1, (c.precipitation ?? 0) / 1.5 + (c.condition === "heavy_rain" ? 0.4 : 0.3)) : 0.5;
  const isDhaka = data?.location.name.toLowerCase().includes("dhaka") ?? true;
  const aqi = aqiInfo(data?.air_quality?.us_aqi);

  return (
    <section aria-labelledby="hero-location" className="relative">
      <WeatherScene scene={scene} seed={data?.location.name ?? "Dhaka"} landmarks={isDhaka}
        wind={c?.wind_speed} intensity={intensity} cloudCover={c?.cloud_cover}
        className={`${HEIGHT} w-full lg:rounded-b-[2.75rem]`}
        label={c ? `Illustration: ${c.condition_label.toLowerCase()} over ${data!.location.name}` : undefined}>
        <div className="mx-auto flex h-full max-w-[1320px] flex-col px-5 pb-6 pt-24 sm:px-8 sm:pb-8 sm:pt-32">
          {error && !data ? (
            <div className="m-auto w-full max-w-md rounded-[2rem] bg-elev/95 p-2 text-ink shadow-[var(--shadow-lift)]">
              <ErrorState error={error} onRetry={onRetry} />
            </div>
          ) : (
            <>
              <div className="scene-text flex-1">
                {loading && !data ? (
                  <div className="space-y-4" aria-busy="true" aria-label="Loading current weather">
                    <Skeleton className="h-8 w-40 !bg-white/20" />
                    <Skeleton className="h-36 w-64 !bg-white/15" />
                    <Skeleton className="h-6 w-56 !bg-white/15" />
                  </div>
                ) : data && c ? (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                    <h1 id="hero-location" className="text-[1.65rem] font-bold tracking-[-0.02em] sm:text-3xl">
                      {data.location.name}
                    </h1>
                    <p className="mt-1 text-sm font-medium text-white/80 sm:text-[0.95rem]">
                      {[data.location.country, `${fmtLongDate(c.time)} · ${fmtClock(c.time)}`].filter(Boolean).join(" · ")}
                    </p>

                    <div className="mt-5 flex items-start">
                      <AnimatedNumber value={c.temperature}
                        className="num text-[clamp(6.5rem,19vw,11.5rem)] font-extralight leading-[0.82] tracking-[-0.07em]" />
                      <span className="mt-2 text-[clamp(3rem,7vw,5rem)] font-extralight leading-none">°</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                        <WeatherIcon condition={c.condition} isDay={c.is_day} size={30} />
                        {c.condition_label}
                      </span>
                      <span className="num text-[0.98rem] text-white/85">Feels like {fmtTemp(c.feels_like)}</span>
                      {today && <span className="num text-[0.98rem] text-white/85">H {fmtTemp(today.temp_max)} · L {fmtTemp(today.temp_min)}</span>}
                    </div>

                    <p className="glass-on-scene mt-6 flex w-fit max-w-xl items-start gap-2.5 rounded-[1.4rem] px-4 py-3 text-[0.98rem] font-medium leading-snug sm:text-[1.05rem]">
                      <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
                      <span><span className="sr-only">WeatherLens summary: </span>{data.insight.headline}</span>
                    </p>
                  </motion.div>
                ) : null}
              </div>

              {data && c && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
                    <span className="glass-on-scene rounded-full px-3 py-1.5">
                      Mood · {data.mood.label}
                      <span className="sr-only">: {data.mood.description}</span>
                    </span>
                    <span className="glass-on-scene rounded-full px-3 py-1.5">
                      {data.source === "demo" ? "Demo data" : "Live · Open-Meteo"}
                    </span>
                    {(scene === "rain" || scene === "storm") && (
                      <button onClick={() => setSound(!sound)} aria-pressed={sound}
                        className="glass-on-scene flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/25">
                        {sound ? <Volume2 size={13} aria-hidden="true" /> : <VolumeX size={13} aria-hidden="true" />}
                        Rain sound {sound ? "on" : "off"}
                      </button>
                    )}
                  </div>
                  <dl className="glass-on-scene no-scrollbar -mx-1 flex overflow-x-auto rounded-[1.6rem] sm:mx-0 sm:divide-x sm:divide-white/15">
                    <Stat icon={<Droplets size={17} />} label="Humidity" value={c.humidity != null ? `${Math.round(c.humidity)}%` : "—"} />
                    <Stat icon={<Wind size={17} />} label="Wind" value={c.wind_speed != null ? `${Math.round(c.wind_speed)} km/h` : "—"} sub={compassPoint(c.wind_direction)} />
                    <Stat icon={<Sun size={17} />} label="UV" value={c.uv_index != null ? `${Math.round(c.uv_index)}` : "—"} sub={uvInfo(c.uv_index)} />
                    <Stat icon={<Eye size={17} />} label="Visibility" value={c.visibility_km != null ? `${c.visibility_km >= 10 ? Math.round(c.visibility_km) : c.visibility_km} km` : "—"} />
                    <Stat icon={<Gauge size={17} />} label="Air quality" value={data.air_quality?.us_aqi != null ? `${Math.round(data.air_quality.us_aqi)}` : "N/A"} sub={aqi?.label} />
                  </dl>
                </div>
              )}
            </>
          )}
        </div>
      </WeatherScene>
    </section>
  );
}
