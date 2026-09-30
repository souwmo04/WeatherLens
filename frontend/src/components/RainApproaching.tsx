import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Compass, CloudRain, Navigation } from "lucide-react";
import type { RainNowcast } from "@/types/weather";
import type { ApiError } from "@/services/http";
import { AnimatedNumber, Pill, Skeleton } from "./ui/primitives";
import { ErrorState } from "./ui/States";
import { fmtClock } from "@/utils/formatters";
import { seeded } from "@/utils/weatherHelpers";

const SIZE = 300, C = 150, R = 128, RANGE_KM = 30;

function polar(bearing: number, km: number): [number, number] {
  const r = (Math.min(km, RANGE_KM) / RANGE_KM) * R;
  const a = (bearing * Math.PI) / 180;
  return [C + Math.sin(a) * r, C - Math.cos(a) * r];
}

interface Blob { x: number; y: number; r: number; o: number; tx: number; ty: number }

function MiniRadar({ data }: { data: RainNowcast }) {
  const reduced = useReducedMotion();
  const streets = useMemo(() => {
    const rnd = seeded("radar-streets");
    return Array.from({ length: 14 }, () => {
      const vertical = rnd() > 0.5;
      const p = 20 + rnd() * 260;
      return vertical ? `M${p} 0 L${p + (rnd() - 0.5) * 60} ${SIZE}` : `M0 ${p} L${SIZE} ${p + (rnd() - 0.5) * 60}`;
    });
  }, []);

  const blobs: Blob[] = useMemo(() => {
    const rnd = seeded(`${data.status}-${data.approach_from_bearing}`);
    const list: Blob[] = [];
    const bearing = data.approach_from_bearing ?? 225;
    if (data.status === "approaching") {
      // place the rain band upstream at a distance consistent with the arrival time (~25 km/h cells)
      const km = Math.max(8, Math.min(26, ((data.minutes_until ?? 30) / 60) * 25 + 6));
      for (let i = 0; i < 7; i++) {
        const [x, y] = polar(bearing + (rnd() - 0.5) * 50, km + (rnd() - 0.5) * 10);
        list.push({ x, y, r: 16 + rnd() * 20, o: 0.35 + rnd() * 0.4, tx: (C - x) * 0.28, ty: (C - y) * 0.28 });
      }
    } else if (data.status === "raining") {
      for (let i = 0; i < 6; i++) {
        const [x, y] = polar(bearing + (rnd() - 0.5) * 140, rnd() * 12);
        list.push({ x, y, r: 22 + rnd() * 22, o: 0.4 + rnd() * 0.35, tx: (rnd() - 0.5) * 16, ty: (rnd() - 0.5) * 16 });
      }
    }
    for (const cell of data.cells) {
      const [x, y] = polar(cell.bearing, cell.distance_km);
      list.push({ x, y, r: 14 + Math.min(24, cell.intensity * 14), o: Math.min(0.8, 0.3 + cell.intensity * 0.3), tx: (C - x) * 0.18, ty: (C - y) * 0.18 });
    }
    return list;
  }, [data]);

  const arrowFrom = data.status === "approaching" && data.approach_from_bearing != null
    ? polar(data.approach_from_bearing, 18) : null;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img"
      aria-label={data.status === "clear" ? "Radar: no rain nearby" : `Radar: rain ${data.approach_from ? `to the ${data.approach_from}` : "nearby"}, moving toward your location`}>
      <defs>
        <radialGradient id="rr-bg" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--bg-elev)" /><stop offset="1" stopColor="var(--surface-sunken)" />
        </radialGradient>
        <radialGradient id="rr-blob">
          <stop offset="0" stopColor="#3f7cff" stopOpacity="0.95" /><stop offset="0.55" stopColor="#5fa2ff" stopOpacity="0.55" /><stop offset="1" stopColor="#7fb6ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rr-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0.28" />
        </linearGradient>
        <clipPath id="rr-clip"><circle cx={C} cy={C} r={R + 6} /></clipPath>
      </defs>
      <circle cx={C} cy={C} r={R + 6} fill="url(#rr-bg)" stroke="var(--line)" />
      <g clipPath="url(#rr-clip)">
        <g stroke="var(--line-strong)" strokeWidth="1.2" fill="none" opacity="0.7">{streets.map((d) => <path key={d} d={d} />)}</g>
        <path d="M-10 210 C60 190 90 240 150 228 S250 180 320 200" stroke="#7fb6ff" strokeOpacity="0.35" strokeWidth="9" fill="none" strokeLinecap="round" />
        {blobs.map((b, i) => (
          <motion.circle key={i} cx={b.x} cy={b.y} r={b.r} fill="url(#rr-blob)" opacity={b.o}
            animate={reduced ? undefined : { x: [0, b.tx], y: [0, b.ty], opacity: [b.o * 0.6, b.o, b.o * 0.6] }}
            transition={{ duration: 6, repeat: Infinity, repeatType: "loop", ease: "linear", delay: i * 0.25 }} />
        ))}
        {[R / 3, (2 * R) / 3, R].map((r) => (
          <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="var(--ink-mute)" strokeOpacity="0.25" strokeDasharray="3 5" />
        ))}
        {!reduced && (
          <g style={{ transformOrigin: `${C}px ${C}px`, animation: "radar-sweep 5s linear infinite" }}>
            <path d={`M${C} ${C} L${C + R + 6} ${C} A${R + 6} ${R + 6} 0 0 0 ${C + (R + 6) * Math.cos(-0.7)} ${C + (R + 6) * Math.sin(-0.7)} Z`} fill="url(#rr-sweep)" />
          </g>
        )}
      </g>
      {arrowFrom && [0.25, 0.5, 0.75].map((f, i) => {
        const x = arrowFrom[0] + (C - arrowFrom[0]) * f, y = arrowFrom[1] + (C - arrowFrom[1]) * f;
        const angle = (data.approach_from_bearing! + 180) % 360;
        return (
          <motion.path key={f} d="M-7 -4 L0 3 L7 -4" transform={`translate(${x} ${y}) rotate(${angle + 180})`}
            fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            animate={reduced ? undefined : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }} />
        );
      })}
      <text x={C} y={C - R + 16} textAnchor="middle" className="fill-ink-mute text-[10px] font-bold">N</text>
      <text x={C + R / 3 + 4} y={C - 4} className="fill-ink-mute text-[9px] font-semibold">10 km</text>
      <text x={C + (2 * R) / 3 + 4} y={C - 4} className="fill-ink-mute text-[9px] font-semibold">20 km</text>
      <circle cx={C} cy={C} r="7" fill="var(--accent)" className={reduced ? undefined : "anim-ping"} style={{ transformOrigin: `${C}px ${C}px` }} />
      <circle cx={C} cy={C} r="6.5" fill="var(--accent)" stroke="var(--bg-elev)" strokeWidth="3" />
      <text x={C} y={C + 24} textAnchor="middle" className="fill-ink text-[11px] font-extrabold tracking-[0.12em]">YOU</text>
    </svg>
  );
}

export function RainApproaching({ data, loading, error, onRetry }: {
  data: RainNowcast | null; loading: boolean; error: ApiError | null; onRetry: () => void;
}) {
  const maxP = Math.max(0.6, ...(data?.timeline.map((t) => t.precipitation) ?? [0]));
  const headline = data?.status === "approaching" ? "Rain approaching" : data?.status === "raining" ? "Raining now" : "No rain nearby";
  const big = data?.status === "approaching" ? data.minutes_until : data?.status === "raining" ? data.minutes_remaining : null;

  return (
    <section aria-labelledby="rain-title" className="surface flex h-full flex-col overflow-hidden">
      <div className="grid flex-1 items-center gap-4 p-6 sm:grid-cols-[1fr_minmax(0,17rem)] sm:p-7 lg:grid-cols-1 xl:grid-cols-[1fr_minmax(0,18rem)]">
        <div className="flex flex-col">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            <CloudRain size={13} aria-hidden="true" /> Nowcast
          </p>
          <h2 id="rain-title" className="text-xl font-bold tracking-[-0.02em] text-ink">{loading && !data ? "Checking the skies…" : headline}</h2>
          {loading && !data ? (
            <div className="mt-4 space-y-3"><Skeleton className="h-14 w-32" /><Skeleton className="h-4 w-48" /></div>
          ) : error && !data ? (
            <ErrorState compact title="Radar unavailable" body="We couldn't load the rain nowcast right now." onRetry={onRetry} />
          ) : data ? (
            <>
              {big != null ? (
                <p className="mt-3 text-ink">
                  <span className="text-sm font-medium text-ink-soft">{data.status === "approaching" ? "Expected in about" : "Easing in about"}</span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <AnimatedNumber value={big} className="num text-6xl font-light tracking-[-0.05em]" />
                    <span className="text-xl font-semibold text-ink-soft">min</span>
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-[1.05rem] font-semibold text-ink">{data.message}</p>
              )}
              {big != null && <p className="mt-2 text-sm text-ink-soft">{data.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {data.intensity_label && <Pill tone="accent"><CloudRain size={12} aria-hidden="true" />{data.intensity_label}</Pill>}
                {data.approach_from && data.status !== "clear" && <Pill><Navigation size={12} aria-hidden="true" />From the {data.approach_from}</Pill>}
                {data.status === "clear" && data.approach_from && <Pill><Compass size={12} aria-hidden="true" />Wind from the {data.approach_from}</Pill>}
                {data.source === "demo" && <Pill>Demo data</Pill>}
              </div>
            </>
          ) : null}
        </div>
        <div className="mx-auto aspect-square w-full max-w-[18rem]">
          {data ? <MiniRadar data={data} /> : <Skeleton className="h-full w-full !rounded-full" />}
        </div>
      </div>

      {data && data.timeline.length > 0 && (
        <div className="border-t border-line px-6 pb-5 pt-4 sm:px-7">
          <p className="mb-2 text-xs font-semibold text-ink-mute">Precipitation, next {Math.round((data.timeline.length * 15) / 60)} hours</p>
          <div className="flex h-12 items-end gap-[3px]" role="img"
            aria-label={`Precipitation by 15 minutes: ${data.timeline.map((t) => `${fmtClock(t.time)} ${t.precipitation} millimetres`).join(", ")}`}>
            {data.timeline.map((t) => (
              <div key={t.time} className="flex-1 rounded-t-[4px] bg-[#4b8bff] transition-all duration-700"
                style={{ height: `${Math.max(6, (t.precipitation / maxP) * 100)}%`, opacity: t.precipitation > 0.05 ? 0.9 : 0.16 }} />
            ))}
          </div>
          <div className="num mt-1.5 flex justify-between text-[0.7rem] font-semibold text-ink-mute" aria-hidden="true">
            <span>Now</span>
            {data.timeline[4] && <span>{fmtClock(data.timeline[4].time)}</span>}
            {data.timeline[8] && <span>{fmtClock(data.timeline[8].time)}</span>}
            {data.timeline.at(-1) && <span>{fmtClock(data.timeline.at(-1)!.time)}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
