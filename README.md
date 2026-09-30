<div align="center">

# 👁️‍🗨️ WeatherLens

### Weather, understood.

**An AI-powered weather companion that turns raw forecast data into decisions you can actually use.**

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-0F172A?logo=tailwindcss&logoColor=38BDF8)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?logo=python&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Claude-D97757)
![Open-Meteo](https://img.shields.io/badge/Data-Open--Meteo-4B6BFF)

</div>

---

## About

Most weather apps show you numbers — *29°C, 72%, 12 km/h* — and leave the thinking to you.
**WeatherLens explains what the weather means for your day.**

It renders the current conditions as a living, illustrated city — a *cinematic cartoon* world with drifting clouds,
rain that splashes on wet streets, lightning, city lights and a moonlit sky — so you feel the weather before you read
a single number. Then it interprets the forecast into practical answers:

- ☂️ **What should I carry?** — umbrella, water, sunscreen, a mask when the air is poor
- 👕 **What should I wear?** — based on how it will *feel*, not just the temperature
- 🚗 **Can I travel?** — rain on your commute, storms, low visibility, weather along your route
- 🌧️ **When will it rain?** — *"Rain approaching from the south-west in about 24 minutes"*
- 🤖 **Ask anything** — *"Can I go cycling at 5 PM?"* — answered by an AI that is only allowed to reason over real forecast data, never to invent it

Default demo city is **Dhaka, Bangladesh** (with its skyline — Kahn's National Parliament and a domed mosque), but
any city in the world works.

> Built as a portfolio project to demonstrate product design, frontend craft (animation, accessibility, responsive
> design) and backend engineering (API design, data normalization, grounded AI).

---

## Features

| | Feature | What it does |
|---|---|---|
| 🌆 | **Dynamic weather worlds** | Procedural illustrated skyline (Dhaka gets Kahn's Parliament + a mosque) in 8 worlds — sunny, cloudy, rain, storm, night, sunset, snow, fog. Canvas rain with wind slant and street splashes, lightning, fireflies, drifting clouds, parallax, reflections. Cloud cover veils the sun/moon. |
| ✨ | **What does today's weather mean for you?** | What to take · what to wear · travel · outdoors, each item citing the number behind it. |
| 👤 | **Personalized insights** | Home, work/university, commute times, favourite activities → *"Cycling conditions are poor today because rain probability reaches 79% around 5 PM."* |
| 🕐 | **Weather timeline** | 24/48-hour scroller with a smooth temperature curve, rain-probability bars, hover/tap/arrow-key detail. |
| 🌧️ | **Rain is coming** | 15-minute nowcast + ring sampling around you → *"Rain approaching from the south-west — expected in about 24 minutes"*, with an animated mini radar. |
| 🎬 | **Today in 30 seconds** | A story player: morning → afternoon → evening → night, each with its own weather world, plus *"Your day in one sentence."* |
| 🎭 | **Weather mood** | A subtle aesthetic read (Energetic, Cozy, Calm, Dramatic, Peaceful, Golden…). No health claims. |
| 🛣️ | **Route weather** | Geocode → OSRM road route → sample stops → forecast at each stop's ETA. Departure *or* arrival time. |
| 🗺️ | **Radar** | Leaflet map with animated RainViewer radar + temperature / wind / clouds / UV / air-quality layers sampled from the backend. |
| 🤖 | **Ask WeatherLens** | Chat assistant. Uses Claude when `ANTHROPIC_API_KEY` is set; otherwise a deterministic, data-grounded rule engine. Every answer shows the data it was grounded on. |
| 🌍 | **City explorer + Compare** | Scene cards for Dhaka, Chittagong, Rajshahi, London, Tokyo, New York, Sydney, Melbourne; any city via search; side-by-side comparison. |
| 🎞️ | **Demo mode** | One click to flip Dhaka through Sunny / Cloudy / Rain / Storm / Sunset / Night with consistent synthetic data. |
| 🌙 | **Dark mode, reduced motion, a11y** | Theme-aware tokens, `prefers-reduced-motion` stops all loops, keyboard-navigable listboxes, ARIA labels, visible focus, text labels beside every color. |
| 🔈 | **Rain ambience** | Optional generated rain sound (Web Audio, no files). Off by default. |

## Tech stack

**Frontend** — React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Motion (Framer Motion) · Lucide · Leaflet
**Backend** — Python 3.12 · FastAPI · Pydantic v2 · httpx · Anthropic SDK
**Data** — Open-Meteo (forecast, geocoding, air quality) · OSRM (routing) · Nominatim (place names) · RainViewer (radar tiles) · Esri Canvas basemaps — all free and keyless.

## Architecture

```
┌──────────── Frontend (React) ────────────┐        ┌──────────────── Backend (FastAPI) ────────────────┐
│ pages → components → hooks (useAsync)    │  /api  │ api/        routers, uniform JSON errors          │
│ services/http.ts  TTL cache + de-dupe    │ ─────► │ services/   weather · rain · route · ai           │
│ state/AppState    place, demo, prefs     │        │             insight_engine (the "meaning" layer) │
│ scene/            WeatherScene engine    │        │ providers/  open_meteo · osm (OSRM, Nominatim)   │
└──────────────────────────────────────────┘        │ models/     normalized Pydantic contract         │
                                                    │ mocks/      demo scenarios (same pipeline)        │
                                                    │ utils/      TTL cache · WMO codes · geodesy       │
                                                    └───────────────────────┬───────────────────────────┘
                                                                            ▼
                                                     Open-Meteo · OSRM · Nominatim · (Claude API)
```

**Data flow:** provider → normalization (`services/normalize.py`, WMO code → condition → scene) →
interpretation (`services/insight_engine.py`) → one `ForecastBundle` per location. The frontend and the AI both
consume that same normalized bundle.

**Grounded AI:** `POST /ai/weather-advice` builds the bundle + rain nowcast server-side, serializes a compact JSON
context, and sends it to Claude with a system prompt that forbids inventing any value and requires saying when data
is unavailable (e.g. weather alerts). If no key is configured, the API errors, or the model refuses, the rule engine
answers from the same data — so the assistant always works. Model: `claude-opus-5-5` at low effort, with server-side
refusal fallbacks enabled.

**Demo mode:** `backend/app/mocks/scenarios.py` synthesizes payloads *shaped exactly like Open-Meteo responses*, so
demo data exercises the real normalization, insight, story and AI code paths (`?scenario=rain`).

## Setup

Prerequisites: Python 3.11+, Node 20+.

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000     # API docs: http://localhost:8000/docs

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                                    # http://localhost:5173  (proxies /api → :8000)
```

Optional: copy `.env.example` to `backend/.env` and set `ANTHROPIC_API_KEY` to enable Claude answers.

Production build: `cd frontend && npm run build` (outputs `frontend/dist`; set `VITE_API_BASE_URL` to the deployed API
and `CORS_ORIGINS` on the backend).

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | backend | — | Enables Claude in *Ask WeatherLens*. Never sent to the browser. |
| `ANTHROPIC_MODEL` | backend | `claude-opus-5-5` | Model used for advice. |
| `CORS_ORIGINS` | backend | `http://localhost:5173,…` | Allowed frontend origins. |
| `FORECAST_TTL` | backend | `600` | Forecast cache seconds. |
| `HTTP_USER_AGENT` | backend | `WeatherLens/1.0` | Identifies requests to OSM services (put a contact here in production). |
| `VITE_API_BASE_URL` | frontend | `/api` (dev proxy) | Backend base URL. |
| `VITE_MAP_TILE_URL`, `VITE_MAP_TILE_URL_DARK` | frontend | Esri Canvas | Basemap override. |

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/weather/forecast?lat&lon[&name&country&scenario&activity&activity_time&work&depart&return_time]` | Full bundle: current, 48 h hourly, 7-day daily, air quality, insight, story, mood |
| GET | `/weather/current?lat&lon` | Current conditions |
| GET | `/weather/hourly?lat&lon&hours` | Hourly points (≤ 48) |
| GET | `/weather/rain?lat&lon` | Nowcast: status, minutes until/remaining, approach direction, cells, 15-min timeline |
| GET | `/weather/air-quality?lat&lon` | US AQI, PM2.5, PM10, O₃, NO₂ |
| GET | `/weather/route?from&to[&depart=HH:MM\|arrive=HH:MM&near_lat&near_lon]` | Route geometry + ETA-matched stop forecasts + summary |
| GET | `/weather/grid?south&west&north&east&n[&air]` | Sampled grid for map layers |
| GET | `/geo/search?q` · `/geo/reverse?lat&lon` | City search · place name |
| POST | `/ai/weather-advice` | `{question, latitude, longitude, scenario?, history?, preferences?}` → grounded answer |
| GET | `/ai/status` | Active AI engine |

Errors share one shape: `{"error": {"code": "provider_unavailable", "message": "…"}}`, which the UI maps to
illustrated error states.

## Screenshots

Add captures to `docs/screenshots/` — suggested set: landing hero (sunny), Today (rain demo), Today (night),
insight panel, story player, Radar with temperature layer, Route weather, Ask WeatherLens, Explore/Compare, mobile.

## Project structure

See [`PLAN.md`](PLAN.md) for the full folder map and the build checklist.

## Future improvements

- Official weather alerts (national met services) with clear provenance
- Streaming AI responses and tool-use (let the model request specific hours/places)
- Push notifications: "rain in 20 minutes" for saved places and commute times
- Persisted accounts and multi-device preferences
- Real minute-level radar nowcasting (optical flow on radar frames)
- Unit preferences (°F, mph) and localization (Bangla)
- Automated tests: pytest for the insight engine, Playwright visual regression for each weather world

## Credits

Weather data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0) · Routing by [OSRM](https://project-osrm.org) ·
Geodata © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Radar by
[RainViewer](https://www.rainviewer.com) · Basemaps © Esri.
