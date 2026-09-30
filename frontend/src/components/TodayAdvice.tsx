import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp, Car, Check, CloudRain, Droplet, Footprints, Glasses, Layers, Shirt, Sparkles, Sun, TreePine, Umbrella, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Insight } from "@/types/weather";
import { Skeleton } from "./ui/primitives";

const ICONS: Record<string, LucideIcon> = {
  umbrella: Umbrella, "cloud-rain": CloudRain, droplet: Droplet, sun: Sun, glasses: Glasses, wind: Wind,
  shirt: Shirt, footprints: Footprints, layers: Layers, check: Check,
};

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true"><Icon size={17} /></span>
      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-mute">{label}</h3>
        <div className="mt-1 text-[0.97rem] leading-snug text-ink">{children}</div>
      </div>
    </div>
  );
}

/** "What today means for you" — compact: carry, wear, travel, outdoors, personal. */
export function TodayAdvice({ insight, loading }: { insight: Insight | null; loading: boolean }) {
  return (
    <section aria-labelledby="advice-title" className="surface h-full p-5 sm:p-6">
      <h2 id="advice-title" className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-ink">
        <Sparkles size={18} className="text-accent" aria-hidden="true" /> What today means for you
      </h2>
      {loading || !insight ? (
        <div className="mt-4 space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="mt-1 divide-y divide-line">
          <Row icon={Umbrella} label="Take with you">
            <ul className="mt-0.5 flex flex-wrap gap-1.5">
              {insight.take.map((r) => {
                const Icon = ICONS[r.icon] ?? Check;
                return (
                  <li key={r.label} title={r.reason ?? undefined}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-sm font-semibold">
                    <Icon size={14} aria-hidden="true" />{r.label}
                    {r.reason && <span className="sr-only">: {r.reason}</span>}
                  </li>
                );
              })}
            </ul>
            {insight.take[0]?.reason && <p className="mt-1.5 text-sm text-ink-mute">{insight.take[0].reason}.</p>}
          </Row>
          <Row icon={Shirt} label="Wear">{insight.wear.map((w) => w.label).join(" · ")}</Row>
          <Row icon={Car} label="Travel">{insight.travel}</Row>
          <Row icon={TreePine} label="Outdoors">{insight.outdoor}</Row>
          {insight.personal.length > 0 && (
            <Row icon={Footprints} label="Your plans">
              <ul className="space-y-1">{insight.personal.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>
            </Row>
          )}
        </div>
      )}
    </section>
  );
}

const SUGGESTIONS = ["Do I need an umbrella?", "What should I wear?", "Can I go cycling at 5 PM?", "Is it safe to travel?"];

/** Inline question box — sends straight to the assistant. */
export function AskBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const go = (text: string) => { if (text.trim()) navigate(`/assistant?q=${encodeURIComponent(text.trim())}`); };
  return (
    <section aria-labelledby="ask-box-title" className="surface flex h-full flex-col p-5 sm:p-6">
      <h2 id="ask-box-title" className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-ink">
        <Sparkles size={18} className="text-accent" aria-hidden="true" /> Ask WeatherLens
      </h2>
      <p className="mt-1 text-sm text-ink-mute">Answers use only the forecast data above.</p>
      <form className="mt-4 flex items-center gap-2 rounded-full border border-line bg-bg p-1.5 pl-4 focus-within:ring-2 focus-within:ring-[var(--focus)]"
        onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <label htmlFor="askbox" className="sr-only">Ask a question about the weather</label>
        <input id="askbox" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Can I go for a run at 6 PM?"
          className="min-w-0 flex-1 bg-transparent text-[0.97rem] text-ink outline-none placeholder:text-ink-mute focus-visible:outline-none" />
        <button type="submit" disabled={!q.trim()} aria-label="Ask"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-bg disabled:opacity-30">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button onClick={() => go(s)} className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink">
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
