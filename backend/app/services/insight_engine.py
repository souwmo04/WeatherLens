"""The WeatherLens interpretation layer.

Deterministic, data-grounded rules that turn normalized weather into meaning:
headline sentence, "what it means for you" recommendations, daily story, mood,
and per-activity assessments. Every statement cites a number from the input,
so nothing here can invent weather. The AI service reuses these helpers.
"""
from collections.abc import Iterable
from dataclasses import dataclass

from app.models.ai import UserPreferences
from app.models.weather import (
    AirQuality, CurrentWeather, DailyPoint, DailyStory, HourlyPoint, Insight, Mood,
    Recommendation, StorySegment,
)
from app.services.normalize import parse_local
from app.utils.wmo import Condition, is_wet

SEVERITY: dict[Condition, int] = {
    "clear": 0, "mostly_clear": 1, "partly_cloudy": 2, "cloudy": 3, "haze": 3, "fog": 4,
    "drizzle": 5, "snow": 6, "rain": 7, "heavy_rain": 8, "storm": 9,
}
RAIN_LIKELY = 50
RAIN_POSSIBLE = 30


# ---------------------------------------------------------------- formatting

def fmt_hour(ts: str) -> str:
    h = parse_local(ts).hour
    suffix = "AM" if h < 12 else "PM"
    return f"{(h % 12) or 12} {suffix}"


def fmt_clock(ts: str) -> str:
    d = parse_local(ts)
    return f"{(d.hour % 12) or 12}:{d.minute:02d} {'AM' if d.hour < 12 else 'PM'}"


def period_of(ts: str) -> str:
    h = parse_local(ts).hour
    if 5 <= h < 12:
        return "morning"
    if 12 <= h < 17:
        return "afternoon"
    if 17 <= h < 21:
        return "evening"
    return "night"


def t(v: float | None) -> str:
    return "n/a" if v is None else f"{round(v)}°"


def pct(v: float | None) -> str:
    return "n/a" if v is None else f"{round(v)}%"


def aqi_category(aqi: float | None) -> str | None:
    if aqi is None:
        return None
    for limit, name in ((50, "Good"), (100, "Moderate"), (150, "Unhealthy for sensitive groups"),
                        (200, "Unhealthy"), (300, "Very unhealthy")):
        if aqi <= limit:
            return name
    return "Hazardous"


# ---------------------------------------------------------------- windows

def day_window(hourly: list[HourlyPoint], now: str, min_hours: int = 10) -> list[HourlyPoint]:
    """Remaining hours of the local day (at least `min_hours`, so late evenings look ahead)."""
    today = now[:10]
    rest = [p for p in hourly if p.time[:10] == today]
    if len(rest) < min_hours:
        rest = hourly[:max(min_hours, len(rest))]
    return rest


def wet_hour(p: HourlyPoint) -> bool:
    return is_wet(p.condition) or (p.precipitation_probability or 0) >= RAIN_LIKELY


def rain_phrase(p: HourlyPoint) -> str:
    """Wording that never overstates the probability."""
    prob = p.precipitation_probability or 0
    if prob >= RAIN_LIKELY:
        return "rain likely"
    if prob >= RAIN_POSSIBLE or is_wet(p.condition):
        return "showers possible"
    return "should be dry"


def peak_rain(points: Iterable[HourlyPoint]) -> HourlyPoint | None:
    pts = [p for p in points if p.precipitation_probability is not None]
    return max(pts, key=lambda p: p.precipitation_probability or 0, default=None)


def first_wet(points: list[HourlyPoint]) -> HourlyPoint | None:
    return next((p for p in points if wet_hour(p)), None)


def first_dry_after(points: list[HourlyPoint]) -> HourlyPoint | None:
    return next((p for p in points if not wet_hour(p)), None)


def hour_at(hourly: list[HourlyPoint], hhmm: str, day: str | None = None) -> HourlyPoint | None:
    """The hourly point at local HH:MM (today, or `day`), or the next occurrence."""
    try:
        hh = int(hhmm.split(":")[0])
    except (ValueError, IndexError):
        return None
    if day:
        return next((p for p in hourly if p.time[:10] == day and parse_local(p.time).hour == hh), None)
    return next((p for p in hourly if parse_local(p.time).hour == hh), None)


# ---------------------------------------------------------------- headline

def feel_word(feels: float) -> str:
    for limit, word in ((0, "Freezing"), (8, "Cold"), (15, "Cool"), (22, "Mild"), (31, "Warm"), (38, "Hot")):
        if feels < limit:
            return word
    return "Very hot"


def headline(current: CurrentWeather, window: list[HourlyPoint], today: DailyPoint | None) -> str:
    peak_feel = max([p.feels_like or p.temperature for p in window] + [current.feels_like])
    first = feel_word(peak_feel if current.is_day else current.feels_like)
    humid = (current.humidity or 0) >= 70 and current.temperature >= 24
    when = "today" if current.is_day else "tonight"
    part1 = f"{first} and humid {when}." if humid else f"{first} {when}."

    if wet_hour_now(current):
        dry = first_dry_after(window[1:])
        part2 = f"Rain should ease around {fmt_hour(dry.time)}." if dry else "Rain likely continues for a while."
    else:
        wet = first_wet(window[1:])
        peak = peak_rain(window)
        if wet:
            storm = any(p.condition == "storm" for p in window)
            kind = "Thunderstorms" if storm else "Rain"
            part2 = f"{kind} may arrive {when_phrase(wet.time)} (around {fmt_hour(wet.time)})."
        elif peak and (peak.precipitation_probability or 0) >= RAIN_POSSIBLE:
            part2 = f"A slight chance of showers around {fmt_hour(peak.time)}."
        elif today and (today.uv_index_max or 0) >= 8 and current.is_day:
            part2 = f"Dry, with very strong sun — UV peaks at {round(today.uv_index_max or 0)}."
        elif (current.wind_gusts or 0) >= 40:
            part2 = f"Dry but gusty, up to {round(current.wind_gusts or 0)} km/h."
        else:
            part2 = "Staying dry." if current.is_day else "Staying dry overnight."
    return f"{part1} {part2}"


def wet_hour_now(current: CurrentWeather) -> bool:
    return is_wet(current.condition)


def when_phrase(ts: str) -> str:
    return {"morning": "this morning", "afternoon": "later this afternoon",
            "evening": "this evening", "night": "overnight"}[period_of(ts)]


# ---------------------------------------------------------------- recommendations

def recommendations(current: CurrentWeather, window: list[HourlyPoint], today: DailyPoint | None,
                    aq: AirQuality | None, prefs: UserPreferences | None = None) -> Insight:
    feels = [p.feels_like or p.temperature for p in window] or [current.feels_like]
    fmax, fmin = max(feels + [current.feels_like]), min(feels + [current.feels_like])
    peak = peak_rain(window)
    peak_p = (peak.precipitation_probability or 0) if peak else 0
    wet_now = wet_hour_now(current)
    storm = any(p.condition == "storm" for p in window) or current.condition == "storm"
    heavy = any(p.condition == "heavy_rain" for p in window)
    uv_max = max([p.uv_index or 0 for p in window if p.is_day] + [current.uv_index or 0])
    gust = current.wind_gusts or 0

    take: list[Recommendation] = []
    if wet_now or peak_p >= 40:
        reason = "It's raining now" if wet_now else f"Rain chance peaks at {pct(peak_p)} around {fmt_hour(peak.time)}"  # type: ignore[union-attr]
        take.append(Recommendation(icon="umbrella", label="Umbrella", reason=reason))
    if storm or heavy or (peak_p >= 60 and gust >= 30):
        take.append(Recommendation(icon="cloud-rain", label="Rain jacket",
                                   reason="Heavy rain or storms expected" if (storm or heavy) else "Wind-driven rain"))
    if fmax >= 30:
        take.append(Recommendation(icon="droplet", label="Water bottle", reason=f"Feels like up to {t(fmax)}"))
    if uv_max >= 6:
        take.append(Recommendation(icon="sun", label="Sunscreen", reason=f"UV index reaches {round(uv_max)}"))
    elif uv_max >= 4 and not wet_now:
        take.append(Recommendation(icon="glasses", label="Sunglasses", reason=f"UV index reaches {round(uv_max)}"))
    if aq and aq.us_aqi is not None and aq.us_aqi > 100:
        take.append(Recommendation(icon="wind", label="Face mask",
                                   reason=f"Air quality: {aq.category} (AQI {round(aq.us_aqi)})"))
    if fmin < 15 and fmax - fmin >= 6:
        take.append(Recommendation(icon="shirt", label="Extra layer", reason=f"Drops to {t(fmin)} later"))
    if not take:
        take.append(Recommendation(icon="check", label="Nothing extra", reason="Conditions are easy-going"))

    wear: list[Recommendation] = []
    if fmax >= 30:
        wear += [Recommendation(icon="shirt", label="Light, breathable T-shirt"),
                 Recommendation(icon="shirt", label="Breathable trousers or shorts")]
    elif fmax >= 22:
        wear += [Recommendation(icon="shirt", label="T-shirt or light shirt"),
                 Recommendation(icon="shirt", label="Light trousers")]
    elif fmax >= 15:
        wear += [Recommendation(icon="shirt", label="Long sleeves"),
                 Recommendation(icon="shirt", label="Light jacket")]
    elif fmax >= 8:
        wear += [Recommendation(icon="shirt", label="Sweater"), Recommendation(icon="shirt", label="Warm jacket")]
    else:
        wear += [Recommendation(icon="shirt", label="Insulated coat"),
                 Recommendation(icon="shirt", label="Hat, scarf and gloves")]
    if wet_now or peak_p >= 50:
        wear.append(Recommendation(icon="footprints", label="Water-resistant shoes", reason="Wet streets likely"))
    else:
        wear.append(Recommendation(icon="footprints", label="Sneakers"))
    if fmax - fmin >= 8:
        wear.append(Recommendation(icon="layers", label="Layers", reason=f"{t(fmin)} to {t(fmax)} today"))

    travel = travel_note(current, window, prefs)
    outdoor = outdoor_note(window)
    personal = personal_notes(window, prefs, aq) if prefs else []

    return Insight(headline=headline(current, window, today), take=take, wear=wear,
                   travel=travel, outdoor=outdoor, personal=personal)


def travel_note(current: CurrentWeather, window: list[HourlyPoint], prefs: UserPreferences | None) -> str:
    storm = next((p for p in window if p.condition == "storm"), None)
    if storm:
        return f"Thunderstorms possible around {fmt_hour(storm.time)} — allow extra time and avoid open areas."
    if current.visibility_km is not None and current.visibility_km < 2:
        return f"Visibility is only {current.visibility_km} km — drive slowly and use headlights."
    if (current.wind_gusts or 0) >= 50:
        return f"Strong gusts up to {round(current.wind_gusts or 0)} km/h — take care on bikes and bridges."

    commute_hours: list[tuple[str, str]] = []
    if prefs and prefs.departure_time:
        commute_hours.append((prefs.departure_time, "departure"))
    if prefs and prefs.return_time:
        commute_hours.append((prefs.return_time, "return trip"))
    for hhmm, label in commute_hours:
        p = hour_at(window, hhmm)
        if p and wet_hour(p):
            return f"Rain likely around your {label} at {fmt_hour(p.time)} ({pct(p.precipitation_probability)})."

    for p in window:
        h = parse_local(p.time).hour
        if wet_hour(p) and (7 <= h <= 10 or 16 <= h <= 20):
            leg = "morning" if h <= 10 else "evening"
            return f"Rain may affect your {leg} commute (around {fmt_hour(p.time)}, {pct(p.precipitation_probability)})."
    if wet_hour_now(current):
        return "Roads are wet right now — expect slower traffic."
    return "No weather delays expected on the roads."


def hour_score(p: HourlyPoint) -> float:
    """0 (bad) … 1 (great) for being outside."""
    s = 1.0
    prob = p.precipitation_probability or 0
    s -= min(prob, 100) / 100 * 0.9
    if is_wet(p.condition):
        s -= 0.5
    f = p.feels_like or p.temperature
    if f > 32:
        s -= min((f - 32) * 0.07, 0.6)
    if f < 10:
        s -= min((10 - f) * 0.05, 0.5)
    if (p.uv_index or 0) >= 8:
        s -= 0.15
    if (p.wind_speed or 0) > 35:
        s -= 0.25
    return max(0.0, s)


def outdoor_note(window: list[HourlyPoint]) -> str:
    daylight = [p for p in window if p.is_day]
    if window and not window[0].is_day and parse_local(window[0].time).hour >= 17:
        good = [p for p in window[:3] if hour_score(p) >= 0.6]
        return "Pleasant for an evening walk." if len(good) >= 2 else "Better to stay in tonight."
    if not daylight:
        good = [p for p in window[:6] if hour_score(p) >= 0.6]
        return "Pleasant for an evening walk." if good else "Better to stay in tonight."
    scores = [(p, hour_score(p)) for p in daylight]
    best_run: list[HourlyPoint] = []
    run: list[HourlyPoint] = []
    for p, s in scores:
        if s >= 0.6:
            run.append(p)
            if len(run) > len(best_run):
                best_run = run.copy()
        else:
            run = []
    if not best_run:
        return "Not ideal today — rain or heat dominate the daylight hours."
    start, end = best_run[0], best_run[-1]
    if len(best_run) == len(daylight):
        return "Good all day."
    if start is daylight[0]:
        return f"Good before {fmt_hour(_next_hour(end.time))}."
    if end is daylight[-1]:
        return f"Best after {fmt_hour(start.time)}."
    return f"Best between {fmt_hour(start.time)} and {fmt_hour(_next_hour(end.time))}."


def _next_hour(ts: str) -> str:
    from datetime import timedelta
    return (parse_local(ts) + timedelta(hours=1)).isoformat(timespec="minutes")


# ---------------------------------------------------------------- activities

@dataclass
class ActivityVerdict:
    rating: str  # "good" | "fair" | "poor"
    reasons: list[str]


ACTIVITY_ALIASES = {
    "cycling": "cycling", "cycle": "cycling", "bike": "cycling", "biking": "cycling",
    "running": "running", "run": "running", "jog": "running", "jogging": "running", "exercise": "running",
    "workout": "running", "walk": "walking", "walking": "walking", "hiking": "walking", "hike": "walking",
    "photography": "photography", "photo": "photography", "photos": "photography",
    "football": "sports", "cricket": "sports", "sports": "sports", "tennis": "sports", "picnic": "picnic",
}


def assess_activity(activity: str, p: HourlyPoint, aq: AirQuality | None = None) -> ActivityVerdict:
    kind = ACTIVITY_ALIASES.get(activity.lower(), "walking")
    reasons: list[str] = []
    rating = 2  # 2 good, 1 fair, 0 poor
    prob = p.precipitation_probability or 0
    f = p.feels_like if p.feels_like is not None else p.temperature
    wind = p.wind_speed or 0

    def worsen(to: int, why: str) -> None:
        nonlocal rating
        rating = min(rating, to)
        reasons.append(why)

    if p.condition == "storm":
        worsen(0, "thunderstorms are forecast")
    if prob >= 60 or p.condition in ("rain", "heavy_rain"):
        if kind == "photography" and p.condition != "heavy_rain":
            worsen(1, f"rain probability is {pct(prob)} — moody shots, but protect your gear")
        else:
            worsen(0, f"rain probability reaches {pct(prob)}")
    elif prob >= RAIN_POSSIBLE:
        worsen(1, f"there's a {pct(prob)} chance of rain")
    active = kind in ("cycling", "running", "sports")
    if active and f >= 38:
        worsen(0, f"it feels like {t(f)}")
    elif active and f >= 33:
        worsen(1, f"it feels like {t(f)} — hydrate well")
    elif f >= 38:
        worsen(1, f"it feels like {t(f)}")
    if f <= 3:
        worsen(1, f"it feels like {t(f)}")
    if kind == "cycling" and wind >= 30:
        worsen(0 if wind >= 45 else 1, f"wind is {round(wind)} km/h")
    elif wind >= 45:
        worsen(1, f"wind is {round(wind)} km/h")
    if active and aq and aq.us_aqi is not None and aq.us_aqi > 150:
        worsen(0, f"air quality is unhealthy (AQI {round(aq.us_aqi)})")
    elif active and aq and aq.us_aqi is not None and aq.us_aqi > 100:
        worsen(1, f"air quality is poor for exertion (AQI {round(aq.us_aqi)})")
    if kind == "photography" and rating == 2:
        cc = p.cloud_cover
        if cc is not None and 20 <= cc <= 70:
            reasons.append(f"{round(cc)}% cloud cover adds texture to the sky")
        elif p.condition == "fog":
            reasons.append("fog gives soft, atmospheric light")
    if not reasons:
        reasons.append(f"{t(f)} feels-like, {pct(prob)} rain chance, wind {round(wind)} km/h")
    return ActivityVerdict(rating=("poor", "fair", "good")[rating], reasons=reasons)


def personal_notes(window: list[HourlyPoint], prefs: UserPreferences | None, aq: AirQuality | None) -> list[str]:
    if not prefs:
        return []
    notes: list[str] = []
    for activity in prefs.activities[:3]:
        hhmm = prefs.activity_time or "17:00"
        p = hour_at(window, hhmm)
        if not p:
            continue
        v = assess_activity(activity, p, aq)
        name = activity.capitalize()
        joined = " and ".join(v.reasons[:2])
        if v.rating == "poor":
            notes.append(f"{name} conditions are poor today because {joined} around {fmt_hour(p.time)}.")
        elif v.rating == "fair":
            notes.append(f"{name} at {fmt_hour(p.time)} is possible, but {joined}.")
        else:
            notes.append(f"{name} at {fmt_hour(p.time)} looks good — {joined}.")
    if prefs.work and prefs.departure_time:
        p = hour_at(window, prefs.departure_time)
        if p:
            notes.append(f"Heading to {prefs.work} at {fmt_hour(p.time)}: {rain_phrase(p)}, {t(p.temperature)}, "
                         f"{pct(p.precipitation_probability)} rain chance.")
    if prefs.work and prefs.return_time:
        p = hour_at(window, prefs.return_time)
        if p:
            notes.append(f"Coming back at {fmt_hour(p.time)}: {rain_phrase(p)} ({pct(p.precipitation_probability)}).")
    return notes


# ---------------------------------------------------------------- story & mood

PERIODS = (("Morning", 6, 11), ("Afternoon", 12, 16), ("Evening", 17, 20), ("Night", 21, 26))
ADJ = {
    "Stormy": "stormy", "Rainy": "rainy", "Drizzly": "drizzly", "Misty": "misty", "Snowy": "snowy",
    "Hot": "hot", "Warm": "warm", "Comfortable": "comfortable", "Pleasant": "pleasant", "Cool": "cool",
    "Cold": "cold", "Cooler": "cooler", "Clear": "clear", "Grey": "grey", "Hazy": "hazy",
}


def story_for(hourly_all: list[HourlyPoint], day: str) -> DailyStory:
    from datetime import date, timedelta
    next_day = (date.fromisoformat(day) + timedelta(days=1)).isoformat()
    segments: list[StorySegment] = []
    afternoon_temp: float | None = None
    for name, start, end in PERIODS:
        pts = []
        for p in hourly_all:
            hr = parse_local(p.time).hour
            d = p.time[:10]
            if (d == day and start <= hr <= min(end, 23)) or (end > 23 and d == next_day and hr <= end - 24):
                pts.append(p)
        if not pts:
            continue
        worst = max(pts, key=lambda p: SEVERITY[p.condition])
        rain = max((p.precipitation_probability or 0) for p in pts)
        temp = max(p.temperature for p in pts) if name == "Afternoon" else sum(p.temperature for p in pts) / len(pts)
        feels = max((p.feels_like or p.temperature) for p in pts)
        cond = worst.condition
        if cond == "storm":
            word = "Stormy"
        elif cond in ("rain", "heavy_rain") or rain >= 55:
            word = "Rainy"
            if cond not in ("rain", "heavy_rain"):
                cond = "rain"
        elif cond == "drizzle":
            word = "Drizzly"
        elif cond in ("fog", "haze"):
            word = "Misty" if cond == "fog" else "Hazy"
        elif cond == "snow":
            word = "Snowy"
        elif name == "Night" and afternoon_temp is not None and temp <= afternoon_temp - 3:
            word = "Cooler"
        elif feels >= 34:
            word = "Hot"
        elif feels >= 29:
            word = "Warm"
        elif feels >= 20:
            word = "Comfortable" if name == "Morning" else "Pleasant"
        elif feels >= 12:
            word = "Cool"
        else:
            word = "Cold"
        if name == "Afternoon":
            afternoon_temp = temp
        rep = next((p for p in pts if p.condition == cond), worst)
        segments.append(StorySegment(period=name, condition=cond, scene=rep.scene, temperature=round(temp, 1),
                                     rain_chance=rain, word=word))
    return DailyStory(segments=segments, sentence=story_sentence(segments))


def _article(word: str) -> str:
    return "An" if word[0].lower() in "aeiou" else "A"


def story_sentence(segments: list[StorySegment]) -> str:
    if not segments:
        return "Not enough forecast data to tell today's story."
    groups: list[tuple[str, list[str]]] = []
    for s in segments:
        adj = ADJ.get(s.word, s.word.lower())
        if groups and groups[-1][0] == adj:
            groups[-1][1].append(s.period.lower())
        else:
            groups.append((adj, [s.period.lower()]))
    if len(groups) == 1:
        return f"{_article(groups[0][0])} {groups[0][0]} day from start to finish."

    def phrase(g: tuple[str, list[str]], cap: bool = False) -> str:
        art = _article(g[0])
        art = art if cap else art.lower()
        periods = g[1]
        joined = periods[0] if len(periods) == 1 else f"{', '.join(periods[:-1])} and {periods[-1]}"
        return f"{art} {g[0]} {joined}"

    if len(groups) == 2:
        return f"{phrase(groups[0], True)} followed by {phrase(groups[1])}."
    head = ", ".join(phrase(g, i == 0) for i, g in enumerate(groups[:-1]))
    return f"{head}, then {phrase(groups[-1])}."


MOODS: dict[str, Mood] = {
    "sunny": Mood(key="energetic", label="Energetic", description="Bright light and open skies — a day with momentum."),
    "cloudy": Mood(key="calm", label="Calm", description="Soft, even light. Quiet skies, unhurried pace."),
    "rain": Mood(key="cozy", label="Cozy", description="The city slows to the sound of rain."),
    "storm": Mood(key="dramatic", label="Dramatic", description="Heavy skies and restless air — cinematic weather."),
    "night": Mood(key="peaceful", label="Peaceful", description="City lights under a still night sky."),
    "sunset": Mood(key="golden", label="Golden", description="Long shadows and warm light near the horizon."),
    "snow": Mood(key="crisp", label="Crisp", description="Muted sounds and clean, cold air."),
    "fog": Mood(key="hazy", label="Hazy", description="Soft edges everywhere — the skyline fades into grey."),
}


def mood_for(current: CurrentWeather) -> Mood:
    return MOODS[current.scene]
