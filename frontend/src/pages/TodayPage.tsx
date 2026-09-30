import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DailyForecast } from "@/components/DailyForecast";
import { DailyStory } from "@/components/DailyStory";
import { QuickActions } from "@/components/QuickActions";
import { RainApproaching } from "@/components/RainApproaching";
import { WeatherHero } from "@/components/WeatherHero";
import { WeatherInsight } from "@/components/WeatherInsight";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { useForecast, useRain } from "@/hooks/useWeather";
import { useActivePlace } from "@/state/AppState";

export default function TodayPage() {
  const forecast = useForecast();
  const rain = useRain();
  const place = useActivePlace();
  const d = forecast.data;

  return (
    <>
      <WeatherHero data={d} loading={forecast.loading} error={forecast.error} onRetry={forecast.reload} />

      <div className="relative z-10 mx-auto -mt-6 flex max-w-[1320px] flex-col gap-6 px-4 pb-32 sm:-mt-10 sm:px-6 lg:gap-8 lg:pb-20">
        <WeatherInsight insight={d?.insight ?? null} loading={forecast.loading && !d} />
        <QuickActions />
        <WeatherTimeline hours={d?.hourly ?? null} loading={forecast.loading && !d} />

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <RainApproaching data={rain.data} loading={rain.loading} error={rain.error} onRetry={rain.reload} />
          <DailyStory story={d?.story ?? null} mood={d?.mood ?? null} city={d?.location.name ?? place.name} loading={forecast.loading && !d} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
          <DailyForecast days={d?.daily ?? null} loading={forecast.loading && !d} />
          <aside className="surface flex flex-col justify-between gap-6 overflow-hidden p-7">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Plan ahead</p>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">Going somewhere?</h2>
              <p className="mt-2 text-ink-soft">See the weather at every stop along your route — timed to when you'll actually be there.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/app/routes" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-bg hover:opacity-90">
                Route weather <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/app/radar" className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-line-strong">
                Open radar
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
