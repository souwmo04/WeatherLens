"""Weather along a route: geocode → OSRM geometry → sample points → ETA-matched forecast."""
import asyncio
from datetime import datetime, timedelta, timezone

from app.models.weather import Location, RouteStop, RouteWeather
from app.providers import open_meteo, osm
from app.providers.http import ProviderError
from app.services.insight_engine import fmt_hour, pct
from app.services.normalize import hourly_from
from app.utils.geo import haversine_km

SAMPLES = 5  # including origin and destination


class PlaceNotFound(Exception):
    def __init__(self, query: str) -> None:
        super().__init__(query)
        self.query = query


async def resolve_place(query: str, near: tuple[float, float] | None) -> Location:
    """Accepts 'lat,lon' or a place name. Prefers matches near the user."""
    q = query.strip()
    parts = q.split(",")
    if len(parts) == 2:
        try:
            lat, lon = float(parts[0]), float(parts[1])
            name = await osm.reverse(lat, lon) or f"{lat:.3f}, {lon:.3f}"
            return Location(name=name, latitude=lat, longitude=lon)
        except ValueError:
            pass

    candidates: list[Location] = []
    try:
        for r in await open_meteo.geocode(q, count=5):
            candidates.append(Location(name=r["name"], country=r.get("country"), admin1=r.get("admin1"),
                                       latitude=r["latitude"], longitude=r["longitude"]))
    except ProviderError:
        pass
    if near:
        candidates = [c for c in candidates if haversine_km(near[0], near[1], c.latitude, c.longitude) < 150]
    if not candidates:
        # Landmarks / neighbourhoods (e.g. "NSU", "Banani") need OSM search.
        try:
            for r in await osm.search(q, near):
                label = r.get("name") or r.get("display_name", q).split(",")[0]
                candidates.append(Location(name=label, latitude=float(r["lat"]), longitude=float(r["lon"])))
        except ProviderError:
            pass
    if not candidates:
        raise PlaceNotFound(q)
    if near:
        candidates.sort(key=lambda c: haversine_km(near[0], near[1], c.latitude, c.longitude))
    return candidates[0]


def _cumulative(coords: list[tuple[float, float]]) -> list[float]:
    acc = [0.0]
    for a, b in zip(coords, coords[1:]):
        acc.append(acc[-1] + haversine_km(a[0], a[1], b[0], b[1]))
    return acc


def _point_at(coords: list[tuple[float, float]], cum: list[float], target_km: float) -> tuple[float, float]:
    for i in range(1, len(cum)):
        if cum[i] >= target_km:
            seg = cum[i] - cum[i - 1] or 1e-9
            f = (target_km - cum[i - 1]) / seg
            a, b = coords[i - 1], coords[i]
            return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
    return coords[-1]


def _local_time(local_now: datetime, hhmm: str) -> datetime | None:
    try:
        hh, mm = (int(x) for x in hhmm.split(":"))
    except ValueError:
        return None
    dt = local_now.replace(hour=hh, minute=mm)
    if dt < local_now - timedelta(minutes=30):
        dt += timedelta(days=1)
    return dt


async def route_weather(origin_q: str, dest_q: str, depart: str | None, arrive: str | None,
                        near: tuple[float, float] | None) -> RouteWeather:
    origin = await resolve_place(origin_q, near)
    dest = await resolve_place(dest_q, near or (origin.latitude, origin.longitude))

    routing = "osrm"
    try:
        r = await osm.route((origin.latitude, origin.longitude), (dest.latitude, dest.longitude))
        coords, dist_km, dur_min = r["coords"], r["distance_m"] / 1000, r["duration_s"] / 60
    except ProviderError:
        routing = "straight-line"
        coords = [(origin.latitude, origin.longitude), (dest.latitude, dest.longitude)]
        dist_km = haversine_km(origin.latitude, origin.longitude, dest.latitude, dest.longitude) * 1.3
        dur_min = dist_km / 25 * 60  # ~25 km/h urban average

    cum = _cumulative(coords)
    total_geo = cum[-1] or 1e-9
    fractions = [i / (SAMPLES - 1) for i in range(SAMPLES)]
    samples = [_point_at(coords, cum, f * total_geo) for f in fractions]

    forecasts = await open_meteo.multi_point(
        samples, hourly="temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day", forecast_days=2)
    offset = timedelta(seconds=forecasts[0].get("utc_offset_seconds", 0))
    local_now = (datetime.now(timezone.utc) + offset).replace(tzinfo=None, second=0, microsecond=0)
    depart_dt = local_now
    if depart:
        depart_dt = _local_time(local_now, depart) or local_now
    elif arrive:
        arrive_dt = _local_time(local_now, arrive)
        if arrive_dt:
            depart_dt = arrive_dt - timedelta(minutes=dur_min)

    names = await asyncio.gather(*[osm.reverse(lat, lon) for lat, lon in samples[1:-1]])
    stop_names = [origin.name] + [n or f"Km {round(f * dist_km)}" for n, f in zip(names, fractions[1:-1])] + [dest.name]

    stops: list[RouteStop] = []
    for (lat, lon), f, name, fc in zip(samples, fractions, stop_names, forecasts):
        eta = depart_dt + timedelta(minutes=dur_min * f)
        hourly = hourly_from(fc)
        key = eta.replace(minute=0).isoformat(timespec="minutes")
        if eta.minute >= 30:
            key = (eta.replace(minute=0) + timedelta(hours=1)).isoformat(timespec="minutes")
        p = next((h for h in hourly if h.time >= key), hourly[-1] if hourly else None)
        if p is None:
            continue
        stops.append(RouteStop(name=name, latitude=lat, longitude=lon, eta=eta.isoformat(timespec="minutes"),
                               distance_km=round(f * dist_km, 1), temperature=p.temperature, condition=p.condition,
                               condition_label=p.condition_label, precipitation_probability=p.precipitation_probability,
                               wind_speed=p.wind_speed))

    summary, worst = _summarize(stops)
    return RouteWeather(origin=origin, destination=dest, distance_km=round(dist_km, 1), duration_min=round(dur_min),
                        geometry=[(round(a, 5), round(b, 5)) for a, b in coords], stops=stops, summary=summary,
                        worst_stop=worst, routing=routing)  # type: ignore[arg-type]


def _summarize(stops: list[RouteStop]) -> tuple[str, str | None]:
    if not stops:
        return "Forecast unavailable along this route.", None

    def wet(s: RouteStop) -> bool:
        return s.condition in ("drizzle", "rain", "heavy_rain", "storm") or (s.precipitation_probability or 0) >= 50

    wet_stops = [s for s in stops if wet(s)]
    if not wet_stops:
        peak = max(stops, key=lambda s: s.precipitation_probability or 0)
        if (peak.precipitation_probability or 0) >= 30:
            return f"Mostly dry — a {pct(peak.precipitation_probability)} chance of showers near {peak.name}.", peak.name
        temps = [s.temperature for s in stops]
        return f"Dry all the way, {round(min(temps))}–{round(max(temps))}°.", None
    worst = max(wet_stops, key=lambda s: s.precipitation_probability or 0)
    when = fmt_hour(worst.eta)
    if len(wet_stops) == len(stops):
        probs = [s.precipitation_probability or 0 for s in stops]
        if max(probs) - min(probs) < 8:
            return f"Rain likely along the whole route ({pct(max(probs))}) — pack an umbrella.", None
        return f"Rain likely along the whole route — heaviest risk near {worst.name} ({pct(worst.precipitation_probability)}).", worst.name
    if worst is stops[-1]:
        return f"Rain is expected near {worst.name} around your arrival ({when}).", worst.name
    return f"Rain is expected near {worst.name} around {when} ({pct(worst.precipitation_probability)}).", worst.name

