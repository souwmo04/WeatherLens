"""Blend a real METAR observation into the model's 'current' conditions.

Forecast models smooth over local effects (Dhaka's haze, calm nights, sea
breezes). When a station is close and recent, observed values win for
"right now"; the model still drives every forecast hour.
"""
import math

from app.models.weather import CurrentWeather, Observation
from app.providers.metar import visibility_km
from app.utils.wmo import Condition, label_for, scene_for

CLOUD_RANK = {"SKC": 0, "CLR": 0, "NSC": 0, "NCD": 0, "CAVOK": 0, "FEW": 1, "SCT": 2, "BKN": 3, "OVC": 4, "OVX": 4, "VV": 4}
CLOUD_PCT = {0: 5, 1: 20, 2: 45, 3: 75, 4: 100}
CODE_FOR: dict[Condition, int] = {
    "clear": 0, "mostly_clear": 1, "partly_cloudy": 2, "cloudy": 3, "haze": 5, "fog": 45,
    "drizzle": 53, "rain": 63, "heavy_rain": 65, "snow": 73, "storm": 95,
}
OBSCURATION_LABEL = {"BR": "Mist", "HZ": "Haze", "FU": "Smoke", "DU": "Dust", "SA": "Dust"}


def relative_humidity(t: float, td: float) -> float:
    """Magnus formula."""
    a, b = 17.625, 243.04
    return round(max(1.0, min(100.0, 100 * math.exp(a * td / (b + td)) / math.exp(a * t / (b + t)))))


def apparent_temperature(t: float, rh: float, wind_kmh: float) -> float:
    """Australian BoM apparent temperature (same family Open-Meteo uses)."""
    e = rh / 100 * 6.105 * math.exp(17.27 * t / (237.7 + t))
    return round(t + 0.33 * e - 0.70 * (wind_kmh / 3.6) - 4.0, 1)


def _condition(wx: str, clouds: list[dict], vis_km: float | None) -> tuple[Condition, str | None]:
    """Returns (condition, label override)."""
    tokens = wx.split()
    present = [t for t in tokens if not t.startswith("VC")]
    joined = " ".join(present)
    if "TS" in joined:
        return "storm", None
    if any(t.startswith("+") and any(p in t for p in ("RA", "DZ", "SH")) for t in present):
        return "heavy_rain", None
    if "RA" in joined or "SH" in joined:
        return "rain", None
    if "DZ" in joined:
        return "drizzle", None
    if "SN" in joined:
        return "snow", None
    if "FG" in joined and "BCFG" not in joined and "MIFG" not in joined:
        return "fog", None
    for code, label in OBSCURATION_LABEL.items():
        if code in joined and (vis_km is None or vis_km < 6):
            return "haze", label
    rank = max((CLOUD_RANK.get(c.get("cover", ""), 0) for c in clouds or []), default=0)
    if rank >= 4:
        return "cloudy", None
    if rank == 3:
        return "partly_cloudy", "Mostly cloudy"
    if rank == 2:
        return "partly_cloudy", None
    if rank == 1:
        return "mostly_clear", None
    return "clear", None


def apply_observation(current: CurrentWeather, obs: dict, near_sun_edge: bool) -> CurrentWeather:
    t = float(obs["temp"])
    td = obs.get("dewp")
    rh = relative_humidity(t, float(td)) if td is not None else current.humidity
    wspd_kt = obs.get("wspd")
    wind = round(float(wspd_kt) * 1.852, 1) if isinstance(wspd_kt, (int, float)) else current.wind_speed
    gust_kt = obs.get("wgst")
    wdir = obs.get("wdir")
    vis = visibility_km(obs)
    clouds = obs.get("clouds") or []
    cond, label = _condition(obs.get("wxString") or "", clouds, vis)
    rank = max((CLOUD_RANK.get(c.get("cover", ""), 0) for c in clouds), default=0)

    return current.model_copy(update={
        "temperature": t,
        "dew_point": float(td) if td is not None else current.dew_point,
        "humidity": rh,
        "feels_like": apparent_temperature(t, rh or 60, wind or 0),
        "wind_speed": wind,
        "wind_gusts": round(float(gust_kt) * 1.852, 1) if isinstance(gust_kt, (int, float)) else None,
        "wind_direction": float(wdir) if isinstance(wdir, (int, float)) and wind else current.wind_direction,
        "pressure": float(obs["altim"]) if obs.get("altim") else current.pressure,
        "visibility_km": vis if vis is not None else current.visibility_km,
        "cloud_cover": CLOUD_PCT[rank] if clouds else current.cloud_cover,
        "condition": cond,
        "condition_label": label or label_for(cond, current.is_day),
        "weather_code": CODE_FOR[cond],
        "scene": scene_for(cond, current.is_day, near_sun_edge),
        "observation": Observation(
            station=obs["icaoId"], name=(obs.get("name") or "").split(",")[0] or None,
            distance_km=obs["_distance_km"], age_min=obs["_age_min"], raw=obs.get("rawOb"),
        ),
    })
