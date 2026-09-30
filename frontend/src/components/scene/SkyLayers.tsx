import { memo, useId, useMemo } from "react";
import { seeded } from "@/utils/weatherHelpers";
import type { SceneStyle } from "./sceneConfig";

/* ───────────── Cloud ─────────────
   A puffy, flat-bottomed cloud built from overlapping circles. One userSpace
   gradient shades the whole union (lit top, cool underside) and a faint
   darker underline gives it a hand-drawn storybook edge. */
const PUFFS: [number, number, number][][] = [
  [[40, 62, 26], [74, 44, 34], [112, 40, 30], [146, 58, 24], [168, 68, 16]],
  [[34, 64, 22], [64, 50, 28], [100, 34, 36], [140, 48, 28], [170, 64, 18]],
  [[46, 60, 24], [84, 46, 32], [122, 56, 26], [154, 66, 18]],
];

export const Cloud = memo(function Cloud({ variant, top, bottom, edge }: { variant: number; top: string; bottom: string; edge: string }) {
  const uid = useId().replace(/:/g, "");
  const puffs = PUFFS[variant % PUFFS.length]!;
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`c-${uid}`} x1="0" y1="10" x2="0" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0.1" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <g fill={`url(#c-${uid})`} style={{ transition: "fill 1.2s" }}>
        {puffs.map(([cx, cy, r]) => <circle key={`${cx}`} cx={cx} cy={cy} r={r} />)}
        <rect x="18" y="60" width="164" height="28" rx="14" />
      </g>
      <path d="M26 88 H176" stroke={edge} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});

export const CloudLayer = memo(function CloudLayer({ style, seed, animate, compact }: {
  style: SceneStyle; seed: string; animate: boolean; compact?: boolean;
}) {
  const clouds = useMemo(() => {
    const rnd = seeded(`${seed}-clouds`);
    return Array.from({ length: 12 }, (_, i) => ({
      i,
      depth: rnd(),                // 0 far … 1 near
      top: 2 + rnd() * 34,         // % from top
      left: rnd() * 100,           // % start position (static layout)
      variant: Math.floor(rnd() * 3),
      delay: -rnd() * 160,
    }));
  }, [seed]);
  const count = compact ? Math.min(style.cloud.count, 4) : style.cloud.count;
  const { top, bottom, edge, opacity, scale } = style.cloud;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {clouds.slice(0, count).map((c) => {
        const w = (14 + c.depth * 18) * scale; // % of scene width
        const duration = 220 - c.depth * 120;   // near clouds move faster
        return (
          <div key={c.i} className="absolute" style={{
            top: `${c.top}%`,
            left: animate ? 0 : `${c.left - w / 2}%`,
            width: `${w}%`,
            aspectRatio: "2 / 1",
            opacity: opacity * (0.7 + c.depth * 0.3),
            zIndex: Math.round(c.depth * 10),
            animation: animate ? `drift ${duration}s linear ${c.delay}s infinite` : undefined,
            transform: `translate3d(calc(var(--px, 0) * ${4 + c.depth * 14}px), calc(var(--py, 0) * ${2 + c.depth * 6}px), 0)`,
            filter: c.depth < 0.3 ? "blur(1.5px)" : undefined,
            transition: "opacity 1.2s ease",
          }}>
            <div className={animate ? "anim-cloud-bob" : undefined} style={{ animationDuration: `${7 + c.depth * 5}s`, height: "100%" }}>
              <Cloud variant={c.variant} top={top} bottom={bottom} edge={edge} />
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ───────────── Sun / Moon / Stars ───────────── */
export const Celestial = memo(function Celestial({ kind }: { kind: SceneStyle["celestial"] }) {
  if (kind === "none") return null;
  const pos = {
    sun: { right: "14%", top: "12%", size: "clamp(80px, 11vw, 150px)" },
    "low-sun": { right: "22%", top: "44%", size: "clamp(110px, 14vw, 200px)" },
    moon: { right: "16%", top: "13%", size: "clamp(64px, 8vw, 110px)" },
    "hidden-sun": { right: "18%", top: "10%", size: "clamp(80px, 10vw, 140px)" },
  }[kind];
  const t = "translate3d(calc(var(--px, 0) * -6px), calc(var(--py, 0) * -4px), 0)";

  if (kind === "moon") {
    return (
      <div className="pointer-events-none absolute" style={{ right: pos.right, top: pos.top, width: pos.size, height: pos.size, transform: t }} aria-hidden="true">
        <div className="absolute -inset-[70%] rounded-full" style={{ background: "radial-gradient(circle, rgb(170 190 255 / 0.28), transparent 62%)" }} />
        <svg viewBox="0 0 100 100" className="relative h-full w-full">
          <defs>
            <radialGradient id="moonfill" cx="0.35" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#fffdf0" /><stop offset="1" stopColor="#d7dbf2" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#moonfill)" />
          <circle cx="36" cy="40" r="7" fill="#c9cde6" opacity="0.55" />
          <circle cx="60" cy="62" r="10" fill="#c9cde6" opacity="0.45" />
          <circle cx="64" cy="32" r="4.5" fill="#c9cde6" opacity="0.5" />
        </svg>
      </div>
    );
  }

  const isLow = kind === "low-sun";
  const hidden = kind === "hidden-sun";
  return (
    <div className="pointer-events-none absolute" style={{ right: pos.right, top: pos.top, width: pos.size, height: pos.size, transform: t, opacity: hidden ? 0.35 : 1 }} aria-hidden="true">
      <div className="anim-glow absolute -inset-[90%] rounded-full" style={{
        background: isLow
          ? "radial-gradient(circle, rgb(255 190 110 / 0.75), rgb(255 140 90 / 0.25) 40%, transparent 68%)"
          : "radial-gradient(circle, rgb(255 236 170 / 0.8), rgb(255 220 140 / 0.25) 38%, transparent 66%)",
      }} />
      <div className="relative h-full w-full rounded-full" style={{
        background: isLow
          ? "radial-gradient(circle at 40% 38%, #fff3c9, #ffb45c 55%, #ff8a4c)"
          : "radial-gradient(circle at 40% 38%, #fffbe6, #ffd76a 55%, #ffb730)",
        boxShadow: isLow ? "0 0 80px 20px rgb(255 150 90 / 0.45)" : "0 0 90px 24px rgb(255 214 120 / 0.5)",
        filter: hidden ? "blur(6px)" : undefined,
      }} />
    </div>
  );
});

export const Stars = memo(function Stars({ seed, animate }: { seed: string; animate: boolean }) {
  const stars = useMemo(() => {
    const rnd = seeded(`${seed}-stars`);
    return Array.from({ length: 90 }, () => ({
      x: rnd() * 100, y: rnd() * 55, r: rnd() * 1.3 + 0.35, d: rnd() * 4, dur: 2.5 + rnd() * 4,
    }));
  }, [seed]);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"
      style={{ transform: "translate3d(calc(var(--px, 0) * -3px), calc(var(--py, 0) * -2px), 0)" }}>
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff"
          className={animate ? "anim-twinkle" : undefined}
          style={{ ["--delay" as string]: `${-s.d}s`, ["--dur" as string]: `${s.dur}s`, opacity: 0.7 }} />
      ))}
    </svg>
  );
});

/* ───────────── Characters ───────────── */
function Rickshaw({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 90 60" className="h-full w-full" aria-hidden="true">
      <g fill={color}>
        {/* canopy */}
        <path d="M44 14c6-10 26-10 32 0l2 20H42z" />
        <rect x="44" y="33" width="34" height="5" rx="2" />
        {/* seat + frame */}
        <path d="M18 40h60v4H18z" />
        <path d="M22 44l8-16h4l-8 16z" />
        {/* rider */}
        <circle cx="26" cy="14" r="4" />
        <path d="M24 19h5l3 12-4 1-2-7-3 10h-4z" />
      </g>
      {/* wheels */}
      <g fill="none" stroke={color} strokeWidth="2.5">
        <circle cx="66" cy="50" r="8" />
        <circle cx="16" cy="51" r="6" />
      </g>
      <path d="M44 14c6-10 26-10 32 0" fill="none" stroke="#e05a4f" strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

function Walker({ color, umbrella }: { color: string; umbrella: boolean }) {
  return (
    <svg viewBox="0 0 40 70" className="h-full w-full" aria-hidden="true">
      {umbrella && (
        <g>
          <path d="M2 22a18 14 0 0 1 36 0z" fill="#e0564a" />
          <path d="M2 22a18 14 0 0 1 36 0" fill="none" stroke="#9c2f26" strokeWidth="1" opacity="0.6" />
          <path d="M20 8v26" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      <g fill={color}>
        <circle cx="20" cy={umbrella ? 30 : 16} r="4.5" />
        <path d={umbrella ? "M16 36h8l2 16h-3l-1 16h-3l-1-12-1 12h-3l-1-16h-3z" : "M16 22h8l2 18h-3l-1 26h-3l-1-18-1 18h-3l-1-26h-3z"} />
      </g>
    </svg>
  );
}

function Birds({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 40" className="h-full w-full" aria-hidden="true">
      {[[10, 20, 1], [44, 10, 0.8], [80, 24, 0.9]].map(([x, y, s], i) => (
        <path key={i} d={`M${x} ${y}q${6 * s!} ${-6 * s!} ${12 * s!} 0q${6 * s!} ${-6 * s!} ${12 * s!} 0`}
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ animation: `flap ${0.9 + i * 0.15}s ease-in-out infinite`, transformOrigin: `${x! + 12 * s!}px ${y}px`, transformBox: "view-box" }} />
      ))}
    </svg>
  );
}

export const Characters = memo(function Characters({ style, animate }: { style: SceneStyle; animate: boolean }) {
  const c = style.near;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {style.characters.includes("rickshaw") && (
        <div className="absolute" style={{
          bottom: "11.5%", left: 0, width: "clamp(52px, 5.5vw, 84px)", aspectRatio: "3 / 2",
          animation: animate ? "walk-across 70s linear -22s infinite" : undefined,
          transform: animate ? undefined : "translateX(62vw)",
        }}>
          <div style={{ animation: animate ? "bob 0.6s ease-in-out infinite" : undefined, height: "100%" }}>
            <Rickshaw color={c} />
          </div>
        </div>
      )}
      {(style.characters.includes("walker-umbrella") || style.characters.includes("walker")) && (
        <div className="absolute" style={{
          bottom: "11.5%", left: 0, width: "clamp(22px, 2.2vw, 34px)", aspectRatio: "4 / 7",
          animation: animate ? "walk-across 95s linear -60s infinite reverse" : undefined,
          transform: animate ? undefined : "translateX(28vw)",
        }}>
          <div style={{ animation: animate ? "bob 0.55s ease-in-out infinite" : undefined, height: "100%" }}>
            <Walker color={c} umbrella={style.characters.includes("walker-umbrella")} />
          </div>
        </div>
      )}
      {style.characters.includes("birds") && (
        <div className="absolute" style={{
          top: "18%", left: 0, width: "clamp(60px, 7vw, 110px)", aspectRatio: "3 / 1", opacity: 0.55,
          animation: animate ? "walk-across 60s linear -10s infinite" : undefined,
          transform: animate ? undefined : "translateX(40vw)",
        }}>
          <Birds color={style.near} />
        </div>
      )}
    </div>
  );
});
