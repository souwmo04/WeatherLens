import { useState } from "react";
import { Check, Volume2, VolumeX } from "lucide-react";
import { PageFrame } from "@/layout/AppLayout";
import { useApp, DEFAULT_PREFS, type ThemePref } from "@/state/AppState";
import type { DemoScenario, Preferences } from "@/types/weather";
import { DEMO_SCENARIOS } from "@/utils/weatherHelpers";
import { Link } from "react-router-dom";

const ACTIVITIES = ["cycling", "running", "walking", "photography", "football", "picnic"];
const COMMUTES: { key: Preferences["commute_mode"]; label: string }[] = [
  { key: "walk", label: "Walk" }, { key: "bike", label: "Bike" }, { key: "rickshaw", label: "Rickshaw" },
  { key: "transit", label: "Bus / metro" }, { key: "car", label: "Car" },
];

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-mute">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const field = "h-12 w-full rounded-2xl border border-line bg-bg px-4 text-ink outline-none focus:border-line-strong";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={`h-10 rounded-full px-4 text-sm font-semibold transition-colors ${value === o.key ? "bg-ink text-bg" : "border border-line text-ink-soft hover:border-line-strong hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { prefs, setPrefs, personalize, setPersonalize, theme, setTheme, sound, setSound, scenario, setScenario } = useApp();
  const [draft, setDraft] = useState<Preferences>(prefs);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false); };
  const toggleActivity = (a: string) =>
    set("activities", draft.activities.includes(a) ? draft.activities.filter((x) => x !== a) : [...draft.activities, a].slice(0, 3));

  return (
    <PageFrame title="Your weather" subtitle="Tell WeatherLens about your routine. Everything stays in this browser.">
      <form className="surface p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); setPrefs(draft); setSaved(true); }}>
        <Section title="Personalized insights" description="Use your routine to tailor recommendations and the assistant's answers.">
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-sunken px-4 py-3">
            <span className="font-semibold text-ink">Personalize my forecast</span>
            <input type="checkbox" checked={personalize} onChange={(e) => setPersonalize(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
          </label>
        </Section>

        <Section title="Places" description="Used as defaults for route weather and commute advice.">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">Home
            <input className={field} value={draft.home} onChange={(e) => set("home", e.target.value)} placeholder="e.g. Uttara" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">Work or university
            <input className={field} value={draft.work} onChange={(e) => set("work", e.target.value)} placeholder="e.g. North South University" />
          </label>
        </Section>

        <Section title="Commute" description="We check the forecast at exactly these times.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">Usually leave at
              <input type="time" className={`${field} num`} value={draft.departure_time} onChange={(e) => set("departure_time", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">Usually return at
              <input type="time" className={`${field} num`} value={draft.return_time} onChange={(e) => set("return_time", e.target.value)} />
            </label>
          </div>
          <Segmented label="Commute mode" value={draft.commute_mode} options={COMMUTES} onChange={(v) => set("commute_mode", v)} />
        </Section>

        <Section title="Favourite activities" description="Pick up to three. We'll rate conditions for them each day.">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Activities">
            {ACTIVITIES.map((a) => {
              const on = draft.activities.includes(a);
              return (
                <button key={a} type="button" aria-pressed={on} onClick={() => toggleActivity(a)}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold capitalize transition-colors ${on ? "bg-accent-soft text-accent" : "border border-line text-ink-soft hover:text-ink"}`}>
                  {on && <Check size={14} aria-hidden="true" />}{a}
                </button>
              );
            })}
          </div>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-semibold text-ink-soft">Preferred time
            <input type="time" className={`${field} num`} value={draft.activity_time} onChange={(e) => set("activity_time", e.target.value)} />
          </label>
        </Section>

        <Section title="Appearance & sound" description="Night mode transforms the whole environment.">
          <Segmented<ThemePref> label="Theme" value={theme} onChange={setTheme}
            options={[{ key: "system", label: "System" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }]} />
          <button type="button" onClick={() => setSound(!sound)} aria-pressed={sound}
            className="flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-line-strong">
            {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            Rain ambience {sound ? "on" : "off"}
          </button>
          <p className="text-xs text-ink-mute">A soft, generated rain sound plays only while it's raining in the scene. Off by default.</p>
        </Section>

        <Section title="Demo mode" description="Preview every weather world with sample Dhaka data. Handy for showing the app off.">
          <Segmented<DemoScenario | "live"> label="Demo weather" value={scenario ?? "live"}
            onChange={(v) => setScenario(v === "live" ? null : v)}
            options={[{ key: "live", label: "Live weather" }, ...DEMO_SCENARIOS]} />
          <p className="text-xs text-ink-mute">
            Demo mode resets when you reload. Share a demo directly with a link like <code>?demo=rain</code>.{" "}
            <Link to="/about" className="font-semibold text-accent hover:underline">About WeatherLens →</Link>
          </p>
        </Section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="h-12 rounded-full bg-ink px-6 font-semibold text-bg hover:opacity-90">Save preferences</button>
          <button type="button" onClick={() => { setDraft(DEFAULT_PREFS); setSaved(false); }} className="h-12 rounded-full px-5 font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
            Reset to example
          </button>
          {saved && <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-good"><Check size={16} aria-hidden="true" />Saved</span>}
        </div>
      </form>
    </PageFrame>
  );
}
