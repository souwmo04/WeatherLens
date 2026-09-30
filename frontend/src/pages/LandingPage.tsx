import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, CloudRain, Route, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { ThemeToggle } from "@/layout/Navbar";
import { useAsync } from "@/hooks/useAsync";
import { useReducedMotionPref } from "@/hooks/useMotionPref";
import { getForecast } from "@/services/weatherApi";
import { DEFAULT_PREFS, DHAKA } from "@/state/AppState";
import type { Scene } from "@/types/weather";
import { SCENE_LABEL } from "@/utils/weatherHelpers";
import { fmtTemp } from "@/utils/formatters";

const CYCLE: Scene[] = ["sunny", "rain", "sunset", "night", "storm", "cloudy"];
const CYCLE_MS = 6_500;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function useCycle(paused: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % CYCLE.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [paused]);
  return [i, setI] as const;
}

const FEATURES = [
  { icon: CloudRain, title: "Rain prediction", body: "Minute-level nowcasts show when rain arrives — and which direction it's coming from.", tint: "#4b8bff" },
  { icon: Route, title: "Route weather", body: "See conditions at every stop on your journey, timed to when you'll actually be there.", tint: "#6a55e0" },
  { icon: Sparkles, title: "AI recommendations", body: "Ask anything about your day. Answers are grounded strictly in real forecast data.", tint: "#e8900c" },
  { icon: BookOpen, title: "Daily weather story", body: "Your whole day, told in thirty seconds — morning, afternoon, evening, night.", tint: "#e0603f" },
];

export default function LandingPage() {
  const reduced = useReducedMotionPref();
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useCycle(hover || reduced);
  const scene = CYCLE[idx]!;
  const live = useAsync("landing-dhaka", () => getForecast(DHAKA, null, DEFAULT_PREFS));
  const d = live.data;

  useEffect(() => { document.documentElement.style.removeProperty("--accent"); }, []);

  return (
    <div className="min-h-dvh bg-bg">
      {/* ── Hero ── */}
      <WeatherScene scene={scene} seed="Dhaka" landmarks intensity={0.7} wind={scene === "storm" ? 40 : 14}
        className="h-[100svh] min-h-[640px] w-full" scrim={0.75}
        label={`Animated illustration of Dhaka in ${SCENE_LABEL[scene].toLowerCase()} weather`}>
        <div className="mx-auto flex h-full max-w-[1320px] flex-col px-5 sm:px-8">
          <header className="flex h-20 items-center justify-between pt-3">
            <Logo onScene />
            <nav aria-label="Landing" className="flex items-center gap-1.5">
              <ThemeToggle onScene />
              <Link to="/app" className="glass-on-scene inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold hover:bg-white/25">
                Open app
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 flex-col justify-center pb-16">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="scene-text max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] backdrop-blur-md">
                <Sparkles size={13} aria-hidden="true" /> AI weather companion
              </p>
              <h1 className="text-[clamp(3.2rem,9vw,7.2rem)] font-extrabold leading-[0.92] tracking-[-0.05em]">
                Weather,<br />understood.
              </h1>
              <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/85 sm:text-xl">
                WeatherLens turns raw weather data into decisions you can actually use.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/app" className="inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 text-base font-bold text-[#0c1530] shadow-[0_10px_40px_-10px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-0.5">
                  Explore Weather <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link to="/app/assistant" className="glass-on-scene inline-flex h-13 items-center gap-2 rounded-full px-7 text-base font-bold transition-colors hover:bg-white/25">
                  <Sparkles size={17} aria-hidden="true" /> Ask WeatherLens
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col-reverse items-start justify-between gap-4 pb-8 sm:flex-row sm:items-end">
            <div role="group" aria-label="Preview weather worlds" className="flex flex-wrap gap-1.5"
              onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
              {CYCLE.map((s, i) => (
                <button key={s} onClick={() => setIdx(i)} aria-pressed={i === idx}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${i === idx ? "bg-white text-[#0c1530]" : "bg-white/12 text-white/85 hover:bg-white/22"}`}>
                  {SCENE_LABEL[s]}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {d && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-on-scene flex max-w-sm items-center gap-4 rounded-[1.4rem] px-4 py-3">
                  <WeatherIcon condition={d.current.condition} isDay={d.current.is_day} size={44} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Live in Dhaka</p>
                    <p className="num text-lg font-bold">{fmtTemp(d.current.temperature)} · {d.current.condition_label}</p>
                    <p className="line-clamp-2 text-sm text-white/80">{d.insight.headline}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </WeatherScene>

      <main>
        {/* ── Know before you go ── */}
        <section aria-labelledby="know" className="mx-auto max-w-[1320px] px-5 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} className="max-w-2xl">
            <h2 id="know" className="text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-6xl">Know before you go.</h2>
            <p className="mt-4 text-lg text-ink-soft">Numbers give precision. WeatherLens gives meaning — so you know what to carry, what to wear and when to leave.</p>
          </motion.div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.07 }} className="bg-elev p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${f.tint}1c`, color: f.tint }}>
                  <f.icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Built around your day ── */}
        <section aria-labelledby="built" className="border-y border-line bg-elev">
          <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <h2 id="built" className="text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-6xl">Built around your day.</h2>
              <p className="mt-4 max-w-lg text-lg text-ink-soft">
                Tell WeatherLens where you go and what you love doing. It checks the forecast at exactly those times — your commute, your class, your evening ride.
              </p>
              <Link to="/app/settings" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-bg hover:opacity-90">
                Personalize <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div {...fadeUp} className="surface p-7 sm:p-8">
              <p className="flex items-center gap-2 text-sm font-bold text-ink"><User size={16} className="text-accent" aria-hidden="true" />For your day in Dhaka</p>
              <ul className="mt-5 space-y-4">
                {(d?.insight.personal.length ? d.insight.personal : [
                  "Cycling conditions are poor today because rain probability reaches 78% around 5 PM.",
                  "Heading to North South University at 3 PM: dry, 31°, 20% rain chance.",
                  "Coming back at 8 PM: rain likely (64%).",
                ]).map((line) => (
                  <li key={line} className="flex gap-3 text-[1.05rem] leading-snug text-ink">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />{line}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-ink-mute">{d ? "Live, from today's Dhaka forecast with sample preferences." : "Example output."}</p>
            </motion.div>
          </div>
        </section>

        {/* ── Not just a forecast ── */}
        <section aria-labelledby="notjust" className="mx-auto max-w-[1320px] px-5 py-24 sm:px-8 sm:py-32">
          <motion.h2 {...fadeUp} id="notjust" className="text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-6xl">Not just a forecast.</motion.h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <motion.figure {...fadeUp} className="rounded-[2rem] border border-dashed border-line-strong p-8">
              <figcaption className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-mute">A typical weather app</figcaption>
              <dl className="mt-8 grid grid-cols-3 gap-4 font-mono text-ink-soft">
                <div><dt className="text-xs">Temp</dt><dd className="num text-3xl">{d ? Math.round(d.current.temperature) : 29}°C</dd></div>
                <div><dt className="text-xs">Humidity</dt><dd className="num text-3xl">{d?.current.humidity != null ? Math.round(d.current.humidity) : 72}%</dd></div>
                <div><dt className="text-xs">Wind</dt><dd className="num text-3xl">{d?.current.wind_speed != null ? Math.round(d.current.wind_speed) : 12}<span className="text-base"> km/h</span></dd></div>
              </dl>
              <p className="mt-8 text-sm text-ink-mute">Accurate. But what does it mean for you?</p>
            </motion.figure>
            <motion.figure {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
              <WeatherScene scene={d?.current.scene ?? "sunny"} seed="Dhaka" landmarks compact scrim={0.9} className="h-full min-h-[300px]">
                <div className="scene-text flex h-full flex-col justify-end gap-2 p-8">
                  <figcaption className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">WeatherLens</figcaption>
                  <p className="num text-6xl font-light tracking-[-0.05em]">{d ? fmtTemp(d.current.temperature) : "29°"}</p>
                  <p className="text-lg font-semibold">Feels like {d ? fmtTemp(d.current.feels_like) : "33°"}</p>
                  <p className="glass-on-scene mt-3 flex max-w-lg items-start gap-2 rounded-2xl px-4 py-3 text-[1.05rem] font-medium">
                    <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
                    {d ? (d.insight.take[0]?.reason ? `${d.insight.take[0].label}: ${d.insight.take[0].reason}.` : d.insight.headline)
                      : "Take an umbrella if you're returning after 5 PM."}
                  </p>
                </div>
              </WeatherScene>
            </motion.figure>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="mx-auto max-w-[1320px] px-5 pb-24 sm:px-8">
          <motion.div {...fadeUp} className="overflow-hidden rounded-[2.5rem]">
            <WeatherScene scene="sunset" seed="Dhaka" landmarks compact scrim={0.8} className="h-[380px]">
              <div className="scene-text flex h-full flex-col items-start justify-center gap-6 px-8 sm:px-14">
                <h2 className="max-w-xl text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">What is the weather doing — and what should you do?</h2>
                <Link to="/app" className="inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 font-bold text-[#0c1530] hover:-translate-y-0.5">
                  Explore Weather <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </WeatherScene>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-8 text-sm text-ink-mute sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>Weather data by <a className="underline hover:text-ink" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · Maps © OpenStreetMap contributors, CARTO</p>
        </div>
      </footer>
    </div>
  );
}
