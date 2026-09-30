"""Ask WeatherLens.

Grounding contract: the model only ever sees the normalized ForecastBundle +
rain nowcast built by our backend. The system prompt forbids inventing any
number and requires saying "unavailable" for missing data. Without an API key
(or if the API fails) a deterministic rule engine answers from the same data.
"""
import json
import logging
import re

import anthropic

from app.config import get_settings
from app.models.ai import AdviceRequest, AdviceResponse, UserPreferences
from app.models.weather import ForecastBundle, HourlyPoint, RainNowcast
from app.services import insight_engine as ie
from app.services.normalize import parse_local

log = logging.getLogger("weatherlens.ai")

SYSTEM_PROMPT = """You are WeatherLens, a calm, practical weather companion. You explain what the weather means for the user's plans.

Grounding rules — these are absolute:
- Use ONLY the JSON weather data in the latest <weather_data> block. It is the single source of truth.
- Never invent or estimate temperatures, rain probabilities, forecasts, alerts, air quality, wind, UV, or times that are not in the data.
- If the user asks about something the data doesn't cover (a date beyond the forecast, a place not in the data, alerts, pollen, tides, etc.), say plainly that this data isn't available to you.
- When you cite a number, it must appear in the data. Times are local to the location.
- The hourly list starts at the current hour. "Tonight" means hours after 18:00 today; "tomorrow" means the next calendar date.

Style:
- Answer in 2–5 short sentences or a few compact bullet points. Lead with the direct answer (yes/no/best time), then the reason with 1–3 specific numbers.
- Friendly, confident, no filler, no disclaimers about being an AI. No markdown headings. Use at most one emoji, only if it adds clarity.
- If the user shares a plan with times (e.g. leaving at 3 PM, returning at 8 PM), check the weather at each of those times specifically.
- Off-topic questions: briefly steer back to weather and the user's day."""


def _compact_hour(p: HourlyPoint) -> dict:
    return {
        "time": p.time, "temp_c": p.temperature, "feels_like_c": p.feels_like, "condition": p.condition_label,
        "rain_prob_pct": p.precipitation_probability, "rain_mm": p.precipitation, "wind_kmh": p.wind_speed,
        "humidity_pct": p.humidity, "uv": p.uv_index, "cloud_pct": p.cloud_cover,
    }


def build_context(bundle: ForecastBundle, rain: RainNowcast | None, prefs: UserPreferences | None) -> dict:
    c = bundle.current
    loc = bundle.location
    return {
        "location": {"name": loc.name, "country": loc.country, "timezone": loc.timezone},
        "data_source": bundle.source,
        "local_time_now": c.time,
        "current": {
            "temp_c": c.temperature, "feels_like_c": c.feels_like, "condition": c.condition_label,
            "humidity_pct": c.humidity, "wind_kmh": c.wind_speed, "gusts_kmh": c.wind_gusts,
            "wind_from_deg": c.wind_direction, "uv": c.uv_index, "visibility_km": c.visibility_km,
            "cloud_pct": c.cloud_cover, "is_day": c.is_day, "dew_point_c": c.dew_point,
            "pressure_hpa": c.pressure, "pressure_trend_3h": c.pressure_trend,
            "humidity_same_hour_yesterday_pct": c.humidity_yesterday,
            "measured_by": (f"{c.observation.station} weather station, {c.observation.distance_km} km away, "
                            f"{c.observation.age_min} min ago") if c.observation else "forecast model",
        },
        "rain_nowcast": None if rain is None else {
            "status": rain.status, "minutes_until_rain": rain.minutes_until,
            "minutes_until_dry": rain.minutes_remaining, "intensity": rain.intensity_label,
            "arriving_from": rain.approach_from, "summary": rain.message,
        },
        "hourly_next_36h": [_compact_hour(p) for p in bundle.hourly[:36]],
        "daily_7d": [{
            "date": d.date, "max_c": d.temp_max, "min_c": d.temp_min, "condition": d.condition_label,
            "rain_prob_max_pct": d.precipitation_probability_max, "rain_sum_mm": d.precipitation_sum,
            "sunrise": d.sunrise, "sunset": d.sunset, "uv_max": d.uv_index_max, "wind_max_kmh": d.wind_speed_max,
        } for d in bundle.daily],
        "air_quality": None if bundle.air_quality is None else {
            "us_aqi": bundle.air_quality.us_aqi, "category": bundle.air_quality.category,
            "pm2_5": bundle.air_quality.pm2_5,
        },
        "weather_alerts": "not available from this data source",
        "user_preferences": prefs.model_dump(exclude_none=True) if prefs else None,
    }


def _data_points(bundle: ForecastBundle, rain: RainNowcast | None) -> list[str]:
    c = bundle.current
    pts = [f"Now {ie.t(c.temperature)} (feels {ie.t(c.feels_like)}), {c.condition_label.lower()}",
           f"Humidity {ie.pct(c.humidity)}, wind {round(c.wind_speed or 0)} km/h"]
    peak = ie.peak_rain(bundle.hourly[:18])
    if peak:
        pts.append(f"Peak rain chance {ie.pct(peak.precipitation_probability)} at {ie.fmt_hour(peak.time)}")
    if rain:
        pts.append(rain.message)
    if bundle.air_quality and bundle.air_quality.us_aqi is not None:
        pts.append(f"AQI {round(bundle.air_quality.us_aqi)} ({bundle.air_quality.category})")
    return pts


# ---------------------------------------------------------------- Claude

_client: anthropic.AsyncAnthropic | None = None


def _claude() -> anthropic.AsyncAnthropic | None:
    global _client
    s = get_settings()
    if not s.anthropic_api_key:
        return None
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=s.anthropic_api_key, timeout=45.0, max_retries=2)
    return _client


async def _ask_claude(req: AdviceRequest, context: dict) -> str | None:
    client = _claude()
    if client is None:
        return None
    s = get_settings()
    messages: list[dict] = [{"role": t.role, "content": t.content} for t in req.history[-8:]]
    # Keep the conversation well-formed: must start with a user turn.
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    data = json.dumps(context, separators=(",", ":"), sort_keys=True)
    messages.append({"role": "user", "content": f"<weather_data>{data}</weather_data>\n\n{req.question}"})
    try:
        response = await client.beta.messages.create(
            model=s.anthropic_model,
            max_tokens=2_000,
            system=SYSTEM_PROMPT,
            messages=messages,  # type: ignore[arg-type]
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        log.error("Anthropic API key rejected; falling back to rule engine")
        return None
    except anthropic.RateLimitError:
        log.warning("Anthropic rate limit; falling back to rule engine")
        return None
    except anthropic.APIStatusError as exc:
        log.warning("Anthropic API error %s; falling back to rule engine", exc.status_code)
        return None
    except anthropic.APIConnectionError:
        log.warning("Anthropic unreachable; falling back to rule engine")
        return None
    if response.stop_reason == "refusal":
        return None
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    return text or None


# ---------------------------------------------------------------- rule engine

_TIME_RE = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?", re.I)


def _times_in(question: str) -> list[int]:
    hours: list[int] = []
    for m in _TIME_RE.finditer(question):
        h = int(m.group(1))
        suffix = (m.group(3) or "").lower().replace(".", "")
        if not suffix and not m.group(2):
            continue  # a bare number is probably not a time
        if h > 23:
            continue
        if suffix == "pm" and h < 12:
            h += 12
        elif suffix == "am" and h == 12:
            h = 0
        elif not suffix and 1 <= h <= 7:
            h += 12  # "at 5" usually means 5 PM
        hours.append(h)
    return hours


def _find_hour(hourly: list[HourlyPoint], h: int, tomorrow: bool) -> HourlyPoint | None:
    if not hourly:
        return None
    day0 = hourly[0].time[:10]
    for p in hourly:
        d = p.time[:10]
        if parse_local(p.time).hour == h and ((d != day0) if tomorrow else True):
            return p
    return None


def _describe(p: HourlyPoint) -> str:
    return (f"{ie.fmt_hour(p.time)}: {p.condition_label.lower()}, {ie.t(p.temperature)} "
            f"(feels {ie.t(p.feels_like)}), {ie.pct(p.precipitation_probability)} rain chance, "
            f"wind {round(p.wind_speed or 0)} km/h")


def rule_answer(question: str, bundle: ForecastBundle, rain: RainNowcast | None,
                prefs: UserPreferences | None) -> str:
    q = question.lower()
    tomorrow = "tomorrow" in q
    c = bundle.current
    hourly = bundle.hourly
    if tomorrow and len(bundle.daily) > 1:
        day = bundle.daily[1].date
        window = [p for p in hourly if p.time[:10] == day and 6 <= parse_local(p.time).hour <= 22]
    else:
        window = ie.day_window(hourly, c.time)
    aq = bundle.air_quality
    times = _times_in(question)
    when_pts = [p for h in times if (p := _find_hour(hourly, h, tomorrow))]
    lines: list[str] = []

    def add(s: str) -> None:
        if s and s not in lines:
            lines.append(s)

    activity = next((a for a in ie.ACTIVITY_ALIASES if re.search(rf"\b{a}\b", q)), None)
    wants_umbrella = any(w in q for w in ("umbrella", "rain", "wet", "shower"))
    wants_wear = any(w in q for w in ("wear", "dress", "clothes", "outfit", "jacket"))
    wants_travel = any(w in q for w in ("commute", "travel", "drive", "traffic", "trip", "safe", "road"))
    wants_uni = any(w in q for w in ("university", "class", "campus", "school", "college", "office", "work"))
    wants_air = any(w in q for w in ("air quality", "aqi", "pollution", "smog", "mask"))
    wants_uv = any(w in q for w in ("uv", "sunscreen", "sunburn"))
    wants_sun = any(w in q for w in ("sunrise", "sunset", "golden hour"))
    wants_alerts = any(w in q for w in ("alert", "warning", "cyclone", "flood"))

    if wants_alerts:
        add("Official weather alerts aren't available in my data, so check your national weather service for warnings.")

    if activity:
        pts = when_pts or [max(window, key=ie.hour_score)] if window else []
        for p in pts[:2]:
            v = ie.assess_activity(activity, p, aq)
            verdict = {"good": "Yes — good conditions", "fair": "Possible, with caveats",
                       "poor": "Not a great idea"}[v.rating]
            add(f"{verdict} for {activity} at {ie.fmt_hour(p.time)}: {'; '.join(v.reasons[:2])}.")
        verdicts = [ie.assess_activity(activity, p, aq).rating for p in pts[:2]]
        if window and (not when_pts or "poor" in verdicts):
            best = max(window, key=ie.hour_score)
            if not when_pts or best.time not in {p.time for p in when_pts}:
                note = ie.outdoor_note(window).rstrip(".")
                add(f"Best window today: {note[0].lower() + note[1:]} "
                    f"(around {ie.fmt_hour(best.time)}: {ie.pct(best.precipitation_probability)} rain chance, "
                    f"feels {ie.t(best.feels_like)}).")

    if wants_uni or (len(when_pts) >= 2 and not activity):
        for p in when_pts[:3]:
            add(_describe(p) + ".")
        if any(ie.wet_hour(p) for p in when_pts):
            add("Carry an umbrella — at least one of those times looks wet.")
        elif when_pts:
            add("Both legs look dry; no umbrella needed.")

    if wants_umbrella and not activity:
        if when_pts:
            for p in when_pts[:2]:
                add(_describe(p) + ".")
            wet = any(ie.wet_hour(p) for p in when_pts)
            add("☂️ Yes, take an umbrella." if wet else "No umbrella needed at that time.")
        else:
            peak = ie.peak_rain(window)
            if ie.is_wet(c.condition):
                add(f"☂️ Yes — it's raining now ({c.condition_label.lower()}).")
            elif peak and (peak.precipitation_probability or 0) >= 40:
                add(f"☂️ Yes — rain chance reaches {ie.pct(peak.precipitation_probability)} around {ie.fmt_hour(peak.time)}.")
            elif peak:
                add(f"Probably not — the highest rain chance is {ie.pct(peak.precipitation_probability)} "
                    f"around {ie.fmt_hour(peak.time)}.")
        if rain and rain.status != "clear" and not tomorrow:
            add(rain.message)

    if wants_wear:
        ins = ie.recommendations(c, window, bundle.daily[1] if tomorrow and len(bundle.daily) > 1 else
                                 (bundle.daily[0] if bundle.daily else None), aq, prefs)
        feels = [p.feels_like or p.temperature for p in window] or [c.feels_like]
        add(f"Feels like {ie.t(min(feels))}–{ie.t(max(feels))}{' tomorrow' if tomorrow else ''}. "
            f"Wear: {', '.join(r.label.lower() for r in ins.wear)}.")

    if wants_travel:
        add(ie.travel_note(c, window, prefs))

    if wants_air:
        if aq and aq.us_aqi is not None:
            add(f"Air quality is {aq.category} (US AQI {round(aq.us_aqi)}, PM2.5 {aq.pm2_5 or 'n/a'} µg/m³)."
                + (" Consider a mask outdoors." if aq.us_aqi > 100 else ""))
        else:
            add("Air-quality data isn't available right now.")

    if wants_uv:
        uv = max((p.uv_index or 0) for p in window) if window else None
        if uv is None:
            add("UV data isn't available right now.")
        else:
            add(f"UV peaks at {round(uv)}" + (" — sunscreen recommended." if uv >= 6 else " — low to moderate."))

    if wants_sun:
        d = bundle.daily[1 if tomorrow and len(bundle.daily) > 1 else 0] if bundle.daily else None
        if d and d.sunrise and d.sunset:
            add(f"Sunrise {ie.fmt_clock(d.sunrise)}, sunset {ie.fmt_clock(d.sunset)}.")
        else:
            add("Sunrise and sunset times aren't available.")

    if not lines:
        if when_pts:
            for p in when_pts[:2]:
                add(_describe(p) + ".")
        elif tomorrow and len(bundle.daily) > 1:
            d = bundle.daily[1]
            add(f"Tomorrow: {d.condition_label.lower()}, {ie.t(d.temp_min)}–{ie.t(d.temp_max)}, "
                f"rain chance up to {ie.pct(d.precipitation_probability_max)}.")
        else:
            add(bundle.insight.headline)
            add(f"Right now: {ie.t(c.temperature)} (feels {ie.t(c.feels_like)}), {c.condition_label.lower()}.")
            add(f"Outdoors: {bundle.insight.outdoor}")
    return " ".join(lines)


async def advise(req: AdviceRequest, bundle: ForecastBundle, rain: RainNowcast | None) -> AdviceResponse:
    context = build_context(bundle, rain, req.preferences)
    answer = await _ask_claude(req, context)
    engine = "claude"
    if answer is None:
        answer = rule_answer(req.question, bundle, rain, req.preferences)
        engine = "rules"
    return AdviceResponse(answer=answer, engine=engine, data_points=_data_points(bundle, rain),  # type: ignore[arg-type]
                          location=bundle.location.name, source=bundle.source)
