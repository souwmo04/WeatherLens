import { useNavigate } from "react-router-dom";
import { Bike, Camera, Car, GraduationCap, Shirt, Umbrella, type LucideIcon } from "lucide-react";
import { useApp } from "@/state/AppState";

interface Action { icon: LucideIcon; label: string; question: (ctx: { work: string; depart: string; back: string }) => string; tint: string }

export const QUICK_ACTIONS: Action[] = [
  { icon: Umbrella, label: "Do I need an umbrella?", question: () => "Do I need an umbrella today?", tint: "#4b8bff" },
  { icon: Shirt, label: "What should I wear?", question: () => "What should I wear today?", tint: "#e0603f" },
  { icon: Car, label: "Is it safe to travel?", question: () => "Is it safe to travel today? Will weather affect my commute?", tint: "#6a55e0" },
  { icon: Bike, label: "Good for exercise?", question: () => "Is today good for exercise outdoors? When is the best time?", tint: "#16a36a" },
  { icon: Camera, label: "Good for photography?", question: () => "Is today good for outdoor photography? When is the best light?", tint: "#e8900c" },
  {
    icon: GraduationCap, label: "University mode", tint: "#2f6fe0",
    question: ({ work, depart, back }) =>
      `I'm going to ${work || "university"} at ${depart || "3 PM"} and returning at ${back || "8 PM"}. What should I prepare for?`,
  },
];

function to12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (h == null || Number.isNaN(h)) return hhmm;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** One-tap questions that open the assistant with context already filled in. */
export function QuickActions() {
  const navigate = useNavigate();
  const { prefs } = useApp();
  const ctx = { work: prefs.work, depart: prefs.departure_time ? to12(prefs.departure_time) : "", back: prefs.return_time ? to12(prefs.return_time) : "" };

  return (
    <section aria-labelledby="qa-title">
      <h2 id="qa-title" className="sr-only">Quick questions</h2>
      <ul className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.label} className="shrink-0">
            <button onClick={() => navigate(`/app/assistant?q=${encodeURIComponent(a.question(ctx))}`)}
              className="group flex h-12 items-center gap-2.5 rounded-full border border-line bg-elev pl-1.5 pr-4 text-sm font-semibold text-ink shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-9 w-9 place-items-center rounded-full transition-transform group-hover:scale-105"
                style={{ background: `${a.tint}1f`, color: a.tint }}>
                <a.icon size={17} aria-hidden="true" />
              </span>
              {a.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
