"""Assembles the full ForecastBundle from provider data (live) or demo scenarios."""
import asyncio
from datetime import datetime, timezone

from app.mocks import scenarios
from app.models.ai import UserPreferences
from app.models.weather import AirQuality, ForecastBundle, Location
from app.providers import open_meteo
from app.providers.http import ProviderError
from app.services import insight_engine as ie
from app.services import normalize as nz


def _air_quality_from(raw: dict | None) -> AirQuality | None:
    if not raw or "current" not in raw:
        return None
    c = raw["current"]
    aq = AirQuality(us_aqi=c.get("us_aqi"), pm2_5=c.get("pm2_5"), pm10=c.get("pm10"),
                    ozone=c.get("ozone"), nitrogen_dioxide=c.get("nitrogen_dioxide"))
    aq.category = ie.aqi_category(aq.us_aqi)
    return aq


async def get_air_quality(lat: float, lon: float) -> AirQuality | None:
    try:
        return _air_quality_from(await open_meteo.air_quality(lat, lon))
    except ProviderError:
        return None


async def get_raw(lat: float, lon: float, scenario: str | None) -> tuple[dict, dict | None, str]:
    """Returns (forecast payload, air-quality payload, source)."""
    if scenario:
        return scenarios.build_payload(scenario), scenarios.DEMO_AIR_QUALITY, "demo"
    fc, aq = await asyncio.gather(open_meteo.forecast(lat, lon), open_meteo.air_quality(lat, lon),
                                  return_exceptions=True)
    if isinstance(fc, BaseException):
        raise fc
    return fc, (None if isinstance(aq, BaseException) else aq), "open-meteo"


def build_bundle(raw: dict, aq_raw: dict | None, source: str, location: Location,
                 prefs: UserPreferences | None = None) -> ForecastBundle:
    current = nz.current_from(raw)
    hourly_all = nz.hourly_from(raw)
    daily = nz.daily_from(raw)
    aq = _air_quality_from(aq_raw)
    hourly = nz.hours_from_now(hourly_all, current.time, 48)
    window = ie.day_window(hourly, current.time)
    today = daily[0] if daily else None

    # Late in the evening, the useful story is tomorrow's.
    story_day, story_label = current.time[:10], "Today"
    if nz.parse_local(current.time).hour >= 21 and len(daily) > 1:
        story_day, story_label = daily[1].date, "Tomorrow"
    story = ie.story_for(hourly_all, story_day)
    story.label = story_label

    return ForecastBundle(
        location=location,
        current=current,
        hourly=hourly,
        daily=daily,
        air_quality=aq,
        insight=ie.recommendations(current, window, today, aq, prefs),
        story=story,
        mood=ie.mood_for(current),
        source=source,  # type: ignore[arg-type]
        generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )


async def get_bundle(lat: float, lon: float, name: str | None = None, country: str | None = None,
                     admin1: str | None = None, scenario: str | None = None,
                     prefs: UserPreferences | None = None) -> ForecastBundle:
    raw, aq_raw, source = await get_raw(lat, lon, scenario)
    if scenario:
        d = scenarios.DHAKA
        location = Location(name=d["name"], country=d["country"], admin1=d["admin1"], latitude=d["latitude"],
                            longitude=d["longitude"], timezone=d["timezone"], utc_offset_seconds=d["utc_offset_seconds"])
    else:
        location = nz.location_from(raw, name, country, admin1)
    return build_bundle(raw, aq_raw, source, location, prefs)
