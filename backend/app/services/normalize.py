"""Turn raw Open-Meteo payloads into WeatherLens models."""
from datetime import datetime, timedelta

from app.models.weather import CurrentWeather, DailyPoint, HourlyPoint, Location
from app.utils.wmo import condition_for, label_for, scene_for

SUN_EDGE = timedelta(minutes=50)


def parse_local(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _at(arr: list | None, i: int):
    if not arr or i >= len(arr):
        return None
    return arr[i]


def _sun_table(daily: dict) -> dict[str, tuple[datetime, datetime]]:
    table: dict[str, tuple[datetime, datetime]] = {}
    for i, d in enumerate(daily.get("time", [])):
        rise, sset = _at(daily.get("sunrise"), i), _at(daily.get("sunset"), i)
        if rise and sset:
            table[d] = (parse_local(rise), parse_local(sset))
    return table


def near_sun_edge(ts: str, sun: dict[str, tuple[datetime, datetime]]) -> bool:
    t = parse_local(ts)
    edges = sun.get(t.date().isoformat())
    if not edges:
        return False
    rise, sset = edges
    return abs(t - sset) <= SUN_EDGE or abs(t - rise) <= SUN_EDGE / 2


def location_from(raw: dict, name: str | None, country: str | None, admin1: str | None) -> Location:
    return Location(
        name=name or "Your location",
        country=country,
        admin1=admin1,
        latitude=raw.get("latitude", 0.0),
        longitude=raw.get("longitude", 0.0),
        timezone=raw.get("timezone"),
        utc_offset_seconds=raw.get("utc_offset_seconds", 0),
    )


def _hourly_value(raw: dict, var: str, ts: str, offset_h: int) -> float | None:
    """Hourly `var` at the hour containing `ts` shifted by `offset_h` hours."""
    h = raw.get("hourly", {})
    times: list[str] = h.get("time", [])
    key = ts[:13] + ":00"
    if key not in times:
        return None
    i = times.index(key) + offset_h
    return _at(h.get(var), i) if 0 <= i < len(times) else None


def pressure_trend(change: float | None) -> str | None:
    if change is None:
        return None
    if change <= -1.6:
        return "falling_fast"
    if change <= -0.5:
        return "falling"
    if change >= 1.6:
        return "rising_fast"
    if change >= 0.5:
        return "rising"
    return "steady"


def current_from(raw: dict) -> CurrentWeather:
    c = raw["current"]
    now_p, past_p = _hourly_value(raw, "pressure_msl", c["time"], 0), _hourly_value(raw, "pressure_msl", c["time"], -3)
    change = round(now_p - past_p, 1) if now_p is not None and past_p is not None else None
    sun = _sun_table(raw.get("daily", {}))
    code = int(c.get("weather_code") or 0)
    cond = condition_for(code)
    is_day = bool(c.get("is_day", 1))
    vis = c.get("visibility")
    return CurrentWeather(
        time=c["time"],
        temperature=c["temperature_2m"],
        feels_like=c.get("apparent_temperature", c["temperature_2m"]),
        humidity=c.get("relative_humidity_2m"),
        wind_speed=c.get("wind_speed_10m"),
        wind_gusts=c.get("wind_gusts_10m"),
        wind_direction=c.get("wind_direction_10m"),
        uv_index=c.get("uv_index"),
        visibility_km=round(vis / 1000, 1) if vis is not None else None,
        cloud_cover=c.get("cloud_cover"),
        pressure=c.get("pressure_msl"),
        pressure_trend=pressure_trend(change),
        pressure_change_3h=change,
        dew_point=c.get("dew_point_2m"),
        humidity_yesterday=_hourly_value(raw, "relative_humidity_2m", c["time"], -24),
        precipitation=c.get("precipitation"),
        weather_code=code,
        condition=cond,
        condition_label=label_for(cond, is_day),
        scene=scene_for(cond, is_day, near_sun_edge(c["time"], sun)),
        is_day=is_day,
    )


def hourly_from(raw: dict) -> list[HourlyPoint]:
    h = raw.get("hourly", {})
    sun = _sun_table(raw.get("daily", {}))
    out: list[HourlyPoint] = []
    for i, ts in enumerate(h.get("time", [])):
        temp = _at(h.get("temperature_2m"), i)
        if temp is None:
            continue
        code = int(_at(h.get("weather_code"), i) or 0)
        cond = condition_for(code)
        is_day = bool(_at(h.get("is_day"), i) if _at(h.get("is_day"), i) is not None else 1)
        vis = _at(h.get("visibility"), i)
        out.append(HourlyPoint(
            time=ts,
            temperature=temp,
            feels_like=_at(h.get("apparent_temperature"), i),
            precipitation_probability=_at(h.get("precipitation_probability"), i),
            precipitation=_at(h.get("precipitation"), i),
            weather_code=code,
            condition=cond,
            condition_label=label_for(cond, is_day),
            scene=scene_for(cond, is_day, near_sun_edge(ts, sun)),
            wind_speed=_at(h.get("wind_speed_10m"), i),
            wind_direction=_at(h.get("wind_direction_10m"), i),
            humidity=_at(h.get("relative_humidity_2m"), i),
            uv_index=_at(h.get("uv_index"), i),
            cloud_cover=_at(h.get("cloud_cover"), i),
            visibility_km=round(vis / 1000, 1) if vis is not None else None,
            dew_point=_at(h.get("dew_point_2m"), i),
            pressure=_at(h.get("pressure_msl"), i),
            is_day=is_day,
        ))
    return out


def daily_from(raw: dict) -> list[DailyPoint]:
    d = raw.get("daily", {})
    today = raw.get("current", {}).get("time", "")[:10]
    out: list[DailyPoint] = []
    for i, day in enumerate(d.get("time", [])):
        if day < today:  # past_days=1 prepends yesterday
            continue
        tmax, tmin = _at(d.get("temperature_2m_max"), i), _at(d.get("temperature_2m_min"), i)
        if tmax is None or tmin is None:
            continue
        code = int(_at(d.get("weather_code"), i) or 0)
        cond = condition_for(code)
        out.append(DailyPoint(
            date=day,
            temp_max=tmax,
            temp_min=tmin,
            weather_code=code,
            condition=cond,
            condition_label=label_for(cond),
            precipitation_probability_max=_at(d.get("precipitation_probability_max"), i),
            precipitation_sum=_at(d.get("precipitation_sum"), i),
            sunrise=_at(d.get("sunrise"), i),
            sunset=_at(d.get("sunset"), i),
            uv_index_max=_at(d.get("uv_index_max"), i),
            wind_speed_max=_at(d.get("wind_speed_10m_max"), i),
        ))
    return out


def hours_from_now(hourly: list[HourlyPoint], now: str, count: int = 48) -> list[HourlyPoint]:
    """Hourly points starting at the hour containing `now`."""
    hour_start = now[:13] + ":00"
    start = next((i for i, p in enumerate(hourly) if p.time >= hour_start), 0)
    return hourly[start:start + count]
