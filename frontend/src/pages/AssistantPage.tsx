import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Database, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { useForecast } from "@/hooks/useWeather";
import { askWeatherLens, getAiStatus } from "@/services/aiApi";
import type { ApiError } from "@/services/http";
import { useApp, useActivePlace } from "@/state/AppState";
import type { AdviceResponse, ChatTurn } from "@/types/weather";
import { fmtTemp } from "@/utils/formatters";

const SUGGESTIONS = [
  "Should I carry an umbrella today?",
  "Can I go cycling at 5 PM?",
  "What should I wear tomorrow?",
  "Will rain affect my commute?",
  "Is today good for outdoor photography?",
  "I'm going to university at 3 PM and returning at 8 PM. What should I prepare for?",
];

interface Message extends ChatTurn {
  id: number;
  meta?: Pick<AdviceResponse, "engine" | "data_points" | "source">;
  error?: boolean;
}

function Dots() {
  return (
    <span className="inline-flex gap-1" aria-label="WeatherLens is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-2 w-2 rounded-full bg-ink-mute"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  );
}

export default function AssistantPage() {
  const [params, setParams] = useSearchParams();
  const { scenario, prefs, personalize } = useApp();
  const place = useActivePlace();
  const forecast = useForecast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<"claude" | "rules" | null>(null);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => { getAiStatus().then((s) => setEngine(s.engine)).catch(() => setEngine(null)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);
  // A new place or demo world is a new conversation — old answers were grounded on different data.
  const contextKey = `${place.latitude},${place.longitude},${scenario ?? ""}`;
  const lastContext = useRef(contextKey);
  useEffect(() => {
    if (lastContext.current === contextKey) return;
    lastContext.current = contextKey;
    setMessages([]);
  }, [contextKey]);

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history: ChatTurn[] = messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { id: ++idRef.current, role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await askWeatherLens({ question, place, scenario, history, preferences: personalize ? prefs : null });
      setEngine(res.engine);
      setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", content: res.answer,
        meta: { engine: res.engine, data_points: res.data_points, source: res.source } }]);
    } catch (e) {
      const err = e as ApiError;
      setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", error: true,
        content: err.code === "network" ? "I can't reach WeatherLens right now. Check your connection and try again."
          : "I couldn't get weather data to ground an answer, so I won't guess. Please try again in a moment." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [busy, messages, place, scenario, prefs, personalize]);

  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      setParams({}, { replace: true });
      void send(q);
    }
  }, [params, setParams, send]);

  const d = forecast.data;
  const empty = messages.length === 0;

  return (
    <div className="mx-auto grid max-w-[1320px] gap-6 px-4 pb-36 pt-24 sm:px-6 lg:grid-cols-[1fr_20rem] lg:gap-8 lg:pb-16 lg:pt-28">
      <section aria-labelledby="ask-title" className="surface flex min-h-[calc(100dvh-10rem)] flex-col overflow-hidden lg:min-h-[calc(100dvh-9rem)]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div>
              <h1 id="ask-title" className="text-lg font-bold tracking-[-0.02em] text-ink">Ask WeatherLens</h1>
              <p className="text-xs text-ink-mute">Answers use only {d?.source === "demo" ? "demo" : "live"} forecast data for {place.name}.</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
              <RotateCcw size={14} aria-hidden="true" /> New chat
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6" role="log" aria-live="polite" aria-relevant="additions">
          {empty ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-6 text-center sm:pt-12">
              <span className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-accent-soft text-accent"><Sparkles size={28} aria-hidden="true" /></span>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">What are you planning today?</h2>
              <p className="mt-2 max-w-md text-ink-soft">Ask about umbrellas, outfits, commutes, workouts or photos. I'll check the forecast for the exact times you mention.</p>
              <ul className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button onClick={() => send(s)}
                      className="h-full w-full rounded-2xl border border-line bg-elev px-4 py-3 text-left text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-soft)]">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="mx-auto flex max-w-3xl flex-col gap-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.li key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                    {m.role === "user" ? (
                      <p className="max-w-[85%] rounded-[1.4rem] rounded-br-md bg-ink px-4 py-3 text-[0.97rem] leading-relaxed text-bg">
                        <span className="sr-only">You: </span>{m.content}
                      </p>
                    ) : (
                      <>
                        <LogoMark size={30} className="mt-1 shrink-0" />
                        <div className="min-w-0 max-w-[88%]">
                          <p className={`whitespace-pre-line rounded-[1.4rem] rounded-tl-md px-4 py-3 text-[0.97rem] leading-relaxed ${m.error ? "border border-poor/30 bg-poor/8 text-ink" : "bg-sunken text-ink"}`}>
                            <span className="sr-only">WeatherLens: </span>{m.content}
                          </p>
                          {m.meta && (
                            <details className="group mt-2 text-xs text-ink-mute">
                              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-ink">
                                <ShieldCheck size={13} aria-hidden="true" />
                                Grounded in {m.meta.source === "demo" ? "demo" : "Open-Meteo"} data · {m.meta.engine === "claude" ? "Claude" : "rule engine"}
                              </summary>
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {m.meta.data_points.map((p) => (
                                  <li key={p} className="flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1"><Database size={11} aria-hidden="true" />{p}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
              {busy && (
                <li className="flex items-center gap-3"><LogoMark size={30} /><span className="rounded-[1.4rem] bg-sunken px-4 py-3.5"><Dots /></span></li>
              )}
            </ol>
          )}
          <div ref={endRef} />
        </div>

        <form className="border-t border-line p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
          <div className="flex items-end gap-2 rounded-[1.4rem] border border-line bg-bg p-2 transition-shadow focus-within:border-transparent focus-within:ring-2 focus-within:ring-[var(--focus)]">
            <label htmlFor="ask-input" className="sr-only">Ask about the weather</label>
            <textarea id="ask-input" ref={inputRef} value={input} rows={1} maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder="Can I go for a run at 6 PM?"
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 focus-visible:outline-none text-[0.97rem] text-ink outline-none placeholder:text-ink-mute" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send question"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-bg transition-all disabled:opacity-30 enabled:hover:scale-105">
              <ArrowUp size={19} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 px-2 text-center text-[0.7rem] text-ink-mute">
            WeatherLens never invents weather. If data isn't available, it says so. Not for safety-critical decisions — follow official warnings.
          </p>
        </form>
      </section>

      <aside className="hidden flex-col gap-4 lg:flex" aria-label="Weather context">
        <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-soft)]">
          <WeatherScene scene={d?.current.scene ?? "cloudy"} seed={place.name} landmarks={place.name.includes("Dhaka")} compact
            cloudCover={d?.current.cloud_cover} className="h-56" scrim={0.8}>
            <div className="scene-text flex h-full flex-col justify-end p-5">
              <p className="text-sm font-semibold text-white/80">{place.name}</p>
              {d && (
                <p className="flex items-center gap-2 text-3xl font-light">
                  <span className="num">{fmtTemp(d.current.temperature)}</span>
                  <WeatherIcon condition={d.current.condition} isDay={d.current.is_day} size={32} />
                </p>
              )}
              {d && <p className="text-sm text-white/85">{d.current.condition_label} · feels {fmtTemp(d.current.feels_like)}</p>}
            </div>
          </WeatherScene>
        </div>
        <div className="surface p-5 text-sm">
          <h2 className="font-bold text-ink">How answers work</h2>
          <ul className="mt-3 space-y-2.5 text-ink-soft">
            <li className="flex gap-2"><Database size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />The backend fetches the forecast, rain nowcast and air quality, then normalizes them.</li>
            <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />Only that structured data is given to the AI. It's instructed never to invent numbers.</li>
            <li className="flex gap-2"><Sparkles size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              Engine: <strong className="text-ink">{engine === "claude" ? "Claude" : engine === "rules" ? "Grounded rule engine" : "—"}</strong>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
