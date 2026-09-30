"""Normalized weather models. Every consumer (frontend, insight engine, AI) sees only these shapes.

Times are *local wall-clock* ISO strings for the location (e.g. "2026-10-01T14:00"),
exactly as Open-Meteo returns them with `timezone=auto`. `utc_offset_seconds` is on Location.
"""
from typing import Literal

from pydantic import BaseModel, Field

from app.utils.wmo import Condition, Scene

Source = Literal["open-meteo", "demo"]


class Location(BaseModel):
    name: str
    country: str | None = None
    admin1: str | None = None
    latitude: float
    longitude: float
    timezone: str | None = None
    utc_offset_seconds: int = 0


class Observation(BaseModel):
    """A real surface observation that replaced model values for 'right now'."""
    station: str
    name: str | None = None
    distance_km: float
    age_min: int
    raw: str | None = None


class CurrentWeather(BaseModel):
    time: str
    temperature: float
    feels_like: float
    humidity: float | None = None
    wind_speed: float | None = Field(None, description="km/h")
    wind_gusts: float | None = Field(None, description="km/h")
    wind_direction: float | None = Field(None, description="degrees, meteorological (from)")
    uv_index: float | None = None
    visibility_km: float | None = None
    cloud_cover: float | None = None
    pressure: float | None = None
    pressure_trend: Literal["rising_fast", "rising", "steady", "falling", "falling_fast"] | None = None
    pressure_change_3h: float | None = None
    dew_point: float | None = None
    humidity_yesterday: float | None = None
    precipitation: float | None = Field(None, description="mm in the last 15 min")
    weather_code: int
    condition: Condition
    condition_label: str
    scene: Scene
    is_day: bool
    observation: Observation | None = None


class HourlyPoint(BaseModel):
    time: str
    temperature: float
    feels_like: float | None = None
    precipitation_probability: float | None = None
    precipitation: float | None = None
    weather_code: int
    condition: Condition
    condition_label: str
    scene: Scene
    wind_speed: float | None = None
    wind_direction: float | None = None
    humidity: float | None = None
    uv_index: float | None = None
    cloud_cover: float | None = None
    visibility_km: float | None = None
    dew_point: float | None = None
    pressure: float | None = None
    is_day: bool


class DailyPoint(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    weather_code: int
    condition: Condition
    condition_label: str
    precipitation_probability_max: float | None = None
    precipitation_sum: float | None = None
    sunrise: str | None = None
    sunset: str | None = None
    uv_index_max: float | None = None
    wind_speed_max: float | None = None


class AirQuality(BaseModel):
    us_aqi: float | None = None
    pm2_5: float | None = None
    pm10: float | None = None
    ozone: float | None = None
    nitrogen_dioxide: float | None = None
    category: str | None = None


class Recommendation(BaseModel):
    icon: str
    label: str
    reason: str | None = None


class Insight(BaseModel):
    headline: str
    take: list[Recommendation]
    wear: list[Recommendation]
    travel: str
    outdoor: str
    personal: list[str] = []


class StorySegment(BaseModel):
    period: Literal["Morning", "Afternoon", "Evening", "Night"]
    condition: Condition
    scene: Scene
    temperature: float
    rain_chance: float | None = None
    word: str


class DailyStory(BaseModel):
    label: str = "Today"
    segments: list[StorySegment]
    sentence: str


class Mood(BaseModel):
    key: Literal["energetic", "cozy", "calm", "dramatic", "peaceful", "golden", "crisp", "hazy"]
    label: str
    description: str


class ForecastBundle(BaseModel):
    location: Location
    current: CurrentWeather
    hourly: list[HourlyPoint]
    daily: list[DailyPoint]
    air_quality: AirQuality | None = None
    insight: Insight
    story: DailyStory
    mood: Mood
    source: Source = "open-meteo"
    generated_at: str


class RainCell(BaseModel):
    bearing: float
    distance_km: float
    intensity: float = Field(description="mm per 15 min at that point, now")


class NowcastSlot(BaseModel):
    time: str
    precipitation: float


class RainNowcast(BaseModel):
    status: Literal["raining", "approaching", "clear"]
    minutes_until: int | None = None
    minutes_remaining: int | None = Field(None, description="if raining, minutes until it stops")
    intensity_label: str | None = None
    approach_from_bearing: float | None = None
    approach_from: str | None = None
    message: str
    cells: list[RainCell]
    timeline: list[NowcastSlot]
    source: Source = "open-meteo"


class RouteStop(BaseModel):
    name: str
    latitude: float
    longitude: float
    eta: str
    distance_km: float
    temperature: float
    condition: Condition
    condition_label: str
    precipitation_probability: float | None = None
    wind_speed: float | None = None


class RouteWeather(BaseModel):
    origin: Location
    destination: Location
    distance_km: float
    duration_min: float
    geometry: list[tuple[float, float]] = Field(description="[lat, lon] pairs")
    stops: list[RouteStop]
    summary: str
    worst_stop: str | None = None
    routing: Literal["osrm", "straight-line"]


class GridPoint(BaseModel):
    latitude: float
    longitude: float
    temperature: float | None = None
    wind_speed: float | None = None
    wind_direction: float | None = None
    cloud_cover: float | None = None
    uv_index: float | None = None
    precipitation: float | None = None
    us_aqi: float | None = None
