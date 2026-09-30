import { memo, useEffect, useRef } from "react";
import { useInView } from "@/hooks/useMotionPref";
import type { ParticleMode } from "./sceneConfig";

interface Props {
  mode: ParticleMode;
  /** km/h — slants rain and pushes snow */
  wind?: number;
  /** 0..1 */
  intensity?: number;
  animate: boolean;
  compact?: boolean;
}

interface P { x: number; y: number; vx: number; vy: number; len: number; a: number; r: number; phase: number }
interface Splash { x: number; y: number; t: number }

/** One canvas for all precipitation/ambient particles. Pauses off-screen and when the tab is hidden. */
export const Particles = memo(function Particles({ mode, wind = 10, intensity = 0.6, animate, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const areaScale = Math.min(1.4, (w * h) / (1280 * 720));
    const base = { rain: 260, storm: 520, snow: 140, dust: 42, fireflies: 22 }[mode];
    const count = Math.round(base * (0.4 + intensity * 0.8) * Math.max(0.35, areaScale) * (compact ? 0.45 : 1));
    const slant = Math.max(-0.5, Math.min(0.5, (wind / 60) * (mode === "storm" ? 1.4 : 1)));
    const ground = h * 0.88;

    const spawn = (initial: boolean): P => {
      const y = initial ? Math.random() * h : -20 - Math.random() * 40;
      switch (mode) {
        case "rain":
        case "storm": {
          const speed = (mode === "storm" ? 15 : 11) + Math.random() * 5;
          return { x: Math.random() * (w + 200) - 100, y, vx: speed * slant, vy: speed, len: 10 + Math.random() * 14,
            a: 0.18 + Math.random() * 0.35, r: 1, phase: 0 };
        }
        case "snow":
          return { x: Math.random() * w, y, vx: slant * 1.5, vy: 0.5 + Math.random() * 1.1, len: 0,
            a: 0.5 + Math.random() * 0.5, r: 1.2 + Math.random() * 2.2, phase: Math.random() * 6.28 };
        case "fireflies":
          return { x: Math.random() * w, y: h * (0.45 + Math.random() * 0.45), vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.2, len: 0, a: 0, r: 1.2 + Math.random() * 1.4, phase: Math.random() * 6.28 };
        default: // dust motes in sunlight
          return { x: Math.random() * w, y: initial ? Math.random() * h * 0.8 : h * 0.8, vx: 0.1 + Math.random() * 0.25,
            vy: -0.05 - Math.random() * 0.15, len: 0, a: 0, r: 0.8 + Math.random() * 1.6, phase: Math.random() * 6.28 };
      }
    };
    const ps: P[] = Array.from({ length: count }, () => spawn(true));
    const splashes: Splash[] = [];

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) draw(p, 0);
    };

    const draw = (p: P, t: number) => {
      if (mode === "rain" || mode === "storm") {
        ctx.strokeStyle = `rgba(210,225,255,${p.a})`;
        ctx.lineWidth = mode === "storm" ? 1.3 : 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * (p.len / p.vy), p.y - p.len);
        ctx.stroke();
      } else if (mode === "snow") {
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else {
        const flicker = 0.5 + 0.5 * Math.sin(t / 900 + p.phase);
        const color = mode === "fireflies" ? "255,221,140" : "255,244,214";
        const alpha = (mode === "fireflies" ? 0.85 : 0.5) * flicker;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${color},${alpha})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      }
    };

    if (!animate || !inView) { drawStatic(); return () => ro.disconnect(); }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(2.5, (now - last) / 16.67));
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]!;
        if (mode === "snow") {
          p.phase += 0.02 * dt;
          p.x += (p.vx + Math.sin(p.phase) * 0.4) * dt;
          p.y += p.vy * dt;
        } else if (mode === "fireflies" || mode === "dust") {
          p.phase += 0.01 * dt;
          p.x += (p.vx + Math.sin(p.phase * 1.3) * 0.15) * dt;
          p.y += (p.vy + Math.cos(p.phase) * 0.12) * dt;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y > ground && Math.random() < 0.35) {
            if (splashes.length < 80) splashes.push({ x: p.x, y: ground + Math.random() * (h - ground), t: 0 });
            ps[i] = spawn(false);
            continue;
          }
        }
        if (p.y > h + 20 || p.x < -120 || p.x > w + 120 || p.y < -60) ps[i] = spawn(false);
        draw(p, now);
      }
      // rain splashes on the wet street
      ctx.strokeStyle = "rgba(210,225,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]!;
        s.t += dt;
        const r = Math.max(0.1, s.t * 0.9);
        ctx.globalAlpha = Math.max(0, 1 - s.t / 14);
        ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 1.8, r * 0.5, 0, 0, 6.283); ctx.stroke();
        if (s.t > 14) splashes.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible") { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [mode, wind, intensity, animate, inView, compact]);

  if (mode === "none") return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
});

/** Occasional lightning: a sky flash plus a brief bolt. */
export const Lightning = memo(function Lightning({ animate }: { animate: boolean }) {
  const flashRef = useRef<HTMLDivElement>(null);
  const boltRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!animate) return;
    let timer: ReturnType<typeof setTimeout>;
    const strike = () => {
      const flash = flashRef.current, bolt = boltRef.current;
      if (flash && bolt) {
        bolt.style.left = `${15 + Math.random() * 65}%`;
        flash.animate([{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0.1 }, { opacity: 0.4 }, { opacity: 0 }],
          { duration: 700, easing: "ease-out" });
        bolt.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 0.9 }, { opacity: 0 }],
          { duration: 520, easing: "ease-out" });
      }
      timer = setTimeout(strike, 4500 + Math.random() * 6000);
    };
    timer = setTimeout(strike, 1800);
    return () => clearTimeout(timer);
  }, [animate]);
  return (
    <>
      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[#dfe6ff] opacity-0 mix-blend-screen" aria-hidden="true" />
      <svg ref={boltRef} viewBox="0 0 60 200" className="pointer-events-none absolute top-[14%] h-[40%] opacity-0" aria-hidden="true"
        style={{ filter: "drop-shadow(0 0 10px rgb(200 210 255 / 0.9))" }}>
        <path d="M34 0L18 78h14L10 200l38-120H32L46 0z" fill="#f4f6ff" />
      </svg>
    </>
  );
});
