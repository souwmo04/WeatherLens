"""DEMO MODE DATA — clearly separated from live data.

Each scenario synthesizes a payload shaped exactly like an Open-Meteo forecast
response for Dhaka, so demo data flows through the *same* normalization,
insight, story and AI pipeline as live data. Deterministic (seeded) so the
portfolio demo looks the same every time.
"""
import math
import random
from datetime import datetime, timedelta, timezone

from app.models.weather import NowcastSlot, RainCell, RainNowcast

DHAKA = {"name": "Dhaka", "country": "Bangladesh", "admin1": "Dhaka Division",
         "latitude": 23.81, "longitude": 90.41, "timezone": "Asia/Dhaka", "utc_offset_seconds": 21_600}

SCENARIOS = ("sunny", "cloudy", "rain", "storm", "night", "sunset")

# (current local time "HH:MM", daily min, daily max, per-hour weather-code plan, per-hour rain prob plan)
_PLAN: dict[str, dict] = {
    # Matches the spec's hero example: partly cloudy, warm & humid, rain arriving late afternoon.
    "sunny": {"now": "10:20", "tmin": 26, "tmax": 32, "hum": 72,
              "codes": {range(0, 6): 1, range(6, 12): 1, range(12, 15): 2, range(15, 16): 3,
                        range(16, 19): 61, range(19, 21): 80, range(21, 24): 3},
              "probs": {range(0, 12): 5, range(12, 15): 20, range(15, 16): 45, range(16, 19): 72,
                        range(19, 21): 55, range(21, 24): 25}},
    "cloudy": {"now": "14:30", "tmin": 25, "tmax": 29, "hum": 80,
               "codes": {range(0, 8): 2, range(8, 15): 3, range(15, 18): 61, range(18, 24): 3},
               "probs": {range(0, 8): 10, range(8, 14): 25, range(14, 15): 45, range(15, 18): 70, range(18, 24): 30}},
    "rain": {"now": "15:10", "tmin": 24, "tmax": 28, "hum": 90,
             "codes": {range(0, 9): 2, range(9, 12): 3, range(12, 14): 61, range(14, 18): 63,
                       range(18, 20): 61, range(20, 24): 3},
             "probs": {range(0, 9): 15, range(9, 12): 40, range(12, 14): 75, range(14, 18): 90,
                       range(18, 20): 65, range(20, 24): 30}},
    "storm": {"now": "16:40", "tmin": 24, "tmax": 30, "hum": 88,
              "codes": {range(0, 10): 2, range(10, 14): 3, range(14, 16): 63, range(16, 19): 95,
                        range(19, 21): 65, range(21, 24): 61},
              "probs": {range(0, 10): 15, range(10, 14): 45, range(14, 16): 80, range(16, 19): 95,
                        range(19, 21): 85, range(21, 24): 60}},
    "night": {"now": "22:15", "tmin": 25, "tmax": 31, "hum": 76,
              "codes": {range(0, 24): 0},
              "probs": {range(0, 24): 5}},
    "sunset": {"now": "17:35", "tmin": 25, "tmax": 31, "hum": 68,
               "codes": {range(0, 12): 0, range(12, 17): 1, range(17, 24): 1},
               "probs": {range(0, 24): 5}},
}


def _lookup(table: dict, hour: int, default):
    for rng, v in table.items():
        if hour in rng:
            return v
    return default


def _diurnal(hour: float, tmin: float, tmax: float) -> float:
    # coolest ~05:00, warmest ~14:00
    phase = math.cos((hour - 14) / 24 * 2 * math.pi)
    return tmin + (tmax - tmin) * (phase + 1) / 2


def _today_in_dhaka() -> datetime:
    return datetime.now(timezone(timedelta(seconds=DHAKA["utc_offset_seconds"]))).replace(tzinfo=None)


def build_payload(scenario: str) -> dict:
    if scenario not in _PLAN:
        raise KeyError(scenario)
    plan = _PLAN[scenario]
    rnd = random.Random(f"weatherlens-{scenario}")
    today = _today_in_dhaka().replace(hour=0, minute=0, second=0, microsecond=0)
    sunrise_t, sunset_t = timedelta(hours=5, minutes=48), timedelta(hours=17, minutes=42)

    hourly: dict[str, list] = {k: [] for k in (
        "time", "temperature_2m", "apparent_temperature", "precipitation_probability", "precipitation",
        "weather_code", "wind_speed_10m", "wind_direction_10m", "relative_humidity_2m", "uv_index",
        "cloud_cover", "visibility", "is_day")}
    for d in range(7):
        # later days drift towards a generic pattern so the week has variety
        day_plan = plan if d == 0 else _PLAN[("sunny", "cloudy", "rain", "sunny", "cloudy", "sunny")[(d + len(scenario)) % 6]]
        for h in range(24):
            ts = today + timedelta(days=d, hours=h)
            code = _lookup(day_plan["codes"], h, 1)
            prob = _lookup(day_plan["probs"], h, 10)
            wet = code >= 51
            temp = _diurnal(h, plan["tmin"] + d * 0.2, plan["tmax"] - (1.5 if wet else 0) + rnd.uniform(-0.6, 0.6))
            hum = min(98, plan["hum"] + (10 if wet else 0) - (8 if 11 <= h <= 16 else 0) + rnd.randint(-3, 3))
            feels = temp + max(0, (hum - 40) * 0.09) * (1 if temp > 24 else 0)
            is_day = 1 if sunrise_t <= timedelta(hours=h) < sunset_t else 0
            uv = max(0.0, 9.5 * math.sin(math.pi * (h - 6) / 12)) if is_day else 0.0
            if code >= 3:
                uv *= 0.45
            wind = 9 + rnd.uniform(-3, 4) + (22 if code >= 95 else 8 if wet else 0)
            hourly["time"].append(ts.isoformat(timespec="minutes"))
            hourly["temperature_2m"].append(round(temp, 1))
            hourly["apparent_temperature"].append(round(feels, 1))
            hourly["precipitation_probability"].append(min(100, max(0, prob + rnd.randint(-4, 4))))
            hourly["precipitation"].append(round((4.5 if code >= 95 else 2.4 if code in (63, 65) else 0.8) if wet else 0.0, 1))
            hourly["weather_code"].append(code)
            hourly["wind_speed_10m"].append(round(wind, 1))
            hourly["wind_direction_10m"].append(200 + rnd.randint(-25, 25))
            hourly["relative_humidity_2m"].append(hum)
            hourly["uv_index"].append(round(uv, 1))
            hourly["cloud_cover"].append({0: 5, 1: 20, 2: 45, 3: 90}.get(code, 95))
            hourly["visibility"].append(4_000 if code >= 95 else 8_000 if wet else 12_000 if scenario != "night" else 10_000)
            hourly["is_day"].append(is_day)

    daily: dict[str, list] = {k: [] for k in (
        "time", "weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max",
        "precipitation_sum", "sunrise", "sunset", "uv_index_max", "wind_speed_10m_max")}
    for d in range(7):
        sl = slice(d * 24, d * 24 + 24)
        day = today + timedelta(days=d)
        codes = hourly["weather_code"][sl]
        daily["time"].append(day.date().isoformat())
        daily["weather_code"].append(max(codes))
        daily["temperature_2m_max"].append(max(hourly["temperature_2m"][sl]))
        daily["temperature_2m_min"].append(min(hourly["temperature_2m"][sl]))
        daily["precipitation_probability_max"].append(max(hourly["precipitation_probability"][sl]))
        daily["precipitation_sum"].append(round(sum(hourly["precipitation"][sl]), 1))
        daily["sunrise"].append((day + sunrise_t).isoformat(timespec="minutes"))
        daily["sunset"].append((day + sunset_t).isoformat(timespec="minutes"))
        daily["uv_index_max"].append(max(hourly["uv_index"][sl]))
        daily["wind_speed_10m_max"].append(max(hourly["wind_speed_10m"][sl]))

    hh, mm = (int(x) for x in plan["now"].split(":"))
    now_idx = hh
    code_now = hourly["weather_code"][now_idx]
    current = {
        "time": (today + timedelta(hours=hh, minutes=mm)).isoformat(timespec="minutes"),
        "temperature_2m": round(_diurnal(hh + mm / 60, plan["tmin"], plan["tmax"]) - (1.5 if code_now >= 51 else 0), 1),
        "relative_humidity_2m": hourly["relative_humidity_2m"][now_idx],
        "is_day": hourly["is_day"][now_idx] if scenario != "sunset" else 1,
        "precipitation": 0.6 if code_now >= 51 else 0.0,
        "weather_code": code_now,
        "cloud_cover": hourly["cloud_cover"][now_idx],
        "pressure_msl": 1004.2 if scenario == "storm" else 1008.6,
        "wind_speed_10m": hourly["wind_speed_10m"][now_idx],
        "wind_direction_10m": hourly["wind_direction_10m"][now_idx],
        "wind_gusts_10m": round(hourly["wind_speed_10m"][now_idx] * (2.4 if scenario == "storm" else 1.6), 1),
        "uv_index": hourly["uv_index"][now_idx],
        "visibility": hourly["visibility"][now_idx],
    }
    current["apparent_temperature"] = round(current["temperature_2m"] + max(0, (current["relative_humidity_2m"] - 40) * 0.09), 1)
    return {"latitude": DHAKA["latitude"], "longitude": DHAKA["longitude"], "timezone": DHAKA["timezone"],
            "utc_offset_seconds": DHAKA["utc_offset_seconds"], "current": current, "hourly": hourly, "daily": daily}


DEMO_AIR_QUALITY = {"current": {"us_aqi": 118, "pm2_5": 42.5, "pm10": 71.0, "ozone": 38.0, "nitrogen_dioxide": 21.0}}


def demo_nowcast(scenario: str, now: str) -> RainNowcast:
    base = datetime.fromisoformat(now).replace(minute=(datetime.fromisoformat(now).minute // 15) * 15)
    def slots(values: list[float]) -> list[NowcastSlot]:
        return [NowcastSlot(time=(base + timedelta(minutes=15 * i)).isoformat(timespec="minutes"), precipitation=v)
                for i, v in enumerate(values)]
    if scenario == "cloudy":
        return RainNowcast(
            status="approaching", minutes_until=24, intensity_label="Moderate rain",
            approach_from_bearing=225, approach_from="south-west",
            message="Rain approaching from the south-west — expected in about 24 minutes.",
            cells=[RainCell(bearing=225, distance_km=9, intensity=1.4), RainCell(bearing=250, distance_km=16, intensity=0.9),
                   RainCell(bearing=200, distance_km=21, intensity=0.6)],
            timeline=slots([0, 0, 0.3, 0.9, 1.4, 1.2, 0.8, 0.5, 0.2, 0.1, 0, 0]), source="demo")
    if scenario in ("rain", "storm"):
        heavy = scenario == "storm"
        return RainNowcast(
            status="raining", minutes_until=0, minutes_remaining=75 if heavy else 50,
            intensity_label="Heavy rain" if heavy else "Light to moderate rain",
            approach_from_bearing=210, approach_from="south-west",
            message=("Thunderstorm overhead — easing in about 75 minutes." if heavy
                     else "Raining now — likely easing in about 50 minutes."),
            cells=[RainCell(bearing=210, distance_km=3, intensity=3.2 if heavy else 1.1),
                   RainCell(bearing=240, distance_km=12, intensity=2.1 if heavy else 0.8),
                   RainCell(bearing=180, distance_km=18, intensity=1.2 if heavy else 0.4)],
            timeline=slots([2.8, 3.4, 3.0, 2.2, 1.4, 0.6, 0.2, 0, 0, 0, 0, 0] if heavy
                           else [1.1, 1.0, 0.8, 0.4, 0.1, 0, 0, 0, 0, 0, 0, 0]), source="demo")
    return RainNowcast(status="clear", message="No rain expected in the next 3 hours.", cells=[],
                       timeline=slots([0] * 12), source="demo")
