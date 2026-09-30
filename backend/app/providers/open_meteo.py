"""Open-Meteo provider: raw API calls only. Normalization lives in services."""
from app.config import get_settings
from app.providers.http import ProviderError, get_json
from app.utils.cache import cache

CURRENT_VARS = (
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,"
    "cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility"
)
HOURLY_VARS = (
    "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,"
    "wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index,cloud_cover,visibility,is_day"
)
DAILY_VARS = (
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
    "precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max"
)


def _r(v: float) -> float:
    """Round coordinates so nearby requests share a cache entry (~1 km)."""
    return round(v, 2)


async def forecast(lat: float, lon: float) -> dict:
    s = get_settings()
    lat, lon = _r(lat), _r(lon)
    params = {
        "latitude": lat, "longitude": lon, "timezone": "auto", "forecast_days": 7,
        "current": CURRENT_VARS, "hourly": HOURLY_VARS, "daily": DAILY_VARS,
        "wind_speed_unit": "kmh",
    }

    async def fetch() -> dict:
        data = await get_json("open-meteo", s.open_meteo_forecast_url, params)
        if not isinstance(data, dict) or "current" not in data:
            raise ProviderError("open-meteo", "unexpected response")
        return data

    return await cache.get_or_set(f"fc:{lat}:{lon}", s.forecast_ttl, fetch)


async def multi_point(points: list[tuple[float, float]], *, current: str | None = None,
                      hourly: str | None = None, minutely_15: str | None = None,
                      forecast_days: int = 2, forecast_minutely_15: int | None = None) -> list[dict]:
    """One request for many coordinates (Open-Meteo accepts comma-separated lists)."""
    if not points:
        return []
    s = get_settings()
    params: dict = {
        "latitude": ",".join(str(_r(p[0])) for p in points),
        "longitude": ",".join(str(_r(p[1])) for p in points),
        "timezone": "auto",
        "forecast_days": forecast_days,
    }
    if current:
        params["current"] = current
    if hourly:
        params["hourly"] = hourly
    if minutely_15:
        params["minutely_15"] = minutely_15
    if forecast_minutely_15:
        params["forecast_minutely_15"] = forecast_minutely_15
    key = "mp:" + "|".join(f"{k}={v}" for k, v in sorted(params.items()))

    async def fetch() -> list[dict]:
        data = await get_json("open-meteo", s.open_meteo_forecast_url, params)
        return data if isinstance(data, list) else [data]

    return await cache.get_or_set(key, s.forecast_ttl, fetch)


async def air_quality(lat: float, lon: float) -> dict:
    s = get_settings()
    lat, lon = _r(lat), _r(lon)
    params = {
        "latitude": lat, "longitude": lon, "timezone": "auto",
        "current": "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
    }

    async def fetch() -> dict:
        data = await get_json("open-meteo-aq", s.open_meteo_air_quality_url, params)
        return data if isinstance(data, dict) else {}

    return await cache.get_or_set(f"aq:{lat}:{lon}", s.air_quality_ttl, fetch)


async def air_quality_multi(points: list[tuple[float, float]]) -> list[dict]:
    s = get_settings()
    params = {
        "latitude": ",".join(str(_r(p[0])) for p in points),
        "longitude": ",".join(str(_r(p[1])) for p in points),
        "current": "us_aqi",
    }

    async def fetch() -> list[dict]:
        data = await get_json("open-meteo-aq", s.open_meteo_air_quality_url, params)
        return data if isinstance(data, list) else [data]

    return await cache.get_or_set("aqm:" + params["latitude"] + ":" + params["longitude"], s.air_quality_ttl, fetch)


async def geocode(query: str, count: int = 8) -> list[dict]:
    s = get_settings()
    q = query.strip()
    if len(q) < 2:
        return []

    async def fetch() -> list[dict]:
        data = await get_json("open-meteo-geocoding", s.open_meteo_geocoding_url,
                              {"name": q, "count": count, "language": "en", "format": "json"})
        if not isinstance(data, dict):
            raise ProviderError("open-meteo-geocoding", "unexpected response")
        return data.get("results", []) or []

    return await cache.get_or_set(f"geo:{q.lower()}:{count}", s.geocode_ttl, fetch)
