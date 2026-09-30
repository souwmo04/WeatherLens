# WeatherLens — Master Build Plan

> "Weather, understood." — AI-powered weather companion (portfolio project)
>
> **This file is the source of truth for progress.** If a session ends mid-build,
> open this file, find the first unchecked `[ ]` item, and continue from there.
> Update checkboxes + the "Session log" at the bottom after every completed task.

---

## Tech decisions (locked)

| Area | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript (strict) + Vite | Fast dev, simple SPA |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + CSS variables design tokens | Tokens drive weather-reactive accents |
| Animation | `motion` (Framer Motion) + CSS keyframes for particles | Respect `prefers-reduced-motion` |
| Icons | `lucide-react` | Elegant, consistent |
| Routing | `react-router-dom` | Landing `/`, app under `/app/*` |
| Maps | Leaflet (lazy-loaded) + CARTO raster tiles + RainViewer radar tiles | Free, no key |
| Font | Plus Jakarta Sans (single primary font) | Rounded, sophisticated |
| Backend | Python 3.12 + FastAPI + Pydantic v2 + httpx | Required by spec |
| Weather provider | Open-Meteo (forecast, geocoding, air-quality) | Free, no key |
| Routing geometry | OSRM public demo server, straight-line fallback | Free, no key |
| AI | Anthropic Claude API (optional `ANTHROPIC_API_KEY`) + deterministic grounded rule engine fallback | Never hallucinate: AI only sees normalized backend data |
| Caching | In-memory TTL cache in backend; request dedupe in frontend | Performance |

## Folder structure

```
weather app/
├── PLAN.md                ← this file
├── README.md
├── .env.example
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py            FastAPI app, CORS, routers
│       ├── config.py          pydantic-settings
│       ├── api/               weather.py, ai.py, geo.py (routers)
│       ├── models/            weather.py, ai.py (Pydantic)
│       ├── providers/         open_meteo.py, osrm.py
│       ├── services/          weather_service.py, rain_service.py, route_service.py, ai_service.py, insight_engine.py
│       └── utils/             cache.py, wmo.py (weather codes), geo.py
└── frontend/
    ├── index.html
    └── src/
        ├── main.tsx, App.tsx, index.css (design tokens)
        ├── types/weather.ts
        ├── services/          weatherApi.ts, aiApi.ts, http.ts
        ├── mocks/             demo scenarios (clearly separated mock data)
        ├── state/             WeatherContext (location, demo mode, prefs)
        ├── hooks/             useWeather, useReducedMotion, ...
        ├── utils/             weatherHelpers.ts, formatters.ts
        ├── components/
        │   ├── brand/         Logo
        │   ├── scene/         WeatherScene + sky/clouds/rain/stars/skyline layers
        │   ├── WeatherHero, WeatherTimeline, WeatherInsight, RainApproaching,
        │   ├── RouteWeather, WeatherMap, AIWeatherAssistant, CitySearch,
        │   ├── DailyStory, WeatherMood, QuickActions, DailyForecast
        │   └── ui/            Skeleton, ErrorState, EmptyState, Button, Glass
        ├── layout/            Navbar, MobileNavigation, AppLayout
        └── pages/             Landing, Today, Forecast, Radar, Routes, Assistant, Explore, Settings
```

## API endpoints (backend)

- `GET  /health`
- `GET  /geo/search?q=`                → city search (Open-Meteo geocoding)
- `GET  /geo/reverse?lat=&lon=`        → nearest place name (best effort)
- `GET  /weather/current?lat=&lon=`
- `GET  /weather/hourly?lat=&lon=&hours=`
- `GET  /weather/forecast?lat=&lon=`   → full bundle (current + hourly + daily + insight + story)
- `GET  /weather/rain?lat=&lon=`       → minutely-15 nowcast → "rain in N minutes" + approach bearing
- `GET  /weather/air-quality?lat=&lon=`
- `GET  /weather/route?from=&to=&depart=` → samples along route with ETA weather
- `POST /ai/weather-advice`            → grounded advice (Claude or rule engine)

---

## Phases & tasks

### Phase 0 — Planning & scaffolding
- [x] 0.1 Write PLAN.md
- [x] 0.2 Scaffold backend (requirements, app skeleton, config, .env.example)
- [x] 0.3 Scaffold frontend (Vite + React + TS + Tailwind v4 + motion + lucide + router)

### Phase 1 — Design system + landing page
- [x] 1.1 Design tokens (colors, weather themes, radii, shadows, type scale) in `index.css`
- [x] 1.2 Logo (lens + cloud SVG)
- [x] 1.3 UI primitives (Button, Glass surface, Skeleton, ErrorState, EmptyState)
- [x] 1.4 WeatherScene engine (sunny / cloudy / rain / storm / night / sunset / snow / fog) with Dhaka skyline
- [x] 1.5 Landing page (hero, Know before you go, Built around your day, Not just a forecast, CTA)

### Phase 2 — Weather dashboard shell
- [x] 2.1 AppLayout, Navbar (desktop), MobileNavigation (bottom bar)
- [x] 2.2 WeatherContext (location, demo mode, units, prefs persisted in localStorage)
- [x] 2.3 Today page layout (hero, insight, quick actions, timeline, rain, story, mood)

### Phase 3 — Weather API integration (backend)
- [x] 3.1 Open-Meteo provider (forecast, geocoding, air quality) + TTL cache
- [x] 3.2 Normalization models + WMO code mapping → condition + scene
- [x] 3.3 Endpoints current / hourly / forecast / air-quality / geo search
- [x] 3.4 Insight engine: headline sentence, "what it means for you" recommendations
- [x] 3.5 Frontend services + hooks + demo-mode mock data (separated in `mocks/`)

### Phase 4 — Hourly / daily forecast
- [x] 4.1 WeatherTimeline (horizontal scroll, hover/tap detail, keyboard accessible)
- [x] 4.2 DailyForecast (7-day with temp range bars)
- [x] 4.3 Forecast page
- [x] 4.4 DailyStory ("Today in 30 seconds") + WeatherMood

### Phase 5 — Weather animations
- [x] 5.1 Particle layers (rain, stars, dust motes, lightning, wind streaks)
- [x] 5.2 Scene cross-fade transitions, animated temperature numbers
- [x] 5.3 Reduced-motion support everywhere
- [x] 5.4 Optional rain ambience sound (WebAudio generated, off by default)

### Phase 6 — AI assistant
- [x] 6.1 Backend AI service: Claude (if key) with strict grounded system prompt, rule engine fallback
- [x] 6.2 Ask WeatherLens page (chat UI, suggested prompts, data-source badge)
- [x] 6.3 QuickActions → open assistant with prefilled question

### Phase 7 — Radar
- [x] 7.1 Rain nowcast endpoint + RainApproaching mini radar (`/weather/rain`) + RainApproaching mini radar animation
- [x] 7.2 Radar page: Leaflet map, RainViewer radar layer + temp/wind/cloud/UV/AQ layers (grid sampling), toggles

### Phase 8 — Route weather
- [x] 8.1 Backend route service (geocode, OSRM geometry, sample points, ETA-matched hourly)
- [x] 8.2 Routes page: form (start, destination, departure, arrival), map, stops, summary sentence, empty state

### Phase 9 — Personalization + City explorer
- [x] 9.1 Settings page: home, work/uni, departure time, commute mode, activities + preferred time
- [x] 9.2 Personalized insight lines ("Cycling conditions are poor at 5 PM because…")
- [x] 9.3 Explore page: city search, city scene cards, Compare two cities

### Phase 10 — Mobile optimization
- [x] 10.1 Intentional mobile layouts, bottom nav, touch timeline, safe areas

### Phase 11 — Performance
- [x] 11.1 Lazy-load routes and map, memoization, request caching, polling interval

### Phase 12 — Accessibility
- [x] 12.1 Semantic landmarks, ARIA labels, focus rings, contrast pass, text labels beside color

### Phase 13 — Final polish & docs
- [x] 13.1 Demo mode switcher (Sunny / Rain / Storm / Night / Sunset / Cloudy)
- [x] 13.2 README (overview, features, stack, architecture, setup, env, API, screenshots, future)
- [x] 13.3 End-to-end verification (build passes, backend responds, UI screenshots checked)

---

## How to run (dev)

```bash
# backend
cd backend && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxies /api → :8000)
```

---

## Session log

- 2026-10-01 — Session 1 started. Plan written.
- 2026-10-01 — Backend COMPLETE & verified against live Open-Meteo: /weather/forecast|current|hourly|rain|air-quality|route|grid,
  /geo/search|reverse, /ai/weather-advice|status. Demo scenarios (sunny/cloudy/rain/storm/night/sunset) live in
  backend/app/mocks/scenarios.py and flow through the same pipeline via `?scenario=`. AI = Claude (claude-opus-5-5, effort low,
  server-side refusal fallback) when ANTHROPIC_API_KEY set, else grounded rule engine. Run: `cd backend && .venv/Scripts/python -m uvicorn app.main:app --port 8000`.
  NEXT: frontend scaffold (deps already installed in frontend/node_modules).
- 2026-10-01 — Frontend scaffold + design system + WeatherScene engine (8 worlds, Dhaka landmarks, particles, lightning,
  characters, cloud-cover modulation) + Navbar/MobileNav/CitySearch/DemoSwitcher + WeatherHero VERIFIED in browser.
  Launch both servers via .claude/launch.json ("backend", "frontend"). NEXT: Today page sections (Insight, QuickActions,
  Timeline, RainApproaching, DailyStory, DailyForecast), then Landing, then other pages (App.tsx currently routes / and /app only).
- 2026-10-01 — Landing page + full Today dashboard done & screenshot-verified (desktop 1440 + mobile 390 via headless Edge:
  `msedge --headless=new --window-size=W,H --virtual-time-budget=8000 --screenshot=out.png URL`). NEXT: pages Forecast, Assistant,
  Radar, Routes, Explore(+Compare), Settings; register them in App.tsx.
- 2026-10-01 — ALL pages built & verified (Forecast, Assistant, Radar, Routes, Explore+Compare, Settings, 404). Basemap switched
  from CARTO (now needs API key) to keyless Esri Canvas. Production build clean; Leaflet lazy-chunked. README + .gitignore written.
  Remaining: 13.3 final end-to-end pass. Ideas beyond scope are listed in README "Future improvements".
  QA notes: headless Edge has a ~500px min window width (mobile captures crop) and virtual time fires fetch timeouts early —
  use the in-app browser's mobile preset for true mobile checks.
- 2026-10-01 — 13.3 DONE: prod build clean, 14 endpoint smoke tests pass (incl. 400/404 error paths), assistant ?q= flow verified,
  fixed canvas particle crash (negative frame delta froze rain). ALL PLANNED TASKS COMPLETE.
  Next ideas (optional): pytest suite for insight_engine, Playwright visual tests per weather world, screenshots in docs/screenshots/,
  git init + first commit, deploy (frontend static host + backend container).
