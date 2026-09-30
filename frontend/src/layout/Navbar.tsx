import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, MapPin, Monitor, Moon, Settings, Sun } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CitySearch } from "@/components/CitySearch";
import { useApp, useActivePlace, type ThemePref } from "@/state/AppState";

export const NAV_ITEMS = [
  { to: "/", label: "Today", end: true },
  { to: "/forecast", label: "Forecast" },
  { to: "/radar", label: "Map" },
  { to: "/routes", label: "Routes" },
  { to: "/assistant", label: "Ask AI" },
] as const;

const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];

export function ThemeToggle({ onScene = false }: { onScene?: boolean }) {
  const { theme, setTheme } = useApp();
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]!;
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button onClick={() => setTheme(next)}
      className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${onScene ? "text-white/90 hover:bg-white/15" : "text-ink-soft hover:bg-sunken hover:text-ink"}`}
      aria-label={`Theme: ${theme}. Switch to ${next}.`} title={`Theme: ${theme}`}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function LocationButton({ onScene = false, compact = false }: { onScene?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const place = useActivePlace();
  const { scenario } = useApp();
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex h-10 max-w-[9.5rem] items-center sm:max-w-[12rem] gap-2 rounded-full pl-3 pr-2.5 text-sm font-semibold transition-colors ${onScene ? "glass-on-scene hover:bg-white/25" : "border border-line bg-elev text-ink hover:border-line-strong"}`}
        aria-label={`Location: ${place.name}. Change location.`}>
        <MapPin size={15} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{place.name}{scenario && !compact ? " · Demo" : ""}</span>
        <ChevronDown size={15} aria-hidden="true" className="shrink-0 opacity-70" />
      </button>
      <CitySearch open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function Navbar({ onScene }: { onScene: boolean }) {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
      onScene
        ? isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
        : isActive ? "bg-sunken text-ink" : "text-ink-soft hover:text-ink"
    }`;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav aria-label="Primary"
        className={`pointer-events-auto mx-auto flex h-15 max-w-[1320px] items-center justify-between gap-3 rounded-full pl-4 pr-2 transition-colors duration-500 sm:pl-5 ${
          onScene ? "glass-on-scene !bg-white/10" : "glass shadow-[var(--shadow-soft)]"
        }`}>
        <Link to="/" aria-label="WeatherLens home" className="shrink-0 rounded-full">
          <Logo onScene={onScene} />
        </Link>
        <ul className="hidden items-center gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={"end" in item ? item.end : false} className={linkCls}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <LocationButton onScene={onScene} />
          <span className="hidden sm:block"><ThemeToggle onScene={onScene} /></span>
          <NavLink to="/settings" aria-label="Preferences"
            className={({ isActive }) => `grid h-10 w-10 place-items-center rounded-full transition-colors ${
              onScene ? "text-white/90 hover:bg-white/15" : isActive ? "bg-sunken text-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"}`}>
            <Settings size={18} aria-hidden="true" />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
