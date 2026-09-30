import { memo, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Scene } from "@/types/weather";
import { useReducedMotionPref } from "@/hooks/useMotionPref";
import { SCENES } from "./sceneConfig";
import { Skyline } from "./Skyline";
import { Celestial, Characters, CloudLayer, Stars } from "./SkyLayers";
import { Lightning, Particles } from "./Particles";

interface Props {
  scene: Scene;
  /** city name — seeds the generated skyline/cloud layout */
  seed?: string;
  /** draw Dhaka's landmarks */
  landmarks?: boolean;
  wind?: number | null;
  /** 0..1 precipitation intensity */
  intensity?: number;
  /** 0..100 cloud cover — thickens clouds and veils the sun/moon */
  cloudCover?: number | null;
  /** small cards: fewer particles, no characters, no parallax */
  compact?: boolean;
  interactive?: boolean;
  className?: string;
  /** scrim strength behind overlaid text: 0 none … 1 strong */
  scrim?: number;
  children?: ReactNode;
  label?: string;
}

/** Skyline height: proportional to the scene, but capped by width so phones and tall cards don't over-zoom it. */
const SKYLINE_H = "min(48cqh, max(34cqw, 30cqh))";

function adjustForClouds(scene: Scene, cover: number | null | undefined) {
  const base = SCENES[scene];
  if (cover == null || !["night", "sunny", "sunset"].includes(scene)) return base;
  if (cover >= 80) {
    return {
      ...base,
      celestial: scene === "night" ? "none" as const : "hidden-sun" as const,
      stars: false,
      cloud: { ...base.cloud, count: 9, opacity: Math.max(base.cloud.opacity, 0.85), scale: 1.2 },
    };
  }
  if (cover >= 50) return { ...base, cloud: { ...base.cloud, count: Math.max(base.cloud.count, 6) } };
  return base;
}

const SceneArt = memo(function SceneArt({ scene, seed, landmarks, wind, intensity, compact, animate, cloudCover }: {
  scene: Scene; seed: string; landmarks: boolean; wind: number; intensity: number; compact: boolean; animate: boolean;
  cloudCover?: number | null;
}) {
  const s = adjustForClouds(scene, cloudCover);
  const skyGradient = `linear-gradient(180deg, ${s.sky.map((c, i) => `${c} ${Math.round((i / (s.sky.length - 1)) * 78)}%`).join(", ")})`;

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: skyGradient }} />
      <div className="absolute inset-x-0 bottom-[10%] h-[55%]" style={{ background: `radial-gradient(120% 70% at 70% 100%, ${s.haze}, transparent 70%)` }} />
      {s.stars && <Stars seed={seed} animate={animate} />}
      <Celestial kind={s.celestial} />
      <CloudLayer style={s} seed={seed} animate={animate} compact={compact} />

      {/* distant atmospheric fog band behind the city */}
      {s.fog > 0 && (
        <div className="absolute inset-x-[-10%] bottom-[18%] h-[26%]" style={{
          background: `linear-gradient(180deg, transparent, rgb(225 230 238 / ${s.fog * 0.55}), transparent)`,
          filter: "blur(10px)",
          animation: animate ? "fog-drift 30s ease-in-out infinite alternate" : undefined,
        }} />
      )}

      {/* skyline */}
      <div className="absolute inset-x-0 bottom-[12%]" style={{ height: SKYLINE_H, transform: "translate3d(calc(var(--px, 0) * 5px), 0, 0)" }}>
        <Skyline style={s} seed={seed} landmarks={landmarks} />
      </div>

      {/* street / river with reflections */}
      <div className="absolute inset-x-0 bottom-0 h-[12.2%] overflow-hidden" style={{ background: `linear-gradient(180deg, ${s.ground[0]}, ${s.ground[1]})` }}>
        <div className="absolute inset-x-0 top-0" style={{
          height: SKYLINE_H,
          opacity: s.reflect,
          maskImage: "linear-gradient(180deg, #000 0%, transparent 28%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 28%)",
          filter: "blur(1.5px)",
          transform: "translate3d(calc(var(--px, 0) * 5px), 0, 0)",
        }}>
          <Skyline style={s} seed={seed} landmarks={landmarks} reflection showFar={false} />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
      </div>

      {!compact && <Characters style={s} animate={animate} />}
      <Particles mode={s.particles} wind={wind} intensity={intensity} animate={animate} compact={compact} />
      {scene === "storm" && <Lightning animate={animate} />}

      {/* foreground fog */}
      {s.fog > 0.4 && (
        <div className="pointer-events-none absolute inset-0" style={{
          background: `linear-gradient(180deg, transparent 30%, rgb(230 233 238 / ${s.fog * 0.6}) 75%, rgb(230 233 238 / ${s.fog * 0.3}))`,
        }} />
      )}
    </div>
  );
});

export const WeatherScene = memo(function WeatherScene({
  scene, seed = "Dhaka", landmarks = false, wind, intensity = 0.6, cloudCover, compact = false, interactive = true,
  className = "", scrim = 0.6, children, label,
}: Props) {
  const reduced = useReducedMotionPref();
  const animate = !reduced;
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!interactive || reduced || compact || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  }, [interactive, reduced, compact]);

  return (
    <div ref={ref} onPointerMove={onMove} className={`relative isolate overflow-hidden ${className}`} style={{ containerType: "size" }}
      role={label ? "img" : undefined} aria-label={label}>
      <AnimatePresence initial={false}>
        <motion.div key={`${scene}-${(cloudCover ?? 0) >= 80 ? "o" : (cloudCover ?? 0) >= 50 ? "p" : "c"}`} className="absolute inset-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}>
          <SceneArt scene={scene} seed={seed} landmarks={landmarks} wind={wind ?? 10} intensity={intensity}
            compact={compact} animate={animate} cloudCover={cloudCover} />
        </motion.div>
      </AnimatePresence>
      {scrim > 0 && (
        <div className="pointer-events-none absolute inset-0" style={{
          background: `linear-gradient(100deg, rgb(6 12 32 / ${0.42 * scrim}) 0%, rgb(6 12 32 / ${0.12 * scrim}) 45%, transparent 70%),
                       linear-gradient(0deg, rgb(6 12 32 / ${0.5 * scrim}) 0%, transparent 34%)`,
        }} />
      )}
      {children && <div className="on-scene relative z-10 h-full">{children}</div>}
    </div>
  );
});
