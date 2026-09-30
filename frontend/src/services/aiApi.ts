import type { AdviceResponse, ChatTurn, DemoScenario, Place, Preferences } from "@/types/weather";
import { apiGet, apiPost } from "./http";

export function askWeatherLens(args: {
  question: string;
  place: Place;
  scenario: DemoScenario | null;
  history: ChatTurn[];
  preferences?: Preferences | null;
}) {
  const p = args.preferences;
  return apiPost<AdviceResponse>("/ai/weather-advice", {
    question: args.question,
    latitude: args.place.latitude,
    longitude: args.place.longitude,
    location_name: args.place.name,
    scenario: args.scenario,
    history: args.history.slice(-8),
    preferences: p ? {
      home: p.home || null, work: p.work || null,
      departure_time: p.departure_time || null, return_time: p.return_time || null,
      commute_mode: p.commute_mode, activities: p.activities, activity_time: p.activity_time || null,
    } : null,
  });
}

export function getAiStatus() {
  return apiGet<{ engine: "claude" | "rules"; model: string | null }>("/ai/status", undefined, 5 * 60_000);
}
