// Mirrors backend/app/models/*.py — the normalized WeatherLens contract.
// Times are local wall-clock ISO strings for the location, e.g. "2026-10-01T14:00".

export type Condition =
  | "clear" | "mostly_clear" | "partly_cloudy" | "cloudy" | "fog" | "drizzle"
  | "rain" | "heavy_rain" | "snow" | "storm";

export type Scene = "sunny" | "cloudy" | "rain" | "storm" | "night" | "sunset" | "snow" | "fog";

export type DemoScenario = "sunny" | "cloudy" | "rain" | "storm" | "night" | "sunset";

export type Source = "open-meteo" | "demo";

export interface Location {
  name: string;
  country?: string | null;
  admin1?: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  utc_offset_seconds: number;
}

export interface Place {
  name: string;
  country?: string | null;
  country_code?: string | null;
  admin1?: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  population?: number | null;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  feels_like: number;
  humidity: number | null;
  wind_speed: number | null;
  wind_gusts: number | null;
  wind_direction: number | null;
  uv_index: number | null;
  visibility_km: number | null;
  cloud_cover: number | null;
  pressure: number | null;
  precipitation: number | null;
  weather_code: number;
  condition: Condition;
  condition_label: string;
  scene: Scene;
  is_day: boolean;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  feels_like: number | null;
  precipitation_probability: number | null;
  precipitation: number | null;
  weather_code: number;
  condition: Condition;
  condition_label: string;
  scene: Scene;
  wind_speed: number | null;
  wind_direction: number | null;
  humidity: number | null;
  uv_index: number | null;
  cloud_cover: number | null;
  visibility_km: number | null;
  is_day: boolean;
}

export interface DailyPoint {
  date: string;
  temp_max: number;
  temp_min: number;
  weather_code: number;
  condition: Condition;
  condition_label: string;
  precipitation_probability_max: number | null;
  precipitation_sum: number | null;
  sunrise: string | null;
  sunset: string | null;
  uv_index_max: number | null;
  wind_speed_max: number | null;
}

export interface AirQuality {
  us_aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogen_dioxide: number | null;
  category: string | null;
}

export interface Recommendation {
  icon: string;
  label: string;
  reason?: string | null;
}

export interface Insight {
  headline: string;
  take: Recommendation[];
  wear: Recommendation[];
  travel: string;
  outdoor: string;
  personal: string[];
}

export interface StorySegment {
  period: "Morning" | "Afternoon" | "Evening" | "Night";
  condition: Condition;
  scene: Scene;
  temperature: number;
  rain_chance: number | null;
  word: string;
}

export interface DailyStory {
  label: string;
  segments: StorySegment[];
  sentence: string;
}

export interface Mood {
  key: "energetic" | "cozy" | "calm" | "dramatic" | "peaceful" | "golden" | "crisp" | "hazy";
  label: string;
  description: string;
}

export interface ForecastBundle {
  location: Location;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  air_quality: AirQuality | null;
  insight: Insight;
  story: DailyStory;
  mood: Mood;
  source: Source;
  generated_at: string;
}

export interface RainCell {
  bearing: number;
  distance_km: number;
  intensity: number;
}

export interface RainNowcast {
  status: "raining" | "approaching" | "clear";
  minutes_until: number | null;
  minutes_remaining: number | null;
  intensity_label: string | null;
  approach_from_bearing: number | null;
  approach_from: string | null;
  message: string;
  cells: RainCell[];
  timeline: { time: string; precipitation: number }[];
  source: Source;
}

export interface RouteStop {
  name: string;
  latitude: number;
  longitude: number;
  eta: string;
  distance_km: number;
  temperature: number;
  condition: Condition;
  condition_label: string;
  precipitation_probability: number | null;
  wind_speed: number | null;
}

export interface RouteWeather {
  origin: Location;
  destination: Location;
  distance_km: number;
  duration_min: number;
  geometry: [number, number][];
  stops: RouteStop[];
  summary: string;
  worst_stop: string | null;
  routing: "osrm" | "straight-line";
}

export interface GridPoint {
  latitude: number;
  longitude: number;
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  cloud_cover: number | null;
  uv_index: number | null;
  precipitation: number | null;
  us_aqi: number | null;
}

export interface Preferences {
  home: string;
  work: string;
  departure_time: string;
  return_time: string;
  commute_mode: "walk" | "bike" | "transit" | "car" | "rickshaw";
  activities: string[];
  activity_time: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AdviceResponse {
  answer: string;
  engine: "claude" | "rules";
  data_points: string[];
  location: string;
  source: Source;
}
