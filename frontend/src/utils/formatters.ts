// Location-local times arrive as naive ISO strings ("2026-10-01T14:00").
// Treat them as UTC wall-clock so formatting never shifts them into the viewer's timezone.
const asWall = (iso: string) => new Date(iso.length === 16 ? `${iso}:00Z` : `${iso}Z`);

const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" });
const clockFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const longDateFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

export const fmtHour = (iso: string) => hourFmt.format(asWall(iso)).replace(" ", " ");
export const fmtClock = (iso: string) => clockFmt.format(asWall(iso)).replace(" ", " ");
export const fmtWeekday = (isoDate: string) => weekdayFmt.format(asWall(`${isoDate}T12:00`));
export const fmtLongDate = (iso: string) => longDateFmt.format(asWall(iso.length === 10 ? `${iso}T12:00` : iso));
export const hourOf = (iso: string) => Number(iso.slice(11, 13));

export const fmtTemp = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}°`);
export const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);
export const fmtWind = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} km/h`);
export const fmtKm = (v: number | null | undefined) => (v == null ? "—" : `${v >= 10 ? Math.round(v) : v.toFixed(1)} km`);

export function fmtDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compassPoint = (deg: number | null | undefined) => (deg == null ? "" : COMPASS[Math.round(deg / 45) % 8]);

export function isToday(isoDate: string, nowIso: string) {
  return isoDate.slice(0, 10) === nowIso.slice(0, 10);
}
