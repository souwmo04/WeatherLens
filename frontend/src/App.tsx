import { lazy } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { EmptyState } from "@/components/ui/States";
import TodayPage from "@/pages/TodayPage";

// Route-level code splitting: the weather home loads first, everything else on demand.
const AboutPage = lazy(() => import("@/pages/LandingPage"));
const ForecastPage = lazy(() => import("@/pages/ForecastPage"));
const RadarPage = lazy(() => import("@/pages/RadarPage"));
const RoutesPage = lazy(() => import("@/pages/RoutesPage"));
const AssistantPage = lazy(() => import("@/pages/AssistantPage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

function NotFound() {
  return (
    <div className="pt-28">
      <EmptyState art="calm" title="This page drifted away" body="The page you're looking for doesn't exist.">
        <Link to="/" className="mt-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">Back to today</Link>
      </EmptyState>
    </div>
  );
}

/** Old /app/* links keep working. */
function LegacyRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${pathname.replace(/^\/app/, "") || "/"}${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/app/*" element={<LegacyRedirect />} />
      <Route element={<AppLayout />}>
        <Route index element={<TodayPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="radar" element={<RadarPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
