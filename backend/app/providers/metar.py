"""Real surface observations (METAR) from the NOAA Aviation Weather Center — free, keyless.

Airports report observed temperature, dew point, wind, pressure, visibility and
present weather every 30–60 minutes. Near an airport this is far more accurate
for "right now" than any forecast model.
"""
import re
import time

from app.config import get_settings
from app.providers.http import ProviderError, get_json
from app.utils.cache import cache
from app.utils.geo import haversine_km

METAR_URL = "https://aviationweather.gov/api/data/metar"


async def nearby(lat: float, lon: float, radius_deg: float = 0.45) -> list[dict]:
    s = get_settings()
    bbox = f"{lat - radius_deg:.2f},{lon - radius_deg:.2f},{lat + radius_deg:.2f},{lon + radius_deg:.2f}"

    async def fetch() -> list[dict]:
        data = await get_json("metar", METAR_URL, {"bbox": bbox, "format": "json", "hours": 3})
        return data if isinstance(data, list) else []

    return await cache.get_or_set(f"metar:{bbox}", min(s.forecast_ttl, 600), fetch)


def visibility_km(obs: dict) -> float | None:
    """Prefer the metric group in the raw report (e.g. '3500'); fall back to statute miles."""
    raw = obs.get("rawOb") or ""
    m = re.search(r"\s(\d{4})(?:NDV)?\s", raw)
    if m and "SM" not in raw:
        meters = int(m.group(1))
        return 10.0 if meters == 9999 else round(meters / 1000, 2)
    if "CAVOK" in raw:
        return 10.0
    v = obs.get("visib")
    if v is None:
        return None
    if isinstance(v, str):
        v = float(v.rstrip("+"))
    return round(float(v) * 1.609, 1)


async def nearest_recent(lat: float, lon: float, max_km: float = 35, max_age_min: float = 90) -> dict | None:
    """Most recent observation from the nearest station within range, or None."""
    try:
        reports = await nearby(lat, lon)
    except ProviderError:
        return None
    now = time.time()
    best: tuple[float, dict] | None = None
    latest_by_station: dict[str, dict] = {}
    for r in reports:
        sid = r.get("icaoId")
        if not sid or r.get("temp") is None or r.get("obsTime") is None:
            continue
        if sid not in latest_by_station or r["obsTime"] > latest_by_station[sid]["obsTime"]:
            latest_by_station[sid] = r
    for r in latest_by_station.values():
        age_min = (now - r["obsTime"]) / 60
        if age_min > max_age_min or r.get("lat") is None:
            continue
        dist = haversine_km(lat, lon, r["lat"], r["lon"])
        if dist <= max_km and (best is None or dist < best[0]):
            best = (dist, {**r, "_distance_km": round(dist, 1), "_age_min": round(max(0.0, age_min))})
    return best[1] if best else None
