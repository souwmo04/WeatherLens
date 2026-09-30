import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { DailyStory as Story, Mood } from "@/types/weather";
import { WeatherScene } from "./scene/WeatherScene";
import { WeatherIcon } from "./ui/WeatherIcon";
import { Skeleton } from "./ui/primitives";
import { fmtPct, fmtTemp } from "@/utils/formatters";
import { useReducedMotionPref } from "@/hooks/useMotionPref";

const SEGMENT_MS = 7_500; // 4 × 7.5 s = "Today in 30 seconds"

const MOOD_ICON: Record<Mood["key"], string> = {
  energetic: "☀️", cozy: "🌧️", calm: "☁️", dramatic: "⛈️", peaceful: "🌙", golden: "🌇", crisp: "❄️", hazy: "🌫️",
};

export function DailyStory({ story, mood, city, loading }: { story: Story | null; mood: Mood | null; city: string; loading: boolean }) {
  const reduced = useReducedMotionPref();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = useRef(0);
  const segs = story?.segments ?? [];

  useEffect(() => { setIndex(0); setProgress(0); setPlaying(false); }, [story]);

  useEffect(() => {
    if (!playing || !segs.length) return;
    let raf = 0;
    started.current = performance.now() - progress * SEGMENT_MS;
    const tick = (now: number) => {
      const p = (now - started.current) / SEGMENT_MS;
      if (p >= 1) {
        if (index >= segs.length - 1) { setProgress(1); setPlaying(false); return; }
        setIndex((i) => i + 1); setProgress(0); started.current = now;
      } else setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // progress intentionally excluded: it's read once when (re)starting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, segs.length]);

  const seg = segs[index];
  const finished = !playing && index === segs.length - 1 && progress >= 1;
  const toggle = () => {
    if (finished) { setIndex(0); setProgress(0); setPlaying(true); return; }
    setPlaying((p) => !p);
  };
  const jump = (i: number) => { setIndex(i); setProgress(0); };

  return (
    <section aria-labelledby="story-title" className="surface flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-7">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Daily weather story</p>
          <h2 id="story-title" className="text-xl font-bold tracking-[-0.02em] text-ink">{story?.label ?? "Today"} in 30 seconds</h2>
        </div>
        {segs.length > 0 && (
          <button onClick={toggle} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-bg transition-transform active:scale-95"
            aria-label={finished ? "Replay story" : playing ? "Pause story" : "Play story"}>
            {finished ? <RotateCcw size={15} aria-hidden="true" /> : playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            {finished ? "Replay" : playing ? "Pause" : "Play"}
          </button>
        )}
      </div>

      {loading || !story || !seg ? (
        <div className="px-6 pb-6 sm:px-7"><Skeleton className="h-56 w-full !rounded-[1.4rem]" /><Skeleton className="mt-4 h-6 w-3/4" /></div>
      ) : (
        <>
          <div className="px-4 sm:px-5">
            <WeatherScene scene={seg.scene} seed={city} landmarks={city.toLowerCase().includes("dhaka")} compact
              intensity={Math.min(1, (seg.rain_chance ?? 0) / 100 + 0.2)} scrim={0.7} className="h-60 rounded-[1.4rem] sm:h-64"
              label={`${seg.period}: ${seg.word.toLowerCase()}, around ${fmtTemp(seg.temperature)}`}>
              <div className="flex h-full flex-col justify-between p-4 sm:p-5">
                <div className="flex gap-1.5" aria-hidden="true">
                  {segs.map((s, i) => (
                    <div key={s.period} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                      <div className="h-full rounded-full bg-white"
                        style={{ width: `${i < index ? 100 : i === index ? (playing || progress ? progress * 100 : reduced ? 100 : 0) : 0}%` }} />
                    </div>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={seg.period} className="scene-text"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }}>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/80">{seg.period}</p>
                    <p className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
                      <WeatherIcon condition={seg.condition} isDay={seg.period !== "Night"} size={40} />{seg.word}
                    </p>
                    <p className="num mt-1 text-sm font-medium text-white/85">
                      Around {fmtTemp(seg.temperature)} · {fmtPct(seg.rain_chance)} chance of rain
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </WeatherScene>
          </div>

          <div role="tablist" aria-label="Parts of the day" className="grid grid-cols-4 gap-1 px-4 pt-3 sm:px-5">
            {segs.map((s, i) => (
              <button key={s.period} role="tab" aria-selected={i === index} onClick={() => jump(i)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-xs font-semibold transition-colors ${i === index ? "bg-accent-soft text-accent" : "text-ink-mute hover:bg-sunken hover:text-ink"}`}>
                <WeatherIcon condition={s.condition} isDay={s.period !== "Night"} size={26} />
                <span>{s.period}</span>
                <span className="text-[0.68rem] font-medium opacity-80">{s.word}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto px-6 pb-6 pt-4 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Your day in one sentence</p>
            <p className="mt-1.5 text-[1.3rem] font-semibold leading-snug tracking-[-0.015em] text-ink">“{story.sentence}”</p>
            {mood && (
              <p className="mt-4 flex items-center gap-2.5 text-sm text-ink-soft">
                <span className="text-lg" aria-hidden="true">{MOOD_ICON[mood.key]}</span>
                <span><span className="font-semibold text-ink">Today's mood: {mood.label}.</span> {mood.description}</span>
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
