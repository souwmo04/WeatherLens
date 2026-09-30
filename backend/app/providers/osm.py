"""OpenStreetMap-based services: OSRM routing and Nominatim (search + reverse)."""
import asyncio

from app.config import get_settings
from app.providers.http import ProviderError, get_json
from app.utils.cache import cache

# Nominatim usage policy: max 1 request/second.
_nominatim_lock = asyncio.Lock()


async def _nominatim(path: str, params: dict) -> dict | list:
    s = get_settings()
    async with _nominatim_lock:
        try:
            return await get_json("nominatim", f"{s.nominatim_url}/{path}", {**params, "format": "jsonv2"})
        finally:
            await asyncio.sleep(1.0)


async def search(query: str, near: tuple[float, float] | None = None) -> list[dict]:
    s = get_settings()
    params: dict = {"q": query, "limit": 5, "accept-language": "en"}
    if near:
        lat, lon = near
        params["viewbox"] = f"{lon - 0.6},{lat + 0.6},{lon + 0.6},{lat - 0.6}"
    key = f"nom-s:{query.lower()}:{params.get('viewbox', '')}"

    async def fetch() -> list[dict]:
        data = await _nominatim("search", params)
        return data if isinstance(data, list) else []

    return await cache.get_or_set(key, s.geocode_ttl, fetch)


async def reverse(lat: float, lon: float) -> str | None:
    s = get_settings()
    lat, lon = round(lat, 3), round(lon, 3)

    async def fetch() -> str:
        data = await _nominatim("reverse", {"lat": lat, "lon": lon, "zoom": 14, "accept-language": "en"})
        if not isinstance(data, dict):
            return ""
        addr = data.get("address", {})
        for field in ("suburb", "neighbourhood", "quarter", "city_district", "town", "village", "city", "county"):
            if addr.get(field):
                return addr[field]
        return data.get("name") or ""

    try:
        name = await cache.get_or_set(f"nom-r:{lat}:{lon}", s.geocode_ttl, fetch)
    except ProviderError:
        return None
    return name or None


async def route(a: tuple[float, float], b: tuple[float, float], profile: str = "driving") -> dict:
    """OSRM route. Returns {"distance_m", "duration_s", "coords": [(lat, lon), ...]}."""
    s = get_settings()
    coords = f"{a[1]:.5f},{a[0]:.5f};{b[1]:.5f},{b[0]:.5f}"
    url = f"{s.osrm_url}/route/v1/{profile}/{coords}"

    async def fetch() -> dict:
        data = await get_json("osrm", url, {"overview": "simplified", "geometries": "geojson"})
        if not isinstance(data, dict) or data.get("code") != "Ok" or not data.get("routes"):
            raise ProviderError("osrm", "no route found")
        r = data["routes"][0]
        return {
            "distance_m": r["distance"],
            "duration_s": r["duration"],
            "coords": [(c[1], c[0]) for c in r["geometry"]["coordinates"]],
        }

    return await cache.get_or_set(f"osrm:{coords}:{profile}", s.route_ttl, fetch)
