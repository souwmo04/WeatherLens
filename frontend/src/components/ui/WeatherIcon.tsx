import { memo, useId } from "react";
import type { Condition } from "@/types/weather";
import { iconFor, type IconKind } from "@/utils/weatherHelpers";

interface Props {
  condition?: Condition;
  kind?: IconKind;
  isDay?: boolean;
  size?: number;
  className?: string;
  /** Accessible label; omit when a visible text label sits next to the icon. */
  label?: string;
}

/** Illustrated, softly shaded weather glyphs (cartoon-cinematic, not childish). */
export const WeatherIcon = memo(function WeatherIcon({ condition, kind, isDay = true, size = 32, className, label }: Props) {
  const k = kind ?? (condition ? iconFor(condition, isDay) : "cloud");
  const id = useId().replace(/:/g, "");
  const sunG = `sun-${id}`, cloudG = `cloud-${id}`, darkG = `dark-${id}`, moonG = `moon-${id}`;

  const sun = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.55} fill="#ffcc4d" opacity="0.22" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${sunG})`} />
    </g>
  );
  const moon = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.5} fill="#c9d6ff" opacity="0.18" />
      <path d={`M${cx + r * 0.2} ${cy - r} a${r} ${r} 0 1 0 ${r * 0.8} ${r * 1.55} a${r * 0.78} ${r * 0.78} 0 0 1 -${r * 0.8} -${r * 1.55}z`}
        fill={`url(#${moonG})`} />
    </g>
  );
  const cloud = (dx = 0, dy = 0, s = 1, dark = false) => (
    <path transform={`translate(${dx} ${dy}) scale(${s})`}
      d="M14 44h30a10 10 0 0 0 1.5-19.9A13 13 0 0 0 20.3 22 9.5 9.5 0 0 0 14 44z"
      fill={`url(#${dark ? darkG : cloudG})`} />
  );
  const drops = (n: number, heavy = false) => (
    <g stroke="#4b8bff" strokeWidth={heavy ? 3.2 : 2.6} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const x = 20 + i * (n === 2 ? 12 : 8.5);
        return <line key={i} x1={x} y1={50} x2={x - 3} y2={heavy ? 59 : 56} />;
      })}
    </g>
  );

  let body: React.ReactNode;
  switch (k) {
    case "sun": body = sun(32, 32, 13); break;
    case "moon": body = moon(30, 32, 14); break;
    case "sun-cloud": body = <>{sun(40, 22, 10)}{cloud(-2, 4, 1)}</>; break;
    case "moon-cloud": body = <>{moon(40, 20, 10)}{cloud(-2, 4, 1)}</>; break;
    case "cloud": body = <>{cloud(8, -8, 0.8, true)}{cloud(0, 2, 1)}</>; break;
    case "fog": body = <>{cloud(0, -6, 1)}<g stroke="#9aa6bf" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="46" x2="44" y2="46" /><line x1="20" y1="53" x2="52" y2="53" /></g></>; break;
    case "drizzle": body = <>{cloud(0, -4, 1)}{drops(2)}</>; break;
    case "rain": body = <>{cloud(0, -4, 1, true)}{drops(3)}</>; break;
    case "heavy-rain": body = <>{cloud(0, -4, 1, true)}{drops(4, true)}</>; break;
    case "snow": body = <>{cloud(0, -4, 1)}<g fill="#9fd3ff">{[20, 32, 44].map((x, i) => <circle key={x} cx={x} cy={52 + (i % 2) * 5} r="2.6" />)}</g></>; break;
    case "storm": body = <>{cloud(0, -6, 1, true)}<path d="M33 40l-7 12h6l-4 10 11-14h-6l4-8z" fill="#ffc93c" stroke="#e6a100" strokeWidth="1" strokeLinejoin="round" /></>; break;
  }

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id={sunG} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff2b0" /><stop offset="0.55" stopColor="#ffc93c" /><stop offset="1" stopColor="#ff9f1c" />
        </radialGradient>
        <linearGradient id={cloudG} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d5e1f5" />
        </linearGradient>
        <linearGradient id={darkG} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c4d9" /><stop offset="1" stopColor="#7d8aa6" />
        </linearGradient>
        <linearGradient id={moonG} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdfbe8" /><stop offset="1" stopColor="#d9dcf5" />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
});
