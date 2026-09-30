import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Droplets, Eye, Gauge, Radio, Sun, Sunrise, Thermometer, Wind, Leaf } from "lucide-react";
import type { AirQuality, CurrentWeather, DailyPoint, PressureTrend } from "@/types/weather";
import { Skeleton } from "./ui/primitives";
import { compassPoint, fmtClock } from "@/utils/formatters";
import { aqiInfo, uvInfo } from "@/utils/weatherHelpers";

/* ───────────────────── phrases ───────────────────── */

function humidityPhrase(now: number | null, yesterday: number | null): string {
  if (now == null) return "Unavailable";
  if (yesterday == null) return now >= 80 ? "Very humid right now" : now >= 60 ? "Humid right now" : now >= 30 ? "Comfortable" : "Dry air";
  const d = now - yesterday;
  if (Math.abs(d) <= 5) return "Similar to yesterday";
  return d > 0 ? "Higher than yesterday" : "Lower than yesterday";
}

function windPhrase(kmh: number | null): string {
  if (kmh == null) return "Unavailable";
  if (kmh < 2) return "It's calm";
  if (kmh < 12) return "Light breeze";
  if (kmh < 29) return "Moderate breeze";
  if (kmh < 50) return "Strong wind";
  return "Gale-force wind";
}

function dewPhrase(dp: number | null): string {
  if (dp == null) return "Unavailable";
  if (dp < 10) return "The air is dry";
  if (dp < 16) return "Comfortable";
  if (dp < 20) return "Slightly humid";
  if (dp < 24) return "It is humid";
  return "It is very humid";
}

const TREND_PHRASE: Record<PressureTrend, string> = {
  falling_fast: "Currently plummeting",
  falling: "Slowly falling",
  steady: "Holding steady",
  rising: "Slowly rising",
  rising_fast: "Rising quickly",
};

function visibilityPhrase(km: number | null, condition: string): string {
  if (km == null) return "Unavailable";
  const word = km < 1 ? "Very poor" : km < 2 ? "Poor" : km < 5 ? "Moderate" : km < 10 ? "Good" : "Excellent";
  const why = condition === "Haze" || condition === "Mist" || condition === "Smoke" || condition === "Dust" || condition === "Foggy"
    ? ` · ${condition.toLowerCase()}` : "";
  return `${word} right now${why}`;
}

/* ───────────────────── visuals ───────────────────── */

function GradientBar({ fraction, colors, knob }: { fraction: number | null; colors: string; knob?: string }) {
  const f = Math.max(0, Math.min(1, fraction ?? 0));
  return (
    <div className="relative mt-3 h-3 rounded-full" style={{ background: colors }} aria-hidden="true">
      {fraction != null && (
        <span className="absolute top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-elev bg-[#39c16c] text-[0.62rem] font-bold text-white shadow"
          style={{ left: `${Math.max(6, Math.min(94, f * 100))}%` }}>{knob}</span>
      )}
    </div>
  );
}

function FillBar({ fraction }: { fraction: number | null }) {
  const f = Math.max(0, Math.min(1, fraction ?? 0));
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-[#8fd3ff] to-[#5fb6f5]"
        initial={{ width: 0 }} animate={{ width: `${f * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
    </div>
  );
}

function Compass({ dir, speed }: { dir: number | null; speed: number | null }) {
  const calm = speed == null || speed < 2;
  // Meteorological direction is where wind comes FROM; the arrow shows where it's going.
  const to = ((dir ?? 0) + 180) % 360;
  const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5);
  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28 sm:h-32 sm:w-32" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line-strong)" strokeWidth="11" />
      {ticks.map((a) => (
        <line key={a} x1="60" y1="12" x2="60" y2={a % 45 === 0 ? 17 : 15} stroke="var(--ink-mute)" strokeOpacity="0.5"
          strokeWidth="1" transform={`rotate(${a} 60 60)`} />
      ))}
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([l, a]) => {
        const r = ((a as number) * Math.PI) / 180;
        return <text key={l} x={60 + Math.sin(r) * 50} y={60 - Math.cos(r) * 50 + 3.5} textAnchor="middle"
          className={`text-[9px] font-extrabold ${l === "N" ? "fill-[#e5484d]" : "fill-ink-soft"}`}>{l}</text>;
      })}
      {!calm && dir != null && (
        <g transform={`rotate(${to} 60 60)`}>
          <path d="M60 22 L66 34 L60 31 L54 34 Z" fill="var(--ink)" />
        </g>
      )}
      <text x="60" y="57" textAnchor="middle" className="num fill-ink text-[17px] font-bold">{speed == null ? "—" : Math.round(speed)}</text>
      <text x="60" y="73" textAnchor="middle" className="fill-ink-soft text-[11px] font-semibold">km/h</text>
    </svg>
  );
}

function PressureGauge({ hpa }: { hpa: number | null }) {
  const min = 970, max = 1050;
  const f = hpa == null ? 0.5 : Math.max(0, Math.min(1, (hpa - min) / (max - min)));
  const start = 135, sweep = 270;
  const angle = start + f * sweep;
  const arc = (a0: number, a1: number, r: number) => {
    const p = (a: number) => [60 + r * Math.cos((a * Math.PI) / 180), 60 + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <svg viewBox="0 0 120 110" className="mx-auto h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
      <path d={arc(start, start + sweep, 48)} fill="none" stroke="var(--line-strong)" strokeWidth="11" strokeLinecap="round" />
      {Array.from({ length: 41 }, (_, i) => start + (i / 40) * sweep).map((a) => (
        <line key={a} x1={60 + 41 * Math.cos((a * Math.PI) / 180)} y1={60 + 41 * Math.sin((a * Math.PI) / 180)}
          x2={60 + 37 * Math.cos((a * Math.PI) / 180)} y2={60 + 37 * Math.sin((a * Math.PI) / 180)}
          stroke="var(--ink-mute)" strokeOpacity="0.5" strokeWidth="1" />
      ))}
      <line x1={60 + 42 * Math.cos((angle * Math.PI) / 180)} y1={60 + 42 * Math.sin((angle * Math.PI) / 180)}
        x2={60 + 54 * Math.cos((angle * Math.PI) / 180)} y2={60 + 54 * Math.sin((angle * Math.PI) / 180)}
        stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      <text x="60" y="58" textAnchor="middle" className="num fill-ink text-[15px] font-bold">{hpa == null ? "—" : hpa.toFixed(hpa % 1 ? 1 : 0)}</text>
      <text x="60" y="74" textAnchor="middle" className="fill-ink-soft text-[11px] font-semibold">hPa</text>
    </svg>
  );
}

const asWall = (iso: string) => new Date(`${iso}:00Z`).getTime();

function SunArc({ now, day }: { now: string; day: DailyPoint | undefined }) {
  if (!day?.sunrise || !day.sunset) return null;
  const t = asWall(now), rise = asWall(day.sunrise), set = asWall(day.sunset);
  const f = Math.max(0, Math.min(1, (t - rise) / (set - rise)));
  const up = t >= rise && t <= set;
  const x = 10 + f * 100, y = 50 - Math.sin(f * Math.PI) * 38;
  return (
    <svg viewBox="0 0 120 60" className="mt-2 h-16 w-full" aria-hidden="true">
      <path d="M10 50 Q60 -26 110 50" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="3 4" />
      {up && <path d={`M10 50 Q60 -26 110 50`} fill="none" stroke="#ffb547" strokeWidth="2.5" strokeDasharray={`${f * 150} 200`} />}
      <line x1="2" y1="50" x2="118" y2="50" stroke="var(--line-strong)" />
      <circle cx={up ? x : 10} cy={up ? y : 50} r="6" fill={up ? "#ffb547" : "var(--ink-mute)"} opacity={up ? 1 : 0.5} />
    </svg>
  );
}

/* ───────────────────── tile ───────────────────── */

function Tile({ icon, label, phrase, value, children, delay = 0 }: {
  icon: ReactNode; label: string; phrase: string; value?: ReactNode; children?: ReactNode; delay?: number;
}) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="surface flex min-h-[13.5rem] flex-col !rounded-[1.6rem] p-4 sm:min-h-[15rem] sm:p-5">
      <h3 className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink-soft">
        <span className="text-ink" aria-hidden="true">{icon}</span>{label}
      </h3>
      <p className="mt-1.5 text-[0.95rem] font-semibold leading-snug text-ink">{phrase}</p>
      <div className="mt-auto pt-3">
        {value != null && <p className="num text-[2rem] font-bold leading-none tracking-[-0.03em] text-ink">{value}</p>}
        {children}
      </div>
    </motion.article>
  );
}

/* ───────────────────── grid ───────────────────── */

export function WeatherDetails({ current, today, air, loading }: {
  current: CurrentWeather | null; today: DailyPoint | undefined; air: AirQuality | null; loading: boolean;
}) {
  if (loading || !current) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Loading weather details">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-56 !rounded-[1.6rem]" />)}
      </div>
    );
  }
  const c = current;
  const uv = c.uv_index;
  const aqi = air?.us_aqi ?? null;
  const aqiI = aqiInfo(aqi);
  const t = asWall(c.time);
  const riseT = today?.sunrise ? asWall(today.sunrise) : null;
  const setT = today?.sunset ? asWall(today.sunset) : null;
  const sunPhrase = riseT && setT
    ? t < riseT ? `Sunrise at ${fmtClock(today!.sunrise!)}`
      : t < setT ? `Sunset in ${Math.max(1, Math.round((setT - t) / 3_600_000))} h`
        : "The sun has set"
    : "Unavailable";

  return (
    <section aria-labelledby="details-title">
      <h2 id="details-title" className="sr-only">Current conditions in detail</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile icon={<Sun size={16} />} label="UV index" delay={0}
          phrase={!c.is_day ? "No sun right now" : `${uvInfo(uv)} right now`} value={!c.is_day ? "None" : uv == null ? "—" : uvInfo(uv)}>
          <GradientBar fraction={uv == null ? null : uv / 11} knob={uv == null ? "" : String(Math.round(uv))}
            colors="linear-gradient(90deg,#39c16c,#f2d43d 30%,#f28c28 55%,#e53935 75%,#8e44ad)" />
        </Tile>

        <Tile icon={<Droplets size={16} />} label="Humidity" delay={0.04}
          phrase={humidityPhrase(c.humidity, c.humidity_yesterday)} value={c.humidity == null ? "—" : `${Math.round(c.humidity)}%`}>
          <FillBar fraction={c.humidity == null ? null : c.humidity / 100} />
        </Tile>

        <Tile icon={<Wind size={16} />} label="Wind" delay={0.08}
          phrase={`${windPhrase(c.wind_speed)}${c.wind_speed && c.wind_speed >= 2 && c.wind_direction != null ? ` from the ${compassPoint(c.wind_direction)}` : ""}`}>
          <Compass dir={c.wind_direction} speed={c.wind_speed} />
          {c.wind_gusts != null && c.wind_gusts > (c.wind_speed ?? 0) + 5 && (
            <p className="num text-center text-xs font-semibold text-ink-mute">Gusts {Math.round(c.wind_gusts)} km/h</p>
          )}
        </Tile>

        <Tile icon={<Thermometer size={16} />} label="Dew point" delay={0.12}
          phrase={dewPhrase(c.dew_point)} value={c.dew_point == null ? "—" : `${Math.round(c.dew_point)}°`} />

        <Tile icon={<Gauge size={16} />} label="Pressure" delay={0.16}
          phrase={c.pressure_trend ? TREND_PHRASE[c.pressure_trend] : "Unavailable"}>
          <PressureGauge hpa={c.pressure} />
        </Tile>

        <Tile icon={<Eye size={16} />} label="Visibility" delay={0.2}
          phrase={visibilityPhrase(c.visibility_km, c.condition_label)}
          value={c.visibility_km == null ? "—" : `${c.visibility_km >= 10 ? Math.round(c.visibility_km) : c.visibility_km.toFixed(2)} km`} />

        <Tile icon={<Leaf size={16} />} label="Air quality" delay={0.24}
          phrase={aqiI ? aqiI.label : "Unavailable here"} value={aqi == null ? "—" : Math.round(aqi)}>
          <GradientBar fraction={aqi == null ? null : aqi / 300} knob=""
            colors="linear-gradient(90deg,#39c16c,#f2d43d 17%,#f28c28 33%,#e53935 50%,#8e44ad 67%,#7e0023)" />
        </Tile>

        <Tile icon={<Sunrise size={16} />} label="Sunrise & sunset" delay={0.28} phrase={sunPhrase}>
          <SunArc now={c.time} day={today} />
          {today?.sunrise && today.sunset && (
            <p className="num flex justify-between text-xs font-semibold text-ink-soft">
              <span>{fmtClock(today.sunrise)}</span><span>{fmtClock(today.sunset)}</span>
            </p>
          )}
        </Tile>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-mute">
        <Radio size={13} aria-hidden="true" />
        {c.observation
          ? `Measured at ${c.observation.name ?? c.observation.station} (${c.observation.station}), ${c.observation.distance_km} km away · ${c.observation.age_min} min ago. Forecast by Open-Meteo.`
          : "From the Open-Meteo forecast model — no weather station close enough for live measurements."}
      </p>
    </section>
  );
}
