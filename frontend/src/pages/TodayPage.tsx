import { DailyForecast } from "@/components/DailyForecast";
import { RainApproaching } from "@/components/RainApproaching";
import { AskBox, TodayAdvice } from "@/components/TodayAdvice";
import { WeatherDetails } from "@/components/WeatherDetails";
import { WeatherHero } from "@/components/WeatherHero";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { useForecast, useRain } from "@/hooks/useWeather";

/** Home: everything needed at a glance — now, details, next hours, advice, rain, week. */
export default function TodayPage() {
  const forecast = useForecast();
  const rain = useRain();
  const d = forecast.data;
  const loading = forecast.loading && !d;

  return (
    <>
      <WeatherHero data={d} loading={forecast.loading} error={forecast.error} onRetry={forecast.reload} />

      <div className="relative z-10 mx-auto -mt-8 flex max-w-[1320px] flex-col gap-5 px-3 pb-32 sm:px-6 lg:gap-6 lg:pb-16">
        <WeatherDetails current={d?.current ?? null} today={d?.daily[0]} air={d?.air_quality ?? null} loading={loading} />
        <WeatherTimeline hours={d?.hourly ?? null} loading={loading} />

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <TodayAdvice insight={d?.insight ?? null} loading={loading} />
          <RainApproaching data={rain.data} loading={rain.loading} error={rain.error} onRetry={rain.reload} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
          <DailyForecast days={d?.daily ?? null} loading={loading} />
          <AskBox />
        </div>
      </div>
    </>
  );
}
