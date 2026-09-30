from typing import Annotated

from fastapi import APIRouter, Query

from app.mocks.scenarios import SCENARIOS
from app.models.ai import UserPreferences
from app.models.weather import (
    AirQuality, CurrentWeather, ForecastBundle, GridPoint, HourlyPoint, RainNowcast, RouteWeather,
)
from app.providers import open_meteo
from app.services import rain_service, route_service, weather_service
from app.api.errors import api_error

router = APIRouter(prefix="/weather", tags=["weather"])

Lat = Annotated[float, Query(ge=-90, le=90)]
Lon = Annotated[float, Query(ge=-180, le=180)]
Scenario = Annotated[str | None, Query(description=f"Demo scenario: {', '.join(SCENARIOS)}")]


def _check_scenario(scenario: str | None) -> str | None:
    if scenario and scenario not in SCENARIOS:
        raise api_error(400, "invalid_scenario", f"Unknown demo scenario '{scenario}'.")
    return scenario


@router.get("/forecast", response_model=ForecastBundle, summary="Full bundle: current, hourly, daily, insight, story")
async def forecast(
    lat: Lat, lon: Lon, name: str | None = None, country: str | None = None, admin1: str | None = None,
    scenario: Scenario = None,
    activity: Annotated[list[str] | None, Query()] = None, activity_time: str | None = None,
    work: str | None = None, depart: str | None = None, return_time: str | None = None,
) -> ForecastBundle:
    prefs = None
    if activity or work or depart or return_time:
        prefs = UserPreferences(activities=activity or [], activity_time=activity_time, work=work,
                                departure_time=depart, return_time=return_time)
    return await weather_service.get_bundle(lat, lon, name, country, admin1, _check_scenario(scenario), prefs)


@router.get("/current", response_model=CurrentWeather)
async def current(lat: Lat, lon: Lon, scenario: Scenario = None) -> CurrentWeather:
    return (await weather_service.get_bundle(lat, lon, scenario=_check_scenario(scenario))).current


@router.get("/hourly", response_model=list[HourlyPoint])
async def hourly(lat: Lat, lon: Lon, hours: Annotated[int, Query(ge=1, le=48)] = 24,
                 scenario: Scenario = None) -> list[HourlyPoint]:
    return (await weather_service.get_bundle(lat, lon, scenario=_check_scenario(scenario))).hourly[:hours]


@router.get("/rain", response_model=RainNowcast, summary="Minute-level rain nowcast with approach direction")
async def rain(lat: Lat, lon: Lon, scenario: Scenario = None) -> RainNowcast:
    return await rain_service.nowcast(lat, lon, _check_scenario(scenario))


@router.get("/air-quality", response_model=AirQuality | None)
async def air_quality(lat: Lat, lon: Lon) -> AirQuality | None:
    aq = await weather_service.get_air_quality(lat, lon)
    if aq is None:
        raise api_error(503, "air_quality_unavailable", "Air-quality data is unavailable for this location.")
    return aq


@router.get("/route", response_model=RouteWeather, summary="Weather along a route at your ETA")
async def route(
    from_: Annotated[str, Query(alias="from", min_length=2, max_length=120)],
    to: Annotated[str, Query(min_length=2, max_length=120)],
    depart: Annotated[str | None, Query(pattern=r"^\d{1,2}:\d{2}$")] = None,
    arrive: Annotated[str | None, Query(pattern=r"^\d{1,2}:\d{2}$")] = None,
    near_lat: float | None = None, near_lon: float | None = None,
) -> RouteWeather:
    near = (near_lat, near_lon) if near_lat is not None and near_lon is not None else None
    try:
        return await route_service.route_weather(from_, to, depart, arrive, near)
    except route_service.PlaceNotFound as exc:
        raise api_error(404, "place_not_found", f"Couldn't find “{exc.query}”. Try a more specific name.") from exc


@router.get("/grid", response_model=list[GridPoint], summary="Sampled grid for map layers")
async def grid(
    south: Lat, west: Lon, north: Lat, east: Lon, n: Annotated[int, Query(ge=2, le=8)] = 6,
    air: bool = False,
) -> list[GridPoint]:
    if north <= south or east <= west:
        raise api_error(400, "invalid_bounds", "Map bounds are invalid.")
    pts = [(south + (north - south) * (i + 0.5) / n, west + (east - west) * (j + 0.5) / n)
           for i in range(n) for j in range(n)]
    data = await open_meteo.multi_point(
        pts, current="temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,uv_index,precipitation",
        forecast_days=1)
    aqi: list[float | None] = [None] * len(pts)
    if air:
        try:
            aqi = [d.get("current", {}).get("us_aqi") for d in await open_meteo.air_quality_multi(pts)]
        except Exception:  # air quality is optional for the map
            pass
    out: list[GridPoint] = []
    for (lat, lon), d, a in zip(pts, data, aqi):
        c = d.get("current", {})
        out.append(GridPoint(latitude=lat, longitude=lon, temperature=c.get("temperature_2m"),
                             wind_speed=c.get("wind_speed_10m"), wind_direction=c.get("wind_direction_10m"),
                             cloud_cover=c.get("cloud_cover"), uv_index=c.get("uv_index"),
                             precipitation=c.get("precipitation"), us_aqi=a))
    return out
