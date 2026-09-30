import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import type { Place } from "@/types/weather";
import { reverseGeocode, searchPlaces } from "@/services/weatherApi";
import { ApiError } from "@/services/http";
import { useApp } from "@/state/AppState";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect?: (p: Place) => void;
  title?: string;
}

function placeLine(p: Place) {
  return [p.admin1, p.country].filter(Boolean).join(", ");
}

/** Accessible city search dialog (combobox + listbox, keyboard navigable). */
export function CitySearch({ open, onClose, onSelect, title = "Choose a location" }: Props) {
  const { recent, setPlace, setScenario } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setQ(""); setResults([]); setError(null); setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setError(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchPlaces(term)
        .then((r) => { setResults(r); setError(r.length ? null : `No places match “${term}”.`); setActive(0); })
        .catch((e: ApiError) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const choose = (p: Place) => {
    if (onSelect) onSelect(p);
    else { setPlace(p); setScenario(null); }
    onClose();
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setError("Location isn't available in this browser."); return; }
    setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        let name = "My location";
        try { name = (await reverseGeocode(c)).name ?? name; } catch { /* keep generic name */ }
        setLocating(false);
        choose({ name, ...c });
      },
      (err) => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED ? "Location permission was denied. Search for a city instead." : "Couldn't determine your location.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const list = q.trim().length >= 2 ? results : recent;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && list[active]) { e.preventDefault(); choose(list[active]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#050a1c]/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="surface relative w-full max-w-lg overflow-hidden !rounded-[1.6rem]"
            initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <h2 id={titleId} className="sr-only">{title}</h2>
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search size={18} className="shrink-0 text-ink-mute" aria-hidden="true" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Search a city — Dhaka, London, Tokyo…" aria-label="Search for a city"
                role="combobox" aria-expanded={list.length > 0} aria-controls={listId}
                aria-activedescendant={list[active] ? `${listId}-${active}` : undefined}
                className="h-15 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-mute" />
              {loading ? <Loader2 size={18} className="animate-spin text-ink-mute" aria-label="Searching" /> : (
                <button onClick={onClose} className="rounded-full p-1.5 text-ink-mute hover:bg-sunken hover:text-ink" aria-label="Close search">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              <button onClick={useMyLocation} disabled={locating}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-accent hover:bg-accent-soft">
                {locating ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
                {locating ? "Finding you…" : "Use my current location"}
              </button>

              {error && <p className="px-3 py-3 text-sm text-ink-soft" role="status">{error}</p>}

              {list.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                    {q.trim().length >= 2 ? "Results" : "Recent"}
                  </p>
                  <ul id={listId} role="listbox" aria-label="Places">
                    {list.map((p, i) => (
                      <li key={`${p.name}-${p.latitude}-${p.longitude}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                        onMouseEnter={() => setActive(i)} onClick={() => choose(p)}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 ${i === active ? "bg-sunken" : ""}`}>
                        {q.trim().length >= 2 ? <MapPin size={17} className="shrink-0 text-ink-mute" aria-hidden="true" />
                          : <Clock size={17} className="shrink-0 text-ink-mute" aria-hidden="true" />}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{p.name}</span>
                          <span className="block truncate text-sm text-ink-mute">{placeLine(p) || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <Link to="/explore" onClick={onClose}
              className="flex items-center justify-between border-t border-line px-5 py-3.5 text-sm font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
              Explore & compare cities <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
