"""'Rain is coming' nowcast.

Uses Open-Meteo 15-minutely precipitation at the user's point plus a ring of
8 points ~12 km and ~25 km away. Which ring points are wet (now or soon) tells
us where rain is and which direction it's arriving from.
"""
from app.mocks import scenarios
from app.models.weather import NowcastSlot, RainCell, RainNowcast
from app.providers import open_meteo
from app.utils.geo import compass, destination

BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315]
RINGS_KM = [12, 25]
WET_MM = 0.1  # per 15 min
SLOTS = 16    # 4 hours


def _intensity_label(mm15: float) -> str:
    mm_h = mm15 * 4
    if mm_h < 1:
        return "Light rain"
    if mm_h < 4:
        return "Moderate rain"
    if mm_h < 10:
        return "Heavy rain"
    return "Very heavy rain"


async def nowcast(lat: float, lon: float, scenario: str | None = None, now: str | None = None) -> RainNowcast:
    if scenario:
        return scenarios.demo_nowcast(scenario, now or scenarios.build_payload(scenario)["current"]["time"])

    ring = [(b, km, destination(lat, lon, b, km)) for km in RINGS_KM for b in BEARINGS]
    points = [(lat, lon)] + [p for _, _, p in ring]
    data = await open_meteo.multi_point(points, current="precipitation,wind_direction_10m",
                                        minutely_15="precipitation", forecast_days=1,
                                        forecast_minutely_15=SLOTS + 4)
    center = data[0]
    m15 = center.get("minutely_15", {})
    times: list[str] = m15.get("time", [])
    precip: list[float] = [v or 0.0 for v in m15.get("precipitation", [])]
    now_ts = center.get("current", {}).get("time", times[0] if times else "")
    start = next((i for i, ts in enumerate(times) if ts >= now_ts[:14] + "00"), 0)
    # align to the 15-minute slot containing "now"
    start = max(0, start - (1 if start and times[start] > now_ts else 0))
    times, precip = times[start:start + SLOTS], precip[start:start + SLOTS]
    timeline = [NowcastSlot(time=ts, precipitation=round(v, 2)) for ts, v in zip(times, precip)]

    cells: list[RainCell] = []
    earliest: dict[int, tuple[int, float]] = {}
    for (b, km, _), d in zip(ring, data[1:]):
        vals = [v or 0.0 for v in d.get("minutely_15", {}).get("precipitation", [])][start:start + SLOTS]
        if vals and vals[0] >= WET_MM:
            cells.append(RainCell(bearing=b, distance_km=km, intensity=round(vals[0], 2)))
        first = next((i for i, v in enumerate(vals) if v >= WET_MM), None)
        if first is not None and (b not in earliest or first < earliest[b][0]):
            earliest[b] = (first, km)

    wind_from = center.get("current", {}).get("wind_direction_10m")
    approach_bearing: float | None = None
    if earliest:
        approach_bearing = float(min(earliest.items(), key=lambda kv: (kv[1][0], kv[1][1]))[0])
    elif wind_from is not None:
        approach_bearing = float(wind_from)

    now_wet = bool(precip) and precip[0] >= WET_MM
    first_wet = next((i for i, v in enumerate(precip) if v >= WET_MM), None)
    base = {"cells": cells, "timeline": timeline, "approach_from_bearing": approach_bearing,
            "approach_from": compass(approach_bearing) if approach_bearing is not None else None}

    if now_wet:
        dry = next((i for i, v in enumerate(precip) if v < WET_MM), None)
        remaining = dry * 15 if dry is not None else None
        msg = (f"Raining now — likely easing in about {remaining} minutes." if remaining
               else "Raining now, and it looks set to continue for a few hours.")
        return RainNowcast(status="raining", minutes_until=0, minutes_remaining=remaining,
                           intensity_label=_intensity_label(max(precip[:4])), message=msg, **base)
    if first_wet is not None:
        minutes = first_wet * 15
        where = f" from the {base['approach_from']}" if base["approach_from"] else ""
        return RainNowcast(status="approaching", minutes_until=minutes,
                           intensity_label=_intensity_label(max(precip[first_wet:first_wet + 4])),
                           message=f"Rain approaching{where} — expected in about {minutes} minutes.", **base)
    hours = len(precip) * 15 // 60 or 4
    return RainNowcast(status="clear", message=f"No rain expected in the next {hours} hours.", **base)
