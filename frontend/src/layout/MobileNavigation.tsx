import { NavLink } from "react-router-dom";
import { CalendarDays, Home, Radar, Route, Sparkles } from "lucide-react";

const ITEMS = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/forecast", label: "Forecast", icon: CalendarDays },
  { to: "/app/radar", label: "Radar", icon: Radar },
  { to: "/app/routes", label: "Routes", icon: Route },
  { to: "/app/assistant", label: "AI", icon: Sparkles },
];

/** Bottom tab bar for phones and small tablets. */
export function MobileNavigation() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="glass mx-auto flex max-w-md items-stretch justify-between rounded-[1.4rem] px-1.5 py-1.5 shadow-[var(--shadow-lift)]">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[0.68rem] font-semibold transition-colors ${
                isActive ? "bg-accent-soft text-accent" : "text-ink-mute hover:text-ink"}`}>
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
