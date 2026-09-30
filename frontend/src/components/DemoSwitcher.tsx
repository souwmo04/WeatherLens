import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, X } from "lucide-react";
import { useApp } from "@/state/AppState";
import { DEMO_SCENARIOS } from "@/utils/weatherHelpers";
import { WeatherIcon } from "./ui/WeatherIcon";
import type { IconKind } from "@/utils/weatherHelpers";

const ICON: Record<string, IconKind> = {
  sunny: "sun-cloud", cloudy: "cloud", rain: "rain", storm: "storm", sunset: "sun", night: "moon",
};

/** Floating "Demo mode" control so anyone can flip through the weather worlds instantly. */
export function DemoSwitcher() {
  const { scenario, setScenario } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-[6.2rem] right-3 z-40 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      <AnimatePresence>
        {open && (
          <motion.div role="group" aria-label="Demo weather scenarios"
            initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className="glass w-[15.5rem] rounded-3xl p-2 shadow-[var(--shadow-lift)]">
            <p className="px-2.5 pb-1.5 pt-1 text-xs text-ink-mute">
              Demo mode shows sample Dhaka data so you can explore every weather world.
            </p>
            <div className="grid grid-cols-2 gap-1">
              {DEMO_SCENARIOS.map((s) => (
                <button key={s.key} onClick={() => setScenario(s.key)} aria-pressed={scenario === s.key}
                  className={`flex items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-semibold transition-colors ${
                    scenario === s.key ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-sunken hover:text-ink"}`}>
                  <WeatherIcon kind={ICON[s.key]} size={24} />
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setScenario(null); setOpen(false); }} disabled={!scenario}
              className="mt-1 w-full rounded-2xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-40">
              Back to live weather
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`glass flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3.5 text-sm sm:px-4 font-semibold shadow-[var(--shadow-lift)] transition-colors ${scenario ? "text-accent" : "text-ink"}`}>
        {open ? <X size={16} aria-hidden="true" /> : <Clapperboard size={16} aria-hidden="true" />}
        <span className={scenario ? undefined : "sr-only sm:not-sr-only"}>
          {scenario ? `Demo · ${DEMO_SCENARIOS.find((s) => s.key === scenario)?.label}` : "Demo mode"}
        </span>
      </button>
    </div>
  );
}
