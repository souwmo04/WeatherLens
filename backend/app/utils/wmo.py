"""WMO weather interpretation codes -> WeatherLens conditions and scenes."""
from typing import Literal

Condition = Literal[
    "clear", "mostly_clear", "partly_cloudy", "cloudy", "fog", "drizzle",
    "rain", "heavy_rain", "snow", "storm",
]
Scene = Literal["sunny", "cloudy", "rain", "storm", "night", "sunset", "snow", "fog"]

_CODE_TO_CONDITION: dict[int, Condition] = {
    0: "clear", 1: "mostly_clear", 2: "partly_cloudy", 3: "cloudy",
    45: "fog", 48: "fog",
    51: "drizzle", 53: "drizzle", 55: "drizzle", 56: "drizzle", 57: "drizzle",
    61: "rain", 63: "rain", 65: "heavy_rain", 66: "rain", 67: "heavy_rain",
    71: "snow", 73: "snow", 75: "snow", 77: "snow", 85: "snow", 86: "snow",
    80: "rain", 81: "rain", 82: "heavy_rain",
    95: "storm", 96: "storm", 99: "storm",
}

_LABELS: dict[Condition, str] = {
    "clear": "Clear", "mostly_clear": "Mostly clear", "partly_cloudy": "Partly cloudy",
    "cloudy": "Overcast", "fog": "Foggy", "drizzle": "Drizzle", "rain": "Rain",
    "heavy_rain": "Heavy rain", "snow": "Snow", "storm": "Thunderstorm",
}
_NIGHT_LABELS: dict[Condition, str] = {"clear": "Clear night", "mostly_clear": "Mostly clear"}


def condition_for(code: int | None) -> Condition:
    if code is None:
        return "cloudy"
    return _CODE_TO_CONDITION.get(int(code), "cloudy")


def label_for(condition: Condition, is_day: bool = True) -> str:
    if not is_day and condition in _NIGHT_LABELS:
        return _NIGHT_LABELS[condition]
    return _LABELS[condition]


def is_wet(condition: Condition) -> bool:
    return condition in ("drizzle", "rain", "heavy_rain", "storm")


def scene_for(condition: Condition, is_day: bool, near_sun_edge: bool = False) -> Scene:
    """Pick the illustrated world. Weather beats time of day, time of day beats sky cover."""
    if condition == "storm":
        return "storm"
    if condition in ("rain", "heavy_rain", "drizzle"):
        return "rain"
    if condition == "snow":
        return "snow"
    if condition == "fog":
        return "fog"
    if not is_day:
        return "night"
    if near_sun_edge and condition != "cloudy":
        return "sunset"
    if condition == "cloudy":
        return "cloudy"
    return "sunny"
