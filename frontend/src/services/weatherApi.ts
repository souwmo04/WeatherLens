import type {
  DemoScenario, ForecastBundle, GridPoint, Place, Preferences, RainNowcast, RouteWeather,
} from "@/types/weather";
import { apiGet } from "./http";

const MIN = 60_000;

export interface Coords { latitude: number; longitude: number }

export function getForecast(place: Place, scenario: DemoScenario | null, prefs?: Preferences | null) {
  return apiGet<ForecastBundle>("/weather/forecast", {
    lat: place.latitude.toFixed(3),
    lon: place.longitude.toFixed(3),
    name: place.name,
    country: place.country ?? undefined,
    admin1: place.admin1 ?? undefined,
    scenario: scenario ?? undefined,
    activity: prefs?.activities.length ? prefs.activities : undefined,
    activity_time: prefs?.activity_time || undefined,
    work: prefs?.work || undefined,
    depart: prefs?.departure_time || undefined,
    return_time: prefs?.return_time || undefined,
  }, 5 * MIN);
}

export function getRain(c: Coords, scenario: DemoScenario | null) {
  return apiGet<RainNowcast>("/weather/rain", {
    lat: c.latitude.toFixed(3), lon: c.longitude.toFixed(3), scenario: scenario ?? undefined,
  }, 5 * MIN);
}

export function searchPlaces(q: string) {
  return apiGet<Place[]>("/geo/search", { q, count: 8 }, 60 * MIN);
}

export function reverseGeocode(c: Coords) {
  return apiGet<{ name: string | null }>("/geo/reverse", { lat: c.latitude.toFixed(3), lon: c.longitude.toFixed(3) }, 60 * MIN);
}

export function getRoute(from: string, to: string, opts: { depart?: string; arrive?: string; near?: Coords }) {
  return apiGet<RouteWeather>("/weather/route", {
    from, to, depart: opts.depart, arrive: opts.arrive,
    near_lat: opts.near?.latitude.toFixed(3), near_lon: opts.near?.longitude.toFixed(3),
  }, 10 * MIN);
}

export interface Bounds { south: number; west: number; north: number; east: number }

export function getGrid(b: Bounds, n: number, air: boolean) {
  const r = (v: number) => v.toFixed(2);
  return apiGet<GridPoint[]>("/weather/grid", {
    south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east), n, air,
  }, 10 * MIN);
}
