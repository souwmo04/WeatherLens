import { motion } from "motion/react";
import {
  Backpack, Car, Check, CloudRain, Droplet, Footprints, Glasses, Layers, Shirt, Sparkles, Sun, TreePine, Umbrella, User, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Insight, Recommendation } from "@/types/weather";
import { Skeleton } from "./ui/primitives";

const ICONS: Record<string, LucideIcon> = {
  umbrella: Umbrella, "cloud-rain": CloudRain, droplet: Droplet, sun: Sun, glasses: Glasses, wind: Wind,
  shirt: Shirt, footprints: Footprints, layers: Layers, check: Check,
};

function Column({ icon: Icon, title, children, delay }: { icon: LucideIcon; title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div className="flex flex-col gap-4 bg-elev p-6 sm:p-7"
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.12em] text-ink-mute">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent"><Icon size={16} aria-hidden="true" /></span>
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function RecList({ items }: { items: Recommendation[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((r) => {
        const Icon = ICONS[r.icon] ?? Check;
        return (
          <li key={r.label} className="flex items-start gap-3">
            <Icon size={18} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
            <span>
              <span className="block font-semibold leading-snug text-ink">{r.label}</span>
              {r.reason && <span className="block text-sm leading-snug text-ink-mute">{r.reason}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function WeatherInsight({ insight, loading }: { insight: Insight | null; loading: boolean }) {
  return (
    <section aria-labelledby="insight-title" className="surface overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-6 pb-5 pt-7 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            <Sparkles size={13} aria-hidden="true" /> WeatherLens interprets
          </p>
          <h2 id="insight-title" className="text-[1.45rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.7rem]">
            What does today's weather mean for you?
          </h2>
        </div>
        <p className="text-sm text-ink-mute">Based only on the forecast data shown here.</p>
      </div>

      {loading || !insight ? (
        <div className="grid gap-6 p-7 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="space-y-3"><Skeleton className="h-5 w-28" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>)}
        </div>
      ) : (
        <>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Column icon={Backpack} title="What to take" delay={0}><RecList items={insight.take} /></Column>
            <Column icon={Shirt} title="What to wear" delay={0.06}><RecList items={insight.wear} /></Column>
            <Column icon={Car} title="Travel" delay={0.12}>
              <p className="text-[1.05rem] font-semibold leading-snug text-ink">{insight.travel}</p>
            </Column>
            <Column icon={TreePine} title="Outdoors" delay={0.18}>
              <p className="text-[1.05rem] font-semibold leading-snug text-ink">{insight.outdoor}</p>
            </Column>
          </div>
          {insight.personal.length > 0 && (
            <div className="border-t border-line bg-accent-soft/40 px-6 py-5 sm:px-7">
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-ink">
                <User size={15} className="text-accent" aria-hidden="true" /> For your day
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {insight.personal.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[0.95rem] leading-snug text-ink-soft">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />{line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
